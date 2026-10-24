import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { BarDecor as DecorKind } from '../../themeFx';
import { keyframes, LEAF, useLoop, useLoopsOn } from './hooks';

// Drawings on the XP bar's fill, laid out over the whole bar and revealed as
// the fill grows (the bar clips them to the fill's width).

/** How far the decor may reach above and below the bar. */
export const DECOR_PAD = 16;

export function BarDecor({ kind, width, height, live }: { kind: DecorKind; width: number; height: number; live: SharedValue<number> }) {
  switch (kind) {
    case 'vine':
      return <Vine width={width} height={height} live={live} />;
    case 'wavetop':
      return <WaveTop width={width} />;
  }
}

const VINE_LEAVES = [6, 15, 24, 33, 42, 51, 60, 69, 78, 87, 96].map((x, i) => ({
  x: x / 100,
  above: i % 2 === 0,
  color: [0, 3, 6, 9].includes(i) ? '#3f6b4a' : '#6aa060',
}));
const VINE_TWIGS = [
  { x: 0.19, top: 8, turn: 50 },
  { x: 0.46, top: 0, turn: -50 },
  { x: 0.73, top: 8, turn: 50 },
  { x: 1, top: 0, turn: -50 },
];

/** Forest: a vine winding along the bar, sprouting leaves and twigs as it grows. */
function Vine({ width, height, live }: { width: number; height: number; live: SharedValue<number> }) {
  // Ten full waves across the bar, as on the board.
  const period = width / 10;
  let d = 'M0 11';
  for (let x = 0, up = true; x < width; x += period / 2, up = !up) d += ` Q ${x + period / 4} ${up ? 3 : 19} ${x + period / 2} 11`;
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={22} style={{ position: 'absolute', left: 0, top: -5 }}>
        <Path d={d} fill="none" stroke="#2f5a3a" strokeWidth={2.4} />
      </Svg>
      {VINE_TWIGS.map((t, i) => (
        <View key={`t${i}`} style={{ position: 'absolute', left: t.x * width - (t.x === 1 ? 7 : 0), top: t.top, width: 7, height: 2, backgroundColor: '#2f5a3a', transform: [{ rotate: `${t.turn}deg` }] }} />
      ))}
      {VINE_LEAVES.map((l, i) => (
        <VineLeaf key={i} x={l.x * width} above={l.above} color={l.color} live={live} width={width} />
      ))}
    </View>
  );
}

function VineLeaf({ x, above, color, live, width }: { x: number; above: boolean; color: string; live: SharedValue<number>; width: number }) {
  // Pops out (with a little overshoot) as the fill passes it.
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (live.value * width - x) / 14));
    return { transform: [{ scale: keyframes(p, [0, 0.7, 1], [0, 1.2, 1]) }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: above ? -14 : 6, width: 12, height: 12 }, style]}>
      <Svg width={12} height={12} viewBox="0 0 24 24" style={{ transform: [{ rotate: above ? '-40deg' : '140deg' }] }}>
        <Path d={LEAF} fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** Ocean: little wave crests along the top of the water, rolling forward. */
function WaveTop({ width }: { width: number }) {
  const on = useLoopsOn();
  const t = useLoop(1400, on, { restart: true, easing: Easing.linear });
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -12 + 12 * t.value }] }));
  let d = '';
  // Each 12 px tile: a strip with a half-round scoop out of its lower edge.
  for (let x = 0; x < width + 24; x += 12) d += `M${x} 6V0h12v6h-1a5 5 0 0 0-10 0z`;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: -3, width: width + 24, height: 6, opacity: 0.9 }, style]}>
      <Svg width={width + 24} height={6}>
        <Path d={d} fill="#7fe3f0" />
      </Svg>
    </Animated.View>
  );
}
