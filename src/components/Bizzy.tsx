import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { bizzyEdge, bizzyFormOf, bizzyGripSvg, bizzySvg, type BizzyMood } from '../bizzy';
import { nativeDriver } from '../theme';
import { useReduceMotion } from './FireAura';

/** Moods whose eyes are already shut or squeezed, so they don't blink. */
const NO_BLINK: BizzyMood[] = ['sleepy', 'proud'];
const GRIP = bizzyGripSvg();

/** How far the player's Bizzy has evolved (1 to 10); every Bizzy in the app draws this form. */
export const BizzyFormContext = createContext(1);

type Idle = 'bob' | 'sway' | 'look';
const IDLES: Idle[] = ['bob', 'sway', 'look'];
/** Where he glances while looking around, before looking ahead again. */
const GLANCES: [number, number][] = [
  [-4, 1],
  [4, -1],
  [1, 3],
  [-3, -2],
];

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

/** While looking around: a glance somewhere new every second or so; straight ahead otherwise. */
function useGlance(on: boolean): [number, number] {
  const [glance, setGlance] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    if (!on) {
      setGlance([0, 0]);
      return;
    }
    let i = Math.floor(Math.random() * GLANCES.length);
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        i = (i + 1 + Math.floor(Math.random() * 2)) % GLANCES.length;
        setGlance(GLANCES[i]);
        next();
      }, 900 + Math.random() * 500);
    };
    next();
    return () => clearTimeout(timer);
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
 * Bizzy the bee, in the player's form. He idles (bobbing, swaying and looking
 * around in turn, or one move when asked), blinks, and jumps with joy each
 * time `cheer` goes up. All still when the phone asks for less motion.
 * Decorative: screen readers skip him.
 */
export function Bizzy({
  mood = 'happy',
  size = 72,
  style,
  look,
  motion = 'idle',
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
  const jump = useRef(new Animated.Value(0)).current;
  const [excited, setExcited] = useState(false);
  const idle = useIdle(!reduce && motion === 'idle');
  const move: Idle | 'none' = reduce || motion === 'none' ? 'none' : motion === 'idle' ? idle : motion;
  const glance = useGlance(move === 'look');
  const shown = excited ? 'excited' : mood;
  const shut = useBlink(!reduce && !NO_BLINK.includes(shown));
  const lx = (look?.[0] ?? 0) + glance[0];
  const ly = (look?.[1] ?? 0) + glance[1];
  const xml = useMemo(() => bizzySvg(shown, true, { look: [lx, ly], blink: shut, form: shape }), [shown, lx, ly, shut, shape]);

  // Bob and sway each have their own value: the one in use loops, the other settles back to rest.
  // Bob goes 0 to 1 and back; sway swings through rest from one side (-1) to the other (1).
  useEffect(() => {
    const ease = (value: Animated.Value, toValue: number, duration: number, easing: (t: number) => number) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: nativeDriver });
    const anims = [
      move === 'bob'
        ? Animated.loop(Animated.sequence([ease(bob, 1, 1300, Easing.inOut(Easing.sin)), ease(bob, 0, 1300, Easing.inOut(Easing.sin))]))
        : ease(bob, 0, 400, Easing.out(Easing.quad)),
      move === 'sway'
        ? Animated.loop(Animated.sequence([ease(sway, 1, 900, Easing.out(Easing.sin)), ease(sway, -1, 1800, Easing.inOut(Easing.sin)), ease(sway, 0, 900, Easing.in(Easing.sin))]))
        : ease(sway, 0, 400, Easing.out(Easing.quad)),
    ];
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
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

  const lift = Animated.add(
    Animated.add(bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.04] }), sway.interpolate({ inputRange: [-1, 0, 1], outputRange: [-size * 0.015, 0, -size * 0.015] })),
    jump.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.35] }),
  );
  const turn = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] });
  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ translateY: lift }, { rotate: turn }] }, style]} aria-hidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width={size} height={size} />
    </Animated.View>
  );
}

/**
 * Bizzy peeking over the top edge of `children` (a field or a card) from
 * behind it, holding on with both hands, and ducking down now and then.
 * He is cut off at the bottom of `children`, so nothing of him ever shows
 * below it. `children` needs a solid background. Works in every form: the
 * young ones are drawn bigger so their heads still reach over the edge.
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
  const reduce = useReduceMotion();
  const duck = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(4200),
        Animated.timing(duck, { toValue: 1, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.delay(700),
        Animated.timing(duck, { toValue: 0, duration: 420, easing: Easing.out(Easing.back(1.6)), useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce]);
  const form = useContext(BizzyFormContext);
  const hand = size * 0.26;
  // The young forms are drawn bigger, so his head is as big as the full Bizzy's at `size`.
  const drawn = size / bizzyFormOf(form).k;
  // His chin sits on the edge (57% of the full Bizzy shows above it).
  return (
    <View>
      <View pointerEvents="none" style={{ position: 'absolute', right: right - (drawn - size) / 2, width: drawn, top: -drawn * bizzyEdge(form), bottom: 0, overflow: 'hidden' }}>
        <Animated.View style={{ transform: [{ translateY: duck.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.34] }) }] }}>
          <Bizzy mood={mood} size={drawn} look={look} motion="none" />
        </Animated.View>
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
