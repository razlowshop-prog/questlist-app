import { useContext, useEffect, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { MascotKind } from '../../themeFx';
import { BizzyArt, BizzyFormContext } from '../Bizzy';
import { useLoop, useLoopsOn } from './hooks';

// The mascots riding on the XP bar, one per theme (themeFx.ts). Each is drawn
// at `scale` and gets the bar's fill (`live`, 0..1) to react to, and
// `gainKey`, which counts up each time XP is added.

export function Mascot({ kind, scale, live, gainKey }: { kind: MascotKind; scale: number; live: SharedValue<number>; gainKey: number }) {
  switch (kind) {
    case 'bee':
      return <Bee scale={scale} gainKey={gainKey} />;
    case 'rocket':
      return <Rocket scale={scale} live={live} />;
    case 'sprout':
      return <Sprout scale={scale} />;
    case 'boat':
      return <Boat scale={scale} />;
    case 'car':
      return <Car scale={scale} />;
    case 'pencil':
      return <Pencil scale={scale} gainKey={gainKey} />;
    case 'lifter':
      return <Lifter scale={scale} gainKey={gainKey} />;
    case 'sun':
      return <Sun scale={scale} />;
    case 'bolt':
      return <Bolt scale={scale} />;
    case 'climber':
      return <Climber scale={scale} />;
    case 'flame':
      return <Flame scale={scale} />;
    case 'moon':
      return <Moon scale={scale} />;
    case 'crown':
      return <Crown scale={scale} />;
    case 'highlighter':
      return <Highlighter scale={scale} gainKey={gainKey} />;
    case 'plane':
      return <Plane scale={scale} gainKey={gainKey} />;
    case 'sneaker':
      return <Sneaker scale={scale} gainKey={gainKey} />;
    case 'kettlebell':
      return <Kettlebell scale={scale} gainKey={gainKey} />;
  }
}

/** Counts up once each time XP comes in while it's on screen (not when the theme is switched to). */
function useGain(gainKey: number, run: () => void) {
  const reduce = useReducedMotion();
  const seen = useRef(gainKey);
  useEffect(() => {
    if (gainKey === seen.current || reduce) return;
    seen.current = gainKey;
    run();
  }, [gainKey]);
}

/** Notepad B (Bullet journal): a yellow highlighter leaning on the bar, colouring as it goes; it swipes twice when XP comes in. */
function Highlighter({ scale, gainKey }: { scale: number; gainKey: number }) {
  const on = useLoopsOn();
  const wig = useLoop(700, on);
  const swipe = useSharedValue(0);
  useGain(gainKey, () => {
    swipe.value = withSequence(withTiming(1, { duration: 120 }), withTiming(-1, { duration: 160 }), withTiming(1, { duration: 160 }), withTiming(0, { duration: 140 }));
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: 5 * swipe.value * scale }, { rotate: `${-4 * wig.value + 8 * swipe.value}deg` }] }));
  const size = 40 * scale;
  return (
    <Animated.View style={[{ width: size, height: size, transformOrigin: '22% 92%' } as ViewStyle, style]}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <G transform="rotate(-40 20 20)">
          <Rect x={15} y={0} width={10} height={9} rx={2} fill="#2b2b2b" />
          <Rect x={14} y={8} width={12} height={20} rx={2} fill="#ffd84d" stroke="#2b2b2b" strokeWidth={1.2} />
          <Rect x={16} y={11} width={3} height={14} rx={1.5} fill="#fff6c2" />
          <Path d="M15 28h10l-2 6h-6z" fill="#3a3a3a" />
          <Path d="M17 34h6l-1 4h-4z" fill="#ffd84d" />
        </G>
      </Svg>
    </Animated.View>
  );
}

/** Notepad C (Sticky notes): a folded paper plane gliding over the bar; it loops once when XP comes in. */
function Plane({ scale, gainKey }: { scale: number; gainKey: number }) {
  const on = useLoopsOn();
  const glide = useLoop(2400, on);
  const loop = useSharedValue(0);
  useGain(gainKey, () => {
    loop.value = 0;
    loop.value = withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) });
  });
  const style = useAnimatedStyle(() => {
    const a = loop.value * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.sin(a) * 10 * scale },
        { translateY: (-3 * glide.value - (1 - Math.cos(a)) * 9) * scale },
        { rotate: `${-6 * glide.value - loop.value * 360}deg` },
      ],
    };
  });
  const k = scale;
  return (
    <Animated.View style={[{ width: 40 * k, height: 26 * k }, style]}>
      <Svg width={40 * k} height={26 * k} viewBox="0 0 40 26">
        <Path d="M2 14 38 3 16 17z" fill="#ffffff" stroke="#3a2f1e" strokeWidth={1.2} strokeLinejoin="round" />
        <Path d="M16 17 38 3 20 24z" fill="#e9e1cf" stroke="#3a2f1e" strokeWidth={1.2} strokeLinejoin="round" />
        <Path d="M16 17 20 24 18 18z" fill="#cfc4ab" />
        <Path d="M7 13 30 6" stroke="#e2574c" strokeWidth={1} strokeDasharray="2 2" />
      </Svg>
    </Animated.View>
  );
}

/** Gym B (Club): a lime running shoe tapping along the bar; it sprints in place, leaving speed lines, when XP comes in. */
function Sneaker({ scale, gainKey }: { scale: number; gainKey: number }) {
  const on = useLoopsOn();
  const tap = useLoop(600, on);
  const dash = useSharedValue(0);
  useGain(gainKey, () => {
    dash.value = withSequence(withTiming(1, { duration: 150 }), withTiming(1, { duration: 500 }), withTiming(0, { duration: 250 }));
  });
  const shoe = useAnimatedStyle(() => ({ transform: [{ translateY: -2 * tap.value * scale - 3 * dash.value * scale }, { rotate: `${-8 * tap.value - 10 * dash.value}deg` }] }));
  const lines = useAnimatedStyle(() => ({ opacity: dash.value, transform: [{ translateX: -6 * dash.value * scale }] }));
  const k = scale;
  return (
    <View style={{ width: 42 * k, height: 26 * k }}>
      <Animated.View style={[{ position: 'absolute', left: -12 * k, top: 6 * k }, lines]}>
        <Svg width={14 * k} height={14 * k} viewBox="0 0 14 14">
          <Path d="M2 3h10M0 7h12M3 11h9" stroke="#c6ff3d" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ width: 42 * k, height: 26 * k, transformOrigin: '80% 90%' } as ViewStyle, shoe]}>
        <Svg width={42 * k} height={26 * k} viewBox="0 0 42 26">
          <Path d="M3 18c0-6 3-12 9-12 3 0 4 3 8 4l10 3c6 1 10 3 10 6v2H3z" fill="#c6ff3d" stroke="#0b0d0c" strokeWidth={1.4} strokeLinejoin="round" />
          <Path d="M3 19h37v4c0 1-1 2-2 2H5c-1 0-2-1-2-2z" fill="#f4f4f2" stroke="#0b0d0c" strokeWidth={1.4} />
          <Path d="M14 9l3 4M18 10l3 4M22 11l2 3" stroke="#0b0d0c" strokeWidth={1.4} strokeLinecap="round" />
          <Path d="M27 15c3 0 6 1 8 2" stroke="#0b0d0c" strokeWidth={1.2} fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Gym C (Stadium): a red kettlebell swinging gently on the bar; it swings up overhead and lands with a thud when XP comes in. */
function Kettlebell({ scale, gainKey }: { scale: number; gainKey: number }) {
  const on = useLoopsOn();
  const sway = useLoop(1800, on);
  const swing = useSharedValue(0);
  useGain(gainKey, () => {
    swing.value = withSequence(withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 200 }), withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }), withTiming(0.12, { duration: 80 }), withTiming(0, { duration: 80 }));
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -20 * swing.value * scale }, { rotate: `${6 * (sway.value - 0.5) + 360 * swing.value}deg` }] }));
  const k = scale;
  return (
    <Animated.View style={[{ width: 30 * k, height: 32 * k }, style]}>
      <Svg width={30 * k} height={32 * k} viewBox="0 0 30 32">
        <Path d="M9 13V9a6 6 0 0 1 12 0v4" fill="none" stroke="#1b2a44" strokeWidth={4} />
        <Path d="M9 13V9a6 6 0 0 1 12 0v4" fill="none" stroke="#e8edf6" strokeWidth={2} />
        <Circle cx={15} cy={21} r={10} fill="#ff3b3b" stroke="#1b2a44" strokeWidth={1.4} />
        <Path d="M9 18a7 7 0 0 1 5-4" stroke="#ffb3b3" strokeWidth={2} strokeLinecap="round" fill="none" />
        <Rect x={10} y={19} width={10} height={6} rx={1} fill="#1b2a44" />
        <Path d="M12.5 21.5h5" stroke="#ff3b3b" strokeWidth={1.4} />
      </Svg>
    </Animated.View>
  );
}

/** Honey: the player's own Bizzy flies along the bar, wings buzzing and bobbing, and cheers each time XP comes in. */
function Bee({ scale, gainKey }: { scale: number; gainKey: number }) {
  const form = useContext(BizzyFormContext);
  const on = useLoopsOn();
  const bob = useLoop(1600, on);
  const hop = useSharedValue(0);
  const first = useRef(gainKey);
  useEffect(() => {
    if (gainKey === first.current) return;
    hop.value = 0;
    hop.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
  }, [gainKey]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * scale * bob.value - 10 * scale * Math.sin(Math.PI * hop.value) }] }));
  return (
    <Animated.View style={[{ width: 34 * scale, height: 34 * scale }, style]}>
      <BizzyArt mood="happy" size={34 * scale} form={form} shadow={false} />
    </Animated.View>
  );
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

/** Forest: a two-leaf sprout at the tip of the vine, swaying in the wind. */
function Sprout({ scale }: { scale: number }) {
  const on = useLoopsOn();
  const sway = useLoop(2600, on);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${8 * sway.value}deg` }] }));
  const size = 26 * scale;
  return (
    <Animated.View style={[{ width: size, height: size, transformOrigin: 'bottom' } as ViewStyle, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 22V12" stroke="#2f5a3a" strokeWidth={2} strokeLinecap="round" />
        <Path d="M12 13C6 12 4 7 5 3c5 0 8 4 7 10z" fill="#6aa060" />
        <Path d="M12 15c5-1 8-4 8-9-5 0-8 3-8 9z" fill="#3f6b4a" />
      </Svg>
    </Animated.View>
  );
}

/** Ocean: a little sailboat rocking on the wave crest of the bar. */
function Boat({ scale }: { scale: number }) {
  const on = useLoopsOn();
  const rock = useLoop(2400, on);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-6 + 11 * rock.value}deg` }, { translateY: -2 * rock.value }] }));
  return (
    <View style={{ width: 34 * scale, height: 30 * scale }}>
      <Animated.View style={[{ width: 34 * scale, height: 30 * scale, transformOrigin: '50% 90%' } as ViewStyle, style]}>
        <Svg width={34 * scale} height={30 * scale} viewBox="0 0 34 30">
          <Path d="M16 2v18" stroke="#eaf7fb" strokeWidth={1.6} />
          <Path d="M17 3c6 3 9 9 9 14H17z" fill="#ffffff" />
          <Path d="M15 6c-4 3-7 7-7 11h7z" fill="#FFB547" />
          <Path d="M3 20h28l-5 7H8z" fill="#FF6B4A" />
          <Path d="M3 20h28" stroke="#04192a" strokeWidth={1} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Neon: a hovering car with a cyan glow underneath. */
function Car({ scale }: { scale: number }) {
  const on = useLoopsOn();
  const hover = useLoop(1600, on);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * scale * hover.value }] }));
  const w = 46 * scale;
  return (
    <Animated.View style={[{ width: w, height: 24 * scale }, style]}>
      <Svg width={w} height={10 * scale} viewBox="0 0 46 10" style={{ position: 'absolute', left: 0, bottom: -5 * scale }}>
        <Defs>
          <RadialGradient id="carGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#22e8ff" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#22e8ff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={23} cy={5} rx={19} ry={5} fill="url(#carGlow)" />
      </Svg>
      <Svg width={w} height={22 * scale} viewBox="0 0 46 22">
        <Path d="M4 13c2-6 8-9 16-9h6c6 0 12 3 16 9z" fill="#2a1250" stroke="#22e8ff" strokeWidth={1.4} />
        <Path d="M14 6h16l5 6H10z" fill="#22e8ff" opacity={0.55} />
        <Rect x={2} y={12} width={42} height={5} rx={2.5} fill="#ff2bd6" />
        <Circle cx={43} cy={14.5} r={1.8} fill="#fff" />
      </Svg>
    </Animated.View>
  );
}

/** Notepad: a pencil drawing the bar, wiggling as it writes; it scribbles fast when XP comes in. */
function Pencil({ scale, gainKey }: { scale: number; gainKey: number }) {
  const on = useLoopsOn();
  const wig = useLoop(500, on);
  const scribble = useSharedValue(0);
  useGain(gainKey, () => {
    scribble.value = withSequence(...[1, -1, 1, -1, 1, 0].map((v) => withTiming(v, { duration: 70 })));
  });
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-6 * wig.value + 10 * scribble.value}deg` }, { translateY: -wig.value * scale - 2 * Math.abs(scribble.value) * scale }] }));
  const size = 40 * scale;
  return (
    <Animated.View style={[{ width: size, height: size, transformOrigin: '20% 95%' } as ViewStyle, style]}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <G transform="rotate(-38 20 20)">
          <Rect x={17} y={2} width={7} height={26} fill="#f6c343" stroke="#7a5a10" strokeWidth={1} />
          <Rect x={17} y={2} width={7} height={5} fill="#e48aa0" />
          <Rect x={17} y={7} width={7} height={2} fill="#bfc6cf" />
          <Path d="M17 28h7l-3.5 9z" fill="#f2d7a8" stroke="#7a5a10" strokeWidth={1} />
          <Path d="M19.5 34.5h2l-1 2.5z" fill="#26324a" />
        </G>
      </Svg>
    </Animated.View>
  );
}

/** How long the lifter's pick-up, carry and set-down takes; the bar moves during it (themeFx gym `motion`). */
const LIFT_MS = 1700;

/**
 * Gym: a figure standing behind a barbell that lies on the bar. No idle
 * movement: each time XP is added it squats, lifts the barbell overhead,
 * carries it while the bar moves on, sets it down and stands up. More XP
 * mid-lift starts the lift again from where it is.
 */
function Lifter({ scale, gainKey }: { scale: number; gainKey: number }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(1);
  // Only XP added while it's on screen makes it lift, not switching to the theme.
  const seen = useRef(gainKey);
  useEffect(() => {
    if (gainKey === seen.current || reduce) return;
    seen.current = gainKey;
    t.value = 0;
    t.value = withTiming(1, { duration: LIFT_MS, easing: Easing.linear });
  }, [gainKey]);
  // The board's keyframes, each step eased in and out.
  const ease = (v: number) => {
    'worklet';
    return v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v);
  };
  const frame = (v: number, at: number[], values: number[]) => {
    'worklet';
    for (let i = 1; i < at.length; i++) {
      if (v <= at[i]) return values[i - 1] + (values[i] - values[i - 1]) * ease((v - at[i - 1]) / (at[i] - at[i - 1]));
    }
    return values[values.length - 1];
  };
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: frame(t.value, [0, 0.12, 0.2, 0.3, 0.78, 0.88, 0.94, 1], [0, 4, 4, 0, 0, 4, 4, 0]) * scale }] }));
  // Arms hang from the shoulders (y 15 of 44) and swing up overhead when flipped.
  const arms = useAnimatedStyle(() => ({ transform: [{ scaleY: frame(t.value, [0, 0.12, 0.2, 0.3, 0.78, 0.9, 1], [1, 1.05, 1.05, -0.3, -0.3, 1.05, 1]) }] }));
  const bar = useAnimatedStyle(() => ({ transform: [{ translateY: frame(t.value, [0, 0.12, 0.2, 0.3, 0.78, 0.9, 1], [0, 0, -2, -34, -34, 0, 0]) * scale }] }));
  const k = scale;
  const limb = { position: 'absolute', width: 3 * k, height: 26 * k, top: 15 * k, borderRadius: 1.5 * k, backgroundColor: '#f4f4f2' } as const;
  return (
    <View style={{ width: 40 * k, height: 44 * k }}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 40 * k, height: 44 * k }, body]}>
        <Svg width={40 * k} height={44 * k} viewBox="0 0 40 44">
          <Circle cx={20} cy={8} r={4.5} fill="#f4f4f2" />
          <Path d="M20 13v14M20 27l-6 13M20 27l6 13" stroke="#f4f4f2" strokeWidth={3} strokeLinecap="round" />
        </Svg>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 40 * k, height: 44 * k, transformOrigin: `${20 * k}px ${15 * k}px` } as ViewStyle, arms]}>
          <View style={[limb, { left: 11.5 * k }]} />
          <View style={[limb, { left: 25.5 * k }]} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 40 * k, height: 44 * k }, bar]}>
        <Svg width={40 * k} height={46 * k} viewBox="0 0 40 46" style={{ overflow: 'visible' }}>
          <Rect x={3} y={39.6} width={34} height={2.4} rx={1.2} fill="#c9ccd2" />
          <Rect x={0} y={35.5} width={5} height={10.5} rx={1.2} fill="#FF5A1F" />
          <Rect x={35} y={35.5} width={5} height={10.5} rx={1.2} fill="#FF5A1F" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Sunset: a glowing sun rising along the bar, its halo breathing. */
function Sun({ scale }: { scale: number }) {
  const on = useLoopsOn();
  const glow = useLoop(3000, on);
  const size = 30 * scale;
  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * glow.value, transform: [{ scale: 1 + 0.25 * glow.value }] }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ position: 'absolute', left: -size * 0.3, top: -size * 0.3, width: size * 1.6, height: size * 1.6 }, haloStyle]}>
        <Svg width={size * 1.6} height={size * 1.6} viewBox="0 0 48 48">
          <Defs>
            <RadialGradient id="sunHalo" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0.45" stopColor="#ffa050" stopOpacity={0.75} />
              <Stop offset="1" stopColor="#ffa050" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={24} cy={24} r={24} fill="url(#sunHalo)" />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox="0 0 30 30">
        <Defs>
          <RadialGradient id="sunDisc" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0.3" stopColor="#fff3c4" />
            <Stop offset="0.6" stopColor="#ffb347" />
            <Stop offset="1" stopColor="#f06a3c" />
          </RadialGradient>
        </Defs>
        <Circle cx={15} cy={15} r={15} fill="url(#sunDisc)" />
      </Svg>
    </View>
  );
}

/** Thunder: a little lightning bolt crackling on the bar. */
function Bolt({ scale }: { scale: number }) {
  const on = useLoopsOn();
  const zap = useLoop(600, on, { restart: true, easing: Easing.linear });
  // Two hard steps, small and big, like the board's steps(2).
  const style = useAnimatedStyle(() => ({ transform: [{ scale: zap.value < 0.5 ? 1 : 1.15 }] }));
  return (
    <Animated.View style={[{ width: 18 * scale, height: 26 * scale }, style]}>
      <Svg width={18 * scale} height={26 * scale} viewBox="0 0 18 26">
        <Path d="M11 0 1 15h7l-3 11 12-16h-7l3-10z" fill="#fff6b0" stroke="#15161c" strokeWidth={1.2} />
      </Svg>
    </Animated.View>
  );
}

/** Summit: the climber's flag planted at the tip, swaying in the wind. */
function Climber({ scale }: { scale: number }) {
  const on = useLoopsOn();
  const sway = useLoop(1800, on);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-5 * sway.value}deg` }] }));
  return (
    <Animated.View style={[{ width: 22 * scale, height: 30 * scale, transformOrigin: `${5 * scale}px ${30 * scale}px` } as ViewStyle, style]}>
      <Svg width={22 * scale} height={30 * scale} viewBox="0 0 22 30">
        <Path d="M5 30V2" stroke="#334250" strokeWidth={2} />
        <Path d="M6 3h13l-4 5 4 5H6z" fill="#e0603c" />
      </Svg>
    </Animated.View>
  );
}

/** Ember: a small flame flickering at the tip of the glowing bar. */
function Flame({ scale }: { scale: number }) {
  const on = useLoopsOn();
  const flick = useLoop(1200, on);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + 0.08 * flick.value }, { scaleY: 1 + 0.14 * flick.value }] }));
  return (
    <Animated.View style={[{ width: 20 * scale, height: 28 * scale, transformOrigin: 'bottom' } as ViewStyle, style]}>
      <Svg width={20 * scale} height={28 * scale} viewBox="0 0 24 32">
        <Defs>
          <LinearGradient id="emberFlame" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE29A" />
            <Stop offset="1" stopColor="#FF4A1C" />
          </LinearGradient>
        </Defs>
        <Path d="M12 1c2 5 8 8 8 16a8 8 0 0 1-16 0c0-3 1.5-5.5 3.5-7 .3 2.6 1.6 4.3 3.6 4.9C10.5 10.5 10.5 6 12 1z" fill="url(#emberFlame)" />
      </Svg>
    </Animated.View>
  );
}

/** Midnight: a crescent moon travelling over the bar, rocking gently. */
function Moon({ scale }: { scale: number }) {
  const on = useLoopsOn();
  const rock = useLoop(4000, on);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-12 * rock.value}deg` }] }));
  return (
    <Animated.View style={[{ width: 24 * scale, height: 24 * scale }, style]}>
      <Svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24">
        <Path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" fill="#fff6d8" stroke="#12141c" strokeWidth={1} />
      </Svg>
    </Animated.View>
  );
}

/** Gold: a small gold crown with a white jewel, bobbing and tilting gently in its own glow. */
function Crown({ scale }: { scale: number }) {
  const on = useLoopsOn();
  const bob = useLoop(3000, on);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -2 * scale * bob.value }, { rotate: `${-4 * bob.value}deg` }] }));
  return (
    <Animated.View style={[{ width: 30 * scale, height: 24 * scale, filter: 'drop-shadow(0px 0px 6px rgba(232,198,108,0.6))' } as ViewStyle, style]}>
      <Svg width={30 * scale} height={24 * scale} viewBox="0 0 30 24">
        <Defs>
          <LinearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fff3c4" />
            <Stop offset="0.5" stopColor="#e8c66c" />
            <Stop offset="1" stopColor="#9a6b1c" />
          </LinearGradient>
        </Defs>
        <Path d="M3 20 1 6l7 6 7-10 7 10 7-6-2 14z" fill="url(#crownGold)" stroke="#5a3d0c" strokeWidth={0.8} />
        <Rect x={3} y={19} width={24} height={4} rx={1} fill="url(#crownGold)" stroke="#5a3d0c" strokeWidth={0.8} />
        <Circle cx={15} cy={12} r={1.8} fill="#ffffff" />
      </Svg>
    </Animated.View>
  );
}
