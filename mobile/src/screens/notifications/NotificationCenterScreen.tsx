import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { NotificationLog } from '../../types';

export default function NotificationCenterScreen() {
  const { colors } = useTheme();
  const {
    notifications,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setCurrentScreen,
  } = useAppStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const groups = useMemo(() => {
    const map: Record<string, NotificationLog[]> = {
      'Bugün': [],
      'Dün': [],
      'Önceki Günler': []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    notifications.forEach(n => {
      const d = new Date(n.sentAt);
      d.setHours(0, 0, 0, 0);

      if (d.getTime() === today.getTime()) {
        map['Bugün'].push(n);
      } else if (d.getTime() === yesterday.getTime()) {
        map['Dün'].push(n);
      } else {
        map['Önceki Günler'].push(n);
      }
    });

    return [
      { title: 'Bugün', data: map['Bugün'] },
      { title: 'Dün', data: map['Dün'] },
      { title: 'Önceki Günler', data: map['Önceki Günler'] },
    ].filter(g => g.data.length > 0);
  }, [notifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'REMINDER':
      case 'reminder':
        return { name: 'time-outline', color: colors.primary };
      case 'DOSE_WARNING':
      case 'dose_missed':
        return { name: 'warning-outline', color: colors.error };
      case 'TREATMENT_TRACKING':
        return { name: 'pulse-outline', color: colors.success };
      case 'SYSTEM_LOG':
      case 'info':
      default:
        return { name: 'information-circle-outline', color: colors.textSecondary };
    }
  };

  const handlePress = (item: NotificationLog) => {
    if (!item.isRead) {
      markNotificationAsRead(item._id);
    }
    // Navigate logic based on type if needed
    if (item.type === 'REMINDER' || item.type === 'reminder') {
      setCurrentScreen('MEDICATIONS');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setCurrentScreen('DASHBOARD')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Bildirim Merkezi</Text>
        {notifications.some(n => !n.isRead) ? (
          <TouchableOpacity onPress={markAllNotificationsAsRead}>
            <Text style={[styles.readAll, { color: colors.primary }]}>Tümünü Oku</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.inner}>
        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Gösterilecek yeni bildiriminiz yok.
            </Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.title} style={styles.group}>
              <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>{group.title}</Text>
              {group.data.map(item => {
                const iconDef = getIcon(item.type);
                const timeStr = new Date(item.sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <TouchableOpacity
                    key={item._id}
                    style={[
                      styles.itemCard,
                      { backgroundColor: item.isRead ? colors.surface : colors.surfaceSecondary, borderColor: colors.border }
                    ]}
                    onPress={() => handlePress(item)}
                    activeOpacity={0.8}
                  >
                    {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.error }]} />}
                    <View style={[styles.iconBox, { backgroundColor: `${iconDef.color}15` }]}>
                      <Ionicons name={iconDef.name as any} size={22} color={iconDef.color} />
                    </View>
                    <View style={styles.info}>
                      <View style={styles.row}>
                        <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.timeText, { color: colors.textTertiary }]}>{timeStr}</Text>
                      </View>
                      <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.body}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 50,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: spacing.sm },
  title: { ...typography.h3, fontWeight: '700' } as any,
  readAll: { ...typography.caption, fontWeight: '600' } as any,
  scroll: { flex: 1 },
  inner: { padding: spacing.md, paddingBottom: 100 },
  group: { marginBottom: spacing.xl },
  groupTitle: { ...typography.caption, fontWeight: '700', marginBottom: spacing.md, marginLeft: spacing.xs } as any,
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle: { ...typography.button, fontWeight: '700', flex: 1, marginRight: spacing.sm } as any,
  timeText: { ...typography.caption, fontSize: 11 } as any,
  desc: { ...typography.caption, lineHeight: 18 } as any,
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: spacing.md },
  emptyText: { ...typography.body, textAlign: 'center' } as any,
});
