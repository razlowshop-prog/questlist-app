// Pure game rules: XP, levels, ranks and streaks. No React or storage here,
// so everything in this file can be unit tested.

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Task {
  id: string;
  title: string;
  difficulty: Difficulty;
  /** Daily tasks come back every day; one-off tasks disappear once done. */
  daily: boolean;
  createdAt: string;
}

export interface Completion {
  taskId: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** XP actually awarded, including any streak bonus. */
  xp: number;
  /** Kept so challenges still count a task after it is deleted. */
  difficulty?: Difficulty;
}

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
}

export const emptyState: GameState = {
  tasks: [],
  completions: [],
  claims: [],
  profile: { name: 'Player' },
};

export const BASE_XP: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 40,
};

const RANKS = [
  'Rookie',
  'Apprentice',
  'Achiever',
  'Go-Getter',
  'Pro',
  'Expert',
  'Master',
  'Grandmaster',
  'Legend',
];

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

/** XP needed to go from `level` to `level + 1`. Grows by 50 each level. */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 50;
}

export function levelInfo(totalXp: number) {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  const needed = xpToNext(level);
  return {
    level,
    rank: rankFor(level),
    xpIntoLevel: remaining,
    xpForLevel: needed,
    progress: remaining / needed,
  };
}

/** A new rank every 5 levels; stays at the top rank after that. */
export function rankFor(level: number): string {
  return RANKS[Math.min(Math.floor((level - 1) / 5), RANKS.length - 1)];
}

export function totalXp(state: GameState): number {
  return (
    state.completions.reduce((sum, c) => sum + c.xp, 0) +
    state.claims.reduce((sum, c) => sum + c.xp, 0)
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

/** Tasks to show today: all daily tasks plus one-offs not finished on an earlier day. */
export function visibleTasks(state: GameState, today: string): Task[] {
  return state.tasks.filter((t) => {
    if (t.daily) return true;
    const done = state.completions.find((c) => c.taskId === t.id);
    return !done || done.date === today;
  });
}

export function addTask(
  state: GameState,
  title: string,
  difficulty: Difficulty,
  daily: boolean,
  id: string = Math.random().toString(36).slice(2),
): GameState {
  const trimmed = title.trim();
  if (!trimmed) return state;
  const task: Task = { id, title: trimmed, difficulty, daily, createdAt: new Date().toISOString() };
  return { ...state, tasks: [...state.tasks, task] };
}

export function deleteTask(state: GameState, taskId: string): GameState {
  // Earned XP stays: deleting a task should not take away levels.
  return { ...state, tasks: state.tasks.filter((t) => t.id !== taskId) };
}

/**
 * Tick or untick a task for today. Ticking awards base XP plus the streak
 * bonus (the streak includes today). Unticking removes exactly what was given.
 */
export function toggleTask(state: GameState, taskId: string, today: string): GameState {
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

  const streakWithToday = currentStreak(
    [...state.completions, { taskId, date: today, xp: 0 }],
    today,
  );
  const base = BASE_XP[task.difficulty];
  const xp = Math.round(base * (1 + streakBonus(streakWithToday)));
  return {
    ...state,
    completions: [...state.completions, { taskId, date: today, xp, difficulty: task.difficulty }],
  };
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
  icon: string;
  rewardXp: number;
  target: number;
  unit: string;
  /** Measured from tasks in the app. Undefined = needs phone sensors (coming soon). */
  metric?: keyof WeekStats;
}

export const CHALLENGE_POOL: ChallengeDef[] = [
  { id: 'tasks15', title: 'Finish 15 tasks this week', icon: '✅', rewardXp: 100, target: 15, unit: 'tasks', metric: 'tasksDone' },
  { id: 'tasks25', title: 'Finish 25 tasks this week', icon: '🏆', rewardXp: 180, target: 25, unit: 'tasks', metric: 'tasksDone' },
  { id: 'hard3', title: 'Complete 3 hard tasks', icon: '💪', rewardXp: 90, target: 3, unit: 'hard tasks', metric: 'hardDone' },
  { id: 'hard5', title: 'Complete 5 hard tasks', icon: '🔥', rewardXp: 150, target: 5, unit: 'hard tasks', metric: 'hardDone' },
  { id: 'days5', title: 'Be active on 5 days', icon: '📅', rewardXp: 120, target: 5, unit: 'days', metric: 'activeDays' },
  { id: 'days7', title: 'Be active every day this week', icon: '⭐', rewardXp: 200, target: 7, unit: 'days', metric: 'activeDays' },
  { id: 'xp300', title: 'Earn 300 XP from tasks', icon: '⚡', rewardXp: 100, target: 300, unit: 'XP', metric: 'xpEarned' },
];

/** Need phone sensors or health data, so they arrive with the phone app builds. */
export const SENSOR_CHALLENGES: ChallengeDef[] = [
  { id: 'sleep8', title: 'Sleep 8 hours with your phone down', icon: '😴', rewardXp: 150, target: 5, unit: 'nights' },
  { id: 'walk10', title: 'Walk 10 km this week', icon: '🚶', rewardXp: 150, target: 10, unit: 'km' },
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

// ---------- profile & badges ----------

export interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
  earned: boolean;
}

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

export function badges(state: GameState, today: string): Badge[] {
  const s = profileStats(state, today);
  const b = (id: string, icon: string, title: string, description: string, earned: boolean): Badge => ({
    id, icon, title, description, earned,
  });
  return [
    b('first', '🌱', 'First Step', 'Finish your first task', s.tasksDone >= 1),
    b('tasks10', '✅', 'Getting Things Done', 'Finish 10 tasks', s.tasksDone >= 10),
    b('tasks100', '💯', 'Centurion', 'Finish 100 tasks', s.tasksDone >= 100),
    b('streak3', '🔥', 'On Fire', 'Reach a 3-day streak', s.bestStreak >= 3),
    b('streak7', '📆', 'Full Week', 'Reach a 7-day streak', s.bestStreak >= 7),
    b('streak30', '👑', 'Unstoppable', 'Reach a 30-day streak', s.bestStreak >= 30),
    b('level5', '⭐', 'Rising Star', 'Reach level 5', s.level >= 5),
    b('level10', '🚀', 'High Flyer', 'Reach level 10', s.level >= 10),
    b('challenge1', '🎯', 'Challenger', 'Win a weekly challenge', s.challengesWon >= 1),
    b('challenge10', '🏅', 'Champion', 'Win 10 weekly challenges', s.challengesWon >= 10),
  ];
}

export function setName(state: GameState, name: string): GameState {
  return { ...state, profile: { ...state.profile, name: name.slice(0, 24) } };
}
