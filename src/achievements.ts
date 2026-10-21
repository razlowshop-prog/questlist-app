import type { IconName } from './icons.ts';
import { APP_NAME } from './brand.ts';
import {
  levelInfo,
  longestStreak,
  MAX_LEVEL,
  totalXp,
  weekStart,
  xpToNext,
  type GameState,
} from './game.ts';

// Long-term achievements. Each has several tiers; reaching a tier lets the
// player claim bonus XP, and some tiers also unlock a reward.

export type RewardKind = 'theme' | 'title' | 'adfree' | 'premium';

export interface Reward {
  kind: RewardKind;
  label: string;
}

export interface Tier {
  goal: number;
  xp: number;
  reward?: Reward;
}

export interface AchievementDef {
  id: string;
  icon: IconName;
  title: string;
  /** Shown under the title for the tier being worked on. */
  description: (goal: number) => string;
  unit: string;
  tiers: Tier[];
  value: (state: GameState, today: string) => number;
}

export const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Legend'];
/** Muted metal tones that sit well on the dark brass look and stay distinct. */
export const TIER_COLORS = ['#C08A5B', '#BDB7AE', '#D4B27A', '#D9D4CA', '#A9C6D0', '#B7A6D6', '#E0A08C'];
/** Deeper versions of the same tones, readable on the light themes. */
export const TIER_COLORS_LIGHT = ['#8A5A2E', '#6B6660', '#8A6A33', '#6E6A62', '#3F6E7D', '#6A5594', '#A0523A'];

export function tierColor(tier: number, dark: boolean): string {
  return (dark ? TIER_COLORS : TIER_COLORS_LIGHT)[tier];
}

const theme = (label: string): Reward => ({ kind: 'theme', label: `${label} theme` });
const title = (label: string): Reward => ({ kind: 'title', label: `"${label}" title` });

/** Most completions on any single day. */
export function bestDay(state: GameState): number {
  const perDay = new Map<string, number>();
  for (const c of state.completions) perDay.set(c.date, (perDay.get(c.date) ?? 0) + 1);
  return Math.max(0, ...perDay.values());
}

/** Most completions in any Monday-to-Sunday week. */
export function bestWeek(state: GameState): number {
  const perWeek = new Map<string, number>();
  for (const c of state.completions) {
    const w = weekStart(c.date);
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
  }
  return Math.max(0, ...perWeek.values());
}

/** Most XP earned from a single task completion. */
export function bestTaskXp(state: GameState): number {
  return Math.max(0, ...state.completions.map((c) => c.xp));
}

/** Full calendar months since joining (e.g. 15 Jan -> 15 Mar = 2). */
export function monthsSince(from: string, today: string): number {
  if (!from) return 0;
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) months--;
  return Math.max(0, months);
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'tasks',
    icon: 'ListChecks',
    title: 'Task Master',
    description: (g) => `Complete ${g} ${g === 1 ? 'task' : 'tasks'} in total`,
    unit: 'tasks',
    value: (s) => s.completions.length,
    tiers: [
      { goal: 1, xp: 10 },
      { goal: 10, xp: 25 },
      { goal: 50, xp: 60 },
      { goal: 100, xp: 100, reward: theme('Forest') },
      { goal: 250, xp: 200 },
      { goal: 500, xp: 350, reward: title('Unstoppable') },
      { goal: 1000, xp: 600, reward: { kind: 'adfree', label: '1 month ad-free' } },
    ],
  },
  {
    id: 'bestDay',
    icon: 'Zap',
    title: 'Power Day',
    description: (g) => `Complete ${g} tasks in one day`,
    unit: 'tasks in a day',
    value: bestDay,
    tiers: [
      { goal: 3, xp: 15 },
      { goal: 5, xp: 30 },
      { goal: 10, xp: 75 },
      { goal: 15, xp: 150, reward: theme('Thunder') },
      { goal: 20, xp: 250, reward: title('Machine') },
    ],
  },
  {
    id: 'bestWeek',
    icon: 'CalendarDays',
    title: 'Power Week',
    description: (g) => `Complete ${g} tasks in one week`,
    unit: 'tasks in a week',
    value: bestWeek,
    tiers: [
      { goal: 10, xp: 25 },
      { goal: 25, xp: 60 },
      { goal: 50, xp: 120 },
      { goal: 75, xp: 200, reward: theme('Ocean') },
      { goal: 100, xp: 300, reward: title('Relentless') },
    ],
  },
  {
    id: 'bigTask',
    icon: 'Weight',
    title: 'Heavy Lifter',
    description: (g) => `Earn ${g} XP from a single task`,
    unit: 'XP in one task',
    value: bestTaskXp,
    tiers: [
      { goal: 20, xp: 15 },
      { goal: 40, xp: 30 },
      { goal: 60, xp: 60 },
      { goal: 90, xp: 120, reward: title('Marathoner') },
      { goal: 120, xp: 200, reward: theme('Summit') },
    ],
  },
  {
    id: 'member',
    icon: 'Cake',
    title: 'Member Since',
    description: (g) => `Stay with ${APP_NAME} for ${g} ${g === 1 ? 'month' : 'months'}`,
    unit: 'months',
    value: (s, today) => monthsSince(s.joinedAt, today),
    tiers: [
      { goal: 1, xp: 50, reward: theme('Sunset') },
      { goal: 3, xp: 150, reward: title('Regular') },
      { goal: 6, xp: 300, reward: { kind: 'adfree', label: '1 week ad-free' } },
      { goal: 12, xp: 750, reward: { kind: 'premium', label: '1 month Premium for free' } },
    ],
  },
  {
    id: 'streak',
    icon: 'Flame',
    title: 'On Fire',
    description: (g) => `Reach a ${g}-day streak`,
    unit: 'days in a row',
    value: (s) => longestStreak(s.completions),
    tiers: [
      { goal: 3, xp: 20 },
      { goal: 7, xp: 50 },
      { goal: 14, xp: 100 },
      { goal: 30, xp: 250, reward: theme('Ember') },
      { goal: 100, xp: 750, reward: title('Eternal Flame') },
    ],
  },
  {
    id: 'level',
    icon: 'Award',
    title: 'Climber',
    description: (g) => `Reach level ${g}`,
    unit: 'level',
    // Achievement XP is left out so claiming can't feed itself.
    value: (s) => levelInfo(totalXp({ ...s, achievementClaims: [] })).level,
    tiers: [
      { goal: 5, xp: 25 },
      { goal: 10, xp: 75, reward: theme('Midnight') },
      { goal: 25, xp: 200 },
      { goal: 50, xp: 500, reward: { kind: 'premium', label: '1 month Premium for free' } },
      { goal: 100, xp: 2000, reward: title('Immortal') },
    ],
  },
  {
    id: 'challenges',
    icon: 'Target',
    title: 'Challenger',
    description: (g) => `Win ${g} weekly ${g === 1 ? 'challenge' : 'challenges'}`,
    unit: 'challenges',
    value: (s) => s.claims.length,
    tiers: [
      { goal: 1, xp: 25 },
      { goal: 5, xp: 75 },
      { goal: 10, xp: 150, reward: theme('Gold') },
      { goal: 25, xp: 400, reward: title('Champion') },
    ],
  },
];

export interface AchievementStatus {
  def: AchievementDef;
  value: number;
  /** Number of tiers whose goal is reached. */
  reached: number;
  /** Number of tiers already claimed. */
  claimed: number;
  /** The next tier to work towards, if any. */
  next?: Tier;
}

export function achievementStatuses(state: GameState, today: string): AchievementStatus[] {
  return ACHIEVEMENTS.map((def) => {
    const value = def.value(state, today);
    const reached = def.tiers.filter((t) => value >= t.goal).length;
    const claimed = state.achievementClaims.filter((c) => c.achievementId === def.id).length;
    return { def, value, reached, claimed, next: def.tiers[reached] };
  });
}

export function claimableCount(state: GameState, today: string): number {
  return achievementStatuses(state, today).reduce((n, a) => n + (a.reached - a.claimed), 0);
}

/** Claims the lowest reached-but-unclaimed tier. Returns the state and what was won. */
export function claimAchievement(
  state: GameState,
  achievementId: string,
  today: string,
): { state: GameState; tier?: Tier } {
  const status = achievementStatuses(state, today).find((a) => a.def.id === achievementId);
  if (!status || status.claimed >= status.reached) return { state };
  const tier = status.def.tiers[status.claimed];
  return {
    state: {
      ...state,
      achievementClaims: [...state.achievementClaims, { achievementId, tier: status.claimed, xp: tier.xp }],
    },
    tier,
  };
}

/** All rewards unlocked by claimed tiers, newest last. */
export function unlockedRewards(state: GameState): Reward[] {
  return state.achievementClaims.flatMap((c) => {
    const reward = ACHIEVEMENTS.find((a) => a.id === c.achievementId)?.tiers[c.tier]?.reward;
    return reward ? [reward] : [];
  });
}

/** A level that pays out: the Climber tier for it (bonus XP, maybe a reward). */
export interface LevelMilestone {
  level: number;
  bonusXp: number;
  reward?: Reward;
}

export const LEVEL_MILESTONES: LevelMilestone[] = ACHIEVEMENTS.find((a) => a.id === 'level')!.tiers.map((t) => ({
  level: t.goal,
  bonusXp: t.xp,
  reward: t.reward,
}));

export interface NextLevelReward {
  /** The levels after the current one up to and including the milestone; empty ones have no milestone. */
  levels: { level: number; milestone?: LevelMilestone }[];
  milestone: LevelMilestone;
  /** XP since the start of the current level, and the XP from that point to the milestone level. */
  xpInto: number;
  xpNeeded: number;
}

/**
 * What the player is working towards: the next level with a reward and how
 * far away it is, counted from the start of the current level (so at 500/600
 * on the way to level 7 it reads 500/1000 when level 10 is the next reward).
 * Undefined once no milestone is left.
 */
export function nextLevelReward(xp: number): NextLevelReward | undefined {
  const info = levelInfo(xp);
  const milestone = LEVEL_MILESTONES.find((m) => m.level > info.level);
  if (!milestone || info.maxed) return undefined;
  let xpNeeded = 0;
  for (let l = info.level; l < milestone.level && l < MAX_LEVEL; l++) xpNeeded += xpToNext(l);
  const levels: NextLevelReward['levels'] = [];
  for (let l = info.level + 1; l <= milestone.level; l++) {
    levels.push({ level: l, milestone: LEVEL_MILESTONES.find((m) => m.level === l) });
  }
  return { levels, milestone, xpInto: info.xpIntoLevel, xpNeeded };
}
