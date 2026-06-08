// =============================================================
// hooks/usePatients.ts — React Custom Hook for Patient Data
// =============================================================
// Hasta verilerini backend API'den çekmek, oluşturmak, güncellemek
// ve silmek için kullanılan React hook'u.
//
// Özellikler:
// - Loading state yönetimi
// - Error handling
// - Async fetch işlemleri
// - Pagination desteği
// - Search & filter desteği
// - Otomatik veri yenileme
//
// ÖNEMLİ: Bu dosya mobile/hooks/ altına konulmalıdır.
// =============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PatientAPI,
  Patient,
  CreatePatientDTO,
  UpdatePatientDTO,
  PaginationParams,
  PatientStats,
} from '../services/api';

// =============================================
// usePatients — Hasta Listesi Hook'u
// =============================================

interface UsePatientsState {
  /** Hasta listesi */
  patients: Patient[];
  /** Yükleniyor mu? */
  loading: boolean;
  /** Hata mesajı (varsa) */
  error: string | null;
  /** Toplam hasta sayısı */
  total: number;
  /** Mevcut sayfa */
  page: number;
  /** Toplam sayfa sayısı */
  totalPages: number;
  /** Verileri yenile */
  refresh: () => Promise<void>;
  /** Sayfa değiştir */
  changePage: (newPage: number) => void;
  /** Arama yap */
  search: (query: string) => void;
  /** Status filtrele */
  filterByStatus: (status: string | undefined) => void;
}

/**
 * usePatients — Hasta listesi hook'u
 *
 * @param initialParams - Başlangıç pagination/filtre parametreleri
 * @returns Hasta listesi, loading, error ve kontrol fonksiyonları
 *
 * @example
 * const { patients, loading, error, refresh, search } = usePatients();
 *
 * if (loading) return <ActivityIndicator />;
 * if (error) return <Text>{error}</Text>;
 *
 * return patients.map(p => <PatientCard key={p.id} patient={p} />);
 */
export function usePatients(initialParams?: PaginationParams): UsePatientsState {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState(initialParams?.search || '');
  const [statusFilter, setStatusFilter] = useState(initialParams?.status);

  // Ref ile debounce timer'ı tutuyoruz (search için)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * API'den hasta verilerini çeker
   */
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await PatientAPI.getAll({
        page,
        limit: initialParams?.limit || 10,
        search: searchQuery || undefined,
        status: statusFilter,
        sortBy: initialParams?.sortBy || 'createdAt',
        sortOrder: initialParams?.sortOrder || 'desc',
      });

      if (response.success) {
        setPatients(response.data || []);
        setTotal(response.total);
        setTotalPages(response.totalPages);
      } else {
        setError(response.error || 'Veriler alınamadı.');
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası oluştu.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, initialParams]);

  // İlk yükleme ve parametreler değiştiğinde fetch
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  /**
   * Arama fonksiyonu — 300ms debounce ile
   */
  const search = useCallback((query: string) => {
    // Önceki timer'ı temizle
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // 300ms bekle, sonra arama yap
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(query);
      setPage(1); // Aramada ilk sayfaya dön
    }, 300);
  }, []);

  /**
   * Status filtreleme
   */
  const filterByStatus = useCallback((status: string | undefined) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  /**
   * Sayfa değiştirme
   */
  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    patients,
    loading,
    error,
    total,
    page,
    totalPages,
    refresh: fetchPatients,
    changePage,
    search,
    filterByStatus,
  };
}

// =============================================
// usePatient — Tek Hasta Detay Hook'u
// =============================================

interface UsePatientState {
  patient: Patient | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * usePatient — Tek hasta detay hook'u
 *
 * @param id - Hasta ID'si
 * @returns Hasta verisi, loading ve error state'leri
 *
 * @example
 * const { patient, loading, error } = usePatient('60f7a8...');
 */
export function usePatient(id: string): UsePatientState {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatient = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await PatientAPI.getById(id);

      if (response.success && response.data) {
        setPatient(response.data);
      } else {
        setError(response.error || 'Hasta bulunamadı.');
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  return { patient, loading, error, refresh: fetchPatient };
}

// =============================================
// usePatientMutations — CRUD İşlemleri Hook'u
// =============================================

interface UsePatientMutationsState {
  /** Yeni hasta oluşturur */
  createPatient: (dto: CreatePatientDTO) => Promise<Patient | null>;
  /** Hasta günceller */
  updatePatient: (id: string, dto: UpdatePatientDTO) => Promise<Patient | null>;
  /** Hasta siler */
  deletePatient: (id: string) => Promise<boolean>;
  /** İşlem devam ediyor mu? */
  mutating: boolean;
  /** Mutation hata mesajı */
  mutationError: string | null;
  /** Hata mesajını temizle */
  clearError: () => void;
}

/**
 * usePatientMutations — Hasta CRUD mutation hook'u
 *
 * Create, Update ve Delete işlemlerini yönetir.
 *
 * @example
 * const { createPatient, updatePatient, deletePatient, mutating } = usePatientMutations();
 *
 * // Yeni hasta oluştur
 * const newPatient = await createPatient({
 *   patientName: 'Ahmet Yılmaz',
 *   age: 45,
 *   gender: 'erkek',
 *   diagnosis: 'Hipertansiyon',
 * });
 *
 * // Hasta güncelle
 * await updatePatient('60f7a8...', { status: 'taburcu' });
 *
 * // Hasta sil
 * await deletePatient('60f7a8...');
 */
export function usePatientMutations(): UsePatientMutationsState {
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  /**
   * Yeni hasta oluştur
   */
  const createPatient = useCallback(async (dto: CreatePatientDTO): Promise<Patient | null> => {
    setMutating(true);
    setMutationError(null);

    try {
      const response = await PatientAPI.create(dto);

      if (response.success && response.data) {
        return response.data;
      } else {
        setMutationError(response.error || 'Hasta oluşturulamadı.');
        return null;
      }
    } catch (err: any) {
      setMutationError(err.message || 'Bağlantı hatası oluştu.');
      return null;
    } finally {
      setMutating(false);
    }
  }, []);

  /**
   * Hasta güncelle
   */
  const updatePatient = useCallback(async (id: string, dto: UpdatePatientDTO): Promise<Patient | null> => {
    setMutating(true);
    setMutationError(null);

    try {
      const response = await PatientAPI.update(id, dto);

      if (response.success && response.data) {
        return response.data;
      } else {
        setMutationError(response.error || 'Hasta güncellenemedi.');
        return null;
      }
    } catch (err: any) {
      setMutationError(err.message || 'Bağlantı hatası oluştu.');
      return null;
    } finally {
      setMutating(false);
    }
  }, []);

  /**
   * Hasta sil
   */
  const deletePatient = useCallback(async (id: string): Promise<boolean> => {
    setMutating(true);
    setMutationError(null);

    try {
      const response = await PatientAPI.delete(id);

      if (response.success) {
        return true;
      } else {
        setMutationError(response.error || 'Hasta silinemedi.');
        return false;
      }
    } catch (err: any) {
      setMutationError(err.message || 'Bağlantı hatası oluştu.');
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  /**
   * Hata mesajını temizle
   */
  const clearError = useCallback(() => {
    setMutationError(null);
  }, []);

  return {
    createPatient,
    updatePatient,
    deletePatient,
    mutating,
    mutationError,
    clearError,
  };
}

// =============================================
// usePatientStats — İstatistik Hook'u
// =============================================

interface UsePatientStatsState {
  stats: PatientStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * usePatientStats — Dashboard istatistikleri hook'u
 *
 * @example
 * const { stats, loading } = usePatientStats();
 * // stats.totalPatients, stats.activePatients, etc.
 */
export function usePatientStats(): UsePatientStatsState {
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await PatientAPI.getStats();

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'İstatistikler alınamadı.');
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}
