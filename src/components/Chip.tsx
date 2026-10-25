import { Pressable, Text } from 'react-native';
import { useStyles, type Palette } from '../theme';
import { brandFillSmall, brandInk, brandTextShadow, VIVID_HEAVY } from './Vivid';

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
  active: { ...brandFillSmall(c), borderColor: 'transparent' },
  text: { color: c.muted, fontSize: 13, fontWeight: '600' as const },
  textActive: { color: brandInk(c), fontFamily: VIVID_HEAVY, ...brandTextShadow(c) },
});
