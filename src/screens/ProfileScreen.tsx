import { Backpack, ChevronRight, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { APP_NAME } from '../brand';
import { AppIcon } from '../components/AppIcon';
import { MultiplierPill } from '../components/MultiplierPill';
import { ProfileFrame } from '../components/ProfileFrame';
import { TrophyCabinet } from '../components/TrophyCabinet';
import { STREAK_REMINDER_HOUR, type profileStats, type Settings, type xpMultiplier } from '../game';
import { EMBLEM_TIERS, type EmblemStatus } from '../emblems';
import type { TrophyStatus } from '../trophies';
import { tierColor } from '../achievements';
import { card, eyebrow, THEMES, themed, useStyles, useTheme, FONTS, headingCase } from '../theme';

export function ProfileScreen({
  name,
  stats,
  trophies,
  joinedAt,
  settings,
  unlockedThemes,
  title,
  frame,
  emblems,
  multiplier,
  onOpenBag,
  onRename,
  onSettings,
  onRedoSetup,
}: {
  name: string;
  stats: ReturnType<typeof profileStats>;
  trophies: TrophyStatus[];
  joinedAt: string;
  settings: Settings;
  /** Ids of themes the player may use. */
  unlockedThemes: Set<string>;
  /** The equipped title and frame, if the player owns them. */
  title?: string;
  frame?: string;
  emblems: EmblemStatus[];
  /** What the next task today is multiplied by. */
  multiplier: ReturnType<typeof xpMultiplier>;
  onOpenBag: () => void;
  onRename: (name: string) => void;
  onSettings: (s: Partial<Settings>) => void;
  onRedoSetup: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const emailValid = /^\S+@\S+\.\S+$/.test(settings.email);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const earnedTrophies = trophies.filter((t) => t.earned).length;
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
        <ProfileFrame frame={frame} size={88}>
          <View style={[s.avatar, frame ? s.avatarFramed : null]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        </ProfileFrame>
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
        {title ? <Text style={s.title}>{title}</Text> : null}
        <View style={s.levelRow}>
          <View style={s.levelPill}>
            <Text style={s.levelPillText}>
              Level {stats.level} · {stats.rank}
            </Text>
          </View>
          <MultiplierPill multiplier={multiplier} />
        </View>
        {memberSince ? <Text style={s.small}>Member since {memberSince}</Text> : null}
      </View>

      <View style={s.grid}>
        <Stat label="Points" value={stats.totalXp.toLocaleString()} color={c.gold} />
        <Stat label="Tasks done" value={String(stats.tasksDone)} />
        <Stat label="Streak" value={String(stats.currentStreak)} color={c.accent} />
        <Stat label="Best streak" value={String(stats.bestStreak)} />
        <Stat label="Challenges" value={String(stats.challengesWon)} />
        <Stat label="Trophies" value={`${earnedTrophies}/${trophies.length}`} />
      </View>

      <View style={s.sectionRow}>
        <Text style={s.section}>Trophy cabinet</Text>
        <Text style={s.small}>
          {earnedTrophies} of {trophies.length} · tap one to see how
        </Text>
      </View>
      <TrophyCabinet trophies={trophies} />

      <View style={s.sectionRow}>
        <Text style={s.section}>Emblems</Text>
        <Text style={s.small}>
          {EMBLEM_TIERS.map((t) => `${t.name} ${t.goal}`).join(' · ')} tasks
        </Text>
      </View>
      <Emblems emblems={emblems} />

      <Pressable onPress={onOpenBag} style={s.bagLink} accessibilityRole="button">
        <Backpack size={20} color={c.accent} strokeWidth={1.5} aria-hidden />
        <View style={{ flex: 1 }}>
          <Text style={s.settingTitle}>Inventory</Text>
          <Text style={s.small}>Use tokens and pick your title, frame, flame and tick celebration.</Text>
        </View>
        <ChevronRight size={18} color={c.muted} strokeWidth={1.5} aria-hidden />
      </Pressable>

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
      <Text style={s.small}>Unlock more themes by claiming achievement tiers. Fortuna is only won on the lucky wheel.</Text>

      <Text style={s.section}>Settings</Text>
      <View style={s.settingCard}>
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.settingTitle}>Streak reminders</Text>
            <Text style={s.small}>A notification at {STREAK_REMINDER_HOUR}:00 when nothing is done yet and your streak is at risk.</Text>
          </View>
          <Switch
            value={settings.streakReminders !== false}
            onValueChange={(v) => onSettings({ streakReminders: v })}
            trackColor={{ true: c.accent, false: c.border }}
            thumbColor={c.surface}
            // react-native-web paints the 'on' thumb teal unless told otherwise
            {...({ activeThumbColor: c.surface } as object)}
            accessibilityLabel="Streak reminders"
          />
        </View>
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.settingTitle}>Daily motivation by email</Text>
            <Text style={s.small}>A short motivational quote every morning. Unsubscribe anytime.</Text>
          </View>
          <Switch
            value={settings.quoteEmails}
            onValueChange={(v) => onSettings({ quoteEmails: v })}
            trackColor={{ true: c.accent, false: c.border }}
            thumbColor={c.surface}
            // react-native-web paints the 'on' thumb teal unless told otherwise
            {...({ activeThumbColor: c.surface } as object)}
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

/** Earned emblems in their metal; the rest faint, with how far along they are. */
function Emblems({ emblems }: { emblems: EmblemStatus[] }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const picked = emblems.find((e) => e.category === open);
  return (
    <View style={{ gap: 10 }}>
      <View style={s.emblems}>
        {emblems.map((e) => {
          const color = e.tier ? tierColor(e.tier - 1, c.dark) : c.faint;
          return (
            <Pressable
              key={e.category}
              onPress={() => setOpen(open === e.category ? null : e.category)}
              style={[s.emblem, { borderColor: e.tier ? color : c.border }, open === e.category && s.emblemOpen, !e.tier && { opacity: 0.55 }]}
              accessibilityRole="button"
              accessibilityLabel={`${e.label}: ${e.done} tasks${e.tier ? `, ${EMBLEM_TIERS[e.tier - 1].name}` : ''}`}
            >
              <AppIcon name={e.icon} size={20} color={color} />
            </Pressable>
          );
        })}
      </View>
      {picked && (
        <Text style={s.small}>
          {picked.label}: {picked.done} {picked.done === 1 ? 'task' : 'tasks'}
          {picked.tier ? ` · ${EMBLEM_TIERS[picked.tier - 1].name} emblem` : ''}
          {picked.next ? ` · ${picked.next - picked.done} more for ${EMBLEM_TIERS[picked.tier].name}` : ' · all emblems earned'}
        </Text>
      )}
    </View>
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
  /** Inside a frame the soft outer ring would crowd it, and the frame adds its own space. */
  avatarFramed: { borderWidth: 0, marginBottom: 0 },
  avatarText: { color: c.onAccent, fontSize: 30, fontWeight: '700' },
  emblems: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emblem: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  emblemOpen: { backgroundColor: c.accentSoft },
  bagLink: { ...card(c), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 22 },
  name: { fontFamily: FONTS.serif, color: c.text, fontSize: 28, ...headingCase(c) },
  title: { fontFamily: FONTS.serifItalic, color: c.accent, fontSize: 17, marginTop: -2 },
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
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  levelPill: { backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  levelPillText: { color: c.accent, fontSize: 13, fontWeight: '700' },
  small: { color: c.muted, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { ...card(c), borderRadius: c.radius, flexBasis: '30%', flexGrow: 1, padding: 14, alignItems: 'center' },
  statValue: { fontFamily: FONTS.serif, color: c.text, fontSize: 24, fontVariant: ['lining-nums'] },
  statLabel: { color: c.muted, fontSize: 12, marginTop: 2, textAlign: 'center' },
  section: { ...eyebrow(c), color: c.muted, marginTop: 30, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
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
