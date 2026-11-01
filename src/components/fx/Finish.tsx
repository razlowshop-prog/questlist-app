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

/** CSS `ease-in`. */
const EASE_IN = Easing.bezier(0.42, 0, 1, 1);

const EASING: Record<FinishKind, TimingEasing> = {
  rocket: Easing.bezier(0.6, 0, 0.9, 0.4),
  blow: Easing.bezier(0.5, 0, 0.8, 0.6),
  wash: Easing.in(Easing.ease),
  // Jumps from frame to frame (CSS steps), so time runs evenly.
  glitch: Easing.linear,
  // The row waits for the strike-through, so its own ease-in is applied in the frames.
  cross: Easing.linear,
  throw: Easing.bezier(0.4, 0, 0.6, 1),
  sink: EASE_IN,
  zap: Easing.linear,
  up: EASE_IN,
  burn: EASE_IN,
  dust: EASE_IN,
  // The frames below hold still for the sheen, then ease the coin away.
  gild: Easing.linear,
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
      case 'sink':
        // Glows up a little, then sinks behind the horizon (the clip below).
        return { opacity: 1 - v, transform: [{ translateX: 0 }, { translateY: keyframes(v, [0, 0.35, 1], [0, -4, 40]) }, { rotate: '0deg' }, { skewX: '0deg' }] };
      case 'zap':
        // Struck: a flash, a jolt each way, then the broken part drops away.
        return {
          opacity: stepframes(v, [0, 0.6, 0.8, 1], [1, 0.7, 0.3, 0]),
          transform: [
            { translateX: stepframes(v, [0, 0.3, 0.45, 0.6], [0, 3, -3, -8]) },
            { translateY: stepframes(v, [0, 0.6], [0, 6]) },
            { rotate: `${stepframes(v, [0, 0.6], [0, -3])}deg` },
            { skewX: '0deg' },
          ],
        };
      case 'up':
        // Rises into the clouds.
        return {
          opacity: keyframes(v, [0, 0.6, 1], [1, 0.5, 0]),
          transform: [{ translateX: 0 }, { translateY: -50 * v }, { rotate: '0deg' }, { skewX: '0deg' }, { scale: 1 - 0.08 * v }],
        };
      case 'burn':
        // Catches fire and burns away from the left (the clip below).
        return { opacity: keyframes(v, [0, 0.6, 1], [1, 0.8, 0]), transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }, { skewX: '0deg' }] };
      case 'dust':
        // Brightens and drifts up as it crumbles into stardust.
        return { opacity: 1 - v, transform: [{ translateX: 0 }, { translateY: -14 * v }, { rotate: '0deg' }, { skewX: '0deg' }] };
      case 'gild': {
        // Turns to gold under the sheen, then shrinks into a coin that flies up to the XP bar.
        const p = Math.max(0, (v - 0.55) / 0.45);
        const e = p * p;
        return {
          opacity: 1 - e,
          transform: [{ translateX: 0 }, { translateY: -220 * e }, { rotate: '0deg' }, { skewX: '0deg' }, { scale: keyframes(v, [0, 0.35, 0.55, 1], [1, 1, 0.98, 0.08]) }],
        };
      }
      case 'fade':
        return { opacity: 1 - v, transform: [{ translateX: 0 }, { translateY: -8 * v }, { rotate: '0deg' }, { skewX: '0deg' }] };
    }
  });
  const clip = CLIP[use];

  return (
    <Animated.View style={[leaving && { zIndex: 3 }, rowStyle]}>
      {clip ? (
        <ClipBox t={t} leaving={leaving} insets={clip}>
          {children}
          {leaving && <Tint kind={use} t={t} />}
        </ClipBox>
      ) : (
        <>
          {children}
          {leaving && <Tint kind={use} t={t} />}
        </>
      )}
      {leaving && <Overlay kind={use} t={t} />}
    </Animated.View>
  );
}

type Insets = [top: number, right: number, bottom: number, left: number];

/** Neon's clip steps: [top, right, bottom, left] cut off, as fractions of the row. */
const GLITCH_AT = [0, 0.2, 0.3, 0.4, 0.55, 0.7, 0.85, 1];
const GLITCH_CLIP: Insets[] = [
  [0, 0, 0, 0],
  [0, 0, 0.55, 0],
  [0.4, 0, 0, 0],
  [0.1, 0, 0.3, 0],
  [0, 0.3, 0, 0],
  [0, 0.6, 0, 0.1],
  [0.45, 0.8, 0.45, 0.15],
  [0.5, 1, 0.5, 0],
];

/** How much of the row each finish cuts away over time (`v` 0..1). */
const CLIP: Partial<Record<FinishKind, (v: number) => Insets>> = {
  // Neon: ever smaller slices.
  glitch: (v) => {
    'worklet';
    let i = 0;
    while (i + 1 < GLITCH_AT.length && v >= GLITCH_AT[i + 1]) i++;
    return GLITCH_CLIP[i];
  },
  // Sunset: sinks below the horizon, from the bottom up.
  sink: (v) => {
    'worklet';
    return [0, 0, v, 0];
  },
  // Thunder: the right part breaks off where the bolt hit.
  zap: (v) => {
    'worklet';
    return [0, v >= 0.45 ? 0.47 : 0, 0, 0];
  },
  // Ember: burns away from the left.
  burn: (v) => {
    'worklet';
    return [0, 0, 0, keyframes(v, [0, 0.25, 0.6, 1], [0, 0, 0.45, 1])];
  },
};

/** The 10 px gap under a task card (TaskRow), which overlays on the card leave out. */
function useCardGap(): number {
  const c = useTheme();
  return c.listStyle === 'cards' && !c.holo ? 10 : 0;
}

/**
 * Cuts the row away as it leaves (`insets` over time). The row keeps its
 * height meanwhile, so the list doesn't jump until it's gone.
 */
function ClipBox({ t, leaving, insets, children }: { t: SharedValue<number>; leaving: boolean; insets: (v: number) => Insets; children: ReactNode }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const w = size.w;
  const h = size.h;
  const clipStyle = useAnimatedStyle(() => {
    const v = t.value;
    if (v <= 0 || w === 0) return { width: '100%', height: 'auto', transform: [{ translateX: 0 }, { translateY: 0 }] };
    const [top, right, bottom, left] = insets(v);
    return { width: Math.max(0, 1 - left - right) * w, height: Math.max(0, 1 - top - bottom) * h, transform: [{ translateX: left * w }, { translateY: top * h }] };
  });
  const innerStyle = useAnimatedStyle(() => {
    const v = t.value;
    if (v <= 0 || w === 0) return { width: '100%', transform: [{ translateX: 0 }, { translateY: 0 }] };
    const [top, , , left] = insets(v);
    return { width: w, transform: [{ translateX: -left * w }, { translateY: -top * h }] };
  });
  return (
    <View
      style={leaving && h > 0 ? { height: h } : undefined}
      onLayout={(e) => {
        if (!leaving) setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
      }}
    >
      <Animated.View style={[leaving && { overflow: 'hidden' }, clipStyle as ViewStyle]}>
        <Animated.View style={innerStyle as ViewStyle}>{children}</Animated.View>
      </Animated.View>
    </View>
  );
}

/** Light or colour washed over the card itself while it leaves (cut with it). */
function Tint({ kind, t }: { kind: FinishKind; t: SharedValue<number> }) {
  const c = useTheme();
  const gap = useCardGap();
  const shape = { borderRadius: c.radius, bottom: gap };
  switch (kind) {
    case 'glitch':
      return (
        <>
          <GhostOutline t={t} color="#ff2bd6" sign={1} style={shape} />
          <GhostOutline t={t} color="#22e8ff" sign={-1} style={shape} />
        </>
      );
    case 'sink':
      // Turns sunset orange as it goes down.
      return <Glow t={t} color="#ff8c3c" at={[0, 0.35, 1]} opacity={[0, 0.25, 0.5]} style={shape} />;
    case 'zap':
      // The flash of the strike.
      return <Glow t={t} color="#fff6b0" at={[0, 0.15, 0.3]} opacity={[0, 0.85, 0]} steps style={shape} />;
    case 'burn':
      return <Glow t={t} color="#ff7a00" at={[0, 0.25, 0.6]} opacity={[0, 0.35, 0.2]} style={shape} />;
    case 'dust':
      return <Glow t={t} color="#ffffff" at={[0, 0.3, 1]} opacity={[0, 0.15, 0.3]} style={shape} />;
    case 'gild':
      return (
        <>
          <Glow t={t} color="#e8c66c" at={[0, 0.35, 1]} opacity={[0, 0.6, 0.9]} style={shape} />
          <GildSheen t={t} style={shape} />
        </>
      );
    default:
      return null;
  }
}

/** Gold: a bright band of light sweeping across the card in the first 0.45 s. */
function GildSheen({ t, style }: { t: SharedValue<number>; style: ViewStyle }) {
  const anim = useAnimatedStyle(() => {
    const p = Math.min(1, t.value / 0.41);
    return { opacity: t.value < 0.41 ? 1 : 0, left: `${120 - 140 * p}%` };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.cover, style, { overflow: 'hidden', left: 0, right: 0 }]}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: '60%', marginLeft: '-30%', backgroundImage: 'linear-gradient(100deg, rgba(255,243,196,0) 0%, rgba(255,243,196,0.9) 50%, rgba(255,243,196,0) 100%)' } as ViewStyle, anim]} />
    </Animated.View>
  );
}

/**
 * Gold: the task card's outline, with a light running along it every 7 s
 * (cards start `index` × 1.7 s apart). The light is a bright band moving
 * behind the card, seen only through the 1 px edge left around the inner fill.
 */
export function RowSheen({ colors, radius, fillColor, index }: { colors: [string, string]; radius: number; fillColor: string; index: number }) {
  const on = useLoopsOn();
  const t = useLoop(7000, on, { delay: (index % 4) * 1700, restart: true, easing: Easing.linear });
  const band = useAnimatedStyle(() => {
    const p = Math.min(1, t.value / 0.55);
    return { left: `${130 - 160 * p}%` };
  });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -1, right: -1, top: -1, bottom: -1, borderRadius: radius, overflow: 'hidden', backgroundColor: colors[0] }}>
      {on && (
        <Animated.View
          style={[{ position: 'absolute', top: 0, bottom: 0, width: '40%', marginLeft: '-20%', backgroundImage: `linear-gradient(110deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[0]} 100%)` } as ViewStyle, band]}
        />
      )}
      <View style={{ position: 'absolute', left: 1, right: 1, top: 1, bottom: 1, borderRadius: Math.max(0, radius - 1), backgroundColor: fillColor }} />
    </View>
  );
}

function Glow({ t, color, at, opacity, steps, style }: { t: SharedValue<number>; color: string; at: number[]; opacity: number[]; steps?: boolean; style: ViewStyle }) {
  const anim = useAnimatedStyle(() => ({ opacity: steps ? stepframes(t.value, at, opacity) : keyframes(t.value, at, opacity) }));
  return <Animated.View pointerEvents="none" style={[styles.cover, { backgroundColor: color }, style, anim]} />;
}

/** A coloured copy of the card's outline, knocked sideways (the board's split drop-shadows). */
function GhostOutline({ t, color, sign, style }: { t: SharedValue<number>; color: string; sign: number; style: ViewStyle }) {
  const anim = useAnimatedStyle(() => {
    const off = stepframes(t.value, [0, 0.1, 0.4], [0, 4, 6]);
    return { opacity: off > 0 ? 0.9 : 0, transform: [{ translateX: sign * off }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.cover, { borderWidth: 1.5, borderColor: color }, style, anim]} />;
}

/** Neon: the task card's outline pulsing slowly between cyan and magenta. */
export function RowPulse({ colors, radius }: { colors: [string, string]; radius: number }) {
  const on = useLoopsOn();
  const t = useLoop(2400, on);
  const style = useAnimatedStyle(() => ({ borderColor: interpolateColor(t.value, [0, 1], colors) }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 1, borderRadius: radius }, style]} />;
}

const styles = StyleSheet.create({
  cover: { position: 'absolute', left: 0, right: 0, top: 0 },
  cloud: { position: 'absolute', borderRadius: 999, backgroundColor: '#ffffff' },
  // Blurred where phones can blur; faint enough to stay soft where they can't.
  smoke: { position: 'absolute', bottom: '40%', width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(160,150,145,0.35)', filter: 'blur(5px)' } as ViewStyle,
  mote: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#ffffff', boxShadow: '0 0 6px #a3b3ea' } as ViewStyle,
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
    case 'zap':
      return <Strike t={t} />;
    case 'up':
      return <Puff t={t} />;
    case 'burn':
      return <Smoke t={t} />;
    case 'dust':
      return <Stardust t={t} />;
    case 'glitch':
    case 'sink':
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

/** Stadium: a little figure popping up behind the task to hoist it overhead. */
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

/** Thunder: the bolt that strikes the task, there for a blink. */
function Strike({ t }: { t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: stepframes(t.value, [0, 0.1, 0.31], [0, 1, 0]) }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: '58%', top: -60 }, style]}>
      <Svg width={30} height={90} viewBox="0 0 30 90">
        <Path d="M18 0 6 40h9L8 90 26 32h-9l6-32z" fill="#fff6b0" />
      </Svg>
    </Animated.View>
  );
}

/** Summit: a puff of cloud the task rises into. */
function Puff({ t }: { t: SharedValue<number> }) {
  const gap = useCardGap();
  const style = useAnimatedStyle(() => {
    const v = t.value;
    return { opacity: keyframes(v, [0, 0.4, 1], [0, 0.95, 0]), transform: [{ translateY: keyframes(v, [0, 0.4, 1], [0, 0, -40]) }, { scale: keyframes(v, [0, 0.4, 1], [1, 1, 1.3]) }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: gap }, style]}>
      <View style={[styles.cloud, { left: '22%', top: '22%', width: '16%', aspectRatio: 1 }]} />
      <View style={[styles.cloud, { left: '43%', top: '5%', width: '24%', aspectRatio: 1 }]} />
      <View style={[styles.cloud, { left: '66%', top: '25%', width: '17%', aspectRatio: 1 }]} />
    </Animated.View>
  );
}

const SMOKE = [
  { left: '15%', start: 0.22 },
  { left: '35%', start: 0.33 },
  { left: '55%', start: 0.43 },
  { left: '75%', start: 0.54 },
] as const;

/** Ember: grey smoke curling up as the task burns. */
function Smoke({ t }: { t: SharedValue<number> }) {
  return (
    <>
      {SMOKE.map((p, i) => (
        <SmokePuff key={i} t={t} left={p.left} start={p.start} />
      ))}
    </>
  );
}

function SmokePuff({ t, left, start }: { t: SharedValue<number>; left: `${number}%`; start: number }) {
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (t.value - start) / (1 - start)));
    const out = 1 - (1 - p) * (1 - p);
    return { opacity: keyframes(p, [0, 0.2, 1], [0, 0.8, 0]), transform: [{ translateX: 10 * out }, { translateY: -70 * out }, { scale: 1 + 1.2 * out }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.smoke, { left }, style]} />;
}

const DUST = [
  { left: '10%', top: '50%', x: -10, y: -60, delay: 0 },
  { left: '25%', top: '30%', x: 20, y: -80, delay: 0.05 },
  { left: '40%', top: '60%', x: -15, y: -70, delay: 0.11 },
  { left: '55%', top: '40%', x: 30, y: -90, delay: 0.03 },
  { left: '70%', top: '55%', x: 10, y: -60, delay: 0.08 },
  { left: '85%', top: '35%', x: 25, y: -75, delay: 0.14 },
  { left: '32%', top: '70%', x: 5, y: -50, delay: 0.18 },
  { left: '63%', top: '25%', x: -20, y: -85, delay: 0.15 },
] as const;

/** Midnight: sparks of stardust drifting up from the task. */
function Stardust({ t }: { t: SharedValue<number> }) {
  const gap = useCardGap();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: gap }}>
      {DUST.map((d, i) => (
        <Mote key={i} t={t} {...d} />
      ))}
    </View>
  );
}

function Mote({ t, left, top, x, y, delay }: { t: SharedValue<number>; left: `${number}%`; top: `${number}%`; x: number; y: number; delay: number }) {
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (t.value - delay) / (1 - delay)));
    const out = 1 - (1 - p) * (1 - p);
    return { opacity: keyframes(p, [0, 0.2, 1], [0, 1, 0]), transform: [{ translateX: x * out }, { translateY: y * out }] };
  });
  return <Animated.View style={[styles.mote, { left, top }, style]} />;
}
