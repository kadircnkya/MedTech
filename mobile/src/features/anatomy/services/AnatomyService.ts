import { AnatomyMarker } from '../types';

export class AnatomyService {
  public static getMarkers(): AnatomyMarker[] {
    return [
      {
        id: 'm1',
        name: 'Kronik Migren Teşhisi',
        bodyPart: 'HEAD',
        position: { x: 0, y: 1.8, z: 0 }, // Head coordinates in 3D scene
        onset: 'Ekim 2023',
        status: 'Aktif Tedavi',
        medications: ['Sibelyum 5mg', 'Avmigran'],
        doctorName: 'Prof. Dr. Ahmet Yılmaz (Nöroloji)',
        complaintLevel: 7,
        lastCheckup: '12 Nisan 2026',
        notes: 'Stres ve parlak ışık tetikliyor. Düzenli uyku takibi önerildi.'
      },
      {
        id: 'm2',
        name: 'Aort Kapak Yetmezliği',
        bodyPart: 'CHEST',
        position: { x: 0, y: 0.8, z: 0.3 }, // Chest coordinates (slightly forward in Z)
        onset: 'Mart 2024',
        status: 'Gözlem Altında',
        medications: ['Concor 5mg'],
        doctorName: 'Doç. Dr. Selim Akın (Kardiyoloji)',
        complaintLevel: 3,
        lastCheckup: '18 Mayıs 2026',
        notes: 'Yıllık ekokardiyografi kontrolü gereklidir. Ağır efor yasak.'
      },
      {
        id: 'm3',
        name: 'L4-L5 Bel Fıtığı',
        bodyPart: 'BACK',
        position: { x: 0, y: 0.2, z: -0.3 }, // Back coordinates (slightly backward in Z)
        onset: 'Kasım 2022',
        status: 'Fizik Tedavi',
        medications: ['Muscoril Merhem', 'Cabral'],
        doctorName: 'Uzm. Dr. Ayşe Kaya (Fizik Tedavi)',
        complaintLevel: 5,
        lastCheckup: '04 Ocak 2026',
        notes: 'Bel kaslarını güçlendirme egzersizleri ve yüzme önerildi.'
      },
      {
        id: 'm4',
        name: 'Menisküs Deformasyonu',
        bodyPart: 'KNEE',
        position: { x: -0.3, y: -0.8, z: 0.25 }, // Left knee coordinates
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
}
