import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { bizzySvg, type BizzyMood } from '../bizzy';
import { nativeDriver, useTheme } from '../theme';
import { useReduceMotion } from './FireAura';

/** Bizzy, gently bobbing (still when the phone asks for less motion). Decorative: screen readers skip it. */
export function Bizzy({ mood = 'happy', size = 72, style }: { mood?: BizzyMood; size?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const bob = useRef(new Animated.Value(0)).current;
  const xml = useMemo(() => bizzySvg(mood), [mood]);
  useEffect(() => {
    if (reduce) return;
    const half = (toValue: number) => Animated.timing(bob, { toValue, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver });
    const loop = Animated.loop(Animated.sequence([half(1), half(0)]));
    loop.start();
    return () => loop.stop();
  }, [reduce]);
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.04] });
  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ translateY }] }, style]} aria-hidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width={size} height={size} />
    </Animated.View>
  );
}

/** Bizzy with a speech bubble to its right. */
export function BizzySays({ mood, text, size = 64 }: { mood: BizzyMood; text: string; size?: number }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
      <Bizzy mood={mood} size={size} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {/* The bubble's tail: a small square turned 45°, half hidden behind the bubble. */}
        <View style={{ width: 10, height: 10, backgroundColor: c.surface, transform: [{ rotate: '45deg' }], marginRight: -6, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: c.border }} />
        <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: Math.max(12, c.radius), borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{text}</Text>
        </View>
      </View>
    </View>
  );
}
