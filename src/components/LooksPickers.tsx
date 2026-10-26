import { Lock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { levelForLook } from '../achievements';
import { CELEBRATIONS, FLAME_STYLES, FRAMES, frameName, TROPHY_FRAMES, type CelebrationId, type FlameStyleId } from '../cosmetics';
import { TROPHY_FRAMES_ON } from '../inventory';
import { THEMES, themeById, themed, useStyles, useTheme } from '../theme';
import { brandGlow, brandLine, CELEBRATION_GLYPHS, CELEBRATION_LOOKS } from '../vivid';
import { Fire } from './Fire';
import { Avatar, ProfileFrame } from './ProfileFrame';
import { Sheet } from './Sheet';
import type { Unlock } from '../unlocks';
import { brandFillSmall, brandInk, brandTextShadow, CountBadge, Sticker, VIVID_HEAVY } from './Vivid';
import { N, num, t } from '../i18n';

// The pickers for every look: theme, profile frame, flame, title and tick
// celebration. Looks not won yet show where they come from. A look won but not
// seen yet wears a small "1" until it is tapped (or hovered on the web).

/** Ids of new looks in a picker, and what to call when one has been seen. */
export interface Fresh {
  ids?: Set<string>;
  onSeen?: (id: string) => void;
}

const isTrophyFrame = (id: string) => TROPHY_FRAMES.some((f) => f.id === id);

export function ThemeGrid({
  current,
  unlocked,
  onPick,
  fresh,
  onLocked,
}: {
  current: string;
  unlocked: Set<string>;
  onPick: (id: string) => void;
  fresh?: Fresh;
  /** A locked theme was tapped: show what it needs. */
  onLocked?: (id: string) => void;
}) {
  const s = useStyles(makeStyles);
  return (
    <>
      <View style={s.grid}>
        {THEMES.map((th) => {
          const has = unlocked.has(th.id);
          return (
            <Tile
              key={th.id}
              label={t(th.name)}
              active={current === th.id}
              lockedLabel={has ? undefined : th.id === 'fortune' ? t('Wheel') : t('Award')}
              onPress={has ? () => onPick(th.id) : onLocked && (() => onLocked(th.id))}
              locked={!has}
              isNew={has && fresh?.ids?.has(th.id)}
              onSeen={() => fresh?.onSeen?.(th.id)}
            >
              <ThemeSwatch id={th.id} />
            </Tile>
          );
        })}
      </View>
      <Text style={s.note}>{t('Themes are won with awards. Fortuna is only won on the lucky wheel. Tap a locked one to see what it needs.')}</Text>
    </>
  );
}

/** A small card in a theme's colours: background, accent dot and XP bar. */
export function ThemeSwatch({ id }: { id: string }) {
  const s = useStyles(makeStyles);
  const t = themeById(id);
  return (
    <View style={[s.swatch, { backgroundColor: t.palette.bg }, t.palette.bgImage ? { backgroundImage: t.palette.bgImage } : null]}>
      <View style={[s.swatchDot, { backgroundColor: t.palette.accent }]} />
      <View style={[s.swatchBar, { backgroundColor: t.palette.xp }]} />
    </View>
  );
}

export function FrameGrid({
  owned,
  equipped,
  frames,
  eventFrame,
  initials,
  onPick,
  fresh,
  onLocked,
}: {
  owned: string[];
  equipped?: string;
  fresh?: Fresh;
  onLocked?: (id: string) => void;
  /** Every frame to show: the level frames and the event frames. */
  frames: string[];
  /** This month's event frame, shown locked until it's won. */
  eventFrame?: string;
  initials: string;
  onPick: (id: string | undefined) => void;
}) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.grid}>
      <Tile label={t('None')} active={!equipped} onPress={() => onPick(undefined)}>
        <Avatar initials={initials} size={40} />
      </Tile>
      {frames.map((id) => {
        const has = owned.includes(id);
        return (
          <Tile
            key={id}
            label={frameName(id)}
            active={equipped === id}
            lockedLabel={has ? undefined : id === eventFrame ? t('Event') : isTrophyFrame(id) ? t('Trophy') : t('Lvl {n}', { n: levelForLook('frame', id)! })}
            onPress={has ? () => onPick(id) : onLocked && (() => onLocked(id))}
            locked={!has}
            isNew={has && fresh?.ids?.has(id)}
            onSeen={() => fresh?.onSeen?.(id)}
          >
            <ProfileFrame frame={id} size={34} locked={!has}>
              <Avatar initials={initials} size={30} />
            </ProfileFrame>
          </Tile>
        );
      })}
    </View>
  );
}

/** The level frames, the trophy frames, every event frame owned, and this month's even before it's won. */
export function frameList(owned: string[], eventFrame: string): string[] {
  const seasonal = owned.filter((f) => f.startsWith('season-'));
  return [...FRAMES.map((f) => f.id as string), ...TROPHY_FRAMES_ON.map((f) => f.id as string), ...(seasonal.includes(eventFrame) ? seasonal : [...seasonal, eventFrame])];
}

export function FlameGrid({
  owned,
  equipped,
  fireTier,
  onPick,
  fresh,
  onLocked,
}: {
  owned: string[];
  equipped?: FlameStyleId;
  fireTier: number;
  onPick: (id: FlameStyleId) => void;
  fresh?: Fresh;
  onLocked?: (id: string) => void;
}) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.grid}>
      {FLAME_STYLES.map((f) => {
        const has = owned.includes(f.id);
        return (
          <Tile
            key={f.id}
            label={t(f.name)}
            active={equipped === f.id}
            lockedLabel={has ? undefined : t('Lvl {n}', { n: levelForLook('flame', f.id)! })}
            onPress={has ? () => onPick(f.id as FlameStyleId) : onLocked && (() => onLocked(f.id))}
            locked={!has}
            isNew={has && fresh?.ids?.has(f.id)}
            onSeen={() => fresh?.onSeen?.(f.id)}
          >
            <Fire tier={Math.max(1, fireTier)} size={30} look={f.id} />
          </Tile>
        );
      })}
    </View>
  );
}

export function TitleChoices({ owned, equipped, onPick, fresh }: { owned: string[]; equipped?: string; onPick: (title: string | undefined) => void; fresh?: Fresh }) {
  const s = useStyles(makeStyles);
  if (!owned.length) return <Text style={s.muted}>{t('Reach level 5 for your first title.')}</Text>;
  return (
    <View style={s.wrapRow}>
      <Choice label={t('None')} active={!equipped} onPress={() => onPick(undefined)} />
      {owned.map((title) => (
        <Choice key={title} label={t(title)} active={equipped === title} onPress={() => onPick(title)} isNew={fresh?.ids?.has(title)} onSeen={() => fresh?.onSeen?.(title)} />
      ))}
    </View>
  );
}

export function CelebrationGrid({
  owned,
  equipped,
  onPick,
  fresh,
  onLocked,
}: {
  owned: string[];
  equipped?: CelebrationId;
  onPick: (id: CelebrationId) => void;
  fresh?: Fresh;
  onLocked?: (id: string) => void;
}) {
  const s = useStyles(makeStyles);
  return (
    <>
      <View style={s.grid}>
        {CELEBRATIONS.map((cel) => {
          const has = owned.includes(cel.id);
          return (
            <Tile
              key={cel.id}
              label={t(cel.name)}
              active={equipped === cel.id}
              lockedLabel={has ? undefined : t('Lvl {n}', { n: levelForLook('celebration', cel.id)! })}
              onPress={has ? () => onPick(cel.id as CelebrationId) : onLocked && (() => onLocked(cel.id))}
              locked={!has}
              isNew={has && fresh?.ids?.has(cel.id)}
              onSeen={() => fresh?.onSeen?.(cel.id)}
            >
              <Sticker grad={CELEBRATION_LOOKS[cel.id]} glyph={CELEBRATION_GLYPHS[cel.id]} size={36} />
            </Tile>
          );
        })}
      </View>
      <Text style={s.note}>{t('Plays when you tick off a task.')}</Text>
    </>
  );
}

export type LookRef = { kind: 'theme' | 'frame' | 'flame' | 'celebration'; id: string };

export function lookName(look: LookRef): string {
  switch (look.kind) {
    case 'theme':
      return t('{name} theme', { name: t(themeById(look.id).name) });
    case 'frame':
      return t('{name} frame', { name: frameName(look.id) });
    case 'flame':
      return t('{name} flame', { name: t(FLAME_STYLES.find((f) => f.id === look.id)?.name ?? N('Streak')) });
    case 'celebration':
      return t('{name} celebration', { name: t(CELEBRATIONS.find((c) => c.id === look.id)?.name ?? N('Tick')) });
  }
}

/** Opens on a locked look: a preview, what it takes to win it and how far along the player is. */
export function UnlockSheet({
  look,
  unlock,
  initials,
  fireTier,
  onClose,
}: {
  look: LookRef | null;
  unlock?: Unlock;
  initials: string;
  fireTier: number;
  onClose: () => void;
}) {
  const s = useStyles(makeStyles);
  const progress = unlock?.progress;
  const share = progress ? Math.max(0, Math.min(1, progress.value / progress.goal)) : 0;
  return (
    <Sheet visible={!!look} onClose={onClose} eyebrow={t('Locked')} title={look ? lookName(look) : ''}>
      {look && unlock && (
        <View style={s.unlock}>
          <View style={s.unlockPic}>
            {look.kind === 'theme' ? (
              <View style={{ transform: [{ scale: 1.6 }] }}>
                <ThemeSwatch id={look.id} />
              </View>
            ) : look.kind === 'frame' ? (
              <ProfileFrame frame={look.id} size={60}>
                <Avatar initials={initials} size={56} />
              </ProfileFrame>
            ) : look.kind === 'flame' ? (
              <Fire tier={Math.max(1, fireTier)} size={52} look={look.id as FlameStyleId} />
            ) : (
              <Sticker grad={CELEBRATION_LOOKS[look.id as CelebrationId]} glyph={CELEBRATION_GLYPHS[look.id as CelebrationId]} size={56} />
            )}
          </View>
          <Text style={s.unlockLabel}>{t('How to unlock')}</Text>
          <Text style={s.unlockHow}>{unlock.how}</Text>
          {progress && (
            <View style={{ gap: 6 }} accessible accessibilityLabel={`${t('{n} of {total}', { n: progress.value, total: progress.goal })} ${t(progress.unit)}`}>
              <View style={s.unlockTrack}>
                <View style={[s.unlockFill, { width: `${share * 100}%` }]} />
              </View>
              <Text style={s.unlockCount}>
                {progress.unit === 'level' ? t('Level {n} of {total}', { n: progress.value, total: progress.goal }) : `${num(progress.value)} / ${num(progress.goal)} ${t(progress.unit)}`}
              </Text>
            </View>
          )}
          {unlock.ready && <Text style={s.unlockReady}>{unlock.ready}</Text>}
        </View>
      )}
    </Sheet>
  );
}

function Tile({
  label,
  active,
  lockedLabel,
  locked,
  onPress,
  isNew,
  onSeen,
  children,
}: {
  label: string;
  active: boolean;
  /** Not won yet: a tap shows what it needs instead of wearing it. */
  locked?: boolean;
  /** Shown instead of the name while the look isn't won yet. */
  lockedLabel?: string;
  onPress?: () => void;
  /** Won but not seen yet: a "1" sits on the corner until tapped or hovered. */
  isNew?: boolean;
  onSeen?: () => void;
  children: React.ReactNode;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  return (
    <Pressable
      onPress={() => {
        if (isNew) onSeen?.();
        onPress?.();
      }}
      onHoverIn={isNew ? onSeen : undefined}
      disabled={!onPress}
      style={[s.tile, active && s.tileActive]}
      accessibilityRole={locked ? 'button' : 'radio'}
      accessibilityState={locked ? { disabled: !onPress } : { checked: active, disabled: !onPress }}
      accessibilityLabel={locked ? t('{name}, locked. Show how to unlock it', { name: label }) : `${label}${isNew ? `, ${t('new')}` : ''}`}
    >
      {isNew && <CountBadge count={1} style={s.newBadge} />}
      <View style={[s.tilePic, lockedLabel ? { opacity: 0.45 } : null]}>{children}</View>
      {lockedLabel ? (
        <View style={s.lockRow}>
          <Lock size={10} color={c.faint} strokeWidth={1.75} aria-hidden />
          <Text style={s.lockText}>{lockedLabel}</Text>
        </View>
      ) : (
        <Text style={[s.tileLabel, active && { color: c.accent }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function Choice({ label, active, onPress, isNew, onSeen }: { label: string; active: boolean; onPress: () => void; isNew?: boolean; onSeen?: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <Pressable
      onPress={() => {
        if (isNew) onSeen?.();
        onPress();
      }}
      onHoverIn={isNew ? onSeen : undefined}
      style={[s.choice, active && s.choiceActive]}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`${label}${isNew ? `, ${t('new')}` : ''}`}
    >
      <Text style={[s.choiceText, active && s.choiceTextActive]}>{label}</Text>
      {isNew && <CountBadge count={1} style={s.newBadge} />}
    </Pressable>
  );
}

const makeStyles = themed((c) => ({
  swatch: { width: 46, height: 40, borderRadius: c.radius, padding: 6, justifyContent: 'space-between', borderWidth: 1, borderColor: c.border },
  swatchDot: { width: 10, height: 10, borderRadius: 5 },
  swatchBar: { height: 4, borderRadius: 2, width: '70%' },
  muted: { color: c.muted, fontSize: 13, lineHeight: 18 },
  note: { color: c.faint, fontSize: 12, lineHeight: 17 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: c.border },
  choiceText: { color: c.muted, fontSize: 13, fontWeight: '600' },
  choiceActive: { ...brandFillSmall(c), borderColor: 'transparent' },
  choiceTextActive: { color: brandInk(c), fontFamily: VIVID_HEAVY, ...brandTextShadow(c) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Three to a row: (100% - 2 gaps of 8) / 3 stays above 31% from phone width up.
  tile: {
    width: '31%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: c.radius,
    borderWidth: 1,
    borderColor: c.border,
  },
  tileActive: { borderColor: brandLine(c), borderWidth: 1.5, backgroundColor: c.surface, boxShadow: `0px 0px 12px ${brandGlow(0.35)}` },
  tilePic: { height: 46, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: c.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lockText: { color: c.faint, fontSize: 11, fontWeight: '600' },
  newBadge: { position: 'absolute', top: -6, right: -6, zIndex: 2 },
  unlock: { gap: 10 },
  unlockPic: { height: 96, alignItems: 'center', justifyContent: 'center' },
  unlockLabel: { color: c.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  unlockHow: { color: c.text, fontSize: 15, lineHeight: 21 },
  unlockTrack: { height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  unlockFill: { ...brandFillSmall(c), height: '100%', borderRadius: 4 },
  unlockCount: { color: c.muted, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unlockReady: { color: c.accent, fontSize: 14, fontWeight: '700', lineHeight: 19 },
}));
