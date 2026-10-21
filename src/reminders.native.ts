import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { reminderPlan, type GameState } from './game';

// Phone build: task reminders as local notifications. The whole schedule is
// rebuilt from the saved state after every change, so ticking a task off
// removes its reminder for today and deleting a task removes all of them.
export const REMINDERS_SUPPORTED = true;

const CHANNEL = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady: Promise<unknown> | undefined;
function ensureChannel() {
  if (Platform.OS !== 'android') return Promise.resolve();
  channelReady ??= Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Task reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  return channelReady;
}

/** Asks once; true when notifications may be shown. */
export async function askReminderPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function syncReminders(state: GameState): Promise<void> {
  const plan = reminderPlan(state, new Date());
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (plan.length === 0 || !(await Notifications.getPermissionsAsync()).granted) return;
  await ensureChannel();
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: 'Time for this task. Tick it off to earn your XP.', data: { taskId: r.taskId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  }
}
