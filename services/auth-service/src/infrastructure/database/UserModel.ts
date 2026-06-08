import mongoose, { Schema, Document } from 'mongoose';
import { IUser, RefreshToken } from '../../domain/entities/User';

interface UserDocument extends Document, Omit<IUser, 'id'> {}

const RefreshTokenSchema = new Schema<RefreshToken>(
  {
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient',
    },
    isVerified: { type: Boolean, default: false },
    refreshTokens: [RefreshTokenSchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const { _id, __v, passwordHash, ...rest } = ret;
        return { id: _id.toString(), ...rest };
      },
    },
  }
);

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
