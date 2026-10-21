import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { LibraryRow } from '../components/LibraryRow';
import { TaskRow } from '../components/TaskRow';
import {
  DURATIONS,
  durationLabel,
  isDoneToday,
  xpFor,
  type Difficulty,
  type GameState,
  type Repeat,
  type Task,
} from '../game';
import { searchLibrary, type LibraryTask } from '../library';
import { quoteOfTheDay } from '../quotes';
import { C } from '../theme';

const EFFORTS: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

const REPEATS: { value: Repeat; label: string }[] = [
  { value: false, label: 'Once' },
  { value: 1, label: '1×/wk' },
  { value: 3, label: '3×/wk' },
  { value: 5, label: '5×/wk' },
  { value: true, label: 'Daily' },
];

export function TodayScreen({
  state,
  tasks,
  today,
  loaded,
  addedTitles,
  onAdd,
  onAddFromLibrary,
  onOpenLibrary,
  onToggle,
  onDelete,
}: {
  state: GameState;
  tasks: Task[];
  today: string;
  loaded: boolean;
  addedTitles: Set<string>;
  onAdd: (title: string, difficulty: Difficulty, repeat: Repeat, minutes: number) => void;
  onAddFromLibrary: (task: LibraryTask) => void;
  onOpenLibrary: () => void;
  onToggle: (task: Task) => number;
  onDelete: (task: Task) => void;
}) {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [repeat, setRepeat] = useState<Repeat>(false);
  const doneCount = tasks.filter((t) => isDoneToday(state, t, today)).length;
  const quote = quoteOfTheDay(today);
  const suggestions = useMemo(() => (title.trim().length >= 2 ? searchLibrary(title, 4) : []), [title]);

  function add() {
    if (!title.trim()) return;
    onAdd(title, difficulty, repeat, minutes);
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
          <View style={styles.quote}>
            <Text style={styles.quoteText}>“{quote.text}”</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </View>

          <View style={styles.addCard}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={add}
              placeholder="Add a task or search ideas…"
              placeholderTextColor={C.muted}
              style={styles.input}
              returnKeyType="done"
            />

            {suggestions.length > 0 && (
              <View>
                <Text style={styles.small}>Suggestions, tap + to add</Text>
                {suggestions.map((t) => (
                  <LibraryRow
                    key={t.title}
                    task={t}
                    added={addedTitles.has(t.title)}
                    onAdd={() => {
                      onAddFromLibrary(t);
                      setTitle('');
                    }}
                  />
                ))}
              </View>
            )}

            {title.trim().length > 0 && (
              <>
                <Text style={styles.small}>How long does it take?</Text>
                <View style={styles.chipRow}>
                  {DURATIONS.map((m) => (
                    <Chip key={m} label={durationLabel(m)} active={minutes === m} onPress={() => setMinutes(m)} />
                  ))}
                </View>
                <Text style={styles.small}>How demanding?</Text>
                <View style={styles.chipRow}>
                  {EFFORTS.map((e) => (
                    <Chip key={e.key} label={e.label} active={difficulty === e.key} onPress={() => setDifficulty(e.key)} />
                  ))}
                </View>
                <Text style={styles.small}>How often?</Text>
                <View style={styles.chipRow}>
                  {REPEATS.map((r) => (
                    <Chip key={String(r.value)} label={r.label} active={repeat === r.value} onPress={() => setRepeat(r.value)} />
                  ))}
                </View>
                <Pressable onPress={add} style={styles.addButton} accessibilityRole="button">
                  <Text style={styles.addButtonText}>Add task · +{xpFor(minutes, difficulty)} XP</Text>
                </Pressable>
              </>
            )}

            <Pressable onPress={onOpenLibrary} style={styles.libraryButton} accessibilityRole="button">
              <Text style={styles.libraryText}>📚 Browse the task library</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>
            Today · {doneCount}/{tasks.length} done
          </Text>
        </>
      }
      ListEmptyComponent={
        loaded ? (
          <Text style={styles.empty}>No tasks for today. Add one above or pick some from the library!</Text>
        ) : undefined
      }
      renderItem={({ item }) => (
        <TaskRow
          task={item}
          state={state}
          today={today}
          done={isDoneToday(state, item, today)}
          onToggle={() => onToggle(item)}
          onDelete={() => onDelete(item)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  quote: { borderLeftWidth: 3, borderLeftColor: C.gold, paddingLeft: 12, paddingVertical: 2, marginBottom: 16 },
  quoteText: { color: C.text, fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  quoteAuthor: { color: C.muted, fontSize: 12, marginTop: 4 },
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
  small: { color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: -2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  addButton: { backgroundColor: C.xp, paddingVertical: 11, borderRadius: 999, alignItems: 'center' },
  addButtonText: { color: '#0B1A12', fontWeight: '800', fontSize: 15 },
  libraryButton: { paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  libraryText: { color: C.text, fontWeight: '700', fontSize: 14 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  empty: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 24 },
});
