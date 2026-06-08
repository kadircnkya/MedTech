import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius, typography } from '../../../theme';
import { MedicalRecord } from '../types';
import { hapticService } from '../../heartRate/haptics/HapticService';

interface MedicalHistoryCardProps {
  record: MedicalRecord;
  onRemove?: (id: string) => void;
}

export default function MedicalHistoryCard({ record, onRemove }: MedicalHistoryCardProps) {
  const { colors, isDarkMode } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleExpand = () => {
    hapticService.triggerHeartbeat();
    setExpanded(!expanded);
    Animated.timing(animation, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const getRecordTheme = () => {
    switch (record.type) {
      case 'DIAGNOSIS':
        return { color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.08)', icon: 'pulse' };
      case 'SURGERY':
        return { color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.08)', icon: 'medkit' };
      case 'ALLERGY':
        return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)', icon: 'warning' };
      case 'CHECKUP':
        return { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)', icon: 'calendar' };
    }
  };

  const theme = getRecordTheme();

  // Interpolate dynamic height & opacity
  const detailsOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Main Row */}
      <TouchableOpacity 
        style={styles.cardHeader} 
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: theme.bg }]}>
          <Ionicons name={theme.icon as any} size={18} color={theme.color} />
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]} numberOfLines={1}>
            {record.title}
          </Text>
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            {record.date} • {record.hospital}
          </Text>
        </View>

        <View style={styles.rightCol}>
          <View style={[
            styles.statusBadge, 
            { 
              backgroundColor: record.status === 'AKTiF' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              borderColor: record.status === 'AKTiF' ? '#EF4444' : '#22C55E' 
            }
          ]}>
            <Text style={[
              styles.statusText, 
              { color: record.status === 'AKTiF' ? '#EF4444' : '#22C55E' }
            ]}>
              {record.status}
            </Text>
          </View>
          <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={14} 
            color={colors.textTertiary} 
            style={{ marginTop: 4 }}
          />
        </View>
      </TouchableOpacity>

      {/* Rhythmic Complaint/Severity Scale Bar (Visual indicator) */}
      {record.complaintLevel > 0 && (
        <View style={styles.severityContainer}>
          <View style={styles.severityBarRow}>
            <Text style={styles.severityLabel}>ŞİKAYET SEVİYESİ</Text>
            <Text style={[styles.severityVal, { color: theme.color }]}>{record.complaintLevel}/10</Text>
          </View>
          <View style={[styles.severityTrack, { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
            <View 
              style={[
                styles.severityFill, 
                { 
                  width: `${record.complaintLevel * 10}%`, 
                  backgroundColor: theme.color,
                  shadowColor: theme.color,
                }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Expanded Sub-details */}
      {expanded && (
        <Animated.View style={[styles.detailsBox, { opacity: detailsOpacity }]}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Doctor Notes */}
          {record.notes && (
            <View style={styles.detailSegment}>
              <Text style={[styles.segmentLabel, { color: colors.textSecondary }]}>HEKİM TANI & RAPOR NOTU</Text>
              <Text style={[styles.segmentBody, { color: colors.textPrimary }]}>{record.notes}</Text>
            </View>
          )}

          {/* Medications list */}
          {record.medications && record.medications.length > 0 && (
            <View style={styles.detailSegment}>
              <Text style={[styles.segmentLabel, { color: colors.textSecondary }]}>AKTİF REÇETE & İLAÇLAR</Text>
              <View style={styles.medsRow}>
                {record.medications.map((med, idx) => (
                  <View key={idx} style={[styles.medBadge, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}>
                    <Ionicons name="medical" size={9} color="#FF7A00" />
                    <Text style={[styles.medText, { color: colors.textPrimary }]}>{med}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Treatment plan */}
          {record.treatmentPlan && (
            <View style={styles.detailSegment}>
              <Text style={[styles.segmentLabel, { color: colors.textSecondary }]}>TEDAVİ SÜRECİ & PLAN</Text>
              <Text style={[styles.segmentBody, { color: colors.textPrimary }]}>{record.treatmentPlan}</Text>
            </View>
          )}

          {/* Diagnostic Reports and Docs */}
          {record.reports && record.reports.length > 0 && (
            <View style={styles.detailSegment}>
              <Text style={[styles.segmentLabel, { color: colors.textSecondary }]}>KAYITLI TIBBİ RAPORLAR & LAB</Text>
              <View style={styles.medsRow}>
                {record.reports.map((rep, idx) => (
                  <View key={idx} style={[styles.reportBadge, { backgroundColor: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.2)' }]}>
                    <Ionicons name="document-text" size={10} color="#06B6D4" />
                    <Text style={styles.reportText}>{rep}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Remove / Delete record row */}
          {onRemove && (
            <TouchableOpacity 
              style={styles.deleteBtn}
              onPress={() => onRemove(record.id)}
            >
              <Ionicons name="trash-outline" size={14} color="#EF4444" />
              <Text style={styles.deleteText}>Kayıt Defterinden Kaldır</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dateText: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderWidth: 0.5,
  },
  statusText: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  severityContainer: {
    marginTop: spacing.md,
  },
  severityBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  severityLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  severityVal: {
    fontSize: 8,
    fontWeight: '900',
  },
  severityTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  severityFill: {
    height: '100%',
    borderRadius: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  detailsBox: {
    marginTop: spacing.md,
  },
  divider: {
    height: 0.5,
    width: '100%',
    marginBottom: spacing.md,
  },
  detailSegment: {
    marginBottom: spacing.md,
  },
  segmentLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  segmentBody: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  medsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  medBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderWidth: 0.5,
  },
  medText: {
    fontSize: 9,
    fontWeight: '700',
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderWidth: 0.5,
  },
  reportText: {
    color: '#06B6D4',
    fontSize: 9,
    fontWeight: '800',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
});
