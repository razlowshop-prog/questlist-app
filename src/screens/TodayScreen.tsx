import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Sparkles, X } from 'lucide-react-native';
import Animated, { Easing, LinearTransition, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ComboPill } from '../components/Moments';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '../components/Chip';
import { QuoteFlip } from '../components/QuoteFlip';
import { ConfirmSheet } from '../components/Sheet';
import { STICKY_HEIGHT, StickyStatus } from '../components/StickyStatus';
import { brandFill, brandFillSmall, brandInk, brandTextShadow, EmptyState, GradientText, VIVID_HEAVY, VividButton } from '../components/Vivid';
import { RARITY } from '../vivid';
import { LibraryRow } from '../components/LibraryRow';
import { defaultSchedule, scheduleProblem, SchedulePicker, scheduleToTask, type Schedule } from '../components/SchedulePicker';
import { StreakCard } from '../components/StreakCard';
import { bizzyMood } from '../widgetData';
import { bizzyFormOf, canEvolve, nextBizzyForm } from '../bizzy';
import type { TalkContext } from '../bizzyTalk';
import { achievementStatuses, claimableCount } from '../achievements';
import { ticketStatus } from '../wheel';
import { TaskRow } from '../components/TaskRow';
import {
  dayLabel,
  durationLabel,
  isDoneToday,
  DEFAULT_NAME,
  levelInfo,
  MAX_STEP_LENGTH,
  nextStreakBonus,
  MAX_STEPS,
  shownName,
  totalXp,
  xpFor,
  type GameState,
  type QuoteSide,
  type Repeat,
  type StreakStatus,
  type Task,
  type TaskPlan,
  weekDots,
  type xpMultiplier,
} from '../game';
import { CATEGORIES, FEATURED, guessCategory, libraryMatch, librarySteps, libraryTitle, OTHER_CATEGORY, searchLibrary, shownTitle, taskCategory, type LibraryTask } from '../library';
import { DEFAULT_AMOUNTS, measuredTitle, parseMeasured, shownMeasuredTitle } from '../measure';
import { focusOffered } from '../focus';
import { coveredBy } from '../covers';
import { AmountPicker } from '../components/AmountPicker';
import { STEP_SHARE, suggestedSteps } from '../steps';
import { estimateMinutes, tonightHour } from '../estimate';
import { nonsenseReason } from '../sense';
import { buzz } from '../haptics';
import { quoteOfTheDay, quoteSideFor } from '../quotes';
import { card, eyebrow, FONTS, themed, useStyles, useTheme, headingCase } from '../theme';
import { N, quoted, t, tn } from '../i18n';

export function TodayScreen({
  state,
  tasks,
  upcoming,
  streak,
  multiplier,
  xpProgress,
  onOpenStreak,
  onEvolve,
  onTapBizzy,
  onOpenRewards,
  tokenStrip,
  guide,
  today,
  loaded,
  owned,
  onAdd,
  onOpenLibrary,
  onToggle,
  onStep,
  onDelete,
  recap,
  focusBar,
  combo,
  focusingId,
  onFocus,
  adding,
  onCloseAdd,
  onQuoteSide,
}: {
  state: GameState;
  tasks: Task[];
  upcoming: Task[];
  streak: StreakStatus;
  multiplier: ReturnType<typeof xpMultiplier>;
  /** Level and XP bar, shown under the greeting. */
  xpProgress?: React.ReactNode;
  onOpenStreak: () => void;
  /** Bizzy evolves into his next form (only offered once the level allows it). */
  onEvolve: () => void;
  onTapBizzy: () => void;
  /** The coming level rewards, from the XP bar in the pinned status line. */
  onOpenRewards: () => void;
  /** Tokens to use, shown under the streak. */
  tokenStrip?: React.ReactNode;
  /** The first-steps card for new players. */
  guide?: React.ReactNode;
  today: string;
  loaded: boolean;
  /** Library tasks already on the list (library ids), left out of the suggestions. */
  owned: Set<string>;
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
  /** The "×3 combo" pop-up; play changes each time it should show. */
  combo?: { count: number; play: number };
  /** The add-task sheet is open (the + in the middle of the tab bar opens it). */
  adding: boolean;
  onCloseAdd: () => void;
  /** The quote card at the top was flipped. */
  onQuoteSide: (side: QuoteSide) => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  // Once the streak card has scrolled away, a slim streak + XP line pins to the top.
  // The combo pill sits just under the XP bar and then just under that line.
  const scrollY = useSharedValue(0);
  const comboY = useSharedValue(0);
  const stickyFrom = useSharedValue(Number.MAX_SAFE_INTEGER);
  const pinned = useSharedValue(0);
  const sticky = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
    const now = e.contentOffset.y > stickyFrom.value ? 1 : 0;
    if (now !== pinned.value) {
      pinned.value = now;
      sticky.value = withTiming(now, { duration: 180, easing: Easing.out(Easing.quad) });
    }
  });
  const comboStyle = useAnimatedStyle(() => ({ top: Math.max(6 + STICKY_HEIGHT * sticky.value, comboY.value - scrollY.value) }));
  const [removing, setRemoving] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState<Schedule>(() => defaultSchedule(today));
  /** Chosen by the user; otherwise guessed from the title. */
  const [category, setCategory] = useState<string | undefined>();
  /** Steps the user edited; undefined = the suggested ones. */
  const [stepDraft, setStepDraft] = useState<string[] | undefined>();
  const [newStep, setNewStep] = useState('');
  const quote = quoteOfTheDay(today);
  const typed = title.trim();
  const suggestions = useMemo(
    () => (typed.length >= 2 ? searchLibrary(typed, 12).filter((l) => libraryTitle(l).toLowerCase() !== typed.toLowerCase() && !owned.has(l.id)).slice(0, 4) : []),
    [typed, owned],
  );
  // Common tasks to start from while the field is empty.
  const quick = useMemo(() => FEATURED.filter((t) => !owned.has(t.id)).slice(0, 10), [owned]);
  // Walk, Run and Steps: the amount is part of the title, set with the picker
  // ("Walk" on its own starts at half an hour).
  const bare = libraryMatch(typed);
  const measured = parseMeasured(typed) ?? (bare?.measure ? { measure: bare.measure, amount: DEFAULT_AMOUNTS[bare.measure] } : undefined);
  /** The title it is saved under, always the English one for library tasks: "Walk 30 min" for a bare "Walk" (or "Gehen"). */
  const finalTitle = measured ? measuredTitle(measured.measure, measured.amount) : (bare?.title ?? typed);
  const chosenCategory = category ?? guessCategory(typed) ?? OTHER_CATEGORY;
  // The planned day can't be left behind after midnight.
  const shownSchedule = schedule.date < today ? { ...schedule, date: today } : schedule;

  // Time is judged from the title, so it can't be inflated for XP.
  const estimate = useMemo(() => estimateMinutes(typed), [typed]);
  const chosenMinutes = estimate.minutes;
  const problem = typed ? scheduleProblem(shownSchedule, typed) : undefined;
  // Keyboard mash earns nothing: the title has to be made of words.
  const nonsense = typed ? nonsenseReason(typed) : undefined;
  const canAdd = typed.length > 0 && chosenMinutes > 0 && !problem && !nonsense;
  const suggested = useMemo(() => suggestedSteps(finalTitle, chosenMinutes), [finalTitle, chosenMinutes]);
  const shownSteps = stepDraft ?? suggested;
  // Steps are offered for longer tasks, or whenever some are already there.
  const offerSteps = typed.length > 0 && (shownSteps.length > 0 || chosenMinutes >= 30);
  const stepXp = shownSteps.length ? Math.max(1, Math.round((xpFor(chosenMinutes, estimate.effort) * STEP_SHARE) / shownSteps.length)) : 0;

  function addStep() {
    const name = newStep.trim();
    if (!name || shownSteps.length >= MAX_STEPS) return;
    setStepDraft([...shownSteps, name.slice(0, MAX_STEP_LENGTH)]);
    setNewStep('');
  }

  /** Fills the form from a library task so its days and frequency can be picked before adding. */
  function prefill(l: LibraryTask) {
    setTitle(l.measure ? shownMeasuredTitle(l.measure, DEFAULT_AMOUNTS[l.measure]) : libraryTitle(l));
    setSchedule({ ...defaultSchedule(today), repeat: l.perWeek > 0, perWeek: l.perWeek > 0 ? l.perWeek : 3 });
    setCategory(l.category);
    setStepDraft(undefined);
  }

  function reset() {
    setTitle('');
    setSchedule(defaultSchedule(today));
    setCategory(undefined);
    setStepDraft(undefined);
    setNewStep('');
  }

  function add() {
    if (!canAdd) {
      // A title made of keyboard mash, or days still to pick: a little error buzz instead of nothing.
      if (nonsense || problem) buzz('blocked');
      return;
    }
    const { repeat, plan } = scheduleToTask(shownSchedule, finalTitle, today);
    // Library steps follow the library; anything else is saved with the task.
    const steps = stepDraft ?? (librarySteps(finalTitle) || !suggested.length ? undefined : suggested);
    const libraryId = bare?.id;
    onAdd(finalTitle, repeat, chosenMinutes, { ...plan, category: chosenCategory, ...(steps && { steps }), ...(libraryId && { libraryId }) });
    reset();
    onCloseAdd();
  }

  function closeSheet() {
    reset();
    onCloseAdd();
  }

  // Today's tasks in one list, sorted by category in the library's order ("Other" last), so related tasks sit together.
  const sorted = useMemo(() => {
    const order = [...CATEGORIES.map((cat) => cat.id), OTHER_CATEGORY];
    return tasks.map((t, i) => ({ t, i, rank: order.indexOf(taskCategory(t)) })).sort((x, y) => x.rank - y.rank || x.i - y.i).map((x) => x.t);
  }, [tasks]);
  const doneCount = tasks.filter((t) => isDoneToday(state, t, today)).length;
  // Bizzy's mood on the streak card follows the time of day, so it is worked out again on every full hour too.
  const [hourTick, setHourTick] = useState(0);
  useEffect(() => {
    const now = new Date();
    const toNextHour = 3600000 - (now.getMinutes() * 60000 + now.getSeconds() * 1000 + now.getMilliseconds()) + 500;
    const id = setTimeout(() => setHourTick((n) => n + 1), toNextHour);
    return () => clearTimeout(id);
  }, [hourTick]);
  const mood = useMemo(() => bizzyMood(state, new Date()), [state, today, hourTick]);
  // What Bizzy knows about the day when he's tapped, worked out at the moment of the tap.
  const talk = (): TalkContext => {
    const xp = totalXp(state);
    const info = levelInfo(xp);
    const form = bizzyFormOf(state.bizzyForm).n;
    // An award close to its next tier (not the one that only needs time to pass).
    const near = achievementStatuses(state, today).find((a) => a.def.id !== 'member' && !a.def.secret && a.next && a.reached === a.claimed && a.value >= a.next.goal * 0.75);
    return {
      mood,
      name: state.profile.name === DEFAULT_NAME ? '' : state.profile.name,
      hour: new Date().getHours(),
      tasksLeft: tasks.length - doneCount,
      tasksDone: doneCount,
      streak: streak.days,
      nextBonus: nextStreakBonus(streak.days),
      level: info.level,
      xpToLevel: info.xpForLevel - info.xpIntoLevel,
      maxed: info.maxed,
      tickets: ticketStatus(state, xp).tickets,
      claimable: claimableCount(state, today),
      nearAward: near && t(near.def.title),
      canEvolve: canEvolve(form, info.level),
      evolveAt: nextBizzyForm(form)?.level,
    };
  };
  // He jumps each time another task of today gets done.
  const [cheer, setCheer] = useState(0);
  const lastDone = useRef(doneCount);
  useEffect(() => {
    if (doneCount > lastDone.current) setCheer((n) => n + 1);
    lastDone.current = doneCount;
  }, [doneCount]);
  // A ticked task plays its theme's finish animation, then leaves the list for "Done today".
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  const [showDone, setShowDone] = useState(false);
  // Tasks covered by a bigger one that is done sink to the end of the open list.
  const open = sorted
    .filter((t) => !isDoneToday(state, t, today) || leaving.has(t.id))
    .sort((x, y) => Number(!!coveredBy(state, x, today)) - Number(!!coveredBy(state, y, today)));
  // All-day willpower tasks settled in the evening wait together under "Tonight's check", earliest hour first.
  const openTasks = open.filter((t) => tonightHour(t) === undefined);
  const tonightTasks = open.filter((t) => tonightHour(t) !== undefined).sort((x, y) => tonightHour(x)! - tonightHour(y)!);
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
        onDelete={() => setRemoving(item)}
        coveredBy={coveredBy(state, item, today)?.title}
        focusing={focusingId === item.id}
        // Only where a timer fits; a timer already running stays reachable.
        onFocus={focusOffered(item) || focusingId === item.id ? () => onFocus(item) : undefined}
      />
    );
  }

  return (
    <>
      <View style={{ flex: 1 }}>
        <Animated.FlatList
          data={openTasks}
          onScroll={onScroll}
          scrollEventThrottle={16}
          itemLayoutAnimation={LinearTransition.duration(260)}
          keyExtractor={(t) => t.id}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              <QuoteFlip
                quote={quote}
                name={shownName(state.profile.name)}
                summary={tasks.length ? tn(tasks.length, '{done} of {n} task done', '{done} of {n} tasks done', { done: doneCount }) + (streak.days > 0 ? ` · ${t('{n}-day streak', { n: streak.days })}` : '') : undefined}
                side={quoteSideFor(state.settings.quoteSide, today)}
                onSide={onQuoteSide}
              />
              {xpProgress}
              {/* Where the combo pill pops up: the header starts below the list's top padding. */}
              <View onLayout={(e) => (comboY.value = HEADER_TOP + e.nativeEvent.layout.y)} />

              <View onLayout={(e) => (stickyFrom.value = HEADER_TOP + e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
                <StreakCard streak={streak} week={weekDots(state, today)} multiplier={multiplier} bizzy={{ mood, cheer, form: bizzyFormOf(state.bizzyForm).n, level: levelInfo(totalXp(state)).level, onEvolve, talk, taps: state.bizzyTaps ?? 0, onTap: onTapBizzy }} onPress={onOpenStreak} />
              </View>
              {tokenStrip}
              {recap}
              {focusBar}
              {guide}

              <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>{t('Today’s tasks')}</Text>
                {tasks.length > 0 && (
                  <Text style={s.sectionCount}>
                    <GradientText style={s.sectionCountStrong}>{doneCount}</GradientText> / {tasks.length}
                  </Text>
                )}
              </View>
              {tasks.length > 0 && open.length === 0 && (
                <EmptyState bizzy="excited" glyph="Trophy" grad={RARITY.legendary} before={t('All ')} word={t('done')} after={t(' for today')} body={t('Every task is ticked off. Enjoy the rest of your day.')} />
              )}
            </>
          }
          ListEmptyComponent={
            loaded && tasks.length === 0 ? (
              <EmptyState bizzy="wave" glyph="Sparkle" mythic before={t('A ')} word={t('fresh')} after={t(' start')} body={t('No tasks for today. Tap Add Task below to add one or pick some from the library.')} />
            ) : undefined
          }
          ListFooterComponent={
            <>
              {tonightTasks.length > 0 && (
                <View style={s.tonight}>
                  <View style={s.sectionRow}>
                    <Text style={s.sectionTitle}>{t('Tonight’s check')}</Text>
                  </View>
                  <Text style={s.tonightHint}>{t('All-day goals. Tick them off once the day is done.')}</Text>
                  {tonightTasks.map((task, i) => (
                    <View key={task.id}>{row(task, openTasks.length + i)}</View>
                  ))}
                </View>
              )}
              {doneTasks.length > 0 && (
                <View style={s.doneBox}>
                  <Pressable
                    onPress={() => setShowDone((v) => !v)}
                    style={s.doneToggle}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showDone }}
                    accessibilityLabel={t('Done today, {n}. {action}', { n: doneTasks.length, action: showDone ? t('Hide') : t('Show') })}
                  >
                    <Text style={s.doneLabel}>{t('Done today · {n}', { n: doneTasks.length })}</Text>
                    {showDone ? <ChevronUp size={16} color={c.muted} strokeWidth={1.75} aria-hidden /> : <ChevronDown size={16} color={c.muted} strokeWidth={1.75} aria-hidden />}
                  </Pressable>
                  {showDone && doneTasks.map((task, i) => <View key={task.id}>{row(task, i)}</View>)}
                </View>
              )}
              {upcoming.length > 0 && (
                <View style={s.upcoming}>
                  <Text style={s.upcomingHeading}>{t('Coming up')}</Text>
                  {upcoming.map((task) => (
                    <View key={task.id} style={s.upcomingRow}>
                      <Text style={s.upcomingTitle} numberOfLines={1}>
                        {shownTitle(task.title)}
                      </Text>
                      <Text style={s.upcomingDay}>{dayLabel(task.date!)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          }
          renderItem={({ item, index }) => row(item, index)}
        />
        <StickyStatus totalXp={totalXp(state)} streak={streak} shown={sticky} onStreak={onOpenStreak} onLevel={onOpenRewards} />
        {combo && <ComboPill count={combo.count} play={combo.play} style={comboStyle} />}
      </View>

      <ConfirmSheet
        visible={!!removing}
        title={t('Remove this task?')}
        body={removing ? t('{task} leaves your list. The XP you already earned with it stays.', { task: quoted(shownTitle(removing.title)) }) : undefined}
        confirmLabel={t('Remove')}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) onDelete(removing);
          setRemoving(null);
        }}
      />

      <Modal visible={adding} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable style={s.backdrop} onPress={closeSheet} accessibilityLabel={t('Close')} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetWrap} pointerEvents="box-none">
          <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{t('Add a task')}</Text>
              <Pressable onPress={closeSheet} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Close')}>
                <X size={20} color={c.muted} strokeWidth={1.75} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled">
            <View style={s.inputRow}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                onSubmitEditing={add}
                placeholder={t('Add a task or search ideas…')}
                placeholderTextColor={c.muted}
                style={s.input}
                returnKeyType="done"
              />
              <Pressable
                onPress={add}
                disabled={!canAdd && !nonsense && !problem}
                accessibilityState={{ disabled: !canAdd }}
                style={[s.plus, !canAdd && { opacity: 0.35 }]}
                accessibilityRole="button"
                accessibilityLabel={t('Add task')}
              >
                <Plus size={22} color={brandInk(c)} strokeWidth={2.5} />
              </Pressable>
            </View>

            {typed.length === 0 && quick.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={s.small}>{t('Quick add')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
                  {quick.map((l) => (
                    <Pressable
                      key={l.id}
                      onPress={() => prefill(l)}
                      style={s.quick}
                      accessibilityRole="button"
                      accessibilityLabel={t('Plan {task}', { task: libraryTitle(l) })}
                    >
                      <Plus size={14} color={c.accent} strokeWidth={2} />
                      <Text style={s.quickText}>{libraryTitle(l)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {suggestions.length > 0 && (
              <View>
                <Text style={s.small}>{t('Suggestions')}</Text>
                <View style={{ marginTop: 8 }}>
                  {suggestions.map((l) => (
                    <LibraryRow key={l.id} task={l} onAdd={() => prefill(l)} />
                  ))}
                </View>
              </View>
            )}

            {typed.length > 0 && (
              <>
                {nonsense ? (
                  // Hidden for the first letters, so it doesn't nag while typing.
                  typed.length >= 3 && (
                    <Text style={s.nonsense} accessibilityLiveRegion="polite">
                      {nonsense}
                    </Text>
                  )
                ) : (
                  <View style={s.estimate} accessibilityLabel={t('Takes about {time}, {xp} XP', { time: durationLabel(chosenMinutes), xp: xpFor(chosenMinutes, estimate.effort) })}>
                    <Sparkles size={16} color={c.accent} strokeWidth={1.5} aria-hidden />
                    <Text style={s.estimateText}>
                      {t('About')} <Text style={s.estimateStrong}>{durationLabel(chosenMinutes)}</Text> · +{xpFor(chosenMinutes, estimate.effort)} XP
                    </Text>
                    <Text style={s.estimateNote}>{estimate.source === 'default' ? t('standard time') : t('estimated from the title')}</Text>
                  </View>
                )}
                {measured && (
                  <AmountPicker
                    measure={measured.measure}
                    value={measured.amount}
                    onChange={(amount) => {
                      setTitle(shownMeasuredTitle(measured.measure, amount));
                      setStepDraft(undefined);
                    }}
                  />
                )}
                <SchedulePicker value={shownSchedule} onChange={setSchedule} title={typed} today={today} />
                {offerSteps && (
                  <View style={{ gap: 8 }}>
                    <Text style={s.small}>{t('Steps')}</Text>
                    <Text style={s.stepsHint}>
                      {shownSteps.length
                        ? t('+{xp} XP for each step, the rest when you finish. The last step finishes the task.', { xp: stepXp })
                        : t('Split a long task into steps to earn a little XP on the way.')}
                    </Text>
                    {shownSteps.map((st, i) => (
                      <View key={`${i}-${st}`} style={s.stepRow}>
                        <Text style={s.stepNum}>{i + 1}</Text>
                        <Text style={s.stepName}>{st}</Text>
                        <Pressable
                          onPress={() => setStepDraft(shownSteps.filter((_, j) => j !== i))}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={t('Remove step {step}', { step: st })}
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
                          placeholder={t('Add a step')}
                          placeholderTextColor={c.muted}
                          maxLength={MAX_STEP_LENGTH}
                          style={s.stepInput}
                          returnKeyType="done"
                        />
                        <Pressable onPress={addStep} disabled={!newStep.trim()} hitSlop={8} style={!newStep.trim() && { opacity: 0.35 }} accessibilityRole="button" accessibilityLabel={t('Add step')}>
                          <Plus size={18} color={c.accent} strokeWidth={2} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
                <Text style={s.small}>{t('Category')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
                  {[...CATEGORIES, { id: OTHER_CATEGORY, label: N('Other') }].map((cat) => (
                    <Chip key={cat.id} label={t(cat.label)} active={chosenCategory === cat.id} onPress={() => setCategory(cat.id)} />
                  ))}
                </ScrollView>
                <Pressable
                  onPress={add}
                  disabled={!canAdd && !nonsense && !problem}
                  accessibilityState={{ disabled: !canAdd }}
                  style={[s.addButton, !canAdd && { opacity: 0.4 }]}
                  accessibilityRole="button"
                >
                  <Text style={s.addButtonText}>
                    {nonsense ? t('Name it in words first') : problem ? t('Pick the days first') : canAdd ? t('Add task · +{xp} XP', { xp: xpFor(chosenMinutes, estimate.effort) }) : t('Add task')}
                  </Text>
                </Pressable>
                <Pressable onPress={reset} style={s.cancel} accessibilityRole="button">
                  <Text style={s.cancelText}>{t('Start over')}</Text>
                </Pressable>
              </>
            )}

            {typed.length === 0 && (
              <VividButton
                label={t('Browse the task library')}
                kind="secondary"
                compact
                onPress={() => {
                  closeSheet();
                  onOpenLibrary();
                }}
              />
            )}

            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}


/** The list's top padding, above the greeting. */
const HEADER_TOP = 12;

const makeStyles = themed((c) => ({
  nonsense: { color: c.flame, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  content: { padding: 20, paddingTop: HEADER_TOP, paddingBottom: 32, maxWidth: 640, width: '100%', alignSelf: 'center' },
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
  plus: { width: 46, height: 46, borderRadius: 14, ...brandFillSmall(c), alignItems: 'center', justifyContent: 'center' },
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
  tonight: { marginBottom: 16 },
  tonightHint: { color: c.muted, fontSize: 13, lineHeight: 18, marginTop: 6, marginBottom: 4 },
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
  addButton: { ...brandFill(c), minHeight: 54, justifyContent: 'center', borderRadius: 14, alignItems: 'center' },
  addButtonText: { fontFamily: VIVID_HEAVY, fontSize: 17, color: brandInk(c), ...brandTextShadow(c) },
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
