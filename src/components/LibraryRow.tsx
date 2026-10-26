import { Pressable, Text, View } from 'react-native';
import { libraryEffort } from '../effort';
import { durationLabel, perWeekLabel, xpFor } from '../game';
import { t } from '../i18n';
import { categoryOf, libraryTitle, type LibraryTask } from '../library';
import { card, useStyles, type Palette } from '../theme';
import { brandFillSmall, brandInk, brandTextShadow } from './Vivid';
import { Sticker } from './Vivid';
import { categoryLook } from '../vivid';

/** How big a library task is: its usual time, or "Willpower" for all-day tasks, whose time says nothing. */
export function sizeLabel(task: LibraryTask, minutes = task.minutes, about = false): string {
  if (libraryEffort(task.id) === 'willpower') return t('Willpower');
  return about ? t('About {time}', { time: durationLabel(minutes) }) : durationLabel(minutes);
}

/** A library task with a one-tap add button. `picked`: on the list to add, tap again to change it. */
export function LibraryRow({ task, picked, onAdd }: { task: LibraryTask; picked?: boolean; onAdd: () => void }) {
  const s = useStyles(makeStyles);
  const cat = categoryOf(task.category);
  return (
    <Pressable
      onPress={onAdd}
      style={[s.row, picked && s.picked]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!picked }}
      accessibilityLabel={`${libraryTitle(task)}, +${xpFor(task.minutes, libraryEffort(task.id))} XP${picked ? `, ${t('on your list, change')}` : ''}`}
    >
      <View style={s.iconWrap}>
        {cat && <Sticker grad={categoryLook(cat.id)} glyph={categoryLook(cat.id).glyph} size={32} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{libraryTitle(task)}</Text>
        <Text style={s.meta}>
          {task.measure ? (task.measure === 'steps' ? t('Your own step count') : t('Your own time or distance')) : sizeLabel(task)} · {perWeekLabel(task.perWeek)}
        </Text>
      </View>
      <Text style={s.xp}>+{xpFor(task.minutes, libraryEffort(task.id))} XP</Text>
      <View style={[s.add, picked && s.added]}>
        <Text style={[s.addText, picked && s.addedText]}>{picked ? '✓' : '+'}</Text>
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
