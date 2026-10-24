import type { IconName } from './icons.ts';
import { APP_NAME } from './brand.ts';
import { ownsWheelTheme, WHEEL_THEME_REWARD } from './wheel.ts';
import { CELEBRATIONS, FLAME_STYLES, FRAMES, type CelebrationId, type FlameStyleId, type LevelFrameId } from './cosmetics.ts';
import {
  levelInfo,
  longestStreak,
  MAX_LEVEL,
  restDaysOf,
  totalXp,
  weekStart,
  xpToNext,
  type GameState,
} from './game.ts';

// Long-term achievements. Each has several tiers; reaching a tier lets the
// player claim bonus XP, and some tiers also unlock a reward.

export type RewardKind = 'theme' | 'title' | 'adfree' | 'premium' | 'token' | 'frame' | 'flame' | 'celebration';

/**
 * One-time boosts: rest = a day off that keeps the streak, double = 2x XP for
 * a day, reroll = swap a weekly challenge, adfree = a day without ads.
 */
export type TokenKind = 'rest' | 'double' | 'reroll' | 'adfree';

export interface Reward {
  kind: RewardKind;
  label: string;
  /** For kind 'token'. */
  token?: TokenKind;
  count?: number;
  /** For kinds 'frame', 'flame' and 'celebration': the look's id. */
  item?: string;
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
const TOKEN_NAMES: Record<TokenKind, [string, string]> = {
  rest: ['Rest day token', 'Rest day tokens'],
  double: ['Double XP token', 'Double XP tokens'],
  reroll: ['Challenge swap', 'Challenge swaps'],
  adfree: ['Ad-free day', 'Ad-free days'],
};
const token = (kind: TokenKind, count = 1): Reward => ({
  kind: 'token',
  token: kind,
  count,
  label: count === 1 ? TOKEN_NAMES[kind][0] : `${count} ${TOKEN_NAMES[kind][1]}`,
});
const frame = (id: LevelFrameId): Reward => ({ kind: 'frame', item: id, label: `${FRAMES.find((f) => f.id === id)!.name} frame` });
const flame = (id: FlameStyleId): Reward => ({ kind: 'flame', item: id, label: `${FLAME_STYLES.find((f) => f.id === id)!.name} flame` });
const celebration = (id: CelebrationId): Reward => ({
  kind: 'celebration',
  item: id,
  label: `${CELEBRATIONS.find((c) => c.id === id)!.name} celebration`,
});

/** The level whose ladder reward is this look, for "Lvl N" on locked items. */
export function levelForLook(kind: 'frame' | 'flame' | 'celebration' | 'title', item: string): number | undefined {
  return LEVEL_LADDER.find((l) => l.reward.kind === kind && (l.reward.item === item || l.reward.label === item))?.level;
}

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
      { goal: 250, xp: 200, reward: theme('Notepad') },
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
    value: (s) => longestStreak(s.completions, restDaysOf(s)),
    tiers: [
      { goal: 3, xp: 20 },
      { goal: 7, xp: 50 },
      { goal: 14, xp: 100, reward: theme('Gym') },
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
    // The level shown in the header, so a level's reward is ready the moment it is reached.
    value: (s) => levelInfo(totalXp(s)).level,
    tiers: [
      { goal: 5, xp: 25 },
      { goal: 10, xp: 75, reward: theme('Midnight') },
      { goal: 25, xp: 200, reward: theme('Neon') },
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
      achievementClaims: [...state.achievementClaims, { achievementId, tier: status.claimed, xp: tier.xp, date: today }],
    },
    tier,
  };
}

/** Levels whose reward is a look or a title rather than a token. */
const SPECIAL_REWARDS: Record<number, Reward> = {
  5: title('Rising Star'),
  6: frame('ring'),
  8: flame('outline'),
  12: frame('double'),
  14: celebration('confetti'),
  15: title('Steady'),
  16: flame('solid'),
  18: frame('dotted'),
  20: title('Trailblazer'),
  24: frame('hex'),
  26: flame('kindling'),
  28: celebration('ink'),
  30: title('Relentless'),
  32: frame('rays'),
  34: frame('platinum'),
  36: flame('twin'),
  40: title('Vanguard'),
  42: frame('laurel'),
  46: celebration('embers'),
  48: frame('titanium'),
  52: frame('stars'),
  55: flame('glow'),
  60: title('Paragon'),
  63: celebration('starfall'),
  65: frame('diamond'),
  70: title('Titan'),
  75: flame('sparks'),
  77: frame('ember'),
  80: title('Mythic'),
  88: frame('crown'),
  90: title('Legend'),
};
/** An ad-free day every 7 levels or so (they start to matter once the free version shows ads). */
const ADFREE_LEVELS = [11, 22, 33, 45, 58, 68, 85, 95];
/** Levels whose reward belongs to the Climber achievement (Midnight theme, Premium, Immortal). */
const CLIMBER_REWARD_LEVELS = [10, 50, 100];

/**
 * A reward on every level from 2 to 100, on top of the Climber achievement
 * (bonus XP at 5, 10, 25, 50 and 100). Titles every 10 levels, frames,
 * flame styles and celebrations in between, ad-free days now and then, and the rest are
 * rest day, double XP and challenge swap tokens in turn (two at a time from
 * level 50). Nothing here costs real money.
 */
export const LEVEL_LADDER: { level: number; reward: Reward }[] = (() => {
  const cycle: TokenKind[] = ['rest', 'double', 'reroll'];
  const out: { level: number; reward: Reward }[] = [];
  let next = 0;
  for (let level = 2; level < MAX_LEVEL; level++) {
    if (CLIMBER_REWARD_LEVELS.includes(level)) continue;
    const special = SPECIAL_REWARDS[level];
    if (special) out.push({ level, reward: special });
    else if (ADFREE_LEVELS.includes(level)) out.push({ level, reward: token('adfree', level >= 50 ? 2 : 1) });
    else out.push({ level, reward: token(cycle[next++ % cycle.length], level >= 50 ? 2 : 1) });
  }
  return out;
})();

/** All rewards unlocked by claimed tiers and reached levels. */
export function unlockedRewards(state: GameState): Reward[] {
  const fromAchievements = state.achievementClaims.flatMap((c) => {
    const reward = ACHIEVEMENTS.find((a) => a.id === c.achievementId)?.tiers[c.tier]?.reward;
    return reward ? [reward] : [];
  });
  const reached = new Set(state.levelRewards ?? []);
  const fromWheel: Reward[] = ownsWheelTheme(state) ? [{ kind: 'theme', label: WHEEL_THEME_REWARD }] : [];
  return [...fromAchievements, ...LEVEL_LADDER.filter((l) => reached.has(l.level)).map((l) => l.reward), ...fromWheel];
}

/** Hands out the ladder rewards for every level up to `level` not given yet. Levels lost by unticking keep theirs. */
export function grantLevelRewards(state: GameState, level: number): GameState {
  const given = new Set(state.levelRewards ?? []);
  const due = LEVEL_LADDER.filter((l) => l.level <= level && !given.has(l.level)).map((l) => l.level);
  return due.length ? { ...state, levelRewards: [...(state.levelRewards ?? []), ...due] } : state;
}

/** A level that pays out: a ladder reward, and at Climber levels bonus XP to claim. */
export interface LevelMilestone {
  level: number;
  /** Climber bonus XP, 0 on other levels. */
  bonusXp: number;
  reward?: Reward;
  /** Index of the Climber tier for this level, if there is one. */
  climberTier?: number;
}

const CLIMBER_TIERS = ACHIEVEMENTS.find((a) => a.id === 'level')!.tiers;

export const LEVEL_MILESTONES: LevelMilestone[] = [
  ...new Set([...CLIMBER_TIERS.map((t) => t.goal), ...LEVEL_LADDER.map((l) => l.level)]),
]
  .sort((a, b) => a - b)
  .map((level) => {
    const climberTier = CLIMBER_TIERS.findIndex((t) => t.goal === level);
    const climber = CLIMBER_TIERS[climberTier];
    const reward = climber?.reward ?? LEVEL_LADDER.find((l) => l.level === level)?.reward;
    return { level, bonusXp: climber?.xp ?? 0, ...(reward && { reward }), ...(climber && { climberTier }) };
  });

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
