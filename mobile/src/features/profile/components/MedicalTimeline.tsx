import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius, typography } from '../../../theme';
import { MedicalTimelineItem } from '../types';

interface MedicalTimelineProps {
  timeline: MedicalTimelineItem[];
}

export default function MedicalTimeline({ timeline }: MedicalTimelineProps) {
  const { colors, isDarkMode } = useTheme();

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'DIAGNOSIS': return { name: 'pulse', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.1)' };
      case 'SURGERY': return { name: 'medkit', color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.1)' };
      case 'ALLERGY': return { name: 'shield-alert', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
      default: return { name: 'calendar', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' };
    }
  };

  return (
    <View style={styles.container}>
      {timeline.map((item, index) => {
        const meta = getTimelineIcon(item.type);
        const isLast = index === timeline.length - 1;

        return (
          <View key={item.id} style={styles.timelineRow}>
            {/* Left line & point */}
            <View style={styles.timelineLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.name as any} size={15} color={meta.color} />
              </View>
              {!isLast && <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />}
            </View>

            {/* Right card */}
            <View style={[styles.timelineRight, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.headerRow}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.date, { color: colors.textTertiary }]}>{item.date}</Text>
              </View>
              <Text style={[styles.desc, { color: colors.textSecondary }]}>{item.description}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginTop: spacing.xs,
    marginBottom: -spacing.md,
    zIndex: 1,
  },
  timelineRight: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  title: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  date: {
    fontSize: 9,
    fontWeight: '600',
  },
  desc: {
    fontSize: 11,
    lineHeight: 16,
  },
});
