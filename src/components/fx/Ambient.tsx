import { useMemo, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { G, Path, Rect } from 'react-native-svg';
import type { AmbientKind } from '../../themeFx';
import { BLINK_GROUPS, skyline, SKYLINE_HEIGHT, WINDOW_H, WINDOW_W, type Window as SkylineWindow } from '../../skyline';
import { keyframes, LEAF, seeded, stepframes, useLoop, useLoopsOn } from './hooks';

// The theme's background layer: a few slow particles behind everything,
// never in the way of a tap. Off with reduced motion and in the background.

export function Ambient({ kind }: { kind: AmbientKind }) {
  const on = useLoopsOn();
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {on && size.h > 0 && <Layer kind={kind} w={size.w} h={size.h} />}
    </View>
  );
}

function Layer({ kind, w, h }: { kind: AmbientKind; w: number; h: number }) {
  switch (kind) {
    case 'stars':
      return <Stars />;
    case 'leaves':
      return <Leaves w={w} h={h} />;
    case 'sea':
      return <Sea w={w} h={h} />;
    case 'skyline':
      return <Skyline w={w} />;
    case 'noir':
      return <Noir w={w} h={h} />;
    case 'floor':
      return <Floor />;
    case 'dusk':
      return <Dusk w={w} />;
    case 'storm':
      return <Storm />;
    case 'peaks':
      return <Peaks w={w} h={h} />;
    case 'embers':
      return <Embers w={w} h={h} />;
    case 'night':
      return <Night w={w} h={h} />;
  }
}

const STAR = 'M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z';

/** Indigo: small four-point stars twinkling across the screen. */
function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: seeded(i, 1),
        y: seeded(i, 2),
        size: 4 + Math.round(seeded(i, 3) * 5),
        duration: 2100 + Math.round(seeded(i, 4) * 2800),
        delay: Math.round(seeded(i, 5) * 3000),
      })),
    [],
  );
  return (
    <>
      {stars.map((st, i) => (
        <Star key={i} {...st} />
      ))}
    </>
  );
}

function Star({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  const t = useLoop(duration, true, { delay });
  const style = useAnimatedStyle(() => ({ opacity: 0.15 + 0.75 * t.value, transform: [{ scale: 1 + 0.2 * t.value }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={STAR} fill="#C6F4FF" />
      </Svg>
    </Animated.View>
  );
}

/** Forest: leaves drifting down in a lazy zigzag, turning as they fall. */
function Leaves({ w, h }: { w: number; h: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        x: seeded(i, 7) * (w - 40),
        size: 14 + Math.round(seeded(i, 8) * 6),
        turn: Math.round(seeded(i, 9) * 360),
        duration: 9500 + Math.round(seeded(i, 10) * 3500),
        delay: Math.round(seeded(i, 11) * 9000),
      })),
    [w],
  );
  return (
    <>
      {leaves.map((l, i) => (
        <Leaf key={i} {...l} h={h} />
      ))}
    </>
  );
}

function Leaf({ x, size, turn, duration, delay, h }: { x: number; size: number; turn: number; duration: number; delay: number; h: number }) {
  const t = useLoop(duration, true, { delay, restart: true, easing: Easing.linear });
  const fall = h + 60;
  const style = useAnimatedStyle(() => {
    const v = t.value;
    return {
      opacity: 0.8,
      transform: [
        { translateX: keyframes(v, [0, 0.25, 0.5, 0.75, 1], [0, 40, 10, 60, 30]) },
        { translateY: v * fall },
        { rotate: `${360 * v}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: -30, width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: [{ rotate: `${turn}deg` }] }}>
        <Path d={LEAF} fill="#7fae6b" />
      </Svg>
    </Animated.View>
  );
}

/** Ocean: bubbles rising from the deep, two slow waves rolling along the bottom, and now and then a little fish. */
function Sea({ w, h }: { w: number; h: number }) {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: seeded(i, 12) * (w - 20),
        size: 6 + Math.round(seeded(i, 13) * 9),
        duration: 9000 + Math.round(seeded(i, 14) * 3000),
        delay: Math.round(seeded(i, 15) * 10000),
      })),
    [w],
  );
  return (
    <>
      <Wave w={w} height={60} color="#1aa6c4" opacity={0.35} duration={7000} />
      <Wave w={w} height={44} color="#0d6f8f" opacity={0.5} duration={11000} reverse />
      {bubbles.map((b, i) => (
        <Bubble key={i} {...b} h={h} />
      ))}
      <Fish w={w} y={h * 0.62} delay={6000} />
      <Fish w={w} y={h * 0.38} delay={29000} reverse />
    </>
  );
}

/** How often a fish comes by, and the share of that time it takes to cross. */
const FISH_LOOP = 46000;
const FISH_SWIM = 0.24;
const FISH_SIZE = 26;

/** A small fish crossing the screen about once in FISH_LOOP ms, bobbing a little; gone the rest of the time. */
function Fish({ w, y, delay, reverse }: { w: number; y: number; delay: number; reverse?: boolean }) {
  const t = useLoop(FISH_LOOP, true, { delay, restart: true, easing: Easing.linear });
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, t.value / FISH_SWIM);
    const x = -FISH_SIZE * 2 + (w + FISH_SIZE * 4) * p;
    return {
      opacity: t.value < FISH_SWIM ? keyframes(p, [0, 0.08, 0.92, 1], [0, 0.45, 0.45, 0]) : 0,
      transform: [{ translateX: reverse ? w - x - FISH_SIZE : x }, { translateY: 6 * Math.sin(p * Math.PI * 5) }, { scaleX: reverse ? -1 : 1 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: y, width: FISH_SIZE, height: FISH_SIZE * 0.6 }, style]}>
      <Svg width={FISH_SIZE} height={FISH_SIZE * 0.6} viewBox="0 0 30 18">
        <Path d="M2 9 L9 3 L9 15 Z" fill="#7fd3e6" />
        <Path d="M8 9 C 12 1, 24 1, 29 9 C 24 17, 12 17, 8 9 Z" fill="#7fd3e6" />
        <Path d="M24 7.2 a1.3 1.3 0 1 0 0.01 0" fill="#0b3a4c" />
      </Svg>
    </Animated.View>
  );
}

function Wave({ w, height, color, opacity, duration, reverse }: { w: number; height: number; color: string; opacity: number; duration: number; reverse?: boolean }) {
  const t = useLoop(duration, true, { restart: true, easing: Easing.linear });
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: reverse ? -w + w * t.value : -w * t.value }] }));
  const mid = height / 2;
  // Two screen widths of gentle crests, so sliding by one width loops seamlessly.
  const crest = w / 4;
  let d = `M0 ${mid}`;
  for (let x = 0; x < w * 2; x += crest) d += ` Q ${x + crest / 2} ${mid - height / 3} ${x + crest} ${mid}`;
  d += ` V${height} H0z`;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0, width: w * 2, height, opacity }, style]}>
      <Svg width={w * 2} height={height}>
        <Path d={d} fill={color} />
      </Svg>
    </Animated.View>
  );
}

function Bubble({ x, size, duration, delay, h }: { x: number; size: number; duration: number; delay: number; h: number }) {
  const t = useLoop(duration, true, { delay, restart: true, easing: Easing.linear });
  const rise = h + 40;
  const style = useAnimatedStyle(() => {
    const v = t.value;
    return {
      opacity: keyframes(v, [0, 0.1, 0.85, 1], [0, 1, 1, 0]),
      transform: [{ translateX: keyframes(v, [0, 0.5, 1], [0, 8, -6]) }, { translateY: -rise * v }],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, bottom: -20, width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: 'rgba(191,240,250,0.55)' },
        style,
      ]}
    />
  );
}

/** Neon: a dark city skyline along the bottom with a soft magenta glow; now and then a window blinks. */
function Skyline({ w }: { w: number }) {
  const { towers, windows } = useMemo(() => skyline(w), [w]);
  return (
    <>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 230, backgroundImage: 'linear-gradient(0deg, rgba(255,43,214,0.10), rgba(255,43,214,0))' } as ViewStyle} />
      <Svg width={w} height={SKYLINE_HEIGHT} style={{ position: 'absolute', left: 0, bottom: 0 }}>
        {towers.map((t, i) => (
          <G key={i}>
            <Rect x={t.x} y={SKYLINE_HEIGHT - t.height} width={t.width} height={t.height} fill="#170a2a" />
            {t.antenna && <Rect x={t.x + t.width / 2 - 1} y={SKYLINE_HEIGHT - t.height - 10} width={2} height={10} fill="#170a2a" />}
          </G>
        ))}
        <Rect x={0} y={SKYLINE_HEIGHT - 6} width={w} height={6} fill="#0c0518" />
      </Svg>
      {Array.from({ length: BLINK_GROUPS }, (_, g) => (
        <WindowGroup key={g} group={g} w={w} windows={windows.filter((win) => win.group === g)} />
      ))}
    </>
  );
}

/** One group of lit windows: on, then off for a blink, at its own moment of a 9 s loop. */
function WindowGroup({ group, w, windows }: { group: number; w: number; windows: SkylineWindow[] }) {
  const t = useLoop(9000, true, { delay: group * 2300, restart: true, easing: Easing.linear });
  const style = useAnimatedStyle(() => ({ opacity: t.value > 0.7 && t.value < 0.72 ? 0.15 : 0.9 }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0, width: w, height: SKYLINE_HEIGHT }, style]}>
      <Svg width={w} height={SKYLINE_HEIGHT}>
        {windows.map((win, i) => (
          <Rect key={i} x={win.x} y={win.y} width={WINDOW_W} height={WINDOW_H} fill={win.color} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** Gym: dark rubber floor tiles along the bottom of the screen. */
function Floor() {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, flexDirection: 'row', overflow: 'hidden' }}>
      {Array.from({ length: 24 }, (_, i) => (
        <View key={i} style={{ width: 60, backgroundColor: i % 2 ? '#18191c' : '#1c1d21' }} />
      ))}
      <View style={[StyleSheet.absoluteFill, { backgroundImage: 'linear-gradient(180deg, #141518 0%, rgba(20,21,24,0) 60%)' } as ViewStyle]} />
    </View>
  );
}

/** Sunset: the sky's glow slowly breathing, soft hills along the bottom. */
function Dusk({ w }: { w: number }) {
  const t = useLoop(16000, true);
  const sky = useAnimatedStyle(() => ({ opacity: 1 - 0.6 * t.value }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundImage: 'linear-gradient(180deg, rgba(255,140,90,0.35), rgba(255,140,90,0) 45%)' } as ViewStyle, sky]} />
      <Svg width={w} height={120} viewBox="0 0 390 120" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.35 }}>
        <Path d="M0 80 Q 60 40 120 70 T 250 60 T 390 70 V120 H0z" fill="#e6b39a" />
        <Path d="M0 100 Q 90 70 180 95 T 390 90 V120 H0z" fill="#d48f74" />
      </Svg>
    </>
  );
}

/** Thunder: every few seconds the sky flickers and a bolt cracks in the corner. */
function Storm() {
  const t = useLoop(7000, true, { restart: true, easing: Easing.linear });
  const flash = useAnimatedStyle(() => ({ opacity: keyframes(t.value, [0, 0.9, 0.91, 0.92, 0.93, 0.94, 1], [0, 0, 0.18, 0.04, 0.18, 0, 0]) }));
  const bolt = useAnimatedStyle(() => ({ opacity: stepframes(t.value, [0, 0.91, 0.93], [0, 0.9, 0]) }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#cfd6ff' }, flash]} />
      <Animated.View style={[{ position: 'absolute', right: 40, top: 30 }, bolt]}>
        <Svg width={60} height={140} viewBox="0 0 60 140">
          <Path d="M34 0 14 60h16L18 140 50 50H34L44 0z" fill="#fff6b0" />
        </Svg>
      </Animated.View>
    </>
  );
}

const CLOUDS = [
  { top: 0.753, width: 107, duration: 36100, delay: 0.66 },
  { top: 0.708, width: 75, duration: 37600, delay: 0.62 },
  { top: 0.734, width: 75, duration: 26700, delay: 0.53 },
  { top: 0.723, width: 73, duration: 33600, delay: 0.01 },
];

/** Summit: a mountain ridge with a snowy peak, clouds drifting past. */
function Peaks({ w, h }: { w: number; h: number }) {
  return (
    <>
      <Svg width={w} height={170} viewBox="0 0 390 170" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.5 }}>
        <Path d="M0 170 L70 80 L110 115 L190 30 L250 100 L300 60 L390 140 V170z" fill="#c4ced8" />
        <Path d="M190 30 L172 52 L186 48 L196 58 L206 46z" fill="#fff" />
      </Svg>
      {CLOUDS.map((c, i) => (
        <Cloud key={i} top={c.top * h} width={c.width} duration={c.duration} start={c.delay} w={w} />
      ))}
    </>
  );
}

function Cloud({ top, width, duration, start, w }: { top: number; width: number; duration: number; start: number; w: number }) {
  // Starts partway across, like the board's negative delays, then loops from the left edge.
  const t = useLoop(duration, true, { restart: true, easing: Easing.linear });
  const span = w + 330;
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -200 + (((t.value + start) % 1) * span) }] }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top, width, height: 20, borderRadius: 20, backgroundColor: '#fff', opacity: 0.75 }, style]} />;
}

/** Ember: sparks rising from the bottom of the screen, drifting as they go. */
function Embers({ w, h }: { w: number; h: number }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: seeded(i, 20) * (w - 6),
        size: 2 + Math.round(seeded(i, 21) * 3),
        duration: 5400 + Math.round(seeded(i, 22) * 4600),
        start: seeded(i, 23),
      })),
    [w],
  );
  return (
    <>
      {sparks.map((p, i) => (
        <Spark key={i} {...p} h={h} />
      ))}
    </>
  );
}

function Spark({ x, size, duration, start, h }: { x: number; size: number; duration: number; start: number; h: number }) {
  const t = useLoop(duration, true, { restart: true, easing: Easing.linear });
  const rise = h + 20;
  const style = useAnimatedStyle(() => {
    const v = (t.value + start) % 1;
    return { opacity: keyframes(v, [0, 0.1, 1], [0, 1, 0]), transform: [{ translateX: 30 * v }, { translateY: -rise * v }] };
  });
  return (
    <Animated.View
      style={[{ position: 'absolute', left: x, bottom: -10, width: size, height: size, borderRadius: size / 2, backgroundColor: '#ffb347', boxShadow: '0 0 6px #ff7a00' } as ViewStyle, style]}
    />
  );
}

/** Midnight: tiny stars twinkling and, now and then, a shooting star. */
function Night({ w, h }: { w: number; h: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        x: seeded(i, 24) * w,
        y: seeded(i, 25) * h,
        size: 1 + Math.round(seeded(i, 26) * 2),
        duration: 2200 + Math.round(seeded(i, 27) * 2700),
        delay: Math.round(seeded(i, 28) * 3000),
      })),
    [w, h],
  );
  return (
    <>
      {stars.map((st, i) => (
        <Twinkle key={i} {...st} />
      ))}
      <ShootingStar w={w} />
    </>
  );
}

function Twinkle({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  const t = useLoop(duration, true, { delay });
  const style = useAnimatedStyle(() => ({ opacity: 0.2 + 0.8 * t.value }));
  return <Animated.View style={[{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff' }, style]} />;
}

function ShootingStar({ w }: { w: number }) {
  const t = useLoop(9000, true, { restart: true, easing: Easing.linear });
  const style = useAnimatedStyle(() => {
    const v = t.value;
    // Quiet most of the cycle, then a quick streak down to the left.
    const p = Math.max(0, Math.min(1, (v - 0.85) / 0.11));
    const out = 1 - (1 - p) * (1 - p);
    return { opacity: keyframes(v, [0, 0.85, 0.88, 0.96, 1], [0, 0, 1, 0, 0]), transform: [{ rotate: '-25deg' }, { translateX: -260 * out }] };
  });
  return (
    <Animated.View
      style={[{ position: 'absolute', left: w - 90, top: 60, width: 90, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)', backgroundImage: 'linear-gradient(90deg, #fff, rgba(255,255,255,0))' } as ViewStyle, style]}
    />
  );
}

/** Gold: a thin double gold frame round the screen and a few gold motes fading in and out as they drift. */
function Noir({ w, h }: { w: number; h: number }) {
  const motes = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        x: Math.round(seeded(i, 40) * (w - 6)),
        y: Math.round(seeded(i, 41) * (h - 60)) + 30,
        size: seeded(i, 42) < 0.25 ? 3 : 2,
        duration: 9000 + Math.round(seeded(i, 43) * 7000),
        delay: Math.round(seeded(i, 44) * 9000),
      })),
    [w, h],
  );
  return (
    <>
      <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, opacity: 0.18 }}>
        <Rect x={20} y={20} width={w - 40} height={h - 40} fill="none" stroke="#e8c66c" strokeWidth={0.8} />
        <Rect x={28} y={28} width={w - 56} height={h - 56} fill="none" stroke="#e8c66c" strokeWidth={0.4} />
      </Svg>
      {motes.map((m, i) => (
        <Mote key={i} {...m} />
      ))}
    </>
  );
}

function Mote({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  const t = useLoop(duration, true, { delay });
  const style = useAnimatedStyle(() => ({ opacity: 0.8 * t.value, transform: [{ translateX: 14 * t.value }, { translateY: -40 * t.value }] }));
  return (
    <Animated.View
      style={[{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: '#f7dc8a', boxShadow: '0px 0px 6px #e8c66c' } as ViewStyle, style]}
    />
  );
}
