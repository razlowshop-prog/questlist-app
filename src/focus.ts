import type { Task } from './game.ts';

// The focus timer: start a task and a timer runs for the task's time.
// Finishing the task once the time is up earns a small flat bonus. The
// session is kept in the game state, so it survives the app being closed.

export const FOCUS_BONUS_XP = 10;
/** Tasks without a time get a classic 25-minute focus. */
export const DEFAULT_FOCUS_MINUTES = 25;
export const MIN_FOCUS_MINUTES = 5;
export const MAX_FOCUS_MINUTES = 90;

export interface FocusSession {
  taskId: string;
  /** Epoch ms when the timer started. */
  startedAt: number;
  /** Time spent paused before the current run, in ms. */
  pausedMs: number;
  /** Set while paused: when the pause began. */
  pausedAt?: number;
}

export function focusGoalMinutes(task: Pick<Task, 'minutes'>): number {
  return Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, task.minutes ?? DEFAULT_FOCUS_MINUTES));
}

export function startFocus(taskId: string, now: number): FocusSession {
  return { taskId, startedAt: now, pausedMs: 0 };
}

/** Focused time so far, in ms, not counting pauses. */
export function focusElapsed(session: FocusSession, now: number): number {
  const until = session.pausedAt ?? now;
  return Math.max(0, until - session.startedAt - session.pausedMs);
}

export function pauseFocus(session: FocusSession, now: number): FocusSession {
  return session.pausedAt ? session : { ...session, pausedAt: now };
}

export function resumeFocus(session: FocusSession, now: number): FocusSession {
  if (!session.pausedAt) return session;
  const { pausedAt, ...rest } = session;
  return { ...rest, pausedMs: session.pausedMs + Math.max(0, now - pausedAt) };
}

/** The bonus for finishing the task now: the full bonus once the goal time is focused, else 0. */
export function focusBonus(session: FocusSession | undefined, task: Pick<Task, 'id' | 'minutes'>, now: number): number {
  if (!session || session.taskId !== task.id) return 0;
  return focusElapsed(session, now) >= focusGoalMinutes(task) * 60_000 ? FOCUS_BONUS_XP : 0;
}

/** "12:05", or "1:02:05" past an hour. */
export function clockLabel(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
