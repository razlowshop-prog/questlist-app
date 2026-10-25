import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { cancelAnimation, Easing, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type EasingFunction, type SharedValue } from 'react-native-reanimated';

// Shared helpers for the theme animations (mascots, ambient layers, bar decor).

/** False while the app is in the background, so loops can rest. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s !== 'background'));
    return () => sub.remove();
  }, []);
  return active;
}

/** Whether idle loops and ambient layers may run: not with reduced motion, not in the background. */
export function useLoopsOn(): boolean {
  const reduce = useReducedMotion();
  const active = useAppActive();
  return !reduce && active;
}

/**
 * A value looping 0 → 1 → 0, or 0 → 1 and over again with `restart`,
 * resting at 0 while `on` is false. `delay` offsets the start.
 */
export function useLoop(duration: number, on: boolean, { delay = 0, restart = false, easing = Easing.inOut(Easing.sin) as EasingFunction } = {}): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!on) {
      cancelAnimation(v);
      v.value = 0;
      return;
    }
    const run = restart
      ? withRepeat(withTiming(1, { duration, easing }), -1, false)
      : withRepeat(withSequence(withTiming(1, { duration: duration / 2, easing }), withTiming(0, { duration: duration / 2, easing })), -1, false);
    v.value = withDelay(delay, run);
    return () => cancelAnimation(v);
  }, [on, duration, delay]);
  return v;
}

/** A steady pseudo-random number in [0, 1) for particle `i`, so layouts don't jump between renders. */
export function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Linear steps through keyframes: `at` are the stops (0..1), `values` the values there. */
export function keyframes(t: number, at: number[], values: number[]): number {
  'worklet';
  if (t <= at[0]) return values[0];
  for (let i = 1; i < at.length; i++) {
    if (t <= at[i]) return values[i - 1] + ((values[i] - values[i - 1]) * (t - at[i - 1])) / (at[i] - at[i - 1]);
  }
  return values[values.length - 1];
}

export const LEAF = 'M12 2C6 6 4 12 6 20c1-4 3-7 6-9-2 3-3 6-3 9 7-2 10-9 3-18z';

/** Like `keyframes`, but holds each value until the next stop (CSS `steps(1)`). */
export function stepframes(t: number, at: number[], values: number[]): number {
  'worklet';
  let v = values[0];
  for (let i = 0; i < at.length; i++) if (t >= at[i]) v = values[i];
  return v;
}
