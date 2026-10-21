import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDays, SENSOR_CHALLENGES, weekStart, type ChallengeDef, type ChallengeStatus } from '../game';
import { C } from '../theme';

export function ChallengesScreen({
  challenges,
  today,
  onClaim,
}: {
  challenges: ChallengeStatus[];
  today: string;
  onClaim: (id: string) => void;
}) {
  const end = addDays(weekStart(today), 6);
  const [y, m, d] = end.split('-').map(Number);
  const daysLeft = Math.round((new Date(y, m - 1, d).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) + 1;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Weekly challenges</Text>
      <Text style={styles.sub}>
        New challenges every Monday · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
      </Text>

      {challenges.map((c) => (
        <ChallengeCard key={c.def.id} def={c.def} progress={c.progress}>
          {c.claimed ? (
            <Text style={styles.claimed}>✓ Claimed</Text>
          ) : c.complete ? (
            <Pressable style={styles.claim} onPress={() => onClaim(c.def.id)} accessibilityRole="button">
              <Text style={styles.claimText}>Claim +{c.def.rewardXp} XP</Text>
            </Pressable>
          ) : (
            <Text style={styles.reward}>+{c.def.rewardXp} XP</Text>
          )}
        </ChallengeCard>
      ))}

      <Text style={[styles.heading, { marginTop: 20, fontSize: 17 }]}>Coming with the phone app</Text>
      <Text style={styles.sub}>These use your phone's sensors and health data, so they can't run in the browser.</Text>
      {SENSOR_CHALLENGES.map((def) => (
        <ChallengeCard key={def.id} def={def} progress={0} locked>
          <Text style={styles.reward}>+{def.rewardXp} XP</Text>
        </ChallengeCard>
      ))}
    </ScrollView>
  );
}

function ChallengeCard({
  def,
  progress,
  locked,
  children,
}: {
  def: ChallengeDef;
  progress: number;
  locked?: boolean;
  children: React.ReactNode;
}) {
  const pct = Math.round((progress / def.target) * 100);
  return (
    <View style={[styles.card, locked && { opacity: 0.5 }]}>
      <Text style={styles.icon}>{def.icon}</Text>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.title}>{def.title}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progress}>
          {locked ? 'Coming soon' : `${progress} / ${def.target} ${def.unit}`}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  heading: { color: C.text, fontSize: 22, fontWeight: '800' },
  sub: { color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  icon: { fontSize: 28 },
  title: { color: C.text, fontSize: 15, fontWeight: '700' },
  track: { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.gold, borderRadius: 4 },
  progress: { color: C.muted, fontSize: 12 },
  reward: { color: C.gold, fontWeight: '800', fontSize: 13 },
  claim: { backgroundColor: C.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  claimText: { color: '#2A1E00', fontWeight: '800', fontSize: 13 },
  claimed: { color: C.xp, fontWeight: '800', fontSize: 13 },
});
