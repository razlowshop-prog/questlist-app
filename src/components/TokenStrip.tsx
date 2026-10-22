import { TrendingUp } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { COMEBACK_BONUS, comebackDaysLeft, streakTierName, type GameState } from '../game';
import { card, themed, useStyles, useTheme } from '../theme';
import { doubleXpActive, restOffer } from '../tokens';
import { TOKEN_ICONS } from './RewardPicture';
import { GOLD_FILL_SMALL, GOLD_INK } from './Vivid';

/**
 * Boosts that matter today, under the streak card: a rest day offer when one
 * would save yesterday's missed streak, and pills for double XP or the
 * comeback boost while they run. Tokens themselves live in the inventory.
 * Hidden while there is nothing to show.
 */
export function TokenStrip({ state, today, onRest }: { state: GameState; today: string; onRest: (day: string) => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const offer = restOffer(state, today);
  const double = doubleXpActive(state, today);
  const comeback = comebackDaysLeft(state, today);
  if (!offer?.missed && !double && !comeback) return null;

  return (
    <View style={s.wrap}>
      {offer?.missed && (
        <Pressable onPress={() => onRest(offer.day)} style={s.offer} accessibilityRole="button">
          <TOKEN_ICONS.rest size={18} color={c.accent} strokeWidth={1.5} aria-hidden />
          <Text style={s.offerText}>
            You missed yesterday. Use a rest day to keep{' '}
            {offer.streakLost ? `your ${offer.keeps}-day streak` : `your ${streakTierName(offer.tier)} fire`}.
          </Text>
          <Text style={s.offerAction}>Use</Text>
        </Pressable>
      )}
      {(double || comeback > 0) && (
        <View style={s.row}>
          {double && (
            <View style={[s.pill, s.pillActive]}>
              <TOKEN_ICONS.double size={14} color={GOLD_INK} strokeWidth={2} aria-hidden />
              <Text style={[s.pillText, { color: GOLD_INK }]}>2x XP today</Text>
            </View>
          )}
          {comeback > 0 && (
            <View style={s.pill}>
              <TrendingUp size={14} color={c.accent} strokeWidth={1.75} aria-hidden />
              <Text style={s.pillText}>
                Comeback boost: +{Math.round(COMEBACK_BONUS * 100)}% XP
              </Text>
              <Text style={s.pillCount}>
                {comeback} {comeback === 1 ? 'day' : 'days'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = themed((c) => ({
  wrap: { marginTop: 10, gap: 8 },
  offer: { ...card(c), flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderColor: c.accent },
  offerText: { flex: 1, color: c.text, fontSize: 13, lineHeight: 18 },
  offerAction: { color: c.accent, fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  pillActive: { ...GOLD_FILL_SMALL, borderColor: 'transparent' },
  pillText: { color: c.text, fontSize: 13, fontWeight: '600' },
  pillCount: { color: c.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
}));
