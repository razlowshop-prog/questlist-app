import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { bizzyGripSvg, bizzySvg, type BizzyMood } from '../bizzy';
import { nativeDriver } from '../theme';
import { useReduceMotion } from './FireAura';

/** Moods whose eyes are already shut or squeezed, so they don't blink. */
const NO_BLINK: BizzyMood[] = ['sleepy', 'proud'];
const GRIP = bizzyGripSvg();

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
 * Bizzy the bee. He bobs gently (or sways), blinks, and jumps with joy each
 * time `cheer` goes up. All still when the phone asks for less motion.
 * Decorative: screen readers skip him.
 */
export function Bizzy({
  mood = 'happy',
  size = 72,
  style,
  look,
  motion = 'bob',
  cheer = 0,
}: {
  mood?: BizzyMood;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Where he looks, a few units left/right and up/down. */
  look?: [number, number];
  motion?: 'bob' | 'sway' | 'none';
  /** Goes up by one for every reason to cheer (a ticked task). */
  cheer?: number;
}) {
  const reduce = useReduceMotion();
  const idle = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const [excited, setExcited] = useState(false);
  const shown = excited ? 'excited' : mood;
  const shut = useBlink(!reduce && !NO_BLINK.includes(shown));
  const xml = useMemo(() => bizzySvg(shown, true, { look, blink: shut }), [shown, look?.[0], look?.[1], shut]);

  useEffect(() => {
    if (reduce || motion === 'none') return;
    const half = (toValue: number) => Animated.timing(idle, { toValue, duration: motion === 'sway' ? 1800 : 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver });
    const loop = Animated.loop(Animated.sequence([half(1), half(0)]));
    loop.start();
    return () => loop.stop();
  }, [reduce, motion]);

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
    idle.interpolate({ inputRange: [0, 1], outputRange: [0, motion === 'bob' ? -size * 0.04 : -size * 0.015] }),
    jump.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.35] }),
  );
  const turn = idle.interpolate({ inputRange: [0, 1], outputRange: motion === 'sway' ? ['-4deg', '4deg'] : ['0deg', '0deg'] });
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
 * below it. `children` needs a solid background.
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
  const hand = size * 0.26;
  // His mouth sits on the edge: 57% of him shows above it.
  return (
    <View>
      <View pointerEvents="none" style={{ position: 'absolute', right, width: size, top: -size * 0.57, bottom: 0, overflow: 'hidden' }}>
        <Animated.View style={{ transform: [{ translateY: duck.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.34] }) }] }}>
          <Bizzy mood={mood} size={size} look={look} motion="none" />
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
