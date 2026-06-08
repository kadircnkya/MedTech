/**
 * BarcodeService — Profesyonel 3 Katmanlı İlaç Barkod Arama Servisi
 *
 * Level 1: In-memory LRU cache (son 50 tarama, instant < 1ms)
 * Level 2: AsyncStorage yerel kalıcı cache (offline, < 50ms)
 * Level 3: API call to medication-service (network, < 500ms)
 *
 * Ekstra: EAN-13 checkdigit doğrulaması, debounce, duplicate engeli
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatalogMedication } from '../types';

// ═══════════════════════════════════════════
// KONFIGÜRASYON
// ═══════════════════════════════════════════
// Bilgisayarınızın yerel IP adresi (Fiziksel cihaz testleri için)
const LOCAL_IP = '192.168.1.112';

const API_BASE_URL = __DEV__ 
  ? `http://${LOCAL_IP}:3003`
  : (process.env.EXPO_PUBLIC_API_URL || 'https://api.medtech.com');

const CACHE_KEY = '@medtech_medication_cache';
const CACHE_VERSION_KEY = '@medtech_cache_version';
const CACHE_VERSION = '2';
const LRU_MAX_SIZE = 50;
const ASYNC_CACHE_MAX = 1000;
const API_TIMEOUT = 5000; // 5 saniye

// ═══════════════════════════════════════════
// IN-MEMORY LRU CACHE (Level 1)
// ═══════════════════════════════════════════
class LRUCache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (item !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: string, value: T): void {
    this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      // Remove oldest (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ═══════════════════════════════════════════
// EAN-13 BARKOD DOĞRULAMASI
// ═══════════════════════════════════════════

/**
 * EAN-13 checkdigit doğrulaması
 * @returns true eğer barkod geçerliyse
 */
export function validateEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  const digits = barcode.split('').map(Number);
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[12];
}

/**
 * Barkod format doğrulaması (EAN-8, EAN-13, UPC-A, GTIN-14 destekli)
 */
export function validateBarcodeFormat(barcode: string): {
  isValid: boolean;
  format: string;
  error?: string;
} {
  if (!barcode || barcode.trim().length === 0) {
    return { isValid: false, format: 'unknown', error: 'Barkod boş olamaz' };
  }

  const clean = barcode.trim();

  if (/^\d{8}$/.test(clean)) {
    return { isValid: true, format: 'EAN-8' };
  }
  if (/^\d{12}$/.test(clean)) {
    return { isValid: true, format: 'UPC-A' };
  }
  if (/^\d{13}$/.test(clean)) {
    const valid = validateEAN13(clean);
    return {
      isValid: valid,
      format: 'EAN-13',
      error: valid ? undefined : 'EAN-13 checkdigit hatası',
    };
  }
  if (/^\d{14}$/.test(clean)) {
    return { isValid: true, format: 'GTIN-14' };
  }

  // Diğer formatlar (QR, DataMatrix vb. içinden sayısal barkod)
  if (/^\d+$/.test(clean) && clean.length >= 6) {
    return { isValid: true, format: 'Diğer' };
  }

  return { isValid: true, format: 'Alfanümerik' };
}

// ═══════════════════════════════════════════
// ARAMA SONUÇ TİPİ
// ═══════════════════════════════════════════
export interface BarcodeSearchResult {
  found: boolean;
  medication: CatalogMedication | null;
  source: 'memory_cache' | 'local_cache' | 'api' | 'local_catalog' | 'not_found';
  confidence: number; // 0.0 - 1.0
  responseTimeMs: number;
  barcodeValidation: {
    isValid: boolean;
    format: string;
    error?: string;
  };
}

// ═══════════════════════════════════════════
// ANA SERVİS SINIFI
// ═══════════════════════════════════════════
class BarcodeService {
  private memoryCache = new LRUCache<CatalogMedication>(LRU_MAX_SIZE);
  private lastScannedBarcode = '';
  private lastScanTime = 0;
  private debounceMs = 2000; // Aynı barkod 2 saniye içinde tekrar algılanırsa ignore

  /**
   * ANA ARAMA FONKSİYONU — 3 Katmanlı Strateji
   *
   * 1. In-memory LRU cache kontrol et (< 1ms)
   * 2. AsyncStorage yerel cache kontrol et (< 50ms)
   * 3. Yerel medicationCatalog array'inde ara (fallback — offline)
   * 4. API'ye sor (network, < 500ms)
   *
   * @param barcode Okunan barkod
   * @param localCatalog Yerel ilaç kataloğu (AppContext'ten)
   * @param authToken JWT auth token (API çağrısı için)
   */
  async lookupBarcode(
    barcode: string,
    localCatalog: CatalogMedication[],
    authToken?: string,
  ): Promise<BarcodeSearchResult> {
    const startTime = Date.now();

    // Barkod format doğrulama
    const validation = validateBarcodeFormat(barcode);

    // Debounce: Aynı barkod 2 saniye içinde tekrar gelirse yine sonuç dön
    // (tetiklemeyi engelleme ScannerScreen tarafında yapılır, burada cache'den verilir)

    // ─── LEVEL 1: In-memory LRU Cache ───
    const memoryCached = this.memoryCache.get(barcode);
    if (memoryCached) {
      return {
        found: true,
        medication: memoryCached,
        source: 'memory_cache',
        confidence: memoryCached.verificationStatus === 'verified' ? 1.0 : 0.7,
        responseTimeMs: Date.now() - startTime,
        barcodeValidation: validation,
      };
    }

    // ─── LEVEL 2: AsyncStorage Yerel Cache ───
    try {
      const asyncCached = await this.getFromAsyncCache(barcode);
      if (asyncCached) {
        // Memory cache'e de ekle (promote)
        this.memoryCache.set(barcode, asyncCached);
        return {
          found: true,
          medication: asyncCached,
          source: 'local_cache',
          confidence: asyncCached.verificationStatus === 'verified' ? 1.0 : 0.7,
          responseTimeMs: Date.now() - startTime,
          barcodeValidation: validation,
        };
      }
    } catch {
      // AsyncStorage hatası — devam et
    }

    // ─── LEVEL 2.5: Yerel Katalog (In-memory Array) ───
    const catalogMatch = localCatalog.find(item => item.barcode === barcode);
    if (catalogMatch) {
      // Tüm cache'lere kaydet
      this.memoryCache.set(barcode, catalogMatch);
      this.saveToAsyncCache(barcode, catalogMatch).catch(() => {});
      return {
        found: true,
        medication: catalogMatch,
        source: 'local_catalog',
        confidence: catalogMatch.verificationStatus === 'verified' ? 1.0 : 0.7,
        responseTimeMs: Date.now() - startTime,
        barcodeValidation: validation,
      };
    }

    // ─── LEVEL 3: API Çağrısı ───
    if (authToken) {
      try {
        const apiResult = await this.searchAPI(barcode, authToken);
        if (apiResult) {
          // Tüm cache'lere kaydet
          this.memoryCache.set(barcode, apiResult);
          this.saveToAsyncCache(barcode, apiResult).catch(() => {});
          return {
            found: true,
            medication: apiResult,
            source: 'api',
            confidence: apiResult.verificationStatus === 'verified' ? 1.0 : 0.7,
            responseTimeMs: Date.now() - startTime,
            barcodeValidation: validation,
          };
        }
      } catch {
        // API hatası — not found
      }
    }

    // ─── BULUNAMADI ───
    return {
      found: false,
      medication: null,
      source: 'not_found',
      confidence: 0,
      responseTimeMs: Date.now() - startTime,
      barcodeValidation: validation,
    };
  }

  /**
   * Debounce kontrolü — Aynı barkod 2 saniye içinde tekrar tetiklenirse true döner
   */
  shouldDebounce(barcode: string): boolean {
    const now = Date.now();
    if (barcode === this.lastScannedBarcode && now - this.lastScanTime < this.debounceMs) {
      return true;
    }
    this.lastScannedBarcode = barcode;
    this.lastScanTime = now;
    return false;
  }

  /**
   * Yeni ilaç kaydet — API + yerel cache'lere ekle
   */
  async saveNewMedication(
    medication: CatalogMedication,
    authToken?: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Barkod duplicate kontrolü
    const existing = this.memoryCache.get(medication.barcode);
    if (existing) {
      return { success: false, error: 'Bu barkod zaten kayıtlı' };
    }

    // Yerel cache'lere kaydet
    this.memoryCache.set(medication.barcode, medication);
    await this.saveToAsyncCache(medication.barcode, medication);

    // API'ye gönder (arka planda)
    if (authToken) {
      try {
        await this.submitToAPI(medication, authToken);
      } catch {
        // API hatası — yerel kaydedildi, sonra senkronize edilir
      }
    }

    return { success: true };
  }

  // ═══════════════════════════════════════════
  // PRIVATE: AsyncStorage İşlemleri
  // ═══════════════════════════════════════════
  private async getFromAsyncCache(barcode: string): Promise<CatalogMedication | null> {
    try {
      const version = await AsyncStorage.getItem(CACHE_VERSION_KEY);
      if (version !== CACHE_VERSION) return null;

      const data = await AsyncStorage.getItem(`${CACHE_KEY}_${barcode}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async saveToAsyncCache(barcode: string, medication: CatalogMedication): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
      await AsyncStorage.setItem(`${CACHE_KEY}_${barcode}`, JSON.stringify(medication));
    } catch {
      // Storage full veya hata — sessizce devam et
    }
  }

  // ═══════════════════════════════════════════
  // PRIVATE: API İşlemleri
  // ═══════════════════════════════════════════
  private async searchAPI(barcode: string, authToken: string): Promise<CatalogMedication | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/medications/barcode/${barcode}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const json = await response.json();
      if (!json.success || !json.data) return null;

      // API yanıtını CatalogMedication formatına dönüştür
      const med = json.data;
      return {
        barcode: med.barcode,
        medicationName: med.name,
        genericName: med.genericName,
        activeIngredient: med.activeIngredient || '',
        manufacturer: med.manufacturer,
        dosageForm: med.dosageForm,
        strength: med.strength,
        dosageInfo: med.dosageInfo || '',
        usageInstructions: med.usageInstructions || '',
        usagePurpose: med.description || '',
        prospectus: med.prospectus || '',
        sideEffects: med.sideEffects || [],
        interactions: med.interactions || [],
        contraindications: med.contraindications || [],
        warnings: med.warnings || [],
        storageConditions: med.storageConditions || '',
        category: med.category || 'Genel',
        subCategory: med.subCategory || '',
        isPrescriptionRequired: med.isPrescriptionRequired || false,
        verificationStatus: med.verificationStatus || 'verified',
        source: 'api',
        lastSyncDate: med.lastSyncDate || new Date().toISOString(),
        createdBy: 'api',
        createdAt: med.createdAt || new Date().toISOString(),
        updatedAt: med.updatedAt || new Date().toISOString(),
      };
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }

  private async submitToAPI(medication: CatalogMedication, authToken: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      await fetch(`${API_BASE_URL}/api/v1/medications/user-submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: medication.medicationName,
          genericName: medication.genericName || 'Belirtilmedi',
          activeIngredient: medication.activeIngredient,
          barcode: medication.barcode,
          manufacturer: medication.manufacturer || 'Belirtilmedi',
          dosageForm: medication.dosageForm || 'Belirtilmedi',
          strength: medication.strength || '',
          dosageInfo: medication.dosageInfo || '',
          usageInstructions: medication.usageInstructions || '',
          prospectus: medication.prospectus || '',
          description: medication.usagePurpose || '',
          category: medication.category || 'Genel',
          isPrescriptionRequired: medication.isPrescriptionRequired || false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Cache temizle
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_KEY));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch {
      // ignore
    }
  }

  /**
   * Cache istatistikleri
   */
  getCacheStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      maxMemoryCacheSize: LRU_MAX_SIZE,
    };
  }
}

// Singleton instance
export const barcodeService = new BarcodeService();
export default barcodeService;
