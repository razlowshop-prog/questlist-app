import { Pressable, Text, View } from 'react-native';
import { STREAK_TIERS, streakBonus, streakTierName, type StreakStatus } from '../game';
import { card, eyebrow, FONTS, themed, useStyles, useTheme } from '../theme';
import { Fire, fireColor } from './Fire';

/** The streak on the home screen: fire tier, days, multiplier and this week's progress to the next fire. */
export function StreakCard({ streak, onPress }: { streak: StreakStatus; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const color = fireColor(streak.tier, c.muted);
  const bonus = streakBonus(streak.days);
  // The next fire this week can still earn, if any.
  const target = STREAK_TIERS.find((t) => t.tier > streak.tier && streak.weekXp < t.weekXp) ?? STREAK_TIERS.find((t) => t.tier > streak.tier);
  const reached = streak.weekTier > streak.tier ? STREAK_TIERS[streak.weekTier - 1] : undefined;
  const pct = target ? Math.min(1, streak.weekXp / target.weekXp) : 1;

  let weekLine: string;
  if (!target) weekLine = 'Inferno, the hottest fire. Keep it burning.';
  else if (reached && streak.weekXp >= target.weekXp) weekLine = `${reached.name} reached. It lights up on Monday.`;
  else weekLine = `This week ${streak.weekXp} / ${target.weekXp} XP for ${target.name}${reached ? ` · ${reached.name} already reached` : ''}`;

  return (
    <Pressable onPress={onPress} style={[s.card, { borderColor: streak.tier ? color : c.border }]} accessibilityRole="button">
      <View style={s.row}>
        <Fire tier={streak.tier} size={42} />
        <View style={{ flex: 1 }}>
          <View style={s.daysRow}>
            <Text style={[s.days, { color: streak.tier ? color : c.text }]}>{streak.days}</Text>
            <Text style={s.daysLabel}>day streak</Text>
          </View>
          <Text style={[s.tier, { color }]}>{streakTierName(streak.tier)}</Text>
        </View>
        {bonus > 0 && (
          <View style={s.bonus}>
            <Text style={s.bonusValue}>{(1 + bonus).toFixed(1)}x</Text>
            <Text style={s.bonusLabel}>XP</Text>
          </View>
        )}
      </View>
      {target && (
        <View style={s.track}>
          <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: fireColor(target.tier, c.muted) }]} />
        </View>
      )}
      <Text style={s.week}>{weekLine}</Text>
      {streak.atRisk && <Text style={s.risk}>Nothing done today yet. One task keeps your streak.</Text>}
      {streak.days === 0 && <Text style={s.week}>Finish a task today to light your streak.</Text>}
    </Pressable>
  );
}

const makeStyles = themed((c) => ({
  card: { ...card(c), borderWidth: 1, padding: 14, gap: 10, marginTop: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  daysRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  days: { fontFamily: FONTS.serif, fontSize: 34, lineHeight: 38, fontVariant: ['lining-nums'] },
  daysLabel: { color: c.muted, fontSize: 14 },
  tier: { ...eyebrow(c, 11), fontWeight: '700' },
  bonus: { alignItems: 'center', borderRadius: c.radius, backgroundColor: c.accentSoft, paddingHorizontal: 10, paddingVertical: 6 },
  bonusValue: { fontFamily: FONTS.serif, color: c.accent, fontSize: 20, fontVariant: ['lining-nums'] },
  bonusLabel: { ...eyebrow(c, 9), color: c.accent },
  track: { height: 4, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  week: { color: c.muted, fontSize: 12 },
  risk: { color: c.flame, fontSize: 13, fontWeight: '600' },
}));
