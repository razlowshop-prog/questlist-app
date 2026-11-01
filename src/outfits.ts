import { bizzyFormOf, type BizzyOutfit } from './bizzy.ts';
import { categoryCounts } from './emblems.ts';
import type { GameState } from './game.ts';
import { N, t } from './i18n.ts';
import { OUTFIT_ART, type OutfitArt, type OutfitSlot } from './outfitArt.ts';

// Bizzy's outfits (picked 2026-10-29). Earned with XP only, never bought:
// - three to start with;
// - an area outfit for 50 finished tasks in its area (the old profile emblems);
// - the rest on the lucky wheel's outfit slices (Rare, Epic, Legendary),
//   which never give one already owned (XP instead once a rarity is complete).
// He wears one per slot: head, face, neck and back.

export type { OutfitSlot } from './outfitArt.ts';
export const OUTFIT_SLOTS: OutfitSlot[] = ['head', 'face', 'neck', 'back'];

export interface Outfit extends OutfitArt {
  name: string;
  /** Library category whose tasks earn it (AREA_GOAL of them). */
  area?: string;
  /** Owned from the start. */
  starter?: boolean;
}

/** Finished tasks in an area that earn its outfit. */
export const AREA_GOAL = 50;

const ABOUT: Record<string, { name: string; area?: string; starter?: boolean }> = {
  beanie: { name: N('Beanie'), starter: true },
  party: { name: N('Party hat') },
  grad: { name: N('Graduation cap'), area: 'learning' },
  chef: { name: N('Chef’s hat'), area: 'food' },
  wizard: { name: N('Wizard hat') },
  cap: { name: N('Sports cap'), area: 'fitness' },
  flowers: { name: N('Flower crown'), area: 'outdoors' },
  phones: { name: N('Headphones'), area: 'work' },
  viking: { name: N('Viking helmet') },
  pirate: { name: N('Pirate hat'), area: 'money' },
  shades: { name: N('Sunglasses') },
  hearts: { name: N('Heart glasses'), area: 'social' },
  specs: { name: N('Round glasses'), starter: true },
  bowtie: { name: N('Bow tie'), starter: true },
  scarf: { name: N('Striped scarf'), area: 'home' },
  medal: { name: N('Gold medal'), area: 'health' },
  cape: { name: N('Hero cape'), area: 'kindness' },
  astro: { name: N('Space helmet') },
  laurel: { name: N('Golden laurel') },
  diamond: { name: N('Diamond shades') },
  rainbow: { name: N('Rainbow cape') },
};

export const OUTFITS: Outfit[] = OUTFIT_ART.map((art) => ({ ...art, ...ABOUT[art.id] }));
const BY_ID = new Map(OUTFITS.map((o) => [o.id, o]));

export function outfitById(id: string | undefined): Outfit | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export const RARITY_LABEL: Record<Outfit['rarity'], string> = { 1: N('Rare'), 2: N('Epic'), 3: N('Legendary') };

/** XP paid by an outfit slice once every outfit of its rarity is owned. */
export const OUTFIT_XP: Record<Outfit['rarity'], number> = { 1: 30, 2: 60, 3: 150 };

/** A Legendary outfit is certain on this spin if none came in the spins since the last one. */
export const LEGENDARY_PITY = 100;

/** How far each area outfit is: tasks done in its area, out of AREA_GOAL. */
export function areaProgress(state: Pick<GameState, 'completions' | 'tasks'>): Map<string, number> {
  const counts = categoryCounts(state);
  const out = new Map<string, number>();
  for (const o of OUTFITS) if (o.area) out.set(o.id, Math.min(AREA_GOAL, counts.get(o.area) ?? 0));
  return out;
}

/** Every outfit the player owns: starters, area outfits reached, and wheel wins. */
export function ownedOutfits(state: Pick<GameState, 'completions' | 'tasks' | 'wheelSpins'>): Set<string> {
  const owned = new Set(OUTFITS.filter((o) => o.starter).map((o) => o.id));
  for (const [id, done] of areaProgress(state)) if (done >= AREA_GOAL) owned.add(id);
  for (const s of state.wheelSpins ?? []) if (s.outfit && BY_ID.has(s.outfit)) owned.add(s.outfit);
  return owned;
}

/**
 * The outfit an outfit slice gives: one of that rarity not owned yet, picked
 * by `roll` in [0, 1). Undefined once all of that rarity are owned (XP instead).
 */
export function outfitForSlice(rarity: Outfit['rarity'], owned: Set<string>, roll: number): Outfit | undefined {
  const open = OUTFITS.filter((o) => o.rarity === rarity && !owned.has(o.id));
  if (!open.length) return undefined;
  return open[Math.min(open.length - 1, Math.floor(roll * open.length))];
}

/** Spins since the last Legendary outfit (or since the first spin). */
export function spinsSinceLegendary(state: Pick<GameState, 'wheelSpins'>): number {
  const spins = state.wheelSpins ?? [];
  let n = 0;
  for (let i = spins.length - 1; i >= 0; i--) {
    if (outfitById(spins[i].outfit)?.rarity === 3) break;
    n++;
  }
  return n;
}

/** What he wears, without outfits the player doesn't own (any more) or in the wrong slot. */
export function wornOutfits(state: Pick<GameState, 'bizzyWear' | 'completions' | 'tasks' | 'wheelSpins'>): Partial<Record<OutfitSlot, string>> {
  const owned = ownedOutfits(state);
  const out: Partial<Record<OutfitSlot, string>> = {};
  for (const slot of OUTFIT_SLOTS) {
    const id = state.bizzyWear?.[slot];
    if (id && owned.has(id) && outfitById(id)?.slot === slot) out[slot] = id;
  }
  return out;
}

/** Puts an owned outfit on (in its slot), or takes it off when he already wears it. */
export function toggleOutfit(state: GameState, id: string): GameState {
  const o = outfitById(id);
  if (!o || !ownedOutfits(state).has(id)) return state;
  const wear = { ...wornOutfits(state) };
  if (wear[o.slot] === id) delete wear[o.slot];
  else wear[o.slot] = id;
  return { ...state, bizzyWear: wear };
}

/** The drawing bizzySvg needs for what he wears. */
export function outfitDrawing(wear: Partial<Record<OutfitSlot, string>>): BizzyOutfit | undefined {
  const pieces = OUTFIT_SLOTS.map((s) => outfitById(wear[s])).filter((o): o is Outfit => !!o);
  if (!pieces.length) return undefined;
  const back = outfitById(wear.back);
  return {
    back: back?.svg,
    front: [wear.neck, wear.face, wear.head].map((id) => outfitById(id)?.svg ?? '').join('') + (back?.front ?? ''),
    covers: { head: !!wear.head, neck: !!wear.neck, back: !!wear.back },
  };
}

/** The outfits for the Outfits tab, rarest first (Legendary, Epic, Rare); within a rarity the owned ones come first. */
export function outfitList(state: Pick<GameState, 'completions' | 'tasks' | 'wheelSpins'>): { outfit: Outfit; owned: boolean; progress?: number }[] {
  const owned = ownedOutfits(state);
  const areas = areaProgress(state);
  const order = new Map(OUTFITS.map((o, i) => [o.id, i]));
  return OUTFITS.map((outfit) => ({ outfit, owned: owned.has(outfit.id), ...(outfit.area && { progress: areas.get(outfit.id) ?? 0 }) })).sort(
    (a, b) => b.outfit.rarity - a.outfit.rarity || Number(b.owned) - Number(a.owned) || order.get(a.outfit.id)! - order.get(b.outfit.id)!,
  );
}

/** Outfits owned per rarity, for the showcase card: [owned, of]. */
export function outfitCounts(state: Pick<GameState, 'completions' | 'tasks' | 'wheelSpins'>): Record<Outfit['rarity'], [number, number]> {
  const owned = ownedOutfits(state);
  const out: Record<Outfit['rarity'], [number, number]> = { 1: [0, 0], 2: [0, 0], 3: [0, 0] };
  for (const o of OUTFITS) {
    out[o.rarity][1]++;
    if (owned.has(o.id)) out[o.rarity][0]++;
  }
  return out;
}

/** An outfit's name in the current language. */
export function outfitName(o: Outfit): string {
  return t(o.name);
}

/** Bizzy's form name, for the showcase card. */
export function formName(form: number | undefined): string {
  return t(bizzyFormOf(form).name);
}
