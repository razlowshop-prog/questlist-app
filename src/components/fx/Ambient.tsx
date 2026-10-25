import { useMemo, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { AmbientKind } from '../../themeFx';
import { keyframes, LEAF, seeded, useLoop, useLoopsOn } from './hooks';

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
    case 'synth':
      return <Synth w={w} h={h} />;
    case 'floor':
      return <Floor />;
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

/** Ocean: bubbles rising from the deep, and two slow waves rolling along the bottom. */
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
    </>
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

const GRID = 34;

/** Neon: a synthwave sunset, a glowing grid floor rolling towards you, and neon rain. */
function Synth({ w, h }: { w: number; h: number }) {
  const drops = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        x: Math.round(seeded(i, 16) * (w - 4)),
        len: 48 + Math.round(seeded(i, 17) * 40),
        duration: 1500 + Math.round(seeded(i, 18) * 1000),
        delay: Math.round(seeded(i, 19) * 2500),
      })),
    [w],
  );
  return (
    <>
      <SynthSun left={w / 2 - 80} />
      <GridFloor w={w} />
      {drops.map((d, i) => (
        <Drop key={i} {...d} h={h} />
      ))}
    </>
  );
}

/** A half sun cut into stripes, low over the grid. */
function SynthSun({ left }: { left: number }) {
  // 10 px bands with 3 px gaps, as the board's stripe mask.
  const bands = Array.from({ length: 7 }, (_, i) => i * 13);
  return (
    <Svg width={160} height={80} style={{ position: 'absolute', left, bottom: 68, opacity: 0.55 }}>
      <Defs>
        <LinearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffb347" />
          <Stop offset="0.7" stopColor="#ff2bd6" />
        </LinearGradient>
        <ClipPath id="sunDisc">
          <Path d="M0 80A80 80 0 0 1 160 80z" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#sunDisc)">
        {bands.map((y) => (
          <Rect key={y} x={0} y={y} width={160} height={10} fill="url(#sun)" />
        ))}
      </G>
    </Svg>
  );
}

/** The grid laid flat in perspective, its lines rolling forward. */
function GridFloor({ w }: { w: number }) {
  const t = useLoop(1600, true, { restart: true, easing: Easing.linear });
  const width = w * 2;
  const height = 150;
  const roll = useAnimatedStyle(() => ({ transform: [{ translateY: GRID * t.value }] }));
  const rows = Array.from({ length: Math.ceil(height / GRID) + 2 }, (_, i) => (i - 1) * GRID);
  const cols = Array.from({ length: Math.ceil(width / GRID) + 1 }, (_, i) => i * GRID);
  return (
    <View style={{ position: 'absolute', left: -w / 2, width, bottom: 0, height, overflow: 'hidden' }}>
      <View style={[StyleSheet.absoluteFill, { opacity: 0.35, transform: [{ perspective: 220 }, { rotateX: '62deg' }], transformOrigin: '50% 100%' } as ViewStyle]}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {cols.map((x) => (
            <Line key={x} x1={x} y1={0} x2={x} y2={height} stroke="#ff2bd6" strokeWidth={1.5} />
          ))}
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, roll]}>
          <Svg width={width} height={height + 2 * GRID} style={{ position: 'absolute', top: -GRID }}>
            {rows.map((y) => (
              <Line key={y} x1={0} y1={y + GRID} x2={width} y2={y + GRID} stroke="#ff2bd6" strokeWidth={1.5} />
            ))}
          </Svg>
        </Animated.View>
      </View>
      {/* Fades the far end of the grid into the night. */}
      <View style={[StyleSheet.absoluteFill, { backgroundImage: 'linear-gradient(180deg, #0a0614 0%, rgba(10,6,20,0) 55%)' } as ViewStyle]} />
    </View>
  );
}

function Drop({ x, len, duration, delay, h }: { x: number; len: number; duration: number; delay: number; h: number }) {
  const t = useLoop(duration, true, { delay, restart: true, easing: Easing.linear });
  const fall = h + 120;
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: fall * t.value }] }));
  return (
    <Animated.View
      style={[{ position: 'absolute', left: x, top: -100, width: 1, height: len, backgroundColor: 'rgba(34,232,255,0.5)', backgroundImage: 'linear-gradient(180deg, rgba(34,232,255,0), #22e8ff)' } as ViewStyle, style]}
    />
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
