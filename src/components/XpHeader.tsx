import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { levelInfo } from '../game';
import { nativeDriver, useStyles, useTheme, type Palette } from '../theme';

/**
 * Always-visible bar at the top: level, rank, streak and an XP bar that
 * fills up smoothly when XP is gained. On a level-up it fills to the end,
 * flashes, then continues from zero on the new level.
 */
export function XpHeader({ totalXp, streak, bonus }: { totalXp: number; streak: number; bonus: number }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const info = levelInfo(totalXp);
  const fill = useRef(new Animated.Value(info.progress)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;
  const prev = useRef({ xp: totalXp, level: info.level });
  // The level shown lags behind during the level-up animation.
  const [shownLevel, setShownLevel] = useState(info.level);

  useEffect(() => {
    const before = prev.current;
    prev.current = { xp: totalXp, level: info.level };
    if (totalXp === before.xp) return;

    const pulse = Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]);

    if (info.level > before.level) {
      Animated.sequence([
        Animated.timing(fill, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        pulse,
      ]).start(() => {
        setShownLevel(info.level);
        fill.setValue(0);
        Animated.parallel([
          Animated.timing(fill, { toValue: info.progress, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
          Animated.sequence([
            Animated.spring(badgeScale, { toValue: 1.3, useNativeDriver: nativeDriver, speed: 30 }),
            Animated.spring(badgeScale, { toValue: 1, useNativeDriver: nativeDriver, friction: 4 }),
          ]),
        ]).start();
      });
    } else {
      setShownLevel(info.level);
      Animated.parallel([
        Animated.timing(fill, { toValue: info.progress, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        totalXp > before.xp ? pulse : Animated.delay(0),
      ]).start();
    }
  }, [totalXp]);

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: [c.xp, c.gold] });

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <Animated.View style={[s.badge, { transform: [{ scale: badgeScale }] }]}>
          <Text style={s.badgeText}>{shownLevel}</Text>
        </Animated.View>
        <View style={{ flex: 1 }}>
          <View style={s.labels}>
            <Text style={s.rank}>{info.rank}</Text>
            <Text style={s.xpText}>
              {info.maxed ? 'MAX LEVEL' : `${info.xpIntoLevel} / ${info.xpForLevel} XP`}
            </Text>
          </View>
          <View style={s.track}>
            <Animated.View style={[s.fill, { width, backgroundColor: glowColor }]} />
          </View>
        </View>
        <View style={s.streak}>
          <Text style={s.streakText}>🔥 {streak}</Text>
          {bonus > 0 && <Text style={s.bonus}>+{Math.round(bonus * 100)}%</Text>}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) => ({
  wrap: {
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...(c.shadow ? { boxShadow: '0px 1px 0px rgba(20,22,43,0.06)' } : { borderBottomWidth: 1, borderBottomColor: c.border }),
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    maxWidth: 640,
    width: '100%' as const,
    alignSelf: 'center' as const,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  badgeText: { color: c.onAccent, fontSize: 17, fontWeight: '800' as const },
  labels: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 6 },
  rank: { color: c.text, fontSize: 14, fontWeight: '700' as const },
  xpText: { color: c.muted, fontSize: 12, fontWeight: '600' as const },
  track: { height: 8, backgroundColor: c.surfaceAlt, borderRadius: 4, overflow: 'hidden' as const },
  fill: { height: '100%' as const, borderRadius: 4 },
  streak: {
    alignItems: 'center' as const,
    minWidth: 48,
    backgroundColor: c.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  streakText: { color: c.flame, fontSize: 15, fontWeight: '800' as const },
  bonus: { color: c.flame, fontSize: 10, fontWeight: '700' as const },
});
