import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoMark } from '../components/LogoMark';
import { newPick, pickMinutes, pickName, PickSheet, pickTitle, pickToTask, pickXp, type LibraryPick } from '../components/PickSheet';
import { scheduleProblem, scheduleSummary } from '../components/SchedulePicker';
import { sizeLabel } from '../components/LibraryRow';
import { DEFAULT_NAME } from '../game';
import { CATEGORIES, categoryOf, suggestionsFor, type LibraryTask } from '../library';
import { eyebrow, themed, useStyles, useTheme, FONTS, headingCase } from '../theme';
import { BRAND_FILL_SMALL, brandFill, brandFillSmall, brandInk, brandTextShadow, VIVID_HEAVY } from '../components/Vivid';
import { Sticker } from '../components/Vivid';
import { brandGlow, brandLine, categoryLook } from '../vivid';
import { LANGS, t, tn, type Lang } from '../i18n';

/** In both languages on purpose: whoever picks up the phone can read it. */
const LANGUAGE_LABEL = 'Language · Sprache';

/** How often a pick happens in a week, for the XP estimate: once for a one-off. */
function weeklyTimes(pick: LibraryPick, today: string): number {
  const { repeat, plan } = pickToTask(pick, today);
  if (repeat === false) return 1;
  return plan.days?.length || (repeat === true ? 7 : repeat);
}

/**
 * First-launch questions: name, which areas of life to improve, then
 * suggested tasks. Tapping one sets how often, on which days, a reminder and,
 * for Walk, Run and Steps, how much. Everything picked is added when finished.
 */
export function SetupScreen({
  initialName,
  initialGoals,
  owned,
  today,
  language,
  onLanguage,
  onFinish,
  onSkip,
}: {
  initialName: string;
  initialGoals: string[];
  /** Library tasks already on the list (when setup is run again), left out of the suggestions. */
  owned: Set<string>;
  today: string;
  /** Asked first, starting from the phone's language; the screen redraws in it straight away. */
  language: Lang;
  onLanguage: (lang: Lang) => void;
  onFinish: (name: string, goals: string[], picks: LibraryPick[]) => void;
  onSkip: () => void;
}) {
  const styles = useStyles(makeStyles);
  const C = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName === DEFAULT_NAME ? '' : initialName);
  const [goals, setGoals] = useState<string[]>(initialGoals);
  // library id -> pick; only picked tasks are in here
  const [picks, setPicks] = useState<Record<string, LibraryPick>>({});
  /** The task whose days are being set, and its pick so far. */
  const [editing, setEditing] = useState<LibraryPick | null>(null);

  const suggestions = useMemo(() => suggestionsFor(goals, 6, owned), [goals, owned]);

  function toggleGoal(id: string) {
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  /** The check box: picks with the usual days straight away, or takes it off. */
  function togglePick(task: LibraryTask) {
    setPicks((p) => {
      const next = { ...p };
      if (task.id in next) delete next[task.id];
      else next[task.id] = newPick(task, today);
      return next;
    });
  }

  function keep() {
    if (!editing || scheduleProblem(editing.schedule, pickTitle(editing))) return;
    setPicks((p) => ({ ...p, [editing.task.id]: editing }));
    setEditing(null);
  }

  function remove() {
    if (!editing) return;
    setPicks((p) => {
      const next = { ...p };
      delete next[editing.task.id];
      return next;
    });
    setEditing(null);
  }

  function goToTasks() {
    // Preselect the team's recommended task in each chosen area.
    const preselected: Record<string, LibraryPick> = {};
    for (const g of goals) {
      const first = suggestionsFor([g], 6, owned).find((t) => t.featured);
      if (first) preselected[first.id] = newPick(first, today);
    }
    setPicks(preselected);
    setStep(2);
  }

  const chosen = suggestions.filter((t) => t.id in picks).map((t) => picks[t.id]);

  function finish() {
    onFinish(name, goals, chosen);
  }

  const pickedCount = chosen.length;
  const weeklyXp = chosen.reduce((sum, p) => sum + pickXp(p) * weeklyTimes(p, today), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i <= step && BRAND_FILL_SMALL]} />
          ))}
        </View>
        <Pressable onPress={onSkip} hitSlop={10} accessibilityRole="button">
          <Text style={styles.skip}>{t('Skip')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <View style={styles.langRow} accessibilityRole="radiogroup" accessibilityLabel={LANGUAGE_LABEL}>
              {LANGS.map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => onLanguage(l.id)}
                  style={[styles.lang, language === l.id && styles.langOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: language === l.id }}
                >
                  <Text style={[styles.langText, language === l.id && styles.langTextOn]}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.mark}>
              <LogoMark textStyle={styles.wordmark} />
            </View>
            <Text style={styles.heading}>
              {/* The word between the stars is set in italics. */}
              {t('Small tasks. *Steady* rise.')
                .split('*')
                .map((part, i) => (i % 2 ? <Text key={i} style={styles.headingEm}>{part}</Text> : part))}
            </Text>
            <Text style={styles.sub}>
              {t('Turn your goals into daily tasks. Finish them, earn XP, level up and keep your streak going.')}
            </Text>
            <Text style={styles.label}>{t('What should we call you?')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('Your name')}
              placeholderTextColor={C.muted}
              style={styles.input}
              maxLength={24}
              onSubmitEditing={() => setStep(1)}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.heading}>{t('What do you want to work on?')}</Text>
            <Text style={styles.sub}>{t('Pick as many areas as you like. We’ll suggest tasks for each.')}</Text>
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
                    <Text style={styles.goalLabel}>{t(c.label)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.heading}>{t('Pick your tasks')}</Text>
            <Text style={styles.sub}>
              {t('Tap a task to choose its days and a reminder. XP is based on how long and how hard each task is.')}
            </Text>
            {goals.map((g) => {
              const cat = categoryOf(g);
              const tasks = suggestions.filter((t) => t.category === g);
              if (!cat || tasks.length === 0) return null;
              return (
                <View key={g} style={{ marginBottom: 14 }}>
                  <Text style={styles.section}>
                    {t(cat.label)}
                  </Text>
                  {tasks.map((task) => {
                    const pick = picks[task.id];
                    const shown = pick ?? newPick(task, today);
                    const minutes = pickMinutes(shown);
                    return (
                      <View key={task.id} style={[styles.taskCard, pick && styles.taskCardOn]}>
                        <View style={styles.taskMain}>
                          <Pressable
                            onPress={() => togglePick(task)}
                            hitSlop={8}
                            style={[styles.check, pick && styles.checkOn]}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: !!pick }}
                            accessibilityLabel={pickName(shown)}
                          >
                            {pick && <Text style={styles.checkMark}>✓</Text>}
                          </Pressable>
                          <Pressable
                            onPress={() => setEditing(shown)}
                            style={{ flex: 1 }}
                            accessibilityRole="button"
                            accessibilityLabel={`${pickName(shown)}. ${pick ? t('Change days and reminder') : t('Choose days and a reminder')}`}
                          >
                            <Text style={styles.taskTitle}>{pickName(shown)}</Text>
                            <Text style={styles.taskMeta}>
                              {sizeLabel(shown.task, minutes)} · {t('+{xp} XP each time', { xp: pickXp(shown) })}
                            </Text>
                            {pick && <Text style={styles.taskWhen}>{scheduleSummary(pick.schedule, pickTitle(pick), today)} · {t('Change')}</Text>}
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <Text style={styles.hint}>{t('You can add more any time from the task library.')}</Text>
          </>
        )}
      </ScrollView>

      <PickSheet
        pick={editing}
        picked={!!editing && editing.task.id in picks}
        today={today}
        onChange={setEditing}
        onKeep={keep}
        onRemove={remove}
        onClose={() => setEditing(null)}
      />

      <View style={styles.footer}>
        {step > 0 && (
          <Pressable onPress={() => setStep(step - 1)} style={styles.back} accessibilityRole="button">
            <Text style={styles.backText}>{t('Back')}</Text>
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
                ? tn(pickedCount, 'Add {n} task · ~{xp} XP/week', 'Add {n} tasks · ~{xp} XP/week', { xp: weeklyXp })
                : t('Start without tasks')
              : t('Continue')}
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
  langRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  lang: { paddingHorizontal: 16, minHeight: 38, justifyContent: 'center', borderRadius: 999, backgroundColor: c.surface },
  langOn: { ...brandFillSmall(c) },
  langText: { color: c.muted, fontWeight: '700', fontSize: 14 },
  langTextOn: { color: brandInk(c), fontFamily: VIVID_HEAVY, ...brandTextShadow(c) },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 28 },
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
  taskWhen: { color: brandLine(c), fontSize: 12, fontWeight: '700', marginTop: 3 },
  hint: { color: c.muted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: c.border },
  back: { paddingHorizontal: 20, minHeight: 48, justifyContent: 'center', borderRadius: c.radius, borderWidth: 1, borderColor: c.outline },
  backText: { color: c.text, fontWeight: '700', fontSize: 15 },
  next: { flex: 1, ...brandFill(c), minHeight: 54, justifyContent: 'center', borderRadius: 14, alignItems: 'center' },
  nextText: { color: brandInk(c), fontFamily: VIVID_HEAVY, fontSize: 17, ...brandTextShadow(c) },
}));
