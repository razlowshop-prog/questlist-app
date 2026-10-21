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
import { card, nativeDriver, useStyles, type Palette } from '../theme';

/**
 * One task. Completing it pops the checkbox and sends a "+XP" label
 * floating up from the row. When a limit cut the XP, a short note shows instead.
 * A freshly added task counts down until it may be ticked.
 */
export function TaskRow({
  task,
  state,
  today,
  done,
  onToggle,
  onDelete,
}: {
  task: Task;
  state: GameState;
  today: string;
  /** Returns the XP gained (0 when unticked) and a note when a limit applied. */
  onToggle: () => { xp: number; note?: string };
  done: boolean;
  onDelete: () => void;
}) {
  const s = useStyles(makeStyles);
  const pop = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
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
    setLabel(xp > 0 ? { text: `+${xp} XP`, warn: false } : { text: note ?? '+0 XP', warn: true });
    animate(xp > 0);
  }

  function animate(quick: boolean) {
    float.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.25, duration: 110, useNativeDriver: nativeDriver }),
        Animated.spring(pop, { toValue: 1, friction: 3, useNativeDriver: nativeDriver }),
      ]),
      Animated.timing(float, {
        toValue: 1,
        duration: quick ? 900 : 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: nativeDriver,
      }),
    ]).start(() => setLabel(null));
  }

  const floatStyle = {
    opacity: float.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) },
      { scale: float.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.1, 1] }) },
    ],
  };

  return (
    <View style={[s.row, done && s.rowDone]}>
      <Pressable onPress={press} style={s.main} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
        <Animated.View style={[s.checkbox, done && s.checkboxDone, waitLeft > 0 && !done && s.checkboxLocked, { transform: [{ scale: pop }] }]}>
          {done && <Text style={s.checkmark}>✓</Text>}
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, done && s.titleDone]}>{task.title}</Text>
          {waitLeft > 0 && !done ? (
            <Text style={[s.meta, s.wait]}>
              ⏳ Wait {waitLeft} more {waitLeft === 1 ? 'second' : 'seconds'}
            </Text>
          ) : (
            <Text style={s.meta}>
              {task.minutes ? `${durationLabel(task.minutes)} · ` : ''}
              {repeatLabel(task)}
              {weekly}
            </Text>
          )}
        </View>
        <View style={s.xpPill}>
          <Text style={s.xpPillText}>{taskXp(task)} XP</Text>
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

const makeStyles = (c: Palette) => ({
  row: {
    ...card(c),
    borderRadius: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  rowDone: { opacity: 0.7 },
  main: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 14 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxDone: { backgroundColor: c.xp, borderColor: c.xp },
  checkboxLocked: { borderStyle: 'dashed' as const, opacity: 0.5 },
  checkmark: { color: '#FFFFFF', fontWeight: '900' as const, fontSize: 14 },
  title: { color: c.text, fontSize: 16, fontWeight: '600' as const },
  titleDone: { color: c.muted, textDecorationLine: 'line-through' as const },
  meta: { color: c.muted, fontSize: 12, marginTop: 2 },
  wait: { color: c.flame, fontWeight: '700' as const },
  xpPill: { backgroundColor: c.xpSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  xpPillText: { color: c.xp, fontSize: 12, fontWeight: '800' as const },
  deleteWrap: { paddingRight: 14, paddingLeft: 2 },
  delete: { color: c.muted, fontSize: 14, opacity: 0.6 },
  float: {
    position: 'absolute' as const,
    right: 56,
    top: 10,
    color: c.xp,
    fontSize: 20,
    fontWeight: '900' as const,
  },
  floatWarn: { color: c.flame, fontSize: 13, fontWeight: '700' as const, right: 16 },
});
