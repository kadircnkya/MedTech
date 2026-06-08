import {
  DrugInfo,
  MedicationHistoryItem,
  ScanHistoryItem,
  WeeklyAdherenceItem,
  Medication,
  DoseRecord,
  HealthRecord,
  LabResult,
  Appointment,
} from '../types';

export const AVATARS = ['🧬', '🔬', '🩺', '❤️', '🧠', '⚕️', '📱', '🧑‍⚕️', '👩‍⚕️'];

export const BLOOD_TYPES = ['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-'];
export const GENDERS = ['Erkek', 'Kadın', 'Diğer'];
export const CHRONIC_DISEASES = ['Mide Ülseri', 'Hipertansiyon', 'Diyabet', 'Astım', 'Karaciğer Yetmezliği', 'KOAH', 'Depresyon', 'Epilepsi'];
export const ALLERGY_OPTIONS = ['Parasetamol', 'Penisilin', 'Aspirin', 'Sülfonamid', 'Gluten', 'Laktoz', 'Polen', 'Lateks'];
export const MEDICATION_OPTIONS = ['Aspirin 100mg', 'Parol 500mg', 'Nurofen Cold & Flu', 'Lansor 30mg', 'Glifor 850mg', 'Arveles 25mg', 'Coraspin 100mg'];
export const OPERATION_OPTIONS = ['Apandisit', 'Bademcik', 'Fıtık', 'Katarakt', 'Safra Kesesi', 'Sezaryen', 'Bypass'];
export const DOSAGE_FORMS = ['Tablet', 'Kapsül', 'Şurup', 'Damla', 'Merhem', 'Enjeksiyon', 'Sprey'];
export const DEPARTMENTS = ['Kardiyoloji', 'Dahiliye', 'Nöroloji', 'Ortopedi', 'Göğüs Hastalıkları', 'Endokrinoloji', 'Gastroenteroloji', 'Psikiyatri', 'Üroloji'];
export const MEDICATION_COLORS = ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2', '#5E5CE6', '#64D2FF', '#FF6B6B'];

export const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const DAYS_TR_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// ── Barkod İlaç Veritabanı ──
export const MOCK_DRUGS: Record<string, DrugInfo> = {
  '8699514095610': {
    name: 'Parol 500mg', genericName: 'Parasetamol (Acetaminophen)', dosageForm: 'Tablet', manufacturer: 'Atabay Kimya', strength: '500 mg',
    sideEffects: ['Hafif baş dönmesi', 'Mide bulantısı', 'Ciltte hafif kaşıntı'],
    warnings: ['Karaciğer yetmezliği olanlar kullanmamalıdır.', 'Alkol ile birlikte alınması karaciğer toksisitesini artırır.'],
    aiExplanation: 'Parol, vücuttaki ağrı ve ateşi dindirmek için kullanılan hafif ve güvenli bir ilaçtır.',
  },
  '8699508010896': {
    name: 'Aspirin 100mg', genericName: 'Asetilsalisilik Asit', dosageForm: 'Enterik Tablet', manufacturer: 'Bayer', strength: '100 mg',
    sideEffects: ['Mide yanması', 'Kanama eğiliminde artış', 'Kulak çınlaması'],
    warnings: ['Aktif mide ülseri olan hastalar için yüksek risk taşır.'],
    aiExplanation: 'Aspirin, kanı sulandırarak damar tıkanıklıklarını önleyen kritik bir ilaçtır.',
  },
  '8699525096538': {
    name: 'Nurofen Cold & Flu', genericName: 'Ibuprofen / Psödoefedrin', dosageForm: 'Film Tablet', manufacturer: 'Reckitt Benckiser', strength: '200mg / 30mg',
    sideEffects: ['Uykusuzluk', 'Ağız kuruluğu', 'Çarpıntı'],
    warnings: ['Yüksek tansiyon ve koroner arter hastalığı olanlarda risklidir.'],
    aiExplanation: 'Nurofen Cold & Flu, soğuk algınlığı ve gripta burun tıkanıklığını gidermek için kullanılır.',
  },
};

// ── Aktif İlaçlar ──
export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    name: 'Beloc ZOK 50mg',
    genericName: 'Metoprolol Süksinat',
    dosageForm: 'Tablet',
    strength: '50mg',
    times: ['08:00', '20:00'],
    startDate: '2026-01-15',
    isActive: true,
    diseaseId: 'hr-1',
    notes: 'Sabah aç karnına alınmalıdır.',
    color: '#0A84FF',
    barcode: '',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'med-2',
    name: 'Glifor 850mg',
    genericName: 'Metformin HCl',
    dosageForm: 'Tablet',
    strength: '850mg',
    times: ['08:00', '13:00', '20:00'],
    startDate: '2025-06-01',
    isActive: true,
    diseaseId: 'hr-2',
    notes: 'Yemeklerle birlikte alınız.',
    color: '#30D158',
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med-3',
    name: 'Aspirin 100mg',
    genericName: 'Asetilsalisilik Asit',
    dosageForm: 'Enterik Tablet',
    strength: '100mg',
    times: ['09:00'],
    startDate: '2026-03-10',
    isActive: true,
    diseaseId: 'hr-1',
    color: '#FF9F0A',
    barcode: '8699508010896',
    createdAt: '2026-03-10T08:00:00Z',
  },
  {
    id: 'med-comp-1',
    name: 'Lansor 30mg',
    genericName: 'Lansoprazol',
    dosageForm: 'Kapsül',
    strength: '30mg',
    times: ['08:00'],
    startDate: '2025-10-01',
    endDate: '2025-10-28',
    isActive: false,
    notes: 'Sabah aç karnına kullanıldı.',
    color: '#BF5AF2',
    createdAt: '2025-10-01T08:00:00Z',
  },
  {
    id: 'med-comp-2',
    name: 'Parol 500mg',
    genericName: 'Parasetamol',
    dosageForm: 'Tablet',
    strength: '500mg',
    times: ['12:00', '20:00'],
    startDate: '2026-04-10',
    endDate: '2026-04-15',
    isActive: false,
    notes: 'Ağrı kesici olarak kısa süreli kullanıldı.',
    color: '#FF453A',
    createdAt: '2026-04-10T08:00:00Z',
  },
];

// ── Doz Kaydı Üretici (son 30 gün için analitik verisi) ──
function generateHistoricalDoses(): DoseRecord[] {
  const records: DoseRecord[] = [];
  const today = new Date();
  let idCounter = 100;

  // Doz planı: ilaç + saat
  const plan = [
    { medId: 'med-1', medName: 'Beloc ZOK 50mg', times: ['08:00', '20:00'] },
    { medId: 'med-2', medName: 'Glifor 850mg',   times: ['08:00', '13:00', '20:00'] },
    { medId: 'med-3', medName: 'Aspirin 100mg',  times: ['09:00'] },
  ];

  // Son 30 günü işle (bugün hariç, bugün ayrıca tanımlanmış)
  for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];

    for (const med of plan) {
      for (const time of med.times) {
        idCounter++;
        // %92 alma uyumu simülasyonu; akşam dozlarında biraz daha fazla atlama
        const isEvening = time === '20:00';
        const rand = Math.random();
        let status: DoseRecord['status'];
        let takenAt: string | undefined;

        if (rand < (isEvening ? 0.88 : 0.95)) {
          status = 'TAKEN';
          // 0–12 dakika gecikmeli
          const delayMin = Math.floor(Math.random() * 13);
          const [hh, mm] = time.split(':').map(Number);
          const takenDate = new Date(d);
          takenDate.setHours(hh, mm + delayMin, Math.floor(Math.random() * 60), 0);
          takenAt = takenDate.toISOString();
        } else {
          status = 'MISSED';
        }

        records.push({
          id: `hist-${idCounter}`,
          medicationId: med.medId,
          medicationName: med.medName,
          scheduledTime: time,
          takenAt,
          status,
          date: dateStr,
        });
      }
    }
  }

  return records;
}

// ── Bugünün Doz Kayıtları ──
const today = new Date().toISOString().split('T')[0];
const todayDoses: DoseRecord[] = [
  { id: 'dr-1', medicationId: 'med-1', medicationName: 'Beloc ZOK 50mg', scheduledTime: '08:00', takenAt: `${today}T08:05:00Z`, status: 'TAKEN', date: today },
  { id: 'dr-2', medicationId: 'med-3', medicationName: 'Aspirin 100mg', scheduledTime: '09:00', status: 'PENDING', date: today },
  { id: 'dr-3', medicationId: 'med-2', medicationName: 'Glifor 850mg', scheduledTime: '08:00', takenAt: `${today}T08:12:00Z`, status: 'TAKEN', date: today },
  { id: 'dr-4', medicationId: 'med-2', medicationName: 'Glifor 850mg', scheduledTime: '13:00', status: 'PENDING', date: today },
  { id: 'dr-5', medicationId: 'med-1', medicationName: 'Beloc ZOK 50mg', scheduledTime: '20:00', status: 'PENDING', date: today },
  { id: 'dr-6', medicationId: 'med-2', medicationName: 'Glifor 850mg', scheduledTime: '20:00', status: 'PENDING', date: today },
];

export const INITIAL_DOSE_RECORDS: DoseRecord[] = [
  ...generateHistoricalDoses(),
  ...todayDoses,
];

// ── Sağlık Kayıtları ──
export const INITIAL_HEALTH_RECORDS: HealthRecord[] = [
  {
    id: 'hr-1',
    type: 'CHRONIC',
    title: 'Hipertansiyon',
    date: '2020-03-15',
    isActive: true,
    description: 'Kronik esansiyel hipertansiyon teşhisi konuldu.',
    doctorName: 'Dr. Ahmet Yılmaz',
    hospital: 'Acıbadem Hastanesi',
    relatedMedicationIds: ['med-1', 'med-3'],
    createdAt: '2020-03-15T10:00:00Z',
  },
  {
    id: 'hr-2',
    type: 'CHRONIC',
    title: 'Tip 2 Diyabet',
    date: '2025-06-01',
    isActive: true,
    description: 'Açlık kan şekeri yüksekliği saptandı. Metformin başlandı.',
    doctorName: 'Dr. Fatma Şahin',
    hospital: 'Memorial Hastanesi',
    relatedMedicationIds: ['med-2'],
    createdAt: '2025-06-01T10:00:00Z',
  },
  {
    id: 'hr-3',
    type: 'SURGERY',
    title: 'Apandisit Ameliyatı',
    date: '2018-08-22',
    isActive: false,
    description: 'Laparoskopik apandisektomi uygulandı. İyileşme sorunsuz gerçekleşti.',
    doctorName: 'Dr. Mehmet Kaya',
    hospital: 'Kartal Eğitim Araştırma Hastanesi',
    createdAt: '2018-08-22T09:00:00Z',
  },
  {
    id: 'hr-4',
    type: 'ALLERGY',
    title: 'Parasetamol Alerjisi',
    date: '2019-04-10',
    isActive: true,
    description: 'Parasetamol kullanımı sonrası deri döküntüsü ve kaşıntı oluştu.',
    doctorName: 'Dr. Ayşe Demir',
    createdAt: '2019-04-10T10:00:00Z',
  },
  {
    id: 'hr-5',
    type: 'VACCINE',
    title: 'COVID-19 Aşısı (3. Doz)',
    date: '2022-01-20',
    isActive: false,
    description: 'BioNTech/Pfizer 3. doz hatırlatma aşısı yapıldı.',
    hospital: 'Aile Sağlığı Merkezi',
    createdAt: '2022-01-20T10:00:00Z',
  },
];

// ── Laboratuvar Sonuçları ──
export const INITIAL_LAB_RESULTS: LabResult[] = [
  {
    id: 'lab-1',
    title: 'Tam Kan Sayımı & Biyokimya',
    date: '2026-05-28',
    laboratory: 'Acıbadem Laboratuvarı',
    doctorName: 'Dr. Fatma Şahin',
    values: [
      { testName: 'D Vitamini', value: 12.4, unit: 'ng/mL', referenceMin: 30, referenceMax: 100, status: 'LOW', category: 'Vitamin' },
      { testName: 'Açlık Şekeri', value: 108, unit: 'mg/dL', referenceMin: 70, referenceMax: 100, status: 'HIGH', category: 'Biyokimya' },
      { testName: 'B12 Vitamini', value: 310, unit: 'pg/mL', referenceMin: 200, referenceMax: 900, status: 'NORMAL', category: 'Vitamin' },
      { testName: 'Hemoglobin', value: 14.2, unit: 'g/dL', referenceMin: 13.5, referenceMax: 17.5, status: 'NORMAL', category: 'Kan Sayımı' },
      { testName: 'LDL Kolesterol', value: 142, unit: 'mg/dL', referenceMin: 0, referenceMax: 130, status: 'HIGH', category: 'Lipid' },
    ],
    aiInsights: [
      'D Vitamini değeriniz referans sınırının önemli ölçüde altında. Güneş ışığına maruz kalma ve/veya takviye önerilmektedir.',
      'Açlık kan şekeriniz hafif yüksek. Tip 2 diyabet tanınız göz önünde bulundurularak düzenli takip önerilir.',
      'LDL kolesterol değeriniz yüksek. Hipertansiyon kaydınızla birlikte değerlendirilmesi gerekmektedir.',
    ],
    status: 'ATTENTION',
    createdAt: '2026-05-28T10:00:00Z',
  },
  {
    id: 'lab-2',
    title: 'Tiroid Fonksiyon Testleri',
    date: '2026-02-14',
    laboratory: 'Medilab',
    doctorName: 'Dr. Ahmet Yılmaz',
    values: [
      { testName: 'TSH', value: 2.1, unit: 'mIU/L', referenceMin: 0.4, referenceMax: 4.0, status: 'NORMAL', category: 'Tiroid' },
      { testName: 'Serbest T4', value: 1.2, unit: 'ng/dL', referenceMin: 0.8, referenceMax: 1.8, status: 'NORMAL', category: 'Tiroid' },
    ],
    aiInsights: ['Tiroid fonksiyon testleriniz normal sınırlar içindedir.'],
    status: 'NORMAL',
    createdAt: '2026-02-14T10:00:00Z',
  },
];

// ── Randevular ──
export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    title: 'Kardiyoloji Kontrolü',
    doctorName: 'Dr. Mehmet Yılmaz',
    hospital: 'Acıbadem Maslak Hastanesi',
    department: 'Kardiyoloji',
    date: '2026-06-03',
    time: '10:30',
    notes: 'Kan basıncı takibi, EKG çekilecek',
    status: 'UPCOMING',
    createdAt: '2026-05-20T10:00:00Z',
  },
  {
    id: 'apt-2',
    title: 'Endokrinoloji Kontrolü',
    doctorName: 'Dr. Fatma Şahin',
    hospital: 'Memorial Şişli Hastanesi',
    department: 'Endokrinoloji',
    date: '2026-06-15',
    time: '14:00',
    notes: 'Diyabet düzenli kontrol, HbA1c bakılacak',
    status: 'UPCOMING',
    createdAt: '2026-05-25T10:00:00Z',
  },
  {
    id: 'apt-3',
    title: 'Dahiliye Muayenesi',
    doctorName: 'Dr. Ahmet Yılmaz',
    hospital: 'Acıbadem Bakırköy Hastanesi',
    department: 'Dahiliye',
    date: '2026-04-10',
    time: '09:00',
    notes: 'Genel kontrol yapıldı.',
    status: 'COMPLETED',
    createdAt: '2026-04-01T10:00:00Z',
  },
];

// ── Haftalık Uyum (geriye dönük uyumluluk) ──
export const WEEKLY_ADHERENCE: WeeklyAdherenceItem[] = [
  { day: 'Pzt', taken: 3, missed: 0 },
  { day: 'Sal', taken: 2, missed: 1 },
  { day: 'Çar', taken: 3, missed: 0 },
  { day: 'Per', taken: 1, missed: 2 },
  { day: 'Cum', taken: 3, missed: 0 },
  { day: 'Cmt', taken: 2, missed: 1 },
  { day: 'Paz', taken: 3, missed: 0 },
];

// ── Eski uyumluluk (geriye dönük) ──
export const INITIAL_HISTORY: MedicationHistoryItem[] = [
  { id: '1', name: 'Aspirin 100mg', genericName: 'Asetilsalisilik Asit', barcode: '8699508010896', timestamp: 'Bugün, 09:30', status: 'taken', day: 'Pzt' },
  { id: '2', name: 'Glifor 850mg', genericName: 'Metformin', barcode: '', timestamp: 'Bugün, 08:00', status: 'taken', day: 'Pzt' },
  { id: '3', name: 'Beloc ZOK 50mg', genericName: 'Metoprolol', barcode: '', timestamp: 'Dün, 20:00', status: 'taken', day: 'Paz' },
  { id: '4', name: 'Glifor 850mg', genericName: 'Metformin', barcode: '', timestamp: '2 gün önce', status: 'missed', day: 'Cmt' },
  { id: '5', name: 'Aspirin 100mg', genericName: 'Asetilsalisilik Asit', barcode: '8699508010896', timestamp: '3 gün önce', status: 'taken', day: 'Cum' },
];

export const INITIAL_SCAN_HISTORY: ScanHistoryItem[] = [
  {
    id: 'h1', type: 'MEDICINE', title: 'Parol 500mg - AI Analizi', date: '23 Mayıs 2026, 11:20',
    medData: {
      medicineName: 'Parol 500mg', barcode: '8699514095610', activeIngredient: 'Parasetamol', usageType: 'Tablet',
      sideEffects: ['Hafif baş dönmesi', 'Mide bulantısı'], drugInteractions: ['Alkol ile karaciğer toksisitesini artırır.'],
      validation: { allergyConflict: true, diseaseConflict: false, interactionConflict: false, severity: 'HIGH_RISK',
        alerts: ['Alerji Uyarısı: Parasetamol alerjiniz tespit edildi.'] },
      aiExplanation: 'Parasetamol alerjiniz nedeniyle bu ilacın kullanımı yüksek risk teşkil etmektedir.', confidenceScore: 99.4,
    },
  },
  {
    id: 'h2', type: 'LAB_REPORT', title: 'Tam Kan & Biyokimya Tahlili', date: '28 Mayıs 2026, 09:15',
    labData: {
      reportTitle: 'Tam Kan Sayımı & Biyokimya Raporu', scanDate: '28 Mayıs 2026, 09:15',
      values: [
        { testName: 'D Vitamini', value: 12.4, unit: 'ng/mL', referenceMin: 30, referenceMax: 100, status: 'LOW', category: 'Vitamin' },
        { testName: 'Açlık Şekeri', value: 108, unit: 'mg/dL', referenceMin: 70, referenceMax: 100, status: 'HIGH', category: 'Biyokimya' },
        { testName: 'B12 Vitamini', value: 310, unit: 'pg/mL', referenceMin: 200, referenceMax: 900, status: 'NORMAL', category: 'Vitamin' },
      ],
      validation: { abnormalCount: 2, severity: 'ATTENTION', alerts: ['D Vitamini yetersizliği', 'Açlık glukoz düzeyi sınırın üzerinde'] },
      aiExplanation: 'D vitamini seviyeniz referans sınırının altında, açlık kan şekeriniz hafif yüksek seyretmektedir.', confidenceScore: 98.7,
    },
  },
];
