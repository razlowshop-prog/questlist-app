import { Cog } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, type HostInstance } from 'react-native';
import { ProfileBizzy } from '../components/ProfileBizzy';
import type { activitySummary } from '../activity';
import type { AchievementStatus } from '../achievements';
import { Achievements } from '../components/Achievements';
import { MultiplierPill } from '../components/MultiplierPill';
import { Fire } from '../components/Fire';
import { FrameGrid, frameList, TitleChoices, UnlockSheet } from '../components/LooksPickers';
import { unlockFor } from '../unlocks';
import type { SeasonStatus } from '../seasons';
import { Avatar, frameReach, ProfileFrame } from '../components/ProfileFrame';
import { Sheet } from '../components/Sheet';
import { equippedLooks, newOfKind, type OwnedLooks } from '../inventory';
import { pickPhoto } from '../photo';
import { TrophyBadge, TrophyCabinet } from '../components/TrophyCabinet';
import { type profileStats, type Settings, type xpMultiplier } from '../game';
import { BizzyShowcase } from '../components/Wardrobe';
import type { GameState } from '../game';
import { showcaseTrophies, toggleShowcase, type TrophyStatus } from '../trophies';
import { card, eyebrow, themed, useStyles, useTheme, FONTS, headingCase } from '../theme';
import { WeekCard } from './ActivityScreen';
import { brandFillSmall, brandInk, brandTextShadow, CountBadge, GradientText, LevelBadge, StickerHeading, VIVID_HEAVY } from '../components/Vivid';
import { AVATAR_DISCS, brandLine, RARITY } from '../vivid';
import { locale, num, t } from '../i18n';

export function ProfileScreen({
  name,
  stats,
  trophies,
  joinedAt,
  settings,
  owned,
  eventFrame,
  season,
  fireTier,
  photo,
  bizzy,
  multiplier,
  achievements,
  toClaim,
  freshLooks,
  onSeenLook,
  week,
  today,
  onClaimAchievement,
  onRename,
  onSettings,
  onPhoto,
}: {
  name: string;
  stats: ReturnType<typeof profileStats>;
  trophies: TrophyStatus[];
  joinedAt: string;
  settings: Settings;
  owned: OwnedLooks;
  /** This month's event frame, shown locked in the picker until it's won. */
  eventFrame: string;
  /** This month's event, for what its frame needs. */
  season: SeasonStatus;
  /** Current streak fire tier, so flame previews match the player's own fire. */
  fireTier: number;
  /** The player's own picture, a data URI, if they set one. */
  photo?: string;
  /** The game state and Bizzy's form, for his showcase card; tap opens his outfits. */
  bizzy: { state: GameState; form: number; onOpen: () => void };
  /** What the next task today is multiplied by. */
  multiplier: ReturnType<typeof xpMultiplier>;
  achievements: AchievementStatus[];
  /** Achievement tiers ready to claim, shown on the Awards switch. */
  toClaim: number;
  /** Won looks not seen yet, as "kind:id" keys; frames and titles get a badge here. */
  freshLooks: Set<string>;
  onSeenLook: (key: string) => void;
  /** This week against last week, for Stats. */
  week: ReturnType<typeof activitySummary>;
  today: string;
  onClaimAchievement: (id: string) => void;
  onRename: (name: string) => void;
  onSettings: (s: Partial<Settings>) => void;
  onPhoto: (photo: string | undefined) => void;
}) {
  const s = useStyles(makeStyles);
  const [editing, setEditing] = useState(false);
  // Where Bizzy flies about on the profile (ProfileBizzy).
  const heroRef = useRef<HostInstance>(null);
  const frameRef = useRef<HostInstance>(null);
  const pillRef = useRef<HostInstance>(null);
  const trophyRefs = useRef<(HostInstance | null)[]>([]);
  const [draft, setDraft] = useState(name);
  const [view, setView] = useState<'awards' | 'stats'>('awards');
  const [sheet, setSheet] = useState<'look' | null>(null);
  const [photoError, setPhotoError] = useState<string>();
  const { title, frame } = equippedLooks(settings, owned);
  const freshFrames = newOfKind(freshLooks, 'frame');
  const freshTitles = newOfKind(freshLooks, 'title');
  const freshHere = freshFrames.size + freshTitles.size;
  /** A locked frame that was tapped. */
  const [lockedFrame, setLockedFrame] = useState<string | null>(null);
  const earnedTrophies = trophies.filter((t) => t.earned).length;
  const showcase = showcaseTrophies(trophies, settings.showcase);
  const initials = name.trim().slice(0, 2).toUpperCase() || '?';
  const memberSince = joinedAt
    ? new Date(`${joinedAt}T12:00:00`).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
    : '';

  async function choosePhoto(from: 'library' | 'camera') {
    setPhotoError(undefined);
    const result = await pickPhoto(from);
    if (!result) return;
    if ('error' in result) setPhotoError(result.error);
    else onPhoto(result.photo);
  }

  function save() {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero} ref={heroRef}>
        <Pressable
          ref={frameRef}
          onPress={() => setSheet('look')}
          style={{ marginVertical: frameReach(frame, 92), zIndex: 2 }}
          accessibilityRole="button"
          accessibilityLabel={freshHere ? t('Change your photo, colour, frame and title, {n} new', { n: freshHere }) : t('Change your photo, colour, frame and title')}
        >
          <ProfileFrame frame={frame} size={92}>
            <Avatar initials={initials} size={92} />
          </ProfileFrame>
          <Gear style={s.avatarGear} />
          <CountBadge count={freshHere} style={s.avatarNew} />
        </Pressable>
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
            accessibilityHint={t('Edit your name')}
          >
            <Text style={s.name}>
              {name} <Text style={s.edit}>✎</Text>
            </Text>
          </Pressable>
        )}
        {title ? <Text style={s.title}>{t(title)}</Text> : null}
        <View style={s.levelRow}>
          <View style={s.levelPill} ref={pillRef}>
            <LevelBadge level={stats.level} size={26} />
            <Text style={s.levelPillText}>
              {t('Level {n}', { n: stats.level })} · {stats.rank}
            </Text>
          </View>
          <MultiplierPill multiplier={multiplier} />
        </View>
        {showcase.length > 0 && (
          <View style={s.showcase} accessibilityLabel={t('Pinned trophies: {names}', { names: showcase.map((tr) => t(tr.def.name)).join(', ') })}>
            {showcase.map((tr, i) => (
              <View
                key={tr.def.id}
                style={s.showcaseItem}
                ref={(r) => {
                  trophyRefs.current[i] = r;
                }}
              >
                <TrophyBadge trophy={tr} size={44} />
                <Text style={s.showcaseName} numberOfLines={1}>
                  {t(tr.def.name)}
                </Text>
              </View>
            ))}
          </View>
        )}
        {memberSince ? <Text style={s.small}>{t('Member since {date}', { date: memberSince })}</Text> : null}
        <ProfileBizzy root={heroRef} frame={frameRef} pill={pillRef} trophies={trophyRefs} />
      </View>

      <View style={s.grid}>
        <Stat label={t('Total XP')} value={num(stats.totalXp)} />
        <Stat label={t('Streak')} value={String(stats.currentStreak)}>
          <Fire tier={Math.max(1, fireTier)} size={22} still />
        </Stat>
        <Stat label={t('Trophies')} value={`${earnedTrophies}/${trophies.length}`} />
      </View>

      <BizzyShowcase state={bizzy.state} form={bizzy.form} onOpen={bizzy.onOpen} />

      <View style={s.segment} accessibilityRole="tablist">
        {(['awards', 'stats'] as const).map((v) => (
          <Pressable
            key={v}
            onPress={() => setView(v)}
            style={[s.segmentItem, view === v && s.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === v }}
            accessibilityLabel={v === 'awards' ? (toClaim ? t('Awards, {n} to claim', { n: toClaim }) : t('Awards')) : t('Stats')}
          >
            <Text style={[s.segmentText, view === v && s.segmentTextActive]}>{v === 'awards' ? t('Awards') : t('Stats')}</Text>
            {v === 'awards' && <CountBadge count={toClaim} style={s.segmentBadge} />}
          </Pressable>
        ))}
      </View>

      {view === 'awards' ? (
        <>
          <StickerHeading glyph="Trophy" grad={RARITY.legendary} style={s.headingFirst} right={<Text style={s.small}>{t('{n} of {total} · tap one', { n: earnedTrophies, total: trophies.length })}</Text>}>
            <Text style={s.sectionTitle}>{t('Trophies')}</Text>
          </StickerHeading>
          <TrophyCabinet trophies={trophies} pinned={settings.showcase} onPin={(id) => onSettings({ showcase: toggleShowcase(settings.showcase, id) })} />


          <View style={s.headingRow}>
            <Achievements achievements={achievements} onClaim={onClaimAchievement} />
          </View>
        </>
      ) : (
        <>
          <WeekCard summary={week} today={today} />
          <View style={s.grid}>
            <Stat label={t('Tasks done')} value={String(stats.tasksDone)} />
            <Stat label={t('Best streak')} value={String(stats.bestStreak)} />
            <Stat label={t('Challenges')} value={String(stats.challengesWon)} />
          </View>
        </>
      )}

      <Sheet visible={sheet === 'look'} onClose={() => setSheet(null)} eyebrow={t('Your look')} title={t('Profile picture')}>
        <View style={[s.photoRow, { paddingVertical: frameReach(frame, 72) }]}>
          <ProfileFrame frame={frame} size={72}>
            <Avatar initials={initials} size={72} />
          </ProfileFrame>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={s.photoButtons}>
              <SmallButton label={photo ? t('New photo') : t('Choose photo')} onPress={() => choosePhoto('library')} />
              {Platform.OS !== 'web' && <SmallButton label={t('Take photo')} onPress={() => choosePhoto('camera')} />}
              {photo ? <SmallButton label={t('Remove')} quiet onPress={() => onPhoto(undefined)} /> : null}
            </View>
            <Text style={s.small}>{t('Your photo stays on this phone.')}</Text>
          </View>
        </View>
        {photoError ? <Text style={s.error}>{photoError}</Text> : null}
        <Text style={s.eyebrow}>{photo ? t('Colour (shown without a photo)') : t('Colour')}</Text>
        <View style={s.discs} accessibilityRole="radiogroup" accessibilityLabel={t('Avatar colour')}>
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
                accessibilityLabel={t('Avatar colour {n}', { n: i + 1 })}
              >
                <Avatar initials="" size={24} disc={i} />
              </Pressable>
            );
          })}
        </View>
        <Text style={s.eyebrow}>{t('Frame')}</Text>
        <FrameGrid owned={owned.frames} equipped={frame} frames={frameList(owned.frames, eventFrame)} eventFrame={eventFrame} initials={initials} onPick={(id) => onSettings({ frame: id })} fresh={{ ids: freshFrames, onSeen: (id) => onSeenLook(`frame:${id}`) }} onLocked={setLockedFrame} />
        <Text style={s.eyebrow}>{t('Title')}</Text>
        <TitleChoices owned={owned.titles} equipped={title} onPick={(picked) => onSettings({ title: picked })} fresh={{ ids: freshTitles, onSeen: (picked) => onSeenLook(`title:${picked}`) }} />
      </Sheet>
      <UnlockSheet
        look={lockedFrame ? { kind: 'frame', id: lockedFrame } : null}
        unlock={lockedFrame ? unlockFor({ kind: 'frame', id: lockedFrame }, { level: stats.level, achievements, trophies, season }) : undefined}
        initials={initials}
        fireTier={fireTier}
        onClose={() => setLockedFrame(null)}
      />
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  onPress,
  hint,
  children,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  hint?: string;
  children?: React.ReactNode;
}) {
  const s = useStyles(makeStyles);
  const body = (
    <>
      <View style={s.statTop}>
        {children}
        <GradientText style={s.statValue}>{value}</GradientText>
      </View>
      <Text style={s.statLabel}>{label}</Text>
      {onPress && <Gear style={s.statGear} small />}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={s.stat} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} accessibilityHint={hint}>
      {body}
    </Pressable>
  ) : (
    <View style={s.stat}>{body}</View>
  );
}

/** The little gear that marks something you can change. */
function Gear({ style, small }: { style: object; small?: boolean }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  return (
    <View style={[s.gear, small && s.gearSmall, style]} pointerEvents="none">
      <Cog size={small ? 12 : 16} color={c.text} strokeWidth={2} aria-hidden />
    </View>
  );
}

function SmallButton({ label, onPress, quiet }: { label: string; onPress: () => void; quiet?: boolean }) {
  const s = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[s.smallButton, quiet ? s.smallButtonQuiet : null]} accessibilityRole="button">
      <Text style={[s.smallButtonText, quiet ? { color: s.small.color } : null]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingTop: 8, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', gap: 8, marginBottom: 22 },
  showcase: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 4 },
  showcaseItem: { alignItems: 'center', width: 76, gap: 2 },
  showcaseName: { color: c.muted, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  discs: { flexDirection: 'row', gap: 10, marginTop: 6 },
  disc: { padding: 2, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
  discActive: { borderColor: brandLine(c) },
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
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statGear: { position: 'absolute', top: 6, right: 6 },
  gear: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  gearSmall: { width: 20, height: 20, borderRadius: 10 },
  avatarGear: { position: 'absolute', right: -2, bottom: -2 },
  avatarNew: { position: 'absolute', right: -2, top: -2 },
  eyebrow: { ...eyebrow(c, 11), color: c.muted, marginTop: 18, marginBottom: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { ...brandFillSmall(c), borderRadius: 12, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  smallButtonQuiet: { backgroundColor: 'transparent', backgroundImage: 'none', borderWidth: 1, borderColor: c.border, boxShadow: 'none' },
  smallButtonText: { color: brandInk(c), fontFamily: VIVID_HEAVY, fontSize: 13, ...brandTextShadow(c) },
  error: { color: c.flame, fontSize: 13 },
  statValue: { fontFamily: VIVID_HEAVY, fontSize: 24, fontVariant: ['lining-nums'] },
  statLabel: { color: c.muted, fontSize: 12, marginTop: 2, textAlign: 'center' },
  headingRow: { marginTop: 30, marginBottom: 12 },
  headingFirst: { marginTop: 4, marginBottom: 12 },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: c.radius + 6, backgroundColor: c.surface, marginTop: 14, marginBottom: 18 },
  segmentItem: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: c.radius + 2 },
  segmentActive: { ...brandFillSmall(c) },
  segmentText: { color: c.muted, fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: brandInk(c), fontFamily: VIVID_HEAVY, ...brandTextShadow(c) },
  segmentBadge: { position: 'absolute', top: -6, right: 10 },
  sectionTitle: { fontFamily: FONTS.serif, color: c.text, fontSize: 19, ...headingCase(c) },
}));
