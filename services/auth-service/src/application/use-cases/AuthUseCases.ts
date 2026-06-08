import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { RegisterDTO, LoginDTO, AuthResponseDTO } from '../dtos/AuthDTO';

export class RegisterUseCase {
  constructor(
    private userRepo: IUserRepository,
    private messageBroker: { publishEvent: (exchange: string, key: string, data: unknown) => Promise<void> }
  ) {}

  async execute(dto: RegisterDTO): Promise<AuthResponseDTO> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.userRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role || 'patient',
      isVerified: false,
      refreshTokens: [],
    });

    const accessToken = this.generateAccessToken(user.id!, user.email, user.role);
    const refreshToken = this.generateRefreshToken();
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.userRepo.updateRefreshTokens(user.id!, [
      { token: refreshToken, expiresAt: refreshExpiry, createdAt: new Date() },
    ]);

    // Publish event for User Service to create profile
    await this.messageBroker.publishEvent('mediflow.users', 'user.registered', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id!, email: user.email, role: user.role },
    };
  }

  private generateAccessToken(userId: string, email: string, role: string): string {
    const expiresIn = parseInt(process.env.JWT_EXPIRY_SECONDS || '900', 10); // 15 min default
    return jwt.sign(
      { userId, email, role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn }
    );
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }
}

export class LoginUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(dto: LoginDTO): Promise<AuthResponseDTO> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const expiresIn = parseInt(process.env.JWT_EXPIRY_SECONDS || '900', 10);
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Keep last 5 refresh tokens, remove expired
    const validTokens = user.refreshTokens
      .filter((rt) => rt.expiresAt > new Date())
      .slice(-4);

    validTokens.push({ token: refreshToken, expiresAt: refreshExpiry, createdAt: new Date() });
    await this.userRepo.updateRefreshTokens(user.id!, validTokens);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id!, email: user.email, role: user.role },
    };
  }
}

export class RefreshTokenUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Find user with this refresh token (we'd need a more efficient lookup in production)
    // For now, this is handled in the infrastructure layer
    throw new Error('Not implemented - handled at infrastructure level');
  }
}
