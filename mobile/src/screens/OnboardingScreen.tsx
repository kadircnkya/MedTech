import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Animated, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography } from '../theme';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 7;

const BLOOD_TYPES = ['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-'];
const GENDERS = ['Erkek', 'Kadın', 'Diğer'];
const CHRONIC_DISEASES = ['Mide Ülseri', 'Hipertansiyon', 'Diyabet', 'Astım', 'Karaciğer Yetmezliği', 'KOAH', 'Depresyon', 'Epilepsi'];
const ALLERGIES = ['Parasetamol', 'Penisilin', 'Aspirin', 'Sülfonamid', 'Gluten', 'Laktoz', 'Polen', 'Lateks'];
const MEDICATIONS = ['Aspirin 100mg', 'Parol 500mg', 'Nurofen Cold & Flu', 'Lansor 30mg', 'Glifor 850mg', 'Arveles 25mg', 'Coraspin 100mg'];
const OPERATIONS = ['Apandisit', 'Bademcik', 'Fıtık', 'Katarakt', 'Safra Kesesi', 'Sezaryen', 'Bypass'];
const SMOKE_OPTIONS = ['Kullanmıyorum', 'Ara sıra', 'Düzenli'];
const ALCOHOL_OPTIONS = ['Kullanmıyorum', 'Nadiren', 'Sosyal', 'Düzenli'];

interface OnboardingScreenProps {
  isDarkMode: boolean;
  onComplete: (data: any) => void;
  onBack: () => void;
}

export default function OnboardingScreen({ isDarkMode, onComplete, onBack }: OnboardingScreenProps) {
  const c = isDarkMode ? colors.dark : colors.light;
  const [step, setStep] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Form data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [diseases, setDiseases] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [meds, setMeds] = useState<string[]>([]);
  const [operations, setOperations] = useState<string[]>([]);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [smoking, setSmoking] = useState('');
  const [alcohol, setAlcohol] = useState('');
  const [healthNotes, setHealthNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: (step + 1) / TOTAL_STEPS, duration: 400, useNativeDriver: false }).start();
  }, [step]);

  const animateStep = (dir: number, cb: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * -30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      cb();
      slideAnim.setValue(dir * 30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const validate = (): boolean => {
    const e: string[] = [];
    if (step === 0 && (!firstName.trim() || !lastName.trim())) e.push('Ad ve soyad gereklidir.');
    if (step === 1 && !gender) e.push('Cinsiyet seçimi gereklidir.');
    setErrors(e);
    return e.length === 0;
  };

  const next = () => { if (validate()) animateStep(1, () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))); };
  const prev = () => animateStep(-1, () => setStep(s => Math.max(s - 1, 0)));

  const handleComplete = () => {
    onComplete({ firstName: firstName || 'Kadir', lastName: lastName || 'Çankaya', birthDate, gender, height, weight, bloodType, diseases, allergies, meds, operations, emergencyContact, smoking, alcohol, healthNotes });
  };

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const renderChips = (items: string[], selected: string[], setSelected: (v: string[]) => void) => (
    <View style={styles.chipGrid}>
      {items.map(item => {
        const active = selected.includes(item);
        return (
          <TouchableOpacity key={item} onPress={() => toggleItem(selected, setSelected, item)}
            style={[styles.chip, { backgroundColor: active ? c.primary : c.surfaceSecondary, borderColor: active ? c.primary : c.border }]}>
            <Text style={[styles.chipText, { color: active ? '#FFF' : c.textSecondary }]}>{item}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSingleSelect = (items: string[], selected: string, setSelected: (v: string) => void) => (
    <View style={styles.chipGrid}>
      {items.map(item => {
        const active = selected === item;
        return (
          <TouchableOpacity key={item} onPress={() => setSelected(item)}
            style={[styles.chip, { backgroundColor: active ? c.primary : c.surfaceSecondary, borderColor: active ? c.primary : c.border }]}>
            <Text style={[styles.chipText, { color: active ? '#FFF' : c.textSecondary }]}>{item}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderField = (label: string, value: string, setValue: (v: string) => void, placeholder: string, keyboard?: 'numeric' | 'phone-pad') => (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{label}</Text>
      <View style={[styles.fieldInput, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
        <TextInput style={[styles.fieldText, { color: c.textPrimary }]} value={value} onChangeText={setValue}
          placeholder={placeholder} placeholderTextColor={c.textTertiary} keyboardType={keyboard || 'default'} />
      </View>
    </View>
  );

  const stepContent = () => {
    switch (step) {
      case 0: return (
        <View>
          <Text style={[styles.stepIcon]}>👤</Text>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Kişisel Bilgiler</Text>
          <Text style={[styles.stepDesc, { color: c.textSecondary }]}>Sizi tanıyalım — adınız ve doğum tarihiniz.</Text>
          {renderField('Ad', firstName, setFirstName, 'Adınızı girin')}
          {renderField('Soyad', lastName, setLastName, 'Soyadınızı girin')}
          {renderField('Doğum Tarihi', birthDate, setBirthDate, 'GG/AA/YYYY')}
        </View>
      );
      case 1: return (
        <View>
          <Text style={styles.stepIcon}>⚧️</Text>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Cinsiyet & Fiziksel</Text>
          <Text style={[styles.stepDesc, { color: c.textSecondary }]}>Cinsiyet, boy ve kilo bilgileriniz.</Text>
          <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Cinsiyet</Text>
          {renderSingleSelect(GENDERS, gender, setGender)}
          <View style={styles.rowFields}>
            <View style={{ flex: 1, marginRight: 8 }}>{renderField('Boy (cm)', height, setHeight, '175', 'numeric')}</View>
            <View style={{ flex: 1, marginLeft: 8 }}>{renderField('Kilo (kg)', weight, setWeight, '78', 'numeric')}</View>
          </View>
        </View>
      );
      case 2: return (
        <View>
          <Text style={styles.stepIcon}>🩸</Text>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Kan Grubu</Text>
          <Text style={[styles.stepDesc, { color: c.textSecondary }]}>Acil durumlar ve kan uyumu için gereklidir.</Text>
          {renderSingleSelect(BLOOD_TYPES, bloodType, setBloodType)}
        </View>
      );
      case 3: return (
        <View>
          <Text style={styles.stepIcon}>🩺</Text>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Sağlık Geçmişi</Text>
          <Text style={[styles.stepDesc, { color: c.textSecondary }]}>Kronik hastalıklar ve alerjilerinizi seçin.</Text>
          <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Kronik Hastalıklar</Text>
          {renderChips(CHRONIC_DISEASES, diseases, setDiseases)}
          <Text style={[styles.sectionLabel, { color: c.textPrimary, marginTop: spacing.xl }]}>Alerjiler</Text>
          {renderChips(ALLERGIES, allergies, setAllergies)}
        </View>
      );
      case 4: return (
        <View>
          <Text style={styles.stepIcon}>💊</Text>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>İlaçlar & Ameliyatlar</Text>
          <Text style={[styles.stepDesc, { color: c.textSecondary }]}>Sürekli kullandığınız ilaçlar ve geçirdiğiniz ameliyatlar.</Text>
          <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Kullanılan İlaçlar</Text>
          {renderChips(MEDICATIONS, meds, setMeds)}
          <Text style={[styles.sectionLabel, { color: c.textPrimary, marginTop: spacing.xl }]}>Geçirilmiş Ameliyatlar</Text>
          {renderChips(OPERATIONS, operations, setOperations)}
        </View>
      );
      case 5: return (
        <View>
          <Text style={styles.stepIcon}>🚨</Text>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Acil Durum & Yaşam</Text>
          <Text style={[styles.stepDesc, { color: c.textSecondary }]}>Acil durum kişisi ve yaşam tarzı bilgileriniz.</Text>
          {renderField('Acil Durum İletişim', emergencyContact, setEmergencyContact, '+90 5XX XXX XX XX', 'phone-pad')}
          <Text style={[styles.sectionLabel, { color: c.textPrimary }]}>Sigara Kullanımı</Text>
          {renderSingleSelect(SMOKE_OPTIONS, smoking, setSmoking)}
          <Text style={[styles.sectionLabel, { color: c.textPrimary, marginTop: spacing.lg }]}>Alkol Kullanımı</Text>
          {renderSingleSelect(ALCOHOL_OPTIONS, alcohol, setAlcohol)}
        </View>
      );
      case 6: return (
        <View>
          <Text style={styles.stepIcon}>📋</Text>
          <Text style={[styles.stepTitle, { color: c.textPrimary }]}>Ek Sağlık Notları</Text>
          <Text style={[styles.stepDesc, { color: c.textSecondary }]}>Doktorunuzun bilmesi gereken ek bilgiler varsa buraya yazın.</Text>
          <View style={[styles.textArea, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
            <TextInput style={[styles.textAreaInput, { color: c.textPrimary }]} value={healthNotes} onChangeText={setHealthNotes}
              placeholder="Aile sağlık geçmişi, özel durumlar..." placeholderTextColor={c.textTertiary} multiline numberOfLines={5} textAlignVertical="top" />
          </View>
          <View style={[styles.trustCard, { backgroundColor: c.primaryLight, borderColor: c.primary + '20' }]}>
            <Text style={styles.trustCardIcon}>🔒</Text>
            <Text style={[styles.trustCardText, { color: c.primary }]}>Verileriniz güvenli şekilde şifrelenerek saklanır. Üçüncü taraflarla paylaşılmaz.</Text>
          </View>
        </View>
      );
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <TouchableOpacity onPress={step === 0 ? onBack : prev} style={[styles.navBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.navBtnText, { color: c.textPrimary }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.stepIndicator, { color: c.textSecondary }]}>{step + 1} / {TOTAL_STEPS}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.progressTrack, { backgroundColor: c.surfaceSecondary }]}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
            <LinearGradient colors={[c.gradientStart, c.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
          </Animated.View>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {stepContent()}
          {errors.length > 0 && (
            <View style={[styles.errorBox, { backgroundColor: c.errorLight, borderColor: c.error + '30' }]}>
              {errors.map((e, i) => <Text key={i} style={[styles.errorText, { color: c.error }]}>⚠️ {e}</Text>)}
            </View>
          )}
        </Animated.View>

        {/* Bottom Action inside ScrollView for safety */}
        <View style={styles.bottomBar}>
          <TouchableOpacity activeOpacity={0.8} onPress={step === TOTAL_STEPS - 1 ? handleComplete : next} style={{ flex: 1 }}>
            <LinearGradient colors={[c.gradientStart, c.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>{step === TOTAL_STEPS - 1 ? 'Profili Kaydet ✓' : 'Devam Et →'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: { paddingHorizontal: spacing.xl, paddingTop: Platform.OS === 'ios' ? spacing.sm : spacing.lg },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  navBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  navBtnText: { fontSize: 18, fontWeight: '600' },
  stepIndicator: { ...typography.label },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  scrollContent: { flex: 1 },
  scrollInner: { padding: spacing.xl, paddingBottom: 60, flexGrow: 1 },
  card: { borderRadius: radius.xxl, padding: spacing.xxl, borderWidth: 1 },
  stepIcon: { fontSize: 40, marginBottom: spacing.md },
  stepTitle: { ...typography.h1, fontWeight: '800', marginBottom: spacing.xs },
  stepDesc: { ...typography.body, marginBottom: spacing.xxl, lineHeight: 22 },
  sectionLabel: { ...typography.label, marginBottom: spacing.md },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1 },
  chipText: { ...typography.buttonSmall },
  fieldLabel: { ...typography.label, marginBottom: 6 },
  fieldInput: { borderRadius: radius.md, borderWidth: 1, height: 50, justifyContent: 'center', paddingHorizontal: spacing.md },
  fieldText: { ...typography.body },
  rowFields: { flexDirection: 'row' },
  textArea: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, minHeight: 120 },
  textAreaInput: { ...typography.body, minHeight: 100 },
  trustCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.xl, borderWidth: 1 },
  trustCardIcon: { fontSize: 16, marginRight: spacing.sm },
  trustCardText: { ...typography.caption, flex: 1, fontWeight: '500' },
  errorBox: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg, borderWidth: 1 },
  errorText: { ...typography.caption, fontWeight: '600' },
  bottomBar: { marginTop: spacing.xl },
  nextBtn: { height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#FFF', ...typography.button, fontWeight: '700' },
});
