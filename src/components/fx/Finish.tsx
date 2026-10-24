import { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path } from 'react-native-svg';
import type { FinishKind } from '../../themeFx';
import { keyframes, LEAF } from './hooks';

// How a ticked task leaves the list, per theme (themeFx.ts): the row's own
// movement plus an overlay drawn with it (exhaust, leaves, a wave).

type TimingEasing = NonNullable<NonNullable<Parameters<typeof withTiming>[1]>['easing']>;

const EASING: Record<FinishKind, TimingEasing> = {
  rocket: Easing.bezier(0.6, 0, 0.9, 0.4),
  blow: Easing.bezier(0.5, 0, 0.8, 0.6),
  wash: Easing.in(Easing.ease),
  fade: Easing.in(Easing.quad),
};

/**
 * Plays the theme's task-finish animation on a row while `leaving`, then
 * calls `onDone` so the list can drop it. Reduced motion: a plain fade.
 */
export function FinishFx({ kind, ms, leaving, onDone, children }: { kind: FinishKind; ms: number; leaving: boolean; onDone: () => void; children: ReactNode }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  const use: FinishKind = reduce ? 'fade' : kind;
  const duration = reduce ? 400 : ms;
  useEffect(() => {
    if (!leaving) {
      t.value = 0;
      return;
    }
    t.value = withTiming(1, { duration, easing: EASING[use], reduceMotion: ReduceMotion.Never }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    });
  }, [leaving]);

  const rowStyle = useAnimatedStyle(() => {
    const v = t.value;
    switch (use) {
      case 'rocket':
        // A short shake, then off to the upper right.
        return {
          opacity: keyframes(v, [0, 0.28, 1], [1, 1, 0.2]),
          transform: [
            { translateX: keyframes(v, [0, 0.12, 0.2, 0.28, 1], [0, -4, 3, -2, 460]) },
            { translateY: keyframes(v, [0, 0.28, 1], [0, 0, -90]) },
            { rotate: `${keyframes(v, [0, 0.28, 1], [0, 0, -10])}deg` },
            { skewX: '0deg' },
          ],
        };
      case 'blow':
        // Leans into the wind, then blown away up and to the right.
        return {
          opacity: keyframes(v, [0, 0.2, 1], [1, 1, 0]),
          transform: [
            { translateX: keyframes(v, [0, 0.2, 1], [0, -6, 420]) },
            { translateY: keyframes(v, [0, 0.2, 1], [0, 0, -120]) },
            { rotate: `${keyframes(v, [0, 0.2, 1], [0, -1, 18])}deg` },
            { skewX: `${keyframes(v, [0, 0.2, 1], [0, 0, -10])}deg` },
          ],
        };
      case 'wash':
        // Waits for the wave, then is carried off to the right.
        return {
          opacity: keyframes(v, [0, 0.3, 1], [1, 1, 0]),
          transform: [
            { translateX: keyframes(v, [0, 0.3, 1], [0, 0, 380]) },
            { translateY: keyframes(v, [0, 0.3, 1], [0, 0, 10]) },
            { rotate: `${keyframes(v, [0, 0.3, 1], [0, 0, 4])}deg` },
            { skewX: '0deg' },
          ],
        };
      case 'fade':
        return { opacity: 1 - v, transform: [{ translateX: 0 }, { translateY: -8 * v }, { rotate: '0deg' }, { skewX: '0deg' }] };
    }
  });

  return (
    <Animated.View style={[leaving && { zIndex: 3 }, rowStyle]}>
      {children}
      {leaving && <Overlay kind={use} t={t} />}
    </Animated.View>
  );
}

function Overlay({ kind, t }: { kind: FinishKind; t: SharedValue<number> }) {
  switch (kind) {
    case 'rocket':
      return <Exhaust t={t} />;
    case 'blow':
      return <BlownLeaves t={t} />;
    case 'wash':
      return <Wash t={t} />;
    case 'fade':
      return null;
  }
}

/** Indigo: the rocket's exhaust trail, growing behind the row as it takes off. */
function Exhaust({ t }: { t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ width: keyframes(t.value, [0, 0.25, 1], [0, 0, 160]) }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          right: '100%',
          top: '50%',
          height: 18,
          marginTop: -9,
          borderRadius: 9,
          backgroundColor: '#FF7A00',
          backgroundImage: 'linear-gradient(270deg, #ffffff, #FFE29A 15%, #FF7A00 45%, rgba(255,74,28,0))',
        } as ViewStyle,
        style,
      ]}
    />
  );
}

const BLOWN = [
  { x: 160, y: -70, delay: 0, color: '#6aa060' },
  { x: 220, y: -20, delay: 0.06, color: '#3f6b4a' },
  { x: 120, y: 30, delay: 0.12, color: '#9cc47f' },
  { x: 260, y: -90, delay: 0.04, color: '#7fae6b' },
];

/** Forest: a handful of leaves whirling off the row with it. */
function BlownLeaves({ t }: { t: SharedValue<number> }) {
  return (
    <View style={{ position: 'absolute', left: '30%', top: '30%' }} pointerEvents="none">
      {BLOWN.map((l, i) => (
        <BlownLeaf key={i} {...l} t={t} />
      ))}
    </View>
  );
}

function BlownLeaf({ x, y, delay, color, t }: { x: number; y: number; delay: number; color: string; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (t.value - delay) / (1 - delay)));
    const eased = 1 - (1 - p) * (1 - p);
    return { opacity: 1 - p, transform: [{ translateX: x * eased }, { translateY: y * eased }, { rotate: `${300 * eased}deg` }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', width: 16, height: 16 }, style]}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path d={LEAF} fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** Ocean: a wave of light water sweeping across the row. */
function Wash({ t }: { t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ left: `${-150 + 260 * t.value}%` }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -10, right: -10, top: -6, bottom: -6, borderRadius: 18, overflow: 'hidden' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '140%',
            borderTopRightRadius: 999,
            borderBottomRightRadius: 999,
            backgroundColor: 'rgba(127,227,240,0.35)',
            backgroundImage: 'linear-gradient(90deg, rgba(127,227,240,0), rgba(127,227,240,0.55) 60%, #eaf7fb 72%, rgba(26,166,196,0.6) 80%, rgba(26,166,196,0))',
          } as ViewStyle,
          style,
        ]}
      />
    </View>
  );
}
