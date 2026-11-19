// reminders.ts — daily study reminder (LOCAL notifications only).
//
// One repeating notification per day at the user-chosen time, fully
// on-device: no push server, no network. The setting itself lives in
// SettingsContext (device preferences); this module only talks to the
// OS scheduler. Web is a no-op (expo-notifications scheduling is not
// relied on there) — the Settings UI hides the section on web.
//
// expo-notifications is loaded LAZILY (dynamic import, first use):
// its JS eagerly requires the native module at import time, so a
// static import crashes the whole app on a development build whose
// APK predates the library. With the lazy load, such a build simply
// runs without reminders until the APK is rebuilt.

import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const CHANNEL_ID = 'study-reminder';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'web') {
    cached = null;
    return cached;
  }
  // Gate BEFORE importing: on a build without the native module the
  // import itself throws while the module graph evaluates, and that
  // throw can escape a try/catch around the dynamic import (Metro
  // evaluates the module synchronously). requireOptionalNativeModule
  // comes from expo-modules-core, which every Expo build contains,
  // and returns null instead of throwing.
  if (!requireOptionalNativeModule('ExpoPushTokenManager')) {
    cached = null;
    return cached;
  }
  try {
    cached = await import('expo-notifications');
    // Show the reminder as a banner even if the app happens to be open.
    cached.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    cached = null;
  }
  return cached;
}

async function ensureAndroidChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Study reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Ask for the notification permission (shows the OS prompt). Called
// ONLY from the Settings toggle — never silently at app start.
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  try {
    await ensureAndroidChannel(Notifications);
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

export interface ReminderSync {
  enabled: boolean;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

// Make the OS schedule match the setting: cancel whatever this app
// scheduled before, then (if enabled AND permission already granted)
// arm exactly one daily notification. Safe to call on every app start
// and on every setting change — it is idempotent.
export async function syncStudyReminder(opts: ReminderSync): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!opts.enabled) return;
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    await ensureAndroidChannel(Notifications);
    await Notifications.scheduleNotificationAsync({
      content: { title: opts.title, body: opts.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: opts.hour,
        minute: opts.minute,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  } catch {
    // Scheduling is best-effort: a failure here must never break the
    // app; the next app start re-syncs anyway.
  }
}
