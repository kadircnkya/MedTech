import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { DoseRecord, Medication, HealthRecord } from '../../types';

const { width } = Dimensions.get('window');

// ── Bölüm Başlığı ──
function SectionHeader({ title, onPress, label }: { title: string; onPress?: () => void; label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={sh.row}>
      <Text style={[sh.title, { color: colors.textPrimary }]}>{title}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress}>
          <Text style={[sh.link, { color: colors.primary }]}>{label ?? 'Tümü'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { ...typography.h3, fontWeight: '700' } as any,
  link: { ...typography.bodySmall, fontWeight: '600' } as any,
});

// ── Doz Satırı ──
function DoseRow({ dose, medication, onMark }: {
  dose: DoseRecord;
  medication?: Medication;
  onMark: (id: string, status: 'TAKEN' | 'SKIPPED') => void;
}) {
  const { colors } = useTheme();
  const isPending = dose.status === 'PENDING';
  const isTaken = dose.status === 'TAKEN';
  const isMissed = dose.status === 'MISSED';

  const statusColor = isTaken ? colors.success : isMissed ? colors.error : colors.textTertiary;
  const badgeColor = isTaken ? 'rgba(48,209,88,0.12)' : isMissed ? 'rgba(255,59,48,0.10)' : colors.surfaceSecondary;
  const badgeText = isTaken ? 'Alındı' : isMissed ? 'Atlandı' : dose.scheduledTime;

  return (
    <View style={[doseStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[doseStyles.colorDot, { backgroundColor: medication?.color ?? colors.primary }]} />
      <View style={doseStyles.info}>
        <Text style={[doseStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {dose.medicationName}
        </Text>
        {medication?.strength ? (
          <Text style={[doseStyles.sub, { color: colors.textSecondary }]}>
            {medication.strength} · {medication.dosageForm}
          </Text>
        ) : null}
      </View>
      <View style={[doseStyles.badge, { backgroundColor: badgeColor }]}>
        <Text style={[doseStyles.badgeText, { color: statusColor }]}>{badgeText}</Text>
      </View>
      {isPending && (
        <TouchableOpacity
          style={[doseStyles.markBtn, { backgroundColor: colors.primary }]}
          onPress={() => onMark(dose.id, 'TAKEN')}
          activeOpacity={0.8}
        >
          <Feather name="check" size={14} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const doseStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, gap: spacing.md },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  info: { flex: 1 },
  name: { ...typography.button, fontWeight: '600' } as any,
  sub: { ...typography.caption, marginTop: 2 } as any,
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
  markBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});

// ── Ana Dashboard ──
export default function DashboardScreen() {
  const { colors, isDarkMode } = useTheme();
  const {
    user, medications, todayDoses, markDose,
    complianceRate, takenDoses, activeMeds,
    healthRecords, upcomingAppointment, latestLabResult,
    setCurrentScreen, setSelectedLabResult, unreadNotificationCount,
  } = useAppStore();

  const medMap = useMemo(() => {
    const map: Record<string, Medication> = {};
    medications.forEach(m => { map[m.id] = m; });
    return map;
  }, [medications]);

  // Aktif kronik hastalıklar ve ilişkili ilaçlar
  const activeTreatments = useMemo(() => {
    return healthRecords
      .filter(r => r.isActive && (r.type === 'CHRONIC' || r.type === 'DISEASE'))
      .map(r => ({
        record: r,
        meds: (r.relatedMedicationIds ?? [])
          .map(id => medications.find(m => m.id === id))
          .filter(Boolean) as Medication[],
      }));
  }, [healthRecords, medications]);

  // Günün saatine göre selamlama
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  }, []);

  const pendingCount = todayDoses.filter(d => d.status === 'PENDING').length;

  // Tarih Türkçe
  const dateStr = useMemo(() => {
    const d = new Date();
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  // Randevu formatı
  const aptDateStr = useMemo(() => {
    if (!upcomingAppointment) return '';
    const [y, m, day] = upcomingAppointment.date.split('-').map(Number);
    const months = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${day} ${months[m]} ${y}, ${upcomingAppointment.time}`;
  }, [upcomingAppointment]);

  // Lab sonucu tarih formatı
  const labDateStr = useMemo(() => {
    if (!latestLabResult) return '';
    const [y, m, day] = latestLabResult.date.split('-').map(Number);
    const months = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${day} ${months[m]} ${y}`;
  }, [latestLabResult]);

  const abnormalCount = useMemo(() =>
    latestLabResult?.values.filter(v => v.status !== 'NORMAL').length ?? 0,
    [latestLabResult]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Üst Başlık ── */}
        <View style={styles.topHeader}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting},</Text>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{user.firstName} {user.lastName}</Text>
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>{dateStr}</Text>
          </View>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarInitials, { color: colors.primary }]}>
              {user.firstName[0]}{user.lastName[0]}
            </Text>
          </View>
        </View>

        {/* ── Özet Kartlar ── */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryNum, { color: colors.primary }]}>{activeMeds}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Aktif İlaç</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryNum, { color: complianceRate >= 80 ? colors.success : colors.warning }]}>
              %{complianceRate}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Bugün Uyum</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryNum, { color: pendingCount > 0 ? colors.warning : colors.success }]}>
              {pendingCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Bekleyen</Text>
          </View>
        </View>

        {/* ── Bugünün İlaçları ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Bugünün İlaçları"
            onPress={() => setCurrentScreen('MEDICATIONS')}
          />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {todayDoses.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="check-circle" size={32} color={colors.success} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Bugün için ilaç kaydı yok.
                </Text>
              </View>
            ) : (
              todayDoses.map((dose, idx) => (
                <DoseRow
                  key={dose.id}
                  dose={dose}
                  medication={medMap[dose.medicationId]}
                  onMark={markDose}
                />
              ))
            )}
          </View>
        </View>

        {/* ── Aktif Tedaviler ── */}
        {activeTreatments.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Aktif Tedaviler"
              onPress={() => setCurrentScreen('MEDICAL_HISTORY')}
            />
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {activeTreatments.map((item, idx) => (
                <View
                  key={item.record.id}
                  style={[
                    treatStyles.row,
                    idx < activeTreatments.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={[treatStyles.typeDot, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons
                      name={item.record.type === 'CHRONIC' ? 'pulse-outline' : 'medkit-outline'}
                      size={14}
                      color={colors.primary}
                    />
                  </View>
                  <View style={treatStyles.info}>
                    <Text style={[treatStyles.diseaseName, { color: colors.textPrimary }]}>
                      {item.record.title}
                    </Text>
                    {item.meds.length > 0 && (
                      <Text style={[treatStyles.medNames, { color: colors.textSecondary }]}>
                        {item.meds.map(m => m.name).join(' · ')}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Yaklaşan Randevu ── */}
        {upcomingAppointment && (
          <View style={styles.section}>
            <SectionHeader
              title="Yaklaşan Randevu"
              onPress={() => setCurrentScreen('APPOINTMENTS')}
            />
            <TouchableOpacity
              style={[styles.card, aptStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setCurrentScreen('APPOINTMENTS')}
              activeOpacity={0.85}
            >
              <View style={[aptStyles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </View>
              <View style={aptStyles.info}>
                <Text style={[aptStyles.doctor, { color: colors.textPrimary }]}>
                  {upcomingAppointment.doctorName}
                </Text>
                <Text style={[aptStyles.dept, { color: colors.textSecondary }]}>
                  {upcomingAppointment.department} · {upcomingAppointment.hospital}
                </Text>
                <Text style={[aptStyles.date, { color: colors.primary }]}>{aptDateStr}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Son Tahlil ── */}
        {latestLabResult && (
          <View style={styles.section}>
            <SectionHeader
              title="Son Tahlil"
              onPress={() => setCurrentScreen('LAB_RESULTS')}
            />
            <TouchableOpacity
              style={[styles.card, aptStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                setSelectedLabResult(latestLabResult);
                setCurrentScreen('LAB_DETAIL');
              }}
              activeOpacity={0.85}
            >
              <View style={[aptStyles.iconBox, {
                backgroundColor: abnormalCount > 0
                  ? 'rgba(255,159,10,0.1)'
                  : 'rgba(48,209,88,0.1)',
              }]}>
                <Ionicons
                  name="flask-outline"
                  size={20}
                  color={abnormalCount > 0 ? colors.warning : colors.success}
                />
              </View>
              <View style={aptStyles.info}>
                <Text style={[aptStyles.doctor, { color: colors.textPrimary }]}>
                  {latestLabResult.title}
                </Text>
                <Text style={[aptStyles.dept, { color: colors.textSecondary }]}>
                  {latestLabResult.laboratory ?? 'Laboratuvar'}
                </Text>
                <Text style={[aptStyles.date, {
                  color: abnormalCount > 0 ? colors.warning : colors.success,
                }]}>
                  {labDateStr}
                  {abnormalCount > 0 ? ` · ${abnormalCount} dikkat çeken değer` : ' · Tüm değerler normal'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Hızlı İşlemler ── */}
        <View style={styles.section}>
          <SectionHeader title="Hızlı İşlemler" />
          <View style={styles.quickGrid}>
            {[
              { icon: 'medkit-outline', label: 'İlaç Ekle', screen: 'ADD_MEDICATION', color: colors.primary },
              { icon: 'document-text-outline', label: 'Tahlil Ekle', screen: 'ADD_LAB_RESULT', color: colors.success },
              { icon: 'calendar-outline', label: 'Randevu', screen: 'ADD_APPOINTMENT', color: '#BF5AF2' },
              { icon: 'time-outline', label: 'Geçmiş', screen: 'MEDICAL_HISTORY', color: colors.warning },
            ].map(item => (
              <TouchableOpacity
                key={item.screen}
                style={[quickStyles.btn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setCurrentScreen(item.screen as any)}
                activeOpacity={0.8}
              >
                <View style={[quickStyles.iconBox, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <Text style={[quickStyles.label, { color: colors.textPrimary }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  inner: { padding: spacing.xl, paddingBottom: 110 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: { ...typography.bodySmall, fontWeight: '500' } as any,
  userName: { ...typography.h2, fontWeight: '800', marginTop: 2 } as any,
  dateText: { ...typography.caption, marginTop: 4 } as any,
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 16, fontWeight: '800' },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  summaryNum: { ...typography.h2, fontWeight: '800' } as any,
  summaryLabel: { ...typography.caption, marginTop: 4, textAlign: 'center' } as any,
  section: { marginBottom: spacing.xl },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.body } as any,
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});

const treatStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  typeDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  diseaseName: { ...typography.button, fontWeight: '700' } as any,
  medNames: { ...typography.caption, marginTop: 2 } as any,
});

const aptStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.md },
  iconBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  doctor: { ...typography.button, fontWeight: '700' } as any,
  dept: { ...typography.caption, marginTop: 2 } as any,
  date: { ...typography.caption, fontWeight: '700', marginTop: 4 } as any,
});

const quickStyles = StyleSheet.create({
  btn: {
    width: (width - spacing.xl * 2 - spacing.md) / 2,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.caption, fontWeight: '700', textAlign: 'center' } as any,
});
