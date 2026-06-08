// =============================================================
// models/PatientModel.ts — Mongoose Hasta Modeli
// =============================================================
// MongoDB collection için Mongoose Schema ve Model tanımı.
// Indexes, validation ve timestamps ile production-ready yapı.
// =============================================================

import mongoose, { Schema, Document } from 'mongoose';
import { IPatient } from '../domain/entities/Patient';

/**
 * PatientDocument — Mongoose Document arayüzü
 * IPatient arayüzünü extend eder, MongoDB'ye özgü alanlar ekler
 */
interface PatientDocument extends Document, Omit<IPatient, 'id'> {}

/**
 * PatientSchema — Hasta kayıt şeması
 *
 * Önemli özellikler:
 * - patientName üzerinde text index (arama için)
 * - diagnosis üzerinde index (filtreleme için)
 * - status üzerinde index (durum filtreleme)
 * - createdBy üzerinde index (kullanıcı bazlı sorgular)
 * - timestamps: otomatik createdAt/updatedAt
 */
const PatientSchema = new Schema<PatientDocument>(
  {
    patientName: {
      type: String,
      required: [true, 'Hasta adı zorunludur'],
      trim: true,
      minlength: [2, 'Hasta adı en az 2 karakter olmalıdır'],
      maxlength: [200, 'Hasta adı en fazla 200 karakter olabilir'],
    },
    age: {
      type: Number,
      required: [true, 'Yaş alanı zorunludur'],
      min: [0, 'Yaş 0\'dan küçük olamaz'],
      max: [150, 'Yaş 150\'den büyük olamaz'],
    },
    gender: {
      type: String,
      required: [true, 'Cinsiyet alanı zorunludur'],
      enum: {
        values: ['erkek', 'kadın', 'diğer'],
        message: 'Geçersiz cinsiyet değeri: {VALUE}',
      },
    },
    diagnosis: {
      type: String,
      required: [true, 'Tanı alanı zorunludur'],
      trim: true,
      maxlength: [500, 'Tanı en fazla 500 karakter olabilir'],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, 'Departman adı en fazla 100 karakter olabilir'],
    },
    doctor: {
      type: String,
      trim: true,
      maxlength: [200, 'Doktor adı en fazla 200 karakter olabilir'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notlar en fazla 2000 karakter olabilir'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['aktif', 'tedavi_altında', 'taburcu', 'takipte'],
        message: 'Geçersiz durum değeri: {VALUE}',
      },
      default: 'aktif',
    },
    date: {
      type: Date,
      required: [true, 'Tarih alanı zorunludur'],
      default: Date.now,
    },
    createdBy: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true, // createdAt ve updatedAt otomatik eklenir
    toJSON: {
      // API response'unda _id yerine id döndür
      transform: (_doc, ret) => {
        const { _id, __v, ...rest } = ret;
        return { id: _id.toString(), ...rest };
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        const { _id, __v, ...rest } = ret;
        return { id: _id.toString(), ...rest };
      },
    },
  }
);

// Compound indexes — sorgu performansı için
PatientSchema.index({ patientName: 'text', diagnosis: 'text' }); // Full-text search
PatientSchema.index({ status: 1, createdAt: -1 });               // Status + tarih filtresi
PatientSchema.index({ createdBy: 1, createdAt: -1 });            // Kullanıcı bazlı sorgular

export const PatientModel = mongoose.model<PatientDocument>('Patient', PatientSchema);
