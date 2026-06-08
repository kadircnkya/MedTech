import { MedicalCondition, SurgeryHistory, MedicalTimelineItem } from '../types';

export class ProfileMedicalService {
  public static getConditions(): MedicalCondition[] {
    return [
      {
        id: 'c1',
        name: 'Kronik Migren',
        bodyPart: 'HEAD',
        onset: 'Ekim 2023',
        status: 'Aktif Tedavi',
        medications: ['Sibelyum 5mg', 'Avmigran'],
        doctorName: 'Prof. Dr. Ahmet Yılmaz (Nöroloji)',
        complaintLevel: 7,
        lastCheckup: '12 Nisan 2026',
        notes: 'Stres ve parlak ışık tetikliyor. Düzenli uyku takibi önerildi.'
      },
      {
        id: 'c2',
        name: 'Aort Kapak Yetmezliği (Hafif)',
        bodyPart: 'CHEST',
        onset: 'Mart 2024',
        status: 'Gözlem Altında',
        medications: ['Concor 5mg'],
        doctorName: 'Doç. Dr. Selim Akın (Kardiyoloji)',
        complaintLevel: 3,
        lastCheckup: '18 Mayıs 2026',
        notes: 'Yıllık ekokardiyografi kontrolü gereklidir. Ağır efor yasak.'
      },
      {
        id: 'c3',
        name: 'L4-L5 Bel Fıtığı',
        bodyPart: 'BACK',
        onset: 'Kasım 2022',
        status: 'Fizik Tedavi',
        medications: ['Muscoril Merhem', 'Cabral'],
        doctorName: 'Uzm. Dr. Ayşe Kaya (Fizik Tedavi)',
        complaintLevel: 5,
        lastCheckup: '04 Ocak 2026',
        notes: 'Bel kaslarını güçlendirme egzersizleri ve yüzme önerildi.'
      },
      {
        id: 'c4',
        name: 'Patellar Menisküs Deformasyonu',
        bodyPart: 'KNEE',
        onset: 'Ağustos 2025',
        status: 'Rehabilitasyon',
        medications: ['Glukozamin Kompleks'],
        doctorName: 'Dr. Can Demir (Ortopedi)',
        complaintLevel: 4,
        lastCheckup: '22 Şubat 2026',
        notes: 'Diz stabilizasyonu için egzersiz bandı antrenmanları yapılıyor.'
      }
    ];
  }

  public static getSurgeries(): SurgeryHistory[] {
    return [
      { id: 's1', name: 'Apandektomi (Kapalı Ameliyat)', date: '14 Mart 2021', hospital: 'Acıbadem Kadıköy Hastanesi' },
      { id: 's2', name: 'Deviasyon (Burun Kemik Operasyonu)', date: '08 Eylül 2019', hospital: 'Florence Nightingale Hastanesi' }
    ];
  }

  public static getTimeline(): MedicalTimelineItem[] {
    return [
      { id: 't1', date: '18 Mayıs 2026', title: 'Kardiyoloji Rutin Kontrolü', description: 'Aort kapak durumu stabil, efor testi normal sonuçlandı.', type: 'CHECKUP' },
      { id: 't2', date: '12 Nisan 2026', title: 'Migren Tedavi Güncellemesi', description: 'İlaç dozajı stabilize edildi, uyku düzeni iyileşmesi kaydedildi.', type: 'DIAGNOSIS' },
      { id: 't3', date: '14 Mart 2021', title: 'Apandektomi Operasyonu', description: 'Akut apandisit nedeniyle başarılı laparoskopik cerrahi uygulandı.', type: 'SURGERY' },
      { id: 't4', date: '05 Ocak 2018', title: 'Penisilin Alerjisi Teşhisi', description: 'Akut deri döküntüsü sonrası tıbbi kayıtlara penisilin uyarısı eklendi.', type: 'ALLERGY' }
    ];
  }
}
