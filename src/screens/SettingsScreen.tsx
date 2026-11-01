import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { APP_NAME } from '../brand';
import { backupName, backupSummary, readBackup, type Backup } from '../backup';
import { openBackupFile, saveBackupFile } from '../backupFile';
import { shownName, STREAK_REMINDER_HOUR, type Settings } from '../game';
import { Sheet } from '../components/Sheet';
import { brandFillSmall, brandInk, brandTextShadow, VIVID_HEAVY, VividButton, VividSwitch } from '../components/Vivid';
import { themed, useStyles, useTheme } from '../theme';
import { MenuGroup, MenuRow } from './MenuScreen';
import { LANGS, locale, N, systemLang, t, tn } from '../i18n';
import { DEFAULT_SOUND_STYLE, sound, SOUND_STYLES, type SoundStyle } from '../sounds';

const STYLE_LABEL: Record<SoundStyle, string> = { marimba: N('Marimba'), air: N('Air') };

/** Settings, opened from the Menu: reminders, the daily quote email, sounds and vibration, privacy, backup, the setup questions and starting over. */
export function SettingsScreen({
  settings,
  today,
  onSettings,
  onRedoSetup,
  onReplayTour,
  backupText,
  onRestore,
  onReset,
}: {
  settings: Settings;
  today: string;
  onSettings: (s: Partial<Settings>) => void;
  onRedoSetup: () => void;
  /** Bizzy shows them round the app again. */
  onReplayTour: () => void;
  /** The backup file's text for everything on this phone, saved at the given ISO time. */
  backupText: (savedAt: string) => string;
  /** Replaces all progress on this phone with a backup's. */
  onRestore: (backup: Backup) => void;
  /** Deletes all progress on this phone; the setup questions come next. */
  onReset: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [restore, setRestore] = useState<Backup>();
  const [note, setNote] = useState<{ text: string; error?: boolean }>();
  /** Reset all progress: asked twice, 1 = first question, 2 = "are you sure". */
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);

  async function saveBackup() {
    setNote(undefined);
    try {
      if (await saveBackupFile(backupName(today), backupText(new Date().toISOString()))) {
        onSettings({ lastBackup: today });
        setNote({ text: t('Backup saved. Keep the file somewhere safe, like your email or a cloud drive.') });
      } else {
        setNote({ text: t('This phone can’t share files right now.'), error: true });
      }
    } catch {
      setNote({ text: t('The backup couldn’t be saved. Please try again.'), error: true });
    }
  }

  async function pickBackup() {
    setNote(undefined);
    try {
      const text = await openBackupFile();
      if (text === undefined) return;
      const read = readBackup(text);
      if (read.ok) setRestore(read);
      else setNote({ text: read.error, error: true });
    } catch {
      setNote({ text: t('That file couldn’t be opened.'), error: true });
    }
  }
  const emailValid = /^\S+@\S+\.\S+$/.test(settings.email);
  const visibility = settings.profileVisibility ?? 'friends';
  const language = settings.lang ?? systemLang();
  const soundsOn = settings.sounds !== false;
  const soundStyle = settings.soundStyle ?? DEFAULT_SOUND_STYLE;

  return (
    <ScrollView contentContainerStyle={s.content}>
      <MenuGroup label={t('Language')}>
        <View style={s.visibility}>
          <View style={s.choices} accessibilityRole="radiogroup" accessibilityLabel={t('Language')}>
            {LANGS.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => onSettings({ lang: l.id })}
                style={[s.choice, language === l.id && s.choiceActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: language === l.id }}
              >
                <Text style={[s.choiceText, language === l.id && s.choiceTextActive]}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </MenuGroup>

      <MenuGroup label={t('Notifications')}>
        <MenuRow
          first
          label={t('Streak reminders')}
          sub={t('A notification at {h}:00 when nothing is done yet and your streak is at risk.', { h: STREAK_REMINDER_HOUR })}
          right={<VividSwitch value={settings.streakReminders !== false} onValueChange={(v) => onSettings({ streakReminders: v })} accessibilityLabel={t('Streak reminders')} />}
        />
        <MenuRow
          label={t('Quote of the day on opening')}
          sub={t('Bizzy shows a quote on your first open of the day. Tap it to start.')}
          right={<VividSwitch value={settings.quoteStart !== false} onValueChange={(v) => onSettings({ quoteStart: v })} accessibilityLabel={t('Quote of the day on opening')} />}
        />
        <MenuRow
          label={t('Daily motivation by email')}
          sub={t('A short motivational quote every morning. Unsubscribe any time.')}
          right={<VividSwitch value={settings.quoteEmails} onValueChange={(v) => onSettings({ quoteEmails: v })} accessibilityLabel={t('Daily motivation by email')} />}
        />
        {settings.quoteEmails && (
          <View style={s.emailBox}>
            <TextInput
              value={settings.email}
              onChangeText={(email) => onSettings({ email: email.trim() })}
              placeholder={t('you@example.com')}
              placeholderTextColor={c.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={s.emailInput}
              accessibilityLabel={t('Email address for the daily quote')}
            />
            <Text style={s.small}>
              {emailValid ? `✓ ${t('Saved. Emails start once {app} accounts are live.', { app: APP_NAME })}` : t('Enter your email address to receive the quotes.')}
            </Text>
          </View>
        )}
      </MenuGroup>

      <MenuGroup label={t('Feel')}>
        <MenuRow
          first
          label={t('Vibration')}
          sub={t('A small buzz when you tick off a task, level up or win on the wheel.')}
          right={<VividSwitch value={settings.haptics !== false} onValueChange={(v) => onSettings({ haptics: v })} accessibilityLabel={t('Vibration')} />}
        />
        <MenuRow
          label={t('Sounds')}
          sub={t('Soft sounds when you tick off a task, level up, collect a reward or spin the wheel. Quiet while your phone is on silent.')}
          right={<VividSwitch value={soundsOn} onValueChange={(v) => onSettings({ sounds: v })} accessibilityLabel={t('Sounds')} />}
        />
        {soundsOn && (
          <View style={s.visibility}>
            <Text style={s.label}>{t('Sound style')}</Text>
            <View style={s.choices} accessibilityRole="radiogroup" accessibilityLabel={t('Sound style')}>
              {SOUND_STYLES.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => {
                    onSettings({ soundStyle: v });
                    // A taste of the style: the tick, the sound heard most.
                    sound('tick', { style: v, force: true });
                  }}
                  style={[s.choice, soundStyle === v && s.choiceActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: soundStyle === v }}
                >
                  <Text style={[s.choiceText, soundStyle === v && s.choiceTextActive]}>{t(STYLE_LABEL[v])}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.small}>{t('Changes the sounds you hear most: ticks, combos, level-ups, perfect days and streaks. Tap one to hear it.')}</Text>
          </View>
        )}
      </MenuGroup>

      <MenuGroup label={t('Privacy')}>
        <View style={s.visibility}>
          <Text style={s.label}>{t('Who can find my profile')}</Text>
          <View style={s.choices} accessibilityRole="radiogroup">
            {(['friends', 'public'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => onSettings({ profileVisibility: v })}
                style={[s.choice, visibility === v && s.choiceActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: visibility === v }}
              >
                <Text style={[s.choiceText, visibility === v && s.choiceTextActive]}>{v === 'friends' ? t('Friends only') : t('Everyone')}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.small}>{t('Used once accounts arrive. Everyone can then search for you and see your level and badges.')}</Text>
        </View>
        <MenuRow
          label={t('Share my activity with friends')}
          sub={t('Off unless you turn it on. Only friends you add will see it.')}
          right={<VividSwitch value={settings.shareActivity === true} onValueChange={(v) => onSettings({ shareActivity: v })} accessibilityLabel={t('Share my activity with friends')} />}
        />
      </MenuGroup>

      <MenuGroup label={t('Backup')}>
        <MenuRow
          first
          label={t('Save a backup')}
          sub={`${t('Everything is kept on this phone until accounts arrive. A backup file brings it back on a new phone or after a reset.')} ${settings.lastBackup ? t('Last saved {date}.', { date: longDate(settings.lastBackup) }) : t('No backup saved yet.')}`}
          onPress={saveBackup}
        />
        <MenuRow label={t('Restore from a backup')} sub={t('Pick a backup file. You see what’s in it before anything changes.')} onPress={pickBackup} />
        {note && <Text style={[s.note, note.error && { color: c.flame }]}>{note.text}</Text>}
      </MenuGroup>

      <MenuGroup label={t('Account')}>
        <MenuRow first label={t('Account and Premium')} sub={t('Sign in, email, password, deleting your account and the subscription arrive with accounts.')} />
      </MenuGroup>

      <VividButton label={t('Show the app tour again')} kind="secondary" compact onPress={onReplayTour} style={{ marginTop: 18 }} />
      <VividButton label={t('Redo setup questions')} kind="secondary" compact onPress={onRedoSetup} style={{ marginTop: 10 }} />

      <Pressable onPress={() => setResetStep(1)} style={s.reset} accessibilityRole="button">
        <Text style={s.resetText}>{t('Reset all progress')}</Text>
      </Pressable>

      <Sheet
        visible={resetStep > 0}
        onClose={() => setResetStep(0)}
        closeLabel={t('Cancel')}
        eyebrow={t('Start fresh')}
        title={resetStep === 1 ? t('Reset all progress?') : t('Are you sure?')}
      >
        {resetStep === 1 ? (
          <>
            <Text style={s.body}>
              {t('Your tasks, XP, levels, streak, items, looks and photo are deleted from this phone, and the setup questions start again. Your settings stay.')}
            </Text>
            <Text style={s.small}>{t('Save a backup first if you might want it back later.')}</Text>
            {note && <Text style={[s.note, note.error && { color: c.flame }]}>{note.text}</Text>}
            <VividButton label={t('Save a backup first')} kind="secondary" onPress={saveBackup} style={{ marginTop: 6 }} />
            <Pressable onPress={() => setResetStep(2)} style={s.danger} accessibilityRole="button">
              <Text style={s.dangerText}>{t('Continue')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={s.body}>{t('This can’t be undone. Without a backup, your progress is gone for good.')}</Text>
            <Pressable
              onPress={() => {
                setResetStep(0);
                setNote(undefined);
                onReset();
              }}
              style={[s.danger, s.dangerFilled]}
              accessibilityRole="button"
            >
              <Text style={[s.dangerText, { color: c.bg }]}>{t('Yes, delete everything')}</Text>
            </Pressable>
          </>
        )}
      </Sheet>

      <Sheet visible={!!restore} onClose={() => setRestore(undefined)} closeLabel={t('Cancel')} eyebrow={t('Backup')} title={t('Restore this backup?')}>
        {restore && <RestoreSummary backup={restore} />}
        <Text style={s.small}>{t('Everything on this phone now is replaced by it. Save a backup first if you want to keep today’s progress.')}</Text>
        <VividButton
          label={t('Replace my progress')}
          onPress={() => {
            if (restore) onRestore(restore);
            setRestore(undefined);
            setNote({ text: t('Backup restored.') });
          }}
          style={{ marginTop: 6 }}
        />
      </Sheet>
    </ScrollView>
  );
}

function RestoreSummary({ backup }: { backup: Backup }) {
  const s = useStyles(makeStyles);
  const { level, tasks, tasksDone } = backupSummary(backup.state);
  return (
    <View style={s.summary}>
      {backup.savedAt ? <Text style={s.label}>{t('Saved {date}', { date: longDate(backup.savedAt.slice(0, 10)) })}</Text> : null}
      <Text style={s.summaryText}>
        {shownName(backup.state.profile.name)} · {t('level {n}', { n: level })} · {tn(tasks, '{n} task on the list', '{n} tasks on the list')} · {t('{n} done in total', { n: tasksDone })}
      </Text>
    </View>
  );
}

/** "25 October 2026" or "25. Oktober 2026" for a YYYY-MM-DD day. */
function longDate(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingTop: 0, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  small: { color: c.muted, fontSize: 12 },
  body: { color: c.text, fontSize: 15, lineHeight: 21 },
  reset: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginTop: 28 },
  resetText: { color: c.flame, fontSize: 14, fontWeight: '700' },
  danger: { minHeight: 48, borderRadius: c.radius, borderWidth: 1.5, borderColor: c.flame, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  dangerFilled: { backgroundColor: c.flame },
  dangerText: { color: c.flame, fontSize: 15, fontWeight: '800' },
  note: { color: c.muted, fontSize: 13, paddingBottom: 12 },
  summary: { gap: 4, padding: 12, borderRadius: c.radius, backgroundColor: c.surfaceAlt },
  summaryText: { color: c.text, fontSize: 14 },
  label: { color: c.text, fontSize: 15, fontWeight: '700' },
  emailBox: { gap: 6, paddingBottom: 12 },
  emailInput: { color: c.text, fontSize: 15, backgroundColor: c.surfaceAlt, borderRadius: c.radius, paddingHorizontal: 12, paddingVertical: 10 },
  visibility: { gap: 8, paddingVertical: 12 },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 999, backgroundColor: c.surfaceAlt },
  choiceActive: { ...brandFillSmall(c) },
  choiceText: { color: c.muted, fontWeight: '700', fontSize: 14 },
  choiceTextActive: { color: brandInk(c), fontFamily: VIVID_HEAVY, ...brandTextShadow(c) },
}));
