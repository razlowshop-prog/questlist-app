import { useContext, useEffect, useMemo, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { SvgXml, Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { MascotKind } from '../../themeFx';
import { bizzySvg } from '../../bizzy';
import { BizzyFormContext } from '../Bizzy';
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
      return <Pencil scale={scale} />;
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
  }
}

/** Honey: the player's own Bizzy flies along the bar, bobbing, and cheers each time XP comes in. */
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
  const happy = useMemo(() => bizzySvg('happy', false, { form }), [form]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * scale * bob.value - 10 * scale * Math.sin(Math.PI * hop.value) }] }));
  return (
    <Animated.View style={[{ width: 34 * scale, height: 34 * scale }, style]}>
      <SvgXml xml={happy} width={34 * scale} height={34 * scale} />
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

/** Notepad: a pencil drawing the bar, wiggling as it writes. */
function Pencil({ scale }: { scale: number }) {
  const on = useLoopsOn();
  const wig = useLoop(500, on);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-6 * wig.value}deg` }, { translateY: -wig.value * scale }] }));
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
