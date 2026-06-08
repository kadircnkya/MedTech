// ── Navigation ──
export type ScreenName =
  | 'WELCOME'
  | 'LOGIN'
  | 'ONBOARDING'
  | 'DASHBOARD'
  | 'MEDICATIONS'
  | 'ADD_MEDICATION'
  | 'MEDICATION_DETAIL'
  | 'MEDICAL_HISTORY'
  | 'ADD_HEALTH_RECORD'
  | 'LAB_RESULTS'
  | 'LAB_DETAIL'
  | 'ADD_LAB_RESULT'
  | 'APPOINTMENTS'
  | 'ADD_APPOINTMENT'
  | 'AI_CHAT'
  | 'SCANNER'
  | 'PROFILE'
  | 'NOTIFICATION_CENTER';

// ── User / Profile ──
export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string;
  weight: string;
  height: string;
  bloodType: string;
  emergencyContact: string;
  avatar: string;
  allergies: string[];
  diseases: string[];
  medications: string[];
  operations: string[];
  familyHistory: string[];
}

// ── Medication ──
export interface Medication {
  id: string;
  name: string;
  genericName: string;
  dosageForm: string;       // Tablet, Kapsül, Şurup, Damla
  strength: string;         // 500mg, 10mg
  times: string[];          // ['08:00', '20:00']
  startDate: string;        // ISO date string
  endDate?: string;
  isActive: boolean;
  diseaseId?: string;       // Bağlı hastalık ID'si
  notes?: string;
  color: string;            // Widget badge rengi
  barcode?: string;
  aiAnalysis?: MedicationAIAnalysis;
  createdAt: string;
}

export interface MedicationAIAnalysis {
  allergyRisk: 'NONE' | 'LOW' | 'HIGH';
  diseaseCompatibility: string;
  interactions: string[];
  insights: string[];
  disclaimer: string;
}

// ── Dose Records ──
export interface DoseRecord {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  takenAt?: string;
  status: 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED';
  date: string;
}

// ── Health Record ──
export type HealthRecordType =
  | 'DISEASE'
  | 'CHRONIC'
  | 'SURGERY'
  | 'ALLERGY'
  | 'VACCINE'
  | 'EXAM'
  | 'DOCTOR_NOTE';

export interface HealthRecord {
  id: string;
  type: HealthRecordType;
  title: string;
  date: string;
  endDate?: string;
  description?: string;
  doctorName?: string;
  hospital?: string;
  relatedMedicationIds?: string[];
  isActive: boolean;
  createdAt: string;
}

// ── Lab Results ──
export interface LabValue {
  testName: string;
  value: number;
  unit: string;
  referenceMin: number;
  referenceMax: number;
  status: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL';
  category: string;
}

export interface LabResult {
  id: string;
  title: string;
  date: string;
  laboratory?: string;
  doctorName?: string;
  values: LabValue[];
  rawFileUri?: string;
  aiInsights?: string[];
  status: 'NORMAL' | 'ATTENTION' | 'CRITICAL';
  createdAt: string;
}

// ── Appointments ──
export interface Appointment {
  id: string;
  title: string;
  doctorName: string;
  hospital: string;
  department: string;
  date: string;
  time: string;
  notes?: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

// ── Chat ──
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isWarning?: boolean;
  timestamp?: string;
}

// ── Drug Database (Barcode) ──
export interface DrugInfo {
  name: string;
  genericName: string;
  dosageForm: string;
  manufacturer: string;
  strength: string;
  sideEffects: string[];
  warnings: string[];
  aiExplanation: string;
}

// ── Weekly Adherence ──
export interface WeeklyAdherenceItem {
  day: string;
  taken: number;
  missed: number;
}

// ── Legacy Scan History (geriye dönük uyumluluk) ──
export interface MedicationAnalysisResult {
  medicineName: string;
  barcode: string;
  activeIngredient: string;
  usageType: string;
  sideEffects: string[];
  drugInteractions: string[];
  validation: {
    allergyConflict: boolean;
    diseaseConflict: boolean;
    interactionConflict: boolean;
    severity: 'NORMAL' | 'ATTENTION' | 'HIGH_RISK';
    alerts: string[];
  };
  aiExplanation: string;
  confidenceScore: number;
}

export interface LabAnalysisResult {
  reportTitle: string;
  scanDate: string;
  values: LabValue[];
  validation: {
    abnormalCount: number;
    severity: 'NORMAL' | 'ATTENTION' | 'HIGH_RISK';
    alerts: string[];
  };
  aiExplanation: string;
  confidenceScore: number;
}

export interface ScanHistoryItem {
  id: string;
  type: 'MEDICINE' | 'LAB_REPORT';
  title: string;
  date: string;
  medData?: MedicationAnalysisResult;
  labData?: LabAnalysisResult;
}

export interface MedicationHistoryItem {
  id: string;
  name: string;
  genericName: string;
  barcode: string;
  timestamp: string;
  status: 'taken' | 'missed';
  day: string;
}

// ── Theme ──
export type ThemeMode = 'light' | 'dark';

// ── Profesyonel İlaç Veritabanı (Barkod Sistemi) ──
export interface CatalogMedication {
  // Kimlik
  barcode: string;               // EAN-13 / GTIN — UNIQUE
  gtin?: string;
  medicationName: string;        // Ticari adı
  genericName?: string;          // Jenerik adı
  activeIngredient: string;      // Etken madde
  atcCode?: string;

  // Üretici
  manufacturer?: string;         // Üretici firma

  // Farmasötik
  dosageForm?: string;           // Tablet, Kapsül, Şurup...
  strength?: string;             // 500mg, 10mg/5mL...
  dosageInfo?: string;           // Doz bilgisi
  usageInstructions?: string;    // Kullanım şekli
  usagePurpose: string;          // Kısa kullanım amacı

  // Prospektüs & Güvenlik
  prospectus?: string;           // Tam prospektüs metni
  sideEffects?: string[];        // Yan etkiler
  interactions?: string[];       // İlaç etkileşimleri
  contraindications?: string[];  // Kontrendikasyonlar
  warnings?: string[];           // Uyarılar
  storageConditions?: string;    // Saklama koşulları

  // Sınıflandırma
  category?: string;             // İlaç kategorisi
  subCategory?: string;
  isPrescriptionRequired?: boolean; // Reçeteli mi?

  // Kaynak & Doğrulama
  verificationStatus: 'pending' | 'verified' | 'rejected';
  source?: 'system' | 'user' | 'api';
  lastSyncDate?: string;         // Son güncelleme
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Notifications ──
export interface NotificationLog {
  _id: string;
  type: 'REMINDER' | 'DOSE_WARNING' | 'TREATMENT_TRACKING' | 'SYSTEM_LOG' | 'reminder' | 'dose_missed' | 'info';
  title: string;
  body: string;
  sentAt: string;
  isRead: boolean;
  relatedMedicationId?: string;
  relatedTreatmentId?: string;
}
