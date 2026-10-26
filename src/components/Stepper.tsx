import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { themed, useStyles } from '../theme';

/** Holding − or + keeps stepping: first after this long, then at this pace. */
const HOLD_DELAY_MS = 400;
const HOLD_EVERY_MS = 90;

/** − number + control. Holding a button keeps going. */
export function Stepper({
  value,
  min,
  max,
  step = 1,
  format = String,
  onChange,
  disabled,
  label,
}: {
  value: number;
  min: number;
  max: number;
  /** How much one tap changes it. */
  step?: number;
  /** How the number is shown, e.g. "25 min". */
  format?: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
  /** Read out with the number, e.g. "days a week". */
  label: string;
}) {
  const s = useStyles(makeStyles);
  const canDown = !disabled && value > min;
  const canUp = !disabled && value < max;
  // The newest value and handler, for the repeat timer.
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** When the last touch let go: it already stepped on press-in, so the press right after mustn't step again. */
  const released = useRef(0);
  const stop = () => {
    clearTimeout(timer.current);
    released.current = Date.now();
  };
  useEffect(() => stop, []);

  function move(dir: 1 | -1): boolean {
    const { value: v, onChange: change } = latest.current;
    const next = Math.min(max, Math.max(min, Math.round((v + dir * step) * 100) / 100));
    if (next === v) return false;
    change(next);
    return true;
  }

  function pressIn(dir: 1 | -1) {
    if (!move(dir)) return;
    const again = () => {
      if (move(dir)) timer.current = setTimeout(again, HOLD_EVERY_MS);
    };
    timer.current = setTimeout(again, HOLD_DELAY_MS);
  }

  // Screen readers press without a press-in.
  function press(dir: 1 | -1) {
    if (Date.now() - released.current > 250) move(dir);
  }

  const button = (dir: 1 | -1, can: boolean) => (
    <Pressable
      onPressIn={can ? () => pressIn(dir) : undefined}
      onPressOut={stop}
      onPress={can ? () => press(dir) : undefined}
      style={[s.button, !can && s.off]}
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? 'Fewer' : 'More'}
      accessibilityState={{ disabled: !can }}
    >
      <Text style={s.sign}>{dir < 0 ? '−' : '+'}</Text>
    </Pressable>
  );

  return (
    <View style={[s.wrap, disabled && { opacity: 0.5 }]} accessibilityLabel={`${format(value)} ${label}`}>
      {button(-1, canDown)}
      <Text style={s.value}>{format(value)}</Text>
      {button(1, canUp)}
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
