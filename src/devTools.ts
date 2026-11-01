import type { TokenKind } from './achievements.ts';
import { addDays, levelInfo, MAX_LEVEL, totalXp, xpToNext, type Completion, type DevSettings, type GameState } from './game.ts';

// The developer page (Menu → Developer): shortcuts for trying the app out,
// such as jumping to a level or owning every look. It only exists in test
// builds: the preview APK, the browser previews and `expo start`. Store builds
// leave the page out and drop any test changes from saved data or a backup,
// so nobody can use it to climb levels or the leaderboard.

declare const __DEV__: boolean | undefined;

/** True in test builds only. EAS sets EXPO_PUBLIC_DEV_TOOLS for the preview profile (eas.json), never for production. */
export const DEV_TOOLS = (typeof __DEV__ !== 'undefined' && !!__DEV__) || process.env.EXPO_PUBLIC_DEV_TOOLS === '1';

/** The XP multipliers to pick from. */
export const DEV_MULTIPLIERS = [1, 2, 5, 10, 50] as const;

/** Task id of the made-up days that build a test streak. */
export const DEV_DAY = 'dev-day';
/** XP of each made-up day: a full week of them reaches Inferno. */
export const DEV_DAY_XP = 50;

/** Total XP at the very start of a level. */
export function xpAtLevel(level: number): number {
  let xp = 0;
  for (let l = 1; l < Math.min(Math.max(1, Math.round(level)), MAX_LEVEL); l++) xp += xpToNext(l);
  return xp;
}

function withDev(state: GameState, changes: Partial<DevSettings>): GameState {
  const dev: DevSettings = { ...state.dev, ...changes };
  // Leave out what is back to normal, so an untouched player saves no dev field.
  for (const k of Object.keys(dev) as (keyof DevSettings)[]) {
    const v = dev[k];
    if (v === undefined || v === 0 || v === false || (k === 'multiplier' && v === 1)) delete dev[k];
  }
  const { dev: _old, ...rest } = state;
  return Object.keys(dev).length ? { ...rest, dev } : rest;
}

/**
 * Jumps to the start of a level by adding (or taking away) test XP. Level
 * rewards above the new level are taken back, so they can be won again.
 */
export function setDevLevel(state: GameState, level: number): GameState {
  const target = Math.min(Math.max(1, Math.round(level)), MAX_LEVEL);
  const real = totalXp(withDev(state, { xp: 0 }));
  const next = withDev(state, { xp: xpAtLevel(target) - real });
  const rewards = next.levelRewards?.filter((l) => l <= target);
  return rewards && rewards.length !== next.levelRewards!.length ? { ...next, levelRewards: rewards } : next;
}

/** Adds test XP on top of what was earned; never takes the total below zero. */
export function addDevXp(state: GameState, amount: number): GameState {
  const total = totalXp(state);
  return withDev(state, { xp: (state.dev?.xp ?? 0) + Math.max(amount, -total) });
}

export function setDevMultiplier(state: GameState, multiplier: number): GameState {
  return withDev(state, { multiplier });
}

export function setUnlockAll(state: GameState, on: boolean): GameState {
  return withDev(state, { unlockAll: on });
}

export function addDevTokens(state: GameState, kind: TokenKind, count: number): GameState {
  const tokens = { ...state.dev?.tokens, [kind]: (state.dev?.tokens?.[kind] ?? 0) + count };
  return withDev(state, { tokens });
}

export function addDevTickets(state: GameState, count: number): GameState {
  return withDev(state, { tickets: (state.dev?.tickets ?? 0) + count });
}

/**
 * Makes up a task done on each of the last `days` days before today (days
 * that already have a task keep them), so the streak, fire and multiplier can
 * be tried. Replaces made-up days added before.
 */
export function setDevStreak(state: GameState, days: number, today: string): GameState {
  const completions = state.completions.filter((c) => c.taskId !== DEV_DAY);
  const real = new Set(completions.map((c) => c.date));
  const made: Completion[] = [];
  for (let i = days; i >= 1; i--) {
    const date = addDays(today, -i);
    if (!real.has(date)) made.push({ taskId: DEV_DAY, date, xp: DEV_DAY_XP, title: 'Test day' });
  }
  return { ...state, completions: [...made, ...completions] };
}

/** How many made-up days are in the history. */
export function devDays(state: GameState): number {
  return state.completions.filter((c) => c.taskId === DEV_DAY).length;
}

/** Whether anything on the developer page was changed. */
export function hasDevChanges(state: GameState): boolean {
  return !!state.dev || devDays(state) > 0;
}

/**
 * Undoes every test change: test XP, multiplier, unlocks, tokens, tickets and
 * made-up days. Level rewards above the level that is left are taken back.
 */
export function clearDev(state: GameState): GameState {
  const { dev: _dev, ...rest } = state;
  const next: GameState = { ...rest, completions: state.completions.filter((c) => c.taskId !== DEV_DAY) };
  const level = levelInfo(totalXp(next)).level;
  const rewards = next.levelRewards?.filter((l) => l <= level);
  return rewards && rewards.length !== next.levelRewards!.length ? { ...next, levelRewards: rewards } : next;
}

/** Saved data or a backup as this build may use it: store builds drop every test change. */
export function devAllowed(state: GameState, allowed = DEV_TOOLS): GameState {
  return allowed || !hasDevChanges(state) ? state : clearDev(state);
}

/** Which all-done moment plays; the picked honey check is the normal one. */
export function setDoneMoment(state: GameState, kind: NonNullable<DevSettings['doneMoment']>): GameState {
  return withDev(state, { doneMoment: kind === 'check' ? undefined : kind });
}

/** Where Bizzy's bubble shows on the streak card; 'row' is today's. */
export function setBubbleSpot(state: GameState, spot: NonNullable<DevSettings['bubbleSpot']>): GameState {
  return withDev(state, { bubbleSpot: spot === 'row' ? undefined : spot });
}
