import { createContext, useContext, useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import type { FlameStyleId } from '../cosmetics';
import { GLYPHS } from '../glyphs';
import { nativeDriver, useTheme, type Palette } from '../theme';
import { FLAMES, midColor, mixHex, STYLE_FLAMES, tierFlame, type Grad } from '../vivid';
import { useReduceMotion } from './FireAura';
import { useSvgId } from './Vivid';

/**
 * Text colour per streak tier: Spark (none yet), Flame, Blaze, Inferno, taken
 * from the vivid flames. The middle of the gradient on dark themes, its deep
 * end on light ones, so labels stay readable.
 */
export const FIRE_COLORS = {
  dark: ['', midColor(FLAMES.ember), midColor(FLAMES.blaze), midColor(FLAMES.inferno)],
  light: ['', FLAMES.ember.c2, FLAMES.blaze.c2, FLAMES.inferno.c2],
};

/** The tier's colour on this theme; Spark (tier 0) uses `none`, the muted text colour unless given. */
export function fireColor(tier: number, c: Palette, none: string = c.muted): string {
  return tier === 0 ? none : FIRE_COLORS[c.dark ? 'dark' : 'light'][tier];
}

/** The flame style the player has equipped, for every flame in the app. */
export const FlameStyleContext = createContext<FlameStyleId>('classic');

/** The gradient a flame is drawn in: the style's own colours, or the fire tier's. */
export function flameGrad(tier: number, style: FlameStyleId): Grad | undefined {
  if (tier <= 0) return undefined;
  return STYLE_FLAMES[style] ?? tierFlame(tier);
}

/**
 * The streak flame (rewards spec): a filled flame in a top-to-bottom gradient
 * with a white core, a soft glow and a gentle flicker. The fire tier picks
 * Ember, Blaze or Inferno; Toxic, Solar and Phantom bring their own colours;
 * Twin, Glow and Crackle add a second flame, a bigger glow or sparks.
 * No fire yet (tier 0) = a faint, unlit flame.
 */
export function Fire({
  tier,
  size,
  look,
  still,
}: {
  tier: number;
  size: number;
  /** Overrides the equipped style, for previews. */
  look?: FlameStyleId;
  /** No flicker and no glow, for the calm home screen. */
  still?: boolean;
}) {
  const c = useTheme();
  const equipped = useContext(FlameStyleContext);
  const style = look ?? equipped;
  const grad = flameGrad(tier, style);
  const reduce = useReduceMotion();
  const flicker = useRef(new Animated.Value(0)).current;
  const lit = !!grad;

  useEffect(() => {
    if (!lit || reduce || still || size < 16) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
        Animated.timing(flicker, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [lit, reduce, still, size]);

  if (!grad) {
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="-24 -24 304 304" aria-hidden>
          <Path d={GLYPHS.Flame} fill={c.faint} opacity={0.45} />
        </Svg>
      </View>
    );
  }

  const flame = <FlameShape grad={grad} size={size} glow={still ? 0 : style === 'glow' ? 0.75 : 0.45} />;
  const flick = {
    transform: [
      { translateY: flicker.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.05] }) },
      { scaleX: flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
      { scaleY: flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
    ],
  };
  return (
    <View style={{ width: size, height: size }}>
      {style === 'twin' && (
        <View style={{ position: 'absolute', left: -size * 0.26, top: size * 0.24, opacity: 0.8 }}>
          <FlameShape grad={grad} size={size * 0.72} glow={0.3} />
        </View>
      )}
      <Animated.View style={flick}>{flame}</Animated.View>
      {style === 'sparks' &&
        [
          [0.86, 0.1],
          [0.0, 0.28],
          [0.94, 0.52],
        ].map(([x, y], i) => {
          const spark = Math.max(3, Math.round(size / 9));
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: x * size,
                top: y * size,
                width: spark,
                height: spark,
                backgroundColor: grad.c1,
                ...(!still && { boxShadow: `0px 0px 6px ${grad.c2}` }),
                transform: [{ rotate: '45deg' }],
              }}
            />
          );
        })}
    </View>
  );
}

/** One flame: glow behind, white core showing through the inner flame, gradient body. */
function FlameShape({ grad, size, glow }: { grad: Grad; size: number; glow: number }) {
  const body = useSvgId('flame');
  const halo = useSvgId('flameGlow');
  return (
    <Svg width={size} height={size} viewBox="-24 -24 304 304" aria-hidden>
      <Defs>
        <LinearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={grad.c1} />
          <Stop offset="1" stopColor={grad.c2} />
        </LinearGradient>
        <RadialGradient id={halo} cx="50%" cy="58%" r="50%">
          <Stop offset="0" stopColor={grad.c2} stopOpacity={glow} />
          <Stop offset="1" stopColor={grad.c2} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {glow > 0 && <Circle cx={128} cy={150} r={150} fill={`url(#${halo})`} />}
      <Circle cx={128} cy={182} r={38} fill={mixHex(grad.c1, '#FFFFFF', 0.6)} />
      <Path d={GLYPHS.Flame} fill={`url(#${body})`} />
    </Svg>
  );
}
