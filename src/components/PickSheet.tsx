import { Pressable, Text } from 'react-native';
import { libraryEffort } from '../effort';
import { estimateMinutes } from '../estimate';
import { perWeekLabel, xpFor, type Repeat, type TaskPlan } from '../game';
import { shownTitle, type LibraryTask } from '../library';
import { DEFAULT_AMOUNTS, measuredTitle, type Amount } from '../measure';
import { themed, useStyles } from '../theme';
import { AmountPicker } from './AmountPicker';
import { sizeLabel } from './LibraryRow';
import { defaultSchedule, scheduleProblem, SchedulePicker, scheduleToTask, type Schedule } from './SchedulePicker';
import { Sheet } from './Sheet';
import { VividButton } from './Vivid';
import { t } from '../i18n';

/** A library task picked to add, with its days, reminder and, for Walk, Run and Steps, the amount. */
export interface LibraryPick {
  task: LibraryTask;
  schedule: Schedule;
  amount?: Amount;
}

/** A fresh pick: the library's usual frequency, and half an hour (or 4,000 steps) for Walk, Run and Steps. */
export function newPick(task: LibraryTask, today: string): LibraryPick {
  return {
    task,
    schedule: { ...defaultSchedule(today), repeat: task.perWeek > 0, perWeek: task.perWeek > 0 ? task.perWeek : 3 },
    ...(task.measure && { amount: DEFAULT_AMOUNTS[task.measure] }),
  };
}

/** The title it is added under: "Walk 3 km" for a sized one, else the library title. */
export function pickTitle(pick: LibraryPick): string {
  return pick.task.measure && pick.amount ? measuredTitle(pick.task.measure, pick.amount) : pick.task.title;
}

/** The pick's title as shown, in the current language. */
export function pickName(pick: LibraryPick): string {
  return shownTitle(pickTitle(pick));
}

export function pickMinutes(pick: LibraryPick): number {
  return pick.task.measure ? estimateMinutes(pickTitle(pick)).minutes : pick.task.minutes;
}

/** XP for one finish of a pick, before multipliers. */
export function pickXp(pick: LibraryPick): number {
  return xpFor(pickMinutes(pick), libraryEffort(pick.task.id));
}

/** What addTask takes for a pick. */
export function pickToTask(pick: LibraryPick, today: string): { title: string; repeat: Repeat; minutes: number; plan: TaskPlan } {
  const title = pickTitle(pick);
  const { repeat, plan } = scheduleToTask(pick.schedule, title, today);
  return { title, repeat, minutes: pickMinutes(pick), plan: { ...plan, category: pick.task.category, libraryId: pick.task.id } };
}

/**
 * The sheet that opens on a library task, in the library and in setup: how
 * much (Walk, Run, Steps), how often, which days, and a reminder.
 */
export function PickSheet({
  pick,
  picked,
  today,
  onChange,
  onKeep,
  onRemove,
  onClose,
}: {
  /** The pick being set up; null = closed. */
  pick: LibraryPick | null;
  /** Already on the list, so the button saves and it can be taken off. */
  picked: boolean;
  today: string;
  onChange: (pick: LibraryPick) => void;
  onKeep: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const s = useStyles(makeStyles);
  const title = pick ? pickTitle(pick) : '';
  const problem = pick ? scheduleProblem(pick.schedule, title) : undefined;
  const name = pick ? pickName(pick) : '';
  const minutes = pick ? pickMinutes(pick) : 0;
  return (
    <Sheet visible={pick !== null} onClose={onClose} closeLabel={t('Cancel')} eyebrow={t('Add to your list')} title={name}>
      {pick && (
        <>
          <Text style={s.meta}>
            {sizeLabel(pick.task, minutes, true)} · +{pickXp(pick)} XP · {t('usually {freq}', { freq: perWeekLabel(pick.task.perWeek).toLowerCase() })}
          </Text>
          {pick.task.measure && pick.amount && (
            <AmountPicker measure={pick.task.measure} value={pick.amount} onChange={(amount) => onChange({ ...pick, amount })} />
          )}
          <SchedulePicker value={pick.schedule} onChange={(schedule) => onChange({ ...pick, schedule })} title={title} today={today} />
          {/* The schedule picker says what is missing. */}
          <VividButton label={picked ? t('Save') : t('Add to list')} onPress={onKeep} disabled={!!problem} />
          {picked && (
            <Pressable onPress={onRemove} style={s.remove} accessibilityRole="button">
              <Text style={s.removeText}>{t('Take off the list')}</Text>
            </Pressable>
          )}
        </>
      )}
    </Sheet>
  );
}

const makeStyles = themed((c) => ({
  meta: { color: c.muted, fontSize: 13 },
  remove: { alignItems: 'center', paddingVertical: 8 },
  removeText: { color: c.muted, fontSize: 14, fontWeight: '700' },
}));
