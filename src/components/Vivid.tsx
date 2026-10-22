import * as Haptics from 'expo-haptics';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, Switch, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';
import { GLYPHS, type GlyphName } from '../glyphs';
import { nativeDriver, useTheme } from '../theme';
import { BADGE_RED, GOLD, KEYLINE, levelBand, linear, MYTHIC, PRISM, RARITY, textGradient, textSolid, type Grad, type Rarity } from '../vivid';
import { useReduceMotion } from './FireAura';

// The vivid layer's building blocks (design thread, "vivid-app-wide-spec"):
// gradient fills, glossy stickers, gradient text, the gold button, badges,
// rings and the drifting colour blobs behind every screen.

/** The vivid font: Assistant, loaded on every theme under its own names (fonts.ts VIVID_FONTS). */
export const VIVID_BOLD = 'Vivid_700Bold';
export const VIVID_HEAVY = 'Vivid_800ExtraBold';

/** An id that is safe inside an SVG url(#…). */
export function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/** A straight gradient fill for a View (with a solid colour underneath, in case gradients aren't drawn). */
export function fill(colors: string[] | { c1: string; c2: string }, angle = 135): ViewStyle {
  const list = Array.isArray(colors) ? colors : [colors.c1, colors.c2];
  return { backgroundColor: list[Math.floor(list.length / 2)], backgroundImage: linear(list, angle) };
}

/** A sweep of colours round the centre. Browsers draw it as a cone; phones fall back to a straight gradient. */
export function conic(colors: string[]): ViewStyle {
  if (Platform.OS !== 'web') return fill(colors, 135);
  return { backgroundColor: colors[0], backgroundImage: `conic-gradient(from 0deg, ${[...colors, colors[0]].join(', ')})` };
}

/** The gold brand fill with its glow and top gloss: primary buttons, selected chips, the plus button. */
export const GOLD_FILL: ViewStyle = {
  ...fill(GOLD),
  boxShadow: '0px 8px 24px rgba(255,122,0,0.45), inset 0px 2px 0px rgba(255,255,255,0.5)',
};
/** A smaller glow for small gold things. */
export const GOLD_FILL_SMALL: ViewStyle = {
  ...fill(GOLD),
  boxShadow: '0px 3px 10px rgba(255,122,0,0.4), inset 0px 1.5px 0px rgba(255,255,255,0.5)',
};
export const GOLD_INK = GOLD.ink;

/** A filled glyph (Phosphor "fill"), in one colour or a top-to-bottom gradient. */
export function Glyph({ name, size, color = '#FFFFFF', grad, style }: { name: GlyphName; size: number; color?: string; grad?: { c1: string; c2: string }; style?: StyleProp<ViewStyle> }) {
  const id = useSvgId('glyph');
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" style={style} aria-hidden>
      {grad && (
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={grad.c1} />
            <Stop offset="1" stopColor={grad.c2} />
          </LinearGradient>
        </Defs>
      )}
      <Path d={GLYPHS[name]} fill={grad ? `url(#${id})` : color} />
    </Svg>
  );
}

/**
 * The rewards layer's sticker: a glossy gradient disc with a dark keyline, a
 * coloured glow and a filled glyph (or any children). `mythic` = the rainbow.
 */
export function Sticker({
  grad,
  mythic,
  glyph,
  size,
  dim,
  children,
  style,
}: {
  grad?: Grad;
  mythic?: boolean;
  glyph?: GlyphName;
  size: number;
  /** Faint and without glow: not won yet. */
  dim?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = grad ?? RARITY.mythic;
  const glow = mythic ? '#A45CFF' : colors.c2;
  const shadow = Math.round(size * 0.1);
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: size >= 28 ? 1.5 : 1,
          borderColor: KEYLINE,
          alignItems: 'center',
          justifyContent: 'center',
          ...(mythic ? conic(MYTHIC) : fill([colors.c1, colors.c2], 145)),
          boxShadow: dim
            ? 'inset 0px 2px 0px rgba(255,255,255,0.3)'
            : `0px ${shadow}px ${Math.round(size * 0.32)}px ${glow}80, inset 0px 2px 0px rgba(255,255,255,0.45), inset 0px -3px 0px rgba(0,0,0,0.18)`,
        },
        dim && { opacity: 0.38 },
        style,
      ]}
    >
      {glyph ? <Glyph name={glyph} size={Math.round(size * 0.46)} color={mythic ? '#FFFFFF' : colors.ink} /> : children}
    </View>
  );
}

const HEX = '50,3 95,28 95,82 50,107 5,82 5,28';

/** A hexagon in a rarity gradient with a keyline and glow: trophies and the level badge. */
export function HexSticker({ rarity, size, dim, children }: { rarity: Rarity; size: number; dim?: boolean; children?: ReactNode }) {
  const id = useSvgId('hex');
  const colors = RARITY[rarity];
  const stops = rarity === 'mythic' ? MYTHIC : [colors.c1, colors.c2];
  const h = size * 1.1;
  return (
    <View
      style={{
        width: size,
        height: h,
        alignItems: 'center',
        justifyContent: 'center',
        ...(!dim && { boxShadow: `0px ${Math.round(size / 12)}px ${Math.round(size / 3.5)}px ${rarity === 'mythic' ? '#A45CFF' : colors.c2}77`, borderRadius: size / 2 }),
      }}
    >
      <Svg width={size} height={h} viewBox="0 0 100 110" style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id={id} x1="0.15" y1="0" x2="0.85" y2="1">
            {stops.map((s, i) => (
              <Stop key={i} offset={i / (stops.length - 1)} stopColor={s} />
            ))}
          </LinearGradient>
        </Defs>
        <Polygon points={HEX} fill={`url(#${id})`} stroke={KEYLINE} strokeWidth={size >= 40 ? 3 : 4} strokeLinejoin="round" opacity={dim ? 0.38 : 1} />
        {/* top gloss */}
        <Path d="M12 32 L50 10 L88 32" fill="none" stroke="#FFFFFF" strokeOpacity={dim ? 0.15 : 0.45} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {children}
    </View>
  );
}

/** The level badge: a hex in the level band's colour with the number in heavy white (dark brown on legendary). */
export function LevelBadge({ level, size }: { level: number; size: number }) {
  const band = levelBand(level);
  const ink = band === 'legendary' ? RARITY.legendary.ink : '#FFFFFF';
  const digits = String(level).length;
  return (
    <HexSticker rarity={band} size={size}>
      <Text
        style={{
          fontFamily: VIVID_HEAVY,
          color: ink,
          fontSize: Math.round(size * (digits >= 3 ? 0.34 : 0.44)),
          lineHeight: Math.round(size * 0.52),
          includeFontPadding: false,
          fontVariant: ['lining-nums', 'tabular-nums'],
          textShadowColor: band === 'legendary' ? 'transparent' : 'rgba(0,0,0,0.3)',
          textShadowRadius: 3,
          textShadowOffset: { width: 0, height: 1 },
        }}
      >
        {level}
      </Text>
    </HexSticker>
  );
}

/**
 * Big numbers in gradient text. Browsers clip the gradient to the letters;
 * phones show a solid colour. Bright gold with a glow on dark themes, deep
 * orange on light ones so it stays readable.
 */
export function GradientText({ style, children, numberOfLines }: { style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number }) {
  const c = useTheme();
  const t = textGradient(c.dark);
  const web =
    Platform.OS === 'web'
      ? ({
          backgroundImage: `linear-gradient(180deg, ${t.c1}, ${t.c2})`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          // A text shadow would paint over the clipped gradient; a drop shadow sits behind it.
          ...(t.glow && { filter: `drop-shadow(0px 2px 8px ${t.glow})` }),
        } as unknown as TextStyle)
      : t.glow
        ? { textShadowColor: t.glow, textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } }
        : null;
  return (
    <Text style={[{ color: textSolid(c.dark) }, style, web]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/** A light tap on the phone. */
export function tapHaptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/**
 * The app's buttons. Primary: the gold gradient with dark ink, a glow and a
 * top gloss. Secondary: the theme's card with a thin Prism border. Both shrink
 * a little while pressed.
 */
export function VividButton({
  label,
  onPress,
  kind = 'primary',
  disabled,
  compact,
  style,
  icon,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
  /** 40 px tall with smaller text, for buttons inside cards. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  accessibilityLabel?: string;
}) {
  const c = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, speed: 40, bounciness: 4, useNativeDriver: nativeDriver }).start();
  const primary = kind === 'primary';
  const height = compact ? 40 : 54;
  const radius = compact ? 12 : 14;
  const text: TextStyle = {
    fontFamily: VIVID_HEAVY,
    fontSize: compact ? 14 : 17,
    color: primary ? GOLD_INK : c.text,
    textAlign: 'center',
  };
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {icon}
      <Text style={text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style, disabled && { opacity: 0.4 }]}>
      <Pressable
        onPress={() => {
          tapHaptic();
          onPress();
        }}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        accessibilityLabel={accessibilityLabel}
        style={
          primary
            ? { ...(compact ? GOLD_FILL_SMALL : GOLD_FILL), minHeight: height, borderRadius: radius, paddingHorizontal: compact ? 14 : 22, justifyContent: 'center' }
            : { ...fill(PRISM, 90), borderRadius: radius, padding: 1.5 }
        }
      >
        {primary ? (
          inner
        ) : (
          <View style={{ backgroundColor: c.surface, borderRadius: radius - 1.5, minHeight: height - 3, paddingHorizontal: compact ? 13 : 20, justifyContent: 'center' }}>{inner}</View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** A switch: gold track when on, the theme's line colour when off, white knob. */
export function VividSwitch({ value, onValueChange, accessibilityLabel }: { value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel?: string }) {
  const c = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: '#FF9A1F', false: c.border }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={c.border}
      // react-native-web paints the 'on' thumb teal unless told otherwise
      {...({ activeThumbColor: '#FFFFFF' } as object)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

/** A red counter (tickets, things to claim, tokens) that pops when the number changes. */
export function CountBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  const pop = useRef(new Animated.Value(1)).current;
  const reduce = useReduceMotion();
  const last = useRef(count);
  useEffect(() => {
    if (count === last.current) return;
    const grew = count > last.current;
    last.current = count;
    if (reduce || !grew) return;
    pop.setValue(1.45);
    Animated.spring(pop, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: nativeDriver }).start();
  }, [count, reduce]);
  if (count <= 0) return null;
  return (
    <Animated.View
      style={[
        {
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          paddingHorizontal: 4,
          backgroundColor: BADGE_RED,
          borderWidth: 1.5,
          borderColor: KEYLINE,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0px 2px 6px rgba(224,51,95,0.5)',
          transform: [{ scale: pop }],
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: VIVID_HEAVY, color: '#FFFFFF', fontSize: 10.5, lineHeight: 13, fontVariant: ['tabular-nums'] }}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  );
}

/** A progress ring in a rarity gradient (6 px, round end) with a glowing dot at the end. */
export function ProgressRing({ progress, size = 46, stroke = 6, grad, dim, children }: { progress: number; size?: number; stroke?: number; grad: { c1: string; c2: string }; dim?: boolean; children?: ReactNode }) {
  const c = useTheme();
  const id = useSvgId('ring');
  const p = Math.max(0, Math.min(1, progress || 0));
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const angle = p * Math.PI * 2 - Math.PI / 2;
  const dot = stroke + 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: dim ? 0.5 : 1 }}>
      <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={grad.c1} />
            <Stop offset="1" stopColor={grad.c2} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.border} strokeWidth={stroke} />
        {p > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${len * p} ${len}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      {p > 0 && p < 1 && (
        <View
          style={{
            position: 'absolute',
            left: size / 2 + r * Math.cos(angle) - dot / 2,
            top: size / 2 + r * Math.sin(angle) - dot / 2,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: '#FFFFFF',
            boxShadow: `0px 0px 6px ${grad.c2}`,
          }}
        />
      )}
      {children}
    </View>
  );
}

/** A section heading with a 28 px sticker in front. The title keeps the theme's own style. */
export function StickerHeading({ glyph, grad, mythic, children, right, style }: { glyph: GlyphName; grad?: Grad; mythic?: boolean; children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      <Sticker grad={grad} mythic={mythic} glyph={glyph} size={28} />
      <View style={{ flex: 1 }}>{children}</View>
      {right}
    </View>
  );
}

/**
 * Two big soft colour blobs behind every screen, violet at the top left and
 * orange at the bottom right, drifting slowly. Fainter on light themes.
 */
export function AmbientBlobs() {
  const c = useTheme();
  const reduce = useReduceMotion();
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 10000, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
        Animated.timing(drift, { toValue: 0, duration: 10000, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce]);
  const opacity = c.dark ? 0.14 : 0.08;
  const move = (dx: number, dy: number) => ({
    transform: [
      { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] }) },
      { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [-dy, dy] }) },
    ],
  });
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', left: -150, top: -150, opacity }, move(30, 20)]}>
        <Blob color="#A45CFF" id="blobViolet" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', right: -150, bottom: -60, opacity }, move(-25, -30)]}>
        <Blob color="#FF7A00" id="blobOrange" />
      </Animated.View>
    </View>
  );
}

/** A 360 px blob blurred by about 80 px, drawn as a soft radial gradient (blur filters don't work everywhere). */
function Blob({ color, id }: { color: string; id: string }) {
  const size = 520;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="0.45" stopColor={color} stopOpacity={0.85} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  angle: (i / 18) * Math.PI * 2 + (i % 2 ? 0.15 : -0.1),
  dist: 60 + ((i * 37) % 50),
  color: MYTHIC[i % MYTHIC.length],
  w: i % 3 ? 7 : 5,
  h: i % 3 ? 4 : 5,
  spin: (i % 2 ? 1 : -1) * (200 + i * 20),
}));

/** A one-off burst of mythic confetti out of the centre of its parent (empty states, level-ups). Plays once per `play` change. */
export function ConfettiBurst({ play = 0, scale = 1 }: { play?: number; scale?: number }) {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(true);
  useEffect(() => {
    if (reduce) return;
    setShown(true);
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start(({ finished }) => finished && setShown(false));
  }, [play, reduce]);
  if (reduce || !shown) return null;
  return (
    <View style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }} pointerEvents="none">
      {CONFETTI.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: p.w,
            height: p.h,
            borderRadius: 1,
            backgroundColor: p.color,
            opacity: t.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.dist * scale] }) },
              { translateY: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, Math.sin(p.angle) * p.dist * scale, Math.sin(p.angle) * p.dist * scale + 24 * scale] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/** A big sticker with a confetti burst and a heading with one gradient word: empty and "all done" states. */
export function EmptyState({ glyph, grad, mythic, before, word, after, body }: { glyph: GlyphName; grad?: Grad; mythic?: boolean; before?: string; word: string; after?: string; body?: string }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ConfettiBurst />
        <Sticker grad={grad} mythic={mythic} glyph={glyph} size={72} />
      </View>
      <Text style={{ fontFamily: VIVID_HEAVY, color: c.text, fontSize: 20, textAlign: 'center' }}>
        {before}
        <GradientText style={{ fontFamily: VIVID_HEAVY, fontSize: 20 }}>{word}</GradientText>
        {after}
      </Text>
      {body ? <Text style={{ color: c.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 320 }}>{body}</Text> : null}
    </View>
  );
}

/**
 * The XP bar: 10 px, the Prism gradient slowly flowing, a white light sweeping
 * across every 3.6 s and a glowing white dot at the tip. `ghost` = where the
 * bar is heading while it fills.
 */
export function PrismBar({ progress, ghost }: { progress: number; ghost: number }) {
  const c = useTheme();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const flow = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loops = [
      Animated.loop(Animated.timing(flow, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: nativeDriver })),
      Animated.loop(Animated.sequence([Animated.delay(1200), Animated.timing(sweep, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver })])),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduce]);
  const p = Math.max(0, Math.min(1, progress));
  const fillW = p * width;
  // Two copies of the gradient side by side, so sliding by one bar width loops seamlessly.
  const strip = [...PRISM, ...PRISM.slice(0, -1).reverse()];
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: 16, justifyContent: 'center' }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
    >
      <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surfaceAlt, overflow: 'hidden', borderWidth: c.dark ? 0 : 1, borderColor: c.border }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min(1, ghost)) * 100}%`, backgroundColor: '#A45CFF', opacity: 0.22, borderRadius: 5 }} />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fillW, borderRadius: 5, overflow: 'hidden' }}>
          {width > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: width * 2,
                ...fill(strip, 90),
                transform: [{ translateX: flow.interpolate({ inputRange: [0, 1], outputRange: [0, -width] }) }],
              }}
            />
          )}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 36,
              backgroundColor: '#FFFFFF',
              opacity: reduce ? 0 : 0.5,
              transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-40, Math.max(width, 80)] }) }, { skewX: '-20deg' }],
            }}
          />
        </View>
      </View>
      {width > 0 && p > 0 && (
        <View
          style={{
            position: 'absolute',
            left: Math.min(width - 14, Math.max(0, fillW - 7)),
            top: 1,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: '#FFFFFF',
            borderWidth: c.dark ? 0 : 1,
            borderColor: '#A45CFF',
            boxShadow: '0px 0px 10px #A45CFF',
          }}
        />
      )}
    </View>
  );
}
