import { Pressable, Text } from 'react-native';
import { useStyles, type Palette } from '../theme';
import { BRAND_FILL_SMALL, BRAND_INK, VIVID_HEAVY, BRAND_TEXT_SHADOW } from './Vivid';

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, active && s.active]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[s.text, active && s.textActive]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => ({
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  // Selected chips wear the gold gradient on every theme (vivid spec).
  active: { ...BRAND_FILL_SMALL, borderColor: 'transparent' },
  text: { color: c.muted, fontSize: 13, fontWeight: '600' as const },
  textActive: { color: BRAND_INK, fontFamily: VIVID_HEAVY, ...BRAND_TEXT_SHADOW },
});
