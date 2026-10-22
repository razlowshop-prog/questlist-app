import { monthsSince } from './achievements.ts';
import { DEFAULT_MINUTES, levelInfo, restDaysOf, streakStatus, totalXp, type GameState } from './game.ts';
import type { IconName } from './icons.ts';
import { guessCategory } from './library.ts';

// Trophies: a few rare, long-term feats for the profile's trophy cabinet.
// Unlike achievements they have one goal each, give no XP, and most take
// months of steady work.

export type Rarity = 'rare' | 'epic' | 'legendary';

export interface TrophyDef {
  id: string;
  name: string;
  /** How it is earned, shown when the trophy is tapped. */
  description: string;
  icon: IconName;
  rarity: Rarity;
  target: number;
  unit: string;
  value: (state: GameState, today: string) => number;
}

const minutesOf = (s: GameState) => s.completions.map((c) => c.minutes ?? DEFAULT_MINUTES);

export const TROPHIES: TrophyDef[] = [
  {
    id: 'ironWill',
    name: 'Iron Will',
    description: 'Keep a streak going for 100 days.',
    icon: 'Flame',
    rarity: 'epic',
    target: 100,
    unit: 'days',
    value: (s, today) => streakStatus(s.completions, today, restDaysOf(s)).best,
  },
  {
    id: 'yearOfFire',
    name: 'Year of Fire',
    description: 'Keep a streak going for a whole year: 365 days.',
    icon: 'Sun',
    rarity: 'legendary',
    target: 365,
    unit: 'days',
    value: (s, today) => streakStatus(s.completions, today, restDaysOf(s)).best,
  },
  {
    id: 'infernoKeeper',
    name: 'Inferno Keeper',
    description: 'Start 8 weeks in a row on the Inferno fire (300 XP a week, no missed days).',
    icon: 'FlameKindling',
    rarity: 'epic',
    target: 8,
    unit: 'weeks',
    value: (s, today) => streakStatus(s.completions, today, restDaysOf(s)).bestInfernoWeeks,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Finish 1,000 tasks.',
    icon: 'Shield',
    rarity: 'epic',
    target: 1000,
    unit: 'tasks',
    value: (s) => s.completions.length,
  },
  {
    id: 'timeLord',
    name: 'Time Lord',
    description: 'Spend 500 hours on your tasks.',
    icon: 'Hourglass',
    rarity: 'legendary',
    target: 500,
    unit: 'hours',
    value: (s) => Math.floor(minutesOf(s).reduce((a, b) => a + b, 0) / 60),
  },
  {
    id: 'marathonDay',
    name: 'Marathon Day',
    description: 'Get 8 hours of tasks done in a single day.',
    icon: 'Timer',
    rarity: 'rare',
    target: 8,
    unit: 'hours',
    value: (s) => {
      const perDay = new Map<string, number>();
      for (const c of s.completions) perDay.set(c.date, (perDay.get(c.date) ?? 0) + (c.minutes ?? DEFAULT_MINUTES));
      return Math.floor(Math.max(0, ...perDay.values()) / 60);
    },
  },
  {
    id: 'polymath',
    name: 'Polymath',
    description: 'Finish tasks from 12 different categories.',
    icon: 'Compass',
    rarity: 'rare',
    target: 12,
    unit: 'categories',
    value: (s) => {
      const titles = new Set(s.completions.map((c) => c.title ?? ''));
      return new Set([...titles].map((t) => guessCategory(t)).filter(Boolean)).size;
    },
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Win 52 weekly challenges, a year’s worth.',
    icon: 'Trophy',
    rarity: 'epic',
    target: 52,
    unit: 'challenges',
    value: (s) => s.claims.length,
  },
  {
    id: 'ascended',
    name: 'Ascended',
    description: 'Reach level 50.',
    icon: 'Mountain',
    rarity: 'epic',
    target: 50,
    unit: 'level',
    value: (s) => levelInfo(totalXp(s)).level,
  },
  {
    id: 'immortal',
    name: 'Immortal',
    description: 'Reach level 100, the very top.',
    icon: 'Crown',
    rarity: 'legendary',
    target: 100,
    unit: 'level',
    value: (s) => levelInfo(totalXp(s)).level,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Be a member for a full year.',
    icon: 'Cake',
    rarity: 'rare',
    target: 12,
    unit: 'months',
    value: (s, today) => monthsSince(s.joinedAt, today),
  },
];

export interface TrophyStatus {
  def: TrophyDef;
  value: number;
  earned: boolean;
}

export function trophyStatuses(state: GameState, today: string): TrophyStatus[] {
  return TROPHIES.map((def) => {
    const value = Math.min(def.value(state, today), def.target);
    return { def, value, earned: value >= def.target };
  });
}
