import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME } from '../brand';
import { Chip } from '../components/Chip';
import { LibraryRow } from '../components/LibraryRow';
import { newPick, PickSheet, pickTitle, pickXp, type LibraryPick } from '../components/PickSheet';
import { libraryEffort } from '../effort';
import { xpFor } from '../game';
import { scheduleProblem } from '../components/SchedulePicker';
import { VividButton } from '../components/Vivid';
import { CATEGORIES, FEATURED, LIBRARY, searchLibrary, sortTasks, WILLPOWER_FILTER, type LibraryTask } from '../library';
import { themed, useStyles, useTheme, FONTS, headingCase } from '../theme';

/** "3 tasks · +55 XP": what the picks are worth when each is done once. */
export function picksSummary(picks: LibraryPick[]): { count: number; xp: number } {
  return { count: picks.length, xp: picks.reduce((sum, p) => sum + pickXp(p), 0) };
}

type Sort = 'best' | 'xp' | 'quick';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'best', label: 'Best match' },
  { key: 'xp', label: 'Most XP' },
  { key: 'quick', label: 'Quickest' },
];

/**
 * Full-screen browser for the task library: search, categories, recommended.
 * Tasks already on the player's list are left out. Tapping a task asks how
 * often and on which day, then puts it on a list and comes back here, so
 * several can be picked; the bar at the bottom adds them all at once. Closing
 * keeps the list for next time.
 */
export function LibraryModal({
  visible,
  owned,
  today,
  onAddMany,
  onClose,
}: {
  visible: boolean;
  /** Library tasks already on the list (library ids). */
  owned: Set<string>;
  today: string;
  onAddMany: (picks: LibraryPick[]) => void;
  onClose: () => void;
}) {
  const styles = useStyles(makeStyles);
  const C = useTheme();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [sort, setSort] = useState<Sort>('best');
  const [picks, setPicks] = useState<LibraryPick[]>([]);
  /** The task whose days are being picked, and its schedule so far. */
  const [editing, setEditing] = useState<LibraryPick | null>(null);
  const picked = useMemo(() => new Set(picks.map((p) => p.task.id)), [picks]);
  // Tasks added elsewhere since they were picked drop off the list.
  const waiting = picks.filter((p) => !owned.has(p.task.id));
  const { count, xp } = picksSummary(waiting);

  function open(task: LibraryTask) {
    // The library's usual frequency to start from, as on the add form.
    setEditing(picks.find((p) => p.task.id === task.id) ?? newPick(task, today));
  }

  function keep() {
    if (!editing || scheduleProblem(editing.schedule, pickTitle(editing))) return;
    setPicks((ps) => [...ps.filter((p) => p.task.id !== editing.task.id), editing]);
    setEditing(null);
  }

  function remove() {
    if (!editing) return;
    setPicks((ps) => ps.filter((p) => p.task.id !== editing.task.id));
    setEditing(null);
  }

  function addAll() {
    if (!waiting.length) return;
    onAddMany(waiting);
    setPicks([]);
  }

  // Sorting by XP or time looks through the whole library, not just the recommended picks.
  const browsing = !query.trim() && !category && sort === 'best';
  const results = useMemo(() => {
    const found = (browsing ? FEATURED : searchLibrary(query, LIBRARY.length, category)).filter((t) => !owned.has(t.id));
    return sort === 'best' ? found : sortTasks(found, sort, (t) => xpFor(t.minutes, libraryEffort(t.id)));
  }, [query, category, sort, browsing, owned]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.heading}>Task library</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${LIBRARY.length} tasks, e.g. "laundry" or "run"`}
            placeholderTextColor={C.muted}
            style={styles.search}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
            <Chip label={query.trim() || sort !== 'best' ? 'All' : 'Recommended'} active={!category} onPress={() => setCategory(undefined)} />
            <Chip
              label="Willpower"
              active={category === WILLPOWER_FILTER}
              onPress={() => setCategory(category === WILLPOWER_FILTER ? undefined : WILLPOWER_FILTER)}
            />
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                active={category === c.id}
                onPress={() => setCategory(category === c.id ? undefined : c.id)}
              />
            ))}
          </ScrollView>
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort</Text>
            {SORTS.map((o) => (
              <Chip key={o.key} label={o.label} active={sort === o.key} onPress={() => setSort(o.key)} />
            ))}
          </View>
        </View>
        <FlatList
          data={results}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.sub}>
              {browsing
                ? `Recommended by the ${APP_NAME} team`
                : `${results.length} ${results.length === 1 ? 'task' : 'tasks'}`}
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {browsing ? 'You have all of these on your list already. Search or pick an area for more.' : 'Nothing found. You can still add it as your own task on the Today screen.'}
            </Text>
          }
          renderItem={({ item }) => <LibraryRow task={item} picked={picked.has(item.id)} onAdd={() => open(item)} />}
        />
        {count > 0 && (
          <View style={styles.bar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.barCount}>
                {count} {count === 1 ? 'task' : 'tasks'} picked
              </Text>
              <Text style={styles.barXp}>+{xp} XP each time you do them all</Text>
            </View>
            <VividButton label={`Add ${count} ${count === 1 ? 'task' : 'tasks'}`} onPress={addAll} compact />
          </View>
        )}

        <PickSheet
          pick={editing}
          picked={!!editing && picked.has(editing.task.id)}
          today={today}
          onChange={setEditing}
          onKeep={keep}
          onRemove={remove}
          onClose={() => setEditing(null)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = themed((c) => ({
  safe: { flex: 1, backgroundColor: c.bg, ...(c.bgImage && { backgroundImage: c.bgImage }) },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  heading: { fontFamily: FONTS.serif, color: c.text, fontSize: 26, ...headingCase(c) },
  done: { color: c.accent, fontSize: 16, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16 },
  search: {
    color: c.text,
    fontSize: 16,
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: c.radius,
  },
  cats: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  sortLabel: { color: c.muted, fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  // The picked tasks, like the last step of setup.
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  barCount: { color: c.text, fontSize: 15, fontWeight: '800' },
  barXp: { color: c.xp, fontSize: 12, fontWeight: '700', marginTop: 2 },
  sub: { color: c.muted, fontSize: 13, marginBottom: 8 },
  empty: { color: c.muted, fontSize: 14, textAlign: 'center', marginTop: 24 },
}));
