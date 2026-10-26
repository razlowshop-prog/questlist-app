import type { Task } from './game.ts';
import { FOCUS_CATEGORIES, FOCUS_FROM_MINUTES, libraryMatch, taskCategory } from './library.ts';

// The focus timer: start a task and a timer runs for the task's time, which
// the player can turn up or down a minute at a time. Finishing the task once
// the time is up earns a bonus that grows with the time. The session is kept
// in the game state, so it survives the app being closed.

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
  /** The length the player set with − / +; missing = the task's time. */
  goalMinutes?: number;
}

const clampGoal = (minutes: number) => Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, Math.round(minutes)));

/** How long to focus: the length set on the timer, else the task's time (25 min without one), 5 to 90 minutes. */
export function focusGoalMinutes(task: Pick<Task, 'minutes'>, session?: Pick<FocusSession, 'goalMinutes'>): number {
  return clampGoal(session?.goalMinutes ?? task.minutes ?? DEFAULT_FOCUS_MINUTES);
}

/** Sets the timer's length. Turning it below the time already focused makes the time up straight away. */
export function setFocusGoal(session: FocusSession, minutes: number): FocusSession {
  return { ...session, goalMinutes: clampGoal(minutes) };
}

/** The bonus for a whole focus of this length: 25 minutes = 10 XP, at least 2 XP, 36 XP for 90 minutes. */
export function focusBonusFor(minutes: number): number {
  return Math.max(2, Math.round(clampGoal(minutes) / 2.5));
}

/**
 * Whether the focus timer is offered for a task: library tasks say so
 * themselves (library.ts); anything else from 5 minutes in a category where
 * sitting down with a timer fits (work, learning, creativity, mind).
 */
export function focusOffered(task: Pick<Task, 'title' | 'minutes' | 'category'>): boolean {
  const lib = libraryMatch(task.title);
  if (lib) return lib.focus;
  return (task.minutes ?? DEFAULT_FOCUS_MINUTES) >= FOCUS_FROM_MINUTES && FOCUS_CATEGORIES.includes(taskCategory(task));
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

/** The bonus for finishing the task now: the bonus for the set length once all of it is focused, else 0. */
export function focusBonus(session: FocusSession | undefined, task: Pick<Task, 'id' | 'minutes'>, now: number): number {
  if (!session || session.taskId !== task.id) return 0;
  const goal = focusGoalMinutes(task, session);
  return focusElapsed(session, now) >= goal * 60_000 ? focusBonusFor(goal) : 0;
}

/** "12:05", or "1:02:05" past an hour. */
export function clockLabel(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
