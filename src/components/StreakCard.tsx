import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { STREAK_TIERS, streakTierName, type StreakStatus, type WeekDot, type xpMultiplier } from '../game';
import { card, themed, useStyles, useTheme } from '../theme';
import { brandLine, tierFlame } from '../vivid';
import { Fire } from './Fire';
import { MultiplierPill } from './MultiplierPill';
import { fill, GradientText, VIVID_HEAVY } from './Vivid';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DOT_WORDS: Record<WeekDot, string> = { done: 'done', rest: 'rest day', today: 'today', missed: 'missed', future: 'to come' };

/**
 * The streak on the home screen (home variant F): one calm row with a still
 * flame, the big glowing day count, the fire's name and this week's days
 * as small dots, inside a thin border in the fire tier's gradient. The XP
 * multiplier sits on the right while it is above 1. Tapping the card opens the
 * level sheet with the streak bonus and the fire tiers.
 */
export function StreakCard({
  streak,
  week,
  multiplier,
  onPress,
}: {
  streak: StreakStatus;
  /** Monday to Sunday of this week. */
  week: WeekDot[];
  multiplier: ReturnType<typeof xpMultiplier>;
  onPress: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const grad = tierFlame(streak.tier);
  const days = week.map((d, i) => `${DAY_NAMES[i]} ${DOT_WORDS[d]}`).join(', ');

  return (
    <Pressable
      onPress={onPress}
      style={[s.border, grad ? fill(grad, 135) : { backgroundColor: c.border }]}
      accessibilityRole="button"
      accessibilityLabel={`${streak.days} day streak, ${streakTierName(streak.tier)}. This week: ${days}. Show the streak bonus and fire tiers`}
    >
      <View style={s.card}>
        <View style={s.row}>
          <Fire tier={streak.tier} size={40} still />
          <StreakNumber days={streak.days} tier={streak.tier} />
          <View style={{ flex: 1, gap: 6 }}>
            {/* The multiplier shares the label's line, so a long streak still fits on small phones. */}
            <View style={s.labelRow}>
              <Text style={s.label} numberOfLines={1}>
                day streak · {streakTierName(streak.tier)}
              </Text>
              {multiplier.total > 1 && <MultiplierPill multiplier={multiplier} size="small" />}
            </View>
            <View style={s.week}>
              {week.map((d, i) => (
                <Dot key={i} state={d} grad={grad} />
              ))}
            </View>
          </View>
        </View>
        {streak.atRisk && <Text style={s.risk}>Nothing done today yet. One task keeps your streak.</Text>}
        {streak.days === 0 && <Text style={s.note}>Finish a task today to light your streak.</Text>}
        {/* Flame lights the moment the streak has earned its XP. */}
        {streak.days > 0 && streak.tier === 0 && (
          <Text style={s.note}>
            {STREAK_TIERS[0].weekXp - streak.streakXp} XP more to light {STREAK_TIERS[0].name}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** How the day count burns per fire tier (Spark, Flame, Blaze, Inferno): glow size and flicker strength. */
const NUMBER_FIRE = [
  { glow: 0, flicker: 0 },
  { glow: 10, flicker: 0.04 },
  { glow: 16, flicker: 0.07 },
  { glow: 24, flicker: 0.1 },
];

/**
 * The day count, big, in the fire tier's colours. It glows and flickers
 * softly like a flame, more with every tier; a Spark streak stays calm.
 */
function StreakNumber({ days, tier }: { days: number; tier: number }) {
  const s = useStyles(makeStyles);
  const grad = tierFlame(tier);
  const fire = NUMBER_FIRE[Math.max(0, Math.min(3, tier))];
  const reduce = useReducedMotion();
  const flicker = useSharedValue(0);
  const lit = days > 0 && fire.flicker > 0 && !reduce;

  useEffect(() => {
    if (!lit) {
      flicker.value = 0;
      return;
    }
    // Uneven steps, so it reads as a flame rather than a pulse.
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: 260, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.8, { duration: 340, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [lit]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - fire.flicker * 1.5 * flicker.value,
    transform: [{ scale: 1 + fire.flicker * 0.5 * flicker.value }],
  }));

  return (
    <Animated.View style={style}>
      <GradientText style={[s.days, days >= 100 && s.daysLong]} colors={grad} glow={grad && days > 0 ? grad.c2 : undefined} glowRadius={fire.glow}>
        {days}
      </GradientText>
    </Animated.View>
  );
}

/** One day of the week: filled in the flame gradient when done, dashed on a rest day, a ring for today, an outline otherwise. */
function Dot({ state, grad }: { state: WeekDot; grad?: { c1: string; c2: string } }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const doneGrad = grad ?? { c1: '#FFE29A', c2: '#FF4A1C' };
  if (state === 'done') return <View style={[s.dot, fill(doneGrad, 180), { borderColor: 'transparent' }]} />;
  if (state === 'rest') return <View style={[s.dot, { borderColor: doneGrad.c2, borderStyle: 'dashed' }]} />;
  if (state === 'today') return <View style={[s.dot, { borderColor: brandLine(c.dark), borderWidth: 2 }]} />;
  return <View style={[s.dot, state === 'future' && { opacity: 0.6 }]} />;
}

const makeStyles = themed((c) => ({
  border: { borderRadius: c.radius + 1.5, padding: 1.5, marginTop: 16 },
  card: { ...card(c), borderWidth: 0, borderRadius: c.radius, paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  days: { fontFamily: VIVID_HEAVY, fontSize: 52, lineHeight: 58, fontVariant: ['lining-nums'], minWidth: 34, textAlign: 'center' },
  daysLong: { fontFamily: VIVID_HEAVY, fontSize: 42, lineHeight: 50 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flexShrink: 1, color: c.text, fontSize: 13, fontWeight: '700' },
  week: { flexDirection: 'row', gap: 5 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: c.outline },
  note: { color: c.muted, fontSize: 12 },
  risk: { color: c.flame, fontSize: 13, fontWeight: '600' },
}));
