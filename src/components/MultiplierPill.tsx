import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { nextStreakBonus, type xpMultiplier } from '../game';
import { card, eyebrow, FONTS, themed, useStyles, useTheme } from '../theme';
import { GOLD } from './Fortuna';
import { TOKEN_ICONS } from './RewardPicture';
import { BRAND } from '../vivid';
import { BRAND_TEXT_SHADOW, brandFill, brandInk, brandTextShadow, VIVID_HEAVY } from './Vivid';
import { lang, t, tn } from '../i18n';

type Multiplier = ReturnType<typeof xpMultiplier>;

/** 1.5 -> "1.5", 1.875 -> "1.88" (with a decimal comma in German) */
export function fmtX(x: number): string {
  const text = String(Math.round(x * 100) / 100);
  return lang() === 'de' ? text.replace('.', ',') : text;
}

/**
 * The XP multiplier as a pill ("× 1.5 XP"). Tapping it opens what it's made
 * of and the next streak step. Fortuna and Gold use their own gold; every
 * other theme the blue-violet brand gradient with white text.
 */
export function MultiplierPill({ multiplier, size = 'normal' }: { multiplier: Multiplier; size?: 'small' | 'normal' }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const fortuna = c.check === 'coin' || !!c.brand;
  const colors = fortuna ? [GOLD.light, GOLD.mid, GOLD.deep] : [BRAND.c1, BRAND.c2];
  const ink = fortuna ? GOLD.ink : BRAND.ink;
  const boosted = multiplier.total > 1;
  // A 2x XP token is on today: the lightning shows it here, the one place the boost is shown.
  const doubled = multiplier.parts.some((p) => p.label === 'Double XP');
  const next = nextStreakBonus(multiplier.streak);
  const small = size === 'small';
  const id = `pill-${fortuna ? 'gold' : 'brand'}`;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={[s.pill, small && s.pillSmall, !boosted && { opacity: 0.75 }]}
        accessibilityRole="button"
        accessibilityLabel={t('XP multiplier times {x}. Show what it’s made of', { x: fmtX(multiplier.total) })}
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
        {doubled && <TOKEN_ICONS.double size={small ? 11 : 13} color={ink} strokeWidth={2.25} aria-hidden />}
        <Text numberOfLines={1} style={[s.pillText, small && s.pillTextSmall, { color: ink }, !fortuna && BRAND_TEXT_SHADOW]}>× {fmtX(multiplier.total)} XP</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t('Close')} />
        <SafeAreaView style={s.center} pointerEvents="box-none">
          <View style={s.sheet}>
            <Text style={s.eyebrow}>{t('XP multiplier')}</Text>
            <Text style={s.big}>× {fmtX(multiplier.total)}</Text>
            <Text style={s.note}>{t('Every task you finish today earns its XP times this.')}</Text>
            <View style={s.rows}>
              {multiplier.parts.map((p) => (
                <View key={p.label} style={s.row}>
                  <Text style={s.rowLabel}>
                    {p.label === 'Streak' ? `${t('Streak')} · ${tn(multiplier.streak, '{n} day', '{n} days')}` : t(p.label)}
                  </Text>
                  <Text style={[s.rowValue, p.x > 1 && { color: c.accent }]}>× {fmtX(p.x)}</Text>
                </View>
              ))}
            </View>
            {next && (
              <Text style={s.note}>
                {tn(next.daysLeft, 'Keep your streak {n} more day for × {x}.', 'Keep your streak {n} more days for × {x}.', { x: fmtX(1 + next.bonus) })}
              </Text>
            )}
            {!boosted && <Text style={s.note}>{t('Streaks, Double XP tokens and comeback days raise it.')}</Text>}
            <Pressable onPress={() => setOpen(false)} style={s.button} accessibilityRole="button">
              <Text style={s.buttonText}>{t('Got it')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const makeStyles = themed((c) => ({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 3, boxShadow: '0px 0px 0px 1.5px #0e0b12' },
  // On the streak card: the same height, font and soft shadow in every theme (asked 2026-11-01).
  pillSmall: { height: 22, flexShrink: 0, paddingHorizontal: 8, paddingVertical: 0, gap: 4, boxShadow: '0px 1px 4px rgba(0,0,0,0.28)' },
  pillText: { fontFamily: FONTS.bodyExtraBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  pillTextSmall: { fontFamily: VIVID_HEAVY, fontSize: 12, lineHeight: 15 },
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
  button: { marginTop: 6, minHeight: 50, borderRadius: 14, ...brandFill(c), alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: brandInk(c), fontFamily: VIVID_HEAVY, fontSize: 16, ...brandTextShadow(c) },
}));
