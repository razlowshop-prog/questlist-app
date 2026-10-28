import type { BizzyMood } from './bizzy.ts';
import { dayKey, isDoneToday, levelInfo, restDaysOf, streakStatus, totalXp, visibleTasks, STREAK_REMINDER_HOUR, type GameState } from './game.ts';
import { t, tn } from './i18n.ts';

// What the home screen widget shows, worked out from the saved game. Pure, so
// it can be tested; the widget itself (TodayWidget.tsx) only draws it.

/** From this hour until 5 am Bizzy is sleepy, unless the streak needs saving. */
export const WIDGET_NIGHT_HOUR = 22;

export interface WidgetData {
  /** The big line: tasks left, or a short word like "All done!". */
  headline: string;
  /** One or two small lines under it. */
  sub: string;
  /** "12 days" while a streak runs, otherwise empty. */
  streak: string;
  level: number;
  /** 0 to 1, how full the XP bar is. */
  progress: number;
  mood: BizzyMood;
}

export function widgetData(state: GameState, now: Date): WidgetData {
  const today = dayKey(now);
  const hour = now.getHours();
  const tasks = visibleTasks(state, today);
  const left = tasks.filter((task) => !isDoneToday(state, task, today)).length;
  const streakInfo = streakStatus(state.completions, today, restDaysOf(state));
  const info = levelInfo(totalXp(state));
  const base = {
    streak: streakInfo.days > 0 ? tn(streakInfo.days, '{n} day', '{n} days') : '',
    level: info.level,
    progress: Math.max(0, Math.min(1, info.progress)),
  };

  if (!state.onboarded || state.tasks.length === 0) {
    return { ...base, headline: t('Hi!'), sub: t('I’m Bizzy. Tap to plan your day.'), mood: 'wave' };
  }
  if (tasks.length === 0) {
    return { ...base, headline: t('Free day'), sub: t('Nothing planned. Tap to add a task.'), mood: 'happy' };
  }
  if (left === 0) {
    const xpToday = state.completions.filter((c) => c.date === today).reduce((sum, c) => sum + c.xp, 0);
    return { ...base, headline: t('All done!'), sub: t('+{n} XP today. See you tomorrow.', { n: xpToday }), mood: 'excited' };
  }
  const headline = String(left);
  if (streakInfo.atRisk && hour >= STREAK_REMINDER_HOUR) {
    return { ...base, headline, sub: t('Your {days}-day streak ends at midnight', { days: streakInfo.days }), mood: 'worried' };
  }
  const sub = tn(left, 'task left today', 'tasks left today');
  if (hour >= WIDGET_NIGHT_HOUR || hour < 5) return { ...base, headline, sub, mood: 'sleepy' };
  return { ...base, headline, sub, mood: 'happy' };
}

/**
 * Bizzy's mood on the streak card: proud once today's tasks are all done,
 * worried when the streak is at risk in the evening, sleepy late at night,
 * happy otherwise. (Each ticked task also makes him jump for a moment.)
 */
export function bizzyMood(state: GameState, now: Date): BizzyMood {
  const today = dayKey(now);
  const hour = now.getHours();
  const tasks = visibleTasks(state, today);
  if (tasks.length > 0 && tasks.every((task) => isDoneToday(state, task, today))) return 'proud';
  if (streakStatus(state.completions, today, restDaysOf(state)).atRisk && hour >= STREAK_REMINDER_HOUR) return 'worried';
  if (hour >= WIDGET_NIGHT_HOUR || hour < 5) return 'sleepy';
  return 'happy';
}
