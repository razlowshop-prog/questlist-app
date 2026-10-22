import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { nextStreakBonus, type xpMultiplier } from '../game';
import { card, eyebrow, FONTS, themed, useStyles, useTheme } from '../theme';
import { GOLD } from './Fortuna';
import { GOLD_FILL, GOLD_INK, VIVID_HEAVY } from './Vivid';

type Multiplier = ReturnType<typeof xpMultiplier>;

/** 1.5 -> "1.5", 1.875 -> "1.88" */
export function fmtX(x: number): string {
  return `${Math.round(x * 100) / 100}`;
}

/**
 * The XP multiplier as a gold pill ("× 1.5 XP"). Tapping it opens what it's
 * made of and the next streak step. Fortuna uses its own gold; every other
 * theme the legendary orange-gold of the rewards layer, so it always stands out.
 */
export function MultiplierPill({ multiplier, size = 'normal' }: { multiplier: Multiplier; size?: 'small' | 'normal' }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const fortuna = c.check === 'coin';
  const colors = fortuna ? [GOLD.light, GOLD.mid, GOLD.deep] : ['#FFE066', '#FFB020', '#FF7A00'];
  const ink = fortuna ? GOLD.ink : '#4A2600';
  const boosted = multiplier.total > 1;
  const next = nextStreakBonus(multiplier.streak);
  const small = size === 'small';
  const id = `pill-${fortuna ? 'gold' : 'legendary'}`;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={[s.pill, small && s.pillSmall, !boosted && { opacity: 0.75 }]}
        accessibilityRole="button"
        accessibilityLabel={`XP multiplier times ${fmtX(multiplier.total)}. Show what it's made of`}
      >
        <Svg width="100%" height="100%" style={{ position: 'absolute', left: 0, top: 0 }} preserveAspectRatio="none" viewBox="0 0 100 20">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              {colors.map((col, i) => (
                <Stop key={col} offset={i / (colors.length - 1)} stopColor={col} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect width={100} height={20} fill={`url(#${id})`} />
        </Svg>
        <Text style={[s.pillText, small && s.pillTextSmall, { color: ink }]}>× {fmtX(multiplier.total)} XP</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={s.center} pointerEvents="box-none">
          <View style={s.sheet}>
            <Text style={s.eyebrow}>XP multiplier</Text>
            <Text style={s.big}>× {fmtX(multiplier.total)}</Text>
            <Text style={s.note}>Every task you finish today earns its XP times this.</Text>
            <View style={s.rows}>
              {multiplier.parts.map((p) => (
                <View key={p.label} style={s.row}>
                  <Text style={s.rowLabel}>
                    {p.label === 'Streak' ? `Streak · ${multiplier.streak} ${multiplier.streak === 1 ? 'day' : 'days'}` : p.label}
                  </Text>
                  <Text style={[s.rowValue, p.x > 1 && { color: c.accent }]}>× {fmtX(p.x)}</Text>
                </View>
              ))}
            </View>
            {next && (
              <Text style={s.note}>
                Keep your streak {next.daysLeft} more {next.daysLeft === 1 ? 'day' : 'days'} for × {fmtX(1 + next.bonus)}.
              </Text>
            )}
            {!boosted && <Text style={s.note}>Streaks, Double XP tokens and comeback days raise it.</Text>}
            <Pressable onPress={() => setOpen(false)} style={s.button} accessibilityRole="button">
              <Text style={s.buttonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = themed((c) => ({
  pill: { borderRadius: 999, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 3, boxShadow: '0px 2px 10px rgba(255,170,40,0.35)' },
  pillSmall: { paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontFamily: FONTS.bodyExtraBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  pillTextSmall: { fontSize: 11 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.55 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  sheet: { ...card(c), backgroundColor: c.bg, maxWidth: 380, width: '100%', alignSelf: 'center', padding: 22, gap: 10 },
  eyebrow: { ...eyebrow(c), color: c.label },
  big: { fontFamily: FONTS.serif, color: c.text, fontSize: 40, lineHeight: 46, fontVariant: ['lining-nums'] },
  note: { color: c.muted, fontSize: 14, lineHeight: 20 },
  rows: { gap: 8, paddingVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: c.text, fontSize: 15 },
  rowValue: { color: c.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  button: { marginTop: 6, minHeight: 50, borderRadius: 14, ...GOLD_FILL, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: GOLD_INK, fontFamily: VIVID_HEAVY, fontSize: 16 },
}));
