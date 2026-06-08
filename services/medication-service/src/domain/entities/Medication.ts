import mongoose, { Schema, Document } from 'mongoose';

export interface IMedication {
  id?: string;
  // === Temel Kimlik Alanları ===
  name: string;                    // İlaç ticari adı
  genericName: string;             // Jenerik adı
  activeIngredient: string;        // Etken madde
  barcode: string;                 // EAN-13 / GTIN barkod (UNIQUE)
  gtin?: string;                   // GTIN-14 (varsa)
  atcCode?: string;                // WHO ATC sınıflandırma kodu

  // === Üretici & Kayıt ===
  manufacturer: string;            // Üretici firma
  licenseNumber?: string;          // Ruhsat numarası (TİTCK)

  // === Farmasötik Bilgiler ===
  dosageForm: string;              // Tablet, Kapsül, Şurup, Damla, Enjeksiyon...
  strength: string;                // 500mg, 10mg/5mL, vb.
  dosageInfo: string;              // Doz bilgisi (günde 2x, yemekten önce vb.)
  usageInstructions: string;       // Kullanım şekli (nasıl kullanılacağı)
  routeOfAdministration?: string;  // Oral, İV, İM, Topikal...

  // === Prospektüs & Güvenlik ===
  prospectus: string;              // Tam prospektüs metni
  description: string;             // Kısa açıklama
  sideEffects: string[];           // Yan etkiler
  interactions: string[];          // İlaç etkileşimleri
  contraindications: string[];     // Kontrendikasyonlar
  warnings: string[];              // Uyarılar
  storageConditions?: string;      // Saklama koşulları

  // === Sınıflandırma ===
  category: string;                // İlaç kategorisi
  subCategory?: string;            // Alt kategori
  isPrescriptionRequired: boolean; // Reçeteli mi? (Rx/OTC)
  isControlledSubstance?: boolean; // Uyuşturucu / kontrole tabi mi?
  isActive: boolean;               // Aktif mi?

  // === Kaynak & Doğrulama ===
  verificationStatus: 'pending' | 'verified' | 'rejected';
  source: 'system' | 'user' | 'titck_api'; // Veri kaynağı
  lastSyncDate: Date;              // Son güncelleme tarihi
  addedBy?: string;                // Ekleyen kullanıcı ID (user source ise)
}

interface MedicationDocument extends Document, Omit<IMedication, 'id'> {}

const MedicationSchema = new Schema<MedicationDocument>(
  {
    // Temel kimlik
    name: { type: String, required: true, index: true },
    genericName: { type: String, required: true },
    activeIngredient: { type: String, required: true, default: '' },
    barcode: { type: String, required: true, unique: true, index: true },
    gtin: { type: String, default: '' },
    atcCode: { type: String, default: '' },

    // Üretici
    manufacturer: { type: String, required: true },
    licenseNumber: { type: String, default: '' },

    // Farmasötik
    dosageForm: { type: String, required: true },
    strength: { type: String, required: true },
    dosageInfo: { type: String, default: '' },
    usageInstructions: { type: String, default: '' },
    routeOfAdministration: { type: String, default: 'Oral' },

    // Prospektüs
    prospectus: { type: String, default: '' },
    description: { type: String, default: '' },
    sideEffects: [{ type: String }],
    interactions: [{ type: String }],
    contraindications: [{ type: String }],
    warnings: [{ type: String }],
    storageConditions: { type: String, default: '25°C altında, kuru ve karanlık yerde saklayın.' },

    // Sınıflandırma
    category: { type: String, default: 'Genel', index: true },
    subCategory: { type: String, default: '' },
    isPrescriptionRequired: { type: Boolean, default: false },
    isControlledSubstance: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Kaynak & Doğrulama
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    source: {
      type: String,
      enum: ['system', 'user', 'titck_api'],
      default: 'system',
    },
    lastSyncDate: { type: Date, default: Date.now },
    addedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

// Tam metin arama indexi
MedicationSchema.index({
  name: 'text',
  genericName: 'text',
  activeIngredient: 'text',
  manufacturer: 'text',
});

// Compound index: kategori + reçete durumu sorguları için
MedicationSchema.index({ category: 1, isPrescriptionRequired: 1, isActive: 1 });

// EAN-13 checkdigit doğrulama yardımcı fonksiyonu
export function validateEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  const digits = barcode.split('').map(Number);
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[12];
}

export const MedicationModel = mongoose.model<MedicationDocument>('Medication', MedicationSchema);
