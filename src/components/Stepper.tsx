import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { themed, useStyles } from '../theme';
import { t } from '../i18n';
import { HOLD_DELAY_MS, holdPause, holdRepeats, stepped, tapCounts } from '../stepperLogic';

/** − number + control. A tap is one step; holding keeps going on long ranges (stepperLogic.ts). */
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
    const next = stepped(v, dir, step, min, max);
    if (next === v) return false;
    change(next);
    return true;
  }

  // A tap is one step on release (a touch that turns into a scroll changes nothing).
  const lastTap = useRef<number | undefined>(undefined);
  function tap(dir: 1 | -1) {
    const now = Date.now();
    if (!tapCounts(now, lastTap.current)) return;
    lastTap.current = now;
    move(dir);
  }

  // Held down on a long range: one step now, then repeats until the finger lifts or slides off.
  const repeats = holdRepeats(min, max, step);
  function hold(dir: 1 | -1) {
    lastTap.current = Date.now();
    let n = 0;
    const again = () => {
      if (move(dir)) timer.current = setTimeout(again, holdPause(n++));
    };
    again();
  }

  const button = (dir: 1 | -1, can: boolean) => (
    <Pressable
      onPress={can ? () => tap(dir) : undefined}
      onLongPress={can && repeats ? () => hold(dir) : undefined}
      delayLongPress={HOLD_DELAY_MS}
      hitSlop={6}
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
    width: 44,
    height: 44,
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
