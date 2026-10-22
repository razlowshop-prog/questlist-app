import { Lock, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { levelForLook, type TokenKind } from '../achievements';
import { CELEBRATIONS, FLAME_STYLES, FRAMES, frameName, type CelebrationId, type FlameStyleId } from '../cosmetics';
import type { GameState, Settings } from '../game';
import { equippedLooks, nextTokenLevel, type OwnedLooks } from '../inventory';
import type { SeasonStatus } from '../seasons';
import { card, eyebrow, FONTS, headingCase, themed, useStyles, useTheme } from '../theme';
import { adFreeActive, doubleXpActive, restOffer, TOKEN_INFO, tokenCounts } from '../tokens';
import { Fire } from './Fire';
import { Avatar as Disc, ProfileFrame } from './ProfileFrame';
import { BRAND_FILL_SMALL, BRAND_INK, Sticker, VIVID_HEAVY, BRAND_TEXT_SHADOW } from './Vivid';
import { brandGlow, brandLine, CELEBRATION_GLYPHS, CELEBRATION_LOOKS, TOKEN_LOOKS } from '../vivid';

const TOKENS: TokenKind[] = ['rest', 'double', 'reroll', 'adfree'];

/**
 * The bag: every token to use and every look to equip (title, profile frame,
 * flame style, tick celebration). Looks not won yet show the level that gives them.
 */
export function Inventory({
  visible,
  state,
  today,
  level,
  fireTier,
  initials,
  owned,
  season,
  onClose,
  onRest,
  onDouble,
  onAdFree,
  onOpenChallenges,
  onEquip,
}: {
  visible: boolean;
  state: GameState;
  today: string;
  level: number;
  /** Current streak fire tier, so flame previews match the player's own fire. */
  fireTier: number;
  initials: string;
  owned: OwnedLooks;
  season: SeasonStatus;
  onClose: () => void;
  onRest: (day: string) => void;
  onDouble: () => void;
  onAdFree: () => void;
  onOpenChallenges: () => void;
  onEquip: (looks: Partial<Settings>) => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const counts = tokenCounts(state);
  const equipped = equippedLooks(state.settings, owned);
  const offer = restOffer(state, today);
  const ownedSeasonal = owned.frames.filter((f) => f.startsWith('season-'));
  // This month's event frame shows locked until it's won.
  const seasonal = ownedSeasonal.includes(season.frame) ? ownedSeasonal : [...ownedSeasonal, season.frame];

  function tokenAction(k: TokenKind): { label: string; onPress?: () => void; note?: string } {
    if (counts[k] <= 0) {
      const next = nextTokenLevel(k, level);
      return { label: '', note: next ? `Next one at level ${next}` : 'None left' };
    }
    switch (k) {
      case 'rest':
        return offer
          ? { label: offer.missed ? 'Save yesterday' : 'Take today off', onPress: () => onRest(offer.day) }
          : { label: '', note: 'Nothing to save right now. Use it on a day you can’t do a task.' };
      case 'double':
        return doubleXpActive(state, today) ? { label: '', note: 'On for the rest of today.' } : { label: 'Use now', onPress: onDouble };
      case 'reroll':
        return { label: 'Pick a challenge', onPress: onOpenChallenges };
      case 'adfree':
        return adFreeActive(state, today) ? { label: '', note: 'No ads until midnight.' } : { label: 'Use now', onPress: onAdFree };
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={s.sheetWrap} pointerEvents="box-none">
        <View style={s.sheet}>
          <View style={s.head}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.eyebrow}>Inventory</Text>
              <Text style={s.title}>Your bag</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close inventory">
              <X size={22} color={c.muted} strokeWidth={1.5} aria-hidden />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            <Text style={s.section}>Tokens</Text>
            {TOKENS.map((k) => {
              const action = tokenAction(k);
              const none = counts[k] <= 0;
              return (
                <View key={k} style={[s.token, none && { opacity: 0.6 }]}>
                  <Sticker grad={TOKEN_LOOKS[k]} glyph={TOKEN_LOOKS[k].glyph} size={46} dim={none} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.tokenName}>
                      {TOKEN_INFO[k].name} <Text style={s.count}>×{Math.max(0, counts[k])}</Text>
                    </Text>
                    <Text style={s.muted}>{TOKEN_INFO[k].description}</Text>
                    {action.note && <Text style={s.note}>{action.note}</Text>}
                  </View>
                  {action.onPress && (
                    <Pressable onPress={action.onPress} style={s.use} accessibilityRole="button" accessibilityLabel={`${action.label}: ${TOKEN_INFO[k].name}`}>
                      <Text style={s.useText}>{action.label}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            <Text style={s.section}>Title</Text>
            {owned.titles.length ? (
              <View style={s.wrapRow}>
                <Choice label="None" active={!equipped.title} onPress={() => onEquip({ title: undefined })} />
                {owned.titles.map((t) => (
                  <Choice key={t} label={t} active={equipped.title === t} onPress={() => onEquip({ title: t })} />
                ))}
              </View>
            ) : (
              <Text style={s.muted}>Reach level 5 for your first title.</Text>
            )}

            <Text style={s.section}>Profile frame</Text>
            <View style={s.grid}>
              <Tile label="None" active={!equipped.frame} onPress={() => onEquip({ frame: undefined })}>
                <Avatar initials={initials} />
              </Tile>
              {[...FRAMES.map((f) => f.id as string), ...seasonal].map((id) => {
                const has = owned.frames.includes(id);
                const isEvent = id === season.frame && !has;
                return (
                  <Tile
                    key={id}
                    label={frameName(id)}
                    active={equipped.frame === id}
                    lockedLabel={has ? undefined : isEvent ? 'Event' : `Lvl ${levelForLook('frame', id)}`}
                    onPress={has ? () => onEquip({ frame: id }) : undefined}
                  >
                    <ProfileFrame frame={id} size={34} locked={!has}>
                      <Avatar initials={initials} small />
                    </ProfileFrame>
                  </Tile>
                );
              })}
            </View>

            <Text style={s.section}>Flame</Text>
            <View style={s.grid}>
              {FLAME_STYLES.map((f) => {
                const has = owned.flames.includes(f.id);
                return (
                  <Tile
                    key={f.id}
                    label={f.name}
                    active={equipped.flameStyle === f.id}
                    lockedLabel={has ? undefined : `Lvl ${levelForLook('flame', f.id)}`}
                    onPress={has ? () => onEquip({ flameStyle: f.id as FlameStyleId }) : undefined}
                  >
                    <Fire tier={Math.max(1, fireTier)} size={30} look={f.id} />
                  </Tile>
                );
              })}
            </View>

            <Text style={s.section}>Tick celebration</Text>
            <View style={s.grid}>
              {CELEBRATIONS.map((cel) => {
                const has = owned.celebrations.includes(cel.id);
                return (
                  <Tile
                    key={cel.id}
                    label={cel.name}
                    active={equipped.celebration === cel.id}
                    lockedLabel={has ? undefined : `Lvl ${levelForLook('celebration', cel.id)}`}
                    onPress={has ? () => onEquip({ celebration: cel.id as CelebrationId }) : undefined}
                  >
                    <Sticker grad={CELEBRATION_LOOKS[cel.id]} glyph={CELEBRATION_GLYPHS[cel.id]} size={36} />
                  </Tile>
                );
              })}
            </View>
            <Text style={s.note}>Plays when you tick off a task. Themes are on your profile.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Avatar({ initials, small }: { initials: string; small?: boolean }) {
  return <Disc initials={initials} size={small ? 30 : 40} />;
}

function Tile({
  label,
  active,
  lockedLabel,
  onPress,
  children,
}: {
  label: string;
  active: boolean;
  /** Shown instead of the name while the look isn't won yet. */
  lockedLabel?: string;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[s.tile, active && s.tileActive]}
      accessibilityRole="radio"
      accessibilityState={{ checked: active, disabled: !onPress }}
      accessibilityLabel={lockedLabel ? `${label}, unlocks at ${lockedLabel}` : label}
    >
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
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.55 },
  sheetWrap: { flex: 1, justifyContent: 'center', padding: 16 },
  sheet: { ...card(c), backgroundColor: c.bg, maxWidth: 480, width: '100%', alignSelf: 'center', maxHeight: '92%', padding: 18, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eyebrow: { ...eyebrow(c, 11), color: c.label },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 26, lineHeight: 32, ...headingCase(c) },
  section: { ...eyebrow(c, 11), color: c.muted, marginTop: 12 },
  muted: { color: c.muted, fontSize: 13, lineHeight: 18 },
  note: { color: c.faint, fontSize: 12, lineHeight: 17 },
  token: { ...card(c), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  tokenName: { color: c.text, fontSize: 15, fontWeight: '700' },
  count: { color: c.muted, fontWeight: '600', fontVariant: ['tabular-nums'] },
  use: { ...BRAND_FILL_SMALL, borderRadius: 12, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  useText: { color: BRAND_INK, fontFamily: VIVID_HEAVY, fontSize: 13, ...BRAND_TEXT_SHADOW },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: c.border },
  choiceText: { color: c.muted, fontSize: 13, fontWeight: '600' },
  choiceActive: { ...BRAND_FILL_SMALL, borderColor: 'transparent' },
  choiceTextActive: { color: BRAND_INK, fontFamily: VIVID_HEAVY, ...BRAND_TEXT_SHADOW },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Four to a row: (100% - 3 gaps of 8) / 4 stays above 23% from phone width up.
  tile: {
    width: '23%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: c.radius,
    borderWidth: 1,
    borderColor: c.border,
  },
  tileActive: { borderColor: brandLine(c.dark), borderWidth: 1.5, backgroundColor: c.surface, boxShadow: `0px 0px 12px ${brandGlow(0.35)}` },
  tilePic: { height: 46, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: c.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lockText: { color: c.faint, fontSize: 11, fontWeight: '600' },
}));
