import { wheelXp, type GameState, type WheelSpin } from './game.ts';
import type { TokenKind } from './achievements.ts';
import { N, t } from './i18n.ts';

// The lucky wheel: every 100 XP earned from tasks, challenges and
// achievements gives a ticket, and a ticket spins the wheel once. Prizes are
// in-app only, and tickets can never be bought: that keeps it a game, not
// gambling. The odds are shown in full on the Spin tab.

export const XP_PER_TICKET = 100;
/** The theme is guaranteed on this spin if none of the spins before it won it. */
export const PITY_SPINS = 150;
/** Paid instead of the theme once the player owns it. */
export const JACKPOT_XP = 250;
/** Reward label of the wheel's own theme (THEMES in theme.tsx), only won here. */
export const WHEEL_THEME_REWARD = 'Fortuna theme';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface WheelPrize {
  id: string;
  label: string;
  /** Short text on the wheel segment. */
  short: string;
  /** Chance in percent; all add up to 100. */
  odds: number;
  rarity: Rarity;
  xp?: number;
  token?: TokenKind;
  theme?: boolean;
}

export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'xp20', label: '20 XP', short: '20', odds: 40, rarity: 'common', xp: 20 },
  { id: 'xp50', label: '50 XP', short: '50', odds: 20, rarity: 'common', xp: 50 },
  { id: 'xp100', label: '100 XP', short: '100', odds: 8, rarity: 'common', xp: 100 },
  { id: 'double', label: N('Double XP token'), short: '2X', odds: 9, rarity: 'uncommon', token: 'double' },
  { id: 'rest', label: N('Rest day token'), short: 'REST', odds: 9, rarity: 'uncommon', token: 'rest' },
  { id: 'reroll', label: N('Challenge swap'), short: 'SWAP', odds: 8, rarity: 'uncommon', token: 'reroll' },
  { id: 'adfree', label: N('Ad-free day'), short: 'AD-FREE', odds: 5, rarity: 'rare', token: 'adfree' },
  { id: 'theme', label: N('Fortuna theme'), short: '★', odds: 1, rarity: 'legendary', theme: true },
];

/** What the theme segment pays once the theme is owned. */
export const JACKPOT: WheelPrize = { id: 'jackpot', label: `${JACKPOT_XP} XP jackpot`, short: '★', odds: 1, rarity: 'legendary', xp: JACKPOT_XP };

export const RARITY_NAMES: Record<Rarity, string> = {
  common: N('Common'),
  uncommon: N('Rare'),
  rare: N('Epic'),
  legendary: N('Legendary'),
};

/** A prize's name in the current language. */
export function prizeLabel(prize: WheelPrize): string {
  return prize.xp ? t(prize.id === JACKPOT.id ? '{n} XP jackpot' : '{n} XP', { n: prize.xp }) : t(prize.label);
}

/** A rarity's name in the current language. */
export function rarityName(rarity: Rarity): string {
  return t(RARITY_NAMES[rarity]);
}

/**
 * The wheel's slices in order, clockwise from the top. All slices are the
 * same size; the chances live in WHEEL_PRIZES and are shown behind the "?"
 * on the Spin tab.
 */
export const WHEEL_SEGMENTS: { prize: string; share: number }[] = [
  'xp20',
  'double',
  'xp50',
  'adfree',
  'xp100',
  'rest',
  'theme',
  'reroll',
].map((prize) => ({ prize, share: 100 / 8 }));

export function prizeById(id: string): WheelPrize {
  return id === JACKPOT.id ? JACKPOT : WHEEL_PRIZES.find((p) => p.id === id)!;
}

export interface TicketStatus {
  /** Tickets ready to spin. */
  tickets: number;
  /** XP towards the next ticket, out of XP_PER_TICKET. */
  progress: number;
  earned: number;
  spent: number;
}

/** Tickets come from XP earned outside the wheel; unticking a task can take back one not spent yet. */
export function ticketStatus(state: GameState, totalXp: number): TicketStatus {
  const xp = Math.max(0, totalXp - wheelXp(state));
  const earned = Math.floor(xp / XP_PER_TICKET);
  const spent = state.wheelSpins?.length ?? 0;
  return { tickets: Math.max(0, earned - spent), progress: xp % XP_PER_TICKET, earned, spent };
}

export function ownsWheelTheme(state: Pick<GameState, 'wheelSpins'>): boolean {
  return !!state.wheelSpins?.some((s) => s.prize === 'theme');
}

/** Spins left until the theme is guaranteed; undefined once it's owned. */
export function spinsToPity(state: Pick<GameState, 'wheelSpins'>): number | undefined {
  if (ownsWheelTheme(state)) return undefined;
  return PITY_SPINS - (state.wheelSpins?.length ?? 0);
}

/** The prize a roll in [0, 1) lands on, by the odds. */
export function prizeForRoll(roll: number): WheelPrize {
  // In whole percent, so the odds add up exactly.
  const n = Math.min(99, Math.floor(roll * 100));
  let at = 0;
  for (const p of WHEEL_PRIZES) {
    at += p.odds;
    if (n < at) return p;
  }
  return WHEEL_PRIZES[0];
}

/**
 * Spends a ticket. `roll` is a random number in [0, 1) (Math.random in the
 * app, fixed in tests). Returns the new state and the prize, or nothing
 * without a ticket.
 */
export function spinWheel(
  state: GameState,
  totalXp: number,
  today: string,
  roll: number,
): { state: GameState; prize?: WheelPrize } {
  if (ticketStatus(state, totalXp).tickets <= 0) return { state };
  const owned = ownsWheelTheme(state);
  let prize = spinsToPity(state) === 1 ? WHEEL_PRIZES.find((p) => p.theme)! : prizeForRoll(roll);
  if (prize.theme && owned) prize = JACKPOT;
  const spin: WheelSpin = { date: today, prize: prize.id, ...(prize.xp && { xp: prize.xp }) };
  return { state: { ...state, wheelSpins: [...(state.wheelSpins ?? []), spin] }, prize };
}

/** Tokens won on the wheel, added to the ones from levels. */
export function wheelTokens(state: Pick<GameState, 'wheelSpins'>): Record<TokenKind, number> {
  const counts: Record<TokenKind, number> = { rest: 0, double: 0, reroll: 0, adfree: 0 };
  for (const s of state.wheelSpins ?? []) {
    const token = prizeById(s.prize)?.token;
    if (token) counts[token]++;
  }
  return counts;
}

/** Index of the segment the wheel should stop on for a prize, picked so the pointer lands inside it. */
export function segmentFor(prizeId: string, roll: number): { index: number; at: number } {
  const id = prizeId === JACKPOT.id ? 'theme' : prizeId;
  const options = WHEEL_SEGMENTS.map((s, i) => ({ ...s, i })).filter((s) => s.prize === id);
  const pick = options[Math.min(options.length - 1, Math.floor(roll * options.length))];
  // Where in the segment (as a share of the whole wheel) the pointer stops, away from the edges.
  const start = WHEEL_SEGMENTS.slice(0, pick.i).reduce((sum, s) => sum + s.share, 0);
  const inside = 0.2 + ((roll * 7919) % 1) * 0.6;
  return { index: pick.i, at: (start + pick.share * inside) / 100 };
}

