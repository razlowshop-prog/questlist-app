import { addDays, type GameState } from './game.ts';

/** Days of use before the first ask, so only players who know the app are asked. */
export const REVIEW_AFTER_DAYS = 7;
/** Level needed before the first ask. */
export const REVIEW_MIN_LEVEL = 5;
/** Days between asks. */
export const REVIEW_GAP_DAYS = 120;
/** Asks in total; the stores show the pop-up at most 3 times a year anyway. */
export const REVIEW_MAX_ASKS = 3;

/**
 * Whether a happy moment (a level-up) may show the store's own review pop-up.
 * No reward is ever tied to it: Apple and Google forbid that.
 */
export function reviewDue(state: Pick<GameState, 'joinedAt' | 'settings'>, level: number, today: string): boolean {
  const asks = state.settings.reviewAsks ?? [];
  if (!state.joinedAt || addDays(state.joinedAt, REVIEW_AFTER_DAYS) > today) return false;
  if (level < REVIEW_MIN_LEVEL || asks.length >= REVIEW_MAX_ASKS) return false;
  const last = asks.at(-1);
  return !last || addDays(last, REVIEW_GAP_DAYS) <= today;
}
