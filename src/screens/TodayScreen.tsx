import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Sparkles, X } from 'lucide-react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { EmptyState, BRAND_FILL, BRAND_FILL_SMALL, BRAND_INK, BRAND_TEXT_SHADOW, GradientText, VIVID_HEAVY, VividButton } from '../components/Vivid';
import { RARITY } from '../vivid';
import { LibraryRow } from '../components/LibraryRow';
import { defaultSchedule, scheduleProblem, SchedulePicker, scheduleToTask, type Schedule } from '../components/SchedulePicker';
import { StreakCard } from '../components/StreakCard';
import { TaskRow } from '../components/TaskRow';
import {
  dayLabel,
  durationLabel,
  isDoneToday,
  MAX_STEP_LENGTH,
  MAX_STEPS,
  xpFor,
  type GameState,
  type Repeat,
  type StreakStatus,
  type Task,
  type TaskPlan,
  weekDots,
  type xpMultiplier,
} from '../game';
import { CATEGORIES, FEATURED, guessCategory, librarySteps, OTHER_CATEGORY, searchLibrary, taskCategory, type LibraryTask } from '../library';
import { STEP_SHARE, suggestedSteps } from '../steps';
import { estimateMinutes } from '../estimate';
import { quoteOfTheDay } from '../quotes';
import { card, eyebrow, FONTS, themed, useStyles, useTheme, headingCase } from '../theme';

function partOfDay(hour: number): string {
  if (hour < 5) return 'evening';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function TodayScreen({
  state,
  tasks,
  upcoming,
  streak,
  multiplier,
  xpProgress,
  onOpenStreak,
  tokenStrip,
  guide,
  today,
  loaded,
  addedTitles,
  draft,
  onDraftUsed,
  onAdd,
  onOpenLibrary,
  onToggle,
  onStep,
  onDelete,
  recap,
  focusBar,
  focusingId,
  onFocus,
}: {
  state: GameState;
  tasks: Task[];
  upcoming: Task[];
  streak: StreakStatus;
  multiplier: ReturnType<typeof xpMultiplier>;
  /** Level and XP bar, shown under the greeting. */
  xpProgress?: React.ReactNode;
  onOpenStreak: () => void;
  /** Tokens to use, shown under the streak. */
  tokenStrip?: React.ReactNode;
  /** The first-steps card for new players. */
  guide?: React.ReactNode;
  today: string;
  loaded: boolean;
  addedTitles: Set<string>;
  /** A library task picked elsewhere, to plan here before adding. */
  draft?: LibraryTask;
  onDraftUsed: () => void;
  onAdd: (title: string, repeat: Repeat, minutes: number, plan: TaskPlan) => void;
  onOpenLibrary: () => void;
  onToggle: (task: Task) => { xp: number; note?: string };
  onStep: (task: Task, step: number) => { xp: number; finished: boolean; note?: string };
  onDelete: (task: Task) => void;
  /** The weekly recap card, on Sunday evening and Monday. */
  recap?: React.ReactNode;
  /** The running focus timer, when it is hidden. */
  focusBar?: React.ReactNode;
  /** The task the focus timer runs for. */
  focusingId?: string;
  onFocus: (task: Task) => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState<Schedule>(() => defaultSchedule(today));
  /** Chosen by the user; otherwise guessed from the title. */
  const [category, setCategory] = useState<string | undefined>();
  /** Steps the user edited; undefined = the suggested ones. */
  const [stepDraft, setStepDraft] = useState<string[] | undefined>();
  const [newStep, setNewStep] = useState('');
  /** The add sheet: the task form and quick picks. */
  const [adding, setAdding] = useState(false);
  const quote = quoteOfTheDay(today);
  const typed = title.trim();
  const suggestions = useMemo(
    () => (typed.length >= 2 ? searchLibrary(typed, 4).filter((t) => t.title.toLowerCase() !== typed.toLowerCase()) : []),
    [typed],
  );
  // Common tasks to start from while the field is empty.
  const quick = useMemo(() => FEATURED.filter((t) => !addedTitles.has(t.title)).slice(0, 10), [addedTitles]);
  const chosenCategory = category ?? guessCategory(typed) ?? OTHER_CATEGORY;
  // The planned day can't be left behind after midnight.
  const shownSchedule = schedule.date < today ? { ...schedule, date: today } : schedule;

  // Time is judged from the title, so it can't be inflated for XP.
  const estimate = useMemo(() => estimateMinutes(typed), [typed]);
  const chosenMinutes = estimate.minutes;
  const problem = typed ? scheduleProblem(shownSchedule, typed) : undefined;
  const canAdd = typed.length > 0 && chosenMinutes > 0 && !problem;
  const suggested = useMemo(() => suggestedSteps(typed, chosenMinutes), [typed, chosenMinutes]);
  const shownSteps = stepDraft ?? suggested;
  // Steps are offered for longer tasks, or whenever some are already there.
  const offerSteps = typed.length > 0 && (shownSteps.length > 0 || chosenMinutes >= 30);
  const stepXp = shownSteps.length ? Math.max(1, Math.round((xpFor(chosenMinutes) * STEP_SHARE) / shownSteps.length)) : 0;

  function addStep() {
    const name = newStep.trim();
    if (!name || shownSteps.length >= MAX_STEPS) return;
    setStepDraft([...shownSteps, name.slice(0, MAX_STEP_LENGTH)]);
    setNewStep('');
  }

  /** Fills the form from a library task so its days and frequency can be picked before adding. */
  function prefill(t: LibraryTask) {
    setTitle(t.title);
    setSchedule({ ...defaultSchedule(today), repeat: t.perWeek > 0, perWeek: t.perWeek > 0 ? t.perWeek : 3 });
    setCategory(t.category);
    setStepDraft(undefined);
  }

  useEffect(() => {
    if (!draft) return;
    prefill(draft);
    setAdding(true);
    onDraftUsed();
  }, [draft]);

  function reset() {
    setTitle('');
    setSchedule(defaultSchedule(today));
    setCategory(undefined);
    setStepDraft(undefined);
    setNewStep('');
  }

  function add() {
    if (!canAdd) return;
    const { repeat, plan } = scheduleToTask(shownSchedule, typed, today);
    // Library steps follow the library; anything else is saved with the task.
    const steps = stepDraft ?? (librarySteps(typed) || !suggested.length ? undefined : suggested);
    onAdd(typed, repeat, chosenMinutes, { ...plan, category: chosenCategory, ...(steps && { steps }) });
    reset();
    setAdding(false);
  }

  function closeSheet() {
    reset();
    setAdding(false);
  }

  // Today's tasks in one list, sorted by category in the library's order ("Other" last), so related tasks sit together.
  const sorted = useMemo(() => {
    const order = [...CATEGORIES.map((cat) => cat.id), OTHER_CATEGORY];
    return tasks.map((t, i) => ({ t, i, rank: order.indexOf(taskCategory(t)) })).sort((x, y) => x.rank - y.rank || x.i - y.i).map((x) => x.t);
  }, [tasks]);
  const doneCount = tasks.filter((t) => isDoneToday(state, t, today)).length;
  // A ticked task plays its theme's finish animation, then leaves the list for "Done today".
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  const [showDone, setShowDone] = useState(false);
  const openTasks = sorted.filter((t) => !isDoneToday(state, t, today) || leaving.has(t.id));
  const doneTasks = sorted.filter((t) => isDoneToday(state, t, today) && !leaving.has(t.id));
  const leave = (id: string) => setLeaving((l) => new Set(l).add(id));
  const left = (id: string) =>
    setLeaving((l) => {
      const next = new Set(l);
      next.delete(id);
      return next;
    });

  function row(item: Task, index: number) {
    const done = isDoneToday(state, item, today);
    return (
      <TaskRow
        index={index}
        task={item}
        state={state}
        today={today}
        done={done}
        leaving={leaving.has(item.id)}
        onLeft={() => left(item.id)}
        onToggle={() => {
          const result = onToggle(item);
          // Finished (with XP, or with a limit note): off it goes.
          if (!done && (result.xp > 0 || result.note)) leave(item.id);
          return result;
        }}
        onStep={(step) => {
          const result = onStep(item, step);
          if (result.finished) leave(item.id);
          return result;
        }}
        onDelete={() => onDelete(item)}
        focusing={focusingId === item.id}
        onFocus={() => onFocus(item)}
      />
    );
  }

  return (
    <>
      <Animated.FlatList
        data={openTasks}
        itemLayoutAnimation={LinearTransition.duration(260)}
        keyExtractor={(t) => t.id}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <Text style={s.greeting}>
              Good <Text style={s.greetingEm}>{partOfDay(new Date().getHours())}</Text>, {state.profile.name}.
            </Text>
            {xpProgress}

            <StreakCard streak={streak} week={weekDots(state, today)} multiplier={multiplier} onPress={onOpenStreak} />
            {tokenStrip}
            {recap}
            {focusBar}
            {guide}

            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Today's tasks</Text>
              {tasks.length > 0 && (
                <Text style={s.sectionCount}>
                  <GradientText style={s.sectionCountStrong}>{doneCount}</GradientText> / {tasks.length}
                </Text>
              )}
            </View>
            {tasks.length > 0 && openTasks.length === 0 && (
              <EmptyState glyph="Trophy" grad={RARITY.legendary} before="All " word="done" after=" for today" body="Every task is ticked off. Enjoy the rest of your day." />
            )}
          </>
        }
        ListEmptyComponent={
          loaded ? (
            <EmptyState glyph="Sparkle" mythic before="A " word="fresh" after=" start" body="No tasks for today. Tap + to add one or pick some from the library." />
          ) : undefined
        }
        ListFooterComponent={
          <>
            {doneTasks.length > 0 && (
              <View style={s.doneBox}>
                <Pressable
                  onPress={() => setShowDone((v) => !v)}
                  style={s.doneToggle}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showDone }}
                  accessibilityLabel={`Done today, ${doneTasks.length}. ${showDone ? 'Hide' : 'Show'}`}
                >
                  <Text style={s.doneLabel}>Done today · {doneTasks.length}</Text>
                  {showDone ? <ChevronUp size={16} color={c.muted} strokeWidth={1.75} aria-hidden /> : <ChevronDown size={16} color={c.muted} strokeWidth={1.75} aria-hidden />}
                </Pressable>
                {showDone && doneTasks.map((t, i) => <View key={t.id}>{row(t, i)}</View>)}
              </View>
            )}
            <View style={s.quote} accessibilityLabel={`Quote of the day: ${quote.text}, by ${quote.author}`}>
              <Text style={s.quoteLabel}>Quote of the day</Text>
              <Text style={s.quoteText}>“{quote.text}”</Text>
              <Text style={s.quoteAuthor}>{quote.author}</Text>
            </View>
            {upcoming.length > 0 && (
              <View style={s.upcoming}>
                <Text style={s.upcomingHeading}>Coming up</Text>
                {upcoming.map((t) => (
                  <View key={t.id} style={s.upcomingRow}>
                    <Text style={s.upcomingTitle} numberOfLines={1}>
                      {t.title}
                    </Text>
                    <Text style={s.upcomingDay}>{dayLabel(t.date!)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        }
        renderItem={({ item, index }) => row(item, index)}
      />

      {/* Always in reach at the bottom right, however long the list gets. */}
      <Pressable onPress={() => setAdding(true)} style={s.fab} accessibilityRole="button" accessibilityLabel="Add a task">
        <Plus size={28} color={BRAND_INK} strokeWidth={2.75} aria-hidden />
      </Pressable>

      <Modal visible={adding} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable style={s.backdrop} onPress={closeSheet} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetWrap} pointerEvents="box-none">
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Add a task</Text>
              <Pressable onPress={closeSheet} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <X size={20} color={c.muted} strokeWidth={1.75} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled">
            <View style={s.inputRow}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                onSubmitEditing={add}
                placeholder="Add a task or search ideas…"
                placeholderTextColor={c.muted}
                style={s.input}
                returnKeyType="done"
              />
              <Pressable
                onPress={add}
                disabled={!canAdd}
                style={[s.plus, !canAdd && { opacity: 0.35 }]}
                accessibilityRole="button"
                accessibilityLabel="Add task"
              >
                <Plus size={22} color={BRAND_INK} strokeWidth={2.5} />
              </Pressable>
            </View>

            {typed.length === 0 && quick.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={s.small}>Quick add</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
                  {quick.map((t) => (
                    <Pressable
                      key={t.title}
                      onPress={() => prefill(t)}
                      style={s.quick}
                      accessibilityRole="button"
                      accessibilityLabel={`Plan ${t.title}`}
                    >
                      <Plus size={14} color={c.accent} strokeWidth={2} />
                      <Text style={s.quickText}>{t.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {suggestions.length > 0 && (
              <View>
                <Text style={s.small}>Suggestions</Text>
                <View style={{ marginTop: 8 }}>
                  {suggestions.map((t) => (
                    <LibraryRow key={t.title} task={t} added={addedTitles.has(t.title)} onAdd={() => prefill(t)} />
                  ))}
                </View>
              </View>
            )}

            {typed.length > 0 && (
              <>
                <View style={s.estimate} accessibilityLabel={`Takes about ${durationLabel(chosenMinutes)}, ${xpFor(chosenMinutes)} XP`}>
                  <Sparkles size={16} color={c.accent} strokeWidth={1.5} aria-hidden />
                  <Text style={s.estimateText}>
                    About <Text style={s.estimateStrong}>{durationLabel(chosenMinutes)}</Text> · +{xpFor(chosenMinutes)} XP
                  </Text>
                  <Text style={s.estimateNote}>{estimate.source === 'default' ? 'standard time' : 'estimated from the title'}</Text>
                </View>
                <SchedulePicker value={shownSchedule} onChange={setSchedule} title={typed} today={today} />
                {offerSteps && (
                  <View style={{ gap: 8 }}>
                    <Text style={s.small}>Steps</Text>
                    <Text style={s.stepsHint}>
                      {shownSteps.length
                        ? `+${stepXp} XP for each step, the rest when you finish. The last step finishes the task.`
                        : 'Split a long task into steps to earn a little XP on the way.'}
                    </Text>
                    {shownSteps.map((st, i) => (
                      <View key={`${i}-${st}`} style={s.stepRow}>
                        <Text style={s.stepNum}>{i + 1}</Text>
                        <Text style={s.stepName}>{st}</Text>
                        <Pressable
                          onPress={() => setStepDraft(shownSteps.filter((_, j) => j !== i))}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove step ${st}`}
                        >
                          <X size={16} color={c.muted} strokeWidth={1.75} />
                        </Pressable>
                      </View>
                    ))}
                    {shownSteps.length < MAX_STEPS && (
                      <View style={s.stepRow}>
                        <TextInput
                          value={newStep}
                          onChangeText={setNewStep}
                          onSubmitEditing={addStep}
                          placeholder="Add a step"
                          placeholderTextColor={c.muted}
                          maxLength={MAX_STEP_LENGTH}
                          style={s.stepInput}
                          returnKeyType="done"
                        />
                        <Pressable onPress={addStep} disabled={!newStep.trim()} hitSlop={8} style={!newStep.trim() && { opacity: 0.35 }} accessibilityRole="button" accessibilityLabel="Add step">
                          <Plus size={18} color={c.accent} strokeWidth={2} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
                <Text style={s.small}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
                  {[...CATEGORIES, { id: OTHER_CATEGORY, label: 'Other' }].map((cat) => (
                    <Chip key={cat.id} label={cat.label} active={chosenCategory === cat.id} onPress={() => setCategory(cat.id)} />
                  ))}
                </ScrollView>
                <Pressable
                  onPress={add}
                  disabled={!canAdd}
                  style={[s.addButton, !canAdd && { opacity: 0.4 }]}
                  accessibilityRole="button"
                >
                  <Text style={s.addButtonText}>
                    {problem ? 'Pick the days first' : `Add task${canAdd ? ` · +${xpFor(chosenMinutes)} XP` : ''}`}
                  </Text>
                </Pressable>
                <Pressable onPress={reset} style={s.cancel} accessibilityRole="button">
                  <Text style={s.cancelText}>Start over</Text>
                </Pressable>
              </>
            )}

            {typed.length === 0 && (
              <VividButton
                label="Browse the task library"
                kind="secondary"
                compact
                onPress={() => {
                  closeSheet();
                  onOpenLibrary();
                }}
              />
            )}

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}


const makeStyles = themed((c) => ({
  // Room at the bottom so the + button never covers the last row.
  content: { padding: 20, paddingTop: 12, paddingBottom: 104, maxWidth: 640, width: '100%', alignSelf: 'center' },
  greeting: { fontFamily: FONTS.serif, color: c.text, fontSize: 26, lineHeight: 32, ...headingCase(c) },
  greetingEm: c.italicAccent ? { fontFamily: FONTS.serifItalic, color: c.accent } : { fontFamily: FONTS.serif, color: c.text },
  quote: { ...card(c), marginTop: 20, padding: 16, gap: 6 },
  quoteLabel: { ...eyebrow(c, 11), color: c.muted },
  quoteText: { fontFamily: FONTS.serif, fontStyle: 'italic', color: c.text, fontSize: 16, lineHeight: 23 },
  quoteAuthor: { ...eyebrow(c, 11), color: c.label },
  fab: { ...BRAND_FILL, position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 8px 24px rgba(90,80,255,0.45)' },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    ...card(c),
    backgroundColor: c.surface,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: Math.max(c.radius, 16),
    borderTopRightRadius: Math.max(c.radius, 16),
    maxHeight: '88%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 },
  sheetTitle: { fontFamily: FONTS.serif, color: c.text, fontSize: 22, ...headingCase(c) },
  sheetBody: { padding: 18, paddingTop: 8, gap: 12, paddingBottom: 32 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  plus: { width: 46, height: 46, borderRadius: 14, ...BRAND_FILL_SMALL, alignItems: 'center', justifyContent: 'center' },
  quickRow: { gap: 8, paddingRight: 4 },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  quickText: { color: c.text, fontSize: 13, fontWeight: '600' },
  cancel: { alignItems: 'center', paddingVertical: 4 },
  cancelText: { ...eyebrow(c, 11), color: c.muted },
  upcoming: { marginTop: 28, gap: 2 },
  doneBox: { marginBottom: 8 },
  doneToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  doneLabel: { ...eyebrow(c, 11), color: c.muted },
  upcomingHeading: { ...eyebrow(c), color: c.muted, marginBottom: 4 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  upcomingTitle: { flex: 1, color: c.text, fontSize: 15 },
  upcomingDay: { color: c.muted, fontSize: 13 },
  input: {
    flex: 1,
    color: c.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: c.radius,
    backgroundColor: c.surfaceAlt,
  },
  small: { ...eyebrow(c, 11), color: c.muted },
  stepsHint: { color: c.muted, fontSize: 13, lineHeight: 18 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36, borderBottomWidth: 1, borderBottomColor: c.border },
  stepNum: { fontFamily: FONTS.serif, fontStyle: 'italic', color: c.accent, fontSize: 14, width: 16, fontVariant: ['lining-nums'] },
  stepName: { flex: 1, color: c.text, fontSize: 14 },
  stepInput: { flex: 1, color: c.text, fontSize: 14, paddingVertical: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  estimate: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 2 },
  estimateText: { color: c.text, fontSize: 14 },
  estimateStrong: { fontWeight: '700' },
  estimateNote: { color: c.faint, fontSize: 12 },
  addButton: { ...BRAND_FILL, minHeight: 54, justifyContent: 'center', borderRadius: 14, alignItems: 'center' },
  addButtonText: { fontFamily: VIVID_HEAVY, fontSize: 17, color: BRAND_INK, ...BRAND_TEXT_SHADOW },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 24,
    paddingBottom: 10,
    marginBottom: c.listStyle === 'cards' ? 2 : 0,
    borderBottomWidth: c.listStyle === 'lines' ? 1 : 0,
    borderBottomColor: c.border,
  },
  sectionTitle: { fontFamily: FONTS.serif, color: c.text, fontSize: 20, ...headingCase(c) },
  sectionCount: { color: c.faint, fontSize: 13 },
  sectionCountStrong: { fontFamily: VIVID_HEAVY, fontSize: 15 },
}));
