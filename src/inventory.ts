import { LEVEL_LADDER, unlockedRewards, type TokenKind } from './achievements.ts';
import { CELEBRATIONS, FLAME_STYLES, FRAMES, TROPHY_FRAMES, type CelebrationId, type FlameStyleId } from './cosmetics.ts';
import type { GameState, Settings } from './game.ts';
import { seasonFrames } from './seasons.ts';
import { TROPHIES } from './trophies.ts';

// What the player owns and can equip from the inventory: titles, frames,
// flame styles and celebrations won from levels and events.

export interface OwnedLooks {
  titles: string[];
  frames: string[];
  flames: FlameStyleId[];
  celebrations: CelebrationId[];
}

/** Trophy frames whose trophy is in the app, so they can be won. */
export const TROPHY_FRAMES_ON = TROPHY_FRAMES.filter((f) => TROPHIES.some((t) => t.id === f.trophy));

/**
 * `all` (browser previews) owns every look, so each can be tried.
 * `trophies` are the ids of the trophies won: each gives its title and its frame.
 */
export function ownedLooks(state: GameState, all = false, trophies: string[] = []): OwnedLooks {
  const rewards = unlockedRewards(state);
  const items = (kind: string) => rewards.flatMap((r) => (r.kind === kind && r.item ? [r.item] : []));
  const trophyTitles = TROPHIES.filter((t) => all || trophies.includes(t.id)).map((t) => t.name);
  const trophyFrames = TROPHY_FRAMES_ON.filter((f) => all || trophies.includes(f.trophy)).map((f) => f.id);
  const titles = [...rewards.flatMap((r) => (r.kind === 'title' ? [r.label.replace(/^"(.+)" title$/, '$1')] : [])), ...trophyTitles];
  if (all) {
    const allTitles = LEVEL_LADDER.flatMap((l) => (l.reward.kind === 'title' ? [l.reward.label.replace(/^"(.+)" title$/, '$1')] : []));
    return {
      titles: [...new Set([...titles, ...allTitles])],
      frames: [...FRAMES.map((f) => f.id), ...trophyFrames, ...seasonFrames(state)],
      flames: FLAME_STYLES.map((f) => f.id),
      celebrations: CELEBRATIONS.map((c) => c.id),
    };
  }
  return {
    titles,
    frames: [...items('frame'), ...trophyFrames, ...seasonFrames(state)],
    flames: ['classic', ...(items('flame') as FlameStyleId[])],
    celebrations: ['classic', ...(items('celebration') as CelebrationId[])],
  };
}

/** The equipped looks, each dropped when the player doesn't own it (e.g. data from another device). */
export function equippedLooks(settings: Settings, owned: OwnedLooks) {
  return {
    title: settings.title && owned.titles.includes(settings.title) ? settings.title : undefined,
    frame: settings.frame && owned.frames.includes(settings.frame) ? settings.frame : undefined,
    flameStyle: settings.flameStyle && owned.flames.includes(settings.flameStyle) ? settings.flameStyle : 'classic',
    celebration: settings.celebration && owned.celebrations.includes(settings.celebration) ? settings.celebration : 'classic',
  };
}

/** The next level above `level` whose reward includes this token, for "next at Lvl N". */
export function nextTokenLevel(kind: TokenKind, level: number): number | undefined {
  return LEVEL_LADDER.find((l) => l.level > level && l.reward.token === kind)?.level;
}

/** The won looks that get a "new" badge until the player has seen them. */
export type LookKind = 'theme' | 'flame' | 'celebration';

export const lookKey = (kind: LookKind, id: string) => `${kind}:${id}`;

/**
 * Keys of every won look: `themes` are the ids of themes won (not the free
 * ones). The classic flame and celebration everyone has don't count.
 */
export function lookKeys(themes: string[], owned: Pick<OwnedLooks, 'flames' | 'celebrations'>): string[] {
  return [
    ...themes.map((id) => lookKey('theme', id)),
    ...owned.flames.filter((id) => id !== 'classic').map((id) => lookKey('flame', id)),
    ...owned.celebrations.filter((id) => id !== 'classic').map((id) => lookKey('celebration', id)),
  ];
}

/** Won looks not seen yet. Before anything was stored (`seen` undefined) nothing counts as new. */
export function newLooks(keys: string[], seen: string[] | undefined): Set<string> {
  if (!seen) return new Set();
  const had = new Set(seen);
  return new Set(keys.filter((k) => !had.has(k)));
}

/** The ids of one kind among the new looks, for a picker. */
export function newOfKind(fresh: Set<string>, kind: LookKind): Set<string> {
  const prefix = `${kind}:`;
  return new Set([...fresh].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)));
}

/** `seen` with these keys added. */
export function markLooksSeen(seen: string[] | undefined, keys: string[]): string[] {
  return [...new Set([...(seen ?? []), ...keys])];
}
