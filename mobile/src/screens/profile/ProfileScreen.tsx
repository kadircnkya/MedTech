import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useAppStore } from '../../store/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, isDarkMode, toggleTheme, setCurrentScreen } = useAppStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar Card */}
        <View style={[styles.avatarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.avatarEmoji}>{user.avatar}</Text>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user.email}
          </Text>
        </View>

        {/* Physical Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Boy</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{user.height} cm</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Kilo</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{user.weight} kg</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Yaş</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{user.age}</Text>
          </View>
        </View>

        {/* Clinical Info List */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Klinik Bilgiler</Text>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Kan Grubu</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user.bloodType}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Kronik Rahatsızlıklar</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {user.diseases.join(', ') || 'Yok'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Alerjiler</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {user.allergies.join(', ') || 'Yok'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Kullanılan İlaçlar</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {user.medications.join(', ') || 'Yok'}
            </Text>
          </View>
        </View>

        {/* Preferences / Options */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ayarlar & Güvenlik</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.switchRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Karanlık Mod (Dark Mode)</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setCurrentScreen('WELCOME')}
          >
            <Text style={[styles.logoutText]}>Oturumu Kapat</Text>
          </TouchableOpacity>
        </View>
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
  avatarCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  userName: {
    ...typography.h1,
    fontWeight: '800',
  },
  userEmail: {
    ...typography.bodySmall,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statLabel: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  statValue: {
    ...typography.h2,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '800',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  infoLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  infoValue: {
    ...typography.bodySmall,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  actionRow: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    marginTop: spacing.sm,
  },
  logoutText: {
    color: '#EF4444',
    ...typography.buttonSmall,
    fontWeight: '700',
  },
});
