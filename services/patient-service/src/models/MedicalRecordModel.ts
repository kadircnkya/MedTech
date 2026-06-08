import mongoose, { Schema, Document } from 'mongoose';

export type RecordType = 'allergy' | 'disease' | 'chronic' | 'operation' | 'vaccine' | 'family_history' | 'doctor_note' | 'medication_history';

interface IRecordVersion {
  content: string;
  updatedAt: Date;
  updatedBy?: string; // Doctor ID or User ID
}

export interface IMedicalRecord extends Document {
  userId: string;
  recordType: RecordType;
  title: string;
  description: string;
  diagnosisDate?: Date;
  status: 'active' | 'resolved' | 'ongoing';
  versions: IRecordVersion[]; // For versioning
  createdAt: Date;
  updatedAt: Date;
}

const VersionSchema = new Schema<IRecordVersion>({
  content: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String }
}, { _id: false });

const MedicalRecordSchema = new Schema<IMedicalRecord>({
  userId: { type: String, required: true, index: true },
  recordType: { 
    type: String, 
    required: true,
    enum: ['allergy', 'disease', 'chronic', 'operation', 'vaccine', 'family_history', 'doctor_note', 'medication_history'],
    index: true
  },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 2000 },
  diagnosisDate: { type: Date },
  status: { 
    type: String, 
    enum: ['active', 'resolved', 'ongoing'],
    default: 'active'
  },
  versions: [VersionSchema]
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      const { _id, __v, ...rest } = ret;
      return { id: _id.toString(), ...rest };
    }
  }
});

MedicalRecordSchema.index({ userId: 1, recordType: 1 });

export const MedicalRecordModel = mongoose.model<IMedicalRecord>('MedicalRecord', MedicalRecordSchema);
