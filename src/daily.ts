import { DEFAULT_MINUTES, type GameState } from './game.ts';
import type { IconName } from './icons.ts';

// Two small challenges a day, the same for everyone, reset at midnight. They
// only count tasks finished today, and pay a little XP when claimed.

export interface DayStats {
  tasksDone: number;
  xpEarned: number;
  /** Tasks of 20 minutes or more. */
  focusDone: number;
  /** Different task titles. */
  variety: number;
  /** Tasks ticked before noon. */
  morningDone: number;
  /** Tasks ticked before 9:00. */
  earlyDone: number;
}

export interface DailyDef {
  id: string;
  title: string;
  icon: IconName;
  rewardXp: number;
  target: number;
  unit: string;
  metric: keyof DayStats;
  /** Can only be done before this hour. */
  untilHour?: number;
}

export const DAILY_POOL: DailyDef[] = [
  { id: 'tasks3', title: 'Finish 3 tasks today', icon: 'ListChecks', rewardXp: 20, target: 3, unit: 'tasks', metric: 'tasksDone' },
  { id: 'focus20', title: 'Finish a task of 20 minutes or more', icon: 'Timer', rewardXp: 15, target: 1, unit: 'task', metric: 'focusDone' },
  { id: 'morning2', title: 'Finish 2 tasks before noon', icon: 'Sun', rewardXp: 25, target: 2, unit: 'tasks', metric: 'morningDone', untilHour: 12 },
  { id: 'variety3', title: 'Do 3 different tasks', icon: 'Shuffle', rewardXp: 20, target: 3, unit: 'tasks', metric: 'variety' },
  { id: 'xp60', title: 'Earn 60 XP from tasks', icon: 'Zap', rewardXp: 25, target: 60, unit: 'XP', metric: 'xpEarned' },
  { id: 'early1', title: 'Finish a task before 9:00', icon: 'Rocket', rewardXp: 20, target: 1, unit: 'task', metric: 'earlyDone', untilHour: 9 },
  { id: 'tasks5', title: 'Finish 5 tasks today', icon: 'Trophy', rewardXp: 30, target: 5, unit: 'tasks', metric: 'tasksDone' },
];

export function dayStats(state: Pick<GameState, 'completions'>, today: string): DayStats {
  const todays = state.completions.filter((c) => c.date === today);
  return {
    tasksDone: todays.length,
    xpEarned: todays.reduce((sum, c) => sum + c.xp, 0),
    focusDone: todays.filter((c) => (c.minutes ?? DEFAULT_MINUTES) >= 20).length,
    variety: new Set(todays.map((c) => (c.title ?? c.taskId).trim().toLowerCase())).size,
    morningDone: todays.filter((c) => c.hour !== undefined && c.hour < 12).length,
    earlyDone: todays.filter((c) => c.hour !== undefined && c.hour < 9).length,
  };
}

/** Today's two challenges: they measure different things, and at most one has a deadline. */
export function dailyChallengesFor(day: string): DailyDef[] {
  const [y, m, d] = day.split('-').map(Number);
  const dayNumber = Math.round(Date.UTC(y, m - 1, d) / 86400000);
  const n = DAILY_POOL.length;
  const picks: DailyDef[] = [];
  // 3 shares no factor with the pool size, so every pair comes round.
  for (let i = 0; picks.length < 2 && i < n; i++) {
    const c = DAILY_POOL[(dayNumber * 3 + i) % n];
    if (picks.some((p) => p.metric === c.metric || (p.untilHour !== undefined && c.untilHour !== undefined))) continue;
    picks.push(c);
  }
  return picks;
}

export interface DailyStatus {
  def: DailyDef;
  progress: number;
  complete: boolean;
  claimed: boolean;
  /** The deadline passed before it was done. */
  ended: boolean;
}

/** `hour` is the current local hour, for the challenges with a deadline. */
export function dailyChallenges(state: GameState, today: string, hour: number): DailyStatus[] {
  const stats = dayStats(state, today);
  return dailyChallengesFor(today).map((def) => {
    const progress = Math.min(stats[def.metric], def.target);
    const complete = progress >= def.target;
    return {
      def,
      progress,
      complete,
      claimed: (state.dailyClaims ?? []).some((c) => c.challengeId === def.id && c.date === today),
      ended: !complete && def.untilHour !== undefined && hour >= def.untilHour,
    };
  });
}

export function claimDaily(state: GameState, challengeId: string, today: string, hour: number): GameState {
  const status = dailyChallenges(state, today, hour).find((c) => c.def.id === challengeId);
  if (!status || !status.complete || status.claimed) return state;
  return { ...state, dailyClaims: [...(state.dailyClaims ?? []), { challengeId, date: today, xp: status.def.rewardXp }] };
}
