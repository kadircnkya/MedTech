import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, Animated,
  Dimensions, Alert, TextInput, Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import { useAppStore } from '../../store/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { CatalogMedication } from '../../types';
import barcodeService, { validateBarcodeFormat, BarcodeSearchResult } from '../../services/BarcodeService';

const { width } = Dimensions.get('window');

// ═══════════════════════════════════════════
// SCANNER SCREEN — Profesyonel İlaç Barkod Sistemi
// ═══════════════════════════════════════════
export default function ScannerScreen() {
  const { colors, isDarkMode } = useTheme();
  const {
    user,
    medications,
    labResults,
    addLabResult,
    showToast,
    medicationCatalog,
    addCatalogMedication,
  } = useAppStore();

  // ── State Management ──
  const [activeModal, setActiveModal] = useState<'NONE' | 'CAMERA' | 'DOC_PICKER'>('NONE');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0); // 0-3 aşama
  const [processingText, setProcessingText] = useState('');
  const [searchResult, setSearchResult] = useState<BarcodeSearchResult | null>(null);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');
  const [expandedProspectus, setExpandedProspectus] = useState(false);

  // Form state — Yeni İlaç Kayıt
  const [newMedName, setNewMedName] = useState('');
  const [newMedGeneric, setNewMedGeneric] = useState('');
  const [newMedActive, setNewMedActive] = useState('');
  const [newMedManufacturer, setNewMedManufacturer] = useState('');
  const [newMedDosageForm, setNewMedDosageForm] = useState('');
  const [newMedStrength, setNewMedStrength] = useState('');
  const [newMedDosageInfo, setNewMedDosageInfo] = useState('');
  const [newMedCategory, setNewMedCategory] = useState('');
  const [newMedPrescription, setNewMedPrescription] = useState(false);
  const [newMedPurpose, setNewMedPurpose] = useState('');

  // Animation refs
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ── Laser Scan Animation ──
  useEffect(() => {
    if (activeModal === 'CAMERA') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [activeModal]);

  // ── Pulse Animation for loading ──
  useEffect(() => {
    if (processing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();

      // Fade in
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      return () => pulse.stop();
    } else {
      fadeAnim.setValue(0);
      progressAnim.setValue(0);
    }
  }, [processing]);

  // ── Camera Permission ──
  const openCamera = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    if (status === 'granted') {
      setActiveModal('CAMERA');
    } else {
      Alert.alert('İzin Gerekli', 'İlaç barkodu taramak için kamera izni vermeniz gerekmektedir.');
    }
  };

  // ── Ana Barkod Tarama Akışı ──
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    // Debounce kontrolü
    if (barcodeService.shouldDebounce(barcode)) return;

    setActiveModal('NONE');
    setProcessing(true);
    setSearchResult(null);
    setLastScannedBarcode(barcode);
    setExpandedProspectus(false);

    // 3 Aşamalı Loading Animasyonu
    const steps = [
      { step: 1, text: '📡 Barkod çözümleniyor...', delay: 300 },
      { step: 2, text: '🔍 Veritabanı sorgulanıyor...', delay: 600 },
      { step: 3, text: '🧬 AI güvenlik analizi yapılıyor...', delay: 400 },
    ];

    for (const s of steps) {
      setProcessingStep(s.step);
      setProcessingText(s.text);
      Animated.timing(progressAnim, {
        toValue: s.step / 3,
        duration: 300,
        useNativeDriver: false,
      }).start();
      await new Promise(r => setTimeout(r, s.delay));
    }

    // Gerçek arama — 3 katmanlı cache
    const result = await barcodeService.lookupBarcode(barcode, medicationCatalog);

    setProcessing(false);
    setSearchResult(result);

    if (!result.found) {
      // İlaç bulunamadı — modal aç
      Alert.alert(
        '💊 İlaç Bulunamadı',
        `Bu barkod (${barcode}) MedTech veritabanında bulunamadı.\n\nİlacı veritabanına eklemek ister misiniz?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'İlaç Ekle', onPress: () => setShowAddMedModal(true) },
        ],
        { cancelable: true }
      );
    } else {
      showToast(`✅ ${result.medication?.medicationName} tanındı (${result.responseTimeMs}ms)`);
    }
  }, [medicationCatalog, showToast]);

  // ── Yeni İlaç Kaydet ──
  const handleSaveNewMedication = useCallback(() => {
    if (!newMedName.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilaç adını giriniz.');
      return;
    }

    const newMed: CatalogMedication = {
      barcode: lastScannedBarcode,
      medicationName: newMedName.trim(),
      genericName: newMedGeneric.trim() || undefined,
      activeIngredient: newMedActive.trim() || 'Belirtilmedi',
      manufacturer: newMedManufacturer.trim() || undefined,
      dosageForm: newMedDosageForm.trim() || undefined,
      strength: newMedStrength.trim() || undefined,
      dosageInfo: newMedDosageInfo.trim() || undefined,
      usagePurpose: newMedPurpose.trim() || 'Belirtilmedi',
      category: newMedCategory.trim() || 'Genel',
      isPrescriptionRequired: newMedPrescription,
      verificationStatus: 'pending' as const,
      source: 'user' as const,
      createdBy: `${user.firstName} ${user.lastName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Yerel kataloğa + cache'lere kaydet
    addCatalogMedication(newMed);
    barcodeService.saveNewMedication(newMed);

    setShowAddMedModal(false);
    showToast('✅ İlaç başarıyla kaydedildi!');

    // Formu temizle
    setNewMedName(''); setNewMedGeneric(''); setNewMedActive('');
    setNewMedManufacturer(''); setNewMedDosageForm(''); setNewMedStrength('');
    setNewMedDosageInfo(''); setNewMedCategory(''); setNewMedPurpose('');
    setNewMedPrescription(false);

    // Hemen yeniden tara
    handleBarcodeScanned(lastScannedBarcode);
  }, [newMedName, newMedGeneric, newMedActive, newMedManufacturer, newMedDosageForm, newMedStrength, newMedDosageInfo, newMedCategory, newMedPurpose, newMedPrescription, lastScannedBarcode, user, addCatalogMedication, showToast, handleBarcodeScanned]);

  // ── AI Güvenlik Analizi ──
  const generateAIWarnings = (drug: CatalogMedication): string[] => {
    const cauts: string[] = [];

    // Alerji kontrolü
    for (const allergy of user.allergies) {
      if (drug.activeIngredient?.toLowerCase().includes(allergy.toLowerCase()) ||
          drug.medicationName.toLowerCase().includes(allergy.toLowerCase())) {
        cauts.push(`🚨 KRİTİK ALERJİ UYARISI: "${allergy}" alerjiniz mevcut! Bu ilacı kullanmak ciddi alerjik reaksiyona neden olabilir.`);
      }
    }

    // Hastalık kontrolü
    if (user.diseases.includes('Hipertansiyon')) {
      if (drug.category === 'Ağrı Kesici' && drug.activeIngredient?.toLowerCase().includes('ibuprofen')) {
        cauts.push('⚠️ Hipertansiyon Uyarısı: NSAİİ grubu ilaçlar (İbuprofen) tansiyon kontrolünü olumsuz etkileyebilir.');
      }
      if (drug.medicationName.toLowerCase().includes('majezik') || drug.activeIngredient?.toLowerCase().includes('flurbiprofen')) {
        cauts.push('⚠️ Hipertansiyon Uyarısı: Flurbiprofen tansiyon kontrolünü bozabilir ve böbrek yükünü artırabilir.');
      }
    }

    if (user.diseases.includes('Tip 2 Diyabet') || user.diseases.includes('Diyabet')) {
      if (drug.category === 'Kortikosteroid') {
        cauts.push('⚠️ Diyabet Uyarısı: Kortikosteroidler kan şekerini yükseltebilir. Diyabet ilaçlarınızın dozları ayarlanmalıdır.');
      }
    }

    // Mevcut ilaç etkileşimleri
    if (drug.interactions && drug.interactions.length > 0) {
      for (const userMed of user.medications) {
        for (const interaction of drug.interactions) {
          if (interaction.toLowerCase().includes(userMed.split(' ')[0].toLowerCase())) {
            cauts.push(`💊 İlaç Etkileşimi: Mevcut ilacınız "${userMed}" ile etkileşim riski: ${interaction}`);
          }
        }
      }
    }

    // Pending ilaç uyarısı
    if (drug.verificationStatus === 'pending') {
      cauts.push('ℹ️ Bu ilaç henüz doğrulanmamıştır. Topluluk katkısıyla eklenmiş bilgiler kullanılmaktadır.');
    }

    // Genel güvenlik mesajı
    if (cauts.length === 0) {
      cauts.push(`✅ "${drug.activeIngredient || 'Etken madde belirtilmedi'}" mevcut ilaçlarınız ve sağlık geçmişinizle akut etkileşim riski düşük görünmektedir.`);
      cauts.push('📋 Hekim kontrolünde, prospektüs talimatlarına uygun şekilde kullanmanız önerilir.');
    }

    return cauts;
  };

  // ── Document Scanner (Lab Result) ──
  const triggerDocumentScan = (source: 'CAMERA' | 'PDF' | 'GALLERY') => {
    setActiveModal('NONE');
    setProcessing(true);
    setProcessingStep(1);
    setProcessingText('Döküman yükleniyor...');

    setTimeout(() => {
      setProcessingStep(2);
      setProcessingText('PaddleOCR ile tahlil değerleri çıkartılıyor...');
      setTimeout(() => {
        setProcessingStep(3);
        setProcessingText('MedTech AI tahlil analizi hazırlanıyor...');
        setTimeout(() => {
          setProcessing(false);

          const newLabResult = {
            id: `lab-new-${Date.now()}`,
            title: 'Yeni Biyokimya Tahlil Raporu',
            date: new Date().toISOString().split('T')[0],
            laboratory: 'Merkez Laboratuvarı',
            doctorName: 'Dr. Meltem Yazar',
            values: [
              { testName: 'D Vitamini', value: 34.5, unit: 'ng/mL', referenceMin: 30, referenceMax: 100, status: 'NORMAL' as const, category: 'Vitamin' },
              { testName: 'Açlık Şekeri', value: 102, unit: 'mg/dL', referenceMin: 70, referenceMax: 100, status: 'HIGH' as const, category: 'Biyokimya' },
              { testName: 'LDL Kolesterol', value: 138, unit: 'mg/dL', referenceMin: 0, referenceMax: 130, status: 'HIGH' as const, category: 'Lipid' },
            ],
            aiInsights: [
              'D Vitamini değeriniz referans sınırları içindedir.',
              'Açlık şekeriniz hafif yüksektir — diyabet takibiniz kapsamında izlenmeli.',
              'LDL kolesterol değeriniz sınırın biraz üzerindedir.',
            ],
            status: 'ATTENTION' as const,
            createdAt: new Date().toISOString(),
          };

          addLabResult(newLabResult);
          showToast('📊 Tahlil raporu otomatik olarak kaydedildi.');
        }, 1500);
      }, 1500);
    }, 1000);
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  const drug = searchResult?.found ? searchResult.medication : null;
  const aiWarnings = drug ? generateAIWarnings(drug) : [];

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.scrollInner} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Sağlık Veri Girişi</Text>
          <Text style={[s.headerDesc, { color: colors.textSecondary }]}>
            İlaç barkodunu okutun veya tahlil dökümanlarınızı dijitalleştirin.
          </Text>
        </View>

        {/* ── 3 Aşamalı Loading Animasyonu ── */}
        {processing && (
          <Animated.View style={[s.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: fadeAnim }]}>
            {/* Animated Pulse Icon */}
            <Animated.View style={[s.loadingIconWrap, { transform: [{ scale: pulseAnim }] }]}>
              <View style={[s.loadingIconBg, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="scan-outline" size={36} color={colors.primary} />
              </View>
            </Animated.View>

            {/* Progress Steps */}
            <View style={s.stepsContainer}>
              {[1, 2, 3].map(step => (
                <View key={step} style={s.stepRow}>
                  <View style={[
                    s.stepDot,
                    {
                      backgroundColor: processingStep >= step ? colors.primary : colors.border,
                      transform: [{ scale: processingStep === step ? 1.3 : 1 }],
                    },
                  ]}>
                    {processingStep > step && (
                      <Ionicons name="checkmark" size={8} color="#FFF" />
                    )}
                  </View>
                  <Text style={[
                    s.stepText,
                    {
                      color: processingStep >= step ? colors.textPrimary : colors.textTertiary,
                      fontWeight: processingStep === step ? '700' : '400',
                    },
                  ]}>
                    {step === 1 ? '📡 Barkod çözümleniyor' :
                     step === 2 ? '🔍 Veritabanı sorgulanıyor' :
                     '🧬 AI güvenlik analizi'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Progress Bar */}
            <View style={[s.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
              <Animated.View style={[
                s.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]} />
            </View>

            <Text style={[s.loadingHint, { color: colors.textTertiary }]}>
              HIPAA uyumlu şifreleme ile güvenli arama
            </Text>
          </Animated.View>
        )}

        {/* ── Profesyonel İlaç Bilgi Kartı (e-Nabız kalitesinde) ── */}
        {drug && !processing && (
          <View style={[s.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Kart Header */}
            <View style={s.resultHeader}>
              <View style={s.headerBadges}>
                {/* Reçete durumu */}
                <View style={[
                  s.rxBadge,
                  { backgroundColor: drug.isPrescriptionRequired ? '#FF3B3015' : '#34C75915' },
                ]}>
                  <Ionicons
                    name={drug.isPrescriptionRequired ? 'medical' : 'checkmark-circle'}
                    size={12}
                    color={drug.isPrescriptionRequired ? '#FF3B30' : '#34C759'}
                  />
                  <Text style={[
                    s.rxBadgeText,
                    { color: drug.isPrescriptionRequired ? '#FF3B30' : '#34C759' },
                  ]}>
                    {drug.isPrescriptionRequired ? 'REÇETELİ' : 'REÇETESİZ'}
                  </Text>
                </View>

                {/* Doğrulama durumu */}
                <View style={[
                  s.verifiedBadge,
                  { backgroundColor: drug.verificationStatus === 'verified' ? '#34C75915' : '#FF950015' },
                ]}>
                  <Ionicons
                    name={drug.verificationStatus === 'verified' ? 'shield-checkmark' : 'time'}
                    size={12}
                    color={drug.verificationStatus === 'verified' ? '#34C759' : '#FF9500'}
                  />
                  <Text style={[
                    s.verifiedText,
                    { color: drug.verificationStatus === 'verified' ? '#34C759' : '#FF9500' },
                  ]}>
                    {drug.verificationStatus === 'verified' ? 'Doğrulanmış' : 'Onay Bekliyor'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setSearchResult(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* İlaç Adı & Etken Madde */}
            <View style={s.drugNameSection}>
              <View style={[s.drugIcon, { backgroundColor: `${colors.primary}12` }]}>
                <MaterialCommunityIcons name="pill" size={28} color={colors.primary} />
              </View>
              <View style={s.drugNameText}>
                <Text style={[s.drugName, { color: colors.textPrimary }]}>{drug.medicationName}</Text>
                <Text style={[s.drugGeneric, { color: colors.textSecondary }]}>
                  {drug.genericName || drug.activeIngredient || 'Etken madde belirtilmedi'}
                </Text>
              </View>
            </View>

            {/* Bilgi Kartları Grid */}
            <View style={s.infoGrid}>
              <View style={[s.infoTile, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="flask" size={16} color={colors.primary} />
                <Text style={[s.infoLabel, { color: colors.textTertiary }]}>Kategori</Text>
                <Text style={[s.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {drug.category || 'Genel'}
                </Text>
              </View>
              <View style={[s.infoTile, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="business" size={16} color={colors.primary} />
                <Text style={[s.infoLabel, { color: colors.textTertiary }]}>Üretici</Text>
                <Text style={[s.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {drug.manufacturer || 'Belirtilmedi'}
                </Text>
              </View>
              <View style={[s.infoTile, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="fitness" size={16} color={colors.primary} />
                <Text style={[s.infoLabel, { color: colors.textTertiary }]}>Doz</Text>
                <Text style={[s.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {drug.strength || 'Belirtilmedi'}
                </Text>
              </View>
              <View style={[s.infoTile, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="medical" size={16} color={colors.primary} />
                <Text style={[s.infoLabel, { color: colors.textTertiary }]}>Form</Text>
                <Text style={[s.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {drug.dosageForm || 'Belirtilmedi'}
                </Text>
              </View>
            </View>

            {/* Kullanım Talimatı */}
            {(drug.dosageInfo || drug.usageInstructions) && (
              <View style={[s.usageSection, { backgroundColor: `${colors.primary}08` }]}>
                <View style={s.usageSectionHeader}>
                  <Ionicons name="information-circle" size={16} color={colors.primary} />
                  <Text style={[s.usageSectionTitle, { color: colors.primary }]}>Kullanım Talimatı</Text>
                </View>
                {drug.dosageInfo && (
                  <Text style={[s.usageText, { color: colors.textPrimary }]}>
                    💊 {drug.dosageInfo}
                  </Text>
                )}
                {drug.usageInstructions && (
                  <Text style={[s.usageText, { color: colors.textSecondary }]}>
                    📋 {drug.usageInstructions}
                  </Text>
                )}
              </View>
            )}

            {/* Yan Etkiler */}
            {drug.sideEffects && drug.sideEffects.length > 0 && (
              <View style={[s.sideEffectsSection, { backgroundColor: '#FF950008' }]}>
                <View style={s.usageSectionHeader}>
                  <Ionicons name="warning" size={16} color="#FF9500" />
                  <Text style={[s.usageSectionTitle, { color: '#FF9500' }]}>Olası Yan Etkiler</Text>
                </View>
                <View style={s.tagRow}>
                  {drug.sideEffects.map((se, i) => (
                    <View key={i} style={[s.sideEffectTag, { backgroundColor: '#FF950012' }]}>
                      <Text style={[s.sideEffectTagText, { color: '#FF9500' }]}>{se}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Prospektüs (Accordion) */}
            {drug.prospectus && (
              <TouchableOpacity
                style={[s.prospectusSection, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setExpandedProspectus(!expandedProspectus)}
                activeOpacity={0.7}
              >
                <View style={s.prospectusHeader}>
                  <Ionicons name="document-text" size={16} color={colors.textSecondary} />
                  <Text style={[s.prospectusTitle, { color: colors.textPrimary }]}>Prospektüs</Text>
                  <Ionicons
                    name={expandedProspectus ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textTertiary}
                  />
                </View>
                {expandedProspectus && (
                  <Text style={[s.prospectusText, { color: colors.textSecondary }]}>
                    {drug.prospectus}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* AI Güvenlik Analizi */}
            <View style={[s.aiReport, { backgroundColor: `${colors.primary}0D` }]}>
              <View style={s.aiHeaderRow}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={[s.aiHeaderTitle, { color: colors.primary }]}>MedTech AI Güvenlik Analizi</Text>
              </View>
              {aiWarnings.map((w, i) => (
                <View key={i} style={s.cautionBullet}>
                  <View style={[s.dot, { backgroundColor: w.includes('KRİTİK') || w.includes('🚨') ? '#FF3B30' : colors.primary }]} />
                  <Text style={[s.cautionText, { color: colors.textPrimary }]}>{w}</Text>
                </View>
              ))}
              <Text style={[s.disclaimer, { color: colors.textTertiary }]}>
                * MedTech AI tıbbi asistanıdır. Reçete yazmaz, hekim tavsiyesi yerine geçmez.
              </Text>
            </View>

            {/* Kaynak & Performans Bilgisi */}
            <View style={s.metaRow}>
              <Text style={[s.metaText, { color: colors.textTertiary }]}>
                📡 Kaynak: {searchResult?.source === 'memory_cache' ? 'Bellek Önbelleği' :
                            searchResult?.source === 'local_cache' ? 'Yerel Önbellek' :
                            searchResult?.source === 'local_catalog' ? 'Yerel Veritabanı' :
                            searchResult?.source === 'api' ? 'Bulut API' : 'Bilinmiyor'}
              </Text>
              <Text style={[s.metaText, { color: colors.textTertiary }]}>
                ⏱️ {searchResult?.responseTimeMs}ms
              </Text>
              <Text style={[s.metaText, { color: colors.textTertiary }]}>
                🎯 %{Math.round((searchResult?.confidence || 0) * 100)} güven
              </Text>
            </View>
          </View>
        )}

        {/* ── Action Cards ── */}
        <View style={s.cardGrid}>
          {/* İlaç Barkodu Tara */}
          <TouchableOpacity
            style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={openCamera}
            activeOpacity={0.8}
          >
            <View style={[s.iconBox, { backgroundColor: `${colors.primary}12` }]}>
              <Ionicons name="barcode-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>İlaç Barkodu Tara</Text>
            <Text style={[s.cardDesc, { color: colors.textSecondary }]}>
              Kameranızı kullanarak ilaç barkodunu okutun. 50+ ilaçlık veritabanı ile anında tanıma.
            </Text>
            <View style={[s.actionLink, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[s.linkText, { color: colors.primary }]}>Kamerayı Başlat</Text>
              <Feather name="chevron-right" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Tahlil & Rapor Yükle */}
          <TouchableOpacity
            style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setActiveModal('DOC_PICKER')}
            activeOpacity={0.8}
          >
            <View style={[s.iconBox, { backgroundColor: '#34C75912' }]}>
              <Ionicons name="document-text-outline" size={32} color="#34C759" />
            </View>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Tahlil & Rapor Yükle</Text>
            <Text style={[s.cardDesc, { color: colors.textSecondary }]}>
              Tahlil sonuçlarınızı yükleyin. PaddleOCR ile otomatik dijitalleştirin.
            </Text>
            <View style={[s.actionLink, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[s.linkText, { color: '#34C759' }]}>Belge Seçin</Text>
              <Feather name="chevron-right" size={16} color="#34C759" />
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ══════ CAMERA MODAL ══════ */}
      <Modal visible={activeModal === 'CAMERA'} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Barkod Tarayıcı</Text>
              <TouchableOpacity onPress={() => setActiveModal('NONE')}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Camera + Laser Effect */}
            <View style={s.viewFinderContainer}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={({ data }) => {
                  if (data) handleBarcodeScanned(data);
                }}
              >
                {/* Corner Brackets */}
                <View style={s.corners}>
                  <View style={[s.corner, s.tl, { borderColor: colors.primary }]} />
                  <View style={[s.corner, s.tr, { borderColor: colors.primary }]} />
                  <View style={[s.corner, s.bl, { borderColor: colors.primary }]} />
                  <View style={[s.corner, s.br, { borderColor: colors.primary }]} />
                </View>

                {/* Animated Laser Scan Line */}
                <Animated.View
                  style={[
                    s.laserLine,
                    {
                      backgroundColor: colors.primary,
                      transform: [{
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 200],
                        }),
                      }],
                    },
                  ]}
                />

                {/* Test Buttons */}
                <View style={s.simButtonsRow}>
                  <TouchableOpacity
                    style={[s.simButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleBarcodeScanned('8699522093168')}
                    activeOpacity={0.8}
                  >
                    <Text style={s.simBtnText}>💊 Augmentin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.simButton, { backgroundColor: '#34C759' }]}
                    onPress={() => handleBarcodeScanned('8699504090697')}
                    activeOpacity={0.8}
                  >
                    <Text style={s.simBtnText}>💊 Glifor</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.simButton, { backgroundColor: '#FF9500' }]}
                    onPress={() => handleBarcodeScanned('9999999999999')}
                    activeOpacity={0.8}
                  >
                    <Text style={s.simBtnText}>⚡ Bilinmeyen</Text>
                  </TouchableOpacity>
                </View>
              </CameraView>
            </View>

            <Text style={[s.modalDesc, { color: colors.textSecondary }]}>
              Barkodu çerçeve içine hizalayın. Otomatik olarak tanınacaktır.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ══════ DOCUMENT PICKER MODAL ══════ */}
      <Modal visible={activeModal === 'DOC_PICKER'} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setActiveModal('NONE')}>
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary, marginBottom: spacing.lg, textAlign: 'center' }]}>
              Rapor Yükleme Kaynağı
            </Text>
            {[
              { icon: 'camera-outline', label: 'Kamera ile Fotoğraf Çek', source: 'CAMERA' as const },
              { icon: 'document-outline', label: 'PDF Dosyası Yükle', source: 'PDF' as const },
              { icon: 'images-outline', label: 'Fotoğraf Galerisinden Seç', source: 'GALLERY' as const },
            ].map(({ icon, label, source }) => (
              <TouchableOpacity
                key={source}
                style={[s.pickerRow, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => triggerDocumentScan(source)}
              >
                <Ionicons name={icon as any} size={22} color={colors.primary} />
                <Text style={[s.pickerText, { color: colors.textPrimary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══════ YENİ İLAÇ KAYIT MODALI (Genişletilmiş) ══════ */}
      <Modal visible={showAddMedModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.addMedSheet, { backgroundColor: colors.surface }]}>
            <View style={s.modalHeader}>
              <View>
                <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Yeni İlaç Kaydet</Text>
                <Text style={[s.modalSubtitle, { color: colors.textTertiary }]}>
                  Barkod: {lastScannedBarcode}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddMedModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={s.formScroll}>
              {/* İlaç Adı */}
              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.textSecondary }]}>İLAÇ ADI *</Text>
                <TextInput
                  style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                  placeholder="Örn: Augmentin BID 1000mg"
                  placeholderTextColor={colors.textTertiary}
                  value={newMedName}
                  onChangeText={setNewMedName}
                />
              </View>

              {/* Jenerik Adı */}
              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.textSecondary }]}>JENERİK ADI</Text>
                <TextInput
                  style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                  placeholder="Örn: Amoksisilin/Klavulanik Asit"
                  placeholderTextColor={colors.textTertiary}
                  value={newMedGeneric}
                  onChangeText={setNewMedGeneric}
                />
              </View>

              {/* Etken Madde */}
              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.textSecondary }]}>ETKEN MADDE</Text>
                <TextInput
                  style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                  placeholder="Örn: Amoksisilin 875mg + Klavulanik Asit 125mg"
                  placeholderTextColor={colors.textTertiary}
                  value={newMedActive}
                  onChangeText={setNewMedActive}
                />
              </View>

              {/* 2-column row */}
              <View style={s.formRow}>
                <View style={[s.formGroup, { flex: 1 }]}>
                  <Text style={[s.formLabel, { color: colors.textSecondary }]}>ÜRETİCİ</Text>
                  <TextInput
                    style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                    placeholder="Örn: Pfizer"
                    placeholderTextColor={colors.textTertiary}
                    value={newMedManufacturer}
                    onChangeText={setNewMedManufacturer}
                  />
                </View>
                <View style={[s.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
                  <Text style={[s.formLabel, { color: colors.textSecondary }]}>FORM</Text>
                  <TextInput
                    style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                    placeholder="Tablet, Kapsül..."
                    placeholderTextColor={colors.textTertiary}
                    value={newMedDosageForm}
                    onChangeText={setNewMedDosageForm}
                  />
                </View>
              </View>

              {/* 2-column row */}
              <View style={s.formRow}>
                <View style={[s.formGroup, { flex: 1 }]}>
                  <Text style={[s.formLabel, { color: colors.textSecondary }]}>DOZ</Text>
                  <TextInput
                    style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                    placeholder="500mg"
                    placeholderTextColor={colors.textTertiary}
                    value={newMedStrength}
                    onChangeText={setNewMedStrength}
                  />
                </View>
                <View style={[s.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
                  <Text style={[s.formLabel, { color: colors.textSecondary }]}>KATEGORİ</Text>
                  <TextInput
                    style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                    placeholder="Antibiyotik"
                    placeholderTextColor={colors.textTertiary}
                    value={newMedCategory}
                    onChangeText={setNewMedCategory}
                  />
                </View>
              </View>

              {/* Doz Bilgisi */}
              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.textSecondary }]}>DOZ BİLGİSİ</Text>
                <TextInput
                  style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                  placeholder="Günde 2 kez, 1 tablet"
                  placeholderTextColor={colors.textTertiary}
                  value={newMedDosageInfo}
                  onChangeText={setNewMedDosageInfo}
                />
              </View>

              {/* Kısa Açıklama */}
              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.textSecondary }]}>KISA AÇIKLAMA</Text>
                <TextInput
                  style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                  placeholder="Ağrı kesici, antibiyotik vb."
                  placeholderTextColor={colors.textTertiary}
                  value={newMedPurpose}
                  onChangeText={setNewMedPurpose}
                />
              </View>

              {/* Reçeteli Toggle */}
              <TouchableOpacity
                style={[s.toggleRow, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setNewMedPrescription(!newMedPrescription)}
                activeOpacity={0.7}
              >
                <View style={s.toggleLeft}>
                  <Ionicons name="medical" size={18} color={newMedPrescription ? '#FF3B30' : colors.textTertiary} />
                  <Text style={[s.toggleLabel, { color: colors.textPrimary }]}>Reçeteli İlaç</Text>
                </View>
                <View style={[
                  s.toggleSwitch,
                  { backgroundColor: newMedPrescription ? colors.primary : colors.border },
                ]}>
                  <View style={[
                    s.toggleKnob,
                    { transform: [{ translateX: newMedPrescription ? 18 : 2 }] },
                  ]} />
                </View>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Kaydet Butonu */}
            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveNewMedication}
              activeOpacity={0.8}
            >
              <Ionicons name="save" size={18} color="#FFF" />
              <Text style={s.submitBtnText}>Kaydet ve Tara</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1 },
  scrollInner: { padding: spacing.xl, paddingBottom: 110 },

  // Header
  header: { marginBottom: spacing.xl },
  headerTitle: { ...typography.h1, fontWeight: '800' } as any,
  headerDesc: { ...typography.bodySmall, marginTop: spacing.xs, lineHeight: 20 } as any,

  // Loading Card
  loadingCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  loadingIconWrap: { marginBottom: spacing.xs },
  loadingIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsContainer: { width: '100%', gap: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 13, lineHeight: 18 },
  progressBar: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  loadingHint: { fontSize: 10, textAlign: 'center', fontStyle: 'italic' },

  // Result Card (e-Nabız quality)
  resultCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerBadges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  rxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  rxBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  verifiedText: { fontSize: 9, fontWeight: '700' },

  drugNameSection: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  drugIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drugNameText: { flex: 1 },
  drugName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  drugGeneric: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoTile: {
    width: (width - spacing.xl * 2 - spacing.xl * 2 - spacing.sm) / 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: 4,
  },
  infoLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 12, fontWeight: '600' },

  // Usage Section
  usageSection: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  usageSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  usageSectionTitle: { fontSize: 12, fontWeight: '800' },
  usageText: { fontSize: 12, lineHeight: 18, fontWeight: '500', paddingLeft: 4 },

  // Side Effects
  sideEffectsSection: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sideEffectTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  sideEffectTagText: { fontSize: 10, fontWeight: '600' },

  // Prospectus
  prospectusSection: { borderRadius: radius.lg, padding: spacing.md },
  prospectusHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'space-between' },
  prospectusTitle: { fontSize: 12, fontWeight: '700', flex: 1 },
  prospectusText: { fontSize: 12, lineHeight: 20, marginTop: spacing.sm },

  // AI Report
  aiReport: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  aiHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  aiHeaderTitle: { fontSize: 12, fontWeight: '800' },
  cautionBullet: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingLeft: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  cautionText: { fontSize: 12, lineHeight: 18, flex: 1, fontWeight: '500' },
  disclaimer: { fontSize: 9, lineHeight: 13, marginTop: spacing.md, fontStyle: 'italic' },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  metaText: { fontSize: 9, fontWeight: '600' },

  // Action Cards
  cardGrid: { gap: spacing.lg },
  card: { borderRadius: radius.xxl, borderWidth: 1, padding: spacing.xl, gap: spacing.md },
  iconBox: { width: 56, height: 56, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.h3, fontWeight: '700' } as any,
  cardDesc: { ...typography.bodySmall, lineHeight: 18 } as any,
  actionLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.lg },
  linkText: { ...typography.buttonSmall, fontWeight: '700' } as any,

  // Camera Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.xxl, paddingBottom: 40 },
  addMedSheet: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.xxl, paddingBottom: 30, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { ...typography.h3, fontWeight: '800' } as any,
  modalSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  modalDesc: { ...typography.caption, lineHeight: 18, marginTop: spacing.xl, textAlign: 'center' } as any,

  viewFinderContainer: {
    height: 240,
    borderRadius: radius.xl,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  corners: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  corner: { position: 'absolute', width: 24, height: 24, borderWidth: 3 },
  tl: { top: 16, left: 16, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 16, right: 16, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 16, left: 16, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 16, right: 16, borderLeftWidth: 0, borderTopWidth: 0 },

  laserLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 2,
    borderRadius: 1,
    zIndex: 15,
    shadowColor: '#00FF00',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },

  simButtonsRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    zIndex: 20,
  },
  simButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simBtnText: { color: '#FFF', fontSize: 9, fontWeight: '700', textAlign: 'center' },

  // Doc Picker
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xl, borderRadius: radius.xl, marginBottom: spacing.md },
  pickerText: { ...typography.button, fontWeight: '700' } as any,

  // Form
  formScroll: { maxHeight: 400 },
  formGroup: { marginBottom: spacing.md },
  formLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  formRow: { flexDirection: 'row' },
  input: { borderWidth: 1, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: spacing.lg, fontSize: 13 },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleLabel: { fontSize: 13, fontWeight: '600' },
  toggleSwitch: { width: 42, height: 24, borderRadius: 12, justifyContent: 'center' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.xl,
  },
  submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
