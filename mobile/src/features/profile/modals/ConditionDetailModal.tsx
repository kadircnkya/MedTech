import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius, typography } from '../../../theme';
import { MedicalCondition } from '../types';

interface ConditionDetailModalProps {
  visible: boolean;
  condition: MedicalCondition | null;
  onClose: () => void;
}

export default function ConditionDetailModal({
  visible,
  condition,
  onClose,
}: ConditionDetailModalProps) {
  const { colors } = useTheme();

  if (!condition) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.heartDot, { backgroundColor: '#FF3B30' }]} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>{condition.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="close" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Clinical Fields */}
          <View style={styles.content}>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Başlangıç Tarihi:</Text>
              <Text style={[styles.fieldVal, { color: colors.textPrimary }]}>{condition.onset}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tedavi Durumu:</Text>
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Text style={styles.statusText}>{condition.status}</Text>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sorumlu Hekim:</Text>
              <Text style={[styles.fieldVal, { color: colors.textPrimary }]}>{condition.doctorName}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Son Kontrol:</Text>
              <Text style={[styles.fieldVal, { color: colors.textPrimary }]}>{condition.lastCheckup}</Text>
            </View>

            {/* Pain / Complaint level gauge */}
            <View style={styles.gaugeContainer}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                Şikayet / Ağrı Seviyesi: <Text style={{ color: '#FF3B30', fontWeight: '800' }}>{condition.complaintLevel}/10</Text>
              </Text>
              <View style={[styles.gaugeBg, { backgroundColor: colors.surfaceSecondary }]}>
                <View style={[styles.gaugeFill, { width: `${condition.complaintLevel * 10}%`, backgroundColor: '#FF3B30' }]} />
              </View>
            </View>

            <Text style={[styles.sectionSubtitle, { color: colors.textPrimary }]}>Aktif İlaç Tedavisi</Text>
            <View style={styles.medsRow}>
              {condition.medications.map((med, idx) => (
                <View key={idx} style={[styles.medBadge, { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name="medical" size={10} color={colors.primary} />
                  <Text style={[styles.medText, { color: colors.textPrimary }]}>{med}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionSubtitle, { color: colors.textPrimary }]}>Hekim Klinik Notları</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary, backgroundColor: colors.surfaceSecondary }]}>
              "{condition.notes}"
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    borderRadius: radius.xxl,
    borderWidth: 1,
    padding: spacing.xl,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    ...typography.h3,
    fontWeight: '800',
  },
  closeIcon: {
    padding: 5,
    borderRadius: radius.pill,
  },
  content: {
    gap: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statusText: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '800',
  },
  gaugeContainer: {
    marginTop: spacing.xs,
  },
  gaugeBg: {
    height: 6,
    borderRadius: radius.pill,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  medsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  medBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
  medText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
    padding: spacing.md,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
});
