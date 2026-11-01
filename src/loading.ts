import type { UpdatePhase } from './appUpdate';
import { N } from './i18n.ts';

// The loading bar on the quote screen (asked 2026-11-01): it runs for a
// moment with silly lines so the quote can be read, and doubles as the real
// start-up, waiting for the update check and showing an update download.
// Pure, so it can be tested; LoadingBar.tsx draws it.

/** The shortest the bar takes, even when everything is ready at once. */
export const LOADING_MIN_MS = 2500;
/** How long the bar waits at most for the update check before it lets you in anyway. */
export const CHECK_WAIT_MS = 6000;
/** Each silly line stays this long. */
export const LINE_MS = 1000;

export const FIRST_LINE = N('Waking up Bizzy…');
export const SILLY_LINES = [
  N('Harvesting honey…'),
  N('Waxing the phone…'),
  N('Polishing the stripes…'),
  N('Fluffing the wings…'),
  N('Untangling the antennae…'),
  N('Brewing honey coffee…'),
  N('Feeding the streak flame…'),
  N('Warming up the XP bar…'),
  N('Asking the flowers nicely…'),
  N('Counting the bees… 1, 2, 1, 2…'),
  N('Stretching your to-do list…'),
  N('Buzzing up the hive…'),
  N('Hiding the vegetables…'),
  N('Sharpening the stinger… just kidding'),
  N('Teaching Bizzy to count…'),
];
export const CHECK_LINE = N('Checking for fresh honey (updates)…');
export const GOT_LINE = N('Fresh honey found! Downloading the update…');
export const RESTART_LINE = N('Restarting with the new version…');
export const READY_LINE = N('Ready!');

/** The order of silly lines for one start: Bizzy wakes up first, the rest shuffled by `seed` (0 to 1). */
export function sillyOrder(seed: number): string[] {
  const rest = [...SILLY_LINES];
  let s = Math.floor(seed * 2 ** 31) || 1;
  for (let i = rest.length - 1; i > 0; i--) {
    s = (s * 48271) % 2147483647;
    const j = s % (i + 1);
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [FIRST_LINE, ...rest];
}

export interface LoadingView {
  /** 0 to 1, how full the bar is. */
  progress: number;
  /** The line under the bar (an English key, translate with t). */
  line: string;
  /** Full: "Tap to start" may show. */
  done: boolean;
}

/**
 * The bar after `elapsed` ms. While the update check runs it stops at 90%
 * (for at most CHECK_WAIT_MS); a download fills it from 30% with its real
 * progress; a downloaded update fills it and says the app restarts.
 */
export function loadingView(elapsed: number, phase: UpdatePhase, lines: string[], download?: number): LoadingView {
  const silly = lines[Math.min(lines.length - 1, Math.floor(elapsed / LINE_MS))] ?? FIRST_LINE;
  const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 1.6);
  if (phase === 'ready') return { progress: 1, line: RESTART_LINE, done: false };
  if (phase === 'downloading') return { progress: 0.3 + 0.65 * Math.min(1, Math.max(0, download ?? 0)), line: GOT_LINE, done: false };
  const timed = ease(elapsed / LOADING_MIN_MS);
  if (phase === 'checking' && elapsed < CHECK_WAIT_MS) {
    // Past the shortest time, only the check is left: say so.
    return { progress: Math.min(timed, 0.9), line: elapsed >= LOADING_MIN_MS ? CHECK_LINE : silly, done: false };
  }
  if (elapsed >= LOADING_MIN_MS) return { progress: 1, line: READY_LINE, done: true };
  return { progress: timed, line: silly, done: false };
}
