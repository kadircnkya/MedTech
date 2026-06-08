import { IUser } from '../entities/User';

export interface IUserRepository {
  create(user: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser>;
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  updateRefreshTokens(userId: string, tokens: IUser['refreshTokens']): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}
