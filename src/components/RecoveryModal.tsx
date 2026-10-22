import { Modal, Pressable, Text, View } from 'react-native';
import { streakTierName } from '../game';
import { card, eyebrow, FONTS, headingCase, themed, useStyles } from '../theme';
import type { RestOffer } from '../tokens';
import { Fire } from './Fire';
import { BRAND_FILL, BRAND_INK, VIVID_HEAVY, BRAND_TEXT_SHADOW } from './Vivid';

/**
 * The one-time free save, the first time a missed day would end the streak
 * or cost a fire tier. Kind words first, then a single clear choice.
 */
export function RecoveryModal({ offer, onAnswer }: { offer: RestOffer; onAnswer: (take: boolean) => void }) {
  const s = useStyles(makeStyles);
  const fire = streakTierName(offer.tier);
  const keep = offer.streakLost
    ? `your ${offer.keeps}-day streak${offer.tier > 0 ? ` and your ${fire} fire` : ''} going`
    : `your ${fire} fire burning`;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onAnswer(false)}>
      <View style={s.backdrop} />
      <View style={s.sheetWrap} pointerEvents="box-none">
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.fire}>
            <Fire tier={offer.tier} size={44} />
          </View>
          <Text style={s.eyebrow}>You missed yesterday</Text>
          <Text style={s.title}>That’s okay.</Text>
          <Text style={s.body}>
            Building a habit is hard, and every streak has a day like this. One missed day doesn’t undo the work you’ve
            put in. We’re here to help, so just this once we’ll keep {keep}.
          </Text>
          <Text style={s.note}>This free save only comes once. Later, rest day tokens from levels can cover a missed day.</Text>
          <Pressable onPress={() => onAnswer(true)} style={s.primary} accessibilityRole="button">
            <Text style={s.primaryText}>Keep my streak</Text>
          </Pressable>
          <Pressable onPress={() => onAnswer(false)} style={s.secondary} accessibilityRole="button">
            <Text style={s.secondaryText}>No thanks</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = themed((c) => ({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.6 },
  sheetWrap: { flex: 1, justifyContent: 'center', padding: 20 },
  sheet: { ...card(c), backgroundColor: c.bg, borderColor: c.accent, maxWidth: 420, width: '100%', alignSelf: 'center', padding: 24, gap: 12 },
  fire: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  eyebrow: { ...eyebrow(c, 11), color: c.label, textAlign: 'center' },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 30, lineHeight: 36, textAlign: 'center', ...headingCase(c) },
  body: { color: c.text, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  note: { color: c.faint, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  primary: { ...BRAND_FILL, minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryText: { color: BRAND_INK, fontFamily: VIVID_HEAVY, fontSize: 17, ...BRAND_TEXT_SHADOW },
  secondary: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: c.muted, fontWeight: '600' },
}));
