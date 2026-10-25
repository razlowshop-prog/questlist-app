import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoMark } from '../components/LogoMark';
import { Stepper } from '../components/Stepper';
import { durationLabel, maxPerWeek, xpFor } from '../game';
import { CATEGORIES, categoryOf, suggestionsFor, type LibraryTask } from '../library';
import { eyebrow, themed, useStyles, useTheme, FONTS, headingCase } from '../theme';
import { BRAND_FILL_SMALL, brandFill, brandFillSmall, brandInk, brandTextShadow, VIVID_HEAVY } from '../components/Vivid';
import { Sticker } from '../components/Vivid';
import { brandGlow, brandLine, categoryLook } from '../vivid';

export interface SetupPick {
  task: LibraryTask;
  perWeek: number;
}


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
  const styles = useStyles(makeStyles);
  const C = useTheme();
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
    .reduce((sum, t) => sum + xpFor(t.minutes) * picks[t.title], 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i <= step && BRAND_FILL_SMALL]} />
          ))}
        </View>
        <Pressable onPress={onSkip} hitSlop={10} accessibilityRole="button">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <View style={styles.mark}>
              <LogoMark textStyle={styles.wordmark} />
            </View>
            <Text style={styles.heading}>
              Small tasks. <Text style={styles.headingEm}>Steady</Text> rise.
            </Text>
            <Text style={styles.sub}>
              Turn your goals into daily tasks. Finish them, earn XP, level up and keep your streak going.
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
                    <Sticker grad={categoryLook(c.id)} glyph={categoryLook(c.id).glyph} size={34} dim={!on} />
                    <Text style={styles.goalLabel}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.heading}>Pick your tasks</Text>
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
                    {cat.label}
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
                              {durationLabel(t.minutes)} · +{xpFor(t.minutes)} XP each time
                            </Text>
                          </View>
                        </Pressable>
                        {on && (
                          <View style={styles.freq}>
                            <Stepper
                              value={Math.min(picks[t.title], maxPerWeek(t.title))}
                              min={1}
                              max={maxPerWeek(t.title)}
                              onChange={(n) => setPicks((p) => ({ ...p, [t.title]: n }))}
                              label="days a week"
                            />
                            <Text style={styles.freqLabel}>
                              {maxPerWeek(t.title) === 1 ? 'once a week' : picks[t.title] >= 7 ? 'every day' : 'days a week'}
                            </Text>
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
                ? `Add ${pickedCount} ${pickedCount === 1 ? 'task' : 'tasks'} · ~${weeklyXp} XP/week`
                : 'Start without tasks'
              : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = themed((c) => ({
  safe: { flex: 1, backgroundColor: c.bg, ...(c.bgImage && { backgroundImage: c.bgImage }) },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 28, height: 6, borderRadius: 3, backgroundColor: c.border },
  skip: { color: c.muted, fontSize: 15, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32, maxWidth: 640, width: '100%', alignSelf: 'center' },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28, marginBottom: 28 },
  wordmark: { fontFamily: FONTS.serif, color: c.text, fontSize: 24, letterSpacing: 4.8 },
  headingEm: c.italicAccent ? { fontFamily: FONTS.serifItalic, color: c.accent } : { fontFamily: FONTS.serif, color: c.text },
  heading: { fontFamily: FONTS.serif, color: c.text, fontSize: 30, lineHeight: 36, marginTop: 8, ...headingCase(c) },
  sub: { color: c.muted, fontSize: 15, marginTop: 8, marginBottom: 20, lineHeight: 21 },
  label: { color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  input: {
    color: c.text,
    fontSize: 18,
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: c.radius,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goal: {
    flexBasis: '45%',
    flexGrow: 1,
    backgroundColor: c.surface,
    borderRadius: c.radius,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  goalOn: { borderColor: brandLine(c), backgroundColor: c.surface, boxShadow: `0px 0px 12px ${brandGlow(0.3)}` },
  goalLabel: { color: c.text, fontSize: 14, fontWeight: '700' },
  section: { ...eyebrow(c), color: c.muted, marginBottom: 10 },
  taskCard: { backgroundColor: c.surface, borderRadius: c.radius, marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  taskCardOn: { borderColor: brandLine(c) },
  taskMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { ...brandFillSmall(c), borderColor: 'transparent' },
  checkMark: { color: brandInk(c), fontWeight: '700', fontSize: 14, ...brandTextShadow(c) },
  taskTitle: { color: c.text, fontSize: 15, fontWeight: '600' },
  taskMeta: { color: c.muted, fontSize: 12, marginTop: 1 },
  freq: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingBottom: 12 },
  freqLabel: { color: c.muted, fontSize: 14 },
  hint: { color: c.muted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: c.border },
  back: { paddingHorizontal: 20, minHeight: 48, justifyContent: 'center', borderRadius: c.radius, borderWidth: 1, borderColor: c.outline },
  backText: { color: c.text, fontWeight: '700', fontSize: 15 },
  next: { flex: 1, ...brandFill(c), minHeight: 54, justifyContent: 'center', borderRadius: 14, alignItems: 'center' },
  nextText: { color: brandInk(c), fontFamily: VIVID_HEAVY, fontSize: 17, ...brandTextShadow(c) },
}));
