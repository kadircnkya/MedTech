import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAppStore } from '../../store/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { MOCK_DRUGS } from '../../constants/mockData';

export default function MedicationDetailScreen() {
  const { colors } = useTheme();
  const {
    selectedMedication: med,
    setCurrentScreen,
    removeMedication,
    healthRecords,
    user,
    showToast,
  } = useAppStore();

  if (!med) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, padding: spacing.xl }}>İlaç bulunamadı.</Text>
      </View>
    );
  }

  const relatedDisease = useMemo(() =>
    healthRecords.find(r => r.id === med.diseaseId),
    [healthRecords, med.diseaseId]
  );

  // AI Analizi (mock — gerçek entegrasyonda API çağrısı)
  const aiAnalysis = useMemo(() => {
    const allergyConflict = user.allergies.some(a =>
      med.name.toLowerCase().includes(a.toLowerCase()) ||
      med.genericName.toLowerCase().includes(a.toLowerCase())
    );

    const insights: string[] = [];

    if (relatedDisease) {
      insights.push(`Bu ilaç "${relatedDisease.title}" tedavisi için kullanılmaktadır.`);
    }
    if (allergyConflict) {
      insights.push('⚠️ Kayıtlı alerjilerinizle çakışma tespit edildi. Doktorunuza danışınız.');
    } else {
      insights.push('Kayıtlı alerjilerinizle bilinen bir çakışma bulunmamaktadır.');
    }
    if (user.diseases.includes('Hipertansiyon') && med.genericName.toLowerCase().includes('metoprolol')) {
      insights.push('Metoprolol, hipertansiyon tedavisinde kullanılan beta-bloker grubundandır.');
    }
    if (user.diseases.includes('Tip 2 Diyabet') && med.genericName.toLowerCase().includes('metformin')) {
      insights.push('Metformin, Tip 2 Diyabet tedavisinde ilk tercih edilen ilaçtır.');
    }
    insights.push('Bu bilgiler yalnızca genel bilgilendirme amaçlıdır. Tıbbi karar için doktorunuza danışınız.');

    return {
      allergyRisk: allergyConflict ? 'HIGH' as const : 'NONE' as const,
      insights,
    };
  }, [med, relatedDisease, user]);

  const riskColor = aiAnalysis.allergyRisk === 'HIGH' ? colors.error : colors.success;
  const riskLabel = aiAnalysis.allergyRisk === 'HIGH' ? 'Dikkat' : 'Uyumlu';
  const riskBg = aiAnalysis.allergyRisk === 'HIGH' ? 'rgba(255,59,48,0.08)' : 'rgba(48,209,88,0.08)';

  const handleDeactivate = () => {
    Alert.alert(
      'İlacı Pasif Yap',
      `"${med.name}" ilacını aktif listeden kaldırmak istediğinize emin misiniz? Geçmiş kayıtlarınızda görünmeye devam edecektir.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Pasif Yap',
          style: 'destructive',
          onPress: () => {
            removeMedication(med.id);
            showToast(`${med.name} pasif yapıldı.`);
            setCurrentScreen('MEDICATIONS');
          },
        },
      ]
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView style={s.scroll} contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>

        {/* İlaç Başlık Kartı */}
        <View style={[s.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.colorBar, { backgroundColor: med.color }]} />
          <View style={s.headerBody}>
            <View style={s.headerTop}>
              <View style={s.headerInfo}>
                <Text style={[s.medName, { color: colors.textPrimary }]}>{med.name}</Text>
                <Text style={[s.medGeneric, { color: colors.textSecondary }]}>{med.genericName}</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: med.isActive ? 'rgba(48,209,88,0.12)' : colors.surfaceSecondary }]}>
                <Text style={[s.statusText, { color: med.isActive ? colors.success : colors.textTertiary }]}>
                  {med.isActive ? 'Aktif' : 'Pasif'}
                </Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <View style={[s.metaBadge, { backgroundColor: `${med.color}15` }]}>
                <Text style={[s.metaText, { color: med.color }]}>{med.dosageForm}</Text>
              </View>
              <View style={[s.metaBadge, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[s.metaText, { color: colors.textSecondary }]}>{med.strength}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Kullanım Saatleri */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Kullanım Saatleri</Text>
          <View style={s.timesRow}>
            {med.times.map(t => (
              <View key={t} style={[s.timeChip, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="time-outline" size={14} color={colors.primary} />
                <Text style={[s.timeText, { color: colors.primary }]}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={s.dateRow}>
            <View style={s.dateCol}>
              <Text style={[s.dateLabel, { color: colors.textTertiary }]}>Başlangıç</Text>
              <Text style={[s.dateVal, { color: colors.textPrimary }]}>{med.startDate}</Text>
            </View>
            {med.endDate && (
              <View style={s.dateCol}>
                <Text style={[s.dateLabel, { color: colors.textTertiary }]}>Bitiş</Text>
                <Text style={[s.dateVal, { color: colors.textPrimary }]}>{med.endDate}</Text>
              </View>
            )}
          </View>
          {med.notes ? (
            <View style={[s.notesBox, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[s.notesLabel, { color: colors.textTertiary }]}>Notlar</Text>
              <Text style={[s.notesText, { color: colors.textPrimary }]}>{med.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Bağlı Hastalık */}
        {relatedDisease && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>İlişkili Hastalık</Text>
            <View style={s.diseaseRow}>
              <View style={[s.diseaseIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="pulse-outline" size={18} color={colors.primary} />
              </View>
              <View style={s.diseaseInfo}>
                <Text style={[s.diseaseName, { color: colors.textPrimary }]}>{relatedDisease.title}</Text>
                {relatedDisease.doctorName && (
                  <Text style={[s.diseaseDoc, { color: colors.textSecondary }]}>{relatedDisease.doctorName}</Text>
                )}
                <Text style={[s.diseaseDate, { color: colors.textTertiary }]}>{relatedDisease.date}</Text>
              </View>
            </View>
          </View>
        )}

        {/* MedTech AI Analizi */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.aiHeader}>
            <View style={s.aiTitleRow}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>MedTech AI Analizi</Text>
            </View>
            <View style={[s.riskBadge, { backgroundColor: riskBg }]}>
              <Text style={[s.riskText, { color: riskColor }]}>{riskLabel}</Text>
            </View>
          </View>
          {aiAnalysis.insights.map((insight, i) => (
            <View key={i} style={[s.insightRow, { borderBottomColor: colors.border }]}>
              <View style={[s.insightDot, { backgroundColor: i === aiAnalysis.insights.length - 1 ? colors.surfaceSecondary : `${colors.primary}20` }]} />
              <Text style={[s.insightText, { color: i === aiAnalysis.insights.length - 1 ? colors.textTertiary : colors.textPrimary }]}>
                {insight}
              </Text>
            </View>
          ))}
          <View style={[s.disclaimerBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Feather name="alert-circle" size={12} color={colors.textTertiary} />
            <Text style={[s.disclaimerText, { color: colors.textTertiary }]}>
              Bu analiz tıbbi tavsiye niteliği taşımaz. Her zaman doktorunuza danışınız.
            </Text>
          </View>
        </View>

        {/* Aksiyon */}
        {med.isActive && (
          <TouchableOpacity
            style={[s.dangerBtn, { borderColor: colors.error }]}
            onPress={handleDeactivate}
            activeOpacity={0.8}
          >
            <Ionicons name="stop-circle-outline" size={18} color={colors.error} />
            <Text style={[s.dangerText, { color: colors.error }]}>Kullanımı Bitir</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  inner: { padding: spacing.xl, paddingBottom: 110 },
  headerCard: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  colorBar: { width: 5, alignSelf: 'stretch' },
  headerBody: { flex: 1, padding: spacing.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerInfo: { flex: 1, marginRight: spacing.md },
  medName: { ...typography.h2, fontWeight: '800' } as any,
  medGeneric: { ...typography.caption, marginTop: 4 } as any,
  statusPill: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.pill },
  statusText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  metaBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  metaText: { fontSize: 11, fontWeight: '700' },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  cardTitle: { ...typography.button, fontWeight: '700', marginBottom: spacing.md } as any,
  timesRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill },
  timeText: { ...typography.caption, fontWeight: '700' } as any,
  dateRow: { flexDirection: 'row', gap: spacing.xl },
  dateCol: { flex: 1 },
  dateLabel: { ...typography.caption, marginBottom: 2 } as any,
  dateVal: { ...typography.body, fontWeight: '600' } as any,
  notesBox: { borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md },
  notesLabel: { ...typography.caption, marginBottom: 4 } as any,
  notesText: { ...typography.bodySmall } as any,
  diseaseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  diseaseIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  diseaseInfo: { flex: 1 },
  diseaseName: { ...typography.button, fontWeight: '700' } as any,
  diseaseDoc: { ...typography.caption, marginTop: 2 } as any,
  diseaseDate: { ...typography.caption, marginTop: 2 } as any,
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  riskBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  riskText: { fontSize: 11, fontWeight: '700' },
  insightRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  insightDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  insightText: { ...typography.bodySmall, flex: 1, lineHeight: 20 } as any,
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  disclaimerText: { ...typography.caption, flex: 1, lineHeight: 16 } as any,
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  dangerText: { ...typography.button, fontWeight: '700' } as any,
});
