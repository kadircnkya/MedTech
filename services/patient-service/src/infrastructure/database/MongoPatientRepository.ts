// =============================================================
// infrastructure/database/MongoPatientRepository.ts
// =============================================================
// IPatientRepository arayüzünün MongoDB/Mongoose implementasyonu.
// Tüm veritabanı işlemleri burada gerçekleştirilir.
// =============================================================

import { IPatientRepository } from '../../domain/repositories/IPatientRepository';
import { IPatient } from '../../domain/entities/Patient';
import { PatientModel } from '../../models/PatientModel';
import { logger } from '../../config/logger';

export class MongoPatientRepository implements IPatientRepository {
  /**
   * Yeni hasta kaydı oluşturur
   */
  async create(patient: Omit<IPatient, 'id' | 'createdAt' | 'updatedAt'>): Promise<IPatient> {
    const doc = await PatientModel.create(patient);
    logger.info(`[Repository] Hasta oluşturuldu: ${doc._id}`);
    return this.toEntity(doc);
  }

  /**
   * Tüm hastaları listeler — pagination, arama ve sıralama desteği
   */
  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: IPatient[]; total: number; page: number; totalPages: number }> {
    const { page, limit, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    // Filtre oluştur
    const filter: Record<string, unknown> = {};

    // Metin bazlı arama (hasta adı veya tanı)
    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } },
        { doctor: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filtresi
    if (status) {
      filter.status = status;
    }

    // Sıralama objesi
    const sortObj: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const skip = (page - 1) * limit;

    // Paralel sorgu — veri ve toplam sayı aynı anda
    const [data, total] = await Promise.all([
      PatientModel.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      PatientModel.countDocuments(filter),
    ]);

    return {
      data: data.map(this.toEntity),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * ID'ye göre hasta bulur
   */
  async findById(id: string): Promise<IPatient | null> {
    const doc = await PatientModel.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Hasta kaydını günceller (partial update)
   */
  async update(id: string, data: Partial<IPatient>): Promise<IPatient | null> {
    const doc = await PatientModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (doc) {
      logger.info(`[Repository] Hasta güncellendi: ${id}`);
    }

    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Hasta kaydını siler
   */
  async delete(id: string): Promise<boolean> {
    const result = await PatientModel.findByIdAndDelete(id);
    if (result) {
      logger.info(`[Repository] Hasta silindi: ${id}`);
    }
    return !!result;
  }

  /**
   * Belirli kullanıcının oluşturduğu kayıtları getirir
   */
  async findByCreatedBy(userId: string): Promise<IPatient[]> {
    const docs = await PatientModel.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(this.toEntity);
  }

  /**
   * Dashboard istatistikleri
   */
  async getStats(): Promise<{
    totalPatients: number;
    activePatients: number;
    dischargedPatients: number;
    underTreatment: number;
  }> {
    const [totalPatients, activePatients, dischargedPatients, underTreatment] = await Promise.all([
      PatientModel.countDocuments(),
      PatientModel.countDocuments({ status: 'aktif' }),
      PatientModel.countDocuments({ status: 'taburcu' }),
      PatientModel.countDocuments({ status: 'tedavi_altında' }),
    ]);

    return { totalPatients, activePatients, dischargedPatients, underTreatment };
  }

  /**
   * Mongoose document'ını domain entity'sine dönüştürür
   */
  private toEntity(doc: any): IPatient {
    return {
      id: doc._id.toString(),
      patientName: doc.patientName,
      age: doc.age,
      gender: doc.gender,
      diagnosis: doc.diagnosis,
      department: doc.department,
      doctor: doc.doctor,
      notes: doc.notes,
      status: doc.status,
      date: doc.date,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
