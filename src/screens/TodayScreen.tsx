import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, SectionList, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { AppIcon } from '../components/AppIcon';
import { LibraryRow } from '../components/LibraryRow';
import { defaultSchedule, scheduleProblem, SchedulePicker, scheduleToTask, type Schedule } from '../components/SchedulePicker';
import { StreakCard } from '../components/StreakCard';
import { TaskRow } from '../components/TaskRow';
import {
  dayLabel,
  durationLabel,
  isDoneToday,
  xpFor,
  type GameState,
  type Repeat,
  type StreakStatus,
  type Task,
  type TaskPlan,
} from '../game';
import { CATEGORIES, categoryOf, FEATURED, guessCategory, OTHER_CATEGORY, searchLibrary, taskCategory, type LibraryTask } from '../library';
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
  onOpenStreak,
  tokenStrip,
  today,
  loaded,
  addedTitles,
  draft,
  onDraftUsed,
  onAdd,
  onOpenLibrary,
  onToggle,
  onDelete,
}: {
  state: GameState;
  tasks: Task[];
  upcoming: Task[];
  streak: StreakStatus;
  onOpenStreak: () => void;
  /** Tokens to use, shown under the streak. */
  tokenStrip?: React.ReactNode;
  today: string;
  loaded: boolean;
  addedTitles: Set<string>;
  /** A library task picked elsewhere, to plan here before adding. */
  draft?: LibraryTask;
  onDraftUsed: () => void;
  onAdd: (title: string, repeat: Repeat, minutes: number, plan: TaskPlan) => void;
  onOpenLibrary: () => void;
  onToggle: (task: Task) => { xp: number; note?: string };
  onDelete: (task: Task) => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState<Schedule>(() => defaultSchedule(today));
  /** Chosen by the user; otherwise guessed from the title. */
  const [category, setCategory] = useState<string | undefined>();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
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

  /** Fills the form from a library task so its days and frequency can be picked before adding. */
  function prefill(t: LibraryTask) {
    setTitle(t.title);
    setSchedule({ ...defaultSchedule(today), repeat: t.perWeek > 0, perWeek: t.perWeek > 0 ? t.perWeek : 3 });
    setCategory(t.category);
  }

  useEffect(() => {
    if (!draft) return;
    prefill(draft);
    onDraftUsed();
  }, [draft]);

  function reset() {
    setTitle('');
    setSchedule(defaultSchedule(today));
    setCategory(undefined);
  }

  function add() {
    if (!canAdd) return;
    const { repeat, plan } = scheduleToTask(shownSchedule, typed, today);
    onAdd(typed, repeat, chosenMinutes, { ...plan, category: chosenCategory });
    reset();
  }

  // Today's tasks grouped by category, in the library's order, "Other" last.
  const sections = useMemo(() => {
    const order = [...CATEGORIES.map((cat) => cat.id), OTHER_CATEGORY];
    const groups = new Map<string, Task[]>();
    for (const t of tasks) {
      const id = taskCategory(t);
      groups.set(id, [...(groups.get(id) ?? []), t]);
    }
    return order
      .filter((id) => groups.has(id))
      .map((id) => {
        const all = groups.get(id)!;
        const done = all.filter((t) => isDoneToday(state, t, today)).length;
        // A finished group folds away on its own unless opened.
        const isCollapsed = collapsed[id] ?? (done === all.length && all.length > 0);
        return { id, done, total: all.length, collapsed: isCollapsed, data: isCollapsed ? [] : all };
      });
  }, [tasks, state, today, collapsed]);
  const doneCount = sections.reduce((n, sec) => n + sec.done, 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(t) => t.id}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <>
          <Text style={s.date}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={s.greeting}>
            Good <Text style={s.greetingEm}>{partOfDay(new Date().getHours())}</Text>, {state.profile.name}.
          </Text>

          <StreakCard streak={streak} onPress={onOpenStreak} />
          {tokenStrip}

          <View style={s.quote}>
            <Text style={s.quoteText}>“{quote.text}”</Text>
            <Text style={s.quoteAuthor}>{quote.author}</Text>
          </View>

          <View style={s.addCard}>
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
                <Plus size={22} color={c.onAccent} strokeWidth={2} />
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
                  <Text style={s.cancelText}>Cancel</Text>
                </Pressable>
              </>
            )}

            {typed.length === 0 && (
              <Pressable onPress={onOpenLibrary} style={s.libraryButton} accessibilityRole="button">
                <Text style={s.libraryText}>Browse the task library</Text>
              </Pressable>
            )}
          </View>

          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Today</Text>
            <Text style={s.sectionCount}>
              {doneCount} of {tasks.length}
            </Text>
          </View>
        </>
      }
      renderSectionHeader={({ section }) => {
        const cat = categoryOf(section.id);
        return (
          <Pressable
            onPress={() => setCollapsed((m) => ({ ...m, [section.id]: !section.collapsed }))}
            style={s.groupHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: !section.collapsed }}
          >
            {cat ? <AppIcon name={cat.icon} size={18} color={section.done === section.total ? c.accent : c.muted} /> : null}
            <Text style={s.groupTitle}>{cat?.label ?? 'Other'}</Text>
            <Text style={[s.groupCount, section.done === section.total && { color: c.accent }]}>
              {section.done}/{section.total}
            </Text>
            {section.collapsed ? (
              <ChevronDown size={16} color={c.muted} strokeWidth={1.5} />
            ) : (
              <ChevronUp size={16} color={c.muted} strokeWidth={1.5} />
            )}
          </Pressable>
        );
      }}
      ListEmptyComponent={
        loaded ? <Text style={s.empty}>No tasks for today. Add one above or pick some from the library.</Text> : undefined
      }
      ListFooterComponent={
        upcoming.length > 0 ? (
          <View style={s.upcoming}>
            <Text style={s.sectionTitle}>Coming up</Text>
            {upcoming.map((t) => (
              <View key={t.id} style={s.upcomingRow}>
                <Text style={s.upcomingTitle} numberOfLines={1}>
                  {t.title}
                </Text>
                <Text style={s.upcomingDay}>{dayLabel(t.date!)}</Text>
              </View>
            ))}
          </View>
        ) : undefined
      }
      renderItem={({ item, index }) => (
        <TaskRow
          index={index}
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
  content: { padding: 20, paddingTop: 12, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  date: { ...eyebrow(c), color: c.label, marginBottom: 10 },
  greeting: { fontFamily: FONTS.serif, color: c.text, fontSize: 34, lineHeight: 40, ...headingCase(c) },
  greetingEm: c.italicAccent ? { fontFamily: FONTS.serifItalic, color: c.accent } : { fontFamily: FONTS.serif, color: c.text },
  quote: { marginTop: 18, marginBottom: 22, gap: 8 },
  quoteText: { fontFamily: FONTS.serif, fontStyle: 'italic', color: c.muted, fontSize: 16, lineHeight: 24 },
  quoteAuthor: { ...eyebrow(c, 11), color: c.label },
  addCard: { ...card(c), padding: 14, gap: 12, marginBottom: 28 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  plus: { width: 46, height: 46, borderRadius: c.radius, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
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
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 18, paddingBottom: 8 },
  groupTitle: { flex: 1, color: c.text, fontSize: 15, fontWeight: '700' },
  groupCount: { color: c.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
  upcoming: { marginTop: 28, gap: 2 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  estimate: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 2 },
  estimateText: { color: c.text, fontSize: 14 },
  estimateStrong: { fontWeight: '700' },
  estimateNote: { color: c.faint, fontSize: 12 },
  addButton: { backgroundColor: c.accent, minHeight: 48, justifyContent: 'center', borderRadius: c.radius, alignItems: 'center' },
  addButtonText: { ...eyebrow(c, 13), fontWeight: '700', color: c.onAccent },
  libraryButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: c.radius,
    borderWidth: 1,
    borderColor: c.outline,
    alignItems: 'center',
  },
  libraryText: { ...eyebrow(c, 12), fontWeight: '700', color: c.text },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: 10,
    marginBottom: c.listStyle === 'cards' ? 10 : 0,
    borderBottomWidth: c.listStyle === 'lines' ? 1 : 0,
    borderBottomColor: c.border,
  },
  sectionTitle: { ...eyebrow(c), color: c.muted },
  sectionCount: { color: c.muted, fontSize: 13 },
  empty: { color: c.muted, fontSize: 14, textAlign: 'center', marginTop: 24 },
}));
