import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { APP_NAME } from '../brand';
import { Chip } from '../components/Chip';
import { LibraryRow } from '../components/LibraryRow';
import { CATEGORIES, FEATURED, LIBRARY, searchLibrary, sortTasks, type LibraryTask } from '../library';
import { themed, useStyles, useTheme, FONTS, headingCase } from '../theme';

type Sort = 'best' | 'xp' | 'quick';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'best', label: 'Best match' },
  { key: 'xp', label: 'Most XP' },
  { key: 'quick', label: 'Quickest' },
];

/** Full-screen browser for the task library: search, categories, recommended. */
export function LibraryModal({
  visible,
  addedTitles,
  onAdd,
  onClose,
}: {
  visible: boolean;
  addedTitles: Set<string>;
  onAdd: (task: LibraryTask) => void;
  onClose: () => void;
}) {
  const styles = useStyles(makeStyles);
  const C = useTheme();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [sort, setSort] = useState<Sort>('best');

  // Sorting by XP or time looks through the whole library, not just the recommended picks.
  const browsing = !query.trim() && !category && sort === 'best';
  const results = useMemo(() => {
    const found = browsing ? FEATURED : searchLibrary(query, LIBRARY.length, category);
    return sort === 'best' ? found : sortTasks(found, sort);
  }, [query, category, sort, browsing]);

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
          keyExtractor={(t) => t.title}
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
            <Text style={styles.empty}>Nothing found. You can still add it as your own task on the Today screen.</Text>
          }
          renderItem={({ item }) => (
            <LibraryRow task={item} added={addedTitles.has(item.title)} onAdd={() => onAdd(item)} />
          )}
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
  sub: { color: c.muted, fontSize: 13, marginBottom: 8 },
  empty: { color: c.muted, fontSize: 14, textAlign: 'center', marginTop: 24 },
}));
