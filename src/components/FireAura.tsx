import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { nativeDriver, useTheme } from '../theme';
import { fireColor } from './Fire';

/**
 * A quiet backdrop for a fire tier's banner, a little stronger per tier:
 * Flame a soft warm glow, Blaze adds a few slow embers, Inferno a fuller,
 * gently breathing glow with more embers. Spark shows nothing. Fills its
 * parent, which should clip (overflow hidden) and draw content above it.
 */
export function FireAura({ tier, id }: { tier: number; /** Unique per screen, for the SVG gradient. */ id: string }) {
  const c = useTheme();
  const reduceMotion = useReduceMotion();
  const breath = useRef(new Animated.Value(0)).current;
  const color = fireColor(tier, c);
  const strength = AURA[tier];

  useEffect(() => {
    if (tier < 3 || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
        Animated.timing(breath, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [tier, reduceMotion]);

  if (!strength) return null;
  const gradient = `aura-${id}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          tier >= 3 && !reduceMotion && { opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) },
        ]}
      >
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id={gradient} cx="12%" cy="100%" rx="75%" ry="120%">
              <Stop offset="0" stopColor={color} stopOpacity={strength.glow} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradient})`} />
        </Svg>
      </Animated.View>
      {!reduceMotion && strength.embers.map((e, i) => <Ember key={i} {...e} color={color} />)}
    </View>
  );
}

interface EmberSpec {
  /** Horizontal start, % of the width. */
  left: number;
  size: number;
  delay: number;
  duration: number;
}

/** Glow opacity and embers per tier (index = tier). */
const AURA: ({ glow: number; embers: EmberSpec[] } | undefined)[] = [
  undefined,
  { glow: 0.2, embers: [] },
  {
    glow: 0.26,
    embers: [
      { left: 10, size: 3, delay: 0, duration: 5200 },
      { left: 24, size: 2, delay: 1800, duration: 6000 },
      { left: 40, size: 3, delay: 3400, duration: 5600 },
    ],
  },
  {
    glow: 0.34,
    embers: [
      { left: 6, size: 3, delay: 0, duration: 4600 },
      { left: 16, size: 2, delay: 1100, duration: 5200 },
      { left: 27, size: 4, delay: 2300, duration: 4800 },
      { left: 38, size: 2, delay: 600, duration: 5600 },
      { left: 50, size: 3, delay: 3000, duration: 5000 },
      { left: 64, size: 2, delay: 1700, duration: 6000 },
    ],
  },
];

/** A spark that drifts up from the bottom edge, sways a little and fades out. */
function Ember({ left, size, delay, duration, color }: EmberSpec & { color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const style = useMemo(
    () => ({
      left: `${left}%` as const,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity: t.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.7, 0.35, 0] }),
      transform: [
        { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -90] }) },
        { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 6, -2] }) },
      ],
    }),
    [color],
  );
  return <Animated.View style={[{ position: 'absolute', bottom: 4 }, style]} />;
}

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => sub?.remove();
  }, []);
  return reduce;
}
