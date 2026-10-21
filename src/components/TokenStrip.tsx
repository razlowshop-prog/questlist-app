import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import type { TokenKind } from '../achievements';
import { dayLabel, type GameState } from '../game';
import { card, eyebrow, FONTS, themed, useStyles, useTheme, headingCase } from '../theme';
import { doubleXpActive, restOffer, TOKEN_INFO, tokenCounts } from '../tokens';
import { TOKEN_ICONS } from './RewardPicture';

const ORDER: TokenKind[] = ['rest', 'double', 'reroll'];

/**
 * The player's tokens on Today: a pill per token held, a sheet to use one,
 * and a clear offer when a rest day would save yesterday's missed streak.
 * Hidden while there is nothing to show.
 */
export function TokenStrip({
  state,
  today,
  onRest,
  onDouble,
  onOpenChallenges,
}: {
  state: GameState;
  today: string;
  onRest: (day: string) => void;
  onDouble: () => void;
  onOpenChallenges: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [open, setOpen] = useState<TokenKind | null>(null);
  const counts = tokenCounts(state);
  const offer = restOffer(state, today);
  const double = doubleXpActive(state, today);
  const held = ORDER.filter((k) => counts[k] > 0);
  if (!held.length && !double) return null;

  return (
    <View style={s.wrap}>
      {offer?.missed && (
        <Pressable onPress={() => onRest(offer.day)} style={s.offer} accessibilityRole="button">
          <TOKEN_ICONS.rest size={18} color={c.accent} strokeWidth={1.5} aria-hidden />
          <Text style={s.offerText}>
            You missed yesterday. Use a rest day to keep your {offer.keeps}-day streak.
          </Text>
          <Text style={s.offerAction}>Use</Text>
        </Pressable>
      )}
      <View style={s.row}>
        {double && (
          <View style={[s.pill, s.pillActive]}>
            <TOKEN_ICONS.double size={14} color={c.onAccent} strokeWidth={2} aria-hidden />
            <Text style={[s.pillText, { color: c.onAccent }]}>2x XP today</Text>
          </View>
        )}
        {held.map((k) => {
          const Icon = TOKEN_ICONS[k];
          return (
            <Pressable
              key={k}
              onPress={() => setOpen(k)}
              style={s.pill}
              accessibilityRole="button"
              accessibilityLabel={`${TOKEN_INFO[k].name}, ${counts[k]} left`}
            >
              <Icon size={14} color={c.accent} strokeWidth={1.75} aria-hidden />
              <Text style={s.pillText}>{TOKEN_INFO[k].name}</Text>
              <Text style={s.pillCount}>×{counts[k]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(null)} accessibilityLabel="Close" />
        <View style={s.sheetWrap} pointerEvents="box-none">
          {open && (
            <View style={s.sheet}>
              <Text style={s.eyebrow}>{counts[open]} left</Text>
              <Text style={s.title}>{TOKEN_INFO[open].name}</Text>
              <Text style={s.body}>{TOKEN_INFO[open].description}</Text>
              {open === 'rest' &&
                (offer ? (
                  <Action
                    label={offer.missed ? `Save yesterday (${dayLabel(offer.day)})` : 'Take today off'}
                    onPress={() => {
                      onRest(offer.day);
                      setOpen(null);
                    }}
                  />
                ) : (
                  <Text style={s.note}>Nothing needs saving right now. Use it on a day you can't do a task.</Text>
                ))}
              {open === 'double' &&
                (double ? (
                  <Text style={s.note}>Already on for today.</Text>
                ) : (
                  <Action
                    label="Use now: 2x XP today"
                    onPress={() => {
                      onDouble();
                      setOpen(null);
                    }}
                  />
                ))}
              {open === 'reroll' && (
                <Action
                  label="Go to challenges"
                  onPress={() => {
                    setOpen(null);
                    onOpenChallenges();
                  }}
                />
              )}
              <Pressable onPress={() => setOpen(null)} style={s.close} accessibilityRole="button">
                <Text style={s.closeText}>Not now</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={s.action} accessibilityRole="button">
      <Text style={s.actionText}>{label}</Text>
    </Pressable>
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
  pillActive: { backgroundColor: c.accent, borderColor: c.accent },
  pillText: { color: c.text, fontSize: 13, fontWeight: '600' },
  pillCount: { color: c.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.55 },
  sheetWrap: { flex: 1, justifyContent: 'center', padding: 20 },
  sheet: { ...card(c), backgroundColor: c.bg, maxWidth: 420, width: '100%', alignSelf: 'center', padding: 20, gap: 12 },
  eyebrow: { ...eyebrow(c, 11), color: c.label },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 26, lineHeight: 32, ...headingCase(c) },
  body: { color: c.muted, fontSize: 14, lineHeight: 20 },
  note: { color: c.faint, fontSize: 13, lineHeight: 18 },
  action: { backgroundColor: c.accent, minHeight: 46, borderRadius: c.radius, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  actionText: { color: c.onAccent, fontWeight: '700', fontSize: 15 },
  close: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: c.muted, fontWeight: '600' },
}));
