import { wheelXp, type GameState, type WheelSpin } from './game.ts';
import { LEGENDARY_PITY, OUTFIT_XP, outfitById, outfitForSlice, ownedOutfits, spinsSinceLegendary } from './outfits.ts';
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
  /** An outfit slice: 1 Rare, 2 Epic, 3 Legendary (outfits.ts). */
  outfit?: 1 | 2 | 3;
}

export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'xp20', label: '20 XP', short: '20', odds: 33, rarity: 'common', xp: 20 },
  { id: 'xp50', label: '50 XP', short: '50', odds: 18, rarity: 'common', xp: 50 },
  { id: 'xp100', label: '100 XP', short: '100', odds: 8, rarity: 'common', xp: 100 },
  { id: 'double', label: N('Double XP token'), short: '2X', odds: 9, rarity: 'uncommon', token: 'double' },
  { id: 'rest', label: N('Rest day token'), short: 'REST', odds: 9, rarity: 'uncommon', token: 'rest' },
  { id: 'reroll', label: N('Challenge swap'), short: 'SWAP', odds: 8, rarity: 'uncommon', token: 'reroll' },
  { id: 'adfree', label: N('Ad-free day'), short: 'AD-FREE', odds: 5, rarity: 'rare', token: 'adfree' },
  // Outfit slices (picked 2026-10-29, option B): a slice per rarity, never a duplicate.
  { id: 'o1', label: N('Rare outfit'), short: 'RARE', odds: 6, rarity: 'uncommon', outfit: 1 },
  { id: 'o2', label: N('Epic outfit'), short: 'EPIC', odds: 2.5, rarity: 'rare', outfit: 2 },
  { id: 'o3', label: N('Legendary outfit'), short: 'LEGEND', odds: 0.5, rarity: 'legendary', outfit: 3 },
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
 * on the Spin tab. The long labels (Rest day, Legendary, Ad-free, Fortuna)
 * sit at the sides, where the upright labels have room; the short ones at
 * the top and bottom, where neighbours sit side by side.
 */
export const WHEEL_SEGMENTS: { prize: string; share: number }[] = ['xp20', 'o1', 'rest', 'o3', 'o2', 'double', 'xp50', 'adfree', 'theme', 'xp100', 'reroll'].map(
  (prize, _, all) => ({ prize, share: 100 / all.length }),
);

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
  // XP from picking a level on the developer page doesn't flood the wheel; its own tickets do.
  const xp = Math.max(0, totalXp - wheelXp(state) - (state.dev?.xp ?? 0));
  const earned = Math.floor(xp / XP_PER_TICKET) + (state.dev?.tickets ?? 0);
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
  // In tenths of a percent, so the odds (some are half a percent) add up exactly.
  const n = Math.min(999, Math.floor(roll * 1000));
  let at = 0;
  for (const p of WHEEL_PRIZES) {
    at += Math.round(p.odds * 10);
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
  const outfits = ownedOutfits(state);
  // Certain prizes first: the theme after PITY_SPINS spins without it, then a Legendary
  // outfit after LEGENDARY_PITY spins without one (while one is still to win).
  let prize =
    spinsToPity(state) === 1
      ? prizeById('theme')
      : spinsSinceLegendary(state) >= LEGENDARY_PITY - 1 && outfitForSlice(3, outfits, 0)
        ? prizeById('o3')
        : prizeForRoll(roll);
  if (prize.theme && owned) prize = JACKPOT;
  let spin: WheelSpin = { date: today, prize: prize.id, ...(prize.xp && { xp: prize.xp }) };
  if (prize.outfit) {
    // Which outfit: from a second number made out of the roll, so tests stay fixed.
    const outfit = outfitForSlice(prize.outfit, outfits, (roll * 7919) % 1);
    spin = outfit ? { ...spin, outfit: outfit.id } : { ...spin, xp: OUTFIT_XP[prize.outfit] };
  }
  return { state: { ...state, wheelSpins: [...(state.wheelSpins ?? []), spin] }, prize };
}

/** What a spin gave, for the prize card: an outfit, or XP when its rarity was complete. */
export function spinOutfit(spin: Pick<WheelSpin, 'outfit'> | undefined) {
  return outfitById(spin?.outfit);
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

/**
 * The wheel's size for the space between the header and the tab bar: as big
 * as fits with the title above and the hint below, never wider than the page
 * minus the corner chips' margins.
 */
export function wheelSize(width: number, height: number): number {
  const across = Math.min(width, 640) - 56;
  const down = height - 176;
  return Math.round(Math.max(200, Math.min(360, across, down)));
}
