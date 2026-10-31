/**
 * How the − / + buttons count (Stepper.tsx), kept apart so it can be tested.
 *
 * Phone test 2026-10-29: one tap on + often went 3 → 5. A short tap must be
 * exactly one step, so:
 * - a second step from a separate press within IGNORE_REPEAT_MS is dropped
 *   (a phone that reports one tap twice);
 * - holding only repeats when there are many steps to go (more than
 *   HOLD_NEEDS_STEPS), e.g. focus minutes, never for "times a week";
 * - when it does repeat, it waits HOLD_DELAY_MS before the first extra step.
 */
export const IGNORE_REPEAT_MS = 120;
export const HOLD_NEEDS_STEPS = 12;
export const HOLD_DELAY_MS = 600;
export const HOLD_EVERY_MS = 250;
export const HOLD_FAST_MS = 120;
export const HOLD_FAST_AFTER = 8;

/** The value one step away, kept in range; rounded so 0.1 steps don't drift. */
export function stepped(value: number, dir: 1 | -1, step: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round((value + dir * step) * 100) / 100));
}

/** Whether holding a button keeps stepping for this range. */
export function holdRepeats(min: number, max: number, step: number): boolean {
  return (max - min) / step > HOLD_NEEDS_STEPS;
}

/** The wait before the n-th extra step (0-based) while a button is held. */
export function holdPause(n: number): number {
  return n < HOLD_FAST_AFTER ? HOLD_EVERY_MS : HOLD_FAST_MS;
}

/** A tap at `now` counts unless the last step from a tap was a moment ago. */
export function tapCounts(now: number, lastTap: number | undefined): boolean {
  return lastTap === undefined || now - lastTap >= IGNORE_REPEAT_MS;
}
