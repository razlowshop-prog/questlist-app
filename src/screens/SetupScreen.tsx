import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { durationLabel, xpFor } from '../game';
import { CATEGORIES, categoryOf, suggestionsFor, type LibraryTask } from '../library';
import { C } from '../theme';

export interface SetupPick {
  task: LibraryTask;
  perWeek: number;
}

const FREQUENCIES = [1, 2, 3, 5, 7];

/**
 * First-launch questions: name, which areas of life to improve, then
 * suggested tasks with how often per week. Everything picked is added
 * automatically when finished.
 */
export function SetupScreen({
  initialName,
  initialGoals,
  onFinish,
  onSkip,
}: {
  initialName: string;
  initialGoals: string[];
  onFinish: (name: string, goals: string[], picks: SetupPick[]) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName === 'Player' ? '' : initialName);
  const [goals, setGoals] = useState<string[]>(initialGoals);
  // title -> times per week; only picked tasks are in here
  const [picks, setPicks] = useState<Record<string, number>>({});

  const suggestions = useMemo(() => suggestionsFor(goals), [goals]);

  function toggleGoal(id: string) {
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  function togglePick(task: LibraryTask) {
    setPicks((p) => {
      const next = { ...p };
      if (task.title in next) delete next[task.title];
      else next[task.title] = task.perWeek;
      return next;
    });
  }

  function goToTasks() {
    // Preselect the team's recommended task in each chosen area.
    const preselected: Record<string, number> = {};
    for (const g of goals) {
      const first = suggestionsFor([g]).find((t) => t.featured);
      if (first) preselected[first.title] = first.perWeek;
    }
    setPicks(preselected);
    setStep(2);
  }

  function finish() {
    const chosen = suggestions
      .filter((t) => t.title in picks)
      .map((task) => ({ task, perWeek: picks[task.title] }));
    onFinish(name, goals, chosen);
  }

  const pickedCount = Object.keys(picks).length;
  const weeklyXp = suggestions
    .filter((t) => t.title in picks)
    .reduce((sum, t) => sum + xpFor(t.minutes, t.difficulty) * picks[t.title], 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i <= step && { backgroundColor: C.accent }]} />
          ))}
        </View>
        <Pressable onPress={onSkip} hitSlop={10} accessibilityRole="button">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Text style={styles.emoji}>⚔️</Text>
            <Text style={styles.heading}>Welcome to QuestList</Text>
            <Text style={styles.sub}>
              Turn your goals into daily quests. Finish tasks, earn XP, level up and keep your streak alive.
            </Text>
            <Text style={styles.label}>What should we call you?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={C.muted}
              style={styles.input}
              maxLength={24}
              onSubmitEditing={() => setStep(1)}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.heading}>What do you want to work on?</Text>
            <Text style={styles.sub}>Pick as many areas as you like. We'll suggest tasks for each.</Text>
            <View style={styles.grid}>
              {CATEGORIES.map((c) => {
                const on = goals.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => toggleGoal(c.id)}
                    style={[styles.goal, on && styles.goalOn]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={styles.goalIcon}>{c.icon}</Text>
                    <Text style={styles.goalLabel}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.heading}>Pick your quests</Text>
            <Text style={styles.sub}>
              Tap to choose, then set how often per week. XP is based on how long each task takes.
            </Text>
            {goals.map((g) => {
              const cat = categoryOf(g);
              const tasks = suggestions.filter((t) => t.category === g);
              if (!cat || tasks.length === 0) return null;
              return (
                <View key={g} style={{ marginBottom: 14 }}>
                  <Text style={styles.section}>
                    {cat.icon} {cat.label}
                  </Text>
                  {tasks.map((t) => {
                    const on = t.title in picks;
                    return (
                      <View key={t.title} style={[styles.taskCard, on && styles.taskCardOn]}>
                        <Pressable
                          onPress={() => togglePick(t)}
                          style={styles.taskMain}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                        >
                          <View style={[styles.check, on && styles.checkOn]}>
                            {on && <Text style={styles.checkMark}>✓</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.taskTitle}>{t.title}</Text>
                            <Text style={styles.taskMeta}>
                              {durationLabel(t.minutes)} · +{xpFor(t.minutes, t.difficulty)} XP each time
                            </Text>
                          </View>
                        </Pressable>
                        {on && (
                          <View style={styles.freq}>
                            {FREQUENCIES.map((f) => (
                              <Chip
                                key={f}
                                label={f === 7 ? 'Daily' : `${f}×/wk`}
                                active={picks[t.title] === f}
                                onPress={() => setPicks((p) => ({ ...p, [t.title]: f }))}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <Text style={styles.hint}>You can add more anytime from the task library.</Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <Pressable onPress={() => setStep(step - 1)} style={styles.back} accessibilityRole="button">
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          onPress={step === 0 ? () => setStep(1) : step === 1 ? goToTasks : finish}
          disabled={step === 1 && goals.length === 0}
          style={[styles.next, step === 1 && goals.length === 0 && { opacity: 0.4 }]}
          accessibilityRole="button"
        >
          <Text style={styles.nextText}>
            {step === 2
              ? pickedCount > 0
                ? `Add ${pickedCount} ${pickedCount === 1 ? 'quest' : 'quests'} · ~${weeklyXp} XP/week`
                : 'Start without tasks'
              : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 28, height: 6, borderRadius: 3, backgroundColor: C.border },
  skip: { color: C.muted, fontSize: 15, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32, maxWidth: 640, width: '100%', alignSelf: 'center' },
  emoji: { fontSize: 56, textAlign: 'center', marginTop: 24 },
  heading: { color: C.text, fontSize: 26, fontWeight: '800', marginTop: 8 },
  sub: { color: C.muted, fontSize: 15, marginTop: 8, marginBottom: 20, lineHeight: 21 },
  label: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  input: {
    color: C.text,
    fontSize: 18,
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goal: {
    flexBasis: '45%',
    flexGrow: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  goalOn: { borderColor: C.accent, backgroundColor: '#241F4A' },
  goalIcon: { fontSize: 24 },
  goalLabel: { color: C.text, fontSize: 14, fontWeight: '700' },
  section: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  taskCard: { backgroundColor: C.card, borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  taskCardOn: { borderColor: C.accent },
  taskMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: C.accent },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 14 },
  taskTitle: { color: C.text, fontSize: 15, fontWeight: '600' },
  taskMeta: { color: C.muted, fontSize: 12, marginTop: 1 },
  freq: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  hint: { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  back: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999, borderWidth: 1, borderColor: C.border },
  backText: { color: C.text, fontWeight: '700', fontSize: 15 },
  next: { flex: 1, backgroundColor: C.xp, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  nextText: { color: '#0B1A12', fontWeight: '800', fontSize: 15 },
});
