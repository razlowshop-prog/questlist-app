import { ScrollView, Text, View } from 'react-native';
import { Avatar } from '../components/ProfileFrame';
import { GradientText, Sticker, VIVID_HEAVY, VividSwitch } from '../components/Vivid';
import { card, FONTS, themed, useStyles } from '../theme';
import { brandLine, RARITY } from '../vivid';

/**
 * The Friends and Leaderboard pages from the Menu. Both need accounts, so
 * until then Friends explains what is coming and records the opt-in to share,
 * and the leaderboard shows only the player's own row. Nothing here is made up.
 */
export function FriendsScreen({
  view,
  name,
  level,
  streak,
  totalXp,
  shareActivity,
  onShareActivity,
}: {
  view: 'friends' | 'leaderboard';
  name: string;
  level: number;
  streak: number;
  totalXp: number;
  shareActivity: boolean;
  onShareActivity: (share: boolean) => void;
}) {
  const s = useStyles(makeStyles);
  const initials = name.trim().slice(0, 2).toUpperCase() || '?';

  return (
    <ScrollView contentContainerStyle={s.content}>
      {view === 'friends' ? (
        <View style={s.card}>
          <Sticker grad={RARITY.rare} glyph="UsersThree" size={48} />
          <Text style={s.title}>Friends arrive with accounts</Text>
          <Text style={s.body}>
            Soon you can find people, add friends and contacts, accept requests and see each other's level and streak. Everyone
            who chooses to share shows up in your activity feed.
          </Text>
          <View style={s.shareRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.shareTitle}>Share my activity with friends</Text>
              <Text style={s.small}>Off unless you turn it on. Only friends you add will see it.</Text>
            </View>
            <VividSwitch value={shareActivity} onValueChange={onShareActivity} accessibilityLabel="Share my activity with friends" />
          </View>
        </View>
      ) : (
        <>
          <View style={s.me} accessible accessibilityLabel={`You, ${name}: level ${level}, ${streak} day streak, ${totalXp} XP`}>
            <Text style={s.rank}>–</Text>
            <Avatar initials={initials} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={s.meName} numberOfLines={1}>
                {name || 'You'}
              </Text>
              <Text style={s.small}>
                Level {level} · {streak} day streak
              </Text>
            </View>
            <GradientText style={s.xp}>{totalXp.toLocaleString()} XP</GradientText>
          </View>
          <Text style={s.note}>The global leaderboard opens once accounts arrive. Your spot is ready: the XP you earn now counts.</Text>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingTop: 8, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  card: { ...card(c), padding: 16, gap: 10, alignItems: 'flex-start' },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 22 },
  body: { color: c.muted, fontSize: 14, lineHeight: 20 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, marginTop: 4, alignSelf: 'stretch' },
  shareTitle: { color: c.text, fontSize: 15, fontWeight: '600' },
  small: { color: c.muted, fontSize: 12 },
  me: { ...card(c), flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: brandLine(c) },
  rank: { color: c.muted, fontFamily: VIVID_HEAVY, fontSize: 15, width: 18, textAlign: 'center' },
  meName: { color: c.text, fontSize: 15, fontWeight: '700' },
  xp: { fontFamily: VIVID_HEAVY, fontSize: 14, fontVariant: ['tabular-nums'] },
  note: { color: c.muted, fontSize: 13, lineHeight: 18, marginTop: 12, textAlign: 'center' },
}));
