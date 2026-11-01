import { bizzyFormOf, type BizzyMood } from './bizzy.ts';
import { DRAMA_ROUTES, widgetLooks, type DramaRoute, type WidgetMood } from './widgetLooks.ts';
import { dayKey, isBirthday, isDoneToday, levelInfo, restDaysOf, streakStatus, streakTierName, tierForDays, totalXp, visibleTasks, STREAK_REMINDER_HOUR, type GameState } from './game.ts';
import { tierFlame } from './vivid.ts';
import { t, tn } from './i18n.ts';

// What the home screen widget shows, worked out from the saved game. Pure, so
// it can be tested; the widget itself (TodayWidget.tsx) only draws it.

/** From this hour until 5 am Bizzy is sleepy, unless tasks are still open. */
export const WIDGET_NIGHT_HOUR = 22;
/** From here until 5 am he is fast asleep (picked 2026-11-01, R5a). */
export const WIDGET_ASLEEP_HOUR = 23.5;
/** The late drama's four steps, when tasks are still open (picked 2026-11-01: R1a, first step at 18:30). */
export const DRAMA_STEPS = [18.5, 20, 22, 23.5];
/** Judgy from this hour, when 4 or more tasks are left and less than a third is done (R3c). */
export const JUDGY_HOUR = 13;

/** Which drawing of Bizzy the widget shows: a mood in one of its looks, or a step of the late drama. */
export type WidgetArt = { mood: WidgetMood; look: string } | { route: DramaRoute; step: number };

export interface WidgetData {
  /** The big line: tasks left, or a short word like "All done!". */
  headline: string;
  /** One or two small lines under it. */
  sub: string;
  /** "12 days" while a streak runs, otherwise empty. */
  streak: string;
  /**
   * While a streak runs, the widget leads with it (picked 2026-11-01, D): a border in the
   * fire tier's colours, the days big, and headline and sub as one small line under them.
   */
  fire?: { days: number; label: string; short: string; c1: Hex; c2: Hex; mid: Hex };
  level: number;
  /** 0 to 1, how full the XP bar is. */
  progress: number;
  art: WidgetArt;
  /** 0 normal; 1 to 4 the background warms up with each drama step (R8a). */
  tint: number;
  /** How far the player's Bizzy has evolved (1 to 10). */
  form: number;
}

/** The same pick all day, a different one on most days: every look gets its turn (all were picked, 2026-11-01). */
export function pickOfDay<T>(options: readonly T[], day: string, salt: string): T {
  let h = 7;
  for (const ch of day + salt) h = (h * 31 + ch.charCodeAt(0)) % 1000003;
  return options[h % options.length];
}

type Hex = `#${string}`;

/** The colour halfway between two #rrggbb colours. */
function midColour(a: string, b: string): Hex {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return ('#' + [0, 1, 2].map((i) => Math.round((ch(a, i) + ch(b, i)) / 2).toString(16).padStart(2, '0')).join('').toUpperCase()) as Hex;
}

/** Headline and sub as one line, for the streak layout: "3" + "tasks left today" reads "3 tasks left today". */
export function widgetLine(d: Pick<WidgetData, 'headline' | 'sub'>): string {
  if (!/^\d+$/.test(d.headline)) return `${d.headline} ${d.sub}`;
  // The late lines already say how many ("Please? Just 2 tasks left.").
  return /\d/.test(d.sub) ? d.sub : `${d.headline} ${d.sub}`;
}

export function widgetData(state: GameState, now: Date): WidgetData {
  const data = widgetMood(state, now);
  const days = streakStatus(state.completions, dayKey(now), restDaysOf(state)).days;
  if (days <= 0) return data;
  const tier = tierForDays(days);
  // Spark (no fire yet) takes the Flame tier's colours, so the border is there from day one.
  const grad = tierFlame(Math.max(1, tier))!;
  const label = tn(days, 'day streak · {tier}#one', 'days streak · {tier}', { tier: streakTierName(tier) });
  const short = tn(days, 'day#one', 'days');
  return { ...data, fire: { days, label, short, c1: grad.c1 as Hex, c2: grad.c2 as Hex, mid: midColour(grad.c1, grad.c2) } };
}

function widgetMood(state: GameState, now: Date): WidgetData {
  const today = dayKey(now);
  const hour = now.getHours() + now.getMinutes() / 60;
  const tasks = visibleTasks(state, today);
  const left = tasks.filter((task) => !isDoneToday(state, task, today)).length;
  const doneCount = tasks.length - left;
  const streakInfo = streakStatus(state.completions, today, restDaysOf(state));
  const info = levelInfo(totalXp(state));
  const base = {
    streak: streakInfo.days > 0 ? tn(streakInfo.days, '{n} day', '{n} days') : '',
    level: info.level,
    progress: Math.max(0, Math.min(1, info.progress)),
    form: bizzyFormOf(state.bizzyForm).n,
    tint: 0,
  };
  const look = (mood: WidgetMood, options: readonly string[] = widgetLooks(mood)): WidgetArt => ({ mood, look: pickOfDay(options, today, mood) });
  const night = (planned: boolean): WidgetData =>
    hour < 5 || hour >= WIDGET_ASLEEP_HOUR
      ? { ...base, art: look('night', ['B', 'C']), headline: t('Shh…'), sub: hour < 5 ? t('Bizzy is asleep. The new day starts at 5:00.') : t('Bizzy is asleep. Well done today.') }
      : { ...base, art: look('night', ['A', 'D']), headline: t('Good night'), sub: planned ? t('All done. Sleep well.') : t('Sleep well. See you tomorrow.') };

  if (!state.onboarded || state.tasks.length === 0) {
    return { ...base, headline: t('Hi!'), sub: t('I’m Bizzy. Tap to plan your day.'), art: { mood: 'hello', look: 'A' } };
  }
  // Midnight to 5 am: the new day hasn't really started, so he sleeps.
  if (hour < 5) return night(true);
  if (isBirthday(state, today)) {
    return {
      ...base,
      art: look('birthday'),
      headline: t('Happy birthday!'),
      sub: left > 0 ? tn(left, '{n} task today. Take it easy.', '{n} tasks today. Take it easy.') : t('All done. Now go celebrate!'),
    };
  }
  if (tasks.length === 0) {
    if (hour >= WIDGET_NIGHT_HOUR) return night(false);
    return { ...base, headline: t('Free day'), sub: t('Nothing planned. Tap to add a task.'), art: look('hello') };
  }
  if (left === 0) {
    if (hour >= WIDGET_NIGHT_HOUR) return night(true);
    // How he celebrates depends on when you finished (R4a): smug before noon, happy, then satisfied in the evening.
    const todays = state.completions.filter((c) => c.date === today);
    const xpToday = todays.reduce((sum, c) => sum + c.xp, 0);
    const finished = Math.max(...todays.map((c) => c.hour ?? Math.floor(hour)), 0);
    const art = finished < 12 ? look('done', ['B', 'D']) : finished < 18 ? look('done', ['A']) : look('done', ['C']);
    return { ...base, headline: t('All done!'), sub: t('+{n} XP today. See you tomorrow.', { n: xpToday }), art };
  }
  const headline = String(left);
  if (hour >= DRAMA_STEPS[0]) {
    // The streak only needs one task, so it's only at risk when nothing is ticked yet (asked 2026-11-01).
    const atRisk = streakInfo.atRisk;
    let step = DRAMA_STEPS.filter((at) => hour >= at).length - 1;
    if (atRisk) step = Math.min(3, step + 1);
    else if (left === 1) step = Math.max(0, step - 1);
    const sub = atRisk && step >= 2
      ? t('Your {days}-day streak ends at midnight', { days: streakInfo.days })
      : [
          tn(left, '{n} task left. The day’s nearly over…', '{n} tasks left. The day’s nearly over…'),
          tn(left, 'Please? Just {n} task left.', 'Please? Just {n} tasks left.'),
          tn(left, 'Still {n} task open?! It’s late!', 'Still {n} tasks open?! It’s late!'),
          tn(left, '{n} task still open. I can’t watch!', '{n} tasks still open. I can’t watch!'),
        ][step];
    return { ...base, headline, sub, art: { route: pickOfDay(DRAMA_ROUTES, today, 'drama'), step }, tint: step + 1 };
  }
  if (hour >= JUDGY_HOUR && left >= 4 && doneCount / tasks.length < 1 / 3) {
    return { ...base, headline, sub: tn(left, 'task left. Just saying.', 'tasks left. Just saying.'), art: look('judgy') };
  }
  if (hour < 10) return { ...base, headline: t('Good morning!'), sub: tn(left, '{n} task today.', '{n} tasks today.'), art: look('morning') };
  if (hour >= 17) return { ...base, headline: t('Good evening'), sub: tn(left, '{n} task left. Still time.', '{n} tasks left. Still time.'), art: look('evening') };
  if (doneCount === 0) return { ...base, headline: t('Hello!'), sub: tn(left, '{n} task today. Let’s start one.', '{n} tasks today. Let’s start one.'), art: look('hello') };
  return { ...base, headline, sub: tn(left, 'task left today', 'tasks left today'), art: look('todo') };
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
