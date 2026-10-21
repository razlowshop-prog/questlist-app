import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { levelInfo } from '../game';
import { C, nativeDriver } from '../theme';

/**
 * Always-visible bar at the top: level, rank, streak and an XP bar that
 * fills up smoothly when XP is gained. On a level-up it fills to the end,
 * flashes, then continues from zero on the new level.
 */
export function XpHeader({ totalXp, streak, bonus }: { totalXp: number; streak: number; bonus: number }) {
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
            Animated.spring(badgeScale, { toValue: 1.35, useNativeDriver: nativeDriver, speed: 30 }),
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
  const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: [C.xp, '#B6FFD9'] });

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
          <Text style={styles.badgeText}>{shownLevel}</Text>
        </Animated.View>
        <View style={{ flex: 1 }}>
          <View style={styles.labels}>
            <Text style={styles.rank}>{info.rank}</Text>
            <Text style={styles.xpText}>
              {info.maxed ? 'MAX LEVEL' : `${info.xpIntoLevel} / ${info.xpForLevel} XP`}
            </Text>
          </View>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width, backgroundColor: glowColor }]} />
          </View>
        </View>
        <View style={styles.streak}>
          <Text style={styles.streakText}>🔥 {streak}</Text>
          {bonus > 0 && <Text style={styles.bonus}>+{Math.round(bonus * 100)}%</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  rank: { color: C.text, fontSize: 14, fontWeight: '700' },
  xpText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  track: { height: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  streak: { alignItems: 'center', minWidth: 44 },
  streakText: { color: C.flame, fontSize: 16, fontWeight: '800' },
  bonus: { color: C.flame, fontSize: 11, fontWeight: '700' },
});
