import { Pressable, Text, View } from 'react-native';
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
 * flame, the day count in gradient text, the fire's name and this week's days
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
          <Fire tier={streak.tier} size={34} still />
          <GradientText style={s.days}>{streak.days}</GradientText>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.label} numberOfLines={1}>
              day streak · {streakTierName(streak.tier)}
            </Text>
            <View style={s.week}>
              {week.map((d, i) => (
                <Dot key={i} state={d} grad={grad} />
              ))}
            </View>
          </View>
          {multiplier.total > 1 && <MultiplierPill multiplier={multiplier} size="small" />}
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
  days: { fontFamily: VIVID_HEAVY, fontSize: 34, lineHeight: 38, fontVariant: ['lining-nums'] },
  label: { color: c.text, fontSize: 13, fontWeight: '700' },
  week: { flexDirection: 'row', gap: 5 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: c.outline },
  note: { color: c.muted, fontSize: 12 },
  risk: { color: c.flame, fontSize: 13, fontWeight: '600' },
}));
