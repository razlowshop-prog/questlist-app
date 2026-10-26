import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { themed, useStyles } from '../theme';
import { t } from '../i18n';

/**
 * A tap is exactly one step, on release, so a touch that turns into a scroll
 * changes nothing. Holding keeps stepping: first after HOLD_DELAY_MS, then
 * calmly at HOLD_EVERY_MS, a little faster after HOLD_FAST_AFTER steps.
 */
const HOLD_DELAY_MS = 550;
const HOLD_EVERY_MS = 250;
const HOLD_FAST_MS = 120;
const HOLD_FAST_AFTER = 8;

/** The wait before the n-th repeat (0-based) while a button is held. */
function holdPause(n: number): number {
  return n < HOLD_FAST_AFTER ? HOLD_EVERY_MS : HOLD_FAST_MS;
}

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
  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);

  function move(dir: 1 | -1): boolean {
    const { value: v, onChange: change } = latest.current;
    const next = Math.min(max, Math.max(min, Math.round((v + dir * step) * 100) / 100));
    if (next === v) return false;
    change(next);
    return true;
  }

  // Held down: one step now, then repeats until the finger lifts or slides off.
  function hold(dir: 1 | -1) {
    let n = 0;
    const again = () => {
      if (move(dir)) timer.current = setTimeout(again, holdPause(n++));
    };
    again();
  }

  const button = (dir: 1 | -1, can: boolean) => (
    <Pressable
      onPress={can ? () => move(dir) : undefined}
      onLongPress={can ? () => hold(dir) : undefined}
      delayLongPress={HOLD_DELAY_MS}
      onPressOut={stop}
      style={[s.button, !can && s.off]}
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? t('Fewer') : t('More')}
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
