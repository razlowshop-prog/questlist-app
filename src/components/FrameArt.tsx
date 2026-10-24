import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { mixHex, type FrameArt as ArtKind, type FrameLook } from '../vivid';
import { useReduceMotion } from './FireAura';
import { useSvgId } from './Vivid';

// The drawn profile frames from the frames board: polished metal rings won
// from levels and the animated trophy frames. Everything is laid out on the
// board's 150 px frame (the picture 114 px in the middle) and scaled to `box`.
// Some trophy frames reach past the box (flame tongues, rays, planets).

const B = 150;
const C = B / 2;

/** A value running 0 → 1 over and over, resting at 0 while `on` is false. */
function useTime(ms: number, on: boolean): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!on) {
      cancelAnimation(v);
      v.value = 0;
      return;
    }
    v.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(v);
  }, [on, ms]);
  return v;
}

/** A turning layer the size of the frame (or `grow` times it), `ms` per turn. */
function Spin({ ms, on, box, grow = 1, reverse, children }: { ms: number; on: boolean; box: number; grow?: number; reverse?: boolean; children: React.ReactNode }) {
  const t = useTime(ms, on);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${(reverse ? -360 : 360) * t.value}deg` }] }));
  const size = box * grow;
  const off = (box - size) / 2;
  return <Animated.View style={[{ position: 'absolute', left: off, top: off, width: size, height: size }, style]}>{children}</Animated.View>;
}

/** A value along stops spread over 0..1, or at the given positions. */
function along<T>(values: T[], t: number, mix: (a: T, b: T, f: number) => T, positions?: number[]): T {
  const at = positions ?? values.map((_, i) => i / (values.length - 1));
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < at.length; i++) if (x <= at[i]) return mix(values[i - 1], values[i], (x - at[i - 1]) / (at[i] - at[i - 1] || 1));
  return values[values.length - 1];
}

const SEGMENTS = 72;

/**
 * A band of colour sweeping round a circle (CSS conic-gradient), drawn as short
 * arcs since SVG has none. `outer` and `width` are in board px; `from` turns
 * the start, in degrees, clockwise from the top.
 */
function ConicBand({ stops, outer, width, from = 0, alphas, positions, size = B }: { stops: string[]; outer: number; width: number; from?: number; alphas?: number[]; positions?: number[]; size?: number }) {
  const c = size / 2;
  const r = outer - width / 2;
  const arc = (a: number, b: number) => {
    const a0 = a * Math.PI * 2 - Math.PI / 2 + (from * Math.PI) / 180;
    const a1 = b * Math.PI * 2 - Math.PI / 2 + (from * Math.PI) / 180;
    return `M${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)}A${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`;
  };
  return (
    <>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const t = (i + 0.5) / SEGMENTS;
        return (
          <Path
            key={i}
            d={arc(i / SEGMENTS, (i + 1.2) / SEGMENTS)}
            stroke={along(stops, t, mixHex, positions)}
            strokeOpacity={alphas ? along(alphas, t, (a, b, f) => a + (b - a) * f, positions) : 1}
            strokeWidth={width}
            fill="none"
          />
        );
      })}
    </>
  );
}

/** A full-frame SVG on the board's 150 px grid, scaled to `box`. */
function Board({ box, children, style }: { box: number; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <Svg width={box} height={box} viewBox={`0 0 ${B} ${B}`} style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      {children}
    </Svg>
  );
}

/**
 * Draws a frame with `art` around the picture. `live` lets it move (not for
 * locked frames, or with reduced motion).
 */
export function FrameArt({ look, box, locked }: { look: FrameLook & { art: ArtKind }; box: number; locked?: boolean }) {
  const reduce = useReduceMotion();
  const live = !locked && !reduce;
  const props = { look, box, live };
  switch (look.art) {
    case 'metal':
      return <Metal {...props} />;
    case 'flames':
      return <Flames {...props} />;
    case 'laurel':
      return <Laurel {...props} />;
    case 'crystal':
      return <Crystal {...props} />;
    case 'sunrise':
      return <Sunrise {...props} />;
    case 'aurora':
      return <Aurora {...props} />;
    case 'orbit':
      return <Orbit {...props} />;
  }
}

type ArtProps = { look: FrameLook; box: number; live: boolean };

/**
 * A light streak passing over a drawing every so often: a window slides
 * across, showing a white copy of the drawing (`children`) only inside it.
 * `at` is when (0..1 of `ms`) the sweep starts and ends.
 */
function Sweep({ box, ms, live, at, children }: { box: number; ms: number; live: boolean; at: [number, number]; children: React.ReactNode }) {
  const t = useTime(ms, live);
  const w = box * 0.3;
  const x = (v: number) => {
    'worklet';
    const p = Math.max(0, Math.min(1, (v - at[0]) / (at[1] - at[0])));
    const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
    return -w + (box + w) * e;
  };
  const windowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x(t.value) }] }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -x(t.value) }] }));
  if (!live) return null;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: -box * 0.1, width: w, height: box * 1.2, overflow: 'hidden' }, windowStyle]} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', left: 0, top: box * 0.1, width: box, height: box }, contentStyle]}>{children}</Animated.View>
    </Animated.View>
  );
}

/** Level frames: a polished metal ring with a fine inner highlight and a shine every 5 s. */
function Metal({ look, box, live }: ArtProps) {
  return (
    <>
      <Board box={box}>
        <ConicBand stops={look.stops} outer={75} width={12} from={210} />
        <Circle cx={C} cy={C} r={64.5} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} fill="none" />
      </Board>
      <Sweep box={box} ms={5000} live={live} at={[0.7, 1]}>
        <Board box={box}>
          <Circle cx={C} cy={C} r={69} stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={12} fill="none" />
        </Board>
      </Sweep>
    </>
  );
}

const TONGUE = 'M12 1c2 5 8 8 8 16a8 8 0 0 1-16 0c0-3 1.5-5.5 3.5-7 .3 2.6 1.6 4.3 3.6 4.9C10.5 10.5 10.5 6 12 1z';
/** When each of the 15 tongues flickers, in ms (the board's delays). */
const TONGUE_DELAYS = [0, 168, 336, 504, 72, 240, 408, 576, 144, 312, 480, 48, 216, 384, 552];

/** Iron Will: a fiery ring turning every 5 s, ringed by 15 flickering flame tongues turning every 14 s. */
function Flames({ look, box, live }: ArtProps) {
  const id = useSvgId('tongue');
  const k = box / B;
  const flick = useTime(1000, live);
  return (
    <>
      <Spin ms={14000} on={live} box={box}>
        {TONGUE_DELAYS.map((delay, i) => {
          const a = i * 24;
          const cx = C + 83 * Math.sin((a * Math.PI) / 180);
          const cy = C - 83 * Math.cos((a * Math.PI) / 180);
          // Each tongue stands on the ring and points straight out.
          return (
            <View key={i} style={{ position: 'absolute', left: (cx - 14) * k, top: (cy - 19.5) * k, width: 28 * k, height: 39 * k, transform: [{ rotate: `${a}deg` }] }}>
              <Tongue id={`${id}-${i}`} t={flick} phase={delay / 1000} k={k} />
            </View>
          );
        })}
      </Spin>
      <Board box={box}>
        <Circle cx={C} cy={C} r={68.5} stroke="#FF7A00" strokeOpacity={0.3} strokeWidth={20} fill="none" />
      </Board>
      <Spin ms={5000} on={live} box={box}>
        <Board box={box}>
          <ConicBand stops={look.stops} outer={75} width={13} />
        </Board>
      </Spin>
    </>
  );
}

function Tongue({ id, t, phase, k }: { id: string; t: SharedValue<number>; phase: number; k: number }) {
  // Grows thin and tall and back every half second (the board's `alternate`).
  const style = useAnimatedStyle(() => {
    const p = (t.value + phase) % 1;
    const tri = p < 0.5 ? p * 2 : 2 - p * 2;
    const e = 0.5 - 0.5 * Math.cos(Math.PI * tri);
    return { transform: [{ scaleX: 1 - 0.08 * e }, { scaleY: 1 + 0.1 * e }] };
  });
  return (
    <Animated.View style={[{ width: 28 * k, height: 39 * k, transformOrigin: 'bottom' } as ViewStyle, style]}>
      <Svg width={28 * k} height={39 * k} viewBox="0 0 24 32">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE29A" />
            <Stop offset="0.6" stopColor="#FF7A00" />
            <Stop offset="1" stopColor="#FF2D1C" />
          </LinearGradient>
        </Defs>
        <Path d={TONGUE} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const LEAF = 'M0 0C4 -5 10 -5 14 0 10 5 4 5 0 0z';
/** The wreath's 18 leaves on its 100-unit grid: x, y, turn, size (from the board). */
const LEAVES: [number, number, number, number][] = [
  [56.5, 96.5, 380, 1],
  [43.5, 96.5, 160, 1],
  [69.1, 92.9, 364, 0.96],
  [30.9, 92.9, 176, 0.96],
  [80.2, 86.0, 348, 0.92],
  [19.8, 86.0, 192, 0.92],
  [89.0, 76.3, 332, 0.88],
  [11.0, 76.3, 208, 0.88],
  [94.7, 64.5, 316, 0.84],
  [5.3, 64.5, 224, 0.84],
  [97.0, 51.6, 300, 0.8],
  [3.0, 51.6, 240, 0.8],
  [95.6, 38.6, 284, 0.76],
  [4.4, 38.6, 256, 0.76],
  [90.7, 26.5, 268, 0.72],
  [9.3, 26.5, 272, 0.72],
  [82.6, 16.2, 252, 0.68],
  [17.4, 16.2, 288, 0.68],
];

function Wreath({ box, fill, stroke }: { box: number; fill: string; stroke?: string }) {
  // The wreath's grid reaches 8% past the frame on every side.
  const size = box * 1.16;
  return (
    <Svg width={size} height={size} viewBox="-8 -8 116 116" style={{ position: 'absolute', left: -box * 0.08, top: -box * 0.08 }}>
      <G fill={fill} stroke={stroke} strokeWidth={stroke ? 0.5 : 0}>
        {LEAVES.map(([x, y, turn, sc], i) => (
          <Path key={i} d={LEAF} transform={`translate(${x} ${y}) rotate(${turn}) scale(${sc})`} />
        ))}
      </G>
      {stroke && <Path d="M38 99 L50 93 L62 99" fill="none" stroke="#E8B33A" strokeWidth={3} strokeLinecap="round" />}
    </Svg>
  );
}

/** Marathon Mind: a golden laurel wreath round a thin gold ring, a shimmer running over it every 3.2 s. */
function Laurel({ look, box, live }: ArtProps) {
  const id = useSvgId('laurel');
  return (
    <>
      <Board box={box}>
        <Circle cx={C} cy={C} r={64.5} stroke="#E8B33A" strokeOpacity={0.25} strokeWidth={10} fill="none" />
        <Circle cx={C} cy={C} r={64.5} stroke="#E8B33A" strokeWidth={2} fill="none" />
      </Board>
      <Svg width={0} height={0} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {look.stops.map((col, i) => (
              <Stop key={i} offset={i === 1 ? 0.45 : i / (look.stops.length - 1)} stopColor={col} />
            ))}
          </LinearGradient>
        </Defs>
      </Svg>
      <Wreath box={box} fill={`url(#${id})`} stroke="#6b430a" />
      <Sweep box={box} ms={3200} live={live} at={[0, 0.5]}>
        <View style={{ opacity: 0.85 }}>
          <Wreath box={box} fill="#FFFFFF" />
        </View>
      </Sweep>
    </>
  );
}

const SPARKLE = 'M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z';
/** Crystal Clear's sparkles: where (as a share of the frame) and when, in ms. */
const SPARKLES: [number, number, number][] = [
  [0.68, 0.01, 0],
  [1.02, 0.55, 500],
  [0.68, 0.99, 1100],
  [0.1, 0.83, 300],
  [0.05, 0.24, 800],
  [0.32, 0.01, 1400],
];

/** Crystal Clear: an icy ring turning every 9 s, cut with facets, six sparkles twinkling round it. */
function Crystal({ look, box, live }: ArtProps) {
  const t = useTime(2000, live);
  const facets = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);
  return (
    <>
      <Board box={box}>
        <Circle cx={C} cy={C} r={69} stroke="#9BE8FF" strokeOpacity={0.3} strokeWidth={18} fill="none" />
      </Board>
      <Spin ms={9000} on={live} box={box}>
        <Board box={box}>
          <ConicBand stops={look.stops} outer={75} width={12} />
        </Board>
      </Spin>
      <Board box={box}>
        {facets.map((a) => {
          // A thin bright facet line across the band every 22.5°.
          const rad = ((a - 90) * Math.PI) / 180;
          return <Path key={a} d={`M${C + 63 * Math.cos(rad)} ${C + 63 * Math.sin(rad)}L${C + 75 * Math.cos(rad)} ${C + 75 * Math.sin(rad)}`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={3} />;
        })}
      </Board>
      {SPARKLES.map(([x, y, delay], i) => (
        <Twinkle key={i} t={t} phase={delay / 2000} left={x * box - 10 * (box / B)} top={y * box - 10 * (box / B)} size={20 * (box / B)} live={live} />
      ))}
    </>
  );
}

function Twinkle({ t, phase, left, top, size, live }: { t: SharedValue<number>; phase: number; left: number; top: number; size: number; live: boolean }) {
  const style = useAnimatedStyle(() => {
    const p = (t.value + phase) % 1;
    const e = 0.5 - 0.5 * Math.cos(Math.PI * 2 * p);
    return { opacity: live ? 0.2 + 0.8 * e : 0.7, transform: [{ scale: 1 + 0.3 * e }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left, top, width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={SPARKLE} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

/** Dawn Breaker: a warm gold ring with sunrise rays turning slowly behind it (24 s). */
function Sunrise({ look, box, live }: ArtProps) {
  const id = useSvgId('rays');
  // The rays' layer is 28% bigger than the frame; its 192 px grid shares the centre.
  const R = 96;
  const rays = Array.from({ length: 20 }, (_, i) => i * 18);
  const wedge = (a: number) => {
    const p = (deg: number) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return `${R + 140 * Math.cos(rad)} ${R + 140 * Math.sin(rad)}`;
    };
    return `M${R} ${R}L${p(a)}L${p(a + 6)}z`;
  };
  return (
    <>
      <Spin ms={24000} on={live} box={box} grow={1.28}>
        <Svg width={box * 1.28} height={box * 1.28} viewBox="0 0 192 192">
          <Defs>
            {/* Shows the rays in a band round the ring, fading outwards (the board's radial mask). */}
            <RadialGradient id={id} cx={R} cy={R} r={135.8} fx={R} fy={R} gradientUnits="userSpaceOnUse">
              <Stop offset="0.38" stopColor="#FFC45A" stopOpacity={0} />
              <Stop offset="0.4" stopColor="#FFC45A" stopOpacity={0.85} />
              <Stop offset="0.5" stopColor="#FFC45A" stopOpacity={0.85} />
              <Stop offset="0.7" stopColor="#FFC45A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {rays.map((a) => (
            <Path key={a} d={wedge(a)} fill={`url(#${id})`} />
          ))}
        </Svg>
      </Spin>
      <Board box={box}>
        <Circle cx={C} cy={C} r={70} stroke="#FFAA3C" strokeOpacity={0.35} strokeWidth={16} fill="none" />
        <ConicBand stops={look.stops} outer={75} width={10} from={180} />
      </Board>
    </>
  );
}

/** Dream Walker: an aurora ring turning every 7 s, its colours drifting, a soft glow turning the other way. */
function Aurora({ look, box, live }: ArtProps) {
  const hue = useTime(6000, live);
  // The same ring with its colours moved on, faded in and out: the board's hue shift.
  const shifted = [...look.stops.slice(2, -1), ...look.stops.slice(0, 3)];
  const shiftStyle = useAnimatedStyle(() => ({ opacity: 0.5 - 0.5 * Math.cos(Math.PI * 2 * hue.value) }));
  return (
    <>
      <Spin ms={11000} on={live} box={box} reverse>
        <Board box={box} style={{ opacity: 0.7 }}>
          <ConicBand
            stops={['#3CFFB0', '#3CFFB0', '#3CFFB0', '#E77BFF', '#E77BFF', '#E77BFF']}
            alphas={[0, 0.5, 0, 0.45, 0, 0]}
            positions={[0, 0.15, 0.3, 0.45, 0.6, 1]}
            outer={78}
            width={18}
          />
        </Board>
      </Spin>
      <Board box={box}>
        <Circle cx={C} cy={C} r={68.5} stroke="#2BD9FF" strokeOpacity={0.25} strokeWidth={22} fill="none" />
      </Board>
      <Spin ms={7000} on={live} box={box}>
        <Board box={box}>
          <ConicBand stops={look.stops} outer={75} width={13} />
        </Board>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: box, height: box }, shiftStyle]}>
          <Board box={box}>
            <ConicBand stops={shifted} outer={75} width={13} />
          </Board>
        </Animated.View>
      </Spin>
    </>
  );
}

/** Pathfinder: a thin glowing ring on a dashed orbit, two planets circling it (6 s and 10 s). */
function Orbit({ box, live }: ArtProps) {
  const id = useSvgId('planet');
  // The orbit layer is 12% bigger than the frame.
  const ob = box * 1.12;
  return (
    <>
      <Board box={box}>
        <Circle cx={C} cy={C} r={73.5} stroke="#7FD6FF" strokeOpacity={0.3} strokeWidth={8} fill="none" />
        <Circle cx={C} cy={C} r={73.5} stroke="#7FD6FF" strokeWidth={2} fill="none" />
        <Circle cx={C} cy={C} r={72} stroke="#7FD6FF" strokeOpacity={0.3} strokeWidth={1} fill="none" />
        <Circle cx={C} cy={C} r={83.5} stroke="#C6F4FF" strokeOpacity={0.45} strokeWidth={1} strokeDasharray="3 3" fill="none" />
      </Board>
      <Spin ms={6000} on={live} box={box} grow={1.12}>
        <Svg width={ob} height={ob} viewBox="0 0 168 168">
          <Defs>
            <RadialGradient id={id} cx="35%" cy="35%" rx="65%" ry="65%">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.4" stopColor="#7FD6FF" />
              <Stop offset="1" stopColor="#3557FF" />
            </RadialGradient>
          </Defs>
          <Circle cx={84} cy={3.4} r={18} fill="#7FD6FF" opacity={0.25} />
          <Circle cx={84} cy={3.4} r={13.4} fill={`url(#${id})`} />
        </Svg>
      </Spin>
      <Spin ms={10000} on={live} box={box} grow={1.12} reverse>
        <Svg width={ob} height={ob} viewBox="0 0 168 168">
          <Circle cx={84} cy={165.5} r={11} fill="#FFE066" opacity={0.3} />
          <Circle cx={84} cy={165.5} r={7.6} fill="#FFE066" />
        </Svg>
      </Spin>
    </>
  );
}
