import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

// Secret key for encryption - In production this should come from process.env
// Must be 32 bytes for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'medtech_secret_key_32_bytes_long_'; // Ensure 32 bytes
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text: string): string {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    return text;
  }
}

function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return text;
  }
}

interface UserProfileDocument extends Document {
  userId: string;
  firstName: string;
  lastName: string;
  nationalId?: string;
  email?: string;
  dateOfBirth?: Date;
  gender?: string;
  bloodType?: string;
  phone?: string;
  avatarUrl?: string;
  height?: number;
  weight?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  lastLoginDate?: Date;
  isDeleted?: boolean;
}

const UserProfileSchema = new Schema<UserProfileDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    nationalId: { 
      type: String, 
      set: encrypt, 
      get: decrypt 
    },
    email: { type: String },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    bloodType: { type: String },
    phone: { type: String },
    avatarUrl: { type: String },
    height: { type: Number },
    weight: { type: Number },
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },
    lastLoginDate: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// We keep HealthInfoSchema here for backwards compatibility, but it will be moved to patient-service
interface HealthInfoDocument extends Document {
  userId: string;
  allergies: string[];
  diseases: string[];
  currentMedications: string[];
  weight?: number;
  height?: number;
  notes?: string;
}

const HealthInfoSchema = new Schema<HealthInfoDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    allergies: [{ type: String }],
    diseases: [{ type: String }],
    currentMedications: [{ type: String }],
    weight: Number,
    height: Number,
    notes: String,
  },
  { timestamps: true }
);

export const UserProfileModel = mongoose.model<UserProfileDocument>('UserProfile', UserProfileSchema);
export const HealthInfoModel = mongoose.model<HealthInfoDocument>('HealthInfo', HealthInfoSchema);
