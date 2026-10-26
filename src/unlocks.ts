import { ACHIEVEMENTS, levelForLook, TIER_NAMES, type AchievementStatus } from './achievements.ts';
import { TROPHY_FRAMES } from './cosmetics.ts';
import { lang, locale, t } from './i18n.ts';
import { areaList } from './library.ts';
import type { SeasonStatus } from './seasons.ts';
import type { TrophyStatus } from './trophies.ts';
import { PITY_SPINS, WHEEL_PRIZES, WHEEL_THEME_REWARD } from './wheel.ts';

// What a locked look needs, for the sheet that opens when it is tapped:
// how it is won, and how far along the player is.

export type LockedLook =
  /** A theme, by its reward label ("Forest theme"). */
  | { kind: 'theme'; reward: string }
  | { kind: 'frame' | 'flame' | 'celebration'; id: string };

export interface Unlock {
  /** One sentence on how it is won. */
  how: string;
  progress?: { value: number; goal: number; unit: string };
  /** Reached but still to be claimed, and where. */
  ready?: string;
}

export interface UnlockContext {
  level: number;
  achievements: AchievementStatus[];
  trophies: TrophyStatus[];
  season: SeasonStatus;
  /** Spins left until the wheel's theme is guaranteed. */
  spinsToPity?: number;
}

export function unlockFor(look: LockedLook, ctx: UnlockContext): Unlock {
  if (look.kind === 'theme') {
    if (look.reward === WHEEL_THEME_REWARD) {
      const odds = WHEEL_PRIZES.find((p) => p.theme)?.odds ?? 1;
      const left = ctx.spinsToPity ?? PITY_SPINS;
      return {
        how: t('Win it on the lucky wheel: the ★ slice, a {odds}% chance on every spin. If it hasn’t come up by then, it’s yours on spin {n}.', { odds, n: PITY_SPINS }),
        progress: { value: PITY_SPINS - left, goal: PITY_SPINS, unit: 'spins' },
      };
    }
    for (const def of ACHIEVEMENTS) {
      const tier = def.tiers.findIndex((t) => t.reward?.kind === 'theme' && t.reward.label === look.reward);
      if (tier < 0) continue;
      const goal = def.tiers[tier].goal;
      const status = ctx.achievements.find((a) => a.def.id === def.id);
      const value = Math.min(goal, status?.value ?? 0);
      const reached = (status?.reached ?? 0) > tier;
      return {
        how: t('Win {tier} in the {award} award: {how}.', { tier: t(TIER_NAMES[tier]), award: t(def.title), how: lower(def.description(goal)) }),
        progress: { value, goal, unit: def.unit },
        ready: reached ? t('Reached! Claim it under Awards on your profile to unlock the theme.') : undefined,
      };
    }
    return { how: t('Won with an award.') };
  }

  if (look.kind === 'frame') {
    const trophyFrame = TROPHY_FRAMES.find((f) => f.id === look.id);
    if (trophyFrame) {
      const status = ctx.trophies.find((t) => t.def.id === trophyFrame.trophy);
      if (status) {
        return {
          how: t('Win the {trophy} trophy: {how}.', { trophy: t(status.def.name), how: lower(t(status.def.description)).replace(/\.$/, '') }),
          progress: { value: status.value, goal: status.def.target, unit: status.def.unit },
        };
      }
    }
    if (look.id.startsWith('season-')) {
      const { season } = ctx;
      const month = new Date(`${season.month}-15T12:00:00`).toLocaleDateString(locale(), { month: 'long' });
      return {
        how: t('Finish {n} {areas} tasks in {month} for the {event} event, then claim it on the Challenges tab. Only this month.', {
          n: season.season.target,
          areas: areaList(season.season.categories),
          month,
          event: t(season.season.name),
        }),
        progress: { value: season.progress, goal: season.season.target, unit: 'tasks' },
        ready: season.complete && !season.claimed ? t('Done! Claim it on the Challenges tab.') : undefined,
      };
    }
  }

  const level = levelForLook(look.kind, look.id);
  if (level === undefined) return { how: t('Won with a reward.') };
  return { how: t('Reach level {n}.', { n: level }), progress: { value: Math.min(level, ctx.level), goal: level, unit: 'level' } };
}

/** For the middle of a sentence; German keeps its capitals, as nouns need them. */
const lower = (text: string) => (lang() === 'de' ? text : text.charAt(0).toLowerCase() + text.slice(1));
