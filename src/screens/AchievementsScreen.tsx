import { Pressable, ScrollView, Text, View } from 'react-native';
import { TIER_COLORS, TIER_NAMES, type AchievementStatus, type Reward } from '../achievements';
import { card, themed, useStyles } from '../theme';

const REWARD_ICON: Record<Reward['kind'], string> = { theme: '🎨', title: '🏷️', adfree: '🚫', premium: '👑' };

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
  const earned = achievements.reduce((n, a) => n + a.claimed, 0);
  const total = achievements.reduce((n, a) => n + a.def.tiers.length, 0);
  // Claimable ones first.
  const sorted = [...achievements].sort(
    (a, b) => Number(b.reached > b.claimed) - Number(a.reached > a.claimed),
  );

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.heading}>Achievements</Text>
      <Text style={s.sub}>
        {earned} of {total} trophies · reach a tier, then claim your XP and rewards
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
              <View style={s.iconWrap}>
                <Text style={s.icon}>{a.def.icon}</Text>
              </View>
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
                <Text style={s.reward}>🏆</Text>
              )}
            </View>

            <View style={s.tiers}>
              {a.def.tiers.map((t, i) => (
                <View
                  key={t.goal}
                  style={[
                    s.tierDot,
                    i < a.claimed && { backgroundColor: TIER_COLORS[i], borderColor: TIER_COLORS[i] },
                    i >= a.claimed && i < a.reached && { borderColor: TIER_COLORS[i] },
                  ]}
                >
                  <Text style={[s.tierGoal, i < a.claimed && s.tierGoalDone]}>{t.goal}</Text>
                </View>
              ))}
            </View>

            {a.next && (
              <>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: TIER_COLORS[a.reached] }]} />
                </View>
                <Text style={s.progress}>
                  {a.value} / {a.next.goal} {a.def.unit} · next: {TIER_NAMES[a.reached]}
                  {a.next.reward ? ` · unlocks ${a.next.reward.label}` : ''}
                </Text>
              </>
            )}
            {claimable && tierToClaim.reward && (
              <Text style={s.unlock}>🎁 Claim to unlock {tierToClaim.reward.label}</Text>
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
                {REWARD_ICON[r.kind]} {r.label}
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
  heading: { color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subHeading: { fontSize: 18, marginTop: 18 },
  sub: { color: c.muted, fontSize: 14, marginTop: 4, marginBottom: 16 },
  card: { ...card(c), padding: 14, marginBottom: 10, gap: 10 },
  cardClaimable: { borderWidth: 2, borderColor: c.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  title: { color: c.text, fontSize: 16, fontWeight: '800' },
  desc: { color: c.muted, fontSize: 13, marginTop: 2 },
  reward: { color: c.gold, fontWeight: '800', fontSize: 13 },
  claim: { backgroundColor: c.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  claimText: { color: c.onGold, fontWeight: '800', fontSize: 13 },
  tiers: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tierDot: {
    minWidth: 34,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierGoal: { color: c.muted, fontSize: 11, fontWeight: '800' },
  tierGoalDone: { color: '#1A1300' },
  track: { height: 6, backgroundColor: c.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  progress: { color: c.muted, fontSize: 12, marginTop: -4 },
  unlock: { color: c.gold, fontSize: 12, fontWeight: '700' },
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rewardChip: { ...card(c), borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  rewardChipText: { color: c.text, fontSize: 13, fontWeight: '600' },
}));
