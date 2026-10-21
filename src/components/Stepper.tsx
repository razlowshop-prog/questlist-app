import { Pressable, Text, View } from 'react-native';
import { themed, useStyles } from '../theme';

/** − number + control. */
export function Stepper({
  value,
  min,
  max,
  onChange,
  disabled,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  /** Read out with the number, e.g. "days a week". */
  label: string;
}) {
  const s = useStyles(makeStyles);
  const canDown = !disabled && value > min;
  const canUp = !disabled && value < max;
  return (
    <View style={[s.wrap, disabled && { opacity: 0.5 }]} accessibilityLabel={`${value} ${label}`}>
      <Pressable
        onPress={canDown ? () => onChange(value - 1) : undefined}
        style={[s.button, !canDown && s.off]}
        accessibilityRole="button"
        accessibilityLabel="Fewer"
        accessibilityState={{ disabled: !canDown }}
      >
        <Text style={s.sign}>−</Text>
      </Pressable>
      <Text style={s.value}>{value}</Text>
      <Pressable
        onPress={canUp ? () => onChange(value + 1) : undefined}
        style={[s.button, !canUp && s.off]}
        accessibilityRole="button"
        accessibilityLabel="More"
        accessibilityState={{ disabled: !canUp }}
      >
        <Text style={s.sign}>+</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = themed((c) => ({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  button: {
    width: 36,
    height: 36,
    borderRadius: c.radius,
    borderWidth: 1,
    borderColor: c.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.35 },
  sign: { color: c.text, fontSize: 18, lineHeight: 20, fontWeight: '600' },
  value: { minWidth: 34, textAlign: 'center', color: c.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums', 'lining-nums'] },
}));
