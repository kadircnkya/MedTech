export type BodySystemView = 'NORMAL' | 'MUSCLE' | 'SKELETON' | 'ORGAN';
export type BodyOrientation = 'ANTERIOR' | 'POSTERIOR';

export interface MedicalCondition {
  id: string;
  name: string;
  bodyPart: 'HEAD' | 'CHEST' | 'BACK' | 'KNEE';
  onset: string; // e.g. "Eylül 2024"
  status: string; // e.g. "Kontrol Altında"
  medications: string[];
  doctorName: string;
  complaintLevel: number; // 1-10
  lastCheckup: string;
  notes: string;
}

export interface SurgeryHistory {
  id: string;
  name: string;
  date: string;
  hospital: string;
}

export interface MedicalTimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'DIAGNOSIS' | 'SURGERY' | 'ALLERGY' | 'CHECKUP';
}
