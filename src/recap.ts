import { addDays, DEFAULT_MINUTES, weekStart, type GameState } from './game.ts';
import { N, t, tn } from './i18n.ts';

// The weekly recap: a short look back at the week, shown on Today from
// Sunday evening until Monday is over, and easy to share.

/** Sunday from this hour on shows the week that is ending. */
export const RECAP_SUNDAY_HOUR = 17;

/** In English; shown with t(). */
const WEEKDAYS = [N('Monday'), N('Tuesday'), N('Wednesday'), N('Thursday'), N('Friday'), N('Saturday'), N('Sunday')];

export interface WeekRecap {
  /** Monday of the week. */
  week: string;
  tasks: number;
  /** XP from finished tasks. */
  xp: number;
  minutes: number;
  activeDays: number;
  /** The day with the most tasks done (the earlier one on a tie). */
  bestDay?: { name: string; tasks: number };
  /** Tasks done the week before, to compare. */
  lastWeekTasks: number;
}

export function weekRecap(state: GameState, monday: string): WeekRecap {
  const sunday = addDays(monday, 6);
  const inWeek = state.completions.filter((c) => c.date >= monday && c.date <= sunday);
  const lastMonday = addDays(monday, -7);
  const perDay = WEEKDAYS.map((_, i) => inWeek.filter((c) => c.date === addDays(monday, i)).length);
  const most = Math.max(0, ...perDay);
  return {
    week: monday,
    tasks: inWeek.length,
    xp: inWeek.reduce((sum, c) => sum + c.xp, 0),
    minutes: inWeek.reduce((sum, c) => sum + (c.minutes ?? DEFAULT_MINUTES), 0),
    activeDays: perDay.filter((n) => n > 0).length,
    bestDay: most > 0 ? { name: WEEKDAYS[perDay.indexOf(most)], tasks: most } : undefined,
    lastWeekTasks: state.completions.filter((c) => c.date >= lastMonday && c.date < monday).length,
  };
}

/** The recap to offer now: Sunday evening for this week, Monday for last week; none once seen or for an empty week. */
export function recapToShow(state: GameState, today: string, hour: number): WeekRecap | undefined {
  const monday = weekStart(today);
  const isSunday = addDays(monday, 6) === today;
  const week = isSunday && hour >= RECAP_SUNDAY_HOUR ? monday : today === monday ? addDays(monday, -7) : undefined;
  if (!week || state.settings.recapSeen === week) return undefined;
  const recap = weekRecap(state, week);
  return recap.tasks > 0 ? recap : undefined;
}

export function recapShareText(recap: WeekRecap, appName: string): string {
  const best = recap.bestDay ? ` ${t('Best day: {day}.', { day: t(recap.bestDay.name) })}` : '';
  const vars = { app: appName, xp: recap.xp, days: recap.activeDays };
  return tn(recap.tasks, 'My week on {app}: {n} task done, +{xp} XP, active {days} of 7 days.', 'My week on {app}: {n} tasks done, +{xp} XP, active {days} of 7 days.', vars) + best;
}
