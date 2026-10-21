import { Pressable, Text, View } from 'react-native';
import { durationLabel, xpFor } from '../game';
import { categoryOf, type LibraryTask } from '../library';
import { card, useStyles, type Palette } from '../theme';

export function perWeekLabel(n: number): string {
  if (n === 0) return 'One-time';
  if (n >= 7) return 'Every day';
  return `${n}× a week`;
}

/** A library task with a one-tap add button. */
export function LibraryRow({ task, added, onAdd }: { task: LibraryTask; added: boolean; onAdd: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <Pressable onPress={added ? undefined : onAdd} style={s.row} accessibilityRole="button">
      <View style={s.iconWrap}>
        <Text style={s.icon}>{categoryOf(task.category)?.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{task.title}</Text>
        <Text style={s.meta}>
          {durationLabel(task.minutes)} · {perWeekLabel(task.perWeek)}
        </Text>
      </View>
      <Text style={s.xp}>+{xpFor(task.minutes, task.difficulty)} XP</Text>
      <View style={[s.add, added && s.added]}>
        <Text style={[s.addText, added && s.addedText]}>{added ? '✓' : '+'}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => ({
  row: {
    ...card(c),
    borderRadius: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  icon: { fontSize: 18 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' as const },
  meta: { color: c.muted, fontSize: 12, marginTop: 2 },
  xp: { color: c.xp, fontSize: 12, fontWeight: '800' as const },
  add: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  added: { backgroundColor: c.xpSoft },
  addText: { color: c.onAccent, fontSize: 18, fontWeight: '700' as const, lineHeight: 20 },
  addedText: { color: c.xp },
});
