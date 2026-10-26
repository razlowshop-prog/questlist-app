import {  Text, TextInput, View } from 'react-native';
import { addDays, dayLabel, maxPerWeek, perWeekLabel, weekdays, type Repeat, type TaskPlan } from '../game';
import { REMINDERS_SUPPORTED } from '../reminders';
import { eyebrow, themed, useStyles } from '../theme';
import { Chip } from './Chip';
import { Stepper } from './Stepper';
import { VividSwitch } from './Vivid';
import { t, tn } from '../i18n';

export interface Schedule {
  repeat: boolean;
  /** 1-7 when repeating without set days. */
  perWeek: number;
  /** Set weekdays (0 = Monday); empty = any days. */
  days: number[];
  /** One-off: the day it is planned for. */
  date: string;
  remind: boolean;
  hour: string;
  minute: string;
}

export function defaultSchedule(today: string): Schedule {
  return { repeat: false, perWeek: 3, days: [], date: today, remind: false, hour: '18', minute: '00' };
}

/** Times per week as shown: the stepper value, never above what the task allows. */
function timesOf(s: Schedule, title: string): number {
  return Math.min(Math.max(s.perWeek, 1), maxPerWeek(title));
}

/** Picked days that still fit, e.g. after typing "weekly" into the title cut the count to 1. */
function daysOf(s: Schedule, title: string): number[] {
  return s.days.slice(0, timesOf(s, title));
}

/** Why the task can't be added yet, e.g. 2 of 3 days picked. */
export function scheduleProblem(s: Schedule, title: string): string | undefined {
  if (!s.repeat) return undefined;
  const n = timesOf(s, title);
  const days = daysOf(s, title);
  const missing = n - days.length;
  if (n < 7 && days.length > 0 && missing > 0) {
    return tn(missing, 'Pick {n} more day, or none for any {total} days a week.', 'Pick {n} more days, or none for any {total} days a week.', { total: n });
  }
  return undefined;
}

/** Turns the picker's choices into what addTask takes. */
export function scheduleToTask(s: Schedule, title: string, today: string): { repeat: Repeat; plan: TaskPlan } {
  const plan: TaskPlan = {};
  if (s.remind) plan.reminder = reminderTime(s);
  if (!s.repeat) {
    if (s.date > today) plan.date = s.date;
    return { repeat: false, plan };
  }
  const n = timesOf(s, title);
  const days = daysOf(s, title);
  if (n < 7 && days.length === n) return { repeat: true, plan: { ...plan, days } };
  return { repeat: n >= 7 ? true : n, plan };
}

function reminderTime(s: Schedule): string {
  const h = Math.min(23, parseInt(s.hour, 10) || 0);
  const m = Math.min(59, parseInt(s.minute, 10) || 0);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Short summary for the collapsed add form, e.g. "Mon, Thu · 18:00". */
export function scheduleSummary(s: Schedule, title: string, today: string): string {
  let when: string;
  if (!s.repeat) when = s.date === today ? t('Once, today') : s.date === addDays(today, 1) ? t('Once, tomorrow') : t('Once, {day}', { day: dayLabel(s.date) });
  else {
    const n = timesOf(s, title);
    const days = daysOf(s, title);
    when = n < 7 && days.length === n ? days.map((d) => weekdays()[d]).join(', ') : perWeekLabel(n);
  }
  return s.remind ? `${when} · ${reminderTime(s)}` : when;
}

/** How often and when a task happens, plus an optional reminder. */
export function SchedulePicker({
  value,
  onChange,
  title,
  today,
}: {
  value: Schedule;
  onChange: (s: Schedule) => void;
  title: string;
  today: string;
}) {
  const s = useStyles(makeStyles);
  const max = maxPerWeek(title);
  const set = (patch: Partial<Schedule>) => onChange({ ...value, ...patch });
  const n = timesOf(value, title);
  const days = daysOf(value, title);
  const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 2);
  const problem = scheduleProblem(value, title);

  function toggleDay(d: number) {
    if (days.includes(d)) set({ days: days.filter((x) => x !== d) });
    // Once a week: picking another day moves it.
    else if (n === 1) set({ days: [d] });
    // One day too many raises the count, so picking is never blocked.
    else set({ days: [...days, d].sort(), perWeek: Math.max(n, days.length + 1) });
  }

  function setTimes(next: number) {
    // Fewer times than picked days drops the last picked ones.
    set({ perWeek: next, days: days.slice(0, next) });
  }

  return (
    <>
      <Text style={s.small}>{t('How often?')}</Text>
      <View style={s.row}>
        <Chip label={t('Once')} active={!value.repeat} onPress={() => set({ repeat: false })} />
        <Chip label={t('Repeat')} active={value.repeat} onPress={() => set({ repeat: true })} />
      </View>

      {!value.repeat && (
        <>
          <Text style={s.small}>{t('Which day?')}</Text>
          <View style={s.row}>
            {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d, i) => (
              <Chip
                key={d}
                label={i === 0 ? t('Today') : i === 1 ? t('Tomorrow') : dayLabel(d)}
                active={value.date === d}
                onPress={() => set({ date: d })}
              />
            ))}
          </View>
        </>
      )}

      {value.repeat && (
        <>
          <View style={s.stepRow}>
            <Stepper value={n} min={1} max={max} onChange={setTimes} label={t('times a week')} />
            <Text style={s.stepLabel}>{n >= 7 ? t('every day') : n === 1 ? t('time a week') : t('times a week')}</Text>
            {max >= 7 && n < 7 && (
              <Chip label={t('Every day')} active={false} onPress={() => setTimes(7)} />
            )}
          </View>
          {max === 1 && <Text style={s.hint}>{t('A task for the whole week counts once a week.')}</Text>}
          {n < 7 && (
            <>
              <Text style={s.small}>{n === 1 ? t('Which day? (optional)') : t('Which {n} days? (optional)', { n })}</Text>
              <View style={s.row}>
                {weekdays().map((label, d) => (
                  <Chip key={label} label={label} active={days.includes(d)} onPress={() => toggleDay(d)} />
                ))}
              </View>
              <Text style={problem ? s.problem : s.hint}>{problem ?? (days.length ? t('Shows on these days only.') : t('Shows every day until done {n}× this week.', { n }))}</Text>
            </>
          )}
        </>
      )}

      <View style={s.remindRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.remindTitle}>{t('Remind me')}</Text>
          <Text style={s.hint}>
            {REMINDERS_SUPPORTED
              ? t('A notification on the days this task is due, until it is done.')
              : t('Reminders arrive as notifications in the phone app.')}
          </Text>
        </View>
        <VividSwitch
          value={value.remind}
          onValueChange={(v) => set({ remind: v })}
          accessibilityLabel={t('Remind me')}
        />
      </View>
      {value.remind && (
        <View style={s.timeRow}>
          <Text style={s.stepLabel}>{t('at')}</Text>
          <TextInput
            value={value.hour}
            onChangeText={(v) => set({ hour: digits(v) })}
            onBlur={() => set({ hour: reminderTime(value).slice(0, 2) })}
            keyboardType="number-pad"
            style={s.timeInput}
            accessibilityLabel={t('Hour')}
          />
          <Text style={s.colon}>:</Text>
          <TextInput
            value={value.minute}
            onChangeText={(v) => set({ minute: digits(v) })}
            onBlur={() => set({ minute: reminderTime(value).slice(3) })}
            keyboardType="number-pad"
            style={s.timeInput}
            accessibilityLabel={t('Minute')}
          />
        </View>
      )}
    </>
  );
}

const makeStyles = themed((c) => ({
  small: { ...eyebrow(c, 11), color: c.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepLabel: { color: c.muted, fontSize: 14 },
  hint: { color: c.faint, fontSize: 12, marginTop: 2 },
  problem: { color: c.flame, fontSize: 12, fontWeight: '600', marginTop: 2 },
  remindRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  remindTitle: { color: c.text, fontSize: 14, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: {
    width: 52,
    textAlign: 'center',
    color: c.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
    borderRadius: c.radius,
    backgroundColor: c.surfaceAlt,
  },
  colon: { color: c.muted, fontSize: 16, fontWeight: '700' },
}));
