import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MascotKind } from '../../themeFx';
import { useLoop, useLoopsOn } from './hooks';

// The mascots riding on the XP bar, one per theme (themeFx.ts). Each is drawn
// at `scale` and gets the bar's fill (`live`, 0..1) to react to.

export function Mascot({ kind, scale, live }: { kind: MascotKind; scale: number; live: SharedValue<number> }) {
  switch (kind) {
    case 'rocket':
      return <Rocket scale={scale} live={live} />;
    case 'sprout':
      return <Sprout scale={scale} />;
    case 'boat':
      return <Boat scale={scale} />;
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
