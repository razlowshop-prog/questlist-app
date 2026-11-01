import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { locale, t } from '../i18n';
import { themed, useStyles } from '../theme';
import { Stepper } from './Stepper';
import { VividButton } from './Vivid';

const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** "20 October" in the app's language, from MM-DD. */
export function birthdayLabel(mmdd: string): string {
  const [m, d] = mmdd.split('-').map(Number);
  return new Date(2000, m - 1, d, 12).toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
}

/**
 * The optional birthday (asked 2026-11-01): day and month, no year. Bizzy
 * celebrates on the widget and the day is a free rest day. Used in setup and
 * on the profile; `lockedUntil` says when it can be changed again.
 */
export function BirthdayField({ value, onSave, lockedUntil }: { value?: string; onSave: (mmdd: string | undefined) => void; lockedUntil?: string }) {
  const s = useStyles(makeStyles);
  const [editing, setEditing] = useState(false);
  const [m0, d0] = (value ?? '01-01').split('-').map(Number);
  const [month, setMonth] = useState(m0);
  const [day, setDay] = useState(d0);
  const monthName = (m: number) => new Date(2000, m - 1, 1, 12).toLocaleDateString(locale(), { month: 'long' });
  const pad = (n: number) => String(n).padStart(2, '0');

  if (!editing) {
    const locked = !!lockedUntil;
    return (
      <View style={s.wrap}>
        <Pressable
          onPress={() => !locked && setEditing(true)}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel={value ? t('Birthday: {date}', { date: birthdayLabel(value) }) : t('Add your birthday')}
          style={s.row}
        >
          <Text style={s.cake}>🎂</Text>
          <Text style={s.text}>{value ? t('Birthday: {date}', { date: birthdayLabel(value) }) : t('Add your birthday')}</Text>
          {!locked && <Text style={s.edit}>✎</Text>}
        </Pressable>
        {locked && lockedUntil ? (
          <Text style={s.note}>{t('You can change it again from {date}.', { date: new Date(`${lockedUntil}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) })}</Text>
        ) : !value ? (
          <Text style={s.note}>{t('Optional. Bizzy celebrates with you, and your streak gets the day off.')}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={s.panel}>
      <Stepper
        value={month}
        min={1}
        max={12}
        format={monthName}
        label={t('Month')}
        onChange={(m) => {
          setMonth(m);
          setDay((d) => Math.min(d, DAYS_IN[m - 1]));
        }}
      />
      <Stepper value={day} min={1} max={DAYS_IN[month - 1]} label={t('Day')} onChange={setDay} />
      <Text style={s.note}>{t('Once saved, it can only be changed once a year.')}</Text>
      <View style={s.buttons}>
        <VividButton compact kind="secondary" label={t('Cancel')} onPress={() => setEditing(false)} />
        <VividButton
          compact
          label={t('Save')}
          onPress={() => {
            onSave(`${pad(month)}-${pad(day)}`);
            setEditing(false);
          }}
        />
      </View>
    </View>
  );
}

const makeStyles = themed((c) => ({
  wrap: { alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  cake: { fontSize: 16 },
  text: { color: c.text, fontSize: 14, fontWeight: '600' },
  edit: { color: c.muted, fontSize: 13 },
  note: { color: c.muted, fontSize: 12, textAlign: 'center', maxWidth: 300 },
  panel: { alignSelf: 'stretch', gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.surface, alignItems: 'center' },
  buttons: { flexDirection: 'row', gap: 10 },
}));
