import type { SoundStyle } from './sounds.ts';
import type { CelebrationId, FlameStyleId } from './cosmetics.ts';
import { EFFORT_FACTOR, WILLPOWER_XP, type Effort } from './effort.ts';
import { taskEffort, tooEarlyToTick } from './estimate.ts';
import { bizzyFormOf, canEvolve } from './bizzy.ts';
import { lang, N, t, type Lang } from './i18n.ts';
import type { FocusSession } from './focus.ts';
import type { IconName } from './icons.ts';
import { shownTitle } from './library.ts';

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
  /** The library task it was added from (library.ts ids), so it is hidden there while on the list. */
  libraryId?: string;
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
  libraryId?: string;
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
  /** The focus timer bonus, already part of `xp`. */
  focusXp?: number;
  /** Local hour (0–23) it was ticked, for the daily "before noon" challenges. Missing on older saves. */
  hour?: number;
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
  /** Birthday as MM-DD, no year (optional, asked 2026-11-01). Bizzy celebrates and the day is a free rest day. */
  birthday?: string;
  /** The day the birthday was last set: it can be changed once a year, so nobody can game the free rest day. */
  birthdaySetOn?: string;
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
  /** Monthly events won; `xp` is the bonus paid (events won before it existed paid none). */
  seasonClaims?: { month: string; date: string; xp?: number }[];
  /** Lucky wheel spins, oldest first (see wheel.ts). */
  wheelSpins?: WheelSpin[];
  /** Steps of long tasks ticked off on the way (see steps.ts). */
  stepTicks?: StepTick[];
  /** The focus timer that is running, if any (see focus.ts). */
  focus?: FocusSession;
  /** Daily challenges claimed (see daily.ts). */
  dailyClaims?: DailyClaim[];
  /** Days every task was done, with their small bonus (see moments.ts). */
  perfectDays?: PerfectDay[];
  /** Streak milestones reached (7, 30, 100, 365 days), for the celebration and the profile. */
  streakMilestones?: { days: number; date: string }[];
  /** How far Bizzy has evolved, 1 (Larva) to 10 (Queen); the player taps Evolve for each step (bizzy.ts). */
  bizzyForm?: number;
  /** How often Bizzy has been tapped on the streak card, for the secret achievement (achievements.ts). */
  bizzyTaps?: number;
  /** What Bizzy wears, one outfit id per slot (outfits.ts). */
  bizzyWear?: Partial<Record<'head' | 'face' | 'neck' | 'back', string>>;
  /** Test changes from the developer page; only kept in test builds (see devTools.ts). */
  dev?: DevSettings;
}

/** What the developer page changed, kept apart so it can be undone in one go (devTools.ts). */
export interface DevSettings {
  /** XP added (or taken away) to reach a picked level. */
  xp?: number;
  /** Extra XP multiplier on finished tasks. */
  multiplier?: number;
  /** Every theme and look is owned. */
  unlockAll?: boolean;
  /** Extra tokens in the bag. */
  tokens?: Partial<Record<'rest' | 'double' | 'reroll' | 'adfree', number>>;
  /** Extra wheel tickets. */
  tickets?: number;
}

export interface DailyClaim {
  challengeId: string;
  /** The day the challenge belonged to and was claimed, YYYY-MM-DD. */
  date: string;
  xp: number;
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
  /** XP won, for XP prizes, and for an outfit slice once every outfit of its rarity is owned. */
  xp?: number;
  /** Outfit won on an outfit slice (outfits.ts). */
  outfit?: string;
}

/** Days the streak counts as kept without a task: rest tokens plus a taken free recovery. */
export function restDaysOf(state: Pick<GameState, 'restDays' | 'recovery'> & { profile?: Profile }): string[] {
  const days = [...(state.restDays ?? []), ...birthdayRestDays(state.profile)];
  return state.recovery?.used ? [...days, state.recovery.day] : days;
}

// ---- Birthday (picked 2026-11-01: R6 profile field and setup question, R7a) ----

/** The birthday in a given year, YYYY-MM-DD; 29 February falls on the 28th in other years. */
export function birthdayIn(year: number, birthday: string): string {
  const [m, d] = birthday.split('-').map(Number);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const day = m === 2 && d === 29 && !leap ? 28 : d;
  return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isBirthday(state: { profile?: Profile }, day: string): boolean {
  const b = state.profile?.birthday;
  return !!b && birthdayIn(Number(day.slice(0, 4)), b) === day;
}

/**
 * Birthdays are free rest days, but only from the day the birthday was set:
 * setting it to a missed day afterwards doesn't bring a lost streak back.
 */
function birthdayRestDays(profile?: Profile): string[] {
  if (!profile?.birthday || !profile.birthdaySetOn) return [];
  const from = Number(profile.birthdaySetOn.slice(0, 4));
  const out: string[] = [];
  for (let y = from; y < from + 80; y++) {
    const day = birthdayIn(y, profile.birthday);
    if (day >= profile.birthdaySetOn) out.push(day);
  }
  return out;
}

/** A valid MM-DD (any year's calendar, so 02-29 is fine). */
export function validBirthday(mmdd: string): boolean {
  const m = /^(\d{2})-(\d{2})$/.exec(mmdd);
  if (!m) return false;
  const [mo, d] = [Number(m[1]), Number(m[2])];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
}

/** The first day the birthday can be changed again (once a year), or undefined when it can be set now. */
export function birthdayLockedUntil(state: { profile?: Profile }, today: string): string | undefined {
  const set = state.profile?.birthdaySetOn;
  if (!set || !state.profile?.birthday) return undefined;
  const next = addDays(set, 365);
  return next > today ? next : undefined;
}

/** Sets (or clears, with undefined) the birthday, if it may be changed today. */
export function setBirthday(state: GameState, birthday: string | undefined, today: string): GameState {
  if (birthday !== undefined && !validBirthday(birthday)) return state;
  if (birthday === state.profile.birthday) return state;
  if (birthdayLockedUntil(state, today)) return state;
  const profile = { ...state.profile };
  if (birthday) Object.assign(profile, { birthday, birthdaySetOn: today });
  else delete profile.birthday;
  return { ...state, profile };
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
  /** Up to 3 won trophies pinned to the profile, in order (trophies.ts SHOWCASE_SIZE). */
  showcase?: string[];
  /** Days the store's review pop-up was asked for (review.ts). */
  reviewAsks?: string[];
  /** Small vibrations on tick, level up and the wheel; on unless turned off. */
  haptics?: boolean;
  /** Soft sounds at the same moments; on unless turned off (sounds.ts). */
  sounds?: boolean;
  /** Which set plays for ticks, combos, level-ups, perfect days and streaks; Marimba unless changed. */
  soundStyle?: SoundStyle;
  /** The app's language; unset follows the phone (English unless the phone is in German). */
  lang?: Lang;
  /** Monday of the last week whose recap was seen or closed. */
  recapSeen?: string;
  /** The first-steps card on Today was hidden. */
  guideHidden?: boolean;
  /** How many of each bag item the player had when they last looked in the bag (bag.ts newInBag). */
  bagSeen?: Partial<Record<string, number>>;
  /** The first-time tour: waiting to be shown (after setup, or replayed from Settings) or seen. */
  tour?: 'pending' | 'done';
  /** The day Bizzy last said good morning (the morning hello plays on the first open of a day). */
  helloDay?: string;
  /** Won looks the player has already seen, as "kind:id" keys (inventory.ts newLooks). */
  seenLooks?: string[];
  /** Frames and titles owned before they had "new" badges were marked seen (inventory.ts seedProfileLooks). */
  profileLooksSeeded?: boolean;
  /** Day the last backup file was saved (backup.ts). */
  lastBackup?: string;
  /** The day the quote of the day last greeted the player on opening the app (quotes.ts quoteDue). */
  quoteDay?: string;
  /** false turns the quote screen on opening off. */
  quoteStart?: boolean;
}

/** Evening time of the "your streak is about to end" notification. */
export const STREAK_REMINDER_HOUR = 20;

/** The name a player has until they type one; saved in English like other data. */
export const DEFAULT_NAME = N('Player');

export const emptyState: GameState = {
  tasks: [],
  completions: [],
  claims: [],
  profile: { name: DEFAULT_NAME },
  onboarded: false,
  goals: [],
  settings: { quoteEmails: false, email: '', theme: 'classic' },
  joinedAt: '',
  achievementClaims: [],
};

/** Saved data on top of the empty state, so fields added in newer versions get their defaults. */
export function mergeSaved(saved: Partial<GameState>): GameState {
  return {
    ...emptyState,
    ...saved,
    profile: { ...emptyState.profile, ...saved.profile },
    settings: { ...emptyState.settings, ...saved.settings },
  };
}

/**
 * Settings → Reset all progress: back to a brand-new player (setup questions
 * next), keeping only how the app is set up. Won looks, titles and the theme
 * go with the progress; the store-review days stay, so a reset never asks again.
 */
export function resetProgress(state: GameState): GameState {
  const s = state.settings;
  const kept: Settings = {
    ...emptyState.settings,
    quoteEmails: s.quoteEmails,
    email: s.email,
    streakReminders: s.streakReminders,
    askedNotifications: s.askedNotifications,
    shareActivity: s.shareActivity,
    profileVisibility: s.profileVisibility,
    haptics: s.haptics,
    sounds: s.sounds,
    soundStyle: s.soundStyle,
    lang: s.lang,
    lastBackup: s.lastBackup,
    reviewAsks: s.reviewAsks,
    quoteStart: s.quoteStart,
  };
  // Leave out what was never set, so saved data stays as small as before.
  for (const k of Object.keys(kept) as (keyof Settings)[]) if (kept[k] === undefined) delete kept[k];
  return { ...emptyState, settings: kept };
}

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
 * XP for a task, from how long it takes and how hard it is (effort.ts). The
 * effort comes from the library or the title, never from the player, so it
 * can't be gamed. Time grows a bit slower than linear (minutes^0.7) so very
 * long tasks don't dwarf everything else: light 5 min = 5 XP, 15 min = 15,
 * 30 min = 20, 60 min = 35, 2 h = 55, 8 h = 150; active pays x1.25, hard
 * x1.5, and willpower tasks a flat WILLPOWER_XP.
 */
export function xpFor(minutes: number, effort: Effort = 'light'): number {
  if (effort === 'willpower') return WILLPOWER_XP;
  const m = Math.min(Math.max(minutes, 1), MAX_TASK_MINUTES);
  const raw = 2 * Math.pow(m, 0.7) * EFFORT_FACTOR[effort];
  return Math.max(5, Math.round(raw / 5) * 5);
}

export function taskXp(task: Task): number {
  return xpFor(task.minutes ?? DEFAULT_MINUTES, taskEffort(task));
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return t('{n} min', { n: minutes });
  const h = minutes / 60;
  const shown = Number.isInteger(h) ? String(h) : h.toFixed(1);
  return t('{n} h', { n: lang() === 'de' ? shown.replace('.', ',') : shown });
}

const RANKS = [
  N('Rookie'), // 1-9
  N('Apprentice'), // 10-19
  N('Achiever'),
  N('Go-Getter'),
  N('Pro'),
  N('Expert'),
  N('Master'),
  N('Grandmaster'),
  N('Legend'),
  N('Mythic'), // 90-99
  N('Immortal'), // 100
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
  return t(RANKS[Math.min(Math.floor(level / 10), RANKS.length - 1)]);
}

export function totalXp(state: GameState): number {
  const sum =
    state.completions.reduce((sum, c) => sum + c.xp, 0) +
    state.claims.reduce((sum, c) => sum + c.xp, 0) +
    state.achievementClaims.reduce((sum, c) => sum + c.xp, 0) +
    (state.dailyClaims ?? []).reduce((sum, c) => sum + c.xp, 0) +
    (state.perfectDays ?? []).reduce((sum, d) => sum + d.xp, 0) +
    wheelXp(state) +
    stepXp(state) +
    (state.seasonClaims ?? []).reduce((sum, c) => sum + (c.xp ?? 0), 0) +
    (state.dev?.xp ?? 0);
  // Test XP can be below zero when a lower level was picked; the total never is.
  return Math.max(0, sum);
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
 * The fire tiers (rework picked 2026-11-01, option 1): one ladder that grows
 * with the streak's days, each step adding its XP bonus to every task.
 * Spark (tier 0) is a streak under 5 days.
 */
export const STREAK_TIERS = [
  { tier: 1, name: N('Flame'), days: 5, bonus: 0.1 },
  { tier: 2, name: N('Blaze'), days: 10, bonus: 0.2 },
  { tier: 3, name: N('Inferno'), days: 30, bonus: 0.3 },
  { tier: 4, name: N('Legend'), days: 150, bonus: 0.5 },
] as const;

/** The fire tier a streak of this many days has reached (0 = Spark). */
export function tierForDays(days: number): number {
  return STREAK_TIERS.filter((t) => days >= t.days).length;
}

/** The next fire tier and the days still needed, or undefined on Legend. */
export function nextTier(days: number): { tier: (typeof STREAK_TIERS)[number]; daysLeft: number } | undefined {
  const tier = STREAK_TIERS.find((t) => days < t.days);
  return tier && { tier, daysLeft: tier.days - days };
}

export function streakTierName(tier: number): string {
  return t(tier === 0 ? N('Spark') : STREAK_TIERS[Math.min(tier, STREAK_TIERS.length) - 1].name);
}

export interface StreakStatus {
  /** Active days in the current streak. */
  days: number;
  /** The fire: 0 Spark, 1 Flame, 2 Blaze, 3 Inferno, 4 Legend (tierForDays). */
  tier: number;
  /** Longest streak ever, in days. */
  best: number;
  /** Nothing done yet today while a streak is running. */
  atRisk: boolean;
  /** Every fire change, oldest first, for the activity timeline. */
  history: StreakChange[];
}

/**
 * A change to the streak fire: up = the streak reached a new tier, lost = a
 * missed day ended the streak. date is the day it happened; days is the streak
 * length then (for lost: right before it ended). 'down' is no longer made
 * (the old weekly tiers could drop one).
 */
export interface StreakChange {
  date: string;
  change: 'up' | 'down' | 'lost';
  tier: number;
  days: number;
}

/**
 * Replays every day since the first completion. A day with at least one task
 * done adds a day to the streak, and the fire grows with the days (tierForDays).
 * A rest day keeps everything as it is; any other missed day ends the streak.
 * Today only counts against the streak once it is over.
 */
export function streakStatus(completions: Completion[], today: string, restDays: string[] = []): StreakStatus {
  const done = new Set<string>();
  for (const c of completions) if (c.date <= today) done.add(c.date);
  const rest = new Set(restDays);
  const first = [...done].sort()[0];
  let days = 0;
  let best = 0;
  const history: StreakChange[] = [];
  if (first) {
    for (let d = first; d <= today; d = addDays(d, 1)) {
      if (done.has(d)) {
        const before = tierForDays(days);
        days++;
        best = Math.max(best, days);
        const tier = tierForDays(days);
        if (tier > before) history.push({ date: d, change: 'up', tier, days });
      } else if (rest.has(d)) {
        // A rest day keeps everything as it is.
      } else if (d !== today && days > 0) {
        history.push({ date: d, change: 'lost', tier: 0, days });
        days = 0;
      }
    }
  }
  return { days, tier: tierForDays(days), best, atRisk: days > 0 && !done.has(today) && !rest.has(today), history };
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
  // Labels in English; shown with t().
  const parts = [{ label: N('Streak'), x: 1 + streakBonus(streak) }];
  if (state.doubleDays?.includes(today)) parts.push({ label: N('Double XP'), x: 2 });
  if (comebackDaysLeft(state, today) > 0) parts.push({ label: N('Comeback'), x: 1 + COMEBACK_BONUS });
  if (state.dev?.multiplier && state.dev.multiplier !== 1) parts.push({ label: N('Test'), x: state.dev.multiplier });
  return { total: parts.reduce((t, p) => t * p.x, 1), parts, streak };
}

/** The XP bonus steps: the fire tiers' days and bonuses (1.1x from 5 days up to 1.5x from 150). */
export const STREAK_BONUSES = STREAK_TIERS.map(({ days, bonus }) => ({ days, bonus }));

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
 * "Meal prep for the week" or a "Weekly review" ("Wochenplanung" in German),
 * only make sense once.
 */
export function maxPerWeek(title: string): number {
  return /\b(week|weekly|weekend)\b/i.test(title) || /(?<!\p{L})(woche|wöchentlich)/iu.test(title) ? 1 : 7;
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
  if (plan.libraryId) task.libraryId = plan.libraryId;
  if (plan.steps) task.steps = cleanSteps(plan.steps);
  return { ...state, tasks: [...state.tasks, task] };
}

export function deleteTask(state: GameState, taskId: string): GameState {
  // Earned XP stays: deleting a task should not take away levels.
  const next = { ...state, tasks: state.tasks.filter((t) => t.id !== taskId) };
  if (state.focus?.taskId === taskId) delete next.focus;
  return next;
}

/** Puts a removed task back where it was (Undo after removing). Does nothing if it is still there. */
export function restoreTask(state: GameState, task: Task, index: number): GameState {
  if (state.tasks.some((t) => t.id === task.id)) return state;
  const tasks = [...state.tasks];
  tasks.splice(Math.max(0, Math.min(index, tasks.length)), 0, task);
  return { ...state, tasks };
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
 * the tick is refused and the state is returned unchanged, as it is for an
 * evening willpower task ticked too early in the day.
 */
/** `focusXp` is the focus timer bonus, added on top when the task is finished (see focus.ts). */
export function toggleTask(state: GameState, taskId: string, today: string, now?: number, focusXp = 0): GameState {
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
  // Willpower tasks settled in the evening wait for it (effort.ts).
  if (now !== undefined && tooEarlyToTick(task, now)) return state;

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
    xp: Math.round(xp) + focusXp,
    minutes,
    title: task.title,
  };
  if (limited) completion.limited = limited;
  if (focusXp) completion.focusXp = focusXp;
  if (now !== undefined) completion.hour = new Date(now).getHours();
  // Finishing the task ends its focus timer.
  const next = { ...state, completions: [...state.completions, completion] };
  if (state.focus?.taskId === taskId) delete next.focus;
  return next;
}

export function limitMessage(limit: Limit): string {
  switch (limit) {
    case 'daily':
      return t('Daily limit of 16 h of tasks reached');
    case 'repeat':
      return t('Done more than 5 times today: less XP');
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
  { id: 'tasks15', title: N('Finish 15 tasks this week'), icon: 'ListChecks', rewardXp: 100, target: 15, unit: N('tasks'), metric: 'tasksDone' },
  { id: 'tasks25', title: N('Finish 25 tasks this week'), icon: 'Trophy', rewardXp: 180, target: 25, unit: N('tasks'), metric: 'tasksDone' },
  { id: 'hours5', title: N('Spend 5 hours on your tasks'), icon: 'Hourglass', rewardXp: 120, target: 5, unit: N('h'), metric: 'hoursDone' },
  { id: 'hours10', title: N('Spend 10 hours on your tasks'), icon: 'Timer', rewardXp: 200, target: 10, unit: N('h'), metric: 'hoursDone' },
  { id: 'long3', title: N('Finish 3 tasks of an hour or more'), icon: 'Mountain', rewardXp: 120, target: 3, unit: N('long tasks'), metric: 'longDone' },
  { id: 'variety8', title: N('Do 8 different tasks'), icon: 'Shuffle', rewardXp: 110, target: 8, unit: N('tasks'), metric: 'variety' },
  { id: 'busy3', title: N('Finish 3 or more tasks on 3 days'), icon: 'Rocket', rewardXp: 130, target: 3, unit: N('days'), metric: 'busyDays' },
  { id: 'days5', title: N('Be active on 5 days'), icon: 'CalendarDays', rewardXp: 120, target: 5, unit: N('days'), metric: 'activeDays' },
  { id: 'days7', title: N('Be active every day this week'), icon: 'CalendarCheck', rewardXp: 200, target: 7, unit: N('days'), metric: 'activeDays' },
  { id: 'xp300', title: N('Earn 300 XP from tasks'), icon: 'Zap', rewardXp: 100, target: 300, unit: N('XP'), metric: 'xpEarned' },
  { id: 'xp600', title: N('Earn 600 XP from tasks'), icon: 'Gem', rewardXp: 180, target: 600, unit: N('XP'), metric: 'xpEarned' },
];

/** Need phone sensors or health data, so they arrive with the phone app builds. */
export const SENSOR_CHALLENGES: ChallengeDef[] = [
  { id: 'sleep8', title: N('Sleep 8 hours with your phone down'), icon: 'Moon', rewardXp: 150, target: 5, unit: N('nights') },
  { id: 'walk10', title: N('Walk 10 km this week'), icon: 'Footprints', rewardXp: 150, target: 10, unit: N('km') },
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

const WEEKDAY_NAMES = [N('Mon'), N('Tue'), N('Wed'), N('Thu'), N('Fri'), N('Sat'), N('Sun')];

/** Short weekday names, Monday first, in the current language. */
export function weekdays(): string[] {
  return WEEKDAY_NAMES.map((d) => t(d));
}

/** "Every day", "3× a week" (also used by the library, which has no task yet). */
export function perWeekLabel(n: number): string {
  if (n === 0) return t('One-time');
  if (n >= 7) return t('Every day');
  return n === 1 ? t('Once a week') : t('{n}× a week', { n });
}

export function repeatLabel(task: Task): string {
  const n = timesPerWeek(task);
  if (n === 0) return task.date ? `${t('One-time')} · ${dayLabel(task.date)}` : t('One-time');
  if (n === 7) return t('Every day');
  if (task.days?.length) {
    if (task.days.join() === '0,1,2,3,4') return t('Weekdays');
    if (task.days.join() === '5,6') return t('Weekends');
    return task.days.map((d) => weekdays()[d]).join(', ');
  }
  return perWeekLabel(n);
}

/** "Wed 23" in English, "Mi, 23." in German. */
export function dayLabel(day: string): string {
  const name = weekdays()[weekdayOf(day)];
  const date = Number(day.slice(8, 10));
  return lang() === 'de' ? `${name}, ${date}.` : `${name} ${date}`;
}

/** What Bizzy says under a task reminder; changes from day to day and task to task. */
const BIZZY_NUDGES = [N('🐝 Bizzy here: time for this one!'), N('🐝 Bizzy says: let’s get this done today.'), N('🐝 Bzzz! This one is on your list today.')];

export function bizzyNudge(day: string, taskId: string): string {
  let h = 0;
  for (const ch of day + taskId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return t(BIZZY_NUDGES[h % BIZZY_NUDGES.length]);
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
      if (at.getTime() > now.getTime()) out.push({ taskId: task.id, title: shownTitle(task.title), body: bizzyNudge(day, task.id), at });
    }
  }
  // Streak warning at 20:00 on days nothing is done yet, today and the next two.
  const streak = streakStatus(state.completions, today, restDaysOf(state));
  if (streak.days > 0 && state.settings.streakReminders !== false) {
    // A rest day already covers today.
    const doneToday = state.completions.some((c) => c.date === today) || restDaysOf(state).includes(today);
    const fire = streakTierName(streak.tier);
    const lower = streak.tier >= 2 ? streakTierName(streak.tier - 1) : '';
    for (let i = doneToday ? 1 : 0; i < 3; i++) {
      const [y, mo, d] = addDays(today, i).split('-').map(Number);
      const at = new Date(y, mo - 1, d, STREAK_REMINDER_HOUR, 0);
      if (at.getTime() <= now.getTime()) continue;
      out.push(
        i === 0
          ? {
              taskId: 'streak',
              title:
                streak.tier >= 2
                  ? t('Your {days}-day streak drops from {fire} to {lower} at midnight', { days: streak.days, fire, lower })
                  : t('Your {days}-day streak ends at midnight', { days: streak.days }),
              body: t('🐝 Bizzy is getting nervous. One task today keeps it going.'),
              at,
            }
          : { taskId: 'streak', title: t('Keep your streak alive'), body: t('🐝 Bizzy misses you. One task is enough.'), at },
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

/** The player's name as shown: the placeholder name in the current language. */
export function shownName(name: string): string {
  return name === DEFAULT_NAME ? t(DEFAULT_NAME) : name;
}

export function setName(state: GameState, name: string): GameState {
  return { ...state, profile: { ...state.profile, name: name.slice(0, 24) } };
}

/** Counts one tap on Bizzy. */
export function tapBizzy(state: GameState): GameState {
  return { ...state, bizzyTaps: (state.bizzyTaps ?? 0) + 1 };
}

/** Bizzy evolves one form, if the player's level allows it; otherwise the state stays as it is. */
export function evolveBizzy(state: GameState): GameState {
  const form = bizzyFormOf(state.bizzyForm).n;
  if (!canEvolve(form, levelInfo(totalXp(state)).level)) return state;
  return { ...state, bizzyForm: form + 1 };
}
