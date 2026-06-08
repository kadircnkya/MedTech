/**
 * MedTech Notification Service
 * Manages medication reminder scheduling via expo-notifications.
 * Supports: 30 min early, 15 min early, exact-time interactive notifications.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Medication } from '../types';

// ── Notification category with action buttons ──
export const MEDICATION_CATEGORY_ID = 'MEDICATION_REMINDER';
const ACTION_TAKEN  = 'MEDICATION_TAKEN';
const ACTION_SNOOZE = 'MEDICATION_SNOOZE';

// ── Default handler (shown while app is foregrounded) ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Types ──
export interface SnoozeOptions {
  doseId: string;
  medicationId: string;
  medicationName: string;
  minutes: 15 | 30 | 60;
}

export interface NotificationPayload {
  doseId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  date: string;
  type: 'REMINDER_30' | 'REMINDER_15' | 'EXACT';
}

// ── Setup interactive notification categories ──
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(MEDICATION_CATEGORY_ID, [
    {
      identifier: ACTION_TAKEN,
      buttonTitle: '✓ İçtim',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: '⏰ 15 dk Sonra Hatırlat',
      options: { opensAppToForeground: false },
    },
  ]);
}

// ── Request permission ──
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    // Simulator/emulator — skip, return true for testing
    return true;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'İlaç Hatırlatıcıları',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A84FF',
      sound: 'default',
    });
  }

  return finalStatus === 'granted';
}

// ── Parse "HH:MM" time string into today's Date ──
function timeToDateToday(timeStr: string, offsetMinutes = 0): Date {
  const [hh, mm] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hh, mm + offsetMinutes, 0, 0);
  return d;
}

// ── Schedule all reminders for a medication ──
export async function scheduleMedicationReminders(
  medication: Medication,
  doseId: string,
  date?: string,
): Promise<string[]> {
  const scheduled: string[] = [];
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return scheduled;

  for (const timeStr of medication.times) {
    const exactTime = timeToDateToday(timeStr);

    // Skip if the time has already passed today
    if (exactTime <= new Date()) continue;

    const basePayload: Omit<NotificationPayload, 'type'> = {
      doseId,
      medicationId: medication.id,
      medicationName: medication.name,
      scheduledTime: timeStr,
      date: date ?? new Date().toISOString().split('T')[0],
    };

    // 30 dakika öncesi
    const t30 = timeToDateToday(timeStr, -30);
    if (t30 > new Date()) {
      const id30 = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 İlaç Hatırlatıcısı',
          body: `30 dakika sonra ${medication.name} ${medication.strength} ilacınızı almanız gerekiyor.`,
          data: { ...basePayload, type: 'REMINDER_30' } satisfies NotificationPayload,
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: t30 },
      });
      scheduled.push(id30);
    }

    // 15 dakika öncesi
    const t15 = timeToDateToday(timeStr, -15);
    if (t15 > new Date()) {
      const id15 = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 İlaç Hatırlatıcısı',
          body: `15 dakika sonra ${medication.name} ${medication.strength} ilacınızı almanız gerekiyor.`,
          data: { ...basePayload, type: 'REMINDER_15' } satisfies NotificationPayload,
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: t15 },
      });
      scheduled.push(id15);
    }

    // Tam saatinde (interaktif butonlarla)
    if (exactTime > new Date()) {
      const idExact = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${medication.name} — Alma Zamanı`,
          body: `${medication.strength} · ${timeStr} dozunuzu almayı unutmayın.`,
          data: { ...basePayload, type: 'EXACT' } satisfies NotificationPayload,
          sound: true,
          categoryIdentifier: MEDICATION_CATEGORY_ID,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: exactTime },
      });
      scheduled.push(idExact);
    }
  }

  return scheduled;
}

// ── Schedule a snooze reminder ──
export async function snoozeReminder(opts: SnoozeOptions): Promise<string | null> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return null;

  const fireAt = new Date(Date.now() + opts.minutes * 60 * 1000);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${opts.medicationName} — Hatırlatıcı`,
      body: `${opts.minutes} dakika ertelendi. Şimdi alma zamanı!`,
      data: {
        doseId: opts.doseId,
        medicationId: opts.medicationId,
        medicationName: opts.medicationName,
        type: 'EXACT',
      },
      sound: true,
      categoryIdentifier: MEDICATION_CATEGORY_ID,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
}

// ── Cancel all reminders for a medication ──
export async function cancelMedicationReminders(notificationIds: string[]): Promise<void> {
  await Promise.all(notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}

// ── Cancel all scheduled notifications ──
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Get all scheduled notifications (debug/display) ──
export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

// ── Listener helpers ──
export type NotificationReceivedListener = (n: Notifications.Notification) => void;
export type NotificationResponseListener = (r: Notifications.NotificationResponse) => void;

export function addNotificationReceivedListener(
  handler: NotificationReceivedListener,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseListener(
  handler: NotificationResponseListener,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export { ACTION_TAKEN, ACTION_SNOOZE };
