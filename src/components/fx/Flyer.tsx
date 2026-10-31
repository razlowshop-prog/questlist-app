import { useEffect, useRef, useState } from 'react';
import { type HostInstance, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming, type EasingFunction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { BizzyMood } from '../../bizzy';
import { chainAt, type Curve } from '../../flight';
import { Bizzy } from '../Bizzy';

/**
 * A Bizzy that flies along Bézier paths (flight.ts), for the big moments.
 * `place` puts him somewhere at once; `fly` follows a path and resolves when
 * he gets there. Positions are his centre, in the parent's points.
 */
export interface Flyer {
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  rot: SharedValue<number>;
  opacity: SharedValue<number>;
  /** 0 → 1 along `path` while flying. */
  p: SharedValue<number>;
  path: SharedValue<Curve[]>;
  flying: SharedValue<number>;
  mood: BizzyMood;
  setMood: (m: BizzyMood) => void;
  fast: boolean;
  setFast: (f: boolean) => void;
  place: (x: number, y: number, scale?: number, rot?: number) => void;
  fly: (path: Curve[], ms: number, opts?: { scale?: number; easing?: EasingFunction }) => Promise<void>;
  /** Animates scale and turn on the spot. */
  to: (scale: number, rot: number, ms: number, easing?: EasingFunction) => Promise<void>;
}

export function useFlyer(start: BizzyMood = 'happy'): Flyer {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(0);
  const p = useSharedValue(0);
  const path = useSharedValue<Curve[]>([]);
  const flying = useSharedValue(0);
  const [mood, setMood] = useState<BizzyMood>(start);
  const [fast, setFast] = useState(true);
  useEffect(
    () => () => {
      cancelAnimation(p);
      cancelAnimation(scale);
      cancelAnimation(rot);
    },
    [],
  );
  return {
    x,
    y,
    scale,
    rot,
    opacity,
    p,
    path,
    flying,
    mood,
    setMood,
    fast,
    setFast,
    place(px, py, s = 1, r = 0) {
      flying.value = 0;
      x.value = px;
      y.value = py;
      scale.value = s;
      rot.value = r;
      opacity.value = 1;
    },
    fly(chain, ms, { scale: to, easing = Easing.inOut(Easing.quad) } = {}) {
      return new Promise<void>((resolve) => {
        const end = chain[chain.length - 1][3];
        path.value = chain;
        p.value = 0;
        flying.value = 1;
        opacity.value = 1;
        if (to !== undefined) scale.value = withTiming(to, { duration: ms });
        p.value = withTiming(1, { duration: ms, easing }, (done) => {
          if (!done) return;
          // He stays where the path ends.
          x.value = end[0];
          y.value = end[1];
          flying.value = 0;
          scheduleOnRN(resolve);
        });
      });
    },
    to(s, r, ms, easing = Easing.out(Easing.quad)) {
      return new Promise<void>((resolve) => {
        rot.value = withTiming(r, { duration: ms, easing });
        scale.value = withTiming(s, { duration: ms, easing }, (done) => {
          if (done) scheduleOnRN(resolve);
        });
      });
    },
  };
}

/** Draws a flyer: Bizzy at `size`, centred on the flyer's point. */
export function FlyingBizzy({ flyer, size, style }: { flyer: Flyer; size: number; style?: StyleProp<ViewStyle> | ReturnType<typeof useAnimatedStyle> }) {
  const { x, y, scale, rot, opacity, p, path, flying } = flyer;
  const anim = useAnimatedStyle(() => {
    let px = x.value;
    let py = y.value;
    if (flying.value) [px, py] = chainAt(path.value, p.value);
    return {
      opacity: opacity.value,
      transform: [{ translateX: px - size / 2 }, { translateY: py - size / 2 }, { scale: scale.value }, { rotate: `${rot.value}deg` }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, style, anim]}>
      <Bizzy size={size} mood={flyer.mood} motion="none" fast={flyer.fast} />
    </Animated.View>
  );
}

/** Waits `ms`, unless the moment was left (`alive` false) in the meantime. */
export function useWait() {
  const alive = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
    },
    [],
  );
  const wait = (ms: number) => new Promise<void>((resolve) => timers.current.push(setTimeout(resolve, ms)));
  return { alive, wait };
}

/** A view that only exists to be measured: where something sits, relative to `root`. */
export function measureIn(target: HostInstance | null, root: HostInstance | null): Promise<{ x: number; y: number; w: number; h: number } | undefined> {
  return new Promise((resolve) => {
    if (!target || !root) return resolve(undefined);
    let a: number[] | undefined;
    let b: number[] | undefined;
    const done = () => {
      if (!a || !b) return;
      resolve({ x: a[0] - b[0], y: a[1] - b[1], w: a[2], h: a[3] });
    };
    try {
      target.measureInWindow((x, y, w, h) => {
        a = [x, y, w, h];
        done();
      });
      root.measureInWindow((x, y, w, h) => {
        b = [x, y, w, h];
        done();
      });
    } catch {
      resolve(undefined);
    }
  });
}
