import type { IconName } from './icons.ts';

// Pure game rules: XP, levels, ranks and streaks. No React or storage here,
// so everything in this file can be unit tested.

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Task {
  id: string;
  title: string;
  difficulty: Difficulty;
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
  createdAt: string;
}

/** Extra scheduling for a new task. */
export interface TaskPlan {
  days?: number[];
  date?: string;
  reminder?: string;
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
}

export interface AchievementClaim {
  achievementId: string;
  /** 0-based tier index. */
  tier: number;
  xp: number;
}

export interface Settings {
  /** Opted in to a daily motivational quote by email. */
  quoteEmails: boolean;
  email: string;
  /** Selected colour theme id. */
  theme: string;
}

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

/** Fixed XP for tasks saved before XP was based on time. */
export const BASE_XP: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 40,
};

/** A new rank every 10 levels; level 100 is the final rank. */
export const EFFORT_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.25,
  hard: 1.5,
};

/** Time options offered when adding a task, in minutes. */
export const DURATIONS = [5, 15, 30, 60, 90, 120, 180, 240, 480];

/**
 * XP for a task, based on how long it takes and how demanding it is.
 * Grows a bit slower than time (minutes^0.7) so very long tasks
 * don't dwarf everything else: 5 min easy = 5 XP, 15 min = 10,
 * 30 min = 20, 60 min = 30, 2 h = 45. Hard effort gives 1.5x.
 */
export function xpFor(minutes: number, difficulty: Difficulty): number {
  const m = Math.min(Math.max(minutes, 1), MAX_TASK_MINUTES);
  const raw = 1.62 * Math.pow(m, 0.7) * EFFORT_MULTIPLIER[difficulty];
  return Math.max(5, Math.round(raw / 5) * 5);
}

export function taskXp(task: Task): number {
  return task.minutes ? xpFor(task.minutes, task.difficulty) : BASE_XP[task.difficulty];
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
    state.achievementClaims.reduce((sum, c) => sum + c.xp, 0)
  );
}

// ---------- streaks ----------

/**
 * Days in a row with at least one completed task, ending today.
 * If nothing is done yet today, a streak that ran until yesterday still
 * counts: it only breaks once a whole day has been missed.
 */
export function currentStreak(completions: Completion[], today: string): number {
  const days = new Set(completions.map((c) => c.date));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Streak bonus as a fraction of base XP, e.g. 0.25 = +25 %. */
export function streakBonus(streak: number): number {
  if (streak >= 30) return 0.5;
  if (streak >= 14) return 0.35;
  if (streak >= 7) return 0.25;
  if (streak >= 3) return 0.1;
  return 0;
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

export function addTask(
  state: GameState,
  title: string,
  difficulty: Difficulty,
  repeat: Repeat,
  id: string = Math.random().toString(36).slice(2),
  minutes?: number,
  plan: TaskPlan = {},
): GameState {
  const trimmed = title.trim();
  if (!trimmed) return state;
  const task: Task = { id, title: trimmed, difficulty, daily: repeat !== false, createdAt: new Date().toISOString() };
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

  const streakWithToday = currentStreak(
    [...state.completions, { taskId, date: today, xp: 0 }],
    today,
  );
  const base = taskXp(task);
  let xp = base * (1 + streakBonus(streakWithToday));
  let limited: Limit | undefined;

  const todays = state.completions.filter((c) => c.date === today);
  const sameTitle = todays.filter((c) => c.title?.toLowerCase() === task.title.toLowerCase()).length;
  const repeatFactor = REPEAT_FACTORS[Math.min(sameTitle, REPEAT_FACTORS.length - 1)];
  if (repeatFactor < 1) {
    xp *= repeatFactor;
    limited = 'repeat';
  }

  const minutes = Math.min(task.minutes ?? 15, MAX_TASK_MINUTES);
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
    difficulty: task.difficulty,
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

export function longestStreak(completions: Completion[]): number {
  const days = [...new Set(completions.map((c) => c.date))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

// ---------- weekly challenges ----------

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = (new Date(y, m - 1, d, 12).getDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

export interface WeekStats {
  tasksDone: number;
  hardDone: number;
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
    hardDone: inWeek.filter((c) => c.difficulty === 'hard').length,
    activeDays: new Set(inWeek.map((c) => c.date)).size,
    xpEarned: inWeek.reduce((sum, c) => sum + c.xp, 0),
  };
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
  { id: 'hard3', title: 'Complete 3 hard tasks', icon: 'Mountain', rewardXp: 90, target: 3, unit: 'hard tasks', metric: 'hardDone' },
  { id: 'hard5', title: 'Complete 5 hard tasks', icon: 'MountainSnow', rewardXp: 150, target: 5, unit: 'hard tasks', metric: 'hardDone' },
  { id: 'days5', title: 'Be active on 5 days', icon: 'CalendarDays', rewardXp: 120, target: 5, unit: 'days', metric: 'activeDays' },
  { id: 'days7', title: 'Be active every day this week', icon: 'CalendarCheck', rewardXp: 200, target: 7, unit: 'days', metric: 'activeDays' },
  { id: 'xp300', title: 'Earn 300 XP from tasks', icon: 'Zap', rewardXp: 100, target: 300, unit: 'XP', metric: 'xpEarned' },
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

export function weeklyChallenges(state: GameState, today: string): ChallengeStatus[] {
  const week = weekStart(today);
  const stats = weekStats(state, today);
  return challengesForWeek(week).map((def) => {
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
    claims: [...state.claims, { challengeId, week: weekStart(today), xp: status.def.rewardXp }],
  };
}

// ---------- profile ----------

export function profileStats(state: GameState, today: string) {
  const xp = totalXp(state);
  return {
    ...levelInfo(xp),
    totalXp: xp,
    tasksDone: state.completions.length,
    currentStreak: currentStreak(state.completions, today),
    bestStreak: longestStreak(state.completions),
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
  taskId: string;
  title: string;
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
