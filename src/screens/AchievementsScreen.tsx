import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TIER_COLORS, TIER_NAMES, type AchievementStatus, type Reward } from '../achievements';
import { C } from '../theme';

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
  const earned = achievements.reduce((n, a) => n + a.claimed, 0);
  const total = achievements.reduce((n, a) => n + a.def.tiers.length, 0);
  // Claimable ones first, then by progress towards the next tier.
  const sorted = [...achievements].sort((a, b) => {
    const ca = a.reached > a.claimed ? 1 : 0;
    const cb = b.reached > b.claimed ? 1 : 0;
    return cb - ca;
  });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Achievements</Text>
      <Text style={styles.sub}>
        {earned} / {total} trophies claimed · reach a tier, then claim your XP and rewards
      </Text>

      {sorted.map((a) => {
        const claimable = a.reached > a.claimed;
        const tierToClaim = a.def.tiers[a.claimed];
        const shownTier = claimable ? tierToClaim : a.next;
        const prevGoal = a.reached > 0 ? a.def.tiers[a.reached - 1].goal : 0;
        const pct = a.next
          ? Math.min(1, Math.max(0, (a.value - prevGoal) / (a.next.goal - prevGoal)))
          : 1;
        return (
          <View key={a.def.id} style={[styles.card, claimable && styles.cardClaimable]}>
            <View style={styles.row}>
              <Text style={styles.icon}>{a.def.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{a.def.title}</Text>
                <Text style={styles.desc}>
                  {shownTier
                    ? a.def.description(shownTier.goal)
                    : 'All tiers complete!'}
                </Text>
              </View>
              {claimable ? (
                <Pressable onPress={() => onClaim(a.def.id)} style={styles.claim} accessibilityRole="button">
                  <Text style={styles.claimText}>Claim +{tierToClaim.xp} XP</Text>
                </Pressable>
              ) : shownTier ? (
                <Text style={styles.reward}>+{shownTier.xp} XP</Text>
              ) : (
                <Text style={styles.reward}>🏆</Text>
              )}
            </View>

            <View style={styles.tiers}>
              {a.def.tiers.map((t, i) => (
                <View
                  key={t.goal}
                  style={[
                    styles.tierDot,
                    i < a.claimed && { backgroundColor: TIER_COLORS[i], borderColor: TIER_COLORS[i] },
                    i >= a.claimed && i < a.reached && { borderColor: TIER_COLORS[i] },
                  ]}
                >
                  <Text style={[styles.tierGoal, i < a.claimed && { color: '#1A1300' }]}>{t.goal}</Text>
                </View>
              ))}
            </View>

            {a.next && (
              <>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: TIER_COLORS[a.reached] }]} />
                </View>
                <Text style={styles.progress}>
                  {a.value} / {a.next.goal} {a.def.unit} · next: {TIER_NAMES[a.reached]}
                  {a.next.reward ? ` · unlocks ${a.next.reward.label}` : ''}
                </Text>
              </>
            )}
            {claimable && tierToClaim.reward && (
              <Text style={styles.unlock}>🎁 Claim to unlock {tierToClaim.reward.label}</Text>
            )}
          </View>
        );
      })}

      <Text style={[styles.heading, { fontSize: 18, marginTop: 18 }]}>Your rewards</Text>
      {rewards.length === 0 ? (
        <Text style={styles.sub}>Claim achievement tiers to unlock themes, titles and ad-free or Premium time.</Text>
      ) : (
        <View style={styles.rewards}>
          {rewards.map((r, i) => (
            <View key={i} style={styles.rewardChip}>
              <Text style={styles.rewardChipText}>
                {REWARD_ICON[r.kind]} {r.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  heading: { color: C.text, fontSize: 22, fontWeight: '800' },
  sub: { color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 14 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10, gap: 10, borderWidth: 1, borderColor: 'transparent' },
  cardClaimable: { borderColor: C.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 28 },
  title: { color: C.text, fontSize: 16, fontWeight: '800' },
  desc: { color: C.muted, fontSize: 13, marginTop: 1 },
  reward: { color: C.gold, fontWeight: '800', fontSize: 13 },
  claim: { backgroundColor: C.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  claimText: { color: '#2A1E00', fontWeight: '800', fontSize: 13 },
  tiers: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tierDot: {
    minWidth: 34,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierGoal: { color: C.muted, fontSize: 11, fontWeight: '800' },
  track: { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  progress: { color: C.muted, fontSize: 12, marginTop: -4 },
  unlock: { color: C.gold, fontSize: 12, fontWeight: '700' },
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rewardChip: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  rewardChipText: { color: C.text, fontSize: 13, fontWeight: '600' },
});
