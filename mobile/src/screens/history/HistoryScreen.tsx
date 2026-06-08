import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAppStore } from '../../store/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';

interface HistoryScreenProps {
  onSelectItem: (item: any) => void;
}

export default function HistoryScreen({ onSelectItem }: HistoryScreenProps) {
  const { colors } = useTheme();
  const { scanHistory, setScanHistory } = useAppStore();

  const deleteItem = (id: string) => {
    setScanHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>Analiz Geçmişi</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Daha önce tarattığınız ilaçlar ve tahlil raporlarının geçmiş kayıtları.
        </Text>

        {scanHistory.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>📂</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Henüz taranmış bir ilaç veya laboratuvar raporu bulunmamaktadır.
            </Text>
          </View>
        ) : (
          scanHistory.map(item => {
            const isMed = item.type === 'MEDICINE';
            const severity = isMed 
              ? item.medData?.validation.severity 
              : item.labData?.validation.severity;

            const badgeColor = severity === 'HIGH_RISK'
              ? 'rgba(239, 68, 68, 0.12)'
              : severity === 'ATTENTION'
              ? 'rgba(245, 158, 11, 0.12)'
              : 'rgba(34, 197, 94, 0.12)';

            const badgeTextColor = severity === 'HIGH_RISK'
              ? '#EF4444'
              : severity === 'ATTENTION'
              ? '#F59E0B'
              : '#22C55E';

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardDate, { color: colors.textTertiary }]}>
                      {item.date}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                    <Text style={[styles.badgeText, { color: badgeTextColor }]}>
                      {severity || 'NORMAL'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.explanation, { color: colors.textSecondary }]} numberOfLines={2}>
                  {isMed ? item.medData?.aiExplanation : item.labData?.aiExplanation}
                </Text>

                <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => onSelectItem(item)}
                  >
                    <Text style={[styles.btnText, { color: colors.textPrimary }]}>Detayları Gör</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.deleteBtn]}
                    onPress={() => deleteItem(item.id)}
                  >
                    <Text style={styles.deleteBtnText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  title: {
    ...typography.h1,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    lineHeight: 18,
    marginBottom: spacing.xxl,
  },
  emptyCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  cardDate: {
    ...typography.caption,
    marginTop: 2,
  },
  badge: {
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '700',
  },
  explanation: {
    ...typography.bodySmall,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnText: {
    ...typography.buttonSmall,
    fontWeight: '700',
  },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteBtnText: {
    color: '#EF4444',
    ...typography.buttonSmall,
    fontWeight: '700',
  },
});
