import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { TaskRow } from '../components/TaskRow';
import { BASE_XP, isDoneToday, type Difficulty, type GameState, type Task } from '../game';
import { C } from '../theme';

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

export function TodayScreen({
  state,
  tasks,
  today,
  loaded,
  onAdd,
  onToggle,
  onDelete,
}: {
  state: GameState;
  tasks: Task[];
  today: string;
  loaded: boolean;
  onAdd: (title: string, difficulty: Difficulty, daily: boolean) => void;
  onToggle: (task: Task) => number;
  onDelete: (task: Task) => void;
}) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [daily, setDaily] = useState(false);
  const doneCount = tasks.filter((t) => isDoneToday(state, t, today)).length;

  function add() {
    if (!title.trim()) return;
    onAdd(title, difficulty, daily);
    setTitle('');
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(t) => t.id}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          <View style={styles.addCard}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={add}
              placeholder="New task, e.g. Wash the dishes"
              placeholderTextColor={C.muted}
              style={styles.input}
              returnKeyType="done"
            />
            <View style={styles.chipRow}>
              {DIFFICULTIES.map((d) => (
                <Chip
                  key={d.key}
                  label={`${d.label} · ${BASE_XP[d.key]} XP`}
                  active={difficulty === d.key}
                  onPress={() => setDifficulty(d.key)}
                />
              ))}
            </View>
            <View style={styles.chipRow}>
              <Chip label="One-time" active={!daily} onPress={() => setDaily(false)} />
              <Chip label="Every day" active={daily} onPress={() => setDaily(true)} />
              <Pressable
                onPress={add}
                style={[styles.addButton, !title.trim() && { opacity: 0.4 }]}
                accessibilityRole="button"
              >
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.sectionTitle}>
            Today · {doneCount}/{tasks.length} done
          </Text>
        </>
      }
      ListEmptyComponent={
        loaded ? <Text style={styles.empty}>No tasks yet. Add your first one above and earn XP!</Text> : undefined
      }
      renderItem={({ item }) => (
        <TaskRow
          task={item}
          done={isDoneToday(state, item, today)}
          onToggle={() => onToggle(item)}
          onDelete={() => onDelete(item)}
        />
      )}
    />
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && { color: C.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  addCard: { backgroundColor: C.card, borderRadius: 18, padding: 12, gap: 10, marginBottom: 20 },
  input: {
    color: C.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  addButton: { marginLeft: 'auto', backgroundColor: C.xp, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  addButtonText: { color: '#0B1A12', fontWeight: '800', fontSize: 14 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  empty: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 24 },
});
