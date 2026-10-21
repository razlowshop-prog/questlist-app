import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  addTask,
  BASE_XP,
  currentStreak,
  dayKey,
  deleteTask,
  emptyState,
  isDoneToday,
  levelInfo,
  streakBonus,
  toggleTask,
  totalXp,
  visibleTasks,
  type Difficulty,
  type GameState,
  type Task,
} from './src/game';
import { loadState, saveState } from './src/storage';

const C = {
  bg: '#0F1222',
  card: '#1A1E36',
  cardDone: '#151A2B',
  text: '#F2F3FA',
  muted: '#8B90B0',
  accent: '#7C5CFF',
  xp: '#3DD68C',
  flame: '#FF8A3D',
  border: '#2A2F4F',
  danger: '#FF5C7A',
};

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

export default function App() {
  const [state, setState] = useState<GameState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [daily, setDaily] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Recomputed on each render so the list rolls over after midnight.
  const today = dayKey();

  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  const xp = totalXp(state);
  const lvl = levelInfo(xp);
  const streak = currentStreak(state.completions, today);
  const bonus = streakBonus(streak);
  const tasks = useMemo(() => visibleTasks(state, today), [state, today]);
  const doneCount = tasks.filter((t) => isDoneToday(state, t, today)).length;

  function showToast(message: string) {
    setToast(message);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  function onToggle(task: Task) {
    const wasDone = isDoneToday(state, task, today);
    const next = toggleTask(state, task.id, today);
    setState(next);
    if (wasDone) return;
    const gained = totalXp(next) - xp;
    const nextLvl = levelInfo(totalXp(next));
    if (nextLvl.level > lvl.level) {
      showToast(`🎉 Level ${nextLvl.level}! You are now ${nextLvl.rank}`);
    } else {
      showToast(`+${gained} XP`);
    }
  }

  function onAdd() {
    if (!title.trim()) return;
    setState(addTask(state, title, difficulty, daily));
    setTitle('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={styles.appTitle}>QuestList</Text>

            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelNumber}>{lvl.level}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rank}>{lvl.rank}</Text>
                  <Text style={styles.muted}>
                    {lvl.xpIntoLevel} / {lvl.xpForLevel} XP to level {lvl.level + 1}
                  </Text>
                </View>
                <View style={styles.streakBox}>
                  <Text style={styles.streakNumber}>🔥 {streak}</Text>
                  <Text style={styles.mutedSmall}>
                    {streak === 1 ? 'day' : 'days'}
                    {bonus > 0 ? ` · +${Math.round(bonus * 100)}%` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.round(lvl.progress * 100)}%` }]} />
              </View>
              <Text style={styles.mutedSmall}>
                {streak < 3
                  ? 'Finish a task 3 days in a row for a +10% XP bonus.'
                  : 'Keep your streak alive: finish at least one task every day.'}
              </Text>
            </View>

            <View style={styles.addCard}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                onSubmitEditing={onAdd}
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
                  onPress={onAdd}
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
          loaded ? (
            <Text style={[styles.muted, { textAlign: 'center', marginTop: 24 }]}>
              No tasks yet. Add your first one above and earn XP!
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            done={isDoneToday(state, item, today)}
            onToggle={() => onToggle(item)}
            onDelete={() => setState(deleteTask(state, item.id))}
          />
        )}
      />

      {toast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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

function TaskRow({
  task,
  done,
  onToggle,
  onDelete,
}: {
  task: Task;
  done: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.taskRow, done && { backgroundColor: C.cardDone }]}>
      <Pressable
        onPress={onToggle}
        style={styles.taskMain}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
      >
        <View style={[styles.checkbox, done && styles.checkboxDone]}>
          {done && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>{task.title}</Text>
          <Text style={styles.mutedSmall}>
            {task.daily ? 'Every day' : 'One-time'} · {BASE_XP[task.difficulty]} XP
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={10} accessibilityLabel={`Delete ${task.title}`}>
        <Text style={styles.delete}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  appTitle: { color: C.text, fontSize: 28, fontWeight: '800', marginTop: 8, marginBottom: 16 },
  statsCard: { backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 12, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: { color: '#fff', fontSize: 22, fontWeight: '800' },
  rank: { color: C.text, fontSize: 18, fontWeight: '700' },
  streakBox: { alignItems: 'flex-end' },
  streakNumber: { color: C.flame, fontSize: 20, fontWeight: '800' },
  barTrack: { height: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.xp, borderRadius: 5 },
  muted: { color: C.muted, fontSize: 14 },
  mutedSmall: { color: C.muted, fontSize: 12 },
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
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  addButton: {
    marginLeft: 'auto',
    backgroundColor: C.xp,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addButtonText: { color: '#0B1A12', fontWeight: '800', fontSize: 14 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    paddingRight: 14,
    marginBottom: 8,
  },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
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
  taskTitle: { color: C.text, fontSize: 16, fontWeight: '600' },
  taskTitleDone: { color: C.muted, textDecorationLine: 'line-through' },
  delete: { color: C.muted, fontSize: 16 },
  toast: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: C.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  toastText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
