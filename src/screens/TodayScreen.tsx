import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { LibraryRow } from '../components/LibraryRow';
import { TaskRow } from '../components/TaskRow';
import {
  DURATIONS,
  durationLabel,
  isDoneToday,
  MAX_TASK_MINUTES,
  xpFor,
  type Difficulty,
  type GameState,
  type Repeat,
  type Task,
} from '../game';
import { searchLibrary, type LibraryTask } from '../library';
import { quoteOfTheDay } from '../quotes';
import { card, themed, useStyles, useTheme } from '../theme';

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
  onToggle: (task: Task) => { xp: number; note?: string };
  onDelete: (task: Task) => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [custom, setCustom] = useState(false);
  const [customHours, setCustomHours] = useState('');
  const [customMins, setCustomMins] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [repeat, setRepeat] = useState<Repeat>(false);
  const doneCount = tasks.filter((t) => isDoneToday(state, t, today)).length;
  const quote = quoteOfTheDay(today);
  const suggestions = useMemo(() => (title.trim().length >= 2 ? searchLibrary(title, 4) : []), [title]);

  const customMinutes = Math.min(
    (parseInt(customHours, 10) || 0) * 60 + (parseInt(customMins, 10) || 0),
    MAX_TASK_MINUTES,
  );
  const chosenMinutes = custom ? customMinutes : minutes;
  const canAdd = title.trim().length > 0 && chosenMinutes > 0;

  function add() {
    if (!canAdd) return;
    onAdd(title, difficulty, repeat, chosenMinutes);
    setTitle('');
  }

  const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 2);

  return (
    <FlatList
      data={tasks}
      keyExtractor={(t) => t.id}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          <Text style={s.greeting}>Hi {state.profile.name} 👋</Text>
          <Text style={s.date}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>

          <View style={s.quote}>
            <Text style={s.quoteText}>“{quote.text}”</Text>
            <Text style={s.quoteAuthor}>{quote.author}</Text>
          </View>

          <View style={s.addCard}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={add}
              placeholder="Add a task or search ideas…"
              placeholderTextColor={c.muted}
              style={s.input}
              returnKeyType="done"
            />

            {suggestions.length > 0 && (
              <View>
                <Text style={s.small}>Suggestions</Text>
                <View style={{ marginTop: 8 }}>
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
              </View>
            )}

            {title.trim().length > 0 && (
              <>
                <Text style={s.small}>How long does it take?</Text>
                <View style={s.chipRow}>
                  {DURATIONS.map((m) => (
                    <Chip
                      key={m}
                      label={durationLabel(m)}
                      active={!custom && minutes === m}
                      onPress={() => {
                        setCustom(false);
                        setMinutes(m);
                      }}
                    />
                  ))}
                  <Chip label="Custom" active={custom} onPress={() => setCustom(true)} />
                </View>
                {custom && (
                  <View style={s.customRow}>
                    <TextInput
                      value={customHours}
                      onChangeText={(v) => setCustomHours(digits(v))}
                      placeholder="0"
                      placeholderTextColor={c.muted}
                      keyboardType="number-pad"
                      style={s.customInput}
                    />
                    <Text style={s.customUnit}>h</Text>
                    <TextInput
                      value={customMins}
                      onChangeText={(v) => setCustomMins(digits(v))}
                      placeholder="0"
                      placeholderTextColor={c.muted}
                      keyboardType="number-pad"
                      style={s.customInput}
                    />
                    <Text style={s.customUnit}>min</Text>
                  </View>
                )}
                <Text style={s.small}>How demanding?</Text>
                <View style={s.chipRow}>
                  {EFFORTS.map((e) => (
                    <Chip key={e.key} label={e.label} active={difficulty === e.key} onPress={() => setDifficulty(e.key)} />
                  ))}
                </View>
                <Text style={s.small}>How often?</Text>
                <View style={s.chipRow}>
                  {REPEATS.map((r) => (
                    <Chip key={String(r.value)} label={r.label} active={repeat === r.value} onPress={() => setRepeat(r.value)} />
                  ))}
                </View>
                <Pressable
                  onPress={add}
                  disabled={!canAdd}
                  style={[s.addButton, !canAdd && { opacity: 0.4 }]}
                  accessibilityRole="button"
                >
                  <Text style={s.addButtonText}>
                    Add task{canAdd ? ` · +${xpFor(chosenMinutes, difficulty)} XP` : ''}
                  </Text>
                </Pressable>
              </>
            )}

            <Pressable onPress={onOpenLibrary} style={s.libraryButton} accessibilityRole="button">
              <Text style={s.libraryText}>📚  Browse the task library</Text>
            </Pressable>
          </View>

          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Today</Text>
            <Text style={s.sectionCount}>
              {doneCount}/{tasks.length} done
            </Text>
          </View>
        </>
      }
      ListEmptyComponent={
        loaded ? <Text style={s.empty}>No tasks for today. Add one above or pick some from the library!</Text> : undefined
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

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  greeting: { color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  date: { color: c.muted, fontSize: 14, marginTop: 2, marginBottom: 16 },
  quote: { backgroundColor: c.accentSoft, borderRadius: 16, padding: 14, marginBottom: 16 },
  quoteText: { color: c.text, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  quoteAuthor: { color: c.accent, fontSize: 12, fontWeight: '700', marginTop: 6 },
  addCard: { ...card(c), padding: 14, gap: 12, marginBottom: 24 },
  input: {
    color: c.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
  },
  small: { color: c.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customInput: {
    width: 56,
    textAlign: 'center',
    color: c.text,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.surfaceAlt,
  },
  customUnit: { color: c.muted, fontSize: 14, fontWeight: '600', marginRight: 8 },
  addButton: { backgroundColor: c.accent, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  addButtonText: { color: c.onAccent, fontWeight: '800', fontSize: 15 },
  libraryButton: { paddingVertical: 11, borderRadius: 14, backgroundColor: c.surfaceAlt, alignItems: 'center' },
  libraryText: { color: c.text, fontWeight: '700', fontSize: 14 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  sectionTitle: { color: c.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sectionCount: { color: c.muted, fontSize: 14, fontWeight: '600' },
  empty: { color: c.muted, fontSize: 14, textAlign: 'center', marginTop: 24 },
}));
