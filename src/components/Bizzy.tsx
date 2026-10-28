import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { bizzyEdge, bizzyFormOf, bizzyGripSvg, bizzySvg, bizzyWingRoot, bizzyWingsSvg, type BizzyLook, type BizzyMood } from '../bizzy';
import { nativeDriver } from '../theme';
import { useReduceMotion } from './FireAura';
import { useLoop, useLoopsOn } from './fx/hooks';

/** Moods whose eyes are already shut or squeezed, so they don't blink. */
const NO_BLINK: BizzyMood[] = ['sleepy', 'proud'];
const GRIP = bizzyGripSvg();

/** How far the player's Bizzy has evolved (1 to 10); every Bizzy in the app draws this form. */
export const BizzyFormContext = createContext(1);

type Idle = 'bob' | 'sway' | 'look';
const IDLES: Idle[] = ['bob', 'sway', 'look'];
/** Where he glances while looking around, before looking ahead again. */
const GLANCES: [number, number][] = [
  [-3, 1],
  [3, -1],
  [1, 2],
  [-2, -1],
];
/** How strongly each idle bobs and sways; the switch from one to the next blends over a second. */
const BLEND: Record<Idle, [bob: number, sway: number]> = { bob: [1, 0], sway: [0, 1], look: [0.3, 0] };

/** His idle keeps changing: bob, sway or look around, each for 6 to 10 seconds, never the same twice in a row. */
function useIdle(on: boolean): Idle {
  const [idle, setIdle] = useState<Idle>(() => IDLES[Math.floor(Math.random() * IDLES.length)]);
  useEffect(() => {
    if (!on) return;
    let timer: ReturnType<typeof setTimeout>;
    let now = idle;
    const next = () => {
      timer = setTimeout(() => {
        const others = IDLES.filter((i) => i !== now);
        now = others[Math.floor(Math.random() * others.length)];
        setIdle(now);
        next();
      }, 6000 + Math.random() * 4000);
    };
    next();
    return () => clearTimeout(timer);
  }, [on]);
  return idle;
}

/**
 * While looking around: a glance somewhere new every 1.4 to 2.2 seconds, and
 * straight ahead otherwise. His eyes glide there in a few small steps.
 */
function useGlance(on: boolean): [number, number] {
  const [glance, setGlance] = useState<[number, number]>([0, 0]);
  const at = useRef<[number, number]>([0, 0]);
  useEffect(() => {
    let hold: ReturnType<typeof setTimeout>;
    let glide: ReturnType<typeof setInterval> | undefined;
    const goTo = (to: [number, number]) => {
      clearInterval(glide);
      const from = at.current;
      let step = 0;
      glide = setInterval(() => {
        step += 1;
        const t = 0.5 - Math.cos((Math.PI * step) / 5) / 2;
        at.current = [Math.round((from[0] + (to[0] - from[0]) * t) * 10) / 10, Math.round((from[1] + (to[1] - from[1]) * t) * 10) / 10];
        setGlance(at.current);
        if (step >= 5) clearInterval(glide);
      }, 40);
    };
    if (!on) {
      if (at.current[0] || at.current[1]) goTo([0, 0]);
      return () => clearInterval(glide);
    }
    let i = Math.floor(Math.random() * GLANCES.length);
    const next = () => {
      hold = setTimeout(() => {
        i = (i + 1 + Math.floor(Math.random() * 2)) % GLANCES.length;
        goTo(GLANCES[i]);
        next();
      }, 1400 + Math.random() * 800);
    };
    next();
    return () => {
      clearTimeout(hold);
      clearInterval(glide);
    };
  }, [on]);
  return glance;
}

/** Blinks now and then: true for a moment every 3 to 5.5 seconds. */
function useBlink(on: boolean): boolean {
  const [shut, setShut] = useState(false);
  useEffect(() => {
    if (!on) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        setShut(true);
        timer = setTimeout(() => {
          setShut(false);
          next();
        }, 140);
      }, 3000 + Math.random() * 2500);
    };
    next();
    return () => {
      clearTimeout(timer);
      setShut(false);
    };
  }, [on]);
  return shut;
}

/**
 * Bizzy drawn at `size`, his wings buzzing like in the first mascot drawings
 * (still while he sleeps, when `flap` is off, or when the phone asks for less
 * motion). The wings are layers of their own behind him, so they can flap.
 */
export function BizzyArt({ mood, size, form, look, blink, shadow = true, flap = true, fast = false }: BizzyLook & { mood: BizzyMood; size: number; form: number; shadow?: boolean; flap?: boolean; fast?: boolean }) {
  const on = useLoopsOn() && flap && mood !== 'sleepy';
  // `fast` beats twice as quick, for when he zooms about.
  const beat = useLoop(fast ? 110 : 220, on);
  const left = useMemo(() => bizzyWingsSvg(form, 'left'), [form]);
  const right = useMemo(() => bizzyWingsSvg(form, 'right'), [form]);
  const body = useMemo(() => bizzySvg(mood, shadow, { look, blink, form, wings: !left }), [mood, shadow, look?.[0], look?.[1], blink, form, left]);
  // The left wings swing from -9 to 10 degrees and back, the right ones mirror them.
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-9 + 19 * beat.value}deg` }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${9 - 19 * beat.value}deg` }] }));
  const layer = (side: 'left' | 'right') => {
    const [x, y] = bizzyWingRoot(form, side);
    return { position: 'absolute', left: 0, top: 0, width: size, height: size, transformOrigin: `${x * size}px ${y * size}px` } as ViewStyle;
  };
  return (
    <View style={{ width: size, height: size }}>
      {left ? (
        <>
          <Reanimated.View style={[layer('left'), leftStyle]}>
            <SvgXml xml={left} width={size} height={size} />
          </Reanimated.View>
          <Reanimated.View style={[layer('right'), rightStyle]}>
            <SvgXml xml={right} width={size} height={size} />
          </Reanimated.View>
        </>
      ) : null}
      <SvgXml xml={body} width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }} />
    </View>
  );
}

/**
 * Bizzy the bee, in the player's form. He bobs (or sways, or on the streak
 * card keeps changing between bobbing, swaying and looking around, blending
 * smoothly from one to the next), blinks, buzzes his wings, and jumps with
 * joy each time `cheer` goes up. All still when the phone asks for less
 * motion. Decorative: screen readers skip him.
 */
export function Bizzy({
  mood = 'happy',
  size = 72,
  style,
  look,
  motion = 'bob',
  flap = true,
  fast = false,
  cheer = 0,
  form,
}: {
  mood?: BizzyMood;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Where he looks, a few units left/right and up/down. */
  look?: [number, number];
  /** 'idle' keeps changing between bobbing, swaying and looking around. */
  motion?: 'idle' | 'bob' | 'sway' | 'none';
  /** Whether his wings buzz. */
  flap?: boolean;
  /** Buzzes his wings twice as fast. */
  fast?: boolean;
  /** Goes up by one for every reason to cheer (a ticked task). */
  cheer?: number;
  /** Draws this form instead of the player's own. */
  form?: number;
}) {
  const own = useContext(BizzyFormContext);
  const shape = form ?? own;
  const reduce = useReduceMotion();
  const bob = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const bobAmp = useRef(new Animated.Value(0)).current;
  const swayAmp = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const [excited, setExcited] = useState(false);
  const idle = useIdle(!reduce && motion === 'idle');
  const move: Idle | 'none' = reduce || motion === 'none' ? 'none' : motion === 'idle' ? idle : motion;
  const glance = useGlance(move === 'look');
  const shown = excited ? 'excited' : mood;
  const shut = useBlink(!reduce && !NO_BLINK.includes(shown));
  const lx = (look?.[0] ?? 0) + glance[0];
  const ly = (look?.[1] ?? 0) + glance[1];
  const eyes = useMemo<[number, number]>(() => [lx, ly], [lx, ly]);

  // Bob (0 to 1 and back) and sway (through rest from one side, -1, to the other, 1)
  // keep running while he moves; how much of each shows blends over a second.
  const loops = motion === 'none' || reduce ? 'none' : motion;
  useEffect(() => {
    if (loops === 'none') return;
    const ease = (value: Animated.Value, toValue: number, duration: number, easing: (t: number) => number) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: nativeDriver });
    const anims = [
      loops !== 'sway' && Animated.loop(Animated.sequence([ease(bob, 1, 1400, Easing.inOut(Easing.sin)), ease(bob, 0, 1400, Easing.inOut(Easing.sin))])),
      loops !== 'bob' && Animated.loop(Animated.sequence([ease(sway, 1, 1300, Easing.out(Easing.sin)), ease(sway, -1, 2600, Easing.inOut(Easing.sin)), ease(sway, 0, 1300, Easing.in(Easing.sin))])),
    ].filter((a): a is Animated.CompositeAnimation => !!a);
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [loops]);
  useEffect(() => {
    const [b, w] = move === 'none' ? [0, 0] : BLEND[move];
    const blend = (value: Animated.Value, toValue: number) => Animated.timing(value, { toValue, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver });
    const anim = Animated.parallel([blend(bobAmp, b), blend(swayAmp, w)]);
    anim.start();
    return () => anim.stop();
  }, [move]);

  // A cheer: excited face, a hop up and a bouncy landing. The first value is where he starts, not a cheer.
  const lastCheer = useRef(cheer);
  useEffect(() => {
    if (cheer <= lastCheer.current) {
      lastCheer.current = cheer;
      return;
    }
    lastCheer.current = cheer;
    setExcited(true);
    const done = setTimeout(() => setExcited(false), 1600);
    if (!reduce) {
      jump.setValue(0);
      Animated.sequence([
        Animated.timing(jump, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.spring(jump, { toValue: 0, friction: 4, tension: 120, useNativeDriver: nativeDriver }),
      ]).start();
    }
    return () => clearTimeout(done);
  }, [cheer]);

  const swing = Animated.multiply(sway, swayAmp);
  const lift = Animated.add(
    Animated.add(
      Animated.multiply(bob, bobAmp).interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.04] }),
      swing.interpolate({ inputRange: [-1, 0, 1], outputRange: [-size * 0.008, 0, -size * 0.008] }),
    ),
    jump.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.35] }),
  );
  const turn = swing.interpolate({ inputRange: [-1, 1], outputRange: ['-2.5deg', '2.5deg'] });
  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ translateY: lift }, { rotate: turn }] }, style]} aria-hidden importantForAccessibility="no-hide-descendants">
      <BizzyArt mood={shown} size={size} form={shape} look={eyes} blink={shut} flap={flap && !reduce} fast={fast} />
    </Animated.View>
  );
}

/**
 * Bizzy peeking over the top edge of `children` (a field or a card) from
 * behind it, holding on with both hands. He is cut off at the bottom of
 * `children`, so nothing of him ever shows below it. `children` needs a solid
 * background. Works in every form: the young ones are drawn bigger so their
 * heads still reach over the edge.
 */
export function PeekOver({
  children,
  size = 72,
  right = 32,
  mood = 'curious',
  look,
}: {
  children: ReactNode;
  size?: number;
  /** Space between his right side and the right edge of `children`. */
  right?: number;
  mood?: BizzyMood;
  look?: [number, number];
}) {
  const form = useContext(BizzyFormContext);
  const hand = size * 0.26;
  // The young forms are drawn bigger, so his head is as big as the full Bizzy's at `size`.
  const drawn = size / bizzyFormOf(form).k;
  // His chin sits on the edge (57% of the full Bizzy shows above it).
  return (
    <View>
      <View pointerEvents="none" style={{ position: 'absolute', right: right - (drawn - size) / 2, width: drawn, top: -drawn * bizzyEdge(form), bottom: 0, overflow: 'hidden' }}>
        <Bizzy mood={mood} size={drawn} look={look} motion="none" />
      </View>
      {/* A view of its own, so the field is drawn over Bizzy on the web too (an <input> alone would sit under him). */}
      <View style={{ position: 'relative' }}>{children}</View>
      <View
        pointerEvents="none"
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', top: -hand * 0.4, right: right + size * 0.3 - hand / 2, flexDirection: 'row', gap: size * 0.4 - hand }}
      >
        <SvgXml xml={GRIP} width={hand} height={hand * 0.8} />
        <SvgXml xml={GRIP} width={hand} height={hand * 0.8} />
      </View>
    </View>
  );
}
