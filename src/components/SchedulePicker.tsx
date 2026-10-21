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

/** Turns the picker's choices into what addTask takes. */
export function scheduleToTask(s: Schedule, title: string, today: string): { repeat: Repeat; plan: TaskPlan } {
  const max = maxPerWeek(title);
  const plan: TaskPlan = {};
  if (s.remind) plan.reminder = reminderTime(s);
  if (!s.repeat) {
    if (s.date > today) plan.date = s.date;
    return { repeat: false, plan };
  }
  if (s.days.length) return { repeat: true, plan: { ...plan, days: s.days.slice(0, max) } };
  const n = Math.min(s.perWeek, max);
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
  else if (s.days.length) when = s.days.slice(0, maxPerWeek(title)).map((d) => WEEKDAYS[d]).join(', ');
  else {
    const n = Math.min(s.perWeek, maxPerWeek(title));
    when = n >= 7 ? 'Every day' : `${n}× a week`;
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
  const days = value.days.slice(0, max);
  const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 2);

  function toggleDay(d: number) {
    if (days.includes(d)) set({ days: days.filter((x) => x !== d) });
    // A week-long task can only sit on one day: picking another moves it.
    else set({ days: max === 1 ? [d] : [...days, d].sort() });
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
            <Stepper
              value={days.length ? days.length : Math.min(value.perWeek, max)}
              min={1}
              max={max}
              disabled={days.length > 0}
              onChange={(n) => set({ perWeek: n })}
              label="days a week"
            />
            <Text style={s.stepLabel}>
              {days.length ? 'set by the days below' : Math.min(value.perWeek, max) >= 7 ? 'every day' : 'days a week'}
            </Text>
          </View>
          {max === 1 && <Text style={s.hint}>A task for the whole week counts once a week.</Text>}
          <Text style={s.small}>On set days (optional)</Text>
          <View style={s.row}>
            {WEEKDAYS.map((label, d) => (
              <Chip key={label} label={label} active={days.includes(d)} onPress={() => toggleDay(d)} />
            ))}
          </View>
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
