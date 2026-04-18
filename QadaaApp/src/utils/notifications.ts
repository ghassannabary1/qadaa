import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const DAILY_REMINDER_CHANNEL_ID = 'qadaa-daily-reminder';
export const DAILY_REMINDER_CATEGORY_ID = 'qadaaDailyReminder';
export const DAILY_REMINDER_KIND = 'daily-checkin';
export const DAILY_REMINDER_COUNT_ACTION_ID = 'countedToday';
export const DAILY_REMINDER_UNDO_ACTION_ID = 'undoDay';

export type DailyReminderCopy = {
  title: string;
  body: string;
  countActionTitle: string;
  undoActionTitle: string;
};

export async function ensureNotificationInfrastructure(copy: DailyReminderCopy) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DAILY_REMINDER_CHANNEL_ID, {
      name: 'Daily reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150],
      lightColor: '#D5B15A',
    });
  }

  await Notifications.setNotificationCategoryAsync(DAILY_REMINDER_CATEGORY_ID, [
    {
      identifier: DAILY_REMINDER_COUNT_ACTION_ID,
      buttonTitle: copy.countActionTitle,
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: DAILY_REMINDER_UNDO_ACTION_ID,
      buttonTitle: copy.undoActionTitle,
      options: {
        isDestructive: true,
        opensAppToForeground: false,
      },
    },
  ]);
}

export async function requestNotificationPermissionAsync() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleDailyReminderNotification({
  hour,
  minute,
  copy,
  existingIdentifier,
}: {
  hour: number;
  minute: number;
  copy: DailyReminderCopy;
  existingIdentifier?: string | null;
}) {
  await ensureNotificationInfrastructure(copy);

  if (existingIdentifier) {
    await Notifications.cancelScheduledNotificationAsync(existingIdentifier).catch(() => undefined);
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      categoryIdentifier: DAILY_REMINDER_CATEGORY_ID,
      data: {
        kind: DAILY_REMINDER_KIND,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: DAILY_REMINDER_CHANNEL_ID } : {}),
    },
  });
}

export async function cancelDailyReminderNotification(identifier?: string | null) {
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}
