import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { APP_NAME } from '../brand';
import { STREAK_REMINDER_HOUR, type Settings } from '../game';
import { BRAND_FILL_SMALL, BRAND_INK, BRAND_TEXT_SHADOW, VIVID_HEAVY, VividButton, VividSwitch } from '../components/Vivid';
import { themed, useStyles, useTheme } from '../theme';
import { MenuGroup, MenuRow } from './MenuScreen';

/** Settings, opened from the Menu: reminders, the daily quote email, privacy and the setup questions. */
export function SettingsScreen({ settings, onSettings, onRedoSetup }: { settings: Settings; onSettings: (s: Partial<Settings>) => void; onRedoSetup: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
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

      <MenuGroup label="Account">
        <MenuRow first label="Account and Premium" sub="Sign in, email, password, deleting your account and the subscription arrive with accounts." />
      </MenuGroup>

      <VividButton label="Redo setup questions" kind="secondary" compact onPress={onRedoSetup} style={{ marginTop: 18 }} />
    </ScrollView>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingTop: 0, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  small: { color: c.muted, fontSize: 12 },
  label: { color: c.text, fontSize: 15, fontWeight: '700' },
  emailBox: { gap: 6, paddingBottom: 12 },
  emailInput: { color: c.text, fontSize: 15, backgroundColor: c.surfaceAlt, borderRadius: c.radius, paddingHorizontal: 12, paddingVertical: 10 },
  visibility: { gap: 8, paddingVertical: 12 },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 999, backgroundColor: c.surfaceAlt },
  choiceActive: { ...BRAND_FILL_SMALL },
  choiceText: { color: c.muted, fontWeight: '700', fontSize: 14 },
  choiceTextActive: { color: BRAND_INK, fontFamily: VIVID_HEAVY, ...BRAND_TEXT_SHADOW },
}));
