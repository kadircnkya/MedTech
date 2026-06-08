// =============================================================
// middleware/errorHandler.ts — Global Error Handler
// =============================================================
// Tüm Express hatalarını yakalayıp standart JSON response döndürür.
// Mongoose validation hatalarını, CastError'ları ve duplicate key
// hatalarını ayrı ayrı işler.
// =============================================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Özel API hata sınıfı
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, details);
  }

  static notFound(message: string) {
    return new ApiError(404, message);
  }

  static unauthorized(message: string) {
    return new ApiError(401, message);
  }

  static forbidden(message: string) {
    return new ApiError(403, message);
  }

  static internal(message: string) {
    return new ApiError(500, message);
  }
}

/**
 * Global Error Handler Middleware
 *
 * Mongoose ve Express hatalarını ayırt ederek
 * kullanıcı dostu hata mesajları döndürür.
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('[Error Handler]', {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Custom ApiError
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
    });
    return;
  }

  // Mongoose Validation Error (model validation hatası)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    res.status(400).json({
      success: false,
      error: 'Doğrulama hatası',
      details: messages,
    });
    return;
  }

  // Mongoose CastError (geçersiz ObjectId vb.)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: `Geçersiz ${err.path} değeri: ${err.value}`,
    });
    return;
  }

  // MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    res.status(409).json({
      success: false,
      error: `"${field}" alanı zaten mevcut. Duplicate key hatası.`,
    });
    return;
  }

  // Fallback — bilinmeyen hata
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Sunucu hatası oluştu.'
      : err.message || 'Bilinmeyen bir hata oluştu.',
  });
};
