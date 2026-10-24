import type { CelebrationId, FlameStyleId } from './cosmetics.ts';
import type { IconName } from './icons.ts';

// Pure game rules: XP, levels, ranks and streaks. No React or storage here,
// so everything in this file can be unit tested.

/** Old saved data only; XP no longer depends on it. */
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Task {
  id: string;
  title: string;
  /** Saved by older versions; ignored now that XP comes from time alone. */
  difficulty?: Difficulty;
  /** Repeating tasks come back every day; one-off tasks disappear once done. */
  daily: boolean;
  /** For repeating tasks: how many times per week (1-7). Missing = every day. */
  perWeek?: number;
  /** Roughly how long the task takes. XP is based on this. */
  minutes?: number;
  /** Repeating tasks on fixed weekdays only (0 = Monday … 6 = Sunday). */
  days?: number[];
  /** One-off tasks planned for a later day (YYYY-MM-DD); hidden until then. */
  date?: string;
  /** Daily reminder time, "HH:MM", sent as a phone notification. */
  reminder?: string;
  /** Library category id, for grouping the day. */
  category?: string;
  /**
   * Steps on the way to finishing a long task, each paying a little XP (see
   * steps.ts). Missing = the library's steps for this title, if any; [] = none.
   */
  steps?: string[];
  createdAt: string;
}

/** Extra scheduling for a new task. */
export interface TaskPlan {
  days?: number[];
  date?: string;
  reminder?: string;
  category?: string;
  steps?: string[];
}

/** false = one-time, true = every day, a number = that many times per week. */
export type Repeat = boolean | number;

export interface Completion {
  taskId: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** XP actually awarded, including any streak bonus. */
  xp: number;
  /** Kept so challenges still count a task after it is deleted. */
  difficulty?: Difficulty;
  /** Task time counted towards the daily limit. */
  minutes?: number;
  title?: string;
  /** Set when an anti-cheat rule reduced the XP. */
  limited?: Limit;
}

/**
 * Why a completion earned less XP than usual:
 * daily = over the 16 h of task time per day, repeat = same task title
 * done more than 5 times today.
 */
export type Limit = 'daily' | 'repeat';

export const DAILY_MINUTES_CAP = 16 * 60;
/** XP share per completion of the same title on one day: 5x full, then 50 %, 25 %, 10 % from the 8th on. */
export const REPEAT_FACTORS = [1, 1, 1, 1, 1, 0.5, 0.25, 0.1];
/** A new task can't be ticked until this long after it was added. */
export const QUICK_TICK_MS = 20_000;
/** Longest task time that counts: one task can't exceed a full day's limit. */
export const MAX_TASK_MINUTES = DAILY_MINUTES_CAP;

export interface ChallengeClaim {
  challengeId: string;
  /** Monday of the week the challenge belonged to, YYYY-MM-DD. */
  week: string;
  xp: number;
  /** Day it was claimed, YYYY-MM-DD. Missing on claims saved before the activity timeline. */
  date?: string;
}

export interface Profile {
  name: string;
}

export interface GameState {
  tasks: Task[];
  completions: Completion[];
  claims: ChallengeClaim[];
  profile: Profile;
  /** False until the setup questions are answered or skipped. */
  onboarded: boolean;
  /** Life areas picked during setup, used to suggest tasks. */
  goals: string[];
  settings: Settings;
  /** Day the player started, YYYY-MM-DD. Used for "member since" achievements. */
  joinedAt: string;
  achievementClaims: AchievementClaim[];
  /** Levels whose level reward has been handed out (see achievements.ts). */
  levelRewards?: number[];
  /** Days covered by a rest token: the streak survives them without growing. */
  restDays?: string[];
  /** Days a double XP token was used. */
  doubleDays?: string[];
  /** Weekly challenges swapped with a reroll token. */
  swaps?: ChallengeSwap[];
  /** Days an ad-free token was used. */
  adFreeDays?: string[];
  /**
   * The one-time free recovery offered the first time a missed day would cost
   * the streak or a tier: the missed day, and whether the player took it.
   */
  recovery?: { day: string; used: boolean };
  /** Monthly events finished, by month ("2026-10"); each wins that month's frame. */
  seasonClaims?: { month: string; date: string }[];
  /** Lucky wheel spins, oldest first (see wheel.ts). */
  wheelSpins?: WheelSpin[];
  /** Steps of long tasks ticked off on the way (see steps.ts). */
  stepTicks?: StepTick[];
  /** Days every task was done, with their small bonus (see moments.ts). */
  perfectDays?: PerfectDay[];
  /** Streak milestones reached (7, 30, 100, 365 days), for the celebration and the profile. */
  streakMilestones?: { days: number; date: string }[];
}

export interface PerfectDay {
  date: string;
  xp: number;
  /** Tasks done that day when it was earned; unticking below this takes it back. */
  tasks: number;
}

export interface StepTick {
  taskId: string;
  /** Index into the task's steps. */
  step: number;
  date: string;
  xp: number;
  /** One-off tasks keep their steps across days; repeating tasks start over each day. */
  oneOff?: boolean;
}

export interface WheelSpin {
  date: string;
  /** Id of the prize won (WHEEL_PRIZES in wheel.ts). */
  prize: string;
  /** XP won, for XP prizes. */
  xp?: number;
}

/** Days the streak counts as kept without a task: rest tokens plus a taken free recovery. */
export function restDaysOf(state: Pick<GameState, 'restDays' | 'recovery'>): string[] {
  const days = state.restDays ?? [];
  return state.recovery?.used ? [...days, state.recovery.day] : days;
}

export interface ChallengeSwap {
  /** Monday of the week. */
  week: string;
  from: string;
  to: string;
}

export interface AchievementClaim {
  achievementId: string;
  /** 0-based tier index. */
  tier: number;
  xp: number;
  /** Day it was claimed, YYYY-MM-DD. Missing on claims saved before the activity timeline. */
  date?: string;
}

export interface Settings {
  /** Opted in to a daily motivational quote by email. */
  quoteEmails: boolean;
  email: string;
  /** Selected colour theme id. */
  theme: string;
  /** Evening notification while the streak is at risk; on unless turned off. */
  streakReminders?: boolean;
  /** The phone has been asked once for notification permission. */
  askedNotifications?: boolean;
  /** Opt-in: friends may see this player's activity once accounts exist. Off unless turned on. */
  shareActivity?: boolean;
  /** Who may find the profile once accounts exist. Friends only unless changed. */
  profileVisibility?: 'public' | 'friends';
  /** Title shown under the name, one the player has won. */
  title?: string;
  /** Equipped looks from the inventory; each only shows while the player owns it. */
  frame?: string;
  flameStyle?: FlameStyleId;
  celebration?: CelebrationId;
  /** Which of the five avatar gradients (vivid.ts AVATAR_DISCS) the profile picture uses. */
  avatar?: number;
  /** The first-steps card on Today was hidden. */
  guideHidden?: boolean;
}

/** Evening time of the "your streak is about to end" notification. */
export const STREAK_REMINDER_HOUR = 20;

export const emptyState: GameState = {
  tasks: [],
  completions: [],
  claims: [],
  profile: { name: 'Player' },
  onboarded: false,
  goals: [],
  settings: { quoteEmails: false, email: '', theme: 'classic' },
  joinedAt: '',
  achievementClaims: [],
};

/** Fills in fields that older saved data doesn't have yet. */
export function withDefaults(state: GameState, today: string): GameState {
  if (state.joinedAt) return state;
  const first = state.completions.reduce<string | null>((min, c) => (!min || c.date < min ? c.date : min), null);
  return { ...state, joinedAt: first ?? today };
}

/** Time assumed for tasks saved before tasks had a duration. */
export const DEFAULT_MINUTES = 15;

/** Time options offered when adding a task, in minutes. */
export const DURATIONS = [5, 15, 30, 60, 90, 120, 180, 240, 480];

/**
 * XP for a task, from how long it takes alone (how hard something feels is
 * personal and easy to game). Grows a bit slower than time (minutes^0.7) so
 * very long tasks don't dwarf everything else: 5 min = 5 XP, 15 min = 15,
 * 30 min = 20, 60 min = 35, 2 h = 55, 8 h = 150.
 */
export function xpFor(minutes: number): number {
  const m = Math.min(Math.max(minutes, 1), MAX_TASK_MINUTES);
  const raw = 2 * Math.pow(m, 0.7);
  return Math.max(5, Math.round(raw / 5) * 5);
}

export function taskXp(task: Task): number {
  return xpFor(task.minutes ?? DEFAULT_MINUTES);
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
}

const RANKS = [
  'Rookie', // 1-9
  'Apprentice', // 10-19
  'Achiever',
  'Go-Getter',
  'Pro',
  'Expert',
  'Master',
  'Grandmaster',
  'Legend',
  'Mythic', // 90-99
  'Immortal', // 100
];

export const MAX_LEVEL = 100;

// ---------- dates ----------

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  // Noon avoids daylight-saving edge cases.
  return dayKey(new Date(y, m - 1, d + delta, 12));
}

// ---------- levels ----------

/**
 * XP needed to go from `level` to `level + 1`, rounded to 5.
 * Starts tiny (25 XP, about two tasks) and gets steeper every level:
 * level 10 needs ~180, level 50 ~1,790, level 99 ~4,945.
 * Reaching level 100 takes about 197,000 XP in total.
 */
export function xpToNext(level: number): number {
  return Math.round((20 + 5 * Math.pow(level, 1.5)) / 5) * 5;
}

export function levelInfo(totalXp: number) {
  let level = 1;
  let remaining = totalXp;
  while (level < MAX_LEVEL && remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  if (level === MAX_LEVEL) {
    return { level, rank: rankFor(level), xpIntoLevel: remaining, xpForLevel: remaining, progress: 1, maxed: true };
  }
  const needed = xpToNext(level);
  return {
    level,
    rank: rankFor(level),
    xpIntoLevel: remaining,
    xpForLevel: needed,
    progress: remaining / needed,
    maxed: false,
  };
}

export function rankFor(level: number): string {
  return RANKS[Math.min(Math.floor(level / 10), RANKS.length - 1)];
}

export function totalXp(state: GameState): number {
  return (
    state.completions.reduce((sum, c) => sum + c.xp, 0) +
    state.claims.reduce((sum, c) => sum + c.xp, 0) +
    state.achievementClaims.reduce((sum, c) => sum + c.xp, 0) +
    (state.perfectDays ?? []).reduce((sum, d) => sum + d.xp, 0) +
    wheelXp(state) +
    stepXp(state)
  );
}

/**
 * A step's XP is an advance on the task: once the task is finished, the
 * completion pays the task's full XP and the step's share is part of it.
 */
export function stepAbsorbed(tick: StepTick, completions: Completion[]): boolean {
  return completions.some((c) => c.taskId === tick.taskId && (tick.oneOff || c.date === tick.date));
}

/** XP from steps of tasks not finished (yet). */
export function stepXp(state: Pick<GameState, 'stepTicks' | 'completions'>): number {
  return (state.stepTicks ?? []).reduce((sum, t) => sum + (stepAbsorbed(t, state.completions) ? 0 : t.xp), 0);
}

/** XP won on the lucky wheel. It counts for levels but doesn't earn wheel tickets. */
export function wheelXp(state: Pick<GameState, 'wheelSpins'>): number {
  return (state.wheelSpins ?? []).reduce((sum, s) => sum + (s.xp ?? 0), 0);
}

// ---------- streaks ----------

/**
 * Weekly task XP needed for each fire tier, reached at the end of a week.
 * Flame also lights right away, the day a streak has earned its weekXp.
 */
export const STREAK_TIERS = [
  { tier: 1, name: 'Flame', weekXp: 100 },
  { tier: 2, name: 'Blaze', weekXp: 200 },
  { tier: 3, name: 'Inferno', weekXp: 300 },
] as const;

export function streakTierName(tier: number): string {
  return tier === 0 ? 'Spark' : STREAK_TIERS[tier - 1].name;
}

export interface StreakStatus {
  /** Active days in the current streak. */
  days: number;
  /** 0 = Spark (no tier yet), 1 Flame, 2 Blaze, 3 Inferno. */
  tier: number;
  /** Longest streak ever, in days. */
  best: number;
  /** Task XP earned this week, counting towards next Monday's tier. */
  weekXp: number;
  /** Task XP earned since the current streak started (0 without a streak). */
  streakXp: number;
  /** The tier this week's XP reaches so far (0 = none). */
  weekTier: number;
  /** Nothing done yet today while a streak is running. */
  atRisk: boolean;
  /** Most weeks in a row that started on Inferno. */
  bestInfernoWeeks: number;
  /** Every fire change, oldest first, for the activity timeline. */
  history: StreakChange[];
}

/**
 * A change to the streak fire: up = a Monday raised the tier, down = a missed
 * day cost a tier, lost = a missed day ended the streak. date is the Monday or
 * the missed day; days is the streak length right before the change.
 */
export interface StreakChange {
  date: string;
  change: 'up' | 'down' | 'lost';
  tier: number;
  days: number;
}

/**
 * Replays every day since the first completion. A day with at least one task
 * done keeps the streak going. A missed day costs a tier (Blaze -> Flame,
 * Inferno -> Blaze) and the days counted so far survive; on Flame or Spark a
 * missed day ends the streak. Flame lights the moment a streak has earned
 * 100 XP, today included. Each Monday, last week's task XP raises the
 * tier to whatever threshold it reached (never lowers it). Today only counts
 * against the streak once it is over.
 */
export function streakStatus(completions: Completion[], today: string, restDays: string[] = []): StreakStatus {
  const xpByDay = new Map<string, number>();
  for (const c of completions) if (c.date <= today) xpByDay.set(c.date, (xpByDay.get(c.date) ?? 0) + c.xp);
  const weekXpOf = (monday: string) => {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += xpByDay.get(addDays(monday, i)) ?? 0;
    return sum;
  };
  const tierFor = (xp: number) => STREAK_TIERS.filter((t) => xp >= t.weekXp).length;
  const thisWeek = weekStart(today);
  const weekXp = weekXpOf(thisWeek);
  const rest = new Set(restDays);
  const first = [...xpByDay.keys()].sort()[0];
  let days = 0;
  let streakXp = 0;
  let tier = 0;
  let best = 0;
  let infernoRun = 0;
  let bestInfernoWeeks = 0;
  const history: StreakChange[] = [];
  if (first) {
    for (let d = first; d <= today; d = addDays(d, 1)) {
      if (d !== first && weekdayOf(d) === 0) {
        const reached = days > 0 ? tierFor(weekXpOf(addDays(d, -7))) : 0;
        if (reached > tier) {
          tier = reached;
          history.push({ date: d, change: 'up', tier, days });
        }
        infernoRun = tier === 3 ? infernoRun + 1 : 0;
        bestInfernoWeeks = Math.max(bestInfernoWeeks, infernoRun);
      }
      if (xpByDay.has(d)) {
        days++;
        best = Math.max(best, days);
        streakXp += xpByDay.get(d) ?? 0;
        if (tier === 0 && streakXp >= STREAK_TIERS[0].weekXp) {
          tier = 1;
          history.push({ date: d, change: 'up', tier, days });
        }
      } else if (rest.has(d)) {
        // A rest day keeps everything as it is.
      } else if (d !== today) {
        if (tier >= 2) {
          tier--;
          history.push({ date: d, change: 'down', tier, days });
        } else {
          if (days > 0) history.push({ date: d, change: 'lost', tier: 0, days });
          days = 0;
          streakXp = 0;
          tier = 0;
        }
      }
    }
  }
  return { days, tier, best, weekXp, streakXp, weekTier: tierFor(weekXp), atRisk: days > 0 && !xpByDay.has(today) && !rest.has(today), bestInfernoWeeks, history };
}

/**
 * Days in the current streak. If nothing is done yet today, a streak that ran
 * until yesterday still counts: it only breaks once a whole day has been missed.
 */
export function currentStreak(completions: Completion[], today: string, restDays: string[] = []): number {
  return streakStatus(completions, today, restDays).days;
}

/** Extra XP on the first few active days after a streak was lost, to help back in. */
export const COMEBACK_BONUS = 0.25;
export const COMEBACK_DAYS = 3;

/**
 * Active days left (today included) with the comeback boost: after a lost
 * streak, the first COMEBACK_DAYS days with a task done earn extra XP.
 * 0 when no streak was ever lost or the boost is used up.
 */
export function comebackDaysLeft(state: Pick<GameState, 'completions' | 'restDays' | 'recovery'>, today: string): number {
  const lost = streakStatus(state.completions, today, restDaysOf(state)).history.filter((h) => h.change === 'lost').at(-1);
  if (!lost) return 0;
  const before = new Set(state.completions.filter((c) => c.date > lost.date && c.date < today).map((c) => c.date));
  return Math.max(0, COMEBACK_DAYS - before.size);
}

/**
 * What the next task finished today is multiplied by, and why: the streak
 * bonus (counting today), a double XP token and the comeback boost.
 */
export function xpMultiplier(state: GameState, today: string): { total: number; parts: { label: string; x: number }[]; streak: number } {
  const streak = currentStreak([...state.completions, { taskId: '', date: today, xp: 0 }], today, restDaysOf(state));
  const parts = [{ label: 'Streak', x: 1 + streakBonus(streak) }];
  if (state.doubleDays?.includes(today)) parts.push({ label: 'Double XP', x: 2 });
  if (comebackDaysLeft(state, today) > 0) parts.push({ label: 'Comeback', x: 1 + COMEBACK_BONUS });
  return { total: parts.reduce((t, p) => t * p.x, 1), parts, streak };
}

/** Daily-streak XP multiplier steps: from 5 days 1.1x, 10 days 1.2x, 30 days 1.3x, 150 days 1.5x. */
export const STREAK_BONUSES = [
  { days: 5, bonus: 0.1 },
  { days: 10, bonus: 0.2 },
  { days: 30, bonus: 0.3 },
  { days: 150, bonus: 0.5 },
] as const;

/** Streak bonus as a fraction of base XP, e.g. 0.2 = 1.2x. */
export function streakBonus(streak: number): number {
  return STREAK_BONUSES.filter((b) => streak >= b.days).at(-1)?.bonus ?? 0;
}

/** The next multiplier step and how many more days it takes, or undefined at the top. */
export function nextStreakBonus(streak: number): { days: number; bonus: number; daysLeft: number } | undefined {
  const next = STREAK_BONUSES.find((b) => streak < b.days);
  return next ? { ...next, daysLeft: next.days - streak } : undefined;
}

// ---------- actions ----------

export function isDoneToday(state: GameState, task: Task, today: string): boolean {
  return state.completions.some(
    (c) => c.taskId === task.id && (task.daily ? c.date === today : true),
  );
}

export function timesPerWeek(task: Task): number {
  if (!task.daily) return 0;
  if (task.days?.length) return task.days.length;
  return Math.min(Math.max(task.perWeek ?? 7, 1), 7);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return (new Date(y, m - 1, d, 12).getDay() + 6) % 7;
}

/**
 * Most times per week a task may repeat. Tasks for the whole week, like
 * "Meal prep for the week" or a "Weekly review", only make sense once.
 */
export function maxPerWeek(title: string): number {
  return /\b(week|weekly|weekend)\b/i.test(title) ? 1 : 7;
}

/** Whether a task is planned for this day at all (before checking what is done). */
export function isScheduledOn(task: Task, day: string): boolean {
  if (task.daily) return !task.days?.length || task.days.includes(weekdayOf(day));
  return !task.date || task.date <= day;
}

/** How often a repeating task has been done this week (Monday to Sunday). */
export function doneThisWeek(state: GameState, task: Task, today: string): number {
  const start = weekStart(today);
  return state.completions.filter((c) => c.taskId === task.id && c.date >= start && c.date <= today).length;
}

/**
 * Tasks to show today: anything done today, repeating tasks planned for today
 * until their weekly target is reached, and one-offs that are due and not done.
 */
export function visibleTasks(state: GameState, today: string): Task[] {
  return state.tasks.filter((t) => {
    if (state.completions.some((c) => c.taskId === t.id && c.date === today)) return true;
    if (!isScheduledOn(t, today)) return false;
    if (t.daily) return doneThisWeek(state, t, today) < timesPerWeek(t);
    return !state.completions.some((c) => c.taskId === t.id);
  });
}

/** One-off tasks planned for a later day, soonest first. */
export function upcomingTasks(state: GameState, today: string): Task[] {
  return state.tasks
    .filter((t) => !t.daily && t.date && t.date > today)
    .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
}

/** Most steps one task can have. */
export const MAX_STEPS = 6;
/** Longest step name. */
export const MAX_STEP_LENGTH = 40;

/** Trimmed, non-empty step names, at most MAX_STEPS. */
export function cleanSteps(steps: string[]): string[] {
  return steps
    .map((st) => st.trim().slice(0, MAX_STEP_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_STEPS);
}

export function addTask(
  state: GameState,
  title: string,
  repeat: Repeat,
  id: string = Math.random().toString(36).slice(2),
  minutes?: number,
  plan: TaskPlan = {},
): GameState {
  const trimmed = title.trim();
  if (!trimmed) return state;
  const task: Task = { id, title: trimmed, daily: repeat !== false, createdAt: new Date().toISOString() };
  if (minutes) task.minutes = minutes;
  const max = maxPerWeek(trimmed);
  if (task.daily) {
    const days = [...new Set(plan.days ?? [])].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
    if (days.length) task.days = days.slice(0, max);
    else {
      const n = typeof repeat === 'number' ? Math.max(1, Math.round(repeat)) : 7;
      if (Math.min(n, max) < 7) task.perWeek = Math.min(n, max);
    }
  } else if (plan.date && /^\d{4}-\d{2}-\d{2}$/.test(plan.date)) {
    task.date = plan.date;
  }
  if (plan.reminder && /^([01]\d|2[0-3]):[0-5]\d$/.test(plan.reminder)) task.reminder = plan.reminder;
  if (plan.category) task.category = plan.category;
  if (plan.steps) task.steps = cleanSteps(plan.steps);
  return { ...state, tasks: [...state.tasks, task] };
}

export function deleteTask(state: GameState, taskId: string): GameState {
  // Earned XP stays: deleting a task should not take away levels.
  return { ...state, tasks: state.tasks.filter((t) => t.id !== taskId) };
}

/**
 * Whole seconds left before a freshly added task may be ticked (0 when it already can).
 * A creation time in the future (the phone clock was turned back) doesn't lock the task.
 */
export function secondsUntilTickable(task: Task, now: number): number {
  const left = Date.parse(task.createdAt) + QUICK_TICK_MS - now;
  return left > 0 && left <= QUICK_TICK_MS ? Math.ceil(left / 1000) : 0;
}

/**
 * Tick or untick a task for today. Ticking awards base XP plus the streak
 * bonus (the streak includes today). Unticking removes exactly what was given.
 * `now` (ms) enables the wait after adding: within QUICK_TICK_MS of creation
 * the tick is refused and the state is returned unchanged.
 */
export function toggleTask(state: GameState, taskId: string, today: string, now?: number): GameState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;

  if (isDoneToday(state, task, today)) {
    return {
      ...state,
      completions: state.completions.filter(
        (c) => !(c.taskId === taskId && c.date === today),
      ),
    };
  }

  if (now !== undefined && secondsUntilTickable(task, now) > 0) return state;

  let xp = taskXp(task) * xpMultiplier(state, today).total;
  let limited: Limit | undefined;

  const todays = state.completions.filter((c) => c.date === today);
  const sameTitle = todays.filter((c) => c.title?.toLowerCase() === task.title.toLowerCase()).length;
  const repeatFactor = REPEAT_FACTORS[Math.min(sameTitle, REPEAT_FACTORS.length - 1)];
  if (repeatFactor < 1) {
    xp *= repeatFactor;
    limited = 'repeat';
  }

  const minutes = Math.min(task.minutes ?? DEFAULT_MINUTES, MAX_TASK_MINUTES);
  const usedMinutes = todays.reduce((sum, c) => sum + (c.minutes ?? 0), 0);
  const allowed = Math.max(0, DAILY_MINUTES_CAP - usedMinutes);
  if (allowed < minutes) {
    xp *= allowed / minutes;
    limited = 'daily';
  }

  const completion: Completion = {
    taskId,
    date: today,
    xp: Math.round(xp),
    minutes,
    title: task.title,
  };
  if (limited) completion.limited = limited;
  return { ...state, completions: [...state.completions, completion] };
}

export function limitMessage(limit: Limit): string {
  switch (limit) {
    case 'daily':
      return 'Daily limit of 16 h of tasks reached';
    case 'repeat':
      return 'Done more than 5 times today: less XP';
  }
}

export function longestStreak(completions: Completion[], restDays: string[] = []): number {
  const last = completions.reduce((max, c) => (c.date > max ? c.date : max), '');
  return last ? streakStatus(completions, last, restDays).best : 0;
}

// ---------- weekly challenges ----------

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = (new Date(y, m - 1, d, 12).getDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

/** One day of this week on the streak card. */
export type WeekDot = 'done' | 'rest' | 'missed' | 'today' | 'future';

/**
 * Monday to Sunday of today's week: done (a task finished), rest (covered by a
 * rest day), today (nothing yet), missed, or future (still to come, or before
 * the player joined).
 */
export function weekDots(state: Pick<GameState, 'completions' | 'restDays' | 'recovery' | 'joinedAt'>, today: string): WeekDot[] {
  const active = new Set(state.completions.map((c) => c.date));
  const rest = new Set(restDaysOf(state));
  const monday = weekStart(today);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    if (active.has(day)) return 'done';
    if (day > today || (state.joinedAt && day < state.joinedAt)) return 'future';
    if (rest.has(day)) return 'rest';
    return day === today ? 'today' : 'missed';
  });
}

export interface WeekStats {
  tasksDone: number;
  /** Task time, in hours to one decimal. */
  hoursDone: number;
  /** Tasks of an hour or more. */
  longDone: number;
  /** Different task titles. */
  variety: number;
  /** Days with at least 3 tasks done. */
  busyDays: number;
  activeDays: number;
  /** XP from tasks only; challenge rewards don't count towards challenges. */
  xpEarned: number;
}

export function weekStats(state: GameState, today: string): WeekStats {
  const start = weekStart(today);
  const end = addDays(start, 6);
  const inWeek = state.completions.filter((c) => c.date >= start && c.date <= end);
  return {
    tasksDone: inWeek.length,
    hoursDone: Math.floor(inWeek.reduce((sum, c) => sum + (c.minutes ?? DEFAULT_MINUTES), 0) / 6) / 10,
    longDone: inWeek.filter((c) => (c.minutes ?? DEFAULT_MINUTES) >= 60).length,
    variety: new Set(inWeek.map((c) => (c.title ?? c.taskId).trim().toLowerCase())).size,
    busyDays: [...countBy(inWeek.map((c) => c.date)).values()].filter((n) => n >= 3).length,
    activeDays: new Set(inWeek.map((c) => c.date)).size,
    xpEarned: inWeek.reduce((sum, c) => sum + c.xp, 0),
  };
}

function countBy(keys: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}

export interface ChallengeDef {
  id: string;
  title: string;
  icon: IconName;
  rewardXp: number;
  target: number;
  unit: string;
  /** Measured from tasks in the app. Undefined = needs phone sensors (coming soon). */
  metric?: keyof WeekStats;
}

export const CHALLENGE_POOL: ChallengeDef[] = [
  { id: 'tasks15', title: 'Finish 15 tasks this week', icon: 'ListChecks', rewardXp: 100, target: 15, unit: 'tasks', metric: 'tasksDone' },
  { id: 'tasks25', title: 'Finish 25 tasks this week', icon: 'Trophy', rewardXp: 180, target: 25, unit: 'tasks', metric: 'tasksDone' },
  { id: 'hours5', title: 'Spend 5 hours on your tasks', icon: 'Hourglass', rewardXp: 120, target: 5, unit: 'h', metric: 'hoursDone' },
  { id: 'hours10', title: 'Spend 10 hours on your tasks', icon: 'Timer', rewardXp: 200, target: 10, unit: 'h', metric: 'hoursDone' },
  { id: 'long3', title: 'Finish 3 tasks of an hour or more', icon: 'Mountain', rewardXp: 120, target: 3, unit: 'long tasks', metric: 'longDone' },
  { id: 'variety8', title: 'Do 8 different tasks', icon: 'Shuffle', rewardXp: 110, target: 8, unit: 'tasks', metric: 'variety' },
  { id: 'busy3', title: 'Finish 3 or more tasks on 3 days', icon: 'Rocket', rewardXp: 130, target: 3, unit: 'days', metric: 'busyDays' },
  { id: 'days5', title: 'Be active on 5 days', icon: 'CalendarDays', rewardXp: 120, target: 5, unit: 'days', metric: 'activeDays' },
  { id: 'days7', title: 'Be active every day this week', icon: 'CalendarCheck', rewardXp: 200, target: 7, unit: 'days', metric: 'activeDays' },
  { id: 'xp300', title: 'Earn 300 XP from tasks', icon: 'Zap', rewardXp: 100, target: 300, unit: 'XP', metric: 'xpEarned' },
  { id: 'xp600', title: 'Earn 600 XP from tasks', icon: 'Gem', rewardXp: 180, target: 600, unit: 'XP', metric: 'xpEarned' },
];

/** Need phone sensors or health data, so they arrive with the phone app builds. */
export const SENSOR_CHALLENGES: ChallengeDef[] = [
  { id: 'sleep8', title: 'Sleep 8 hours with your phone down', icon: 'Moon', rewardXp: 150, target: 5, unit: 'nights' },
  { id: 'walk10', title: 'Walk 10 km this week', icon: 'Footprints', rewardXp: 150, target: 10, unit: 'km' },
];

/** Three challenges per week, the same for everyone, rotating weekly. */
export function challengesForWeek(week: string): ChallengeDef[] {
  const [y, m, d] = week.split('-').map(Number);
  const weekNumber = Math.round(Date.UTC(y, m - 1, d) / (7 * 86400000));
  const n = CHALLENGE_POOL.length;
  const picks: ChallengeDef[] = [];
  for (let i = 0; picks.length < 3; i++) {
    const c = CHALLENGE_POOL[(weekNumber * 3 + i * 2) % n];
    // Skip a second challenge measuring the same thing.
    if (!picks.some((p) => p.metric === c.metric)) picks.push(c);
  }
  return picks;
}

export interface ChallengeStatus {
  def: ChallengeDef;
  progress: number;
  complete: boolean;
  claimed: boolean;
}

/** This week's challenges with any swaps applied, in their original order. */
export function challengesWithSwaps(week: string, swaps: ChallengeSwap[] = []): ChallengeDef[] {
  let defs = challengesForWeek(week);
  for (const sw of swaps) {
    if (sw.week !== week) continue;
    const to = CHALLENGE_POOL.find((c) => c.id === sw.to);
    if (to) defs = defs.map((d) => (d.id === sw.from ? to : d));
  }
  return defs;
}

/**
 * What a challenge would be swapped for: the next one in the pool that isn't
 * on this week's list and measures something none of the others do.
 */
export function swapCandidate(week: string, swaps: ChallengeSwap[], challengeId: string): ChallengeDef | undefined {
  const current = challengesWithSwaps(week, swaps);
  const others = current.filter((c) => c.id !== challengeId);
  const used = new Set(swaps.filter((s) => s.week === week).flatMap((s) => [s.from, s.to]));
  const start = CHALLENGE_POOL.findIndex((c) => c.id === challengeId);
  for (let i = 1; i < CHALLENGE_POOL.length; i++) {
    const c = CHALLENGE_POOL[(start + i) % CHALLENGE_POOL.length];
    if (current.some((d) => d.id === c.id) || used.has(c.id)) continue;
    if (others.some((o) => o.metric === c.metric)) continue;
    return c;
  }
  return undefined;
}

export function weeklyChallenges(state: GameState, today: string): ChallengeStatus[] {
  const week = weekStart(today);
  const stats = weekStats(state, today);
  return challengesWithSwaps(week, state.swaps).map((def) => {
    const progress = Math.min(def.metric ? stats[def.metric] : 0, def.target);
    return {
      def,
      progress,
      complete: progress >= def.target,
      claimed: state.claims.some((c) => c.challengeId === def.id && c.week === week),
    };
  });
}

export function claimChallenge(state: GameState, challengeId: string, today: string): GameState {
  const status = weeklyChallenges(state, today).find((c) => c.def.id === challengeId);
  if (!status || !status.complete || status.claimed) return state;
  return {
    ...state,
    claims: [...state.claims, { challengeId, week: weekStart(today), xp: status.def.rewardXp, date: today }],
  };
}

// ---------- profile ----------

export function profileStats(state: GameState, today: string) {
  const xp = totalXp(state);
  return {
    ...levelInfo(xp),
    totalXp: xp,
    tasksDone: state.completions.length,
    currentStreak: currentStreak(state.completions, today, restDaysOf(state)),
    bestStreak: longestStreak(state.completions, restDaysOf(state)),
    challengesWon: state.claims.length,
  };
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function repeatLabel(task: Task): string {
  const n = timesPerWeek(task);
  if (n === 0) return task.date ? `One-time · ${dayLabel(task.date)}` : 'One-time';
  if (n === 7) return 'Every day';
  if (task.days?.length) {
    if (task.days.join() === '0,1,2,3,4') return 'Weekdays';
    if (task.days.join() === '5,6') return 'Weekends';
    return task.days.map((d) => WEEKDAYS[d]).join(', ');
  }
  return `${n}× a week`;
}

/** "Wed 23", in English like the rest of the app. */
export function dayLabel(day: string): string {
  return `${WEEKDAYS[weekdayOf(day)]} ${Number(day.slice(8, 10))}`;
}

export interface PlannedReminder {
  /** 'streak' for the streak warning. */
  taskId: string;
  title: string;
  body?: string;
  /** Local time the notification should appear. */
  at: Date;
}

/**
 * Reminders for the next `days` days, soonest first and at most `limit`
 * (iOS keeps only 64 scheduled notifications). Skips tasks already done, days
 * a task is not planned for, and repeating tasks whose weekly target is met.
 * Rebuilt after every change, so ticking a task cancels today's reminder.
 */
export function reminderPlan(state: GameState, now: Date, days = 7, limit = 60): PlannedReminder[] {
  const today = dayKey(now);
  const out: PlannedReminder[] = [];
  for (const task of state.tasks) {
    if (!task.reminder) continue;
    const [h, m] = task.reminder.split(':').map(Number);
    if (!task.daily && state.completions.some((c) => c.taskId === task.id)) continue;
    for (let i = 0; i < days; i++) {
      const day = addDays(today, i);
      if (!isScheduledOn(task, day)) continue;
      if (task.daily) {
        if (state.completions.some((c) => c.taskId === task.id && c.date === day)) continue;
        // Weekly target already met this week (only known for the current week).
        if (weekStart(day) === weekStart(today) && doneThisWeek(state, task, today) >= timesPerWeek(task)) continue;
      }
      const [y, mo, d] = day.split('-').map(Number);
      const at = new Date(y, mo - 1, d, h, m);
      if (at.getTime() > now.getTime()) out.push({ taskId: task.id, title: task.title, at });
    }
  }
  // Streak warning at 20:00 on days nothing is done yet, today and the next two.
  const streak = streakStatus(state.completions, today, restDaysOf(state));
  if (streak.days > 0 && state.settings.streakReminders !== false) {
    // A rest day already covers today.
    const doneToday = state.completions.some((c) => c.date === today) || restDaysOf(state).includes(today);
    const fire = streakTierName(streak.tier);
    const ends = streak.tier >= 2 ? `drops from ${fire} to ${streakTierName(streak.tier - 1)}` : 'ends';
    for (let i = doneToday ? 1 : 0; i < 3; i++) {
      const [y, mo, d] = addDays(today, i).split('-').map(Number);
      const at = new Date(y, mo - 1, d, STREAK_REMINDER_HOUR, 0);
      if (at.getTime() <= now.getTime()) continue;
      out.push(
        i === 0
          ? { taskId: 'streak', title: `Your ${streak.days}-day streak ${ends} at midnight`, body: 'One task today keeps it going.', at }
          : { taskId: 'streak', title: 'Keep your streak alive', body: 'Nothing done yet today. One task is enough.', at },
      );
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit);
}

export function finishSetup(state: GameState, name: string, goals: string[]): GameState {
  const named = name.trim() ? setName(state, name.trim()) : state;
  return { ...named, onboarded: true, goals };
}

export function updateSettings(state: GameState, settings: Partial<Settings>): GameState {
  return { ...state, settings: { ...state.settings, ...settings } };
}

export function setName(state: GameState, name: string): GameState {
  return { ...state, profile: { ...state.profile, name: name.slice(0, 24) } };
}
