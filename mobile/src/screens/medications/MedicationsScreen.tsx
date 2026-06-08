import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Modal, Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { useDoseAnalytics, DayData } from '../../hooks/useDoseAnalytics';
import { Medication, DoseRecord } from '../../types';

const { width } = Dimensions.get('window');
const DAY_CELL = Math.floor((width - spacing.xl * 2 - spacing.md * 6) / 7);

type Tab = 'TODAY' | 'CALENDAR' | 'ANALYTICS' | 'ACTIVE';

// ─────────────────────────────────────────
// Status color map
// ─────────────────────────────────────────
function dayStatusColor(status: DayData['status'], colors: any): { bg: string; text: string } {
  switch (status) {
    case 'ALL_TAKEN': return { bg: colors.success,  text: '#FFF' };
    case 'PARTIAL':   return { bg: colors.warning,  text: '#FFF' };
    case 'MISSED':    return { bg: colors.error,    text: '#FFF' };
    case 'PLANNED':   return { bg: colors.primary,  text: '#FFF' };
    default:          return { bg: colors.surfaceSecondary, text: colors.textTertiary };
  }
}

// ─────────────────────────────────────────
// Snooze modal
// ─────────────────────────────────────────
function SnoozeModal({ visible, onClose, onSnooze }: {
  visible: boolean;
  onClose: () => void;
  onSnooze: (min: 15 | 30 | 60) => void;
}) {
  const { colors } = useTheme();
  const opts: { label: string; min: 15 | 30 | 60 }[] = [
    { label: '15 dakika sonra', min: 15 },
    { label: '30 dakika sonra', min: 30 },
    { label: '1 saat sonra',    min: 60 },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sm.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[sm.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[sm.title, { color: colors.textPrimary }]}>Erteleme Süresi</Text>
          {opts.map(o => (
            <TouchableOpacity
              key={o.min}
              style={[sm.row, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => onSnooze(o.min)}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[sm.rowText, { color: colors.textPrimary }]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const sm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.xxl, paddingBottom: 40 },
  title: { ...typography.h3, fontWeight: '700', marginBottom: spacing.lg } as any,
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, marginBottom: spacing.md },
  rowText: { ...typography.button, fontWeight: '600' } as any,
});

// ─────────────────────────────────────────
// Day detail modal
// ─────────────────────────────────────────
function DayDetailModal({ day, visible, onClose, medications }: {
  day: DayData | null;
  visible: boolean;
  onClose: () => void;
  medications: Medication[];
}) {
  const { colors } = useTheme();
  if (!day) return null;

  const medMap: Record<string, Medication> = {};
  medications.forEach(m => { medMap[m.id] = m; });

  const sorted = [...day.doses].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sm.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[sm.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[sm.title, { color: colors.textPrimary }]}>{day.date}</Text>
          {sorted.map(dose => {
            const med = medMap[dose.medicationId];
            const isTaken = dose.status === 'TAKEN';
            return (
              <View key={dose.id} style={[ddm.row, { borderBottomColor: colors.border }]}>
                <View style={[ddm.dot, { backgroundColor: med?.color ?? colors.primary }]} />
                <View style={ddm.info}>
                  <Text style={[ddm.time, { color: colors.textSecondary }]}>{dose.scheduledTime}</Text>
                  <Text style={[ddm.name, { color: colors.textPrimary }]}>{dose.medicationName}</Text>
                  {isTaken && dose.takenAt && (
                    <Text style={[ddm.sub, { color: colors.textTertiary }]}>
                      Alındı: {new Date(dose.takenAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name={isTaken ? 'checkmark-circle' : 'close-circle'}
                  size={22}
                  color={isTaken ? colors.success : colors.error}
                />
              </View>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const ddm = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  info: { flex: 1 },
  time: { ...typography.caption } as any,
  name: { ...typography.button, fontWeight: '600' } as any,
  sub: { ...typography.caption } as any,
});

// ─────────────────────────────────────────
// TODAY TAB — dose list with take/snooze
// ─────────────────────────────────────────
function TodayTab() {
  const { colors } = useTheme();
  const { todayDoses, medications, markDose } = useAppStore();
  const [snoozeTarget, setSnoozeTarget] = useState<DoseRecord | null>(null);

  const medMap = useMemo(() => {
    const m: Record<string, Medication> = {};
    medications.forEach(med => { m[med.id] = med; });
    return m;
  }, [medications]);

  const taken = todayDoses.filter(d => d.status === 'TAKEN').length;
  const total = todayDoses.length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

  return (
    <View>
      {/* Progress bar */}
      <View style={[tt.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={tt.progressRow}>
          <View>
            <Text style={[tt.progressLabel, { color: colors.textSecondary }]}>Bugünkü İlaçlar</Text>
            <Text style={[tt.progressFig, { color: colors.textPrimary }]}>
              {taken} / {total} <Text style={{ color: colors.textTertiary, fontSize: 14 }}>doz alındı</Text>
            </Text>
          </View>
          <Text style={[tt.progressPct, { color: pct >= 80 ? colors.success : colors.warning }]}>%{pct}</Text>
        </View>
        <View style={[tt.track, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={[tt.fill, { width: `${pct}%`, backgroundColor: pct >= 80 ? colors.success : colors.warning }]} />
        </View>
      </View>

      {/* Dose list */}
      <View style={[tt.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {todayDoses.length === 0 ? (
          <View style={tt.empty}>
            <Text style={[{ color: colors.textSecondary }]}>Bugün için planlı ilaç yok.</Text>
          </View>
        ) : (
          todayDoses.map((dose, idx) => {
            const med = medMap[dose.medicationId];
            const isPending = dose.status === 'PENDING';
            const isTaken  = dose.status === 'TAKEN';
            const isMissed = dose.status === 'MISSED';

            return (
              <View
                key={dose.id}
                style={[tt.doseRow, { borderBottomColor: colors.border }, idx === todayDoses.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={[tt.dot, { backgroundColor: med?.color ?? colors.primary }]} />
                <View style={tt.doseInfo}>
                  <Text style={[tt.doseName, { color: colors.textPrimary }]}>{dose.medicationName}</Text>
                  <Text style={[tt.doseTime, { color: colors.textSecondary }]}>
                    {dose.scheduledTime}
                    {isTaken && dose.takenAt && (
                      <Text style={{ color: colors.textTertiary }}>
                        {' · Alındı: '}
                        {new Date(dose.takenAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </Text>
                </View>

                {isTaken && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
                {isMissed && <Ionicons name="close-circle" size={22} color={colors.error} />}

                {isPending && (
                  <View style={tt.actions}>
                    <TouchableOpacity
                      style={[tt.takeBtn, { backgroundColor: colors.primary }]}
                      onPress={() => markDose(dose.id, 'TAKEN')}
                    >
                      <Feather name="check" size={14} color="#FFF" />
                      <Text style={tt.takeBtnText}>İçtim</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[tt.snoozeBtn, { borderColor: colors.border }]}
                      onPress={() => setSnoozeTarget(dose)}
                    >
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      <SnoozeModal
        visible={!!snoozeTarget}
        onClose={() => setSnoozeTarget(null)}
        onSnooze={(min) => {
          Alert.alert('Ertelendi', `${snoozeTarget?.medicationName} ilacı ${min} dakika sonra hatırlatılacak.`);
          setSnoozeTarget(null);
        }}
      />
    </View>
  );
}
const tt = StyleSheet.create({
  progressCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl, marginBottom: spacing.lg },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  progressLabel: { ...typography.caption } as any,
  progressFig: { ...typography.h3, fontWeight: '800', marginTop: 2 } as any,
  progressPct: { ...typography.h1, fontWeight: '900' } as any,
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  card: { borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing.lg, overflow: 'hidden', marginBottom: spacing.lg },
  doseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  doseInfo: { flex: 1 },
  doseName: { ...typography.button, fontWeight: '600' } as any,
  doseTime: { ...typography.caption, marginTop: 2 } as any,
  actions: { flexDirection: 'row', gap: spacing.sm },
  takeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  takeBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  snoozeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
});

// ─────────────────────────────────────────
// CALENDAR TAB
// ─────────────────────────────────────────
function CalendarTab() {
  const { colors } = useTheme();
  const { doseRecords, medications } = useAppStore();
  const { calendarDays } = useDoseAnalytics(doseRecords);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const weeks: DayData[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const legend = [
    { label: 'Tümü alındı', color: colors.success },
    { label: 'Kısmi',       color: colors.warning },
    { label: 'Atlandı',     color: colors.error },
    { label: 'Planlandı',   color: colors.primary },
  ];

  return (
    <View>
      {/* Legend */}
      <View style={cal.legendRow}>
        {legend.map(l => (
          <View key={l.label} style={cal.legendItem}>
            <View style={[cal.legendDot, { backgroundColor: l.color }]} />
            <Text style={[cal.legendText, { color: colors.textSecondary }]}>{l.label}</Text>
          </View>
        ))}
      </View>

      {/* Week header */}
      <View style={cal.weekHeader}>
        {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(d => (
          <Text key={d} style={[cal.weekDay, { color: colors.textTertiary, width: DAY_CELL }]}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={[cal.grid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {weeks.map((week, wi) => (
          <View key={wi} style={cal.weekRow}>
            {week.map(day => {
              const sc = dayStatusColor(day.status, colors);
              const dayNum = parseInt(day.date.split('-')[2], 10);
              return (
                <TouchableOpacity
                  key={day.date}
                  style={[cal.cell, { width: DAY_CELL, height: DAY_CELL, backgroundColor: sc.bg }]}
                  onPress={() => day.doses.length > 0 && setSelectedDay(day)}
                  activeOpacity={0.75}
                >
                  <Text style={[cal.cellText, { color: sc.text }]}>{dayNum}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <DayDetailModal
        day={selectedDay}
        visible={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        medications={medications}
      />
    </View>
  );
}
const cal = StyleSheet.create({
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption } as any,
  weekHeader: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDay: { textAlign: 'center', ...typography.caption, fontWeight: '700' } as any,
  grid: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.lg, padding: spacing.sm, gap: spacing.xs },
  weekRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  cell: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 11, fontWeight: '700' },
});

// ─────────────────────────────────────────
// ANALYTICS TAB
// ─────────────────────────────────────────
function AnalyticsTab() {
  const { colors } = useTheme();
  const { doseRecords } = useAppStore();
  const { monthlyStats, aiInsights } = useDoseAnalytics(doseRecords);
  const { complianceRate, takenDoses, missedDoses, avgDelayMinutes, streakDays, worstTimeSlot } = monthlyStats;

  const statCards = [
    { label: 'Bu Ay Uyum', value: `%${complianceRate}`, color: complianceRate >= 80 ? colors.success : colors.warning, icon: 'trending-up' },
    { label: 'Alınan Doz', value: `${takenDoses}`, color: colors.primary, icon: 'checkmark-circle-outline' },
    { label: 'Atlanan Doz', value: `${missedDoses}`, color: missedDoses === 0 ? colors.success : colors.error, icon: 'close-circle-outline' },
    { label: 'Ort. Gecikme', value: `${avgDelayMinutes} dk`, color: colors.textSecondary, icon: 'time-outline' },
    { label: 'Seri (gün)', value: `${streakDays}`, color: '#BF5AF2', icon: 'flame-outline' },
    { label: 'Zor Saat', value: worstTimeSlot ?? '—', color: colors.warning, icon: 'alert-circle-outline' },
  ];

  return (
    <View>
      {/* Stat grid */}
      <View style={an.grid}>
        {statCards.map(s => (
          <View key={s.label} style={[an.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name={s.icon as any} size={18} color={s.color} />
            <Text style={[an.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={[an.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* AI insights */}
      <View style={[an.aiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={an.aiHeader}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={[an.aiTitle, { color: colors.textPrimary }]}>MedTech AI Analizi</Text>
        </View>
        {aiInsights.map((insight, i) => (
          <View key={i} style={[an.insightRow, { borderBottomColor: colors.border }, i === aiInsights.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[an.bullet, { backgroundColor: i === aiInsights.length - 1 ? colors.surfaceSecondary : `${colors.primary}22` }]} />
            <Text style={[an.insightText, { color: i === aiInsights.length - 1 ? colors.textTertiary : colors.textPrimary }]}>
              {insight}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const an = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    width: (width - spacing.xl * 2 - spacing.md * 2) / 3,
    borderRadius: radius.xl, borderWidth: 1,
    padding: spacing.md, alignItems: 'center', gap: 4,
  },
  statVal: { ...typography.h3, fontWeight: '800' } as any,
  statLabel: { ...typography.caption, textAlign: 'center' } as any,
  aiCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl, marginBottom: spacing.lg },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  aiTitle: { ...typography.button, fontWeight: '700' } as any,
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  insightText: { ...typography.bodySmall, flex: 1, lineHeight: 20 } as any,
});

// ─────────────────────────────────────────
// ACTIVE MEDICATIONS TAB
// ─────────────────────────────────────────
function ActiveTab() {
  const { colors } = useTheme();
  const { medications, setCurrentScreen, setSelectedMedication } = useAppStore();
  const [subTab, setSubTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');

  const filtered = medications.filter(m => subTab === 'ACTIVE' ? m.isActive : !m.isActive);

  return (
    <View>
      {/* Sub-tab selector */}
      <View style={at.subTabSelector}>
        <TouchableOpacity
          style={[at.subTabBtn, subTab === 'ACTIVE' && { backgroundColor: colors.primary }]}
          onPress={() => setSubTab('ACTIVE')}
        >
          <Text style={[at.subTabLabel, { color: subTab === 'ACTIVE' ? '#FFF' : colors.textSecondary }]}>
            Aktif Tedaviler ({medications.filter(m => m.isActive).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[at.subTabBtn, subTab === 'COMPLETED' && { backgroundColor: colors.primary }]}
          onPress={() => setSubTab('COMPLETED')}
        >
          <Text style={[at.subTabLabel, { color: subTab === 'COMPLETED' ? '#FFF' : colors.textSecondary }]}>
            Tamamlananlar ({medications.filter(m => !m.isActive).length})
          </Text>
        </TouchableOpacity>
      </View>

      {filtered.map(med => (
        <TouchableOpacity
          key={med.id}
          style={[at.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => { setSelectedMedication(med); setCurrentScreen('MEDICATION_DETAIL'); }}
          activeOpacity={0.85}
        >
          <View style={[at.bar, { backgroundColor: med.color }]} />
          <View style={at.body}>
            <View style={at.topRow}>
              <Text style={[at.name, { color: colors.textPrimary }]}>{med.name}</Text>
              <Text style={[at.strength, { color: colors.textSecondary }]}>{med.strength}</Text>
            </View>
            <Text style={[at.generic, { color: colors.textSecondary }]}>{med.genericName}</Text>
            <View style={at.chips}>
              <View style={[at.chip, { backgroundColor: `${med.color}18` }]}>
                <Text style={[at.chipText, { color: med.color }]}>{med.dosageForm}</Text>
              </View>
              {med.times.map(t => (
                <View key={t} style={[at.chip, { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name="time-outline" size={10} color={colors.textTertiary} />
                  <Text style={[at.chipText, { color: colors.textSecondary }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}

      {filtered.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ color: colors.textSecondary }}>
            {subTab === 'ACTIVE' ? 'Aktif tedavi bulunamadı.' : 'Tamamlanmış tedavi bulunamadı.'}
          </Text>
        </View>
      )}
    </View>
  );
}
const at = StyleSheet.create({
  subTabSelector: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: radius.pill, padding: 4, marginBottom: spacing.lg },
  subTabBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center' },
  subTabLabel: { fontSize: 11, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.xl, borderWidth: 1, marginBottom: spacing.md, overflow: 'hidden' },
  bar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { ...typography.button, fontWeight: '700', flex: 1 } as any,
  strength: { ...typography.caption, fontWeight: '600' } as any,
  generic: { ...typography.caption, marginTop: 2 } as any,
  chips: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill },
  chipText: { fontSize: 10, fontWeight: '700' },
});

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function MedicationsScreen() {
  const { colors } = useTheme();
  const { setCurrentScreen } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('TODAY');

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'TODAY',     label: 'Bugün',    icon: 'today-outline' },
    { key: 'CALENDAR',  label: 'Takvim',   icon: 'calendar-outline' },
    { key: 'ANALYTICS', label: 'Analitik', icon: 'bar-chart-outline' },
    { key: 'ACTIVE',    label: 'İlaçlar',  icon: 'medkit-outline' },
  ];

  return (
    <View style={[ms.container, { backgroundColor: colors.background }]}>
      {/* Tab bar */}
      <View style={[ms.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[ms.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={16} color={active ? colors.primary : colors.textTertiary} />
              <Text style={[ms.tabLabel, { color: active ? colors.primary : colors.textTertiary, fontWeight: active ? '700' : '500' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={ms.scroll} contentContainerStyle={ms.inner} showsVerticalScrollIndicator={false}>
        {activeTab === 'TODAY'     && <TodayTab />}
        {activeTab === 'CALENDAR'  && <CalendarTab />}
        {activeTab === 'ANALYTICS' && <AnalyticsTab />}
        {activeTab === 'ACTIVE'    && <ActiveTab />}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[ms.fab, { backgroundColor: colors.primary }]}
        onPress={() => setCurrentScreen('ADD_MEDICATION')}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const ms = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 3 },
  tabLabel: { fontSize: 10 },
  scroll: { flex: 1 },
  inner: { padding: spacing.xl, paddingBottom: 110 },
  fab: {
    position: 'absolute', bottom: 24, right: spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
});
