import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { APP_NAME } from '../brand';
import { AchievementBadge } from '../components/AppIcon';
import { tierColor, TIER_NAMES, type AchievementStatus } from '../achievements';
import { type profileStats, type Settings } from '../game';
import { card, eyebrow, THEMES, themed, useStyles, useTheme, FONTS, headingCase } from '../theme';

export function ProfileScreen({
  name,
  stats,
  achievements,
  joinedAt,
  settings,
  unlockedThemes,
  onRename,
  onSettings,
  onRedoSetup,
}: {
  name: string;
  stats: ReturnType<typeof profileStats>;
  achievements: AchievementStatus[];
  joinedAt: string;
  settings: Settings;
  /** Ids of themes the player may use. */
  unlockedThemes: Set<string>;
  onRename: (name: string) => void;
  onSettings: (s: Partial<Settings>) => void;
  onRedoSetup: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const emailValid = /^\S+@\S+\.\S+$/.test(settings.email);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const trophies = achievements.reduce((n, a) => n + a.claimed, 0);
  const totalTiers = achievements.reduce((n, a) => n + a.def.tiers.length, 0);
  const initials = name.trim().slice(0, 2).toUpperCase() || '?';
  const memberSince = joinedAt
    ? new Date(`${joinedAt}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '';

  function save() {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={save}
            onBlur={save}
            autoFocus
            maxLength={24}
            style={s.nameInput}
          />
        ) : (
          <Pressable
            onPress={() => {
              setDraft(name);
              setEditing(true);
            }}
            accessibilityHint="Edit your name"
          >
            <Text style={s.name}>
              {name} <Text style={s.edit}>✎</Text>
            </Text>
          </Pressable>
        )}
        <View style={s.levelPill}>
          <Text style={s.levelPillText}>
            Level {stats.level} · {stats.rank}
          </Text>
        </View>
        {memberSince ? <Text style={s.small}>Member since {memberSince}</Text> : null}
      </View>

      <View style={s.grid}>
        <Stat label="Points" value={stats.totalXp.toLocaleString()} color={c.gold} />
        <Stat label="Tasks done" value={String(stats.tasksDone)} />
        <Stat label="Streak" value={String(stats.currentStreak)} color={c.accent} />
        <Stat label="Best streak" value={String(stats.bestStreak)} />
        <Stat label="Challenges" value={String(stats.challengesWon)} />
        <Stat label="Trophies" value={`${trophies}/${totalTiers}`} />
      </View>

      <Text style={s.section}>Trophies</Text>
      <View style={s.trophies}>
        {achievements.map((a) => {
          const tier = a.claimed - 1;
          return (
            <View key={a.def.id} style={[s.trophy, tier < 0 && s.trophyLocked]}>
              <AchievementBadge name={a.def.icon} state={tier >= 0 ? 'earned' : 'locked'} size={24} />
              <Text style={s.trophyTitle} numberOfLines={1}>
                {a.def.title}
              </Text>
              <Text style={[s.small, tier >= 0 && s.tierName, tier >= 0 && { color: tierColor(tier, c.dark) }]}>
                {tier >= 0 ? TIER_NAMES[tier] : '—'}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={s.section}>Theme</Text>
      <View style={s.themes}>
        {THEMES.map((t) => {
          const unlocked = unlockedThemes.has(t.id);
          const active = settings.theme === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={unlocked ? () => onSettings({ theme: t.id }) : undefined}
              style={[s.theme, active && { borderColor: t.palette.accent }, !unlocked && { opacity: 0.45 }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled: !unlocked }}
            >
              <View style={[s.swatch, { backgroundColor: t.palette.bg }]}>
                <View style={[s.swatchDot, { backgroundColor: t.palette.accent }]} />
                <View style={[s.swatchBar, { backgroundColor: t.palette.xp }]} />
              </View>
              <View style={s.themeNameRow}>
                {!unlocked && <Lock size={12} color={c.muted} strokeWidth={1.5} aria-hidden />}
                <Text style={s.themeName}>{t.name}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.small}>Unlock more themes by claiming achievement tiers.</Text>

      <Text style={s.section}>Settings</Text>
      <View style={s.settingCard}>
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.settingTitle}>Daily motivation by email</Text>
            <Text style={s.small}>A short motivational quote every morning. Unsubscribe anytime.</Text>
          </View>
          <Switch
            value={settings.quoteEmails}
            onValueChange={(v) => onSettings({ quoteEmails: v })}
            trackColor={{ true: c.accent, false: c.border }}
          />
        </View>
        {settings.quoteEmails && (
          <>
            <TextInput
              value={settings.email}
              onChangeText={(email) => onSettings({ email: email.trim() })}
              placeholder="you@example.com"
              placeholderTextColor={c.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={s.emailInput}
            />
            <Text style={s.small}>
              {emailValid
                ? `✓ Saved. Emails start once ${APP_NAME} accounts are live.`
                : 'Enter your email address to receive the quotes.'}
            </Text>
          </>
        )}
      </View>
      <Pressable onPress={onRedoSetup} style={s.redo} accessibilityRole="button">
        <Text style={s.redoText}>Redo setup questions</Text>
      </Pressable>

      <Text style={s.note}>
        Friends, public profiles and the global leaderboard arrive once accounts and cloud sync are added.
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', gap: 8, marginBottom: 22 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 4,
    borderColor: c.accentSoft,
  },
  avatarText: { color: c.onAccent, fontSize: 30, fontWeight: '700' },
  name: { fontFamily: FONTS.serif, color: c.text, fontSize: 28, ...headingCase(c) },
  edit: { color: c.muted, fontSize: 16 },
  nameInput: {
    color: c.text,
    fontSize: 20,
    fontWeight: '700',
    borderBottomWidth: 2,
    borderBottomColor: c.accent,
    minWidth: 160,
    textAlign: 'center',
    paddingVertical: 2,
  },
  levelPill: { backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  levelPillText: { color: c.accent, fontSize: 13, fontWeight: '700' },
  small: { color: c.muted, fontSize: 12 },
  tierName: { fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { ...card(c), borderRadius: c.radius, flexBasis: '30%', flexGrow: 1, padding: 14, alignItems: 'center' },
  statValue: { fontFamily: FONTS.serif, color: c.text, fontSize: 24, fontVariant: ['lining-nums'] },
  statLabel: { color: c.muted, fontSize: 12, marginTop: 2, textAlign: 'center' },
  section: { ...eyebrow(c), color: c.muted, marginTop: 30, marginBottom: 12 },
  trophies: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trophy: { ...card(c), borderRadius: c.radius, flexBasis: '22%', flexGrow: 1, padding: 10, alignItems: 'center', gap: 2 },
  trophyLocked: { backgroundColor: c.surfaceAlt, boxShadow: 'none' },
  trophyTitle: { color: c.text, fontSize: 11, fontWeight: '700' },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  theme: {
    ...card(c),
    borderRadius: c.radius,
    flexBasis: '30%',
    flexGrow: 1,
    padding: 8,
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatch: { height: 44, borderRadius: c.radius, padding: 8, justifyContent: 'space-between', borderWidth: 1, borderColor: c.border },
  swatchDot: { width: 14, height: 14, borderRadius: 7 },
  swatchBar: { height: 5, borderRadius: 3, width: '70%' },
  themeNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  themeName: { color: c.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  settingCard: { ...card(c), padding: 14, gap: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
  emailInput: {
    color: c.text,
    fontSize: 15,
    backgroundColor: c.surfaceAlt,
    borderRadius: c.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  redo: { marginTop: 12, paddingVertical: 12, borderRadius: c.radius, backgroundColor: c.surfaceAlt, alignItems: 'center' },
  redoText: { color: c.text, fontWeight: '700', fontSize: 14 },
  note: { color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 22 },
}));
