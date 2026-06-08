import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius, typography } from '../../../theme';
import { MedicalRecord, MedicalRecordType } from '../types';
import { MedicalHistoryService } from '../services/MedicalHistoryService';
import { hapticService } from '../../heartRate/haptics/HapticService';

interface MedicalEditorFormProps {
  onAddRecord: (record: MedicalRecord) => void;
}

export default function MedicalEditorForm({ onAddRecord }: MedicalEditorFormProps) {
  const { colors, isDarkMode } = useTheme();

  // Active Category selector tab
  const [activeType, setActiveType] = useState<MedicalRecordType>('DIAGNOSIS');

  // Input Fields
  const [title, setTitle] = useState('');
  const [hospital, setHospital] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState('');
  const [reports, setReports] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [complaintLevel, setComplaintLevel] = useState('5');
  const [bodyPart, setBodyPart] = useState<'HEAD' | 'CHEST' | 'BACK' | 'KNEE'>('HEAD');

  // Focus glow controls
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Auto-suggestion directory state
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Search handle
  const handleTitleChange = (text: string) => {
    setTitle(text);
    if (activeType === 'DIAGNOSIS') {
      const matches = MedicalHistoryService.searchDiseases(text);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  // Autocomplete select trigger
  const selectSuggestion = (item: any) => {
    hapticService.triggerHeartbeat();
    setTitle(item.name);
    setBodyPart(item.bodyPart);
    setMedications(item.commonMeds.join(', '));
    setSuggestions([]);
  };

  // Submit manual medical record entry
  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("Eksik Veri", "Lütfen hastalık, ameliyat veya alerjen adını giriniz.");
      return;
    }

    hapticService.triggerHeartbeat();

    const record: MedicalRecord = {
      id: `rec-${Date.now()}`,
      title: title.trim(),
      type: activeType,
      date: new Date().toLocaleDateString('tr-TR'),
      complaintLevel: activeType === 'ALLERGY' ? 4 : Math.max(0, Math.min(10, parseInt(complaintLevel) || 0)),
      status: activeType === 'DIAGNOSIS' ? 'AKTiF' : activeType === 'SURGERY' ? 'IYILESTI' : 'TAKIPTE',
      medications: medications ? medications.split(',').map(m => m.trim()).filter(Boolean) : [],
      doctorName: doctorName.trim() || 'Kendi Beyanı',
      notes: notes.trim() || 'Hasta beyanlı medikal kayıt girişi yapıldı.',
      hospital: hospital.trim() || 'Kişisel Sağlık Kaydı',
      treatmentPlan: treatmentPlan.trim() || undefined,
      reports: reports ? reports.split(',').map(r => r.trim()).filter(Boolean) : undefined,
      bodyPart: activeType === 'DIAGNOSIS' || activeType === 'SURGERY' ? bodyPart : undefined
    };

    onAddRecord(record);

    // Reset Forms
    setTitle('');
    setHospital('');
    setDoctorName('');
    setNotes('');
    setMedications('');
    setReports('');
    setTreatmentPlan('');
    setSuggestions([]);
    Alert.alert("Kayıt Eklendi", `"${record.title}" başarıyla sağlık kimliğinize işlendi.`);
  };

  return (
    <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      
      {/* Category selector slider */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Yeni Tıbbi Kayıt Ekle</Text>
      <View style={styles.categoryRow}>
        {(['DIAGNOSIS', 'SURGERY', 'ALLERGY', 'CHECKUP'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.categoryTab,
              activeType === type && { backgroundColor: type === 'DIAGNOSIS' ? '#FF3B30' : type === 'SURGERY' ? '#14B8A6' : type === 'ALLERGY' ? '#EF4444' : '#3B82F6' }
            ]}
            onPress={() => {
              hapticService.triggerHeartbeat();
              setActiveType(type);
              setSuggestions([]);
            }}
          >
            <Text style={[
              styles.categoryTabText,
              { color: colors.textPrimary },
              activeType === type && { color: '#FFF', fontWeight: '800' }
            ]}>
              {type === 'DIAGNOSIS' ? 'Hastalık' : type === 'SURGERY' ? 'Ameliyat' : type === 'ALLERGY' ? 'Alerji' : 'Kontrol'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Primary Input (Searchable autocomplete title) */}
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
        {activeType === 'DIAGNOSIS' ? 'Teşhis / Hastalık Adı' : activeType === 'SURGERY' ? 'Operasyon / Ameliyat Adı' : activeType === 'ALLERGY' ? 'Alerjen / Madde Adı' : 'Kontrol Muayene Adı'}
      </Text>
      <View style={{ position: 'relative', zIndex: 50 }}>
        <TextInput
          style={[
            styles.inputField,
            { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' },
            focusedField === 'title' && { borderColor: '#3B82F6', shadowColor: '#3B82F6', elevation: 4 }
          ]}
          value={title}
          onChangeText={handleTitleChange}
          onFocus={() => setFocusedField('title')}
          onBlur={() => setFocusedField(null)}
          placeholder="Örn: Migren, Bel Fıtığı, Polen..."
          placeholderTextColor={colors.textTertiary}
        />

        {/* Dynamic disease search list auto-suggestion drops */}
        {suggestions.length > 0 && (
          <View style={[styles.suggestionBox, { backgroundColor: isDarkMode ? '#1A2333' : '#FFF', borderColor: colors.border }]}>
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
                onPress={() => selectSuggestion(item)}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                <Text style={[styles.suggestionRowText, { color: colors.textPrimary }]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Anatomy bodyPart map selector (Only active for diagnoses/surgeries) */}
      {(activeType === 'DIAGNOSIS' || activeType === 'SURGERY') && (
        <View style={{ marginTop: spacing.md, zIndex: 10 }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Etkilenen Vücut Bölgesi (3D Radar Eşleşmesi)</Text>
          <View style={styles.bodyPartRow}>
            {(['HEAD', 'CHEST', 'BACK', 'KNEE'] as const).map((part) => (
              <TouchableOpacity
                key={part}
                style={[
                  styles.bodyPartBtn,
                  { borderColor: colors.border },
                  bodyPart === part && { backgroundColor: '#10B981', borderColor: '#10B981' }
                ]}
                onPress={() => setBodyPart(part)}
              >
                <Text style={[
                  styles.bodyPartBtnText,
                  { color: colors.textPrimary },
                  bodyPart === part && { color: '#FFF', fontWeight: '800' }
                ]}>
                  {part === 'HEAD' ? 'Baş' : part === 'CHEST' ? 'Göğüs' : part === 'BACK' ? 'Bel' : 'Diz'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Complaint level selection rating (Only for non-allergies) */}
      {activeType !== 'ALLERGY' && (
        <View style={{ marginTop: spacing.md }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Aktif Ağrı / Şikayet Şiddeti (1 - 10)</Text>
          <TextInput
            style={[
              styles.inputField,
              { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' },
              focusedField === 'complaint' && { borderColor: '#3B82F6' }
            ]}
            value={complaintLevel}
            onChangeText={setComplaintLevel}
            keyboardType="numeric"
            onFocus={() => setFocusedField('complaint')}
            onBlur={() => setFocusedField(null)}
            placeholder="Ağrı Derecesi (1-10)"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      )}

      {/* Sub Fields */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sağlık Kuruluşu / Hastane</Text>
          <TextInput
            style={[
              styles.inputField,
              { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }
            ]}
            value={hospital}
            onChangeText={setHospital}
            placeholder="Örn: Maslak Acıbadem"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Teşhisi Kovan Hekim Adı</Text>
          <TextInput
            style={[
              styles.inputField,
              { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }
            ]}
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder="Örn: Prof. Dr. Yılmaz"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </View>

      <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>Aktif İlaç Listesi (Virgülle ayırın)</Text>
      <TextInput
        style={[
          styles.inputField,
          { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }
        ]}
        value={medications}
        onChangeText={setMedications}
        placeholder="Örn: Relpax 40mg, Arveles"
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>Tedavi Planı & Uygulanan İşlem</Text>
      <TextInput
        style={[
          styles.inputField,
          { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }
        ]}
        value={treatmentPlan}
        onChangeText={setTreatmentPlan}
        placeholder="Örn: 15 Seans Fizik Tedavi..."
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>Rapor Kodu / MRI / EKG Kodları (Opsiyonel)</Text>
      <TextInput
        style={[
          styles.inputField,
          { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }
        ]}
        value={reports}
        onChangeText={setReports}
        placeholder="Örn: MRI-420, EKG-99"
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>Açıklama / Doktor Bulguları / Notlar</Text>
      <TextInput
        style={[
          styles.inputField,
          { height: 64, color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }
        ]}
        value={notes}
        onChangeText={setNotes}
        multiline={true}
        placeholder="Belirtiler, kontrol periyotları ve hekim uyarı notları..."
        placeholderTextColor={colors.textTertiary}
      />

      <TouchableOpacity style={styles.addRecordBtn} onPress={handleSubmit}>
        <Text style={styles.addRecordBtnText}>Medikal Geçmiş Defterine Ekle</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryTab: {
    flex: 1,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryTabText: {
    fontSize: 9,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputField: {
    height: 40,
    borderRadius: radius.md,
    borderWidth: 0.8,
    paddingHorizontal: spacing.md,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  suggestionBox: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    maxHeight: 150,
    zIndex: 999,
    elevation: 6,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  suggestionRowText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bodyPartRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  bodyPartBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyPartBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  addRecordBtn: {
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginTop: spacing.sm,
  },
  addRecordBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
