import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius, typography } from '../../../theme';
import { HeartRateRecord } from '../types';
import { HeartRateHistoryService } from '../services/HeartRateHistoryService';
import PulseTrendChart from '../charts/PulseTrendChart';

interface HeartRateDetailModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function HeartRateDetailModal({ visible, onClose }: HeartRateDetailModalProps) {
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HeartRateRecord[]>([]);

  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await HeartRateHistoryService.getHistory();
    // Simulate premium medical skeleton loader latency
    setTimeout(() => {
      setHistory(data);
      setLoading(false);
    }, 450);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Navigation Bar */}
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Kalp Raporu Analizi</Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.skeletonContainer}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={[styles.skeletonText, { color: colors.textSecondary }]}>Klinik Nabız Verileri Yükleniyor...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollInner}
          >
            {/* Dynamic Trend analysis */}
            <View style={[styles.trendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.trendRow}>
                <Ionicons name="pulse" size={28} color="#FF3B30" />
                <View>
                  <Text style={[styles.trendLabel, { color: colors.textSecondary }]}>Son Ölçüm Ortalama</Text>
                  <Text style={[styles.trendVal, { color: colors.textPrimary }]}>
                    {history[0]?.bpm || '--'} <Text style={styles.trendUnit}>BPM</Text>
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Text style={styles.badgeText}>NORMAL</Text>
                </View>
              </View>
            </View>

            {/* Sparkline curve */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Nabız Seyri (Son 5 Gün)</Text>
            <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <PulseTrendChart data={history} />
            </View>

            {/* List entries */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ölçüm Geçmişi</Text>
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="heart-dislike-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>Henüz nabız geçmişi yok.</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {history.slice(0, 5).map((record) => (
                  <View key={record.id} style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.listLeft}>
                      <View style={[styles.listItemIcon, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                        <Ionicons name="heart" size={16} color="#FF3B30" />
                      </View>
                      <View>
                        <Text style={[styles.listDate, { color: colors.textPrimary }]}>{record.dateString}</Text>
                        <Text style={[styles.listTime, { color: colors.textTertiary }]}>{record.timeString} • Kalite: %{record.qualityScore}</Text>
                      </View>
                    </View>
                    <View style={styles.listRight}>
                      <Text style={[styles.listBpm, { color: colors.textPrimary }]}>{record.bpm} <Text style={styles.listBpmUnit}>BPM</Text></Text>
                      <View style={[
                        styles.miniBadge, 
                        { backgroundColor: record.trend === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }
                      ]}>
                        <Text style={[
                          styles.miniBadgeText, 
                          { color: record.trend === 'HIGH' ? '#EF4444' : '#22C55E' }
                        ]}>{record.trend}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* FDA Wellness Disclaimer */}
            <View style={[styles.disclaimerBox, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="information-circle" size={18} color={colors.textSecondary} />
              <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                Bu özellik wellness ve fitness amaçlıdır. Tıbbi teşhis, tedavi veya profesyonel klinik karar süreçleri amacıyla kullanılmaz.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  navTitle: {
    ...typography.h3,
    fontWeight: '800',
  },
  closeIcon: {
    padding: 6,
    borderRadius: radius.pill,
  },
  skeletonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  skeletonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  scrollInner: {
    padding: spacing.xl,
    paddingBottom: 60,
  },
  trendCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendLabel: {
    ...typography.labelSmall,
    fontSize: 10,
  },
  trendVal: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  trendUnit: {
    ...typography.caption,
    fontSize: 14,
  },
  badge: {
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  chartContainer: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
  },
  listContainer: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  listItem: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listItemIcon: {
    padding: 8,
    borderRadius: radius.lg,
  },
  listDate: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  listTime: {
    fontSize: 11,
    marginTop: 2,
  },
  listRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  listBpm: {
    fontSize: 17,
    fontWeight: '800',
  },
  listBpmUnit: {
    fontSize: 10,
    fontWeight: '500',
  },
  miniBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
  },
  miniBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  disclaimerBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    ...typography.caption,
    lineHeight: 16,
  },
});
