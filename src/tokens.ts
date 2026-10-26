import { LEVEL_LADDER, type TokenKind } from './achievements.ts';
import { wheelTokens } from './wheel.ts';
import { N } from './i18n.ts';
import { addDays, restDaysOf, streakStatus, swapCandidate, weekStart, weeklyChallenges, type GameState } from './game.ts';

// One-time tokens from level rewards: rest days, double XP days and
// challenge swaps. What a player holds is worked out from the levels reached
// minus the tokens already used, so it can't drift out of step.

/** In English; shown with t(). */
export const TOKEN_INFO: Record<TokenKind, { name: string; description: string }> = {
  rest: {
    name: N('Rest day'),
    description: N('Take a day off: your streak and fire stay as they are. Works for today, or for yesterday if you missed it.'),
  },
  double: { name: N('Double XP'), description: N('Every task you finish for the rest of today earns twice the XP.') },
  reroll: { name: N('Challenge swap'), description: N('Swap a weekly challenge you don’t like for another one.') },
  adfree: { name: N('Ad-free day'), description: N('No ads for the rest of today.') },
};

export function tokenCounts(state: GameState): Record<TokenKind, number> {
  const counts: Record<TokenKind, number> = { rest: 0, double: 0, reroll: 0, adfree: 0 };
  const reached = new Set(state.levelRewards ?? []);
  for (const l of LEVEL_LADDER) {
    if (reached.has(l.level) && l.reward.token) counts[l.reward.token] += l.reward.count ?? 1;
  }
  const won = wheelTokens(state);
  for (const k of Object.keys(counts) as TokenKind[]) counts[k] += won[k];
  counts.rest -= state.restDays?.length ?? 0;
  counts.double -= state.doubleDays?.length ?? 0;
  counts.reroll -= state.swaps?.length ?? 0;
  counts.adfree -= state.adFreeDays?.length ?? 0;
  // Never below zero, even if a later ladder change turned a used token's level into a look.
  for (const k of Object.keys(counts) as TokenKind[]) counts[k] = Math.max(0, counts[k]);
  return counts;
}

export interface RestOffer {
  day: string;
  /** The streak in days that the rest day keeps. */
  keeps: number;
  /** Whether it saves a streak that a missed yesterday already cost (or ended). */
  missed: boolean;
  /** The fire tier it keeps. */
  tier: number;
  /** A missed yesterday ended the streak (rather than only costing a fire tier). */
  streakLost: boolean;
}

/**
 * Where a rest token helps right now: yesterday, if it was missed and covering
 * it would keep more of the streak; otherwise today, while the streak is at risk.
 */
export function restOffer(state: GameState, today: string): RestOffer | undefined {
  if (tokenCounts(state).rest <= 0) return undefined;
  return missedDayOffer(state, today) ?? atRiskOffer(state, today);
}

/** Yesterday, if it was missed and covering it would keep more of the streak or the fire. */
function missedDayOffer(state: GameState, today: string): RestOffer | undefined {
  const rest = restDaysOf(state);
  const now = streakStatus(state.completions, today, rest);
  const yesterday = addDays(today, -1);
  const activeYesterday = state.completions.some((c) => c.date === yesterday) || rest.includes(yesterday);
  if (!activeYesterday) {
    const saved = streakStatus(state.completions, today, [...rest, yesterday]);
    if (saved.days > now.days || saved.tier > now.tier) {
      return { day: yesterday, keeps: saved.days, missed: true, tier: saved.tier, streakLost: saved.days > now.days };
    }
  }
  return undefined;
}

function atRiskOffer(state: GameState, today: string): RestOffer | undefined {
  const now = streakStatus(state.completions, today, restDaysOf(state));
  return now.atRisk ? { day: today, keeps: now.days, missed: false, tier: now.tier, streakLost: false } : undefined;
}

export function spendRestDay(state: GameState, day: string, today: string): GameState {
  const offer = restOffer(state, today);
  if (!offer || offer.day !== day) return state;
  return { ...state, restDays: [...(state.restDays ?? []), day] };
}

export function doubleXpActive(state: GameState, today: string): boolean {
  return !!state.doubleDays?.includes(today);
}

export function spendDoubleXp(state: GameState, today: string): GameState {
  if (doubleXpActive(state, today) || tokenCounts(state).double <= 0) return state;
  return { ...state, doubleDays: [...(state.doubleDays ?? []), today] };
}

/** Swaps an open challenge of this week (not finished yet, so no reward is thrown away) for another one. */
export function swapChallenge(state: GameState, challengeId: string, today: string): GameState {
  if (tokenCounts(state).reroll <= 0) return state;
  const status = weeklyChallenges(state, today).find((c) => c.def.id === challengeId);
  if (!status || status.claimed || status.complete) return state;
  const week = weekStart(today);
  const to = swapCandidate(week, state.swaps ?? [], challengeId);
  if (!to) return state;
  return { ...state, swaps: [...(state.swaps ?? []), { week, from: challengeId, to: to.id }] };
}

export function adFreeActive(state: GameState, today: string): boolean {
  return !!state.adFreeDays?.includes(today);
}

/** Ads aren't in the app yet; the day is recorded so the ad code can respect it later. */
export function spendAdFree(state: GameState, today: string): GameState {
  if (adFreeActive(state, today) || tokenCounts(state).adfree <= 0) return state;
  return { ...state, adFreeDays: [...(state.adFreeDays ?? []), today] };
}

/**
 * Streaks shorter than this aren't worth the one free save, even with a fire
 * (Flame can light on day one); it waits for a bigger one.
 */
export const RECOVERY_MIN_DAYS = 3;

/**
 * The one-time free recovery: offered the first time ever that a missed
 * yesterday costs a streak of a few days or a fire tier, whether or not the
 * player holds a rest token. Once answered (either way) it never comes back.
 */
export function recoveryOffer(state: GameState, today: string): RestOffer | undefined {
  if (state.recovery) return undefined;
  const offer = missedDayOffer(state, today);
  if (!offer || offer.keeps < RECOVERY_MIN_DAYS) return undefined;
  return offer;
}

export function answerRecovery(state: GameState, today: string, take: boolean): GameState {
  const offer = recoveryOffer(state, today);
  if (!offer) return state;
  return { ...state, recovery: { day: offer.day, used: take } };
}
