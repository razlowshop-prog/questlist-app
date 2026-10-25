import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolateColor, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../theme';
import type { FinishKind } from '../../themeFx';
import { keyframes, LEAF, stepframes, useLoop, useLoopsOn } from './hooks';

// How a ticked task leaves the list, per theme (themeFx.ts): the row's own
// movement plus an overlay drawn with it (exhaust, leaves, a wave).

type TimingEasing = NonNullable<NonNullable<Parameters<typeof withTiming>[1]>['easing']>;

const EASING: Record<FinishKind, TimingEasing> = {
  rocket: Easing.bezier(0.6, 0, 0.9, 0.4),
  blow: Easing.bezier(0.5, 0, 0.8, 0.6),
  wash: Easing.in(Easing.ease),
  // Jumps from frame to frame (CSS steps), so time runs evenly.
  glitch: Easing.linear,
  // The row waits for the strike-through, so its own ease-in is applied in the frames.
  cross: Easing.linear,
  throw: Easing.bezier(0.4, 0, 0.6, 1),
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
      case 'glitch':
        // Jitters sideways; the clip below eats the row away.
        return {
          opacity: stepframes(v, [0, 0.55, 0.7, 0.85, 1], [1, 0.8, 0.6, 0.4, 0]),
          transform: [{ translateX: stepframes(v, [0, 0.1, 0.2, 0.3, 0.4], [0, -6, 5, 0, -3]) }, { translateY: 0 }, { rotate: '0deg' }, { skewX: '0deg' }],
        };
      case 'cross': {
        // Still while the pen strikes it through, then lifts off the page (ease-in).
        const p = Math.max(0, (v - 0.55) / 0.45);
        const e = p * p * p;
        return { opacity: 1 - e, transform: [{ translateX: 0 }, { translateY: -6 * e }, { rotate: `${-2 * e}deg` }, { skewX: '0deg' }, { scale: 1 - 0.04 * e }] };
      }
      case 'throw':
        // Hoisted up, a little wobble, then thrown off to the upper right.
        return {
          opacity: keyframes(v, [0, 0.45, 1], [1, 1, 0]),
          transform: [
            { translateX: keyframes(v, [0, 0.45, 1], [0, 0, 420]) },
            { translateY: keyframes(v, [0, 0.3, 0.45, 1], [0, -26, -30, -160]) },
            { rotate: `${keyframes(v, [0, 0.3, 0.45, 1], [0, -2, 3, 40])}deg` },
            { skewX: '0deg' },
            { scale: keyframes(v, [0, 0.3, 0.45, 1], [1, 1.03, 1.03, 0.6]) },
          ],
        };
      case 'fade':
        return { opacity: 1 - v, transform: [{ translateX: 0 }, { translateY: -8 * v }, { rotate: '0deg' }, { skewX: '0deg' }] };
    }
  });

  return (
    <Animated.View style={[leaving && { zIndex: 3 }, rowStyle]}>
      {use === 'glitch' ? (
        <GlitchClip t={t} leaving={leaving}>
          {children}
        </GlitchClip>
      ) : (
        children
      )}
      {leaving && <Overlay kind={use} t={t} />}
    </Animated.View>
  );
}

/** Neon's clip steps: [top, right, bottom, left] cut off, as fractions of the row. */
const GLITCH_AT = [0, 0.2, 0.3, 0.4, 0.55, 0.7, 0.85, 1];
const GLITCH_CLIP = [
  [0, 0, 0, 0],
  [0, 0, 0.55, 0],
  [0.4, 0, 0, 0],
  [0.1, 0, 0.3, 0],
  [0, 0.3, 0, 0],
  [0, 0.6, 0, 0.1],
  [0.45, 0.8, 0.45, 0.15],
  [0.5, 1, 0.5, 0],
];
const glitchSide = (v: number, side: number) => {
  'worklet';
  return stepframes(
    v,
    GLITCH_AT,
    GLITCH_CLIP.map((c) => c[side]),
  );
};

/**
 * Neon: cuts the row into ever smaller slices as it glitches away, with
 * magenta and cyan ghost outlines. The row keeps its height meanwhile, so
 * the list doesn't jump until it's gone.
 */
function GlitchClip({ t, leaving, children }: { t: SharedValue<number>; leaving: boolean; children: ReactNode }) {
  const c = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const w = size.w;
  const h = size.h;
  const clipStyle = useAnimatedStyle(() => {
    const v = t.value;
    if (v <= 0 || w === 0) return { width: '100%', height: 'auto', transform: [{ translateX: 0 }, { translateY: 0 }] };
    const [top, right, bottom, left] = [0, 1, 2, 3].map((i) => glitchSide(v, i));
    return { width: Math.max(0, 1 - left - right) * w, height: Math.max(0, 1 - top - bottom) * h, transform: [{ translateX: left * w }, { translateY: top * h }] };
  });
  const innerStyle = useAnimatedStyle(() => {
    const v = t.value;
    if (v <= 0 || w === 0) return { width: '100%', transform: [{ translateX: 0 }, { translateY: 0 }] };
    return { width: w, transform: [{ translateX: -glitchSide(v, 3) * w }, { translateY: -glitchSide(v, 0) * h }] };
  });
  return (
    <View
      style={leaving && h > 0 ? { height: h } : undefined}
      onLayout={(e) => {
        if (!leaving) setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
      }}
    >
      <Animated.View style={[leaving && { overflow: 'hidden' }, clipStyle as ViewStyle]}>
        <Animated.View style={innerStyle as ViewStyle}>
          {children}
          {leaving && (
            <>
              <GhostOutline t={t} color="#ff2bd6" sign={1} radius={c.radius} />
              <GhostOutline t={t} color="#22e8ff" sign={-1} radius={c.radius} />
            </>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** A coloured copy of the card's outline, knocked sideways (the board's split drop-shadows). */
function GhostOutline({ t, color, sign, radius }: { t: SharedValue<number>; color: string; sign: number; radius: number }) {
  const style = useAnimatedStyle(() => {
    const off = stepframes(t.value, [0, 0.1, 0.4], [0, 4, 6]);
    return { opacity: off > 0 ? 0.9 : 0, transform: [{ translateX: sign * off }] };
  });
  // The card has a 10 px gap below it (TaskRow), which the outline leaves out.
  return <Animated.View pointerEvents="none" style={[styles.ghost, { borderRadius: radius, borderColor: color }, style]} />;
}

/** Neon: the task card's outline pulsing slowly between cyan and magenta. */
export function RowPulse({ colors, radius }: { colors: [string, string]; radius: number }) {
  const on = useLoopsOn();
  const t = useLoop(2400, on);
  const style = useAnimatedStyle(() => ({ borderColor: interpolateColor(t.value, [0, 1], colors) }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 1, borderRadius: radius }, style]} />;
}

const styles = StyleSheet.create({
  ghost: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 10, borderWidth: 1.5 },
});

function Overlay({ kind, t }: { kind: FinishKind; t: SharedValue<number> }) {
  switch (kind) {
    case 'rocket':
      return <Exhaust t={t} />;
    case 'blow':
      return <BlownLeaves t={t} />;
    case 'wash':
      return <Wash t={t} />;
    case 'cross':
      return <StrikeThrough t={t} />;
    case 'throw':
      return <Hands t={t} />;
    case 'glitch':
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

/** Where the strike runs: from just after the check box to before the XP. */
const STRIKE_LEFT = 46;
const STRIKE_RIGHT = 60;

/** Notepad: a red pen line struck through the task, the pencil drawing it. */
function StrikeThrough({ t }: { t: SharedValue<number> }) {
  // The pen draws from 5% to 50% of the animation, easing out.
  const drawn = (v: number) => {
    'worklet';
    const p = Math.max(0, Math.min(1, (v - 0.05) / 0.45));
    return 1 - (1 - p) * (1 - p);
  };
  const line = useAnimatedStyle(() => ({ transform: [{ rotate: '-2deg' }, { scaleX: drawn(t.value) }] }));
  const pen = useAnimatedStyle(() => ({ left: `${drawn(t.value) * 100}%` }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: STRIKE_LEFT, right: STRIKE_RIGHT, top: 0, bottom: 10, justifyContent: 'center' }}>
      <Animated.View style={[{ height: 3, borderRadius: 2, backgroundColor: '#c0392b', transformOrigin: 'left' } as ViewStyle, line]} />
      <Animated.View style={[{ position: 'absolute', top: '50%', marginTop: -28, marginLeft: -6 }, pen]}>
        <Svg width={30} height={30} viewBox="0 0 40 40">
          <G transform="rotate(-38 20 20)">
            <Rect x={17} y={2} width={7} height={26} fill="#f6c343" stroke="#7a5a10" />
            <Path d="M17 28h7l-3.5 9z" fill="#f2d7a8" stroke="#7a5a10" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Gym: a little figure popping up behind the task to hoist it overhead. */
function Hands({ t }: { t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const v = t.value;
    return { opacity: keyframes(v, [0, 0.25, 0.45, 0.6], [0, 1, 1, 0]), transform: [{ translateY: keyframes(v, [0, 0.25], [20, 0]) }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: '50%', top: -34, marginLeft: -17 }, style]}>
      <Svg width={34} height={34} viewBox="0 0 34 34">
        <Circle cx={17} cy={6} r={4.5} fill="#f4f4f2" />
        <Path d="M17 11v12M8 4l9 9 9-9M17 23l-6 9M17 23l6 9" stroke="#f4f4f2" strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}
