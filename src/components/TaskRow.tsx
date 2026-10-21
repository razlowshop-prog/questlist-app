import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import {
  doneThisWeek,
  durationLabel,
  QUICK_TICK_MS,
  repeatLabel,
  secondsUntilTickable,
  taskXp,
  timesPerWeek,
  type GameState,
  type Task,
} from '../game';
import { card, FONTS, nativeDriver, themed, useStyles, useTheme } from '../theme';

/**
 * One task, as a numbered line. Completing it fills the check with a soft
 * ring and lets a "+XP" figure rise from the row. When a limit cut the XP, a short note shows instead.
 * A freshly added task counts down until it may be ticked.
 */
export function TaskRow({
  index,
  task,
  state,
  today,
  done,
  onToggle,
  onDelete,
}: {
  /** Position in today's list, shown as 01, 02 … */
  index: number;
  task: Task;
  state: GameState;
  today: string;
  /** Returns the XP gained (0 when unticked) and a note when a limit applied. */
  onToggle: () => { xp: number; note?: string };
  done: boolean;
  onDelete: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const pop = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(1)).current;
  const [label, setLabel] = useState<{ text: string; warn: boolean } | null>(null);
  const [waitLeft, setWaitLeft] = useState(() => secondsUntilTickable(task, Date.now()));
  const waitSeconds = QUICK_TICK_MS / 1000;

  useEffect(() => {
    if (secondsUntilTickable(task, Date.now()) === 0) return;
    const timer = setInterval(() => {
      const left = secondsUntilTickable(task, Date.now());
      setWaitLeft(left);
      if (left === 0) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [task.createdAt]);
  const perWeek = timesPerWeek(task);
  const weekly = perWeek > 0 && perWeek < 7 ? ` · ${doneThisWeek(state, task, today)}/${perWeek} this week` : '';

  function press() {
    if (!done && waitLeft > 0) {
      setLabel({ text: `New tasks can be ticked ${waitSeconds} s after adding`, warn: true });
      animate(false);
      return;
    }
    const wasDone = done;
    const { xp, note } = onToggle();
    if (wasDone) return;
    setLabel(xp > 0 ? { text: `+${xp}`, warn: false } : { text: note ?? '+0 XP', warn: true });
    if (xp > 0) {
      ring.setValue(0);
      Animated.timing(ring, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }).start();
    }
    animate(xp > 0);
  }

  function animate(quick: boolean) {
    float.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pop, { toValue: 0.6, duration: 0, useNativeDriver: nativeDriver }),
        Animated.timing(pop, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(1.6)), useNativeDriver: nativeDriver }),
      ]),
      Animated.timing(float, {
        toValue: 1,
        duration: quick ? 1200 : 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: nativeDriver,
      }),
    ]).start(() => setLabel(null));
  }

  const floatStyle = {
    opacity: float.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateY: float.interpolate({ inputRange: [0, 0.2, 1], outputRange: [6, -2, -22] }) },
    ],
  };
  const rotate = c.check === 'diamond' ? [{ rotate: '45deg' }] : [];
  const ringStyle = {
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
    // Inline transforms replace the stylesheet's, so the diamond's rotation is repeated here.
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }, ...rotate],
  };
  const locked = waitLeft > 0 && !done;

  return (
    <View style={s.row}>
      <Pressable onPress={press} style={s.main} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
        <Text style={s.num}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, done && s.titleDone]}>{task.title}</Text>
          {locked ? (
            <Text style={[s.meta, s.wait]}>
              Wait {waitLeft} more {waitLeft === 1 ? 'second' : 'seconds'}
            </Text>
          ) : (
            <Text style={s.meta}>
              {task.minutes ? `${durationLabel(task.minutes)} · ` : ''}
              {repeatLabel(task)}
              {weekly}
            </Text>
          )}
        </View>
        <Text style={s.xp}>{taskXp(task)} XP</Text>
        <View style={s.checkWrap}>
          <Animated.View style={[s.ring, ringStyle]} pointerEvents="none" />
          <Animated.View style={[s.checkbox, done && s.checkboxDone, locked && s.checkboxLocked, { transform: [{ scale: pop }, ...rotate] }]}>
            {done && <Text style={[s.checkmark, c.check === 'diamond' && s.checkmarkDiamond]}>✓</Text>}
          </Animated.View>
        </View>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={10} style={s.deleteWrap} accessibilityLabel={`Delete ${task.title}`}>
        <Text style={s.delete}>✕</Text>
      </Pressable>
      {label && (
        <Animated.Text style={[s.float, label.warn && s.floatWarn, floatStyle]} pointerEvents="none">
          {label.text}
        </Animated.Text>
      )}
    </View>
  );
}

const makeStyles = themed((c) => ({
  row:
    c.listStyle === 'cards'
      ? { ...card(c), flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 10 }
      : { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  num: { fontFamily: FONTS.serif, fontStyle: 'italic', color: c.accent, fontSize: 16, width: 24, fontVariant: ['lining-nums'] },
  title: { color: c.text, fontSize: 16, fontWeight: '600' },
  titleDone: { color: c.faint, textDecorationLine: 'line-through', textDecorationColor: c.accent },
  meta: { color: c.faint, fontSize: 13, marginTop: 2 },
  wait: { color: c.flame, fontWeight: '600' },
  xp: { color: c.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
  checkWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: c.check === 'circle' ? 24 : c.check === 'square' ? Math.min(c.radius * 2, 12) : 4,
    borderWidth: 1.5,
    borderColor: c.accent,
  },
  checkbox: {
    width: c.check === 'diamond' ? 20 : 24,
    height: c.check === 'diamond' ? 20 : 24,
    borderRadius: c.check === 'circle' ? 12 : c.check === 'square' ? Math.min(c.radius, 6) : 2,
    borderWidth: 1,
    borderColor: c.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: c.accent, borderColor: c.accent },
  checkboxLocked: { borderStyle: 'dashed', opacity: 0.6 },
  checkmark: { color: c.onAccent, fontWeight: '800', fontSize: 13 },
  /** Turns the tick upright again inside the rotated diamond. */
  checkmarkDiamond: { transform: [{ rotate: '-45deg' }] },
  deleteWrap: { paddingLeft: 14, paddingVertical: 10 },
  delete: { color: c.faint, fontSize: 13 },
  float: {
    position: 'absolute',
    right: 84,
    top: 8,
    fontFamily: FONTS.serif,
    fontStyle: 'italic',
    color: c.accent,
    fontSize: 20,
  },
  floatWarn: { fontFamily: FONTS.bodySemiBold, color: c.flame, fontSize: 13, right: 0 },
}));
