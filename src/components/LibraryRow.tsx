import { Pressable, StyleSheet, Text, View } from 'react-native';
import { durationLabel, xpFor } from '../game';
import { categoryOf, type LibraryTask } from '../library';
import { C } from '../theme';

export function perWeekLabel(n: number): string {
  if (n === 0) return 'One-time';
  if (n >= 7) return 'Every day';
  return `${n}× a week`;
}

/** A library task with a one-tap add button. */
export function LibraryRow({ task, added, onAdd }: { task: LibraryTask; added: boolean; onAdd: () => void }) {
  return (
    <Pressable onPress={added ? undefined : onAdd} style={styles.row} accessibilityRole="button">
      <Text style={styles.icon}>{categoryOf(task.category)?.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={styles.meta}>
          {durationLabel(task.minutes)} · {perWeekLabel(task.perWeek)}
        </Text>
      </View>
      <Text style={styles.xp}>+{xpFor(task.minutes, task.difficulty)} XP</Text>
      <View style={[styles.add, added && styles.added]}>
        <Text style={[styles.addText, added && { color: C.xp }]}>{added ? '✓' : '+'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  icon: { fontSize: 20 },
  title: { color: C.text, fontSize: 15, fontWeight: '600' },
  meta: { color: C.muted, fontSize: 12, marginTop: 1 },
  xp: { color: C.xp, fontSize: 12, fontWeight: '800' },
  add: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  added: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.xp },
  addText: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 20 },
});
