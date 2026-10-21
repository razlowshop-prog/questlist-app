import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { LibraryRow } from '../components/LibraryRow';
import { CATEGORIES, FEATURED, LIBRARY, searchLibrary, type LibraryTask } from '../library';
import { themed, useStyles, useTheme } from '../theme';

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

  const browsing = !query.trim() && !category;
  const results = useMemo(
    () => (browsing ? FEATURED : searchLibrary(query, 100, category)),
    [query, category, browsing],
  );

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
            <Chip label={query.trim() ? 'All' : '✨ Recommended'} active={!category} onPress={() => setCategory(undefined)} />
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={`${c.icon} ${c.label}`}
                active={category === c.id}
                onPress={() => setCategory(category === c.id ? undefined : c.id)}
              />
            ))}
          </ScrollView>
        </View>
        <FlatList
          data={results}
          keyExtractor={(t) => t.title}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.sub}>
              {browsing
                ? 'Recommended by the QuestList team'
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
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  heading: { color: c.text, fontSize: 22, fontWeight: '800' },
  done: { color: c.accent, fontSize: 16, fontWeight: '800' },
  searchWrap: { paddingHorizontal: 16 },
  search: {
    color: c.text,
    fontSize: 16,
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  cats: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  sub: { color: c.muted, fontSize: 13, marginBottom: 8 },
  empty: { color: c.muted, fontSize: 14, textAlign: 'center', marginTop: 24 },
}));
