// =============================================================
// controllers/PatientController.ts — Hasta CRUD Controller
// =============================================================
// RESTful API endpoint handler'ları.
// Joi validation, repository pattern ve clean response format.
// =============================================================

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { IPatientRepository } from '../domain/repositories/IPatientRepository';
import { logger } from '../config/logger';

/**
 * PatientController — Hasta verisi CRUD işlemleri
 *
 * Dependency Injection ile repository alır.
 * Her method arrow function olarak tanımlanmıştır (`this` binding koruması için).
 */
export class PatientController {
  constructor(private patientRepo: IPatientRepository) {}

  // =============================================
  // Validation Schemas (Joi)
  // =============================================

  /** Yeni hasta oluşturma validation şeması */
  private createSchema = Joi.object({
    patientName: Joi.string().trim().min(2).max(200).required()
      .messages({
        'string.min': 'Hasta adı en az 2 karakter olmalıdır.',
        'string.max': 'Hasta adı en fazla 200 karakter olabilir.',
        'any.required': 'Hasta adı zorunludur.',
      }),
    age: Joi.number().integer().min(0).max(150).required()
      .messages({
        'number.min': 'Yaş 0\'dan küçük olamaz.',
        'number.max': 'Yaş 150\'den büyük olamaz.',
        'any.required': 'Yaş alanı zorunludur.',
      }),
    gender: Joi.string().valid('erkek', 'kadın', 'diğer').required()
      .messages({
        'any.only': 'Cinsiyet erkek, kadın veya diğer olmalıdır.',
        'any.required': 'Cinsiyet alanı zorunludur.',
      }),
    diagnosis: Joi.string().trim().max(500).required()
      .messages({
        'string.max': 'Tanı en fazla 500 karakter olabilir.',
        'any.required': 'Tanı alanı zorunludur.',
      }),
    department: Joi.string().trim().max(100).optional(),
    doctor: Joi.string().trim().max(200).optional(),
    notes: Joi.string().trim().max(2000).optional().allow(''),
    status: Joi.string().valid('aktif', 'tedavi_altında', 'taburcu', 'takipte').optional()
      .default('aktif'),
    date: Joi.date().optional().default(() => new Date()),
  });

  /** Hasta güncelleme validation şeması (tüm alanlar opsiyonel) */
  private updateSchema = Joi.object({
    patientName: Joi.string().trim().min(2).max(200).optional(),
    age: Joi.number().integer().min(0).max(150).optional(),
    gender: Joi.string().valid('erkek', 'kadın', 'diğer').optional(),
    diagnosis: Joi.string().trim().max(500).optional(),
    department: Joi.string().trim().max(100).optional().allow(''),
    doctor: Joi.string().trim().max(200).optional().allow(''),
    notes: Joi.string().trim().max(2000).optional().allow(''),
    status: Joi.string().valid('aktif', 'tedavi_altında', 'taburcu', 'takipte').optional(),
    date: Joi.date().optional(),
  }).min(1).messages({
    'object.min': 'En az bir alan güncellenmelidir.',
  });

  // =============================================
  // CRUD Endpoints
  // =============================================

  /**
   * POST /api/v1/patients
   * Yeni hasta kaydı oluşturur
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Request body'yi doğrula
      const { error, value } = this.createSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const messages = error.details.map((d) => d.message);
        res.status(400).json({ success: false, error: 'Doğrulama hatası', details: messages });
        return;
      }

      // Kaydı oluşturan kullanıcıyı ekle (JWT'den)
      if (req.user) {
        value.createdBy = req.user.userId;
      }

      const patient = await this.patientRepo.create(value);

      logger.info(`[Controller] Yeni hasta oluşturuldu: ${patient.id}`, {
        patientName: patient.patientName,
        createdBy: patient.createdBy,
      });

      res.status(201).json({
        success: true,
        message: 'Hasta kaydı başarıyla oluşturuldu.',
        data: patient,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/patients
   * Tüm hastaları listeler (pagination, arama, filtreleme, sıralama)
   *
   * Query parametreleri:
   * - page (default: 1)
   * - limit (default: 10, max: 100)
   * - search (hasta adı veya tanıda arama)
   * - status (aktif, tedavi_altında, taburcu, takipte)
   * - sortBy (default: createdAt)
   * - sortOrder (asc | desc, default: desc)
   */
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const result = await this.patientRepo.findAll({
        page,
        limit,
        search,
        status,
        sortBy,
        sortOrder,
      });

      res.status(200).json({
        success: true,
        message: 'Hastalar başarıyla listelendi.',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/patients/stats
   * Dashboard istatistiklerini getirir
   */
  getStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.patientRepo.getStats();

      res.status(200).json({
        success: true,
        message: 'İstatistikler başarıyla alındı.',
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/patients/:id
   * Belirli bir hastayı getirir
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const patient = await this.patientRepo.findById(id);
      if (!patient) {
        res.status(404).json({
          success: false,
          error: 'Hasta kaydı bulunamadı.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: patient,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /api/v1/patients/:id
   * Hasta kaydını günceller
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Güncelleme verisini doğrula
      const { error, value } = this.updateSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const messages = error.details.map((d) => d.message);
        res.status(400).json({ success: false, error: 'Doğrulama hatası', details: messages });
        return;
      }

      const patient = await this.patientRepo.update(id, value);
      if (!patient) {
        res.status(404).json({
          success: false,
          error: 'Güncellenecek hasta kaydı bulunamadı.',
        });
        return;
      }

      logger.info(`[Controller] Hasta güncellendi: ${id}`, {
        updatedFields: Object.keys(value),
      });

      res.status(200).json({
        success: true,
        message: 'Hasta kaydı başarıyla güncellendi.',
        data: patient,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/patients/:id
   * Hasta kaydını siler
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const deleted = await this.patientRepo.delete(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Silinecek hasta kaydı bulunamadı.',
        });
        return;
      }

      logger.info(`[Controller] Hasta silindi: ${id}`, {
        deletedBy: req.user?.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Hasta kaydı başarıyla silindi.',
      });
    } catch (err) {
      next(err);
    }
  };
}
