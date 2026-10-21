import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { BASE_XP, type Task } from '../game';
import { C, nativeDriver } from '../theme';

/**
 * One task. Completing it pops the checkbox and sends a "+XP" label
 * floating up from the row.
 */
export function TaskRow({
  task,
  done,
  onToggle,
  onDelete,
}: {
  task: Task;
  /** Returns the XP gained, or 0 when the task was unticked. */
  onToggle: () => number;
  done: boolean;
  onDelete: () => void;
}) {
  const pop = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const [gained, setGained] = useState(0);

  function press() {
    const xp = onToggle();
    if (xp <= 0) return;
    setGained(xp);
    float.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.3, duration: 110, useNativeDriver: nativeDriver }),
        Animated.spring(pop, { toValue: 1, friction: 3, useNativeDriver: nativeDriver }),
      ]),
      Animated.timing(float, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
    ]).start(() => setGained(0));
  }

  const floatStyle = {
    opacity: float.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -46] }) },
      { scale: float.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.15, 1] }) },
    ],
  };

  return (
    <View style={[styles.row, done && { backgroundColor: C.cardDone }]}>
      <Pressable onPress={press} style={styles.main} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
        <Animated.View style={[styles.checkbox, done && styles.checkboxDone, { transform: [{ scale: pop }] }]}>
          {done && <Text style={styles.checkmark}>✓</Text>}
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, done && styles.titleDone]}>{task.title}</Text>
          <Text style={styles.meta}>
            {task.daily ? 'Every day' : 'One-time'} · {BASE_XP[task.difficulty]} XP
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={10} accessibilityLabel={`Delete ${task.title}`}>
        <Text style={styles.delete}>✕</Text>
      </Pressable>
      {gained > 0 && (
        <Animated.Text style={[styles.float, floatStyle]} pointerEvents="none">
          +{gained} XP
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    paddingRight: 14,
    marginBottom: 8,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: C.xp, borderColor: C.xp },
  checkmark: { color: '#0B1A12', fontWeight: '900', fontSize: 15 },
  title: { color: C.text, fontSize: 16, fontWeight: '600' },
  titleDone: { color: C.muted, textDecorationLine: 'line-through' },
  meta: { color: C.muted, fontSize: 12 },
  delete: { color: C.muted, fontSize: 16 },
  float: {
    position: 'absolute',
    right: 48,
    top: 12,
    color: C.xp,
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(61,214,140,0.6)',
    textShadowRadius: 8,
  },
});
