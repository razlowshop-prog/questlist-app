import { LEVEL_LADDER, type TokenKind } from './achievements.ts';
import { addDays, streakStatus, swapCandidate, weekStart, weeklyChallenges, type GameState } from './game.ts';

// One-time tokens from level rewards: rest days, double XP days and
// challenge swaps. What a player holds is worked out from the levels reached
// minus the tokens already used, so it can't drift out of step.

export const TOKEN_INFO: Record<TokenKind, { name: string; description: string }> = {
  rest: {
    name: 'Rest day',
    description: 'Take a day off: your streak and fire stay as they are. Works for today, or for yesterday if you missed it.',
  },
  double: { name: 'Double XP', description: 'Every task you finish for the rest of today earns twice the XP.' },
  reroll: { name: 'Challenge swap', description: 'Swap a weekly challenge you don’t like for another one.' },
};

export function tokenCounts(state: GameState): Record<TokenKind, number> {
  const counts: Record<TokenKind, number> = { rest: 0, double: 0, reroll: 0 };
  const reached = new Set(state.levelRewards ?? []);
  for (const l of LEVEL_LADDER) {
    if (reached.has(l.level) && l.reward.token) counts[l.reward.token] += l.reward.count ?? 1;
  }
  counts.rest -= state.restDays?.length ?? 0;
  counts.double -= state.doubleDays?.length ?? 0;
  counts.reroll -= state.swaps?.length ?? 0;
  return counts;
}

export interface RestOffer {
  day: string;
  /** The streak in days that the rest day keeps. */
  keeps: number;
  /** Whether it saves a streak that a missed yesterday already cost (or ended). */
  missed: boolean;
}

/**
 * Where a rest token helps right now: yesterday, if it was missed and covering
 * it would keep more of the streak; otherwise today, while the streak is at risk.
 */
export function restOffer(state: GameState, today: string): RestOffer | undefined {
  if (tokenCounts(state).rest <= 0) return undefined;
  const rest = state.restDays ?? [];
  const now = streakStatus(state.completions, today, rest);
  const yesterday = addDays(today, -1);
  const activeYesterday = state.completions.some((c) => c.date === yesterday) || rest.includes(yesterday);
  if (!activeYesterday) {
    const saved = streakStatus(state.completions, today, [...rest, yesterday]);
    if (saved.days > now.days || saved.tier > now.tier) return { day: yesterday, keeps: saved.days, missed: true };
  }
  if (now.atRisk) return { day: today, keeps: now.days, missed: false };
  return undefined;
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
