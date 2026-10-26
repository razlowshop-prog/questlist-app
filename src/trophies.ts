import { monthsSince } from './achievements.ts';
import { DEFAULT_MINUTES, levelInfo, restDaysOf, streakStatus, totalXp, type GameState } from './game.ts';
import type { IconName } from './icons.ts';
import { guessCategory } from './library.ts';
import { N } from './i18n.ts';

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
    name: N('Iron Will'),
    description: N('Keep a streak going for 100 days.'),
    icon: 'Flame',
    rarity: 'epic',
    target: 100,
    unit: N('days'),
    value: (s, today) => streakStatus(s.completions, today, restDaysOf(s)).best,
  },
  {
    id: 'yearOfFire',
    name: N('Year of Fire'),
    description: N('Keep a streak going for a whole year: 365 days.'),
    icon: 'Sun',
    rarity: 'legendary',
    target: 365,
    unit: N('days'),
    value: (s, today) => streakStatus(s.completions, today, restDaysOf(s)).best,
  },
  {
    id: 'infernoKeeper',
    name: N('Inferno Keeper'),
    description: N('Start 8 weeks in a row on the Inferno fire (300 XP a week, no missed days).'),
    icon: 'FlameKindling',
    rarity: 'epic',
    target: 8,
    unit: N('weeks'),
    value: (s, today) => streakStatus(s.completions, today, restDaysOf(s)).bestInfernoWeeks,
  },
  {
    id: 'marathonMind',
    name: N('Marathon Mind'),
    description: N('Finish 500 tasks.'),
    icon: 'Brain',
    rarity: 'epic',
    target: 500,
    unit: N('tasks'),
    value: (s) => s.completions.length,
  },
  {
    id: 'centurion',
    name: N('Centurion'),
    description: N('Finish 1,000 tasks.'),
    icon: 'Shield',
    rarity: 'epic',
    target: 1000,
    unit: N('tasks'),
    value: (s) => s.completions.length,
  },
  {
    id: 'timeLord',
    name: N('Time Lord'),
    description: N('Spend 500 hours on your tasks.'),
    icon: 'Hourglass',
    rarity: 'legendary',
    target: 500,
    unit: N('hours'),
    value: (s) => Math.floor(minutesOf(s).reduce((a, b) => a + b, 0) / 60),
  },
  {
    id: 'marathonDay',
    name: N('Marathon Day'),
    description: N('Get 8 hours of tasks done in a single day.'),
    icon: 'Timer',
    rarity: 'rare',
    target: 8,
    unit: N('hours'),
    value: (s) => {
      const perDay = new Map<string, number>();
      for (const c of s.completions) perDay.set(c.date, (perDay.get(c.date) ?? 0) + (c.minutes ?? DEFAULT_MINUTES));
      return Math.floor(Math.max(0, ...perDay.values()) / 60);
    },
  },
  {
    id: 'polymath',
    name: N('Polymath'),
    description: N('Finish tasks from 12 different areas.'),
    icon: 'Compass',
    rarity: 'rare',
    target: 12,
    unit: N('categories'),
    value: (s) => {
      const titles = new Set(s.completions.map((c) => c.title ?? ''));
      return new Set([...titles].map((t) => guessCategory(t)).filter(Boolean)).size;
    },
  },
  {
    id: 'champion',
    name: N('Champion'),
    description: N('Win 52 weekly challenges, a year’s worth.'),
    icon: 'Trophy',
    rarity: 'epic',
    target: 52,
    unit: N('challenges'),
    value: (s) => s.claims.length,
  },
  {
    id: 'ascended',
    name: N('Ascended'),
    description: N('Reach level 50.'),
    icon: 'Mountain',
    rarity: 'epic',
    target: 50,
    unit: N('level'),
    value: (s) => levelInfo(totalXp(s)).level,
  },
  {
    id: 'immortal',
    name: N('Immortal'),
    description: N('Reach level 100, the very top.'),
    icon: 'Crown',
    rarity: 'legendary',
    target: 100,
    unit: N('level'),
    value: (s) => levelInfo(totalXp(s)).level,
  },
  {
    id: 'veteran',
    name: N('Veteran'),
    description: N('Be a member for a full year.'),
    icon: 'Cake',
    rarity: 'rare',
    target: 12,
    unit: N('months'),
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

/** How many trophies can be pinned to the profile. */
export const SHOWCASE_SIZE = 3;

/** The pinned trophies to show, in pin order: only ones still won, at most SHOWCASE_SIZE. */
export function showcaseTrophies(statuses: TrophyStatus[], showcase: string[] = []): TrophyStatus[] {
  return showcase
    .map((id) => statuses.find((t) => t.def.id === id && t.earned))
    .filter((t): t is TrophyStatus => !!t)
    .slice(0, SHOWCASE_SIZE);
}

/** Pins a trophy (at the end) or unpins it; a full showcase stays as it is. */
export function toggleShowcase(showcase: string[] = [], id: string): string[] {
  if (showcase.includes(id)) return showcase.filter((x) => x !== id);
  return showcase.length >= SHOWCASE_SIZE ? showcase : [...showcase, id];
}
