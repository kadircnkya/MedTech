// =============================================================
// config/logger.ts — Winston Logger Konfigürasyonu
// =============================================================
// Uygulama genelinde kullanılan structured logger.
// Development'ta colorize, production'da JSON format kullanır.
// =============================================================

import winston from 'winston';

const { combine, timestamp, colorize, printf, json } = winston.format;

// Özel log formatı (development için)
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

/**
 * Uygulama genelinde kullanılan Winston logger instance'ı.
 * - Development: Renkli, okunabilir format
 * - Production: JSON format (log aggregation için uygun)
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'patient-service' },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? combine(timestamp(), json())
          : combine(timestamp({ format: 'HH:mm:ss' }), colorize(), devFormat),
    }),
  ],
});
