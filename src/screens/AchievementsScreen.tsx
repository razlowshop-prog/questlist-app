import { Pressable, ScrollView, Text, View } from 'react-native';
import { AchievementBadge } from '../components/AppIcon';
import { tierColor, TIER_NAMES, type AchievementStatus, type Reward } from '../achievements';
import { card, themed, useStyles, FONTS, headingCase, useTheme } from '../theme';


export function AchievementsScreen({
  achievements,
  rewards,
  onClaim,
}: {
  achievements: AchievementStatus[];
  rewards: Reward[];
  onClaim: (id: string) => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const earned = achievements.reduce((n, a) => n + Math.min(a.claimed, a.def.tiers.length), 0);
  const total = achievements.reduce((n, a) => n + a.def.tiers.length, 0);
  // Claimable ones first.
  const sorted = [...achievements].sort(
    (a, b) => Number(b.reached > b.claimed) - Number(a.reached > a.claimed),
  );

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.heading}>Achievements</Text>
      <Text style={s.sub}>
        {earned} of {total} tiers claimed · reach a tier, then claim your XP and rewards
      </Text>

      {sorted.map((a) => {
        const claimable = a.reached > a.claimed;
        const tierToClaim = a.def.tiers[a.claimed];
        const shownTier = claimable ? tierToClaim : a.next;
        const prevGoal = a.reached > 0 ? a.def.tiers[a.reached - 1].goal : 0;
        const pct = a.next ? Math.min(1, Math.max(0, (a.value - prevGoal) / (a.next.goal - prevGoal))) : 1;
        return (
          <View key={a.def.id} style={[s.card, claimable && s.cardClaimable]}>
            <View style={s.row}>
              <AchievementBadge name={a.def.icon} state={a.claimed > 0 ? 'earned' : 'normal'} />
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{a.def.title}</Text>
                <Text style={s.desc}>
                  {shownTier ? a.def.description(shownTier.goal) : 'All tiers complete!'}
                </Text>
              </View>
              {claimable ? (
                <Pressable onPress={() => onClaim(a.def.id)} style={s.claim} accessibilityRole="button">
                  <Text style={s.claimText}>Claim +{tierToClaim.xp}</Text>
                </Pressable>
              ) : shownTier ? (
                <Text style={s.reward}>+{shownTier.xp} XP</Text>
              ) : (
                <Text style={s.reward}>COMPLETE</Text>
              )}
            </View>

            <View style={s.tiers}>
              {a.def.tiers.map((t, i) => (
                <View
                  key={t.goal}
                  style={[
                    s.tierDot,
                    i < a.claimed && { backgroundColor: tierColor(i, c.dark), borderColor: tierColor(i, c.dark) },
                    i >= a.claimed && i < a.reached && { borderColor: tierColor(i, c.dark) },
                  ]}
                >
                  <Text style={[s.tierGoal, i < a.claimed && s.tierGoalDone]}>{t.goal}</Text>
                </View>
              ))}
            </View>

            {a.next && (
              <>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: tierColor(a.reached, c.dark) }]} />
                </View>
                <Text style={s.progress}>
                  {a.value} / {a.next.goal} {a.def.unit} · next: {TIER_NAMES[a.reached]}
                  {a.next.reward ? ` · unlocks ${a.next.reward.label}` : ''}
                </Text>
              </>
            )}
            {claimable && tierToClaim.reward && (
              <Text style={s.unlock}>Claim to unlock {tierToClaim.reward.label}</Text>
            )}
          </View>
        );
      })}

      <Text style={[s.heading, s.subHeading]}>Your rewards</Text>
      {rewards.length === 0 ? (
        <Text style={s.sub}>Claim achievement tiers to unlock themes, titles and ad-free or Premium time.</Text>
      ) : (
        <View style={s.rewards}>
          {rewards.map((r, i) => (
            <View key={i} style={s.rewardChip}>
              <Text style={s.rewardChipText}>
                {r.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  heading: { fontFamily: FONTS.serif, color: c.text, fontSize: 30, lineHeight: 36, ...headingCase(c) },
  subHeading: { fontSize: 22, lineHeight: 28, marginTop: 22 },
  sub: { color: c.muted, fontSize: 14, marginTop: 4, marginBottom: 16 },
  card: { ...card(c), padding: 14, marginBottom: 10, gap: 10 },
  cardClaimable: { borderWidth: 1, borderColor: c.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: c.text, fontSize: 16, fontWeight: '700' },
  desc: { color: c.muted, fontSize: 13, marginTop: 2 },
  reward: { color: c.gold, fontWeight: '700', fontSize: 13 },
  claim: { backgroundColor: c.gold, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: c.radius },
  claimText: { color: c.onGold, fontWeight: '700', fontSize: 13 },
  tiers: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tierDot: {
    minWidth: 34,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: c.radius,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierGoal: { color: c.muted, fontSize: 11, fontWeight: '700' },
  tierGoalDone: { color: c.onGold },
  track: { height: c.lineWeight, borderRadius: c.lineWeight / 2, backgroundColor: c.border, overflow: 'hidden' },
  fill: { height: '100%' },
  progress: { color: c.muted, fontSize: 12, marginTop: -4 },
  unlock: { color: c.gold, fontSize: 12, fontWeight: '700' },
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rewardChip: { ...card(c), borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  rewardChipText: { color: c.text, fontSize: 13, fontWeight: '600' },
}));
