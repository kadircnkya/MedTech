// =============================================================
// domain/repositories/IPatientRepository.ts — Repository Arayüzü
// =============================================================
// Domain katmanında tanımlanan soyut repository arayüzü.
// Infrastructure katmanı bu arayüzü implemente eder.
// =============================================================

import { IPatient } from '../entities/Patient';

/**
 * IPatientRepository — Hasta verisi işlemleri için soyut arayüz
 *
 * Clean Architecture prensibi gereği domain katmanı
 * veritabanı implementasyonundan bağımsızdır.
 */
export interface IPatientRepository {
  /** Yeni hasta kaydı oluşturur */
  create(patient: Omit<IPatient, 'id' | 'createdAt' | 'updatedAt'>): Promise<IPatient>;

  /** Tüm hastaları listeler (pagination desteği ile) */
  findAll(options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: IPatient[]; total: number; page: number; totalPages: number }>;

  /** ID'ye göre hasta bulur */
  findById(id: string): Promise<IPatient | null>;

  /** Hasta kaydını günceller */
  update(id: string, data: Partial<IPatient>): Promise<IPatient | null>;

  /** Hasta kaydını siler */
  delete(id: string): Promise<boolean>;

  /** Belirli bir kullanıcının oluşturduğu hasta kayıtlarını getirir */
  findByCreatedBy(userId: string): Promise<IPatient[]>;

  /** İstatistik verileri getirir */
  getStats(): Promise<{
    totalPatients: number;
    activePatients: number;
    dischargedPatients: number;
    underTreatment: number;
  }>;
}
