import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { levelInfo, type StreakStatus } from '../game';
import { themed, useStyles, useTheme } from '../theme';
import { tierFlame } from '../vivid';
import { Fire } from './Fire';
import { brandFillSmall, GradientText, VIVID_HEAVY } from './Vivid';
import { t } from '../i18n';

/** Height of the bar, so what pins below it (the combo pill) can leave room. */
export const STICKY_HEIGHT = 40;

/**
 * The streak and the XP bar in one slim line, pinned to the top of Today once
 * the big streak card has scrolled away, so both stay in sight down the list.
 * `shown` runs from 0 (hidden) to 1. Like the big ones: the streak opens the
 * streak and fire details, the XP bar the coming level rewards.
 */
export function StickyStatus({
  totalXp,
  streak,
  shown,
  onStreak,
  onLevel,
}: {
  totalXp: number;
  streak: StreakStatus;
  shown: SharedValue<number>;
  onStreak: () => void;
  onLevel: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const info = levelInfo(totalXp);
  const width = useSharedValue(info.progress);
  useEffect(() => {
    width.value = withTiming(info.progress, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [info.progress]);
  const wrapStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: -8 * (1 - shown.value) }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, width.value)) * 100}%` }));
  const grad = tierFlame(streak.tier);

  return (
    <Animated.View style={[s.wrap, wrapStyle]}>
      <View style={s.row}>
        <Pressable
          onPress={onStreak}
          hitSlop={8}
          style={s.streak}
          accessibilityRole="button"
          accessibilityLabel={`${t('{n}-day streak', { n: streak.days })}. ${t('Show streak details')}`}
        >
          <Fire tier={streak.tier} size={18} still />
          <GradientText style={s.days} colors={grad}>
            {streak.days}
          </GradientText>
        </Pressable>
        <Pressable
          onPress={onLevel}
          style={s.levelPart}
          accessibilityRole="button"
          accessibilityLabel={`${t('Level {n}', { n: info.level })}, ${info.maxed ? t('max level') : t('{n} of {total} XP', { n: info.xpIntoLevel, total: info.xpForLevel })}. ${t('Show upcoming rewards')}`}
        >
          <View style={s.track}>
            <Animated.View style={[s.fill, fillStyle]} />
          </View>
          <Text style={s.level} numberOfLines={1}>
            {t('Lvl {n}', { n: info.level })}
            {!info.maxed && (
              <Text style={{ color: c.muted }}>
                {' '}
                · {info.xpIntoLevel}/{info.xpForLevel}
              </Text>
            )}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const makeStyles = themed((c) => ({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: STICKY_HEIGHT,
    backgroundColor: c.bg,
    ...(c.bgImage && { backgroundImage: c.bgImage }),
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 32 },
  levelPart: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  days: { fontFamily: VIVID_HEAVY, fontSize: 16, fontVariant: ['lining-nums'] },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  fill: { ...brandFillSmall(c), height: '100%', borderRadius: 3 },
  level: { color: c.text, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
}));
