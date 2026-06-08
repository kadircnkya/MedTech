// =============================================================
// middleware/authMiddleware.ts — JWT Authentication Middleware
// =============================================================
// Her korumalı endpoint'e gelen isteklerde JWT token doğrulaması yapar.
// Token geçerliyse req.user objesine decoded payload eklenir.
// =============================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

/**
 * JWT Token Payload Arayüzü
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  iat?: number;
  exp?: number;
}

/**
 * Express Request'e user property ekler
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * JWT Authentication Middleware
 *
 * Header'da "Authorization: Bearer <token>" formatında token bekler.
 * Token doğrulanırsa req.user'a decoded payload atanır.
 *
 * @example
 * router.get('/protected', authMiddleware, controller.method);
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  // Authorization header kontrolü
  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('[Auth] Eksik veya hatalı Authorization header', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      success: false,
      error: 'Kimlik doğrulama gerekli. Authorization header eksik.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // JWT'yi doğrula ve decode et
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default_secret'
    ) as JWTPayload;

    // Decoded payload'ı request'e ekle
    req.user = decoded;
    next();
  } catch (error: any) {
    // Token tipine göre spesifik hata mesajları
    if (error.name === 'TokenExpiredError') {
      logger.warn('[Auth] Token süresi dolmuş', { ip: req.ip });
      res.status(401).json({
        success: false,
        error: 'Token süresi dolmuş. Lütfen tekrar giriş yapın.',
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      logger.warn('[Auth] Geçersiz token', { ip: req.ip });
      res.status(401).json({
        success: false,
        error: 'Geçersiz token.',
      });
      return;
    }

    logger.error('[Auth] Token doğrulama hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Kimlik doğrulama işlemi başarısız.',
    });
  }
};

/**
 * Opsiyonel Auth Middleware
 * Token varsa decode eder, yoksa da devam eder.
 * Public endpoint'ler için kullanılır.
 */
export const optionalAuthMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default_secret'
      ) as JWTPayload;
      req.user = decoded;
    } catch {
      // Token geçersizse sessizce devam et
    }
  }

  next();
};

/**
 * Rol bazlı yetkilendirme middleware'i
 *
 * @example
 * router.delete('/:id', authMiddleware, authorizeRoles('admin', 'doctor'), controller.delete);
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Kimlik doğrulama gerekli.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('[Auth] Yetkisiz erişim denemesi', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      res.status(403).json({
        success: false,
        error: 'Bu işlem için yetkiniz bulunmamaktadır.',
      });
      return;
    }

    next();
  };
};
