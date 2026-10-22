import { LEVEL_LADDER, unlockedRewards, type TokenKind } from './achievements.ts';
import { CELEBRATIONS, FLAME_STYLES, FRAMES, type CelebrationId, type FlameStyleId } from './cosmetics.ts';
import type { GameState, Settings } from './game.ts';
import { seasonFrames } from './seasons.ts';

// What the player owns and can equip from the inventory: titles, frames,
// flame styles and celebrations won from levels and events.

export interface OwnedLooks {
  titles: string[];
  frames: string[];
  flames: FlameStyleId[];
  celebrations: CelebrationId[];
}

/** `all` (browser previews) owns every look, so each can be tried. */
export function ownedLooks(state: GameState, all = false): OwnedLooks {
  const rewards = unlockedRewards(state);
  const items = (kind: string) => rewards.flatMap((r) => (r.kind === kind && r.item ? [r.item] : []));
  const titles = rewards.flatMap((r) => (r.kind === 'title' ? [r.label.replace(/^"(.+)" title$/, '$1')] : []));
  if (all) {
    const allTitles = LEVEL_LADDER.flatMap((l) => (l.reward.kind === 'title' ? [l.reward.label.replace(/^"(.+)" title$/, '$1')] : []));
    return {
      titles: [...new Set([...titles, ...allTitles])],
      frames: [...FRAMES.map((f) => f.id), ...seasonFrames(state)],
      flames: FLAME_STYLES.map((f) => f.id),
      celebrations: CELEBRATIONS.map((c) => c.id),
    };
  }
  return {
    titles,
    frames: [...items('frame'), ...seasonFrames(state)],
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
