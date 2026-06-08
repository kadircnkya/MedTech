import { MedicalRecord } from '../types';

export class MedicalHistoryService {
  // Akıllı hastalık arama ve otomatik tamamlama veri havuzu (Auto-suggest Disease Directory)
  private static diseaseSuggestions = [
    { name: 'Migren (Akut Baş Ağrısı)', bodyPart: 'HEAD', commonMeds: ['Relpax', 'Arveles', 'Avmigran'] },
    { name: 'L4-L5 Disk Hernisi (Bel Fıtığı)', bodyPart: 'BACK', commonMeds: ['Voltaren', 'Muscoril Merhem'] },
    { name: 'Aort Valvüler Yetmezlik', bodyPart: 'CHEST', commonMeds: ['Concor', 'Beloc'] },
    { name: 'Sol Diz Menisküs Yırtığı', bodyPart: 'KNEE', commonMeds: ['Glukozamin', 'Fastjel'] },
    { name: 'Hipertansiyon (Yüksek Tansiyon)', bodyPart: 'CHEST', commonMeds: ['Co-Diovan', 'Vasoxen'] },
    { name: 'Tip 2 Diyabet (Şeker Hastalığı)', bodyPart: 'CHEST', commonMeds: ['Glifor', 'Jardiance'] },
    { name: 'Gastrit & Reflü', bodyPart: 'CHEST', commonMeds: ['Nexium', 'Gaviscon'] },
    { name: 'Astım Bronşit', bodyPart: 'CHEST', commonMeds: ['Foster inhaler', 'Ventolin'] },
  ];

  // Arama motoru
  public static searchDiseases(query: string) {
    if (!query) return [];
    const normalized = query.toLowerCase().trim();
    return this.diseaseSuggestions.filter(d => 
      d.name.toLowerCase().includes(normalized)
    );
  }

  // Medikal Kayıt Şablon Tohumları (Seed Database)
  public static getSeedRecords(): MedicalRecord[] {
    return [
      {
        id: 'rec-1',
        title: 'Migren (Akut Baş Ağrısı)',
        type: 'DIAGNOSIS',
        date: '12.05.2024',
        complaintLevel: 8,
        status: 'AKTiF',
        medications: ['Relpax 40mg', 'Arveles 50mg'],
        doctorName: 'Prof. Dr. Ahmet Yılmaz',
        notes: 'Stres ve parlak ışık tetikliyor. Akut atak başlangıcında karanlık oda istirahati ve hidrasyon artışı elzem.',
        hospital: 'Acıbadem Maslak Hastanesi',
        treatmentPlan: 'Gerektiğinde triptan grubu ilaçlar ve tetikleyici takibi.',
        reports: ['MR-30292', 'EEG-2092'],
        bodyPart: 'HEAD'
      },
      {
        id: 'rec-2',
        title: 'L4-L5 Disk Hernisi (Bel Fıtığı)',
        type: 'DIAGNOSIS',
        date: '18.11.2024',
        complaintLevel: 7,
        status: 'TAKIPTE',
        medications: ['Voltaren 75mg', 'Muscoril Merhem'],
        doctorName: 'Doç. Dr. Selin Kaya',
        notes: 'L4-L5 seviyesinde minimal bulging saptandı. Günlük 20 dk core egzersizleri ve spinal traksiyon önerildi.',
        hospital: 'Florence Nightingale',
        treatmentPlan: 'Fizik tedavi rehabilitasyon süreci (15 Seans).',
        reports: ['MRI-脊椎-99'],
        bodyPart: 'BACK'
      },
      {
        id: 'rec-3',
        title: 'Apandisitlektomi Operasyonu',
        type: 'SURGERY',
        date: '14.05.2020',
        complaintLevel: 1,
        status: 'IYILESTI',
        medications: [],
        doctorName: 'Dr. Mehmet Can',
        notes: 'Akut apandisit nedeniyle laparoskopik eksizyon uygulandı. Yara yeri tamamen iyileşmiş durumda.',
        hospital: 'Şişli Hamidiye Etfal',
        treatmentPlan: 'Cerrahi rezeksiyon ve post-op antibiyotik profilaksisi.',
        reports: ['PATH-20921'],
        bodyPart: 'CHEST'
      }
    ];
  }
}
