import { SEASONS, seasonFrameId, type Season } from './cosmetics.ts';
import { categoryCounts } from './emblems.ts';
import type { GameState } from './game.ts';

// This month's seasonal event (see SEASONS in cosmetics.ts).

export interface SeasonStatus {
  season: Season;
  /** "2026-10" */
  month: string;
  /** The frame it wins, e.g. "season-2026-10". */
  frame: string;
  progress: number;
  complete: boolean;
  claimed: boolean;
  /** Days left after today. */
  daysLeft: number;
}

export function seasonStatus(state: Pick<GameState, 'completions' | 'tasks' | 'seasonClaims'>, today: string): SeasonStatus {
  const month = today.slice(0, 7);
  const season = SEASONS[Number(today.slice(5, 7)) - 1];
  const counts = categoryCounts(state, `${month}-01`, `${month}-31`);
  const done = season.categories.reduce((sum, c) => sum + (counts.get(c) ?? 0), 0);
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    season,
    month,
    frame: seasonFrameId(month),
    progress: Math.min(done, season.target),
    complete: done >= season.target,
    claimed: !!state.seasonClaims?.some((c) => c.month === month),
    daysLeft: lastDay - Number(today.slice(8, 10)),
  };
}

export function claimSeason(state: GameState, today: string): GameState {
  const status = seasonStatus(state, today);
  if (!status.complete || status.claimed) return state;
  return { ...state, seasonClaims: [...(state.seasonClaims ?? []), { month: status.month, date: today }] };
}

/** Seasonal frames the player has won. */
export function seasonFrames(state: Pick<GameState, 'seasonClaims'>): string[] {
  return (state.seasonClaims ?? []).map((c) => seasonFrameId(c.month));
}
