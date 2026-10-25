import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { APP_NAME } from '../brand';
import { backupName, backupSummary, readBackup, type Backup } from '../backup';
import { openBackupFile, saveBackupFile } from '../backupFile';
import { STREAK_REMINDER_HOUR, type Settings } from '../game';
import { Sheet } from '../components/Sheet';
import { brandFillSmall, brandInk, brandTextShadow, VIVID_HEAVY, VividButton, VividSwitch } from '../components/Vivid';
import { themed, useStyles, useTheme } from '../theme';
import { MenuGroup, MenuRow } from './MenuScreen';

/** Settings, opened from the Menu: reminders, the daily quote email, vibration, privacy, backup and the setup questions. */
export function SettingsScreen({
  settings,
  today,
  onSettings,
  onRedoSetup,
  backupText,
  onRestore,
}: {
  settings: Settings;
  today: string;
  onSettings: (s: Partial<Settings>) => void;
  onRedoSetup: () => void;
  /** The backup file's text for everything on this phone, saved at the given ISO time. */
  backupText: (savedAt: string) => string;
  /** Replaces all progress on this phone with a backup's. */
  onRestore: (backup: Backup) => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [restore, setRestore] = useState<Backup>();
  const [note, setNote] = useState<{ text: string; error?: boolean }>();

  async function saveBackup() {
    setNote(undefined);
    try {
      if (await saveBackupFile(backupName(today), backupText(new Date().toISOString()))) {
        onSettings({ lastBackup: today });
        setNote({ text: 'Backup saved. Keep the file somewhere safe, like your email or a cloud drive.' });
      } else {
        setNote({ text: 'This phone can’t share files right now.', error: true });
      }
    } catch {
      setNote({ text: 'The backup couldn’t be saved. Please try again.', error: true });
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
      setNote({ text: 'That file couldn’t be opened.', error: true });
    }
  }
  const emailValid = /^\S+@\S+\.\S+$/.test(settings.email);
  const visibility = settings.profileVisibility ?? 'friends';

  return (
    <ScrollView contentContainerStyle={s.content}>
      <MenuGroup label="Notifications">
        <MenuRow
          first
          label="Streak reminders"
          sub={`A notification at ${STREAK_REMINDER_HOUR}:00 when nothing is done yet and your streak is at risk.`}
          right={<VividSwitch value={settings.streakReminders !== false} onValueChange={(v) => onSettings({ streakReminders: v })} accessibilityLabel="Streak reminders" />}
        />
        <MenuRow
          label="Daily motivation by email"
          sub="A short motivational quote every morning. Unsubscribe anytime."
          right={<VividSwitch value={settings.quoteEmails} onValueChange={(v) => onSettings({ quoteEmails: v })} accessibilityLabel="Daily motivation by email" />}
        />
        {settings.quoteEmails && (
          <View style={s.emailBox}>
            <TextInput
              value={settings.email}
              onChangeText={(email) => onSettings({ email: email.trim() })}
              placeholder="you@example.com"
              placeholderTextColor={c.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={s.emailInput}
              accessibilityLabel="Email address for the daily quote"
            />
            <Text style={s.small}>
              {emailValid ? `✓ Saved. Emails start once ${APP_NAME} accounts are live.` : 'Enter your email address to receive the quotes.'}
            </Text>
          </View>
        )}
      </MenuGroup>

      <MenuGroup label="Feel">
        <MenuRow
          first
          label="Vibration"
          sub="A small buzz when you tick off a task, level up or win on the wheel."
          right={<VividSwitch value={settings.haptics !== false} onValueChange={(v) => onSettings({ haptics: v })} accessibilityLabel="Vibration" />}
        />
      </MenuGroup>

      <MenuGroup label="Privacy">
        <View style={s.visibility}>
          <Text style={s.label}>Who can find my profile</Text>
          <View style={s.choices} accessibilityRole="radiogroup">
            {(['friends', 'public'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => onSettings({ profileVisibility: v })}
                style={[s.choice, visibility === v && s.choiceActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: visibility === v }}
              >
                <Text style={[s.choiceText, visibility === v && s.choiceTextActive]}>{v === 'friends' ? 'Friends only' : 'Everyone'}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.small}>Used once accounts arrive. Everyone can then search for you and see your level and badges.</Text>
        </View>
        <MenuRow
          label="Share my activity with friends"
          sub="Off unless you turn it on. Only friends you add will see it."
          right={<VividSwitch value={settings.shareActivity === true} onValueChange={(v) => onSettings({ shareActivity: v })} accessibilityLabel="Share my activity with friends" />}
        />
      </MenuGroup>

      <MenuGroup label="Backup">
        <MenuRow
          first
          label="Save a backup"
          sub={`Everything is kept on this phone until accounts arrive. A backup file brings it back on a new phone or after a reset. ${settings.lastBackup ? `Last saved ${longDate(settings.lastBackup)}.` : 'No backup saved yet.'}`}
          onPress={saveBackup}
        />
        <MenuRow label="Restore from a backup" sub="Pick a backup file. You see what's in it before anything changes." onPress={pickBackup} />
        {note && <Text style={[s.note, note.error && { color: c.flame }]}>{note.text}</Text>}
      </MenuGroup>

      <MenuGroup label="Account">
        <MenuRow first label="Account and Premium" sub="Sign in, email, password, deleting your account and the subscription arrive with accounts." />
      </MenuGroup>

      <VividButton label="Redo setup questions" kind="secondary" compact onPress={onRedoSetup} style={{ marginTop: 18 }} />

      <Sheet visible={!!restore} onClose={() => setRestore(undefined)} closeLabel="Cancel" eyebrow="Backup" title="Restore this backup?">
        {restore && <RestoreSummary backup={restore} />}
        <Text style={s.small}>Everything on this phone now is replaced by it. Save a backup first if you want to keep today's progress.</Text>
        <VividButton
          label="Replace my progress"
          onPress={() => {
            if (restore) onRestore(restore);
            setRestore(undefined);
            setNote({ text: 'Backup restored.' });
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
      {backup.savedAt ? <Text style={s.label}>Saved {longDate(backup.savedAt.slice(0, 10))}</Text> : null}
      <Text style={s.summaryText}>
        {backup.state.profile.name} · level {level} · {tasks} {tasks === 1 ? 'task' : 'tasks'} on the list · {tasksDone} done in total
      </Text>
    </View>
  );
}

/** "25 October 2026" for a YYYY-MM-DD day. */
function longDate(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingTop: 0, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  small: { color: c.muted, fontSize: 12 },
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
