import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { STREAK_TIERS, streakBonus, streakTierName, type StreakStatus, type WeekDot } from '../game';
import { card, eyebrow, nativeDriver, themed, useStyles, useTheme } from '../theme';
import { tierFlame } from '../vivid';
import { Fire, fireColor } from './Fire';
import { FireAura, useReduceMotion } from './FireAura';
import { fill, GradientText, VIVID_HEAVY } from './Vivid';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The streak on the home screen (vivid spec): a border in the fire tier's
 * gradient, a big flame, the day count in gradient text, this week's days as
 * dots and the next fire with a small flame of that tier.
 */
export function StreakCard({ streak, week, onPress }: { streak: StreakStatus; /** Monday to Sunday of this week. */ week: WeekDot[]; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const color = fireColor(streak.tier, c);
  const grad = tierFlame(streak.tier);
  const bonus = streakBonus(streak.days);
  // The next fire this week can still earn, if any.
  const target = STREAK_TIERS.find((t) => t.tier > streak.tier && streak.weekXp < t.weekXp) ?? STREAK_TIERS.find((t) => t.tier > streak.tier);
  const reached = streak.weekTier > streak.tier ? STREAK_TIERS[streak.weekTier - 1] : undefined;
  const pct = target ? Math.min(1, streak.weekXp / target.weekXp) : 1;
  const targetGrad = target ? tierFlame(target.tier) : undefined;

  let weekLine: string;
  if (!target) weekLine = 'Inferno, the hottest fire. Keep it burning.';
  else if (reached && streak.weekXp >= target.weekXp) weekLine = `${reached.name} reached. It lights up on Monday.`;
  else weekLine = `${target.weekXp - streak.weekXp} XP more this week for ${target.name}${reached ? ` · ${reached.name} already reached` : ''}`;

  return (
    <Pressable onPress={onPress} style={[s.border, grad ? fill(grad, 135) : { backgroundColor: c.border }]} accessibilityRole="button" accessibilityLabel={`${streak.days} day streak, ${streakTierName(streak.tier)}. ${weekLine}`}>
      <View style={s.card}>
        <FireAura tier={streak.tier} id="streak-card" />
        <View style={s.row}>
          <Fire tier={streak.tier} size={56} />
          <View style={{ flex: 1 }}>
            <View style={s.daysRow}>
              <GradientText style={s.days}>{streak.days}</GradientText>
              <Text style={s.daysLabel}>day streak</Text>
            </View>
            <Text style={[s.tier, { color }]}>{streakTierName(streak.tier)}</Text>
          </View>
          {bonus > 0 && (
            <View style={s.bonus}>
              <GradientText style={s.bonusValue}>{(1 + bonus).toFixed(1)}x</GradientText>
              <Text style={s.bonusLabel}>XP</Text>
            </View>
          )}
        </View>
        <View style={s.week}>
          {week.map((d, i) => (
            <Dot key={i} state={d} letter={DAY_LETTERS[i]} grad={grad} />
          ))}
        </View>
        {target && (
          <View style={s.nextRow}>
            <Fire tier={target.tier} size={20} look="classic" />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.nextText}>{weekLine}</Text>
              <View style={s.track}>
                <View style={[s.fill, { width: `${pct * 100}%` }, targetGrad && fill(targetGrad, 90)]} />
              </View>
            </View>
          </View>
        )}
        {!target && <Text style={s.nextText}>{weekLine}</Text>}
        {streak.atRisk && <Text style={s.risk}>Nothing done today yet. One task keeps your streak.</Text>}
        {streak.days === 0 && <Text style={s.nextText}>Finish a task today to light your streak.</Text>}
      </View>
    </Pressable>
  );
}

/** One day of the week: filled in the flame gradient when done, an outline when missed, pulsing for today. */
function Dot({ state, letter, grad }: { state: WeekDot; letter: string; grad?: { c1: string; c2: string } }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state !== 'today' || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, reduce]);
  const doneGrad = grad ?? { c1: '#FFE29A', c2: '#FF4A1C' };
  const dot =
    state === 'done' ? (
      <View style={[s.dot, fill(doneGrad, 160), { borderColor: 'transparent', boxShadow: `0px 0px 8px ${doneGrad.c2}88` }]} />
    ) : state === 'rest' ? (
      <View style={[s.dot, { borderColor: doneGrad.c2, borderStyle: 'dashed' }]} />
    ) : state === 'today' ? (
      <Animated.View
        style={[
          s.dot,
          { borderColor: doneGrad.c2, borderWidth: 2, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] },
        ]}
      />
    ) : (
      <View style={[s.dot, state === 'future' && { borderColor: c.border, opacity: 0.6 }]} />
    );
  return (
    <View style={s.day}>
      {dot}
      <Text style={[s.dayLetter, state === 'today' && { color: c.text, fontWeight: '700' }]}>{letter}</Text>
    </View>
  );
}

const makeStyles = themed((c) => ({
  border: { borderRadius: c.radius + 1.5, padding: 1.5, marginTop: 18 },
  card: { ...card(c), borderWidth: 0, borderRadius: c.radius, padding: 14, gap: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  daysRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  days: { fontFamily: VIVID_HEAVY, fontSize: 40, lineHeight: 46, fontVariant: ['lining-nums'] },
  daysLabel: { color: c.muted, fontSize: 14 },
  tier: { ...eyebrow(c, 11), fontWeight: '700' },
  bonus: { alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6 },
  bonusValue: { fontFamily: VIVID_HEAVY, fontSize: 20, fontVariant: ['lining-nums'] },
  bonusLabel: { ...eyebrow(c, 9), color: c.muted },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  day: { alignItems: 'center', gap: 4, width: 30 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: c.outline },
  dayLetter: { color: c.faint, fontSize: 11, fontWeight: '600' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { height: 5, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: c.muted },
  nextText: { color: c.muted, fontSize: 12 },
  risk: { color: c.flame, fontSize: 13, fontWeight: '600' },
}));
