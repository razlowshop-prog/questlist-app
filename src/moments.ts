import { isDoneToday, restDaysOf, streakStatus, visibleTasks, type GameState } from './game.ts';

// Big moments on Today: a perfect day (every task for today done) and streak
// milestones. Both are celebrated once; only the perfect day pays XP.

export const PERFECT_DAY_XP = 20;
/** Fewer tasks than this don't make a perfect day, so it can't be had with one quick task. */
export const PERFECT_DAY_MIN_TASKS = 3;
export const STREAK_MILESTONES = [7, 30, 100, 365];

/**
 * Keeps today's perfect day in step with the tasks: earned when every task
 * shown for today is done (at least PERFECT_DAY_MIN_TASKS), taken back only if
 * a task is unticked again. Adding a new task later doesn't take it away.
 * `earned` is true when this change made the day perfect.
 */
export function syncPerfectDay(state: GameState, today: string): { state: GameState; earned: boolean } {
  const tasks = visibleTasks(state, today);
  const doneCount = state.completions.filter((c) => c.date === today).length;
  const had = state.perfectDays?.find((d) => d.date === today);
  const allDone = tasks.length >= PERFECT_DAY_MIN_TASKS && tasks.every((t) => isDoneToday(state, t, today));
  if (had) {
    if (doneCount >= had.tasks) return { state, earned: false };
    return { state: { ...state, perfectDays: state.perfectDays!.filter((d) => d !== had) }, earned: false };
  }
  if (!allDone) return { state, earned: false };
  return {
    state: { ...state, perfectDays: [...(state.perfectDays ?? []), { date: today, xp: PERFECT_DAY_XP, tasks: doneCount }] },
    earned: true,
  };
}

/** The streak milestone this change reached for the first time, if any, and the state with it recorded. */
export function reachStreakMilestone(before: GameState, after: GameState, today: string): { state: GameState; days?: number } {
  const was = streakStatus(before.completions, today, restDaysOf(before)).days;
  const now = streakStatus(after.completions, today, restDaysOf(after)).days;
  const days = STREAK_MILESTONES.filter((m) => was < m && now >= m).at(-1);
  // Once per streak: an untick and tick again on the same day doesn't count twice.
  if (!days || after.streakMilestones?.some((m) => m.days === days && m.date === today)) return { state: after };
  return { state: { ...after, streakMilestones: [...(after.streakMilestones ?? []), { days, date: today }] }, days };
}
