import { levelInfo, mergeSaved, totalXp, type GameState } from './game.ts';

// A backup file of everything the app keeps on this phone: the game state and
// the profile photo. Until accounts and cloud sync exist this is the only way
// to move progress to a new phone or get it back after a reset. The file
// carries a checksum, so a file edited by hand (say, to add XP) is refused.

export const BACKUP_VERSION = 1;
const APP = 'Succedo';
const KIND = 'backup';

export interface Backup {
  state: GameState;
  photo?: string;
  /** When it was saved, as an ISO time. */
  savedAt: string;
}

export type BackupRead = ({ ok: true } & Backup) | { ok: false; error: string };

/** 32-bit FNV-1a of a string, as 8 hex digits. Catches changes, not a lock against a determined cheat. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function body(state: GameState, photo: string | undefined): string {
  return JSON.stringify({ state, photo: photo ?? null });
}

/** The backup file's text. `savedAt` is an ISO time; the state records `today` as the day of the last backup. */
export function makeBackup(state: GameState, photo: string | undefined, savedAt: string, today: string): string {
  const saved: GameState = { ...state, settings: { ...state.settings, lastBackup: today } };
  return JSON.stringify({ app: APP, kind: KIND, version: BACKUP_VERSION, savedAt, check: checksum(body(saved, photo)), state: saved, photo: photo ?? null });
}

/** The file name, e.g. "succedo-backup-2026-10-25.json". */
export function backupName(today: string): string {
  return `succedo-backup-${today}.json`;
}

const NOT_A_BACKUP = `This isn’t a ${APP} backup file.`;

/** Reads a backup file's text, or says why it can't be used. */
export function readBackup(text: string): BackupRead {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (!file || typeof file !== 'object') return { ok: false, error: NOT_A_BACKUP };
  const f = file as Record<string, unknown>;
  if (f.app !== APP || f.kind !== KIND) return { ok: false, error: NOT_A_BACKUP };
  if (typeof f.version !== 'number' || f.version > BACKUP_VERSION) {
    return { ok: false, error: `This backup comes from a newer version of ${APP}. Update the app, then try again.` };
  }
  const state = f.state as Partial<GameState> | undefined;
  if (!state || typeof state !== 'object' || !Array.isArray(state.tasks) || !Array.isArray(state.completions) || typeof state.settings !== 'object' || !state.settings) {
    return { ok: false, error: NOT_A_BACKUP };
  }
  const photo = typeof f.photo === 'string' && f.photo.startsWith('data:image/') ? f.photo : undefined;
  if (f.check !== checksum(body(state as GameState, typeof f.photo === 'string' ? f.photo : undefined))) {
    return { ok: false, error: 'This file was changed after it was saved, so it can’t be restored.' };
  }
  return { ok: true, state: mergeSaved(state), photo, savedAt: typeof f.savedAt === 'string' ? f.savedAt : '' };
}

/** What a backup holds, for the "replace your progress?" question. */
export function backupSummary(state: GameState): { level: number; tasksDone: number; tasks: number } {
  return { level: levelInfo(totalXp(state)).level, tasksDone: state.completions.length, tasks: state.tasks.length };
}
