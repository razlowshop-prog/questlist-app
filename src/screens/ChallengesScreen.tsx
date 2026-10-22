import { Pressable, ScrollView, Text, View } from 'react-native';
import { addDays, SENSOR_CHALLENGES, weekStart, type ChallengeDef, type ChallengeStatus } from '../game';
import { AppIcon } from '../components/AppIcon';
import { ProfileFrame } from '../components/ProfileFrame';
import { frameName } from '../cosmetics';
import { CATEGORIES } from '../library';
import type { SeasonStatus } from '../seasons';
import { card, themed, useStyles, useTheme, FONTS, headingCase } from '../theme';

export function ChallengesScreen({
  challenges,
  today,
  onClaim,
  swapsLeft,
  onSwap,
  season,
  onClaimSeason,
}: {
  challenges: ChallengeStatus[];
  today: string;
  onClaim: (id: string) => void;
  /** Challenge swap tokens held. */
  swapsLeft: number;
  onSwap: (id: string) => void;
  season: SeasonStatus;
  onClaimSeason: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const monthName = new Date(`${season.month}-15T12:00:00`).toLocaleDateString('en', { month: 'long' });
  const counts = season.season.categories.map((id) => CATEGORIES.find((cat) => cat.id === id)?.label.toLowerCase() ?? id);
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
            <>
              <Text style={s.reward}>+{ch.def.rewardXp} XP</Text>
              {swapsLeft > 0 && (
                <Pressable onPress={() => onSwap(ch.def.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Swap ${ch.def.title}`}>
                  <Text style={s.swap}>Swap</Text>
                </Pressable>
              )}
            </>
          )}
        </ChallengeCard>
      ))}
      {swapsLeft > 0 && (
        <Text style={s.swapNote}>
          You have {swapsLeft} challenge {swapsLeft === 1 ? 'swap' : 'swaps'}. A new challenge counts everything you did this week.
        </Text>
      )}

      <Text style={[s.heading, s.subHeading]}>{monthName} event</Text>
      <Text style={s.sub}>
        A new event every month · {season.daysLeft === 0 ? 'last day' : `${season.daysLeft} ${season.daysLeft === 1 ? 'day' : 'days'} left`}
      </Text>
      <View style={[s.card, s.event, season.complete && !season.claimed && s.cardHighlight]}>
        <ProfileFrame frame={season.frame} size={44} locked={!season.claimed && !season.complete}>
          <View style={s.eventDot} />
        </ProfileFrame>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.title}>{season.season.name}</Text>
          <Text style={s.progress}>{season.season.pitch}</Text>
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.round((season.progress / season.season.target) * 100)}%` }]} />
          </View>
          <Text style={s.progress}>
            {season.progress} / {season.season.target} tasks from {listOf(counts)}
          </Text>
          {season.claimed ? (
            <Text style={s.claimed}>✓ {frameName(season.frame)} frame won · wear it from your inventory</Text>
          ) : season.complete ? (
            <Pressable style={[s.claim, { alignSelf: 'flex-start' }]} onPress={onClaimSeason} accessibilityRole="button">
              <Text style={s.claimText}>Claim the {frameName(season.frame)} frame</Text>
            </Pressable>
          ) : (
            <Text style={[s.reward, { color: c.accent }]}>Wins the {frameName(season.frame)} frame, only this month</Text>
          )}
        </View>
      </View>

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

/** "a, b and c" */
function listOf(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
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
  const c = useTheme();
  const pct = Math.round((progress / def.target) * 100);
  return (
    <View style={[s.card, locked && { opacity: 0.55 }, highlight && s.cardHighlight]}>
      <View style={s.iconWrap}>
        <AppIcon name={def.icon} color={locked ? c.faint : highlight ? c.accent : c.muted} />
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
  heading: { fontFamily: FONTS.serif, color: c.text, fontSize: 30, lineHeight: 36, ...headingCase(c) },
  subHeading: { fontSize: 22, lineHeight: 28, marginTop: 24 },
  sub: { color: c.muted, fontSize: 14, marginTop: 4, marginBottom: 16 },
  card: { ...card(c), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10 },
  cardHighlight: { borderWidth: 1, borderColor: c.gold },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: c.radius,
    backgroundColor: c.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: c.text, fontSize: 15, fontWeight: '700' },
  track: { height: c.lineWeight, borderRadius: c.lineWeight / 2, backgroundColor: c.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: c.gold },
  progress: { color: c.muted, fontSize: 12 },
  reward: { color: c.gold, fontWeight: '700', fontSize: 13 },
  claim: { backgroundColor: c.gold, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: c.radius },
  claimText: { color: c.onGold, fontWeight: '700', fontSize: 13 },
  claimed: { color: c.xp, fontWeight: '700', fontSize: 13 },
  swap: { color: c.accent, fontWeight: '600', fontSize: 13, marginTop: 8, textDecorationLine: 'underline' },
  event: { alignItems: 'flex-start' },
  eventDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.goldSoft },
  swapNote: { color: c.faint, fontSize: 12, marginTop: 2 },
}));
