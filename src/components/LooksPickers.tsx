import { Lock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { levelForLook } from '../achievements';
import { CELEBRATIONS, FLAME_STYLES, FRAMES, frameName, TROPHY_FRAMES, type CelebrationId, type FlameStyleId } from '../cosmetics';
import { TROPHY_FRAMES_ON } from '../inventory';
import { THEMES, themeById, themed, useStyles, useTheme } from '../theme';
import { brandGlow, brandLine, CELEBRATION_GLYPHS, CELEBRATION_LOOKS } from '../vivid';
import { Fire } from './Fire';
import { Avatar, ProfileFrame } from './ProfileFrame';
import { brandFillSmall, brandInk, brandTextShadow, CountBadge, Sticker, VIVID_HEAVY } from './Vivid';

// The pickers for every look: theme, profile frame, flame, title and tick
// celebration. Looks not won yet show where they come from. A look won but not
// seen yet wears a small "1" until it is tapped (or hovered on the web).

/** Ids of new looks in a picker, and what to call when one has been seen. */
export interface Fresh {
  ids?: Set<string>;
  onSeen?: (id: string) => void;
}

const isTrophyFrame = (id: string) => TROPHY_FRAMES.some((f) => f.id === id);

export function ThemeGrid({ current, unlocked, onPick, fresh }: { current: string; unlocked: Set<string>; onPick: (id: string) => void; fresh?: Fresh }) {
  const s = useStyles(makeStyles);
  return (
    <>
      <View style={s.grid}>
        {THEMES.map((t) => {
          const has = unlocked.has(t.id);
          return (
            <Tile
              key={t.id}
              label={t.name}
              active={current === t.id}
              lockedLabel={has ? undefined : t.id === 'fortune' ? 'Wheel' : 'Trophy'}
              onPress={has ? () => onPick(t.id) : undefined}
              isNew={has && fresh?.ids?.has(t.id)}
              onSeen={() => fresh?.onSeen?.(t.id)}
            >
              <ThemeSwatch id={t.id} />
            </Tile>
          );
        })}
      </View>
      <Text style={s.note}>Themes are won with trophy tiers. Fortuna is only won on the lucky wheel.</Text>
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
}: {
  owned: string[];
  equipped?: string;
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
      <Tile label="None" active={!equipped} onPress={() => onPick(undefined)}>
        <Avatar initials={initials} size={40} />
      </Tile>
      {frames.map((id) => {
        const has = owned.includes(id);
        return (
          <Tile
            key={id}
            label={frameName(id)}
            active={equipped === id}
            lockedLabel={has ? undefined : id === eventFrame ? 'Event' : isTrophyFrame(id) ? 'Trophy' : `Lvl ${levelForLook('frame', id)}`}
            onPress={has ? () => onPick(id) : undefined}
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
}: {
  owned: string[];
  equipped?: FlameStyleId;
  fireTier: number;
  onPick: (id: FlameStyleId) => void;
  fresh?: Fresh;
}) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.grid}>
      {FLAME_STYLES.map((f) => {
        const has = owned.includes(f.id);
        return (
          <Tile
            key={f.id}
            label={f.name}
            active={equipped === f.id}
            lockedLabel={has ? undefined : `Lvl ${levelForLook('flame', f.id)}`}
            onPress={has ? () => onPick(f.id as FlameStyleId) : undefined}
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

export function TitleChoices({ owned, equipped, onPick }: { owned: string[]; equipped?: string; onPick: (title: string | undefined) => void }) {
  const s = useStyles(makeStyles);
  if (!owned.length) return <Text style={s.muted}>Reach level 5 for your first title.</Text>;
  return (
    <View style={s.wrapRow}>
      <Choice label="None" active={!equipped} onPress={() => onPick(undefined)} />
      {owned.map((t) => (
        <Choice key={t} label={t} active={equipped === t} onPress={() => onPick(t)} />
      ))}
    </View>
  );
}

export function CelebrationGrid({ owned, equipped, onPick, fresh }: { owned: string[]; equipped?: CelebrationId; onPick: (id: CelebrationId) => void; fresh?: Fresh }) {
  const s = useStyles(makeStyles);
  return (
    <>
      <View style={s.grid}>
        {CELEBRATIONS.map((cel) => {
          const has = owned.includes(cel.id);
          return (
            <Tile
              key={cel.id}
              label={cel.name}
              active={equipped === cel.id}
              lockedLabel={has ? undefined : `Lvl ${levelForLook('celebration', cel.id)}`}
              onPress={has ? () => onPick(cel.id as CelebrationId) : undefined}
              isNew={has && fresh?.ids?.has(cel.id)}
              onSeen={() => fresh?.onSeen?.(cel.id)}
            >
              <Sticker grad={CELEBRATION_LOOKS[cel.id]} glyph={CELEBRATION_GLYPHS[cel.id]} size={36} />
            </Tile>
          );
        })}
      </View>
      <Text style={s.note}>Plays when you tick off a task.</Text>
    </>
  );
}

function Tile({
  label,
  active,
  lockedLabel,
  onPress,
  isNew,
  onSeen,
  children,
}: {
  label: string;
  active: boolean;
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
      accessibilityRole="radio"
      accessibilityState={{ checked: active, disabled: !onPress }}
      accessibilityLabel={lockedLabel ? `${label}, unlocks at ${lockedLabel}` : `${label}${isNew ? ', new' : ''}`}
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

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[s.choice, active && s.choiceActive]} accessibilityRole="radio" accessibilityState={{ checked: active }}>
      <Text style={[s.choiceText, active && s.choiceTextActive]}>{label}</Text>
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
}));
