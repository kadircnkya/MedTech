export type MedicalRecordType = 'DIAGNOSIS' | 'SURGERY' | 'ALLERGY' | 'CHECKUP';

export interface MedicalRecord {
  id: string;
  title: string;          // Hastalık/Ameliyat/Alerjen Adı
  type: MedicalRecordType;
  date: string;           // Teşhis/Operasyon Tarihi
  complaintLevel: number; // 1-10 arası şikayet derecesi
  status: 'AKTiF' | 'KONTROL_ALTINDA' | 'IYILESTI' | 'TAKIPTE';
  medications: string[];  // Kullanılan İlaçlar
  doctorName: string;     // Doktor Adı
  notes: string;          // Doktor Rapor/Teşhis Notu
  hospital: string;       // Sağlık Kuruluşu
  treatmentPlan?: string;  // Uygulanan Tedavi Süreci
  reports?: string[];      // Laboratuvar Rapor Kodları (Örn: MRI-420, EKG-99)
  bodyPart?: 'HEAD' | 'CHEST' | 'BACK' | 'KNEE'; // 3D model senkronizasyonu için
}
