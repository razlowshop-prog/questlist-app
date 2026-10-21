import { Pressable, Text } from 'react-native';
import { useStyles, type Palette } from '../theme';

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
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  active: { backgroundColor: c.accentSoft, borderColor: c.accent },
  text: { color: c.muted, fontSize: 13, fontWeight: '600' as const },
  textActive: { color: c.accent },
});
