import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react-native';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { LibraryRow, perWeekLabel } from '../components/LibraryRow';
import { defaultSchedule, SchedulePicker, scheduleSummary, scheduleToTask, type Schedule } from '../components/SchedulePicker';
import { StreakCard } from '../components/StreakCard';
import { TaskRow } from '../components/TaskRow';
import {
  dayLabel,
  DURATIONS,
  durationLabel,
  isDoneToday,
  MAX_TASK_MINUTES,
  xpFor,
  type GameState,
  type Repeat,
  type StreakStatus,
  type Task,
  type TaskPlan,
} from '../game';
import { FEATURED, searchLibrary, type LibraryTask } from '../library';
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
  upcoming: Task[];
  streak: StreakStatus;
  onOpenStreak: () => void;
  today: string;
  loaded: boolean;
  addedTitles: Set<string>;
  onAdd: (title: string, repeat: Repeat, minutes: number, plan: TaskPlan) => void;
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
  const [schedule, setSchedule] = useState<Schedule>(() => defaultSchedule(today));
  const [options, setOptions] = useState(false);
  const doneCount = tasks.filter((t) => isDoneToday(state, t, today)).length;
  const quote = quoteOfTheDay(today);
  const suggestions = useMemo(() => (title.trim().length >= 2 ? searchLibrary(title, 4) : []), [title]);
  // Common tasks for one-tap adding while the field is empty.
  const quick = useMemo(() => FEATURED.filter((t) => !addedTitles.has(t.title)).slice(0, 10), [addedTitles]);
  // Typed a library task by name and kept the defaults: use its real time and frequency.
  const known = options ? undefined : suggestions.find((t) => t.title.toLowerCase() === title.trim().toLowerCase());
  // The planned day can't be left behind after midnight.
  const shownSchedule = schedule.date < today ? { ...schedule, date: today } : schedule;

  const customMinutes = Math.min(
    (parseInt(customHours, 10) || 0) * 60 + (parseInt(customMins, 10) || 0),
    MAX_TASK_MINUTES,
  );
  const chosenMinutes = custom ? customMinutes : minutes;
  const canAdd = title.trim().length > 0 && chosenMinutes > 0;
  const summary = known
    ? `${durationLabel(known.minutes)} · ${perWeekLabel(known.perWeek)} · +${xpFor(known.minutes)} XP`
    : [
        chosenMinutes > 0 ? durationLabel(chosenMinutes) : 'Set a time',
        scheduleSummary(shownSchedule, title, today),
        ...(canAdd ? [`+${xpFor(chosenMinutes)} XP`] : []),
      ].join(' · ');

  function add() {
    if (!canAdd) return;
    if (known) {
      onAddFromLibrary(known);
      setTitle('');
      return;
    }
    const { repeat, plan } = scheduleToTask(shownSchedule, title, today);
    onAdd(title, repeat, chosenMinutes, plan);
    setTitle('');
    setSchedule(defaultSchedule(today));
    setOptions(false);
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
          <Text style={s.date}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={s.greeting}>
            Good <Text style={s.greetingEm}>{partOfDay(new Date().getHours())}</Text>, {state.profile.name}.
          </Text>

          <StreakCard streak={streak} onPress={onOpenStreak} />

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

            {title.trim().length === 0 && quick.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={s.small}>Quick add</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
                  {quick.map((t) => (
                    <Pressable
                      key={t.title}
                      onPress={() => onAddFromLibrary(t)}
                      style={s.quick}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${t.title}`}
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
                <Pressable
                  onPress={() => setOptions(!options)}
                  style={s.summary}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: options }}
                >
                  <Text style={s.summaryText} numberOfLines={2}>
                    {summary}
                  </Text>
                  <Text style={s.summaryToggle}>{options ? 'Done' : 'Options'}</Text>
                </Pressable>
                {options && (
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
                    <SchedulePicker value={shownSchedule} onChange={setSchedule} title={title} today={today} />
                    <Pressable
                      onPress={add}
                      disabled={!canAdd}
                      style={[s.addButton, !canAdd && { opacity: 0.4 }]}
                      accessibilityRole="button"
                    >
                      <Text style={s.addButtonText}>
                        Add task{canAdd ? ` · +${xpFor(chosenMinutes)} XP` : ''}
                      </Text>
                    </Pressable>
                  </>
                )}
              </>
            )}

            <Pressable onPress={onOpenLibrary} style={s.libraryButton} accessibilityRole="button">
              <Text style={s.libraryText}>Browse the task library</Text>
            </Pressable>
          </View>

          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Today</Text>
            <Text style={s.sectionCount}>
              {doneCount} of {tasks.length}
            </Text>
          </View>
        </>
      }
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
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryText: { flex: 1, color: c.muted, fontSize: 13 },
  summaryToggle: { ...eyebrow(c, 11), fontWeight: '700', color: c.accent },
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
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customInput: {
    width: 56,
    textAlign: 'center',
    color: c.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
    borderRadius: c.radius,
    backgroundColor: c.surfaceAlt,
  },
  customUnit: { color: c.muted, fontSize: 14, fontWeight: '600', marginRight: 8 },
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
