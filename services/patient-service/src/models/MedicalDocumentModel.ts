import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicalDocument extends Document {
  userId: string;
  title: string;
  documentType: 'pdf' | 'lab_result' | 'mr' | 'tomography' | 'xray' | 'prescription' | 'other';
  fileId: mongoose.Types.ObjectId; // Reference to GridFS file
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string; // userId or doctorId
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalDocumentSchema = new Schema<IMedicalDocument>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 200 },
  documentType: {
    type: String,
    required: true,
    enum: ['pdf', 'lab_result', 'mr', 'tomography', 'xray', 'prescription', 'other']
  },
  fileId: { type: Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  contentType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  uploadedBy: { type: String, required: true },
  notes: { type: String, maxlength: 1000 }
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      const { _id, __v, ...rest } = ret;
      return { id: _id.toString(), ...rest };
    }
  }
});

export const MedicalDocumentModel = mongoose.model<IMedicalDocument>('MedicalDocument', MedicalDocumentSchema);
