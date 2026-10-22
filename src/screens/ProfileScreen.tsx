import { ChevronRight, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView,  Text, TextInput, View } from 'react-native';
import { APP_NAME } from '../brand';
import { MultiplierPill } from '../components/MultiplierPill';
import { Avatar, ProfileFrame } from '../components/ProfileFrame';
import { TrophyCabinet } from '../components/TrophyCabinet';
import { STREAK_REMINDER_HOUR, type profileStats, type Settings, type xpMultiplier } from '../game';
import { EMBLEM_TIERS, type EmblemStatus } from '../emblems';
import type { TrophyStatus } from '../trophies';
import { card, eyebrow, THEMES, themed, useStyles, useTheme, FONTS, headingCase } from '../theme';
import { GradientText, LevelBadge, Sticker, StickerHeading, VIVID_HEAVY, VividButton, VividSwitch } from '../components/Vivid';
import { AVATAR_DISCS, brandLine, CATEGORY_LOOKS, categoryLook, EMBLEM_METALS, RARITY } from '../vivid';

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
          <Avatar initials={initials} size={88} />
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
            <LevelBadge level={stats.level} size={26} />
            <Text style={s.levelPillText}>
              Level {stats.level} · {stats.rank}
            </Text>
          </View>
          <MultiplierPill multiplier={multiplier} />
        </View>
        {memberSince ? <Text style={s.small}>Member since {memberSince}</Text> : null}
        <View style={s.discs} accessibilityRole="radiogroup" accessibilityLabel="Avatar colour">
          {AVATAR_DISCS.map((_, i) => {
            const active = (settings.avatar ?? 0) === i;
            return (
              <Pressable
                key={i}
                onPress={() => onSettings({ avatar: i })}
                hitSlop={4}
                style={[s.disc, active && s.discActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`Avatar colour ${i + 1}`}
              >
                <Avatar initials="" size={24} disc={i} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.grid}>
        <Stat label="Points" value={stats.totalXp.toLocaleString()} />
        <Stat label="Tasks done" value={String(stats.tasksDone)} />
        <Stat label="Streak" value={String(stats.currentStreak)} />
        <Stat label="Best streak" value={String(stats.bestStreak)} />
        <Stat label="Challenges" value={String(stats.challengesWon)} />
        <Stat label="Trophies" value={`${earnedTrophies}/${trophies.length}`} />
      </View>

      <StickerHeading glyph="Trophy" grad={RARITY.legendary} style={s.headingRow} right={<Text style={s.small}>{earnedTrophies} of {trophies.length} · tap one</Text>}>
        <Text style={s.sectionTitle}>Trophy cabinet</Text>
      </StickerHeading>
      <TrophyCabinet trophies={trophies} />

      <StickerHeading glyph="Medal" grad={EMBLEM_METALS[2]} style={s.headingRow}>
        <Text style={s.sectionTitle}>Emblems</Text>
        <Text style={s.small}>{EMBLEM_TIERS.map((t) => `${t.name} ${t.goal}`).join(' · ')} tasks</Text>
      </StickerHeading>
      <Emblems emblems={emblems} />

      <Pressable onPress={onOpenBag} style={s.bagLink} accessibilityRole="button">
        <Sticker grad={RARITY.epic} glyph="Backpack" size={36} />
        <View style={{ flex: 1 }}>
          <Text style={s.settingTitle}>Inventory</Text>
          <Text style={s.small}>Use tokens and pick your title, frame, flame and tick celebration.</Text>
        </View>
        <ChevronRight size={18} color={c.muted} strokeWidth={1.5} aria-hidden />
      </Pressable>

      <StickerHeading glyph="Palette" grad={CATEGORY_LOOKS.creative} style={s.headingRow}>
        <Text style={s.sectionTitle}>Theme</Text>
      </StickerHeading>
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

      <StickerHeading glyph="GearSix" grad={CATEGORY_LOOKS.errands} style={s.headingRow}>
        <Text style={s.sectionTitle}>Settings</Text>
      </StickerHeading>
      <View style={s.settingCard}>
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.settingTitle}>Streak reminders</Text>
            <Text style={s.small}>A notification at {STREAK_REMINDER_HOUR}:00 when nothing is done yet and your streak is at risk.</Text>
          </View>
          <VividSwitch
            value={settings.streakReminders !== false}
            onValueChange={(v) => onSettings({ streakReminders: v })}
            accessibilityLabel="Streak reminders"
          />
        </View>
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.settingTitle}>Daily motivation by email</Text>
            <Text style={s.small}>A short motivational quote every morning. Unsubscribe anytime.</Text>
          </View>
          <VividSwitch
            value={settings.quoteEmails}
            onValueChange={(v) => onSettings({ quoteEmails: v })}
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
      <VividButton label="Redo setup questions" kind="secondary" compact onPress={onRedoSetup} style={{ marginTop: 12 }} />

      <Text style={s.note}>
        Friends, public profiles and the global leaderboard arrive once accounts and cloud sync are added.
      </Text>
    </ScrollView>
  );
}

/** Earned emblems in their metal; the rest faint, with how far along they are. */
function Emblems({ emblems }: { emblems: EmblemStatus[] }) {
  const s = useStyles(makeStyles);
  const [open, setOpen] = useState<string | null>(null);
  const picked = emblems.find((e) => e.category === open);
  return (
    <View style={{ gap: 10 }}>
      <View style={s.emblems}>
        {emblems.map((e) => {
          const glyph = categoryLook(e.category).glyph;
          return (
            <Pressable
              key={e.category}
              onPress={() => setOpen(open === e.category ? null : e.category)}
              style={[s.emblem, open === e.category && s.emblemOpen]}
              accessibilityRole="button"
              accessibilityLabel={`${e.label}: ${e.done} tasks${e.tier ? `, ${EMBLEM_TIERS[e.tier - 1].name}` : ''}`}
            >
              {e.tier ? <Sticker grad={EMBLEM_METALS[e.tier - 1]} glyph={glyph} size={42} /> : <Sticker grad={categoryLook(e.category)} glyph={glyph} size={42} dim />}
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

function Stat({ label, value }: { label: string; value: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.stat}>
      <GradientText style={s.statValue}>{value}</GradientText>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', gap: 8, marginBottom: 22 },
  discs: { flexDirection: 'row', gap: 10, marginTop: 6 },
  disc: { padding: 2, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
  discActive: { borderColor: brandLine(c.dark) },
  emblems: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emblem: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  emblemOpen: { borderColor: brandLine(c.dark) },
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
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingLeft: 4, paddingRight: 12, paddingVertical: 3 },
  levelPillText: { color: c.text, fontSize: 13, fontWeight: '700' },
  small: { color: c.muted, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { ...card(c), borderRadius: c.radius, flexBasis: '30%', flexGrow: 1, padding: 14, alignItems: 'center' },
  statValue: { fontFamily: VIVID_HEAVY, fontSize: 24, fontVariant: ['lining-nums'] },
  statLabel: { color: c.muted, fontSize: 12, marginTop: 2, textAlign: 'center' },
  section: { ...eyebrow(c), color: c.muted, marginTop: 30, marginBottom: 12 },
  headingRow: { marginTop: 30, marginBottom: 12 },
  sectionTitle: { fontFamily: FONTS.serif, color: c.text, fontSize: 19, ...headingCase(c) },
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
  note: { color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 22 },
}));
