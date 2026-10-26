import { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { ClipPath, Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { FlameStyleId } from '../cosmetics';
import { keyframes, stepframes } from './fx/hooks';
import { useSvgId } from './Vivid';

// The won streak flames (design "Flames", Fabian took all of them on
// 2026-10-25). Each is drawn on a 64 x 64 grid in a few stacked layers; a
// layer that moves is wrapped in its own animated view, so every motion runs
// on the animation thread. Still flames show their resting frame.

/** Tier colours for the flames that follow the fire: Flame, Blaze, Inferno. */
const TIER = {
  1: { c1: '#FFE29A', c2: '#FF4A1C', cm: '#FF9A4A', twin: '#FFC24D', edge: '#A3260A' },
  2: { c1: '#C6F4FF', c2: '#2F7BFF', cm: '#6FB8FF', twin: '#7FEAFF', edge: '#1B3FA0' },
  3: { c1: '#FFB3EF', c2: '#9B30FF', cm: '#D46BFF', twin: '#FF7AD9', edge: '#5A1499' },
} as const;
type TierColors = (typeof TIER)[1 | 2 | 3];

/** Flame styles drawn here; classic stays the glyph flame in Fire.tsx. */
export const ART_FLAMES: FlameStyleId[] = ['outline', 'solid', 'kindling', 'twin', 'glow', 'sparks', 'plasma', 'ink', 'lava'];

/** Seconds since the flame appeared, counting up on the animation thread; stays 0 when still. */
function useClock(on: boolean): SharedValue<number> {
  const sec = useSharedValue(0);
  useEffect(() => {
    if (!on) return;
    // A day of seconds, then it starts over.
    sec.value = withTiming(86_400, { duration: 86_400_000, easing: Easing.linear });
    return () => cancelAnimation(sec);
  }, [on]);
  return sec;
}

type Motion = (sec: number) => ViewStyle;

/** One layer of a flame: its own 64 x 64 drawing, moved by `motion` while the flame is live. */
function Layer({ size, sec, motion, origin, children }: { size: number; sec?: SharedValue<number>; motion?: Motion; origin?: string; children: ReactNode }) {
  const style = useAnimatedStyle(() => (sec && motion ? motion(sec.value) : {}));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, origin ? ({ transformOrigin: origin } as ViewStyle) : null, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
        {children}
      </Svg>
    </Animated.View>
  );
}

/** Where a looping motion is: 0 → 1 over `period` seconds, shifted by `offset`. */
function phase(sec: number, period: number, offset = 0): number {
  'worklet';
  const t = (sec + offset) / period;
  return t - Math.floor(t);
}

/** CSS ease-in-out between keyframes 0 → 50% → 100%, as a 0 → 1 → 0 wave. */
function wave(sec: number, period: number, offset = 0): number {
  'worklet';
  return 0.5 - 0.5 * Math.cos(phase(sec, period, offset) * Math.PI * 2);
}

const FLAME_PATH = 'M32 3 C35 12 44 18 48 28 C52 38 50 50 42 56 C38 59 35 60 32 60 C29 60 26 59 22 56 C14 50 12 38 17 29 C19 25 22 22 24 19 C24 25 26 29 29 31 C28 22 29 11 32 3Z';
const CORE_PATH = 'M32 32 C35 37 40 41 40 47 A8 8 0 0 1 24 47 C24 41 29 37 32 32Z';
const TOXIC_PATH =
  'M32 4 C34 12 38 14 40 10 C42 16 46 20 47 26 C50 22 51 18 50 14 C55 22 54 34 52 42 C50 52 42 60 32 60 C22 60 14 52 12 42 C10 34 10 24 15 18 C15 23 17 26 19 27 C19 20 22 14 26 11 C27 15 29 17 31 17 C30 12 31 8 32 4Z';
const PRISM_EDGE = 'M32 3 L42 18 L49 32 L47 47 L40 57 L32 60 L24 57 L17 47 L15 32 L22 18Z';
const PRISM_FACETS: [string, string][] = [
  ['M32 3 L42 18 L32 40 Z', '#E8FDFF'],
  ['M42 18 L49 32 L32 40 Z', '#7FD6FF'],
  ['M49 32 L47 47 L32 40 Z', '#B8F1FF'],
  ['M47 47 L40 57 L32 40 Z', '#4FA3FF'],
  ['M40 57 L32 60 L32 40 Z', '#9B8CFF'],
  ['M32 60 L24 57 L32 40 Z', '#6A5BFF'],
  ['M24 57 L17 47 L32 40 Z', '#A9EEFF'],
  ['M17 47 L15 32 L32 40 Z', '#5BA8FF'],
  ['M15 32 L22 18 L32 40 Z', '#C9C2FF'],
  ['M22 18 L32 3 L32 40 Z', '#7FD6FF'],
];
/** Pixel's two frames on a 6-unit grid: [x, y, shade] with shade 0 = outer, 1 = mid, 2 = inner, 3 = white. */
const PIXEL_A: [number, number, number][] = parsePixels('26,2,0 26,8,0 32,8,0 20,14,0 26,14,1 32,14,0 50,14,0 14,20,0 20,20,1 26,20,1 32,20,0 44,20,0 50,20,0 14,26,0 20,26,1 26,26,2 32,26,1 38,26,0 44,26,0 50,26,1 56,26,0 8,32,0 14,32,1 20,32,1 26,32,2 32,32,2 38,32,1 44,32,1 50,32,0 8,38,0 14,38,1 20,38,2 26,38,2 32,38,3 38,38,2 44,38,1 50,38,0 8,44,0 14,44,1 20,44,2 26,44,3 32,44,3 38,44,2 44,44,1 50,44,0 14,50,0 20,50,1 26,50,2 32,50,2 38,50,1 44,50,0 20,56,0 26,56,0 32,56,0 38,56,0');
const PIXEL_B: [number, number, number][] = parsePixels('32,2,0 26,8,0 32,8,0 26,14,0 32,14,1 38,14,0 50,14,0 20,20,0 26,20,1 32,20,1 38,20,0 50,20,0 14,26,0 20,26,1 26,26,1 32,26,2 38,26,0 44,26,1 50,26,0 8,32,0 14,32,1 20,32,1 26,32,2 32,32,2 38,32,1 44,32,1 50,32,0 8,38,0 14,38,1 20,38,2 26,38,2 32,38,3 38,38,2 44,38,1 50,38,0 8,44,0 14,44,1 20,44,2 26,44,3 32,44,3 38,44,2 44,44,1 50,44,0 14,50,0 20,50,1 26,50,2 32,50,2 38,50,1 44,50,0 20,56,0 26,56,0 32,56,0 38,56,0');

function parsePixels(list: string): [number, number, number][] {
  return list.split(' ').map((p) => p.split(',').map(Number) as [number, number, number]);
}

/** A flame from the design board, `size` px square. `live` runs its motion. */
export function FlameArt({ style, tier, size, live }: { style: FlameStyleId; tier: number; size: number; live: boolean }) {
  const sec = useClock(live);
  const t = TIER[Math.max(1, Math.min(3, tier)) as 1 | 2 | 3];
  const s = live ? sec : undefined;
  return <View style={{ width: size, height: size }}>{draw(style, size, s, t)}</View>;
}

function draw(style: FlameStyleId, size: number, sec: SharedValue<number> | undefined, t: TierColors): ReactNode {
  const p = { size, sec };
  switch (style) {
    case 'outline':
      return <Toxic {...p} />;
    case 'solid':
      return <Solar {...p} />;
    case 'kindling':
      return <Phantom {...p} />;
    case 'twin':
      return <Twin {...p} t={t} />;
    case 'glow':
      return <Prism {...p} />;
    case 'sparks':
      return <Pixel {...p} t={t} />;
    case 'plasma':
      return <Plasma {...p} />;
    case 'ink':
      return <Ink {...p} />;
    case 'lava':
      return <Lava {...p} />;
    default:
      return null;
  }
}

type P = { size: number; sec?: SharedValue<number> };

/** Toxic: a wobbly green flame with a dark outline; bubbles rise inside and drips fall from the base. */
function Toxic({ size, sec }: P) {
  const g = useSvgId('toxic');
  const bubble = (x: number, y: number, r: number, color: string, offset: number) => (
    <Layer
      key={offset}
      size={size}
      sec={sec}
      motion={(s) => {
        'worklet';
        const f = phase(s, 2.4, offset);
        const ease = f * f;
        return { opacity: f < 0.15 ? (f / 0.15) * 0.85 : 0.85 * (1 - (f - 0.15) / 0.85), transform: [{ translateY: (-34 * ease * size) / 64 }] };
      }}
    >
      <Circle cx={x} cy={y} r={r} fill={color} />
    </Layer>
  );
  const drip = (x: number, offset: number) => (
    <Layer
      key={x}
      size={size}
      sec={sec}
      motion={(s) => {
        'worklet';
        const f = phase(s, 3.2, offset);
        return { opacity: keyframes(f, [0, 0.4, 0.5, 1], [0, 0, 1, 0]), transform: [{ translateY: ((f < 0.4 ? -4 : -4 + ((f - 0.4) / 0.6) * 10) * size) / 64 }] };
      }}
    >
      <Path d={`M${x} 58 C${x} 61 ${x - 2} 63 ${x - 2} 64 A2 2 0 0 0 ${x + 2} 64 C${x + 2} 63 ${x} 61 ${x} 58Z`} fill="#22C55E" stroke="#0B4D22" strokeWidth={1} />
    </Layer>
  );
  return (
    <>
      <Layer
        size={size}
        sec={sec}
        origin="50% 94%"
        motion={(s) => {
          'worklet';
          const f = phase(s, 2.2);
          // 25%: lean right and stretch, 75%: lean left and settle.
          const skew = keyframes(f, [0, 0.25, 0.75, 1], [0, 3, -3, 0]);
          const sy = keyframes(f, [0, 0.25, 0.75, 1], [1, 1.04, 0.98, 1]);
          return { transform: [{ skewX: `${skew}deg` }, { scaleY: sy }] };
        }}
      >
        <Defs>
          <LinearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F4FF9E" />
            <Stop offset="0.55" stopColor="#7BE83A" />
            <Stop offset="1" stopColor="#16A34A" />
          </LinearGradient>
        </Defs>
        <Path d={TOXIC_PATH} fill={`url(#${g})`} stroke="#0B4D22" strokeWidth={2.4} strokeLinejoin="round" />
      </Layer>
      {sec && [bubble(26, 52, 3, '#F4FF9E', 0), bubble(37, 54, 2.2, '#F4FF9E', 0.8), bubble(31, 56, 1.6, '#FFFFFF', 1.6)]}
      {sec && [drip(24, 0), drip(40, 1.7)]}
    </>
  );
}

/** Solar: a small flame in front of a gold disc and a slowly turning ring of rays. */
function Solar({ size, sec }: P) {
  const g = useSvgId('solar');
  return (
    <>
      <Layer
        size={size}
        sec={sec}
        origin="50% 56.25%"
        motion={(s) => {
          'worklet';
          return { transform: [{ rotate: `${phase(s, 14) * 360}deg` }] };
        }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <Path key={i} d="M32 4 L35.5 13 L28.5 13Z" fill="#FFB000" transform={`rotate(${i * 30} 32 36)`} />
        ))}
      </Layer>
      <Layer size={size}>
        <Defs>
          <LinearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFBE0" />
            <Stop offset="1" stopColor="#FF9500" />
          </LinearGradient>
        </Defs>
        <Circle cx={32} cy={36} r={19} fill="#FFB000" opacity={0.28} />
        <G transform="translate(32 38) scale(0.62) translate(-32 -33)">
          <Path d={FLAME_PATH} fill={`url(#${g})`} stroke="#C26A00" strokeWidth={2.2} />
          <Path d={CORE_PATH} fill="#FFFFFF" opacity={0.9} />
        </G>
      </Layer>
    </>
  );
}

/** Phantom: a ghost wisp with a scalloped hem and eyes; it floats, blinks and trails smoke. */
function Phantom({ size, sec }: P) {
  const g = useSvgId('phantom');
  const float: Motion = (s) => {
    'worklet';
    const w = wave(s, 3);
    return { transform: [{ translateY: (-3 * w * size) / 64 }, { rotate: `${-2 * w}deg` }] };
  };
  const wisp = (d: string, width: number, offset: number) => (
    <Layer
      key={offset}
      size={size}
      sec={sec}
      motion={(s) => {
        'worklet';
        const f = phase(s, 2.6, offset);
        const w = wave(s, 3);
        const rise = keyframes(f, [0, 1], [4, -5]);
        return { opacity: keyframes(f, [0, 0.3, 1], [0, 0.9, 0]), transform: [{ translateY: ((rise - 3 * w) * size) / 64 }] };
      }}
    >
      <Path d={d} fill="none" stroke="#B9A8FF" strokeWidth={width} strokeLinecap="round" />
    </Layer>
  );
  return (
    <>
      {sec && [wisp('M44 12 C47 8 45 4 48 1', 2, 0), wisp('M19 16 C16 12 18 8 15 5', 1.6, 1.3)]}
      <Layer size={size} sec={sec} motion={float}>
        <Defs>
          <LinearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E0FFFB" />
            <Stop offset="1" stopColor="#7C5CFF" />
          </LinearGradient>
        </Defs>
        <Path
          d="M32 4 C40 14 50 22 50 36 L50 52 C50 56 48 58 46 55 C44 52 42 52 40 55 C38 58 36 58 34 55 C32 52 30 52 28 55 C26 58 24 58 22 55 C20 52 18 52 16 55 C14 58 14 56 14 52 L14 36 C14 26 20 20 24 16 C25 21 27 24 29 25 C28 17 29 10 32 4Z"
          fill={`url(#${g})`}
          fillOpacity={0.9}
          stroke="#6A4EE8"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <Ellipse cx={32} cy={46} rx={2.2} ry={1.6} fill="#2A1A5E" opacity={0.55} />
      </Layer>
      {/* The eyes float with the ghost and blink every four seconds. */}
      <Layer
        size={size}
        sec={sec}
        origin="50% 59%"
        motion={(s) => {
          'worklet';
          const w = wave(s, 3);
          const f = phase(s, 4);
          return { transform: [{ translateY: (-3 * w * size) / 64 }, { rotate: `${-2 * w}deg` }, { scaleY: keyframes(f, [0, 0.92, 0.95, 1], [1, 1, 0.1, 1]) }] };
        }}
      >
        <Ellipse cx={26} cy={38} rx={2.8} ry={3.8} fill="#2A1A5E" />
        <Ellipse cx={38} cy={38} rx={2.8} ry={3.8} fill="#2A1A5E" />
      </Layer>
    </>
  );
}

/** Twin: two slim flames in the tier's colours, swaying against each other. */
function Twin({ size, sec, t }: P & { t: TierColors }) {
  const a = useSvgId('twinA');
  const b = useSvgId('twinB');
  return (
    <>
      <Layer
        size={size}
        sec={sec}
        origin="38% 94%"
        motion={(s) => {
          'worklet';
          const w = wave(s, 2);
          return { transform: [{ rotate: `${6 * w}deg` }, { scaleY: 1 + 0.05 * w }] };
        }}
      >
        <Defs>
          <LinearGradient id={a} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.c1} />
            <Stop offset="1" stopColor={t.c2} />
          </LinearGradient>
        </Defs>
        <Path d="M26 6 C30 18 36 26 36 40 C36 52 30 60 24 60 C17 60 13 53 14 44 C15 32 24 24 26 6Z" fill={`url(#${a})`} stroke={t.edge} strokeWidth={1.4} />
        <Ellipse cx={25} cy={50} rx={4} ry={6} fill="#FFFFFF" opacity={0.7} />
      </Layer>
      <Layer
        size={size}
        sec={sec}
        origin="65% 94%"
        motion={(s) => {
          'worklet';
          const w = wave(s, 2);
          return { transform: [{ rotate: `${-7 * w}deg` }, { scaleY: 1 - 0.05 * w }] };
        }}
      >
        <Defs>
          <LinearGradient id={b} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor={t.twin} />
          </LinearGradient>
        </Defs>
        <Path d="M40 12 C38 22 32 30 32 42 C32 53 37 60 43 60 C49 60 52 54 51 46 C50 34 42 28 40 12Z" fill={`url(#${b})`} fillOpacity={0.95} stroke={t.edge} strokeWidth={1.4} />
        <Ellipse cx={42} cy={51} rx={3.4} ry={5} fill="#FFFFFF" opacity={0.7} />
      </Layer>
    </>
  );
}

/** How many places the shine band stops at on its way across the crystal. */
const SHINE_STEPS = 10;

/** Prism: a low-poly crystal flame that hovers, with a white shine sweeping across it. */
function Prism({ size, sec }: P) {
  const clip = useSvgId('prism');
  const hover: Motion = (s) => {
    'worklet';
    return { transform: [{ translateY: (-2 * wave(s, 3) * size) / 64 }] };
  };
  return (
    <>
      <Layer size={size} sec={sec} motion={hover}>
        {PRISM_FACETS.map(([d, color], i) => (
          <Path key={i} d={d} fill={color} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={0.6} />
        ))}
        <Path d={PRISM_EDGE} fill="none" stroke="#3B3BB8" strokeWidth={1.6} strokeLinejoin="round" />
      </Layer>
      {/* The shine runs in the last 45% of its 3.6 s loop, as a few steps of the band clipped to the crystal. */}
      {sec &&
        Array.from({ length: SHINE_STEPS }, (_, i) => (
          <Layer
            key={i}
            size={size}
            sec={sec}
            motion={(s) => {
              'worklet';
              const f = phase(s, 3.6);
              const step = f < 0.55 ? -1 : Math.floor(((f - 0.55) / 0.45) * SHINE_STEPS);
              return { opacity: step === i ? 1 : 0, transform: [{ translateY: (-2 * wave(s, 3) * size) / 64 }] };
            }}
          >
            <Defs>
              <ClipPath id={`${clip}${i}`}>
                <Path d={PRISM_EDGE} />
              </ClipPath>
            </Defs>
            <G clipPath={`url(#${clip}${i})`}>
              <Rect x={-30 + (110 * (i + 0.5)) / SHINE_STEPS} y={0} width={12} height={64} fill="#FFFFFF" opacity={0.75} transform="skewX(-20)" />
            </G>
          </Layer>
        ))}
    </>
  );
}

/** Pixel: an 8-bit flame that flips between two frames, with pixel sparks rising. */
function Pixel({ size, sec, t }: P & { t: TierColors }) {
  const shades = [t.c2, t.cm, t.c1, '#FFFFFF'];
  const frame = (pixels: [number, number, number][], show: 0 | 1) => (
    <Layer
      key={show}
      size={size}
      sec={sec}
      motion={(s) => {
        'worklet';
        return { opacity: stepframes(phase(s, 0.5), [0, 0.5], show === 0 ? [1, 0] : [0, 1]) };
      }}
    >
      {pixels.map(([x, y, shade], i) => (
        <Rect key={i} x={x} y={y} width={6} height={6} fill={shades[shade]} />
      ))}
    </Layer>
  );
  const spark = (x: number, y: number, color: string, offset: number) => (
    <Layer
      key={offset}
      size={size}
      sec={sec}
      motion={(s) => {
        'worklet';
        const f = Math.floor(phase(s, 1.4, offset) * 4) / 4;
        return { opacity: 1 - f, transform: [{ translateY: (-12 * f * size) / 64 }] };
      }}
    >
      <Rect x={x} y={y} width={4} height={4} fill={color} />
    </Layer>
  );
  return (
    <>
      {frame(PIXEL_A, 0)}
      {sec && frame(PIXEL_B, 1)}
      {sec && [spark(50, 14, t.c1, 0), spark(10, 22, t.cm, 0.7)]}
    </>
  );
}

/** Plasma: a dark flame with a neon rim and a bolt for a core; small arcs crackle around it. */
function Plasma({ size, sec }: P) {
  const g = useSvgId('plasma');
  const arcs = ['M14 30 L9 34 L13 37 L7 42', 'M50 26 L55 31 L51 34 L57 39', 'M20 14 L17 9 L21 7 L18 2', 'M46 50 L52 52 L49 56 L55 59'];
  return (
    <>
      <Layer size={size} sec={sec} origin="50% 94%" motion={flick(size)}>
        <Defs>
          <LinearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E6FBFF" />
            <Stop offset="0.5" stopColor="#33D1FF" />
            <Stop offset="1" stopColor="#3557FF" />
          </LinearGradient>
        </Defs>
        <Path d={FLAME_PATH} fill="#0E1640" stroke={`url(#${g})`} strokeWidth={3} strokeLinejoin="round" />
        <Path d={CORE_PATH} fill="#E6FBFF" />
        <Path d="M32 16 L28 30 L34 30 L30 44" fill="none" stroke="#9FEFFF" strokeWidth={2} strokeLinejoin="round" />
      </Layer>
      {sec &&
        arcs.map((d, i) => (
          <Layer
            key={i}
            size={size}
            sec={sec}
            motion={(s) => {
              'worklet';
              return { opacity: stepframes(phase(s, 2.4, i * 0.6), [0, 0.06, 0.09, 0.13], [1, 0, 1, 0]) };
            }}
          >
            <Path d={d} fill="none" stroke="#7FEAFF" strokeWidth={1.6} strokeLinejoin="round" />
          </Layer>
        ))}
    </>
  );
}

/** Ink: three vermilion brush strokes with a red seal; it sways and redraws itself now and then. */
function Ink({ size, sec }: P) {
  return (
    <>
      <InkStrokes size={size} sec={sec} />
      <Layer size={size}>
        <Rect x={45} y={50} width={9} height={9} rx={1.5} fill="#B5121B" />
        <Path d="M47.5 52.5h4M49.5 52.5v4M47.5 56.5h4" stroke="#FFFFFF" strokeWidth={1.1} />
        <Circle cx={14} cy={57} r={1.4} fill="#E5432F" />
        <Circle cx={11} cy={53} r={0.9} fill="#E5432F" />
      </Layer>
    </>
  );
}

/** The strokes are painted upwards from the base, so a mask growing from the bottom draws them again every 7 s. */
function InkStrokes({ size, sec }: P) {
  const reveal = useAnimatedStyle(() => {
    if (!sec) return { height: size };
    const f = phase(sec.value, 7);
    const shown = f < 0.12 ? 1 - Math.pow(1 - f / 0.12, 3) : 1;
    return { height: Math.max(1, shown * size) };
  });
  const sway = useAnimatedStyle(() => {
    if (!sec) return {};
    const w = wave(sec.value, 3.4);
    return { transform: [{ rotate: `${-3 * w}deg` }, { scaleY: 1 + 0.04 * w }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, transformOrigin: '50% 94%' } as ViewStyle, sway]} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0, width: size, overflow: 'hidden' }, reveal]}>
        <View style={{ position: 'absolute', left: 0, bottom: 0, width: size, height: size }}>
          <Svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
            <Path d="M30 59 C16 52 15 35 26 25 C31 20 32 12 29 5" fill="none" stroke="#E5432F" strokeWidth={7} strokeLinecap="round" />
            <Path d="M36 59 C48 51 48 38 40 27 C38 24 38 20 40 16" fill="none" stroke="#E5432F" strokeWidth={6} strokeLinecap="round" />
            <Path d="M33 52 C29 46 31 40 35 35" fill="none" stroke="#FFB199" strokeWidth={3.5} strokeLinecap="round" />
            <Path d="M30 59 C16 52 15 35 26 25" fill="none" stroke="#7A1A10" strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
          </Svg>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** Lava: a flame rising out of a dark rock with glowing cracks; blobs of lava rise inside it. */
function Lava({ size, sec }: P) {
  const g = useSvgId('lava');
  const blob = (x: number, y: number, r: number, color: string, offset: number) => (
    <Layer
      key={offset}
      size={size}
      sec={sec}
      motion={(s) => {
        'worklet';
        const f = phase(s, 3, offset);
        const e = 0.5 - 0.5 * Math.cos(f * Math.PI);
        return { opacity: 1 - e, transform: [{ translateY: (-30 * e * size) / 64 }, { scale: 1 - 0.5 * e }] };
      }}
      origin={`${(x / 64) * 100}% ${(y / 64) * 100}%`}
    >
      <Circle cx={x} cy={y} r={r} fill={color} />
    </Layer>
  );
  return (
    <>
      <Layer size={size} sec={sec} origin="50% 87%" motion={flick(size)}>
        <Defs>
          <LinearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE08A" />
            <Stop offset="0.5" stopColor="#F0490F" />
            <Stop offset="1" stopColor="#8A1406" />
          </LinearGradient>
        </Defs>
        <Path d={FLAME_PATH} transform="translate(32 36) scale(0.82) translate(-32 -36)" fill={`url(#${g})`} stroke="#5A0D04" strokeWidth={2} />
      </Layer>
      {sec && [blob(28, 54, 4, '#FFE08A', 0), blob(37, 56, 3, '#FFC44D', 1.5)]}
      <Layer size={size}>
        <Path d="M6 63 L12 52 L22 54 L30 49 L40 53 L50 50 L58 63Z" fill="#2B1D1A" stroke="#120a08" strokeWidth={1.2} />
      </Layer>
      <Layer
        size={size}
        sec={sec}
        motion={(s) => {
          'worklet';
          return { opacity: 1 - 0.65 * wave(s, 2.4) };
        }}
      >
        <Path d="M16 62 L20 56 L24 58 M34 62 L36 55 L42 57 L46 53" fill="none" stroke="#FF7A1A" strokeWidth={1.4} strokeLinejoin="round" />
      </Layer>
    </>
  );
}

/** The flicker every lit flame shares: up a little and taller, 1.6 s. */
function flick(size: number): Motion {
  return (s) => {
    'worklet';
    const w = wave(s, 1.6);
    return { transform: [{ translateY: (-1.5 * w * size) / 64 }, { scaleX: 1 + 0.04 * w }, { scaleY: 1 + 0.08 * w }] };
  };
}
