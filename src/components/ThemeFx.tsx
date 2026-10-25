import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Path } from 'react-native-svg';
import { MASCOT_SIZE, mascotLeft, PLAIN_FX, type AmbientKind, type FinishKind, type MascotKind, type ThemeBarSpec, type ThemeFx } from '../themeFx';

// The moving parts of a theme: the XP bar with its mascot, the background
// layer and the way a ticked task leaves the list (see themeFx.ts).

/** The moving parts of the theme on screen, set in App. */
export const ThemeFxContext = createContext<ThemeFx>(PLAIN_FX);
export const useThemeFx = () => useContext(ThemeFxContext);

/** False while the app is in the background, so loops can rest. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s !== 'background'));
    return () => sub.remove();
  }, []);
  return active;
}

/** Whether idle loops and ambient layers may run: not with reduced motion, not in the background. */
function useLoopsOn(): boolean {
  const reduce = useReducedMotion();
  const active = useAppActive();
  return !reduce && active;
}

/** A value looping 0 → 1 → 0 (or 0 → 1 with `restart`), stopped while loops are off. */
function useLoop(duration: number, on: boolean, { delay = 0, restart = false, easing = Easing.inOut(Easing.sin) } = {}): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!on) {
      cancelAnimation(v);
      v.value = 0;
      return;
    }
    const run = restart
      ? withRepeat(withTiming(1, { duration, easing }), -1, false)
      : withRepeat(withSequence(withTiming(1, { duration: duration / 2, easing }), withTiming(0, { duration: duration / 2, easing })), -1, false);
    v.value = withDelay(delay, run);
    return () => cancelAnimation(v);
  }, [on, duration, delay]);
  return v;
}

// ---------- XP bar ----------

/**
 * The theme's XP bar: a lane above it for the mascot (nothing else goes
 * there, so it never covers the numbers below), the track, a faint "ghost"
 * of where the fill is heading, and the fill itself. The fill and the
 * mascot follow `live` on the animation thread.
 */
export function ThemeXpBar({ spec, mascot, scale = 1, live, ghost, progress }: { spec: ThemeBarSpec; mascot?: MascotKind; scale?: number; live: SharedValue<number>; ghost: number; progress: number }) {
  const [width, setWidth] = useState(0);
  const size = mascot ? MASCOT_SIZE[mascot] : undefined;
  const mw = size ? size.width * scale : 0;
  const mh = size ? size.height * scale : 0;
  const fillStyle = useAnimatedStyle(() => ({ width: Math.max(0, Math.min(1, live.value)) * width }));
  const mascotStyle = useAnimatedStyle(() => ({ left: mascotLeft(live.value, width, mw) }));
  const r = spec.height / 2;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.max(0, Math.min(1, progress)) * 100) }}>
      {size && (
        // The mascot rides on the bar: its lane ends where the bar starts.
        <View style={{ height: mh + 4 }} pointerEvents="none">
          {width > 0 && (
            <Animated.View style={[{ position: 'absolute', bottom: -Math.min(4, r), width: mw, height: mh }, mascotStyle]}>
              <Mascot kind={mascot!} scale={scale} live={live} />
            </Animated.View>
          )}
        </View>
      )}
      <View style={{ height: spec.height, borderRadius: r, backgroundColor: spec.track, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min(1, ghost)) * 100}%`, backgroundColor: spec.fillColor, opacity: 0.25, borderRadius: r }} />
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: r, backgroundColor: spec.fillColor, backgroundImage: spec.fill } as ViewStyle, fillStyle]} />
      </View>
    </View>
  );
}

// ---------- mascots ----------

function Mascot({ kind, scale, live }: { kind: MascotKind; scale: number; live: SharedValue<number> }) {
  switch (kind) {
    case 'rocket':
      return <Rocket scale={scale} live={live} />;
  }
}

/** Indigo: a small rocket that bobs on the bar; its flame grows as the level fills up. */
function Rocket({ scale, live }: { scale: number; live: SharedValue<number> }) {
  const on = useLoopsOn();
  const bob = useLoop(2200, on);
  const flick = useLoop(180, on, { easing: Easing.steps(2) });
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -2 * scale * bob.value }] }));
  const flameStyle = useAnimatedStyle(() => ({
    width: (6 + Math.max(0, Math.min(1, live.value)) * 34) * scale,
    transform: [{ scaleY: 1 - 0.25 * flick.value }, { scaleX: 1 - 0.08 * flick.value }],
  }));
  return (
    <Animated.View style={[{ width: 58 * scale, height: 30 * scale }, bodyStyle]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            right: 40 * scale,
            top: 9 * scale,
            height: 12 * scale,
            borderTopLeftRadius: 6 * scale,
            borderBottomLeftRadius: 6 * scale,
            backgroundColor: '#FF7A00',
            backgroundImage: 'linear-gradient(270deg, #ffffff 0%, #FFE29A 20%, #FF7A00 55%, rgba(255,74,28,0) 100%)',
            transformOrigin: 'right',
          } as ViewStyle,
          flameStyle,
        ]}
      />
      <Svg width={46 * scale} height={30 * scale} viewBox="0 0 46 30" style={{ position: 'absolute', right: 0, top: 0 }}>
        <Path d="M6 8h22c8 0 14 4 18 7-4 3-10 7-18 7H6z" fill="#eef1fa" />
        <Path d="M28 8c8 0 14 4 18 7-4 3-10 7-18 7z" fill="#FF3D9A" />
        <Circle cx={26} cy={15} r={3.6} fill="#7FD6FF" stroke="#13213a" strokeWidth={1.5} />
        <Path d="M8 8 2 1h9l6 7zM8 22l-6 7h9l6-7z" fill="#6A5BFF" />
      </Svg>
    </Animated.View>
  );
}

// ---------- ambient layers ----------

/** The theme's background layer, behind everything and never in the way of a tap. */
export function Ambient({ kind }: { kind: AmbientKind }) {
  const on = useLoopsOn();
  if (!on) return null;
  switch (kind) {
    case 'stars':
      return <Stars />;
  }
}

/** A steady pseudo-random number in [0, 1) for particle `i`, so layouts don't jump between renders. */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const STAR = 'M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z';

/** Indigo: small four-point stars twinkling across the screen. */
function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: seeded(i, 1),
        y: seeded(i, 2),
        size: 4 + Math.round(seeded(i, 3) * 5),
        duration: 2100 + Math.round(seeded(i, 4) * 2800),
        delay: Math.round(seeded(i, 5) * 3000),
      })),
    [],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((st, i) => (
        <Star key={i} {...st} />
      ))}
    </View>
  );
}

function Star({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  const t = useLoop(duration, true, { delay });
  const style = useAnimatedStyle(() => ({ opacity: 0.15 + 0.75 * t.value, transform: [{ scale: 1 + 0.2 * t.value }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={STAR} fill="#C6F4FF" />
      </Svg>
    </Animated.View>
  );
}

// ---------- task finish ----------

/**
 * Plays the theme's task-finish animation on a row while `leaving`, then
 * calls `onDone` so the list can drop it. Reduced motion: a plain fade.
 */
export function FinishFx({ kind, ms, leaving, onDone, children }: { kind: FinishKind; ms: number; leaving: boolean; onDone: () => void; children: ReactNode }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  const use = reduce ? 'fade' : kind;
  const duration = reduce ? 400 : ms;
  useEffect(() => {
    if (!leaving) {
      t.value = 0;
      return;
    }
    const easing = use === 'rocket' ? Easing.bezier(0.6, 0, 0.9, 0.4) : Easing.in(Easing.quad);
    t.value = withTiming(1, { duration, easing, reduceMotion: ReduceMotion.Never }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    });
  }, [leaving]);

  const rowStyle = useAnimatedStyle(() => {
    const v = t.value;
    if (use === 'rocket') {
      // A short shake, then off to the upper right.
      if (v < 0.28) {
        const x = v < 0.12 ? (-4 * v) / 0.12 : v < 0.2 ? -4 + (7 * (v - 0.12)) / 0.08 : 3 - (5 * (v - 0.2)) / 0.08;
        return { opacity: 1, transform: [{ translateX: x }, { translateY: 0 }, { rotate: '0deg' }] };
      }
      const p = (v - 0.28) / 0.72;
      return { opacity: 1 - 0.8 * p, transform: [{ translateX: -2 + 462 * p }, { translateY: -90 * p }, { rotate: `${-10 * p}deg` }] };
    }
    return { opacity: 1 - v, transform: [{ translateX: 0 }, { translateY: -8 * v }, { rotate: '0deg' }] };
  });

  // The rocket's exhaust trail, growing behind the row as it takes off.
  const trailStyle = useAnimatedStyle(() => ({ width: t.value < 0.25 ? 0 : ((t.value - 0.25) / 0.75) * 160 }));

  return (
    <Animated.View style={[leaving && { zIndex: 3 }, rowStyle]}>
      {children}
      {leaving && use === 'rocket' && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              right: '100%',
              top: '50%',
              height: 18,
              marginTop: -9,
              borderRadius: 9,
              backgroundColor: '#FF7A00',
              backgroundImage: 'linear-gradient(270deg, #ffffff, #FFE29A 15%, #FF7A00 45%, rgba(255,74,28,0))',
            } as ViewStyle,
            trailStyle,
          ]}
        />
      )}
    </Animated.View>
  );
}
