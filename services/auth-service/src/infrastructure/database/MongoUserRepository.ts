import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IUser } from '../../domain/entities/User';
import { UserModel } from './UserModel';

export class MongoUserRepository implements IUserRepository {
  async create(user: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    const doc = await UserModel.create(user);
    return this.toEntity(doc);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() });
    return doc ? this.toEntity(doc) : null;
  }

  async findById(id: string): Promise<IUser | null> {
    const doc = await UserModel.findById(id);
    return doc ? this.toEntity(doc) : null;
  }

  async updateRefreshTokens(userId: string, tokens: IUser['refreshTokens']): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { refreshTokens: tokens });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { passwordHash, refreshTokens: [] });
  }

  private toEntity(doc: any): IUser {
    return {
      id: doc._id.toString(),
      email: doc.email,
      passwordHash: doc.passwordHash,
      role: doc.role,
      isVerified: doc.isVerified,
      refreshTokens: doc.refreshTokens || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
