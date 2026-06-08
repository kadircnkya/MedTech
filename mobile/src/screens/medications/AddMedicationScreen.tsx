import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { Medication } from '../../types';
import { DOSAGE_FORMS, MEDICATION_COLORS } from '../../constants/mockData';
import { scheduleMedicationReminders, requestNotificationPermission } from '../../services/NotificationService';

function FieldLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>;
}

function TextField({ value, onChangeText, placeholder, keyboardType }: {
  value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any;
}) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      placeholderTextColor={colors.textTertiary}
      style={[s.input, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, borderColor: colors.border }]}
    />
  );
}

const DEFAULT_TIMES = ['08:00', '13:00', '20:00'];

export default function AddMedicationScreen() {
  const { colors } = useTheme();
  const { addMedication, addDoseRecord, setCurrentScreen, showToast } = useAppStore();

  const [name, setName]           = useState('');
  const [genericName, setGenericName] = useState('');
  const [strength, setStrength]   = useState('');
  const [form, setForm]           = useState('Tablet');
  const [times, setTimes]         = useState<string[]>(['08:00']);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate]     = useState('');
  const [notes, setNotes]         = useState('');
  const [color, setColor]         = useState(MEDICATION_COLORS[0]);
  const [saving, setSaving]       = useState(false);

  const addTime = () => {
    if (times.length >= 6) return;
    const next = DEFAULT_TIMES.find(t => !times.includes(t)) ?? '08:00';
    setTimes([...times, next]);
  };

  const removeTime = (idx: number) => {
    if (times.length <= 1) return;
    setTimes(times.filter((_, i) => i !== idx));
  };

  const updateTime = (idx: number, value: string) => {
    const updated = [...times];
    updated[idx] = value;
    setTimes(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Eksik Bilgi', 'İlaç adı zorunludur.'); return; }
    if (!strength.trim()) { Alert.alert('Eksik Bilgi', 'Doz bilgisi zorunludur.'); return; }
    if (times.some(t => !/^\d{2}:\d{2}$/.test(t))) {
      Alert.alert('Hatalı Format', 'Saatleri SS:DD formatında girin. Örnek: 08:00');
      return;
    }

    setSaving(true);
    try {
      const newMed: Medication = {
        id: `med-${Date.now()}`,
        name: name.trim(),
        genericName: genericName.trim(),
        strength: strength.trim(),
        dosageForm: form,
        times: [...times].sort(),
        startDate,
        endDate: endDate || undefined,
        isActive: true,
        notes: notes.trim() || undefined,
        color,
        createdAt: new Date().toISOString(),
      };

      addMedication(newMed);

      // Bugünün doz kayıtlarını oluştur
      const today = new Date().toISOString().split('T')[0];
      times.forEach((t, i) => {
        const now = new Date();
        const [hh, mm] = t.split(':').map(Number);
        const doseTime = new Date();
        doseTime.setHours(hh, mm, 0, 0);
        const isPast = doseTime < now;

        addDoseRecord({
          id: `dr-new-${Date.now()}-${i}`,
          medicationId: newMed.id,
          medicationName: newMed.name,
          scheduledTime: t,
          status: isPast ? 'MISSED' : 'PENDING',
          date: today,
        });
      });

      // Bildirim planla
      await requestNotificationPermission();
      await scheduleMedicationReminders(newMed, `dose-${Date.now()}`);

      showToast(`${newMed.name} eklendi ve hatırlatıcılar ayarlandı.`);
      setCurrentScreen('MEDICATIONS');
    } catch (e) {
      Alert.alert('Hata', 'İlaç kaydedilirken bir sorun oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView style={s.scroll} contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>

        {/* İlaç adı & etken madde */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FieldLabel label="İlaç Adı *" />
          <TextField value={name} onChangeText={setName} placeholder="Örnek: Beloc ZOK 50mg" />
          <FieldLabel label="Etken Madde" />
          <TextField value={genericName} onChangeText={setGenericName} placeholder="Örnek: Metoprolol Süksinat" />
          <FieldLabel label="Doz / Güç *" />
          <TextField value={strength} onChangeText={setStrength} placeholder="Örnek: 50mg" />
        </View>

        {/* Form (tablet, kapsül…) */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FieldLabel label="İlaç Formu" />
          <View style={s.chips}>
            {DOSAGE_FORMS.map(f => (
              <TouchableOpacity
                key={f}
                style={[s.chip, { backgroundColor: form === f ? colors.primary : colors.surfaceSecondary }]}
                onPress={() => setForm(f)}
              >
                <Text style={[s.chipText, { color: form === f ? '#FFF' : colors.textSecondary }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Kullanım saatleri */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.rowBetween}>
            <FieldLabel label="Kullanım Saatleri *" />
            <TouchableOpacity onPress={addTime} style={[s.addTimeBtn, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[s.addTimeText, { color: colors.primary }]}>Saat Ekle</Text>
            </TouchableOpacity>
          </View>
          {times.map((t, idx) => (
            <View key={idx} style={s.timeRow}>
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
              <TextInput
                value={t}
                onChangeText={v => updateTime(idx, v)}
                placeholder="08:00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={[s.timeInput, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, borderColor: colors.border }]}
              />
              <Text style={[s.timeHint, { color: colors.textTertiary }]}>SS:DD</Text>
              {times.length > 1 && (
                <TouchableOpacity onPress={() => removeTime(idx)}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <View style={[s.noticeBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="notifications-outline" size={14} color={colors.primary} />
            <Text style={[s.noticeText, { color: colors.textSecondary }]}>
              Her saat için 30 dk önce, 15 dk önce ve tam saatinde otomatik hatırlatıcı ayarlanacak.
            </Text>
          </View>
        </View>

        {/* Tarihler */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FieldLabel label="Başlangıç Tarihi *" />
          <TextField value={startDate} onChangeText={setStartDate} placeholder="YYYY-AA-GG" />
          <FieldLabel label="Bitiş Tarihi (opsiyonel)" />
          <TextField value={endDate} onChangeText={setEndDate} placeholder="YYYY-AA-GG — Boş bırakırsanız süresiz" />
        </View>

        {/* Renk seçimi */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FieldLabel label="Renk (Takvim görünümü için)" />
          <View style={s.colors}>
            {MEDICATION_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorDot, { backgroundColor: c }, color === c && s.colorSelected]}
                onPress={() => setColor(c)}
              >
                {color === c && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notlar */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FieldLabel label="Kullanım Notları" />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Örnek: Sabah aç karnına alınmalıdır."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            style={[s.input, s.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, borderColor: colors.border }]}
          />
        </View>

        {/* Kaydet butonu */}
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: saving ? colors.textTertiary : colors.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>{saving ? 'Kaydediliyor…' : 'İlacı Kaydet & Hatırlatıcı Ayarla'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  inner: { padding: spacing.xl, paddingBottom: 100 },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl, marginBottom: spacing.lg, gap: spacing.sm },
  label: { ...typography.caption, fontWeight: '700', marginBottom: 2 } as any,
  input: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md, ...typography.body } as any,
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  chipText: { ...typography.caption, fontWeight: '700' } as any,
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addTimeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill },
  addTimeText: { ...typography.caption, fontWeight: '700' } as any,
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeInput: { flex: 1, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.body, textAlign: 'center' } as any,
  timeHint: { ...typography.caption, width: 32 } as any,
  noticeBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg },
  noticeText: { ...typography.caption, flex: 1, lineHeight: 16 } as any,
  colors: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSelected: { borderWidth: 3, borderColor: 'rgba(0,0,0,0.2)' },
  saveBtn: { borderRadius: radius.xl, paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  saveBtnText: { color: '#FFF', ...typography.button, fontWeight: '800' } as any,
});
