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
}

export interface GameState {
  tasks: Task[];
  completions: Completion[];
}

export const emptyState: GameState = { tasks: [], completions: [] };

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
  return state.completions.reduce((sum, c) => sum + c.xp, 0);
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
  return { ...state, completions: [...state.completions, { taskId, date: today, xp }] };
}
