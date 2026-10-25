import { Pressable, Text, View } from 'react-native';
import { durationLabel, xpFor } from '../game';
import { categoryOf, type LibraryTask } from '../library';
import { card, useStyles, type Palette } from '../theme';
import { brandFillSmall, brandInk, brandTextShadow } from './Vivid';
import { Sticker } from './Vivid';
import { categoryLook } from '../vivid';

export function perWeekLabel(n: number): string {
  if (n === 0) return 'One-time';
  if (n >= 7) return 'Every day';
  return `${n}× a week`;
}

/** A library task with a one-tap add button. `picked`: on the list to add, tap again to change it. */
export function LibraryRow({ task, added, picked, onAdd }: { task: LibraryTask; added: boolean; picked?: boolean; onAdd: () => void }) {
  const s = useStyles(makeStyles);
  const cat = categoryOf(task.category);
  return (
    <Pressable
      onPress={added ? undefined : onAdd}
      style={[s.row, picked && s.picked]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!picked, disabled: added }}
      accessibilityLabel={`${task.title}, +${xpFor(task.minutes)} XP${added ? ', already in your tasks' : picked ? ', on your list, change' : ''}`}
    >
      <View style={s.iconWrap}>
        {cat && <Sticker grad={categoryLook(cat.id)} glyph={categoryLook(cat.id).glyph} size={32} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{task.title}</Text>
        <Text style={s.meta}>
          {durationLabel(task.minutes)} · {perWeekLabel(task.perWeek)}
        </Text>
      </View>
      <Text style={s.xp}>+{xpFor(task.minutes)} XP</Text>
      <View style={[s.add, (added || picked) && s.added]}>
        <Text style={[s.addText, (added || picked) && s.addedText]}>{added || picked ? '✓' : '+'}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => ({
  row: {
    ...card(c),
    borderRadius: c.radius,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: c.radius,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: { color: c.text, fontSize: 15, fontWeight: '600' as const },
  meta: { color: c.muted, fontSize: 12, marginTop: 2 },
  xp: { color: c.xp, fontSize: 12, fontWeight: '700' as const },
  add: {
    width: 30,
    height: 30,
    borderRadius: 15,
    ...brandFillSmall(c),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  added: { backgroundColor: c.xpSoft },
  picked: { borderColor: c.xp, borderWidth: 1.5 },
  addText: { color: brandInk(c), fontSize: 18, fontWeight: '700' as const, lineHeight: 20, ...brandTextShadow(c) },
  addedText: { color: c.xp },
});
