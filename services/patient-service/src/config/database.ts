// =============================================================
// config/database.ts — MongoDB Bağlantı Konfigürasyonu
// =============================================================
// Mongoose ile MongoDB'ye bağlantıyı yöneten modül.
// .env üzerinden MONGO_URI alır, bağlantı durumunu loglar.
// Graceful shutdown desteği sunar.
// =============================================================

import mongoose from 'mongoose';
import { logger } from './logger';

/**
 * MongoDB'ye bağlanır.
 * Bağlantı başarılı olursa log basar, hata olursa process.exit(1) ile çıkar.
 */
export const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/patient_db';

  try {
    await mongoose.connect(mongoUri, {
      // Mongoose 8+ — connection options artık mongoose.connect() içinde verilir
      maxPoolSize: 10,          // Maksimum bağlantı havuzu boyutu
      serverSelectionTimeoutMS: 5000, // Sunucu seçim zaman aşımı
      socketTimeoutMS: 45000,   // Soket zaman aşımı
    });

    logger.info('[Patient Service] ✅ MongoDB bağlantısı başarılı');
    logger.info(`[Patient Service] 📦 Database: ${mongoose.connection.name}`);
  } catch (error) {
    logger.error('[Patient Service] ❌ MongoDB bağlantı hatası:', error);
    process.exit(1);
  }

  // Bağlantı olaylarını dinle
  mongoose.connection.on('error', (err) => {
    logger.error('[Patient Service] MongoDB bağlantı hatası:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('[Patient Service] MongoDB bağlantısı koptu');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('[Patient Service] MongoDB yeniden bağlandı');
  });
};

/**
 * Graceful shutdown — MongoDB bağlantısını düzgünce kapatır
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('[Patient Service] MongoDB bağlantısı kapatıldı');
  } catch (error) {
    logger.error('[Patient Service] MongoDB kapatma hatası:', error);
  }
};
