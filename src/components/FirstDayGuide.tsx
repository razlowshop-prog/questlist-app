import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { GameState } from '../game';
import { guideSteps } from '../guide';
import { card, eyebrow, themed, useStyles, useTheme } from '../theme';
import { brandLine } from '../vivid';
import { BRAND_FILL_SMALL, BRAND_INK, BRAND_TEXT_SHADOW, VIVID_HEAVY } from './Vivid';

/**
 * A small card on Today for new players: three steps that show how the game
 * works. Each ticks itself off; the card goes once all three are done or the
 * player hides it.
 */
export function FirstDayGuide({
  state,
  totalXp,
  ticketXp,
  onOpenSpin,
  onHide,
}: {
  state: GameState;
  totalXp: number;
  /** XP earned towards tickets so far (wheel XP not counted). */
  ticketXp: number;
  onOpenSpin: () => void;
  onHide: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const steps = guideSteps(state, totalXp, ticketXp);
  if (state.settings.guideHidden || steps.every((st) => st.done)) return null;
  const next = steps.findIndex((st) => !st.done);

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.eyebrow}>Your first steps · {steps.filter((st) => st.done).length} / 3</Text>
        <Pressable onPress={onHide} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the first steps">
          <Text style={s.hide}>Hide</Text>
        </Pressable>
      </View>
      {steps.map((st, i) => (
        <View key={st.label} style={s.row} accessible accessibilityLabel={`Step ${i + 1}: ${st.label}${st.done ? ', done' : ''}`}>
          <View style={[s.dot, st.done && s.dotDone, i === next && s.dotNext]}>
            {st.done ? <Check size={13} color={BRAND_INK} strokeWidth={3} aria-hidden /> : <Text style={[s.num, i === next && { color: c.text }]}>{i + 1}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.label, st.done && s.labelDone]}>{st.label}</Text>
            {!st.done && i === next && 'note' in st && <Text style={s.note}>{st.note}</Text>}
          </View>
          {!st.done && 'ready' in st && st.ready && (
            <Pressable onPress={onOpenSpin} style={s.go} accessibilityRole="button">
              <Text style={s.goText}>Spin</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const makeStyles = themed((c) => ({
  card: { ...card(c), marginTop: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: brandLine(c.dark) },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { ...eyebrow(c, 11), color: c.muted },
  hide: { color: c.faint, fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: c.outline, alignItems: 'center', justifyContent: 'center' },
  dotDone: { ...BRAND_FILL_SMALL, borderWidth: 0 },
  dotNext: { borderColor: brandLine(c.dark), borderWidth: 2 },
  num: { color: c.faint, fontSize: 12, fontWeight: '700' },
  label: { color: c.text, fontSize: 14, fontWeight: '600' },
  labelDone: { color: c.muted, textDecorationLine: 'line-through' },
  note: { color: c.muted, fontSize: 12, marginTop: 1 },
  go: { ...BRAND_FILL_SMALL, paddingHorizontal: 14, minHeight: 32, justifyContent: 'center', borderRadius: 10 },
  goText: { color: BRAND_INK, fontFamily: VIVID_HEAVY, fontSize: 13, ...BRAND_TEXT_SHADOW },
}));
