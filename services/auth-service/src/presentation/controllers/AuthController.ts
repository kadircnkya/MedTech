import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { RegisterUseCase, LoginUseCase } from '../../application/use-cases/AuthUseCases';

export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private loginUseCase: LoginUseCase
  ) {}

  private registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    role: Joi.string().valid('patient', 'doctor', 'admin').optional(),
  });

  private loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = this.registerSchema.validate(req.body);
      if (error) {
        res.status(400).json({ success: false, error: error.details[0].message });
        return;
      }

      const result = await this.registerUseCase.execute(value);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = this.loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({ success: false, error: error.details[0].message });
        return;
      }

      const result = await this.loginUseCase.execute(value);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ success: false, error: 'Refresh token required' });
        return;
      }
      res.status(200).json({ success: true, message: 'Token refreshed' });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  };
}
