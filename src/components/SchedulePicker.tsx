import { Switch, Text, TextInput, View } from 'react-native';
import { addDays, dayLabel, maxPerWeek, WEEKDAYS, type Repeat, type TaskPlan } from '../game';
import { REMINDERS_SUPPORTED } from '../reminders';
import { eyebrow, themed, useStyles, useTheme } from '../theme';
import { Chip } from './Chip';
import { Stepper } from './Stepper';

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

/** Why the task can't be added yet, e.g. 2 of 3 days picked. */
export function scheduleProblem(s: Schedule, title: string): string | undefined {
  if (!s.repeat) return undefined;
  const n = timesOf(s, title);
  const missing = n - s.days.length;
  if (n < 7 && s.days.length > 0 && missing > 0) {
    return `Pick ${missing} more ${missing === 1 ? 'day' : 'days'}, or none for any ${n} days a week.`;
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
  if (n < 7 && s.days.length === n) return { repeat: true, plan: { ...plan, days: s.days } };
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
  if (!s.repeat) when = s.date === today ? 'Once, today' : s.date === addDays(today, 1) ? 'Once, tomorrow' : `Once, ${dayLabel(s.date)}`;
  else {
    const n = timesOf(s, title);
    when = n >= 7 ? 'Every day' : s.days.length === n ? s.days.map((d) => WEEKDAYS[d]).join(', ') : `${n}× a week`;
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
  const c = useTheme();
  const max = maxPerWeek(title);
  const set = (patch: Partial<Schedule>) => onChange({ ...value, ...patch });
  const n = timesOf(value, title);
  const days = value.days.slice(0, n);
  const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 2);
  const problem = scheduleProblem({ ...value, days }, title);

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
      <Text style={s.small}>How often?</Text>
      <View style={s.row}>
        <Chip label="Once" active={!value.repeat} onPress={() => set({ repeat: false })} />
        <Chip label="Repeat" active={value.repeat} onPress={() => set({ repeat: true })} />
      </View>

      {!value.repeat && (
        <>
          <Text style={s.small}>Which day?</Text>
          <View style={s.row}>
            {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d, i) => (
              <Chip
                key={d}
                label={i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayLabel(d)}
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
            <Stepper value={n} min={1} max={max} onChange={setTimes} label="times a week" />
            <Text style={s.stepLabel}>{n >= 7 ? 'every day' : n === 1 ? 'time a week' : 'times a week'}</Text>
            {max >= 7 && n < 7 && (
              <Chip label="Every day" active={false} onPress={() => setTimes(7)} />
            )}
          </View>
          {max === 1 && <Text style={s.hint}>A task for the whole week counts once a week.</Text>}
          {n < 7 && (
            <>
              <Text style={s.small}>{n === 1 ? 'Which day? (optional)' : `Which ${n} days? (optional)`}</Text>
              <View style={s.row}>
                {WEEKDAYS.map((label, d) => (
                  <Chip key={label} label={label} active={days.includes(d)} onPress={() => toggleDay(d)} />
                ))}
              </View>
              <Text style={problem ? s.problem : s.hint}>{problem ?? (days.length ? 'Shows on these days only.' : `Shows every day until done ${n}× this week.`)}</Text>
            </>
          )}
        </>
      )}

      <View style={s.remindRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.remindTitle}>Remind me</Text>
          <Text style={s.hint}>
            {REMINDERS_SUPPORTED
              ? 'A notification on the days this task is due, until it is done.'
              : 'Reminders arrive as notifications in the phone app.'}
          </Text>
        </View>
        <Switch
          value={value.remind}
          onValueChange={(v) => set({ remind: v })}
          trackColor={{ true: c.accent, false: c.border }}
          thumbColor={c.surface}
          // react-native-web paints the 'on' thumb teal unless told otherwise
          {...({ activeThumbColor: c.surface } as object)}
          accessibilityLabel="Remind me"
        />
      </View>
      {value.remind && (
        <View style={s.timeRow}>
          <Text style={s.stepLabel}>at</Text>
          <TextInput
            value={value.hour}
            onChangeText={(v) => set({ hour: digits(v) })}
            onBlur={() => set({ hour: reminderTime(value).slice(0, 2) })}
            keyboardType="number-pad"
            style={s.timeInput}
            accessibilityLabel="Hour"
          />
          <Text style={s.colon}>:</Text>
          <TextInput
            value={value.minute}
            onChangeText={(v) => set({ minute: digits(v) })}
            onBlur={() => set({ minute: reminderTime(value).slice(3) })}
            keyboardType="number-pad"
            style={s.timeInput}
            accessibilityLabel="Minute"
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
