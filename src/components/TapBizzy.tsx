import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import type { BizzyMood } from '../bizzy';
import { greeting, pickLine, pickReaction, tickleLine, type Line, type Reaction, type TalkContext } from '../bizzyTalk';
import { buzz } from '../haptics';
import { t } from '../i18n';
import { Bizzy } from './Bizzy';

type Bits = 'sparkles' | 'hearts' | 'drops' | 'zz';

/** One moment of a reaction: when (0 to 1) and where he is then, in shares of his size. Left out = at rest. */
type Frame = { at: number; x?: number; y?: number; r?: number; sx?: number; sy?: number };

/** How each reaction moves, how long it takes, the face he makes, and what flies off him. */
const MOVES: Record<Exclude<Reaction, 'zoom'>, { ms: number; face: BizzyMood; faceMs: number; frames: Frame[]; bits?: Bits; fast?: boolean }> = {
  giggle: { ms: 700, face: 'excited', faceMs: 1200, frames: [{ at: 0.2, y: 0.07, sx: 1.16, sy: 0.8 }, { at: 0.5, y: -0.05, sx: 0.9, sy: 1.12 }, { at: 0.75, sx: 1.06, sy: 0.95 }, { at: 1 }] },
  hop: { ms: 800, face: 'excited', faceMs: 1300, bits: 'sparkles', frames: [{ at: 0.12, y: 0.05, sx: 1.1, sy: 0.88 }, { at: 0.45, y: -0.4, sx: 0.94, sy: 1.08 }, { at: 0.75, y: 0.03, sx: 1.12, sy: 0.86 }, { at: 1 }] },
  wave: { ms: 1400, face: 'wave', faceMs: 1800, frames: [{ at: 0.25, r: -5 }, { at: 0.5, r: 3 }, { at: 0.75, r: -3 }, { at: 1 }] },
  loop: { ms: 1200, face: 'excited', faceMs: 1500, fast: true, frames: [{ at: 0.25, y: -0.35 }, { at: 0.7, y: -0.35, r: 360 }, { at: 0.88, y: 0.03, r: 360, sx: 1.08, sy: 0.92 }, { at: 1, r: 360 }] },
  blush: { ms: 1400, face: 'proud', faceMs: 1700, bits: 'hearts', frames: [{ at: 0.3, r: -4, sx: 0.94, sy: 0.94 }, { at: 0.7, r: -3, sx: 0.96, sy: 0.96 }, { at: 1 }] },
  wiggle: { ms: 760, face: 'excited', faceMs: 1100, frames: [-12, 12, -10, 10, -7, 7, -3, 0].map((r, i) => ({ at: (i + 1) / 8, r })) },
  burst: { ms: 650, face: 'excited', faceMs: 1300, bits: 'drops', frames: [{ at: 0.18, sx: 0.86, sy: 0.86 }, { at: 0.42, sx: 1.14, sy: 1.14 }, { at: 1 }] },
  worry: { ms: 500, face: 'worried', faceMs: 1600, frames: [-0.06, 0.06, -0.045, 0.045, 0].map((x, i) => ({ at: (i + 1) / 5, x })) },
  wake: { ms: 500, face: 'excited', faceMs: 1400, fast: true, bits: 'zz', frames: [{ at: 0.3, y: -0.2 }, { at: 1 }] },
  proud: { ms: 600, face: 'proud', faceMs: 1500, bits: 'sparkles', frames: [{ at: 0.5, y: -0.06, sx: 1.1, sy: 1.1 }, { at: 1 }] },
};

const ease = Easing.inOut(Easing.quad);

/** Plays one channel through the frames, starting from wherever it is now; `snap` jumps to a value at the end. */
function run(v: SharedValue<number>, frames: Frame[], key: keyof Omit<Frame, 'at'>, ms: number, rest: number, snap?: number) {
  let at = 0;
  const steps = frames.map((f) => {
    const step = withTiming(f[key] ?? rest, { duration: Math.max(1, (f.at - at) * ms), easing: ease });
    at = f.at;
    return step;
  });
  if (snap !== undefined) steps.push(withTiming(snap, { duration: 0 }));
  v.value = withSequence(...steps);
}

/**
 * Bizzy on the streak card, ready to be tapped: each tap plays a little
 * reaction (a surprise, or mostly one that fits his mood) and hands a short
 * line to `onSay` for his speech bubble. Tapped many times quickly, he finds
 * it tickles. With less motion he only changes his face and talks.
 */
export function TapBizzy({ mood, cheer, size, look, talk, onSay }: { mood: BizzyMood; cheer: number; size: number; look?: [number, number]; talk: () => TalkContext; onSay: (line: Line) => void }) {
  const reduce = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const r = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const o = useSharedValue(1);
  const [face, setFace] = useState<BizzyMood>();
  const [fast, setFast] = useState(false);
  const [bits, setBits] = useState<{ kind: Bits; id: number }>();
  const last = useRef<Reaction>(undefined);
  const recent = useRef<string[]>([]);
  const taps = useRef<number[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  function say(line: Line) {
    recent.current = [line.key, ...recent.current].slice(0, 5);
    onSay(line);
  }

  function tap() {
    buzz('tap');
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const now = Date.now();
    taps.current = [...taps.current.filter((at) => now - at < 4000), now];
    const tickled = taps.current.length >= 8;
    if (tickled) taps.current = [];
    const reaction: Reaction = tickled ? 'wiggle' : pickReaction(mood, last.current);
    last.current = reaction;
    const ctx = talk();
    say(tickled ? tickleLine() : reaction === 'wave' ? greeting(ctx) : pickLine(ctx, recent.current));
    play(reaction);
  }

  function play(reaction: Reaction) {
    if (reaction === 'zoom') {
      setFace('excited');
      later(1600, () => setFace(undefined));
      if (reduce) return;
      setFast(true);
      later(1500, () => setFast(false));
      // Off to the right, then back in from far left with a little overshoot.
      const out = { duration: 380, easing: Easing.in(Easing.quad) };
      x.value = withSequence(withTiming(-0.08, { duration: 80 }), withTiming(2.2, out), withTiming(-4, { duration: 0 }), withTiming(0, { duration: 760, easing: Easing.out(Easing.back(1.6)) }));
      r.value = withSequence(withTiming(12, { duration: 460 }), withTiming(0, { duration: 760 }));
      o.value = withSequence(withTiming(1, { duration: 450 }), withTiming(0, { duration: 0 }), withTiming(1, { duration: 120 }));
      return;
    }
    const m = MOVES[reaction];
    setFace(m.face);
    later(m.faceMs, () => setFace(undefined));
    if (reduce) return;
    if (m.fast) {
      setFast(true);
      later(m.faceMs, () => setFast(false));
    }
    if (m.bits) setBits({ kind: m.bits, id: Date.now() });
    run(x, m.frames, 'x', m.ms, 0);
    run(y, m.frames, 'y', m.ms, 0);
    run(sx, m.frames, 'sx', m.ms, 1);
    run(sy, m.frames, 'sy', m.ms, 1);
    // A full loop ends at 360°, which looks the same as rest: snap back so the next one starts clean.
    run(r, m.frames, 'r', m.ms, 0, reaction === 'loop' ? 0 : undefined);
  }

  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateX: x.value * size }, { translateY: y.value * size }, { rotate: `${r.value}deg` }, { scaleX: sx.value }, { scaleY: sy.value }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Pressable onPress={tap} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('Bizzy. Tap to hear what he says')}>
        <Animated.View style={style}>
          <Bizzy mood={face ?? mood} cheer={cheer} size={size} look={look} motion="idle" fast={fast} />
        </Animated.View>
      </Pressable>
      {bits && <FlyingBits key={bits.id} kind={bits.kind} size={size} />}
    </View>
  );
}

const SPARK = 'M0 -6Q0 0 6 0Q0 0 0 6Q0 0 -6 0Q0 0 0 -6Z';
const HEART = 'M0 5.5C-4 2.5-7 0-7-3.2A3.6 3.6 0 0 1 0-4.6a3.6 3.6 0 0 1 7 1.4C7 0 4 2.5 0 5.5z';
const DROP = 'M0 -6.5C1.5 -2.5 5 -0.5 5 2a5 5 0 0 1-10 0C-5 -0.5 -1.5 -2.5 0 -6.5z';

/** Where each bit starts (shares of his size from his middle), where it flies to, and its colour. */
const BITS: Record<Bits, { from: [number, number]; to: [number, number]; color: string; delay: number }[]> = {
  sparkles: [
    { from: [-0.5, -0.2], to: [-0.6, -0.35], color: '#FFE48A', delay: 150 },
    { from: [0.42, -0.4], to: [0.52, -0.55], color: '#BFEAFF', delay: 250 },
    { from: [0.5, 0.15], to: [0.6, 0.05], color: '#FFE48A', delay: 350 },
  ],
  hearts: [
    { from: [-0.28, -0.1], to: [-0.38, -0.75], color: '#FF8FB1', delay: 0 },
    { from: [0, -0.15], to: [0.02, -0.9], color: '#FF5C8A', delay: 250 },
    { from: [0.26, -0.1], to: [0.36, -0.75], color: '#FF8FB1', delay: 480 },
  ],
  drops: Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const d = 0.62 + (i % 2) * 0.12;
    return { from: [0, 0] as [number, number], to: [Math.cos(a) * d, Math.sin(a) * d + 0.1] as [number, number], color: i % 3 === 1 ? '#FFE48A' : '#F2B544', delay: 0 };
  }),
  zz: [
    { from: [0.3, -0.35], to: [0.5, -0.65], color: '#A3B3EA', delay: 900 },
    { from: [0.42, -0.5], to: [0.66, -0.85], color: '#A3B3EA', delay: 1150 },
  ],
};

/** Sparkles, hearts, honey drops or sleepy z's flying off him once. */
function FlyingBits({ kind, size }: { kind: Bits; size: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: size / 2, top: size / 2 }}>
      {BITS[kind].map((b, i) => (
        <Bit key={i} kind={kind} bit={b} size={size} index={i} />
      ))}
    </View>
  );
}

function Bit({ kind, bit, size, index }: { kind: Bits; bit: (typeof BITS)[Bits][number]; size: number; index: number }) {
  const p = useSharedValue(0);
  const ms = kind === 'drops' ? 900 : kind === 'hearts' ? 1300 : 900;
  useEffect(() => {
    const id = setTimeout(() => (p.value = withTiming(1, { duration: ms, easing: Easing.out(Easing.quad) })), bit.delay);
    return () => clearTimeout(id);
  }, []);
  const style = useAnimatedStyle(() => {
    const v = p.value;
    return {
      opacity: v === 0 ? 0 : v < 0.25 ? v * 4 : 1 - (v - 0.25) / 0.75,
      transform: [{ translateX: (bit.from[0] + (bit.to[0] - bit.from[0]) * v) * size }, { translateY: (bit.from[1] + (bit.to[1] - bit.from[1]) * v) * size }, { scale: kind === 'drops' ? 0.5 + 0.5 * Math.min(1, v * 2) : 0.4 + 0.8 * Math.sin(Math.PI * Math.min(1, v * 1.4) * 0.5) }],
    };
  });
  const s = 14;
  return (
    <Animated.View style={[{ position: 'absolute', left: -s / 2, top: -s / 2, width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
      {kind === 'zz' ? (
        <Text style={{ color: bit.color, fontWeight: '700', fontSize: index ? 16 : 12 }}>{index ? 'Z' : 'z'}</Text>
      ) : (
        <Svg width={s} height={s} viewBox="-7 -7 14 14">
          <Path d={kind === 'sparkles' ? SPARK : kind === 'hearts' ? HEART : DROP} fill={bit.color} />
          {kind === 'drops' && <Circle cx={-1.6} cy={2} r={1.3} fill="#FFF3C4" />}
        </Svg>
      )}
    </Animated.View>
  );
}
