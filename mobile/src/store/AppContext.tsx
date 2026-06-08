import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ScreenName,
  UserProfile,
  ScanHistoryItem,
  MedicationHistoryItem,
  ChatMessage,
  Medication,
  DoseRecord,
  HealthRecord,
  LabResult,
  Appointment,
  CatalogMedication,
  NotificationLog,
} from '../types';
import {
  INITIAL_HISTORY,
  INITIAL_SCAN_HISTORY,
  INITIAL_MEDICATIONS,
  INITIAL_DOSE_RECORDS,
  INITIAL_HEALTH_RECORDS,
  INITIAL_LAB_RESULTS,
  INITIAL_APPOINTMENTS,
} from '../constants/mockData';
import { apiClient } from '../services/api';
import { SyncService } from '../services/SyncService';

interface AppState {
  // Navigation
  currentScreen: ScreenName;
  setCurrentScreen: (s: ScreenName) => void;

  // Detail navigation params
  selectedMedication: Medication | null;
  setSelectedMedication: (m: Medication | null) => void;
  selectedLabResult: LabResult | null;
  setSelectedLabResult: (l: LabResult | null) => void;

  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;

  // User
  user: UserProfile;
  updateUser: (partial: Partial<UserProfile>) => void;

  // Auth
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;

  // === YENİ: İlaç Takip Sistemi ===
  medications: Medication[];
  addMedication: (med: Medication) => void;
  updateMedication: (id: string, partial: Partial<Medication>) => void;
  removeMedication: (id: string) => void;

  doseRecords: DoseRecord[];
  markDose: (doseId: string, status: 'TAKEN' | 'SKIPPED') => void;
  addDoseRecord: (record: DoseRecord) => void;

  // === YENİ: Sağlık Geçmişi ===
  healthRecords: HealthRecord[];
  addHealthRecord: (record: HealthRecord) => void;
  updateHealthRecord: (id: string, partial: Partial<HealthRecord>) => void;
  removeHealthRecord: (id: string) => void;

  // === YENİ: Laboratuvar Sonuçları ===
  labResults: LabResult[];
  addLabResult: (result: LabResult) => void;
  removeLabResult: (id: string) => void;

  // === YENİ: Randevular ===
  appointments: Appointment[];
  addAppointment: (apt: Appointment) => void;
  updateAppointment: (id: string, partial: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;

  // === YENİ: Topluluk Destekli İlaç Veritabanı ===
  medicationCatalog: CatalogMedication[];
  addCatalogMedication: (item: CatalogMedication) => void;

  // === YENİ: Bildirim Merkezi ===
  notifications: NotificationLog[];
  unreadNotificationCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  // Chat
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;

  // Toast
  toastMessage: string;
  showToast: (msg: string) => void;

  // Computed / Derived
  complianceRate: number;
  takenDoses: number;
  missedDoses: number;
  activeMeds: number;
  todayDoses: DoseRecord[];
  upcomingAppointment: Appointment | null;
  latestLabResult: LabResult | null;

  // Legacy (geriye dönük uyumluluk)
  history: MedicationHistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<MedicationHistoryItem[]>>;
  scanHistory: ScanHistoryItem[];
  setScanHistory: React.Dispatch<React.SetStateAction<ScanHistoryItem[]>>;
}

const INITIAL_CATALOG: CatalogMedication[] = [
  // ─── AĞRI KESİCİ & ATEŞ DÜŞÜRÜCÜ ───
  { barcode: '8699514095610', medicationName: 'Parol 500mg Tablet', genericName: 'Parasetamol', activeIngredient: 'Parasetamol (Asetaminofen) 500mg', manufacturer: 'Atabay İlaç', dosageForm: 'Film Tablet', strength: '500mg', dosageInfo: '1-2 tablet, günde 3-4 kez. Maks 4g/gün.', usageInstructions: 'Su ile yutulur. Tok veya aç karnına.', usagePurpose: 'Hafif-orta şiddetli ağrılar ve ateş düşürücü.', prospectus: 'Baş ağrısı, diş ağrısı, kas ağrısı, adet sancısı ve ateş düşürmek için. Karaciğer hastalığında dikkat.', sideEffects: ['Nadiren cilt döküntüsü', 'Yüksek dozda karaciğer hasarı'], warnings: ['Günlük 4g aşmayın', 'Alkol almayın'], category: 'Ağrı Kesici', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699546090273', medicationName: 'Advil 400mg Kapsül', genericName: 'İbuprofen', activeIngredient: 'İbuprofen 400mg', manufacturer: 'GSK (Haleon)', dosageForm: 'Yumuşak Kapsül', strength: '400mg', dosageInfo: '1 kapsül, günde 3 kez. Maks 1200mg/gün.', usageInstructions: 'Yemeklerden sonra su ile yutulur.', usagePurpose: 'NSAİİ grubu ağrı kesici ve ateş düşürücü.', prospectus: 'Ağrı kesici, ateş düşürücü ve antiinflamatuar. Mide ülseri ve böbrek yetmezliğinde dikkat.', sideEffects: ['Mide bulantısı', 'Mide ülseri riski', 'Böbrek fonksiyon bozukluğu'], warnings: ['Uzun süreli kullanımda mide koruyucu alın'], category: 'Ağrı Kesici', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699504090185', medicationName: 'Majezik 100mg Film Tablet', genericName: 'Flurbiprofen', activeIngredient: 'Flurbiprofen 100mg', manufacturer: 'Sanovel İlaç', dosageForm: 'Film Tablet', strength: '100mg', dosageInfo: '1 tablet, günde 2-3 kez. Maks 300mg/gün.', usageInstructions: 'Yemeklerden sonra su ile yutulur.', usagePurpose: 'Güçlü NSAİİ ağrı kesici.', prospectus: 'Diş ağrısı, kas iskelet sistemi ağrıları, cerrahi sonrası ağrılar.', sideEffects: ['Mide ağrısı', 'Bulantı', 'Baş dönmesi'], warnings: ['Hipertansiyon kontrolünü bozabilir'], category: 'Ağrı Kesici', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699508010896', medicationName: 'Aspirin 100mg Tablet', genericName: 'Asetilsalisilik Asit', activeIngredient: 'Asetilsalisilik Asit 100mg', manufacturer: 'Bayer Türk', dosageForm: 'Enterik Kaplı Tablet', strength: '100mg', dosageInfo: 'Kardiyovasküler koruma: Günde 1 tablet.', usageInstructions: 'Yemeklerden sonra su ile yutulur. Çiğnenmez.', usagePurpose: 'Kan sulandırıcı ve ağrı kesici.', prospectus: 'Düşük dozda antiplatelet, yüksek dozda ağrı kesici. Kalp krizi ve inme profilaksisi.', sideEffects: ['Mide kanaması riski', 'Alerjik reaksiyonlar'], warnings: ['Çocuklarda Reye sendromu riski', 'Ameliyat öncesi kesilmeli'], category: 'Kan Sulandırıcı', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699504010107', medicationName: 'Dikloron 75mg Ampul', genericName: 'Diklofenak Sodyum', activeIngredient: 'Diklofenak Sodyum 75mg', manufacturer: 'Deva Holding', dosageForm: 'İM Enjeksiyon', strength: '75mg/3mL', dosageInfo: 'Günde 1 ampul İM. Maks 2 gün.', usageInstructions: 'Derin gluteal kasa İM enjeksiyon.', usagePurpose: 'Enjeksiyonluk güçlü NSAİİ.', prospectus: 'Akut ağrılı durumlarda (renal kolik, akut bel ağrısı).', sideEffects: ['Enjeksiyon yerinde ağrı', 'Mide bulantısı'], warnings: ['Uzun süreli parenteral kullanım önerilmez'], category: 'Ağrı Kesici', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── ANTİBİYOTİK ───
  { barcode: '8699522093168', medicationName: 'Augmentin BID 1000mg', genericName: 'Amoksisilin/Klavulanik Asit', activeIngredient: 'Amoksisilin 875mg + Klavulanik Asit 125mg', manufacturer: 'GlaxoSmithKline', dosageForm: 'Film Tablet', strength: '1000mg', dosageInfo: 'Günde 2 kez, 1 tablet. 5-14 gün.', usageInstructions: 'Yemek başlangıcında su ile alınır.', usagePurpose: 'Geniş spektrumlu penisilin antibiyotik.', prospectus: 'Üst/alt solunum yolu, üriner, deri enfeksiyonları.', sideEffects: ['İshal', 'Bulantı', 'Mantar enfeksiyonu'], warnings: ['Tedaviyi yarıda kesmeyin'], category: 'Antibiyotik', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699508011237', medicationName: 'Cipro 500mg Tablet', genericName: 'Siprofloksasin', activeIngredient: 'Siprofloksasin HCl 500mg', manufacturer: 'Bayer Türk', dosageForm: 'Film Tablet', strength: '500mg', dosageInfo: 'Günde 2 kez, 1 tablet. 5-14 gün.', usageInstructions: 'Bol su ile yutulur. Süt ürünleriyle almayın.', usagePurpose: 'Florokinolon geniş spektrumlu antibiyotik.', prospectus: 'Üriner, solunum, GİS, kemik enfeksiyonları.', sideEffects: ['Bulantı', 'İshal', 'Tendon rüptürü riski'], warnings: ['Tendinit riski', 'Güneşten korunun'], category: 'Antibiyotik', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699536090214', medicationName: 'Amoklavin BID 1000mg', genericName: 'Amoksisilin/Klavulanik Asit', activeIngredient: 'Amoksisilin 875mg + Klavulanik Asit 125mg', manufacturer: 'Deva Holding', dosageForm: 'Film Tablet', strength: '1000mg', dosageInfo: 'Günde 2 kez, 1 tablet. 5-14 gün.', usageInstructions: 'Yemek başlangıcında su ile alınır.', usagePurpose: 'Geniş spektrumlu antibiyotik (Augmentin muadili).', prospectus: 'Augmentin muadili.', sideEffects: ['İshal', 'Bulantı', 'Deri döküntüsü'], warnings: ['Böbrek yetmezliğinde doz ayarı'], category: 'Antibiyotik', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699532090317', medicationName: 'Klacid 500mg Tablet', genericName: 'Klaritromisin', activeIngredient: 'Klaritromisin 500mg', manufacturer: 'Abbott', dosageForm: 'Film Tablet', strength: '500mg', dosageInfo: 'Günde 2 kez, 1 tablet. 7-14 gün.', usageInstructions: 'Yemekle veya yemeksiz alınabilir.', usagePurpose: 'Makrolid grubu antibiyotik.', prospectus: 'Solunum yolu enfeksiyonları, H.pylori eradikasyonu.', sideEffects: ['Tat bozukluğu', 'İshal', 'Karın ağrısı'], warnings: ['QT prolongasyonu riski'], category: 'Antibiyotik', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── KARDİYOVASKÜLER ───
  { barcode: '8699504090529', medicationName: 'Beloc ZOK 50mg Tablet', genericName: 'Metoprolol Süksinat', activeIngredient: 'Metoprolol Süksinat 50mg', manufacturer: 'AstraZeneca', dosageForm: 'Kontrollü Salınımlı Tablet', strength: '50mg', dosageInfo: 'Günde 1 kez, 50-100mg. Maks 200mg.', usageInstructions: 'Sabah su ile yutulur. Bölünmez.', usagePurpose: 'Beta-bloker tansiyon ve kalp ilacı.', prospectus: 'Hipertansiyon, angina, kalp yetmezliği, aritmi.', sideEffects: ['Yorgunluk', 'Bradikardi', 'Soğuk ekstremiteler'], warnings: ['Ani kesilmemeli'], category: 'Kardiyovasküler', subCategory: 'Beta-Bloker', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699809090316', medicationName: 'Coversyl 5mg Tablet', genericName: 'Perindopril', activeIngredient: 'Perindopril Arjinin 5mg', manufacturer: 'Servier İlaç', dosageForm: 'Film Tablet', strength: '5mg', dosageInfo: 'Günde 1 kez, sabah aç karnına.', usageInstructions: 'Kahvaltıdan önce su ile yutulur.', usagePurpose: 'ACE inhibitörü tansiyon ilacı.', prospectus: 'Hipertansiyon, kalp yetmezliği, koroner profilaksi.', sideEffects: ['Kuru öksürük', 'Baş dönmesi', 'Hiperkalemi'], warnings: ['Böbrek ve potasyum izlenmeli'], category: 'Kardiyovasküler', subCategory: 'ACE İnhibitörü', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699532090119', medicationName: 'Norvasc 5mg Tablet', genericName: 'Amlodipin', activeIngredient: 'Amlodipin Besilat 5mg', manufacturer: 'Pfizer', dosageForm: 'Tablet', strength: '5mg', dosageInfo: 'Günde 1 kez, 5-10mg.', usageInstructions: 'Su ile yutulur.', usagePurpose: 'Kalsiyum kanal blokeri tansiyon ilacı.', prospectus: 'Hipertansiyon ve angina pektoris.', sideEffects: ['Ayak bileği ödemi', 'Yüz kızarması', 'Baş ağrısı'], warnings: ['Karaciğer yetmezliğinde düşük dozla başla'], category: 'Kardiyovasküler', subCategory: 'Kalsiyum Kanal Blokeri', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699504096132', medicationName: 'Crestor 10mg Tablet', genericName: 'Rosuvastatin', activeIngredient: 'Rosuvastatin Kalsiyum 10mg', manufacturer: 'AstraZeneca', dosageForm: 'Film Tablet', strength: '10mg', dosageInfo: 'Günde 1 kez, akşam.', usageInstructions: 'Akşam su ile alınır.', usagePurpose: 'Kolesterol düşürücü statin.', prospectus: 'LDL kolesterolü düşürür, kardiyovasküler riski azaltır.', sideEffects: ['Kas ağrısı', 'Baş ağrısı', 'Nadir rabdomiyoliz'], warnings: ['Kas ağrısı hemen bildirin'], category: 'Kardiyovasküler', subCategory: 'Statin', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── DİYABET ───
  { barcode: '8699504090697', medicationName: 'Glifor 850mg Tablet', genericName: 'Metformin HCl', activeIngredient: 'Metformin Hidroklorür 850mg', manufacturer: 'Bilim İlaç', dosageForm: 'Film Tablet', strength: '850mg', dosageInfo: 'Günde 2 kez, 850mg. Maks 2550mg.', usageInstructions: 'Yemekle birlikte alınır.', usagePurpose: 'Tip 2 diyabet birinci basamak tedavi.', prospectus: 'İnsülin direncini azaltır, karaciğerde glukoz üretimini baskılar.', sideEffects: ['İshal', 'Metalik tat', 'B12 eksikliği (uzun süre)'], warnings: ['Ameliyat öncesi kesilmeli'], category: 'Diyabet', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699536091518', medicationName: 'Januvia 100mg Tablet', genericName: 'Sitagliptin', activeIngredient: 'Sitagliptin Fosfat 100mg', manufacturer: 'MSD (Merck)', dosageForm: 'Film Tablet', strength: '100mg', dosageInfo: 'Günde 1 kez, 100mg.', usageInstructions: 'Yemekle veya yemeksiz.', usagePurpose: 'DPP-4 inhibitörü oral antidiyabetik.', prospectus: 'İnkretin hormonlarını artırarak kan şekerini düzenler.', sideEffects: ['Baş ağrısı', 'Nadir pankreatit'], warnings: ['Pankreatit belirtilerine dikkat'], category: 'Diyabet', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699809090415', medicationName: 'Diamicron MR 60mg', genericName: 'Gliklazid', activeIngredient: 'Gliklazid 60mg', manufacturer: 'Servier İlaç', dosageForm: 'Modifiye Salınımlı Tablet', strength: '60mg', dosageInfo: 'Günde 1 kez, kahvaltıda.', usageInstructions: 'Kahvaltı ile birlikte alınır.', usagePurpose: 'Sülfonilüre grubu diyabet ilacı.', prospectus: 'Pankreasın beta hücrelerinden insülin salgısını artırır.', sideEffects: ['Hipoglisemi', 'Kilo artışı'], warnings: ['Hipoglisemi riski — kan şekeri izlenmeli'], category: 'Diyabet', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── MİDE & SİNDİRİM ───
  { barcode: '8699504091319', medicationName: 'Nexium 40mg Kapsül', genericName: 'Esomeprazol', activeIngredient: 'Esomeprazol Magnezyum 40mg', manufacturer: 'AstraZeneca', dosageForm: 'Enterik Kapsül', strength: '40mg', dosageInfo: 'Günde 1 kez, sabah aç karnına.', usageInstructions: 'Kahvaltıdan 30 dk önce su ile.', usagePurpose: 'Mide asidi baskılayıcı PPI.', prospectus: 'GERD, peptik ülser, H.pylori eradikasyonu.', sideEffects: ['Baş ağrısı', 'İshal', 'Uzun süre: Mg eksikliği'], warnings: ['4-8 haftadan uzun kullanımda doktor onayı'], category: 'Sindirim Sistemi', subCategory: 'PPI', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699504090321', medicationName: 'Lansor 30mg Kapsül', genericName: 'Lansoprazol', activeIngredient: 'Lansoprazol 30mg', manufacturer: 'Sanovel İlaç', dosageForm: 'Enterik Kapsül', strength: '30mg', dosageInfo: 'Günde 1 kez, sabah aç karnına.', usageInstructions: 'Kahvaltıdan 30 dk önce su ile.', usagePurpose: 'Mide asidi baskılayıcı PPI.', prospectus: 'Mide ülseri, reflü tedavisi.', sideEffects: ['Baş ağrısı', 'İshal'], warnings: ['B12 ve Mg izlenmeli'], category: 'Sindirim Sistemi', subCategory: 'PPI', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699522090068', medicationName: 'Gaviscon Advance', genericName: 'Sodyum Aljinat', activeIngredient: 'Sodyum Aljinat + Potasyum Bikarbonat', manufacturer: 'Reckitt Benckiser', dosageForm: 'Oral Süspansiyon', strength: '10mL', dosageInfo: 'Yemeklerden sonra ve yatmadan önce 5-10mL.', usageInstructions: 'Çalkalanıp doğrudan alınır.', usagePurpose: 'Reflü tedavisinde mekanik bariyer antasit.', prospectus: 'Mide asidinin yemek borusuna kaçmasını engeller.', sideEffects: ['Nadiren şişkinlik'], warnings: ['Sodyum kısıtlamasında dikkat'], category: 'Sindirim Sistemi', subCategory: 'Antasit', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── ALERJİ ───
  { barcode: '8699546090419', medicationName: 'Zyrtec 10mg Tablet', genericName: 'Setirizin', activeIngredient: 'Setirizin Dihidroklorür 10mg', manufacturer: 'UCB Pharma', dosageForm: 'Film Tablet', strength: '10mg', dosageInfo: 'Günde 1 kez, 10mg.', usageInstructions: 'Su ile alınır.', usagePurpose: 'Alerji ilacı — antihistaminik.', prospectus: 'Alerjik rinit, ürtiker (kurdeşen).', sideEffects: ['Uyku hali (nadir)', 'Ağız kuruluğu'], warnings: ['Araç kullanırken dikkat'], category: 'Alerji', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699536090197', medicationName: 'Aerius 5mg Tablet', genericName: 'Desloratadin', activeIngredient: 'Desloratadin 5mg', manufacturer: 'MSD (Organon)', dosageForm: 'Film Tablet', strength: '5mg', dosageInfo: 'Günde 1 kez, 5mg.', usageInstructions: 'Su ile alınır.', usagePurpose: 'Yeni nesil alerji ilacı.', prospectus: 'Mevsimsel ve perennial alerjik rinit, kronik ürtiker.', sideEffects: ['Nadiren yorgunluk'], warnings: ['Uyku yapma ihtimali düşük'], category: 'Alerji', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── SOĞUK ALGINLIĞI & GRİP ───
  { barcode: '8699525096538', medicationName: 'Nurofen Cold & Flu', genericName: 'İbuprofen/Psödoefedrin', activeIngredient: 'İbuprofen 200mg + Psödoefedrin HCl 30mg', manufacturer: 'Reckitt Benckiser', dosageForm: 'Film Tablet', strength: '200mg/30mg', dosageInfo: '2 tablet, günde 3 kez. Maks 3 gün.', usageInstructions: 'Tok karnına su ile alınır.', usagePurpose: 'Grip ve soğuk algınlığı kombine ilaç.', prospectus: 'Ağrı, ateş, burun tıkanıklığı giderir.', sideEffects: ['Mide bulantısı', 'Uykusuzluk', 'Çarpıntı'], warnings: ['3 günden fazla kullanmayın', 'Hipertansiyonda dikkat'], category: 'Soğuk Algınlığı', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699522095131', medicationName: 'Theraflu Extra Grip', genericName: 'Parasetamol/Fenilefrin/Klorfeniramin', activeIngredient: 'Parasetamol 650mg + Fenilefrin + Klorfeniramin', manufacturer: 'GSK (Haleon)', dosageForm: 'Sıcak İçecek Granül', strength: '650mg', dosageInfo: 'Her 4-6 saatte 1 poşet. Maks 4/gün.', usageInstructions: 'Sıcak suya karıştırılıp içilir.', usagePurpose: 'Grip tedavisi sıcak içecek.', prospectus: 'Ateş, ağrı, burun tıkanıklığı, akıntı giderir.', sideEffects: ['Uyku hali', 'Ağız kuruluğu'], warnings: ['Araç kullanmayın', 'Alkol almayın'], category: 'Soğuk Algınlığı', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── VİTAMİN & MİNERAL ───
  { barcode: '8699504091128', medicationName: 'Devit-3 50.000 IU Ampul', genericName: 'Kolekalsiferol', activeIngredient: 'Vitamin D3 50.000 IU', manufacturer: 'Deva Holding', dosageForm: 'Oral Ampul', strength: '50.000 IU', dosageInfo: 'Eksiklikte: Haftada 1 ampul, 8 hafta.', usageInstructions: 'Ağızdan içilir, yağlı yemekle.', usagePurpose: 'Yüksek doz D vitamini takviyesi.', prospectus: 'D vitamini eksikliği tedavisi. Kemik sağlığı.', sideEffects: ['Aşırı dozda hiperkalsemi'], warnings: ['Serum kalsiyum izlenmeli'], category: 'Vitamin & Mineral', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699546790055', medicationName: 'Ferrosanol Duodenal 100mg', genericName: 'Demir Glisin Sülfat', activeIngredient: 'Ferro Glisin Sülfat 100mg Fe', manufacturer: 'UCB Pharma', dosageForm: 'Mikropellet Kapsül', strength: '100mg Fe²⁺', dosageInfo: 'Günde 1 kapsül, aç karnına.', usageInstructions: 'Aç karnına portakal suyu ile. Çay/süt ile almayın.', usagePurpose: 'Demir eksikliği anemisi tedavisi.', prospectus: 'Demir eksikliği anemisi tedavisi ve profilaksisi.', sideEffects: ['Konstipasyon', 'Siyah dışkı', 'Mide bulantısı'], warnings: ['C vitamini emilimi artırır'], category: 'Vitamin & Mineral', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699504790013', medicationName: 'Bemiks-C Efervesan', genericName: 'Multivitamin + C Vitamini', activeIngredient: 'B vitamini kompleks + C Vitamini 500mg', manufacturer: 'Bilim İlaç', dosageForm: 'Efervesan Tablet', strength: '500mg Vit C', dosageInfo: 'Günde 1 tablet.', usageInstructions: 'Bir bardak suya atılır, çözündükten sonra içilir.', usagePurpose: 'Multivitamin ve C vitamini takviyesi.', prospectus: 'Genel güç-kuvvet desteği, bağışıklık.', sideEffects: ['Nadiren mide bulantısı'], warnings: ['Günlük dozu aşmayın'], category: 'Vitamin & Mineral', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── PSİKİYATRİ ───
  { barcode: '8699532190017', medicationName: 'Cipralex 10mg Tablet', genericName: 'Essitalopram', activeIngredient: 'Essitalopram Oksalat 10mg', manufacturer: 'Lundbeck/Abdi İbrahim', dosageForm: 'Film Tablet', strength: '10mg', dosageInfo: 'Günde 1 kez, 10mg. Min 6 ay tedavi.', usageInstructions: 'Günün herhangi saatinde alınabilir.', usagePurpose: 'SSRİ antidepresan.', prospectus: 'Majör depresyon, yaygın anksiyete, panik bozukluk.', sideEffects: ['Bulantı', 'Cinsel disfonksiyon', 'Uyku bozukluğu'], warnings: ['Ani kesilmemeli', '25 yaş altı intihar izlenmeli'], category: 'Psikiyatri', subCategory: 'SSRİ', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699532190116', medicationName: 'Xanax 0.5mg Tablet', genericName: 'Alprazolam', activeIngredient: 'Alprazolam 0.5mg', manufacturer: 'Pfizer', dosageForm: 'Tablet', strength: '0.5mg', dosageInfo: 'Günde 3 kez, 0.25-0.5mg. Kısa süreli.', usageInstructions: 'Su ile yutulur.', usagePurpose: 'Anksiyolitik benzodiazepin.', prospectus: 'Anksiyete ve panik bozukluk tedavisi.', sideEffects: ['Uyku hali', 'Bağımlılık riski', 'Konsantrasyon bozukluğu'], warnings: ['BAĞIMLILIK YAPICI', 'Araç kullanmayın', 'Ani kesilmemeli'], category: 'Psikiyatri', subCategory: 'Benzodiazepin', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── SOLUNUM / ASTIM ───
  { barcode: '8699522090143', medicationName: 'Ventolin İnhaler 100mcg', genericName: 'Salbutamol', activeIngredient: 'Salbutamol Sülfat 100mcg/doz', manufacturer: 'GlaxoSmithKline', dosageForm: 'İnhaler (MDI)', strength: '100mcg/puf', dosageInfo: 'İhtiyaç halinde 1-2 puf. Maks 8 puf/gün.', usageInstructions: 'Çalkalanıp derin nefes ile alınır.', usagePurpose: 'Kısa etkili bronkodilatör astım ilacı.', prospectus: 'Astım ve KOAH akut bronkospazm tedavisi.', sideEffects: ['Tremor', 'Çarpıntı', 'Baş ağrısı'], warnings: ['Sık kullanım gerekiyorsa astım kontrolü gözden geçirin'], category: 'Solunum', subCategory: 'Bronkodilatör', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699522090228', medicationName: 'Seretide Diskus 250/50', genericName: 'Flutikazon/Salmeterol', activeIngredient: 'Flutikazon 250mcg + Salmeterol 50mcg', manufacturer: 'GlaxoSmithKline', dosageForm: 'İnhalasyon Tozu (Diskus)', strength: '250/50mcg', dosageInfo: 'Günde 2 kez, 1 inhalasyon.', usageInstructions: 'Derin nefes ile solunur. Sonra ağız çalkalanır.', usagePurpose: 'Kombine kortikosteroid astım ilacı.', prospectus: 'Astım ve KOAH idame tedavisi.', sideEffects: ['Ses kısıklığı', 'Oral kandidiyaz'], warnings: ['Ağız çalkalanmalı', 'Akut kriz ilacı değildir'], category: 'Solunum', subCategory: 'Kombine İnhaler', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── TİROİD ───
  { barcode: '8699536590011', medicationName: 'Euthyrox 50mcg Tablet', genericName: 'Levotiroksin Sodyum', activeIngredient: 'Levotiroksin Sodyum 50mcg', manufacturer: 'Merck', dosageForm: 'Tablet', strength: '50mcg', dosageInfo: 'Günde 1 kez, sabah aç karnına.', usageInstructions: 'Kahvaltıdan 30-60 dk önce su ile.', usagePurpose: 'Tiroid hormonu replasmanı.', prospectus: 'Hipotiroidizm tedavisi.', sideEffects: ['Uygun dozda minimal', 'Aşırı dozda çarpıntı'], warnings: ['TSH düzenli takip edilmeli'], category: 'Endokrin', subCategory: 'Tiroid', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── GÖZ ───
  { barcode: '8699504390012', medicationName: 'Refresh Tears Göz Damlası', genericName: 'Karboksimetilselüloz', activeIngredient: 'Karboksimetilselüloz Sodyum %0.5', manufacturer: 'Allergan', dosageForm: 'Göz Damlası', strength: '%0.5', dosageInfo: 'İhtiyaç halinde 1-2 damla.', usageInstructions: 'Alt göz kapağı çekilir, damlatılır.', usagePurpose: 'Yapay gözyaşı, kuru göz damlası.', prospectus: 'Kuru göz sendromu nemlendirme.', sideEffects: ['Nadiren geçici yanma'], warnings: ['Açıldıktan sonra 28 gün içinde kullanın'], category: 'Göz', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── DERMATOLOJİ ───
  { barcode: '8699532190215', medicationName: 'Fucidin %2 Krem', genericName: 'Fusidik Asit', activeIngredient: 'Fusidik Asit %2', manufacturer: 'Leo Pharma', dosageForm: 'Krem', strength: '%2', dosageInfo: 'Günde 3-4 kez ince tabaka.', usageInstructions: 'Temiz cilde ince tabaka halinde sürülür.', usagePurpose: 'Topikal cilt antibiyotiği.', prospectus: 'Bakteriyel cilt enfeksiyonları (impetigo, folikülit).', sideEffects: ['Hafif irritasyon', 'Kaşıntı'], warnings: ['Uzun süreli kullanımda direnç gelişebilir'], category: 'Dermatoloji', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── KAS GEVŞETİCİ ───
  { barcode: '8699504090833', medicationName: 'Muscoril Kapsül', genericName: 'Tiyokolşikosid', activeIngredient: 'Tiyokolşikosid 4mg', manufacturer: 'Sanofi', dosageForm: 'Kapsül', strength: '4mg', dosageInfo: 'Günde 2 kez, 1 kapsül. Maks 7 gün.', usageInstructions: 'Su ile yutulur.', usagePurpose: 'Kas gevşetici ilaç.', prospectus: 'Akut kas spazmı, sırt ve boyun ağrısı.', sideEffects: ['Uyku hali', 'Mide bulantısı'], warnings: ['7 günden fazla kullanılmamalı'], category: 'Kas Gevşetici', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── ÜROLOJİ ───
  { barcode: '8699809090514', medicationName: 'Xatral XL 10mg Tablet', genericName: 'Alfuzosin', activeIngredient: 'Alfuzosin HCl 10mg', manufacturer: 'Sanofi', dosageForm: 'Uzatılmış Salınımlı Tablet', strength: '10mg', dosageInfo: 'Günde 1 kez, akşam yemeğinden sonra.', usageInstructions: 'Akşam yemeğinden sonra bütün yutulur.', usagePurpose: 'Prostat hiperplazisi ilacı.', prospectus: 'BPH üriner semptomlarını rahatlatır.', sideEffects: ['Baş dönmesi', 'Hipotansiyon'], warnings: ['Yatarken kalkarken dikkat'], category: 'Üroloji', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── KADIN SAĞLIĞI ───
  { barcode: '8699508190015', medicationName: 'Yasmin 21 Draje', genericName: 'Drospirenon/Etinilestradiol', activeIngredient: 'Drospirenon 3mg + Etinilestradiol 0.03mg', manufacturer: 'Bayer Türk', dosageForm: 'Film Draje', strength: '3mg/0.03mg', dosageInfo: '21 gün boyunca günde 1 tablet, 7 gün ara.', usageInstructions: 'Her gün aynı saatte su ile.', usagePurpose: 'Doğum kontrol hapı.', prospectus: 'Kombine oral kontraseptif.', sideEffects: ['Göğüs hassasiyeti', 'Bulantı', 'Tromboembolizm riski'], warnings: ['Sigara tromboembolizm riskini artırır'], category: 'Kadın Sağlığı', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── ANTİEMETİK ───
  { barcode: '8699504390111', medicationName: 'Metpamid 10mg Tablet', genericName: 'Metoklopramid', activeIngredient: 'Metoklopramid HCl 10mg', manufacturer: 'Yeni İlaç', dosageForm: 'Tablet', strength: '10mg', dosageInfo: 'Günde 3 kez, yemeklerden 30 dk önce.', usageInstructions: 'Yemeklerden 30 dk önce su ile.', usagePurpose: 'Bulantı kusma önleyici.', prospectus: 'Antiemetik ve prokinetik.', sideEffects: ['Uyku hali', 'Ekstrapiramidal belirtiler'], warnings: ['5 günden fazla kullanılmamalı'], category: 'Sindirim Sistemi', subCategory: 'Antiemetik', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── NÖROLOJİ ───
  { barcode: '8699809590013', medicationName: 'Depakine Chrono 500mg', genericName: 'Valproik Asit/Sodyum Valproat', activeIngredient: 'Valproik Asit + Sodyum Valproat 500mg', manufacturer: 'Sanofi', dosageForm: 'Uzatılmış Salınımlı Tablet', strength: '500mg', dosageInfo: 'Günde 2 kez. Doz bireysel ayarlanır.', usageInstructions: 'Yemekle birlikte, bölünmeden yutulur.', usagePurpose: 'Antiepileptik ve duygudurum dengeleyici.', prospectus: 'Epilepsi, bipolar bozukluk, migren profilaksisi.', sideEffects: ['Kilo artışı', 'Tremor', 'Saç dökülmesi'], warnings: ['GEBELİKTE KONTRENDİKE — nöral tüp defekti'], category: 'Nöroloji', subCategory: 'Antiepileptik', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── OPİOİD ANALJEZİK ───
  { barcode: '8699504590112', medicationName: 'Tramasel Retard 100mg', genericName: 'Tramadol', activeIngredient: 'Tramadol HCl 100mg', manufacturer: 'Abdi İbrahim', dosageForm: 'Uzatılmış Salınımlı Tablet', strength: '100mg', dosageInfo: 'Günde 2 kez. Maks 400mg/gün.', usageInstructions: 'Çiğnenmeden su ile yutulur.', usagePurpose: 'Opioid ağrı kesici.', prospectus: 'Orta-şiddetli ağrılarda opioid analjezik.', sideEffects: ['Bulantı', 'Uyku hali', 'Bağımlılık riski'], warnings: ['BAĞIMLILIK YAPICI', 'Araç kullanmayın'], category: 'Ağrı Kesici', subCategory: 'Opioid', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── ANTİKOAGÜLAN ───
  { barcode: '8699504290114', medicationName: 'Coumadin 5mg Tablet', genericName: 'Varfarin Sodyum', activeIngredient: 'Varfarin Sodyum 5mg', manufacturer: 'Eczacıbaşı', dosageForm: 'Tablet', strength: '5mg', dosageInfo: 'INR değerine göre bireysel.', usageInstructions: 'Her gün aynı saatte su ile.', usagePurpose: 'Oral antikoagülan kan sulandırıcı.', prospectus: 'DVT, pulmoner emboli, atriyal fibrilasyon.', sideEffects: ['Kanama riski', 'Morarma'], warnings: ['KANAMA RİSKİ YÜKSEK', 'INR takip edilmeli'], category: 'Kan Sulandırıcı', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },

  // ─── EK İLAÇLAR ───
  { barcode: '8699546090518', medicationName: 'Arveles 25mg Poşet', genericName: 'Deksketoprofen', activeIngredient: 'Deksketoprofen Trometamol 25mg', manufacturer: 'Ufsa İlaç', dosageForm: 'Çözünür Granül', strength: '25mg', dosageInfo: 'Günde 3 kez. Kısa süreli.', usageInstructions: 'Bir bardak suya karıştırılır.', usagePurpose: 'Hızlı etkili NSAİİ ağrı kesici.', prospectus: 'Akut ağrı tedavisi.', sideEffects: ['Mide bulantısı', 'Baş ağrısı'], warnings: ['Kısa süreli kullanım', 'Mide koruyucu ile'], category: 'Ağrı Kesici', subCategory: 'NSAİİ', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699532190314', medicationName: 'Diflucan 150mg Kapsül', genericName: 'Flukonazol', activeIngredient: 'Flukonazol 150mg', manufacturer: 'Pfizer', dosageForm: 'Sert Kapsül', strength: '150mg', dosageInfo: 'Vajinal kandidiyaz: Tek doz 150mg.', usageInstructions: 'Su ile yutulur.', usagePurpose: 'Mantar ilacı (antifungal).', prospectus: 'Vajinal mantar, oral kandidiyaz, sistemik fungal enfeksiyonlar.', sideEffects: ['Baş ağrısı', 'Karın ağrısı'], warnings: ['Karaciğer fonksiyonları izlenmeli'], category: 'Antifungal', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699532290015', medicationName: 'Duphalac 670mg/mL Şurup', genericName: 'Laktuloz', activeIngredient: 'Laktuloz 670mg/mL', manufacturer: 'Abbott', dosageForm: 'Oral Çözelti', strength: '670mg/mL', dosageInfo: 'Günde 1-2 kez, 15-45mL.', usageInstructions: 'Ölçek ile ağızdan alınır.', usagePurpose: 'Kabızlık tedavisi osmotik laksatif.', prospectus: 'Kronik kabızlık ve hepatik ensefalopati.', sideEffects: ['Gaz', 'Şişkinlik'], warnings: ['Diyabetiklerde şeker içeriğine dikkat'], category: 'Sindirim Sistemi', subCategory: 'Laksatif', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699504190012', medicationName: 'Dilatrend 25mg Tablet', genericName: 'Karvedilol', activeIngredient: 'Karvedilol 25mg', manufacturer: 'Roche', dosageForm: 'Tablet', strength: '25mg', dosageInfo: 'Günde 2 kez, 12.5-25mg.', usageInstructions: 'Yemekle birlikte alınır.', usagePurpose: 'Alfa-beta bloker tansiyon/kalp ilacı.', prospectus: 'Hipertansiyon, kalp yetmezliği, koroner arter hastalığı.', sideEffects: ['Baş dönmesi', 'Yorgunluk', 'Bradikardi'], warnings: ['Ani kesilmemeli'], category: 'Kardiyovasküler', subCategory: 'Alfa-Beta Bloker', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699809690014', medicationName: 'Plavix 75mg Tablet', genericName: 'Klopidogrel', activeIngredient: 'Klopidogrel Bisülfat 75mg', manufacturer: 'Sanofi', dosageForm: 'Film Tablet', strength: '75mg', dosageInfo: 'Günde 1 kez, 75mg.', usageInstructions: 'Su ile alınır.', usagePurpose: 'Antiplatelet kan sulandırıcı.', prospectus: 'MI, inme ve periferal arter hastalığı profilaksisi.', sideEffects: ['Kanama', 'Morarma'], warnings: ['Ameliyat öncesi 7 gün kesilmeli'], category: 'Kan Sulandırıcı', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699504790112', medicationName: 'Vermidon 500mg Tablet', genericName: 'Parasetamol', activeIngredient: 'Parasetamol 500mg', manufacturer: 'İlko İlaç', dosageForm: 'Tablet', strength: '500mg', dosageInfo: 'Günde 3-4 kez, 1-2 tablet.', usageInstructions: 'Su ile yutulur.', usagePurpose: 'Parasetamol ağrı kesici (muadil).', prospectus: 'Parol muadili ağrı kesici ve ateş düşürücü.', sideEffects: ['Nadiren cilt döküntüsü'], warnings: ['Günlük 4g aşmayın'], category: 'Ağrı Kesici', isPrescriptionRequired: false, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699536190019', medicationName: 'Prednol 16mg Tablet', genericName: 'Metilprednizolon', activeIngredient: 'Metilprednizolon 16mg', manufacturer: 'Mustafa Nevzat', dosageForm: 'Tablet', strength: '16mg', dosageInfo: 'Sabah tek doz. Hastalığa göre değişir.', usageInstructions: 'Kahvaltıdan sonra su ile.', usagePurpose: 'Sistemik kortikosteroid.', prospectus: 'Otoimmün hastalıklar, alerji, astım atak, romatizma.', sideEffects: ['Kilo artışı', 'İmmün baskılanma', 'Kan şekeri yükselmesi'], warnings: ['Ani kesilmemeli', 'Mide koruyucu kullanın'], category: 'Kortikosteroid', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699536090296', medicationName: 'Concor 5mg Tablet', genericName: 'Bisoprolol', activeIngredient: 'Bisoprolol Fumarat 5mg', manufacturer: 'Merck', dosageForm: 'Film Tablet', strength: '5mg', dosageInfo: 'Günde 1 kez, sabah 2.5-10mg.', usageInstructions: 'Sabah su ile yutulur.', usagePurpose: 'Beta bloker tansiyon/kalp ilacı.', prospectus: 'Hipertansiyon, angina, kalp yetmezliği.', sideEffects: ['Yorgunluk', 'Bradikardi', 'Soğuk eller'], warnings: ['Ani kesilmemeli'], category: 'Kardiyovasküler', subCategory: 'Beta-Bloker', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699504191118', medicationName: 'Pantpas 40mg Tablet', genericName: 'Pantoprazol', activeIngredient: 'Pantoprazol Sodyum 40mg', manufacturer: 'Bilim İlaç', dosageForm: 'Enterik Kaplı Tablet', strength: '40mg', dosageInfo: 'Günde 1 kez, sabah aç karnına.', usageInstructions: 'Kahvaltıdan 30 dk önce su ile.', usagePurpose: 'Mide asidi baskılayıcı PPI.', prospectus: 'Peptik ülser, GERD tedavisi.', sideEffects: ['Baş ağrısı', 'İshal'], warnings: ['Uzun sürede Mg ve B12 izlenmeli'], category: 'Sindirim Sistemi', subCategory: 'PPI', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699532790012', medicationName: 'Suprax 400mg Kapsül', genericName: 'Sefiksim', activeIngredient: 'Sefiksim 400mg', manufacturer: 'Sanofi', dosageForm: 'Kapsül', strength: '400mg', dosageInfo: 'Günde 1 kez, 400mg. 7-14 gün.', usageInstructions: 'Su ile yutulur.', usagePurpose: '3. kuşak sefalosporin antibiyotik.', prospectus: 'Üriner enfeksiyon, otit, farenjit.', sideEffects: ['İshal', 'Bulantı'], warnings: ['Böbrek yetmezliğinde doz ayarı'], category: 'Antibiyotik', subCategory: 'Sefalosporin', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { barcode: '8699532190413', medicationName: 'Lyrica 75mg Kapsül', genericName: 'Pregabalin', activeIngredient: 'Pregabalin 75mg', manufacturer: 'Pfizer', dosageForm: 'Sert Kapsül', strength: '75mg', dosageInfo: 'Günde 2-3 kez. Maks 600mg/gün.', usageInstructions: 'Su ile alınır.', usagePurpose: 'Nöropatik ağrı ve anksiyete ilacı.', prospectus: 'Nöropatik ağrı, epilepsi, yaygın anksiyete, fibromiyalji.', sideEffects: ['Baş dönmesi', 'Uyku hali', 'Kilo artışı'], warnings: ['Bağımlılık potansiyeli', 'Araç kullanmayın'], category: 'Nöroloji', subCategory: 'Nöropatik Ağrı', isPrescriptionRequired: true, verificationStatus: 'verified', source: 'system', createdBy: 'system', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === 'dark');
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('WELCOME');
  const [toastMessage, setToastMessage] = useState('');

  // Detail navigation params
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [selectedLabResult, setSelectedLabResult] = useState<LabResult | null>(null);

  // Auth
  const [email, setEmail] = useState('demo@medtech.com');
  const [password, setPassword] = useState('123456');

  // User
  const [user, setUser] = useState<UserProfile>({
    firstName: 'Kadir', lastName: 'Çankaya', email: 'demo@medtech.com',
    phone: '+90 555 123 45 67', age: '28', weight: '78', height: '180',
    bloodType: 'A Rh+', emergencyContact: '+90 555 987 65 43', avatar: '🧬',
    allergies: ['Parasetamol', 'Gluten'],
    diseases: ['Hipertansiyon', 'Tip 2 Diyabet'],
    medications: ['Beloc ZOK 50mg', 'Glifor 850mg', 'Aspirin 100mg'],
    operations: ['Apandisit Ameliyatı (2018)'],
    familyHistory: ['Baba: Hipertansiyon', 'Anne: Diyabet'],
  });

  // İlaç Takip Sistemi
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [doseRecords, setDoseRecords] = useState<DoseRecord[]>(INITIAL_DOSE_RECORDS);

  // Sağlık Geçmişi
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>(INITIAL_HEALTH_RECORDS);

  // Laboratuvar Sonuçları
  const [labResults, setLabResults] = useState<LabResult[]>(INITIAL_LAB_RESULTS);

  // Randevular
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);

  // Topluluk Destekli İlaç Veritabanı
  const [medicationCatalog, setMedicationCatalog] = useState<CatalogMedication[]>(INITIAL_CATALOG);

  const addCatalogMedication = useCallback((item: CatalogMedication) => {
    setMedicationCatalog(prev => [item, ...prev]);
  }, []);

  // Bildirim Merkezi
  const [notifications, setNotifications] = useState<NotificationLog[]>([
    {
      _id: 'n1',
      type: 'DOSE_WARNING',
      title: 'Doz Atlandı!',
      body: 'Saat 08:00 Parol 500mg dozunuzu henüz almadınız.',
      sentAt: new Date().toISOString(),
      isRead: false,
    },
    {
      _id: 'n2',
      type: 'TREATMENT_TRACKING',
      title: 'Tedavi Özeti',
      body: 'Bu haftaki ilaç uyum oranınız %85. Harika gidiyorsunuz!',
      sentAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      isRead: false,
    },
    {
      _id: 'n3',
      type: 'REMINDER',
      title: 'Randevu Hatırlatması',
      body: 'Yarın saat 14:00\'te Kardiyoloji doktoru ile randevunuz var.',
      sentAt: new Date(Date.now() - 86400 * 1000).toISOString(), // dün
      isRead: true,
    },
    {
      _id: 'n4',
      type: 'SYSTEM_LOG',
      title: 'Tahlil Sonuçları',
      body: 'Kan tahlili sonuçlarınız sisteme yüklendi.',
      sentAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(), // önceki gün
      isRead: true,
    }
  ]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(2);

  const fetchNotifications = useCallback(async () => {
    try {
      // In a real app we fetch from API. We simulate mock data here if needed or call real API.
      // await apiClient.get('/notifications/logs')
      // setNotifications(response.data.data);
      // const unreadResp = await apiClient.get('/notifications/logs/unread-count');
      // setUnreadNotificationCount(unreadResp.data.count);
    } catch (e) {
      console.log('Failed to fetch notifications', e);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadNotificationCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.log('Failed to mark read', e);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotificationCount(0);
    } catch (e) {
      console.log('Failed to mark all read', e);
    }
  }, []);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Merhaba! Ben MedTech AI asistanınızım. Sağlık kayıtlarınızı, ilaçlarınızı veya laboratuvar sonuçlarınızı analiz etmemi ister misiniz? 🩺',
    },
  ]);

  // Legacy
  const [history, setHistory] = useState<MedicationHistoryItem[]>(INITIAL_HISTORY);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>(INITIAL_SCAN_HISTORY);

  // Initialize Data from API
  React.useEffect(() => {
    async function loadData() {
      try {
        await SyncService.processQueue(); // Push any offline changes
        
        // Parallel fetch for dashboard
        const [profileRes, medsRes, dosesRes, recordsRes] = await Promise.all([
          apiClient.get('/api/v1/users/profile').catch(() => null),
          apiClient.get('/api/v1/tracking/schedules').catch(() => null),
          apiClient.get('/api/v1/tracking/doses').catch(() => null),
          apiClient.get('/api/v1/patients/records').catch(() => null)
        ]);

        if (profileRes?.data?.data) {
          setUser(prev => ({ ...prev, ...profileRes.data.data }));
        }
        
        if (medsRes?.data?.data) {
          // Map backend format to local Medication format
          const mappedMeds = medsRes.data.data.map((m: any) => ({
            id: m._id,
            name: m.medicationName,
            dosage: m.dosage,
            frequency: m.frequency,
            isActive: m.isActive,
          }));
          setMedications(mappedMeds);
        }

        if (dosesRes?.data?.data) {
          // Map doses
          const mappedDoses = dosesRes.data.data.map((d: any) => ({
            id: d._id,
            medicationId: d.medicationId,
            medicationName: d.medicationName,
            scheduledTime: new Date(d.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: d.status.toUpperCase()
          }));
          setDoseRecords(mappedDoses);
        }

        if (recordsRes?.data?.data) {
          // Map health records
          const mappedRecords = recordsRes.data.data.map((r: any) => ({
            id: r._id,
            type: r.recordType.toUpperCase(),
            title: r.title,
            description: r.description,
            date: new Date(r.diagnosisDate || r.createdAt).toISOString().split('T')[0],
            isActive: r.status === 'active'
          }));
          setHealthRecords(mappedRecords);
        }
      } catch (err) {
        console.warn('Failed to fetch initial data, falling back to mock/cache', err);
      }
    }
    
    // Attempt load if not on welcome/login
    if (currentScreen !== 'WELCOME' && currentScreen !== 'LOGIN') {
      loadData();
    }
  }, [currentScreen]);

  // ── Handlers ──
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev;
      AsyncStorage.setItem('@user_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const updateUser = useCallback((partial: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...partial }));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }, []);

  // İlaç handlers
  const addMedication = useCallback(async (med: Medication) => {
    setMedications(prev => [med, ...prev]);
    await SyncService.enqueueTask('POST', '/api/v1/tracking/schedules', {
      medicationId: med.id,
      medicationName: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      startDate: new Date()
    });
  }, []);

  const updateMedication = useCallback((id: string, partial: Partial<Medication>) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, ...partial } : m));
  }, []);

  const removeMedication = useCallback((id: string) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, isActive: false } : m));
  }, []);

  // Doz handlers
  const markDose = useCallback(async (doseId: string, status: 'TAKEN' | 'SKIPPED') => {
    setDoseRecords(prev => prev.map(d =>
      d.id === doseId
        ? { ...d, status, takenAt: status === 'TAKEN' ? new Date().toISOString() : undefined }
        : d
    ));
    const dose = doseRecords.find(d => d.id === doseId);
    if (dose) {
      await SyncService.enqueueTask('POST', '/api/v1/tracking/doses', {
        medicationId: dose.medicationId,
        medicationName: dose.medicationName,
        scheduledTime: new Date(), // Mock for now
        status: status.toLowerCase()
      });
    }
  }, [doseRecords]);

  const addDoseRecord = useCallback((record: DoseRecord) => {
    setDoseRecords(prev => [record, ...prev]);
  }, []);

  // Sağlık kaydı handlers
  const addHealthRecord = useCallback((record: HealthRecord) => {
    setHealthRecords(prev => [record, ...prev]);
  }, []);

  const updateHealthRecord = useCallback((id: string, partial: Partial<HealthRecord>) => {
    setHealthRecords(prev => prev.map(r => r.id === id ? { ...r, ...partial } : r));
  }, []);

  const removeHealthRecord = useCallback((id: string) => {
    setHealthRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  // Lab result handlers
  const addLabResult = useCallback((result: LabResult) => {
    setLabResults(prev => [result, ...prev]);
  }, []);

  const removeLabResult = useCallback((id: string) => {
    setLabResults(prev => prev.filter(r => r.id !== id));
  }, []);

  // Appointment handlers
  const addAppointment = useCallback((apt: Appointment) => {
    setAppointments(prev => [apt, ...prev]);
  }, []);

  const updateAppointment = useCallback((id: string, partial: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...partial } : a));
  }, []);

  const removeAppointment = useCallback((id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' as const } : a));
  }, []);

  // ── Derived / Computed ──
  const today = new Date().toISOString().split('T')[0];

  const todayDoses = useMemo(() =>
    doseRecords.filter(d => d.date === today)
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
    [doseRecords, today]
  );

  const takenDoses = useMemo(() => todayDoses.filter(d => d.status === 'TAKEN').length, [todayDoses]);
  const missedDoses = useMemo(() => todayDoses.filter(d => d.status === 'MISSED').length, [todayDoses]);
  const activeMeds = useMemo(() => medications.filter(m => m.isActive).length, [medications]);
  const complianceRate = useMemo(() =>
    todayDoses.length > 0 ? Math.round((takenDoses / todayDoses.length) * 100) : 0,
    [takenDoses, todayDoses.length]
  );

  const upcomingAppointment = useMemo(() => {
    const upcoming = appointments
      .filter(a => a.status === 'UPCOMING' && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return upcoming[0] ?? null;
  }, [appointments, today]);

  const latestLabResult = useMemo(() => {
    const sorted = [...labResults].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0] ?? null;
  }, [labResults]);

  const value = useMemo<AppState>(() => ({
    currentScreen, setCurrentScreen,
    selectedMedication, setSelectedMedication,
    selectedLabResult, setSelectedLabResult,
    isDarkMode, toggleTheme,
    user, updateUser, email, setEmail, password, setPassword,
    medications, addMedication, updateMedication, removeMedication,
    doseRecords, markDose, addDoseRecord,
    healthRecords, addHealthRecord, updateHealthRecord, removeHealthRecord,
    labResults, addLabResult, removeLabResult,
    appointments, addAppointment, updateAppointment, removeAppointment,
    medicationCatalog, addCatalogMedication,
    notifications, unreadNotificationCount, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead,
    chatMessages, setChatMessages,
    toastMessage, showToast,
    complianceRate, takenDoses, missedDoses, activeMeds,
    todayDoses, upcomingAppointment, latestLabResult,
    history, setHistory, scanHistory, setScanHistory,
  }), [
    currentScreen, selectedMedication, selectedLabResult, isDarkMode,
    user, email, password,
    medications, doseRecords, healthRecords, labResults, appointments,
    medicationCatalog, addCatalogMedication,
    notifications, unreadNotificationCount, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead,
    chatMessages, toastMessage,
    complianceRate, takenDoses, missedDoses, activeMeds,
    todayDoses, upcomingAppointment, latestLabResult,
    history, scanHistory,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
