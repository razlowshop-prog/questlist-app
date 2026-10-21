import type { GameState } from './game';

// Web build: browsers can't schedule notifications for a closed tab, so
// reminders only work in the phone app (reminders.native.ts).
export const REMINDERS_SUPPORTED = false;

export async function askReminderPermission(): Promise<boolean> {
  return false;
}

export async function syncReminders(_state: GameState): Promise<void> {}
