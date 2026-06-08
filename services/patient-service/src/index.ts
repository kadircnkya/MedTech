// =============================================================
// index.ts — Patient Service Entry Point
// =============================================================
// Express sunucusunu yapılandırır ve başlatır.
// Güvenlik middleware'leri, rate limiting, CORS, MongoDB bağlantısı
// ve route'ları kurarak production-ready bir API sunucusu oluşturur.
// =============================================================

import dotenv from 'dotenv';
// .env dosyasını en başta yükle (diğer importlar env değişkenlerini kullanabilir)
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import { connectDatabase, disconnectDatabase, logger } from './config';
import { PatientController } from './controllers/PatientController';
import { MongoPatientRepository } from './infrastructure/database/MongoPatientRepository';
import { createPatientRoutes } from './routes/patientRoutes';
import { errorHandler } from './middleware/errorHandler';

// Express uygulamasını oluştur
const app = express();
const PORT = process.env.PORT || 3009;

// =============================================
// GÜVENLİK MİDDLEWARE'LERİ
// =============================================

// Helmet — HTTP güvenlik header'ları
// XSS, MIME sniffing, clickjacking vb. saldırılara karşı koruma
app.use(helmet());

// CORS — Cross-Origin Resource Sharing
// Frontend'in backend'e istek atabilmesi için
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // Preflight cache süresi (24 saat)
}));

// Rate Limiting — API isteklerini sınırlandır
// DDoS ve brute-force saldırılarına karşı koruma
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 dakika
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),      // Pencere başına max istek
  standardHeaders: true,  // `RateLimit-*` header'ları döndür
  legacyHeaders: false,   // `X-RateLimit-*` header'ları devre dışı
  message: {
    success: false,
    error: 'Çok fazla istek gönderildi. Lütfen bir süre bekleyin.',
  },
});
app.use('/api/', limiter);

// =============================================
// BODY PARSING & LOGGING
// =============================================

// JSON body parser (limit: 10mb — büyük payload'ları engellemek için)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP Request Logger (development'ta detaylı, production'da kısa format)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// =============================================
// HEALTH CHECK ENDPOINT
// =============================================

/** GET /health — Servis sağlık kontrolü */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'patient-service',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
});

// =============================================
// BOOTSTRAP — Uygulama Başlatma
// =============================================

async function bootstrap(): Promise<void> {
  // 1. MongoDB'ye bağlan
  await connectDatabase();

  // 2. Repository ve Controller'ı oluştur (Dependency Injection)
  const patientRepo = new MongoPatientRepository();
  const patientController = new PatientController(patientRepo);

  // 3. Route'ları kaydet
  app.use('/api/v1/patients', createPatientRoutes(patientController));

  // 4. 404 Handler — tanımsız route'lar için
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint bulunamadı.',
    });
  });

  // 5. Global Error Handler (en son middleware olmalı)
  app.use(errorHandler);

  // 6. Sunucuyu başlat
  app.listen(PORT, () => {
    logger.info(`[Patient Service] 🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
    logger.info(`[Patient Service] 📋 API Base URL: http://localhost:${PORT}/api/v1/patients`);
    logger.info(`[Patient Service] 🔒 Ortam: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Uygulamayı başlat
bootstrap().catch((err) => {
  logger.error('[Patient Service] ❌ Başlatma hatası:', err);
  process.exit(1);
});

// =============================================
// GRACEFUL SHUTDOWN
// =============================================

// SIGTERM sinyali (Docker, Kubernetes vb.)
process.on('SIGTERM', async () => {
  logger.info('[Patient Service] SIGTERM sinyali alındı. Kapatılıyor...');
  await disconnectDatabase();
  process.exit(0);
});

// SIGINT sinyali (Ctrl+C)
process.on('SIGINT', async () => {
  logger.info('[Patient Service] SIGINT sinyali alındı. Kapatılıyor...');
  await disconnectDatabase();
  process.exit(0);
});

// Yakalanmamış hatalar
process.on('uncaughtException', (err) => {
  logger.error('[Patient Service] Yakalanmamış hata:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[Patient Service] İşlenmemiş Promise rejection:', reason);
  process.exit(1);
});
