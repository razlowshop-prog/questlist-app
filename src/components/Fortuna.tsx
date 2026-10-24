import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Reanimated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useReduceMotion } from './FireAura';
import { useLiveProgress } from './Vivid';

// The Fortuna theme's own pieces (design thread, "Fortuna theme and wheel
// spec"): a four-point star, the gold coin check, the shimmering XP bar,
// holo card borders, rising gold dust and a coin shower.

export const GOLD = { light: '#FFF1B8', mid: '#F2C55C', deep: '#C98A1E', bright: '#FFE08A', ink: '#2a1600' };
export const HOLO = ['#f2c55c', '#b98cff', '#6fe3ff', '#ff9ad5', '#f2c55c'];
const KEYLINE = '#0e0b12';

/** The four-point star, drawn in a 24-unit box. */
export const STAR4 = 'M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5z';

export function Star4({ size, color, style }: { size: number; color: string; style?: ViewStyle }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <Path d={STAR4} fill={color} />
    </Svg>
  );
}

/** Loops a value 0 -> 1 forever (unless motion is reduced). */
function useLoop(duration: number, easing = Easing.linear, delay = 0): Animated.Value {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: false })]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce]);
  return v;
}

/** The task check: an outlined slot with a faint star, or a gold coin once done. */
export function CoinCheck({ done, size = 30 }: { done: boolean; size?: number }) {
  const r = size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: r, ...(done && { boxShadow: `0px 0px 10px ${GOLD.mid}99` }) }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="coin" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={GOLD.light} />
            <Stop offset="0.45" stopColor={GOLD.mid} />
            <Stop offset="0.75" stopColor={GOLD.deep} />
            <Stop offset="1" stopColor={GOLD.bright} />
          </LinearGradient>
        </Defs>
        {done ? (
          <>
            <Circle cx={r} cy={r} r={r - 0.75} fill="url(#coin)" stroke={KEYLINE} strokeWidth={1.5} />
            <Circle cx={r} cy={r} r={r - 4} fill="none" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={1.5} />
          </>
        ) : (
          <Circle cx={r} cy={r} r={r - 0.75} fill="none" stroke="#7a66a2" strokeWidth={1.5} />
        )}
      </Svg>
      <Star4 size={size * 0.42} color={done ? GOLD.ink : '#3d2d5c'} style={{ position: 'absolute', left: size * 0.29, top: size * 0.29 }} />
    </View>
  );
}

/** The XP bar: gold gradient fill, a light sweeping across every 3.6 s, and a twinkling star at the tip. */
export function ShimmerBar({
  progress,
  live,
  ghost,
  glow,
  glowFrom = GOLD.mid,
  glowTo = '#FFFFFF',
}: {
  progress: number;
  /** Moves the fill on the animation thread instead of `progress`. */
  live?: SharedValue<number>;
  ghost: number;
  /** 0–1: tints the fill from `glowFrom` towards `glowTo` while XP comes in. */
  glow?: SharedValue<number>;
  glowFrom?: string;
  glowTo?: string;
}) {
  const [width, setWidth] = useState(0);
  const sweep = useLoop(3600, Easing.inOut(Easing.quad));
  const twinkle = useLoop(2200, Easing.inOut(Easing.sin));
  const fraction = useLiveProgress(progress, live);
  const fillStyle = useAnimatedStyle(() => ({ width: Math.max(0, Math.min(1, fraction.value)) * width }));
  const starStyle = useAnimatedStyle(() => ({ left: Math.max(0, Math.min(1, fraction.value)) * width - 9 }));
  const glowStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(glow?.value ?? 0, [0, 1], [glowFrom, glowTo]) }));
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height: 18, justifyContent: 'center' }} accessibilityRole="progressbar">
      <View style={{ height: 6, borderRadius: 3, backgroundColor: '#2a1d40', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${ghost * 100}%`, backgroundColor: GOLD.mid, opacity: 0.25 }} />
        <Reanimated.View style={[{ height: 6, overflow: 'hidden', borderRadius: 3 }, fillStyle]}>
          <Svg width="100%" height={6}>
            <Defs>
              <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={GOLD.deep} />
                <Stop offset="0.6" stopColor={GOLD.mid} />
                <Stop offset="1" stopColor={GOLD.light} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height={6} fill="url(#shimmer)" />
          </Svg>
          {glow && <Reanimated.View style={[StyleSheet.absoluteFill, { opacity: 0.25 }, glowStyle]} />}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 40,
              backgroundColor: '#FFFFFF',
              opacity: 0.55,
              transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-40, Math.max(width, 80)] }) }, { skewX: '-20deg' }],
            }}
          />
        </Reanimated.View>
      </View>
      {width > 0 && (
        <Reanimated.View style={[{ position: 'absolute', top: 0 }, starStyle]}>
          <Animated.View
            style={{
              boxShadow: `0px 0px 8px ${GOLD.bright}`,
              borderRadius: 9,
              transform: [
                { scale: twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.15, 0.7] }) },
                { rotate: twinkle.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) },
              ],
            }}
          >
            <Star4 size={18} color={GOLD.light} />
          </Animated.View>
        </Reanimated.View>
      )}
    </View>
  );
}

/**
 * A 1px border in drifting rainbow-gold around a card (`radius` = the card's
 * corner radius). Only the border is clipped, so bursts and "+XP" figures
 * can still fly out of the card.
 */
export function HoloBorder({
  radius,
  children,
  style,
  colors = HOLO,
}: {
  radius: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  colors?: string[];
}) {
  const drift = useLoop(8000);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const id = useMemo(() => `holo-${Math.random().toString(36).slice(2, 8)}`, []);
  // The gradient repeats once, so sliding it by one card width loops seamlessly.
  const stops = [...colors, ...colors.slice(1)];
  return (
    <View style={[{ borderRadius: radius + 1, padding: 1 }, style]} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius + 1, overflow: 'hidden' }]}>
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: size.w * 2,
              height: size.h,
              transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -size.w] }) }],
            }}
          >
            <Svg width={size.w * 2} height={size.h}>
              <Defs>
                <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0.3">
                  {stops.map((col, i) => (
                    <Stop key={i} offset={i / (stops.length - 1)} stopColor={col} />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect width={size.w * 2} height={size.h} fill={`url(#${id})`} />
            </Svg>
          </Animated.View>
        </View>
      )}
      {children}
    </View>
  );
}

/** A star and a gold-to-violet line, for the wordmark and eyebrows (`end` = which side the star sits on). */
export function StarRule({ end, style }: { end: 'left' | 'right'; style?: StyleProp<ViewStyle> }) {
  const id = `starRule-${end}`;
  const line = (
    <View style={{ flex: 1, height: 1.5 }}>
      <Svg width="100%" height={1.5} preserveAspectRatio="none" viewBox="0 0 100 1.5">
        <Defs>
          <LinearGradient id={id} x1={end === 'left' ? '0' : '1'} y1="0" x2={end === 'left' ? '1' : '0'} y2="0">
            <Stop offset="0" stopColor={GOLD.mid} />
            <Stop offset="1" stopColor="#b98cff" stopOpacity={0.2} />
          </LinearGradient>
        </Defs>
        <Rect width={100} height={1.5} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
  const star = <Star4 size={10} color={GOLD.mid} />;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5 }, style]} aria-hidden>
      {end === 'left' ? (
        <>
          {star}
          {line}
        </>
      ) : (
        <>
          {line}
          {star}
        </>
      )}
    </View>
  );
}

/**
 * Text in the Fortuna gold gradient. Browsers clip a gradient to the letters;
 * on phones it is solid gold with a soft glow.
 */
export function GoldText({ style, children }: { style?: StyleProp<TextStyle>; children: ReactNode }) {
  const web =
    Platform.OS === 'web'
      ? ({
          backgroundImage: `linear-gradient(180deg, ${GOLD.light}, ${GOLD.mid} 55%, ${GOLD.deep})`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        } as unknown as TextStyle)
      : null;
  return <Text style={[{ color: GOLD.mid, textShadowColor: 'rgba(242,197,92,0.35)', textShadowRadius: 12 }, style, web]}>{children}</Text>;
}

/** The gold ticket stub: notched sides, a perforation and a star on the stub end. */
export function TicketStub({ width = 86, height = 50, dim = false }: { width?: number; height?: number; dim?: boolean }) {
  const notch = 6;
  const stub = width * 0.72;
  const d = `M4 0H${width - 4}a4 4 0 0 1 4 4V${height / 2 - notch}a${notch} ${notch} 0 0 0 0 ${notch * 2}V${height - 4}a4 4 0 0 1 -4 4H4a4 4 0 0 1 -4 -4V${height / 2 + notch}a${notch} ${notch} 0 0 0 0 ${-notch * 2}V4a4 4 0 0 1 4 -4Z`;
  return (
    <View style={{ width, height, opacity: dim ? 0.45 : 1, ...(!dim && { boxShadow: `0px 4px 16px ${GOLD.mid}55` }) }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="ticketStub" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={GOLD.light} />
            <Stop offset="0.5" stopColor={GOLD.mid} />
            <Stop offset="1" stopColor={GOLD.deep} />
          </LinearGradient>
        </Defs>
        <Path d={d} fill="url(#ticketStub)" stroke={KEYLINE} strokeWidth={1.5} />
        <Path d={`M${stub} 5V${height - 5}`} stroke={GOLD.ink} strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="3 3" />
        <Path d={`M3 3H${width - 3}`} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
      <Text
        style={{ position: 'absolute', left: 0, width: stub, top: 0, bottom: 0, textAlign: 'center', textAlignVertical: 'center', lineHeight: height, fontFamily: 'Cinzel_800ExtraBold', fontSize: 10.5, letterSpacing: 0.5, color: GOLD.ink }}
      >
        TICKET
      </Text>
      <Star4 size={12} color={GOLD.ink} style={{ position: 'absolute', left: stub + (width - stub) / 2 - 6, top: height / 2 - 6 }} />
    </View>
  );
}

/** Behind everything on Fortuna: a violet glow at the top and gold dust rising up the screen. */
export function GoldDust() {
  const reduce = useReduceMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const motes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: ((i * 37) % 100) / 100,
        size: 2 + (i % 3),
        duration: 14000 + ((i * 5300) % 12000),
        delay: (i * 1700) % 14000,
      })),
    [],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 && (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="fortunaGlow" cx="50%" cy="0%" rx="60%" ry="27%" fx="50%" fy="0%">
              <Stop offset="0" stopColor="#3a1d5c" />
              <Stop offset="1" stopColor="#120a1f" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={size.w} height={size.h} fill="url(#fortunaGlow)" />
        </Svg>
      )}
      {!reduce && size.h > 0 && motes.map((m, i) => <Mote key={i} {...m} w={size.w} h={size.h} />)}
    </View>
  );
}

function Mote({ x, size, duration, delay, w, h }: { x: number; size: number; duration: number; delay: number; w: number; h: number }) {
  const v = useLoop(duration, Easing.linear, delay);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x * w,
        top: 0,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: GOLD.mid,
        opacity: v.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 0.6, 0.6, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [h, -10] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 12, -6] }) },
        ],
      }}
    />
  );
}

/** About 24 gold coins falling across the screen once (level-ups and the jackpot on Fortuna). */
export function CoinShower({ count = 24 }: { count?: number }) {
  const reduce = useReduceMotion();
  const fall = useRef(new Animated.Value(0)).current;
  const [h, setH] = useState(0);
  useEffect(() => {
    if (reduce || !h) return;
    Animated.timing(fall, { toValue: 1, duration: 2600, easing: Easing.in(Easing.quad), useNativeDriver: false }).start();
  }, [h, reduce]);
  const coins = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ x: ((i * 41) % 100) / 100, start: -40 - ((i * 53) % 220), spin: (i % 2 ? 1 : -1) * (360 + i * 30), size: 14 + (i % 3) * 4 })),
    [count],
  );
  if (reduce) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {h > 0 &&
        coins.map((coin, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: `${coin.x * 100}%`,
              top: 0,
              transform: [
                { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [coin.start, h + 40] }) },
                { rotateY: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${coin.spin}deg`] }) },
              ],
            }}
          >
            <CoinCheck done size={coin.size} />
          </Animated.View>
        ))}
    </View>
  );
}
