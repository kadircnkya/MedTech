// =============================================================
// services/api.ts — API Client & Patient CRUD Hook'ları
// =============================================================
// React Native / Expo uygulaması için backend API entegrasyonu.
// AsyncStorage ile JWT token yönetimi, loading/error state'leri,
// ve type-safe CRUD işlemleri sağlar.
//
// ÖNEMLİ: Bu dosya mobile/services/ altına konulmalıdır.
// =============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================
// CONFIGURATION
// =============================================

/**
 * API_BASE_URL — Backend sunucu adresi
 *
 * Development'ta:
 *  - Android Emulator: http://10.0.2.2:3009
 *  - iOS Simulator:    http://localhost:3009
 *  - Fiziksel cihaz:   http://<bilgisayar_ip>:3009
 *
 * Production'da: Nginx gateway üzerinden
 */
const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3009/api/v1'     // Android emulator için
  : 'http://your-production-url/api/v1';

// Fiziksel cihaz veya iOS simulator için bu satırı kullanın:
// const API_BASE_URL = 'http://192.168.1.X:3009/api/v1';

// =============================================
// TYPE DEFINITIONS
// =============================================

/** Hasta veri modeli */
export interface Patient {
  id: string;
  patientName: string;
  age: number;
  gender: 'erkek' | 'kadın' | 'diğer';
  diagnosis: string;
  department?: string;
  doctor?: string;
  notes?: string;
  status: 'aktif' | 'tedavi_altında' | 'taburcu' | 'takipte';
  date: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** Yeni hasta oluşturma DTO'su */
export interface CreatePatientDTO {
  patientName: string;
  age: number;
  gender: 'erkek' | 'kadın' | 'diğer';
  diagnosis: string;
  department?: string;
  doctor?: string;
  notes?: string;
  status?: 'aktif' | 'tedavi_altında' | 'taburcu' | 'takipte';
  date?: string;
}

/** Hasta güncelleme DTO'su (tüm alanlar opsiyonel) */
export interface UpdatePatientDTO {
  patientName?: string;
  age?: number;
  gender?: 'erkek' | 'kadın' | 'diğer';
  diagnosis?: string;
  department?: string;
  doctor?: string;
  notes?: string;
  status?: 'aktif' | 'tedavi_altında' | 'taburcu' | 'takipte';
  date?: string;
}

/** Pagination parametreleri */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** API Response format */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string[];
}

/** Pagination response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  totalPages: number;
}

/** İstatistik verileri */
export interface PatientStats {
  totalPatients: number;
  activePatients: number;
  dischargedPatients: number;
  underTreatment: number;
}

/** Auth token'ları */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// =============================================
// TOKEN MANAGEMENT
// =============================================

const TOKEN_KEY = '@mediflow_access_token';
const REFRESH_TOKEN_KEY = '@mediflow_refresh_token';

/**
 * JWT token'ı AsyncStorage'a kaydeder
 */
export const saveTokens = async (tokens: AuthTokens): Promise<void> => {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, tokens.accessToken],
    [REFRESH_TOKEN_KEY, tokens.refreshToken],
  ]);
};

/**
 * Kayıtlı JWT token'ı döndürür
 */
export const getAccessToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

/**
 * Kayıtlı refresh token'ı döndürür
 */
export const getRefreshToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Tüm token'ları temizler (logout)
 */
export const clearTokens = async (): Promise<void> => {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
};

// =============================================
// HTTP CLIENT — Merkezi API İstek Fonksiyonu
// =============================================

/**
 * apiRequest — Tip güvenli, token'lı HTTP istek gönderir
 *
 * @param endpoint - API endpoint (örn: '/patients')
 * @param options  - fetch options (method, body vb.)
 * @returns        - Parsed JSON response
 * @throws         - Hata durumunda Error fırlatır
 *
 * Özellikler:
 * - Otomatik JWT token ekleme
 * - JSON serialization/deserialization
 * - Timeout kontrolü (15 saniye)
 * - Detaylı hata mesajları
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Token varsa Authorization header'ına ekle
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Timeout kontrolü (15 saniye)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Response'u parse et
    const data = await response.json();

    // HTTP hata kontrolü
    if (!response.ok) {
      const errorMessage = data.error || data.message || `HTTP ${response.status} hatası`;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // AbortError — timeout
    if (error.name === 'AbortError') {
      throw new Error('İstek zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edin.');
    }

    // Network error
    if (error.message === 'Network request failed') {
      throw new Error('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
    }

    throw error;
  }
}

// =============================================
// PATIENT API — CRUD İşlemleri
// =============================================

export const PatientAPI = {
  /**
   * Yeni hasta kaydı oluşturur
   *
   * @example
   * const response = await PatientAPI.create({
   *   patientName: 'Ahmet Yılmaz',
   *   age: 45,
   *   gender: 'erkek',
   *   diagnosis: 'Hipertansiyon',
   * });
   */
  create: (dto: CreatePatientDTO): Promise<ApiResponse<Patient>> => {
    return apiRequest<ApiResponse<Patient>>('/patients', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Hastaları listeler (pagination + arama + filtreleme desteği)
   *
   * @example
   * const response = await PatientAPI.getAll({ page: 1, limit: 10, search: 'Ahmet' });
   */
  getAll: (params?: PaginationParams): Promise<PaginatedResponse<Patient>> => {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const endpoint = `/patients${queryString ? `?${queryString}` : ''}`;

    return apiRequest<PaginatedResponse<Patient>>(endpoint);
  },

  /**
   * Hasta detayını getirir
   *
   * @example
   * const response = await PatientAPI.getById('60f7a8b2c3d4e5f6a7b8c9d0');
   */
  getById: (id: string): Promise<ApiResponse<Patient>> => {
    return apiRequest<ApiResponse<Patient>>(`/patients/${id}`);
  },

  /**
   * Hasta kaydını günceller
   *
   * @example
   * const response = await PatientAPI.update('60f7a8...', { diagnosis: 'Diyabet Tip 2' });
   */
  update: (id: string, dto: UpdatePatientDTO): Promise<ApiResponse<Patient>> => {
    return apiRequest<ApiResponse<Patient>>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Hasta kaydını siler
   *
   * @example
   * const response = await PatientAPI.delete('60f7a8...');
   */
  delete: (id: string): Promise<ApiResponse<null>> => {
    return apiRequest<ApiResponse<null>>(`/patients/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Dashboard istatistiklerini getirir
   *
   * @example
   * const stats = await PatientAPI.getStats();
   */
  getStats: (): Promise<ApiResponse<PatientStats>> => {
    return apiRequest<ApiResponse<PatientStats>>('/patients/stats');
  },
};

// =============================================
// AUTH API — Kimlik Doğrulama İşlemleri
// =============================================

export const AuthAPI = {
  /**
   * Kullanıcı kaydı oluşturur
   */
  register: async (email: string, password: string): Promise<ApiResponse<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: string };
  }>> => {
    // Auth service farklı bir port'ta çalışıyor
    const AUTH_URL = __DEV__
      ? 'http://10.0.2.2:3001/api/v1/auth'
      : 'http://your-production-url/api/v1/auth';

    const response = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Kayıt başarısız');
    }

    // Token'ları kaydet
    if (data.data?.accessToken) {
      await saveTokens({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });
    }

    return data;
  },

  /**
   * Kullanıcı girişi yapar
   */
  login: async (email: string, password: string): Promise<ApiResponse<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: string };
  }>> => {
    const AUTH_URL = __DEV__
      ? 'http://10.0.2.2:3001/api/v1/auth'
      : 'http://your-production-url/api/v1/auth';

    const response = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Giriş başarısız');
    }

    // Token'ları kaydet
    if (data.data?.accessToken) {
      await saveTokens({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });
    }

    return data;
  },

  /**
   * Oturumu kapatır
   */
  logout: async (): Promise<void> => {
    await clearTokens();
  },
};
