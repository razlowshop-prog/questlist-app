import type { TokenKind } from './achievements.ts';

// The bag on the inventory page: wheel tickets and tokens laid out in slots,
// up to five of a kind per slot. When the slots are full, the rest waits in a
// tray below. That only changes where items show: every item stays usable.

export type BagItem = 'ticket' | TokenKind;

/** Tokens first: tickets pile up fastest, so they are the ones that wait in the tray. */
export const BAG_ITEMS: BagItem[] = ['rest', 'double', 'reroll', 'adfree', 'ticket'];
export const STACK_SIZE = 5;
export const BASE_SLOTS = 30;
/** Each of these levels adds five more slots. */
export const SLOT_LEVELS = [20, 40, 60];

export function bagCapacity(level: number): number {
  return BASE_SLOTS + 5 * SLOT_LEVELS.filter((l) => level >= l).length;
}

/** The next level that adds slots, if any. */
export function nextSlotLevel(level: number): number | undefined {
  return SLOT_LEVELS.find((l) => l > level);
}

export interface BagStack {
  item: BagItem;
  count: number;
}

/**
 * Fills the slots in item order, five to a stack; what doesn't fit goes to
 * the tray, one entry per item with its total.
 */
export function layoutBag(counts: Record<BagItem, number>, capacity: number): { slots: BagStack[]; waiting: BagStack[] } {
  const slots: BagStack[] = [];
  const waiting: BagStack[] = [];
  for (const item of BAG_ITEMS) {
    let left = Math.max(0, Math.floor(counts[item] ?? 0));
    while (left > 0 && slots.length < capacity) {
      const count = Math.min(STACK_SIZE, left);
      slots.push({ item, count });
      left -= count;
    }
    if (left > 0) waiting.push({ item, count: left });
  }
  return { slots, waiting };
}

/**
 * Items added since the player last looked in the bag, for the badge on the
 * backpack. Items used up don't count against new ones of another kind.
 */
export function newInBag(counts: Record<BagItem, number>, seen: Partial<Record<string, number>> | undefined): number {
  return BAG_ITEMS.reduce((sum, item) => sum + Math.max(0, Math.floor(counts[item] ?? 0) - (seen?.[item] ?? 0)), 0);
}

/** The bag as just seen, to store in settings.bagSeen. */
export function bagSnapshot(counts: Record<BagItem, number>): Record<BagItem, number> {
  return Object.fromEntries(BAG_ITEMS.map((item) => [item, Math.max(0, Math.floor(counts[item] ?? 0))])) as Record<BagItem, number>;
}

/** True when the stored snapshot differs from the bag now. */
export function bagChanged(counts: Record<BagItem, number>, seen: Partial<Record<string, number>> | undefined): boolean {
  return BAG_ITEMS.some((item) => Math.max(0, Math.floor(counts[item] ?? 0)) !== (seen?.[item] ?? -1));
}
