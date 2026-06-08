import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius } from '../../../theme';
import { MedicalRecord, MedicalRecordType } from '../types';
import MedicalHistoryCard from '../cards/MedicalHistoryCard';
import { hapticService } from '../../heartRate/haptics/HapticService';

interface MedicalTimelineContainerProps {
  records: MedicalRecord[];
  onRemoveRecord: (id: string) => void;
}

type FilterType = 'ALL' | MedicalRecordType;

export default function MedicalTimelineContainer({ records, onRemoveRecord }: MedicalTimelineContainerProps) {
  const { colors, isDarkMode } = useTheme();
  
  // States for dynamic search & filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  // Trigger search filter algorithm
  const filteredRecords = records
    .filter(rec => {
      // 1. Search Query Match (Title, notes or medications)
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        rec.title.toLowerCase().includes(query) ||
        rec.notes.toLowerCase().includes(query) ||
        rec.medications.some(m => m.toLowerCase().includes(query));

      // 2. Category Tab Match
      const matchesFilter = activeFilter === 'ALL' || rec.type === activeFilter;

      return matchesSearch && matchesFilter;
    })
    // Chronological order: newest registry on top (optimistic updates first!)
    .sort((a, b) => b.id.localeCompare(a.id));

  return (
    <View style={styles.container}>
      
      {/* Interactive Search Bar Widget */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Medikal kayıtlarında, ilaçlarında veya tanılarda ara..."
          placeholderTextColor={colors.textTertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Advanced filter capsule row */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {(['ALL', 'DIAGNOSIS', 'SURGERY', 'ALLERGY', 'CHECKUP'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterCapsule,
              { backgroundColor: colors.surface, borderColor: colors.border },
              activeFilter === filter && { backgroundColor: filter === 'DIAGNOSIS' ? '#FF3B30' : filter === 'SURGERY' ? '#14B8A6' : filter === 'ALLERGY' ? '#EF4444' : filter === 'CHECKUP' ? '#3B82F6' : '#22C55E', borderColor: 'transparent' }
            ]}
            onPress={() => {
              hapticService.triggerHeartbeat();
              setActiveFilter(filter);
            }}
          >
            <Text style={[
              styles.filterCapsuleText,
              { color: colors.textPrimary },
              activeFilter === filter && { color: '#FFF', fontWeight: '800' }
            ]}>
              {filter === 'ALL' ? 'Tümü' : filter === 'DIAGNOSIS' ? 'Hastalıklar' : filter === 'SURGERY' ? 'Ameliyatlar' : filter === 'ALLERGY' ? 'Alerjiler' : 'Kontroller'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dynamic Render Queue */}
      <View style={styles.listContainer}>
        {filteredRecords.map((record) => (
          <MedicalHistoryCard
            key={record.id}
            record={record}
            onRemove={onRemoveRecord}
          />
        ))}

        {/* Empty state hud */}
        {filteredRecords.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="documents-outline" size={32} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Kriterlere uygun tıbbi kayıt bulunamadı.
            </Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
              Yukarıdaki medikal editör formunu doldurarak yeni kayıt ekleyebilirsiniz.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  filterScroll: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  filterCapsule: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 0.8,
  },
  filterCapsuleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  listContainer: {
    marginTop: spacing.xs,
  },
  emptyCard: {
    padding: spacing.xxl,
    borderRadius: radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
});
