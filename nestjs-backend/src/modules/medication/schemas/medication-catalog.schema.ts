import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class MedicationCatalog extends Document {
  @Prop({ required: true, unique: true, index: true })
  barcode: string;

  @Prop({ required: true })
  medicationName: string;

  @Prop()
  activeIngredient?: string;

  @Prop()
  usagePurpose?: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true, enum: ['pending', 'verified'], default: 'pending' })
  verificationStatus: 'pending' | 'verified';
}

export const MedicationCatalogSchema = SchemaFactory.createForClass(MedicationCatalog);
