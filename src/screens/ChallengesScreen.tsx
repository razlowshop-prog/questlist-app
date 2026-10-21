import { Pressable, ScrollView, Text, View } from 'react-native';
import { addDays, SENSOR_CHALLENGES, weekStart, type ChallengeDef, type ChallengeStatus } from '../game';
import { card, themed, useStyles } from '../theme';

export function ChallengesScreen({
  challenges,
  today,
  onClaim,
}: {
  challenges: ChallengeStatus[];
  today: string;
  onClaim: (id: string) => void;
}) {
  const s = useStyles(makeStyles);
  const end = addDays(weekStart(today), 6);
  const [y, m, d] = end.split('-').map(Number);
  const daysLeft = Math.round((new Date(y, m - 1, d).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) + 1;

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.heading}>Weekly challenges</Text>
      <Text style={s.sub}>
        New challenges every Monday · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
      </Text>

      {challenges.map((ch) => (
        <ChallengeCard key={ch.def.id} def={ch.def} progress={ch.progress} highlight={ch.complete && !ch.claimed}>
          {ch.claimed ? (
            <Text style={s.claimed}>✓ Claimed</Text>
          ) : ch.complete ? (
            <Pressable style={s.claim} onPress={() => onClaim(ch.def.id)} accessibilityRole="button">
              <Text style={s.claimText}>Claim +{ch.def.rewardXp} XP</Text>
            </Pressable>
          ) : (
            <Text style={s.reward}>+{ch.def.rewardXp} XP</Text>
          )}
        </ChallengeCard>
      ))}

      <Text style={[s.heading, s.subHeading]}>Coming with the phone app</Text>
      <Text style={s.sub}>These use your phone's sensors and health data, so they can't run in the browser.</Text>
      {SENSOR_CHALLENGES.map((def) => (
        <ChallengeCard key={def.id} def={def} progress={0} locked>
          <Text style={s.reward}>+{def.rewardXp} XP</Text>
        </ChallengeCard>
      ))}
    </ScrollView>
  );
}

function ChallengeCard({
  def,
  progress,
  locked,
  highlight,
  children,
}: {
  def: ChallengeDef;
  progress: number;
  locked?: boolean;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  const s = useStyles(makeStyles);
  const pct = Math.round((progress / def.target) * 100);
  return (
    <View style={[s.card, locked && { opacity: 0.55 }, highlight && s.cardHighlight]}>
      <View style={s.iconWrap}>
        <Text style={s.icon}>{def.icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={s.title}>{def.title}</Text>
        <View style={s.track}>
          <View style={[s.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={s.progress}>{locked ? 'Coming soon' : `${progress} / ${def.target} ${def.unit}`}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  heading: { color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subHeading: { fontSize: 18, marginTop: 20 },
  sub: { color: c.muted, fontSize: 14, marginTop: 4, marginBottom: 16 },
  card: { ...card(c), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10 },
  cardHighlight: { borderWidth: 2, borderColor: c.gold },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  title: { color: c.text, fontSize: 15, fontWeight: '700' },
  track: { height: 6, backgroundColor: c.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: c.gold, borderRadius: 3 },
  progress: { color: c.muted, fontSize: 12 },
  reward: { color: c.gold, fontWeight: '800', fontSize: 13 },
  claim: { backgroundColor: c.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  claimText: { color: c.onGold, fontWeight: '800', fontSize: 13 },
  claimed: { color: c.xp, fontWeight: '800', fontSize: 13 },
}));
