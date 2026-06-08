// Domain Entity - User (Pure, no framework dependencies)

export interface RefreshToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IUser {
  id?: string;
  email: string;
  passwordHash: string;
  role: 'patient' | 'doctor' | 'admin';
  isVerified: boolean;
  refreshTokens: RefreshToken[];
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  constructor(
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly role: 'patient' | 'doctor' | 'admin' = 'patient',
    public readonly isVerified: boolean = false,
    public readonly refreshTokens: RefreshToken[] = [],
    public readonly id?: string,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  static create(email: string, passwordHash: string, role?: 'patient' | 'doctor' | 'admin'): User {
    return new User(email, passwordHash, role || 'patient', false, []);
  }

  addRefreshToken(token: string, expiresAt: Date): User {
    const newTokens = [
      ...this.refreshTokens.filter((rt) => rt.expiresAt > new Date()),
      { token, expiresAt, createdAt: new Date() },
    ];
    return new User(this.email, this.passwordHash, this.role, this.isVerified, newTokens, this.id);
  }

  removeRefreshToken(token: string): User {
    const newTokens = this.refreshTokens.filter((rt) => rt.token !== token);
    return new User(this.email, this.passwordHash, this.role, this.isVerified, newTokens, this.id);
  }
}
