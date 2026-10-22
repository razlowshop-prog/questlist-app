import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { activitySummary } from '../activity';
import type { AchievementStatus, Reward } from '../achievements';
import { Achievements } from '../components/Achievements';
import { MultiplierPill } from '../components/MultiplierPill';
import { Avatar, ProfileFrame } from '../components/ProfileFrame';
import { TrophyCabinet } from '../components/TrophyCabinet';
import { type profileStats, type Settings, type xpMultiplier } from '../game';
import { EMBLEM_TIERS, type EmblemStatus } from '../emblems';
import type { TrophyStatus } from '../trophies';
import { card, themed, useStyles, FONTS, headingCase } from '../theme';
import { WeekCard } from './ActivityScreen';
import { BRAND_FILL_SMALL, BRAND_INK, BRAND_TEXT_SHADOW, CountBadge, GradientText, LevelBadge, Sticker, StickerHeading, VIVID_HEAVY } from '../components/Vivid';
import { AVATAR_DISCS, brandLine, categoryLook, EMBLEM_METALS, RARITY } from '../vivid';

export function ProfileScreen({
  name,
  stats,
  trophies,
  joinedAt,
  settings,
  title,
  frame,
  emblems,
  multiplier,
  achievements,
  rewards,
  toClaim,
  week,
  today,
  onClaimAchievement,
  onRename,
  onSettings,
}: {
  name: string;
  stats: ReturnType<typeof profileStats>;
  trophies: TrophyStatus[];
  joinedAt: string;
  settings: Settings;
  /** The equipped title and frame, if the player owns them. */
  title?: string;
  frame?: string;
  emblems: EmblemStatus[];
  /** What the next task today is multiplied by. */
  multiplier: ReturnType<typeof xpMultiplier>;
  achievements: AchievementStatus[];
  rewards: Reward[];
  /** Achievement tiers ready to claim, shown on the Awards switch. */
  toClaim: number;
  /** This week against last week, for Stats. */
  week: ReturnType<typeof activitySummary>;
  today: string;
  onClaimAchievement: (id: string) => void;
  onRename: (name: string) => void;
  onSettings: (s: Partial<Settings>) => void;
}) {
  const s = useStyles(makeStyles);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [view, setView] = useState<'awards' | 'stats'>('awards');
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
        <ProfileFrame frame={frame} size={92}>
          <Avatar initials={initials} size={92} />
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
        <Stat label="Total XP" value={stats.totalXp.toLocaleString()} />
        <Stat label="Streak" value={String(stats.currentStreak)} />
        <Stat label="Trophies" value={`${earnedTrophies}/${trophies.length}`} />
      </View>

      <View style={s.segment} accessibilityRole="tablist">
        {(['awards', 'stats'] as const).map((v) => (
          <Pressable
            key={v}
            onPress={() => setView(v)}
            style={[s.segmentItem, view === v && s.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === v }}
            accessibilityLabel={v === 'awards' ? `Awards${toClaim ? `, ${toClaim} to claim` : ''}` : 'Stats'}
          >
            <Text style={[s.segmentText, view === v && s.segmentTextActive]}>{v === 'awards' ? 'Awards' : 'Stats'}</Text>
            {v === 'awards' && <CountBadge count={toClaim} style={s.segmentBadge} />}
          </Pressable>
        ))}
      </View>

      {view === 'awards' ? (
        <>
          <StickerHeading glyph="Trophy" grad={RARITY.legendary} style={s.headingFirst} right={<Text style={s.small}>{earnedTrophies} of {trophies.length} · tap one</Text>}>
            <Text style={s.sectionTitle}>Trophies</Text>
          </StickerHeading>
          <TrophyCabinet trophies={trophies} />

          <StickerHeading glyph="Medal" grad={EMBLEM_METALS[2]} style={s.headingRow}>
            <Text style={s.sectionTitle}>Emblems</Text>
            <Text style={s.small}>{EMBLEM_TIERS.map((t) => `${t.name} ${t.goal}`).join(' · ')} tasks</Text>
          </StickerHeading>
          <Emblems emblems={emblems} />

          <View style={s.headingRow}>
            <Achievements achievements={achievements} rewards={rewards} onClaim={onClaimAchievement} />
          </View>
        </>
      ) : (
        <>
          <WeekCard summary={week} today={today} />
          <View style={s.grid}>
            <Stat label="Tasks done" value={String(stats.tasksDone)} />
            <Stat label="Best streak" value={String(stats.bestStreak)} />
            <Stat label="Challenges" value={String(stats.challengesWon)} />
          </View>
        </>
      )}

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
  content: { padding: 20, paddingTop: 8, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', gap: 8, marginBottom: 22 },
  discs: { flexDirection: 'row', gap: 10, marginTop: 6 },
  disc: { padding: 2, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
  discActive: { borderColor: brandLine(c.dark) },
  emblems: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emblem: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  emblemOpen: { borderColor: brandLine(c.dark) },
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
  headingRow: { marginTop: 30, marginBottom: 12 },
  headingFirst: { marginTop: 4, marginBottom: 12 },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: c.radius + 6, backgroundColor: c.surface, marginTop: 14, marginBottom: 18 },
  segmentItem: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: c.radius + 2 },
  segmentActive: { ...BRAND_FILL_SMALL },
  segmentText: { color: c.muted, fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: BRAND_INK, fontFamily: VIVID_HEAVY, ...BRAND_TEXT_SHADOW },
  segmentBadge: { position: 'absolute', top: -6, right: 10 },
  sectionTitle: { fontFamily: FONTS.serif, color: c.text, fontSize: 19, ...headingCase(c) },
}));
