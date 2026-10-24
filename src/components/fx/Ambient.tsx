import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
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
