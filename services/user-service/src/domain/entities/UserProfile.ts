export interface IUserProfile {
  id?: string;
  userId: string;
  firstName: string;
  lastName: string;
  nationalId?: string; // TC Kimlik No (encrypted in DB)
  email?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  bloodType?: string;
  phone?: string;
  avatarUrl?: string;
  height?: number; // Boy
  weight?: number; // Kilo
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  lastLoginDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHealthInfo {
  id?: string;
  userId: string;
  allergies: string[];
  diseases: string[];
  currentMedications: string[];
  weight?: number;
  height?: number;
  notes?: string;
  updatedAt: Date;
}
