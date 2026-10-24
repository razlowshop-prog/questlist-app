import { Plus } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { addDays, SENSOR_CHALLENGES, weekStart, type ChallengeDef, type ChallengeStatus } from '../game';
import { EventCard } from '../components/EventCard';
import type { SeasonStatus } from '../seasons';
import { card, themed, useStyles, useTheme, FONTS, headingCase } from '../theme';
import { fill, Glyph, BRAND_FILL_SMALL, BRAND_INK, GradientText, ProgressRing, StickerHeading, VIVID_HEAVY, BRAND_TEXT_SHADOW } from '../components/Vivid';
import { brandGlow, brandLine, challengeRarity, ICON_GLYPHS, RARITY, SEASON_PILL } from '../vivid';

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
  const end = addDays(weekStart(today), 6);
  const [y, m, d] = end.split('-').map(Number);
  const daysLeft = Math.round((new Date(y, m - 1, d).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) + 1;

  return (
    <ScrollView contentContainerStyle={s.content}>
      <StickerHeading glyph="CalendarStar" grad={SEASON_PILL}>
        <Text style={[s.heading, s.subHeading, { marginTop: 0 }]}>Monthly event</Text>
      </StickerHeading>
      <EventCard season={season} onClaim={onClaimSeason} />

      <StickerHeading glyph="Target" grad={RARITY.epic} style={{ marginTop: 24 }}>
        <Text style={[s.heading, s.subHeading, { marginTop: 0 }]}>Weekly challenges</Text>
      </StickerHeading>
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
              <GradientText style={s.reward}>+{ch.def.rewardXp} XP</GradientText>
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

      {/* Friends' challenges need accounts; the card shows where they will be. */}
      <View style={s.join} accessible accessibilityLabel="Join a friend's challenge. Arrives with friends and accounts">
        <Plus size={20} color={brandLine(c.dark)} strokeWidth={2} aria-hidden />
        <View style={{ flex: 1 }}>
          <Text style={s.joinTitle}>Join a friend's challenge</Text>
          <Text style={s.progress}>Arrives with friends and accounts</Text>
        </View>
      </View>

      <StickerHeading glyph="DeviceMobile" grad={RARITY.rare} style={{ marginTop: 24 }}>
        <Text style={[s.heading, s.subHeading, { marginTop: 0 }]}>Coming with the phone app</Text>
      </StickerHeading>
      <Text style={s.sub}>These use your phone's sensors and health data, so they can't run in the browser.</Text>
      {SENSOR_CHALLENGES.map((def) => (
        <ChallengeCard key={def.id} def={def} progress={0} locked>
          <Text style={[s.reward, { color: c.muted }]}>+{def.rewardXp} XP</Text>
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
  const c = useTheme();
  const pct = Math.min(100, Math.round((progress / def.target) * 100));
  const grad = RARITY[challengeRarity(def.rewardXp)];
  return (
    <View style={[s.card, locked && { opacity: 0.55 }, highlight && s.cardHighlight]}>
      <ProgressRing progress={locked ? 0 : progress / def.target} size={50} grad={grad}>
        <Glyph name={ICON_GLYPHS[def.icon]} size={20} grad={locked ? undefined : grad} color={c.faint} />
      </ProgressRing>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={s.title}>{def.title}</Text>
        <View style={s.track}>
          <View style={[s.fill, fill(grad, 90), { width: `${pct}%` }]} />
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
  cardHighlight: { borderWidth: 1.5, borderColor: brandLine(c.dark), boxShadow: `0px 0px 16px ${brandGlow(0.3)}` },
  title: { color: c.text, fontSize: 15, fontWeight: '700' },
  track: { height: c.lineWeight, borderRadius: c.lineWeight / 2, backgroundColor: c.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  progress: { color: c.muted, fontSize: 12 },
  reward: { fontFamily: VIVID_HEAVY, fontSize: 14 },
  claim: { ...BRAND_FILL_SMALL, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center', borderRadius: 12 },
  claimText: { color: BRAND_INK, fontFamily: VIVID_HEAVY, fontSize: 13, ...BRAND_TEXT_SHADOW },
  claimed: { color: c.dark ? '#34E3C4' : '#0B7C8C', fontWeight: '700', fontSize: 13 },
  swap: { color: c.accent, fontWeight: '600', fontSize: 13, marginTop: 8, textDecorationLine: 'underline' },
  swapNote: { color: c.faint, fontSize: 12, marginTop: 2 },
  join: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 56, borderRadius: c.radius, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.outline, marginTop: 10 },
  joinTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
}));
