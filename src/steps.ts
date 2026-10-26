import {
  DAILY_MINUTES_CAP,
  durationLabel,
  isDoneToday,
  secondsUntilTickable,
  taskXp,
  toggleTask,
  xpMultiplier,
  type GameState,
  type StepTick,
  type Task,
} from './game.ts';
import { t } from './i18n.ts';
import { librarySteps } from './library.ts';

// Steps for long tasks: each ticked step pays a little XP right away, and
// finishing the task pays the rest. Together the steps pay STEP_SHARE of the
// task's XP, so the total for the task never changes: steps only make the
// progress visible. The last step is the finish line and completes the task.

export const STEP_SHARE = 0.3;
/** Typed tasks this long get time checkpoints suggested as steps. */
export const CHECKPOINT_MINUTES = 60;

/** The task's steps: its own, else the library's for that title, else none. */
export function stepsFor(task: Pick<Task, 'title' | 'steps'>): string[] {
  return task.steps ?? librarySteps(task.title) ?? [];
}

/** Steps offered when adding a task: the library's, or time checkpoints for long tasks. */
export function suggestedSteps(title: string, minutes: number): string[] {
  return librarySteps(title) ?? timeCheckpoints(minutes);
}

/** "20 min in", "40 min in", "Full 1 h done" for an hour; quarters from 2 h. */
export function timeCheckpoints(minutes: number): string[] {
  if (minutes < CHECKPOINT_MINUTES) return [];
  const parts = minutes <= 90 ? 3 : 4;
  const marks = Array.from({ length: parts - 1 }, (_, i) => t('{time} in', { time: durationLabel(Math.round((minutes * (i + 1)) / parts / 5) * 5) }));
  return [...marks, t('Full {time} done', { time: durationLabel(minutes) })];
}

/** XP for one step: an even share of STEP_SHARE, with today's multiplier. */
export function stepXpEach(task: Task, count: number, multiplier = 1): number {
  return count ? Math.max(1, Math.round(((taskXp(task) * STEP_SHARE) / count) * multiplier)) : 0;
}

/** The ticks that count for a task now: today's for repeating tasks, any day's for one-off tasks. */
function ticksFor(state: GameState, task: Task, today: string): StepTick[] {
  return (state.stepTicks ?? []).filter((t) => t.taskId === task.id && (task.daily ? t.date === today : true));
}

export interface StepStatus {
  titles: string[];
  /** Per step: ticked (all of them once the task is done). */
  done: boolean[];
  doneCount: number;
  /** XP the next step pays. */
  xpEach: number;
}

export function stepStatus(state: GameState, task: Task, today: string): StepStatus {
  const titles = stepsFor(task);
  const finished = isDoneToday(state, task, today);
  const ticked = new Set(ticksFor(state, task, today).map((t) => t.step));
  const done = titles.map((_, i) => finished || ticked.has(i));
  return { titles, done, doneCount: done.filter(Boolean).length, xpEach: stepXpEach(task, titles.length, xpMultiplier(state, today).total) };
}

/**
 * Ticks a step, or unticks it. Ticking the last open step finishes the task
 * (`finished`). Nothing changes once the task is done, or while a new task
 * still has to wait before it may be ticked.
 */
export function tickStep(state: GameState, taskId: string, step: number, today: string, now?: number): { state: GameState; finished: boolean } {
  const task = state.tasks.find((t) => t.id === taskId);
  const titles = task ? stepsFor(task) : [];
  if (!task || step < 0 || step >= titles.length || isDoneToday(state, task, today)) return { state, finished: false };
  if (now !== undefined && secondsUntilTickable(task, now) > 0) return { state, finished: false };

  const mine = ticksFor(state, task, today);
  const existing = mine.find((t) => t.step === step);
  if (existing) return { state: { ...state, stepTicks: (state.stepTicks ?? []).filter((t) => t !== existing) }, finished: false };

  // Past the day's 16 h of task time, steps still tick but pay nothing.
  const usedMinutes = state.completions.filter((c) => c.date === today).reduce((sum, c) => sum + (c.minutes ?? 0), 0);
  const xp = usedMinutes >= DAILY_MINUTES_CAP ? 0 : stepXpEach(task, titles.length, xpMultiplier(state, today).total);
  const tick: StepTick = { taskId, step, date: today, xp, ...(!task.daily && { oneOff: true }) };
  const next = { ...state, stepTicks: [...(state.stepTicks ?? []), tick] };
  const ticked = new Set(mine.map((t) => t.step).filter((i) => i < titles.length));
  if (ticked.size + 1 < titles.length) return { state: next, finished: false };
  return { state: toggleTask(next, taskId, today, now), finished: true };
}
