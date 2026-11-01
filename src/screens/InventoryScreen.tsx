import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { bagCapacity, freshStacks, layoutBag, newByItem, nextSlotLevel, STACK_SIZE, type BagItem, type BagStack } from '../bag';
import { shownName, type GameState, type Settings } from '../game';
import { equippedLooks, newOfKind, nextTokenLevel, type OwnedLooks } from '../inventory';
import { card, eyebrow, nativeDriver, themeById, themed, useStyles, useTheme } from '../theme';
import { useReduceMotion } from '../components/FireAura';
import { adFreeActive, doubleXpActive, restOffer, TOKEN_INFO, tokenCounts } from '../tokens';
import { XP_PER_TICKET } from '../wheel';
import { CelebrationGrid, FlameGrid, ThemeGrid, UnlockSheet, type LookRef } from '../components/LooksPickers';
import { achievementStatuses } from '../achievements';
import { seasonStatus } from '../seasons';
import { trophyStatuses } from '../trophies';
import { unlockFor } from '../unlocks';
import { spinsToPity } from '../wheel';
import { Sheet } from '../components/Sheet';
import { brandFillSmall, brandInk, brandTextShadow, CountBadge, Sticker, VIVID_HEAVY } from '../components/Vivid';
import type { GlyphName } from '../glyphs';
import { brandLine, RARITY, TOKEN_LOOKS, type Grad } from '../vivid';
import { N, t } from '../i18n';
import { Wardrobe } from '../components/Wardrobe';

const PER_ROW = 5;
const TAB_NAMES = { bag: () => t('Bag'), customize: () => t('Theme'), outfits: () => t('Outfits') };

const ITEM_INFO: Record<BagItem, { name: string; description: string }> = {
  ticket: { name: N('Wheel ticket'), description: N('One spin of the lucky wheel. You get a ticket for every {n} XP.') },
  ...TOKEN_INFO,
};

/** The name under each slot, short enough for a fifth of a phone's width. */
const SHORT_NAME: Record<BagItem, string> = { ticket: N('Ticket'), rest: N('Rest day'), double: N('Double XP'), reroll: N('Swap'), adfree: N('Ad-free') };

const itemName = (item: BagItem) => t(ITEM_INFO[item].name);
const itemDescription = (item: BagItem) => t(ITEM_INFO[item].description, { n: XP_PER_TICKET });

function itemLook(item: BagItem): { grad: Grad; glyph: GlyphName } {
  return item === 'ticket' ? { grad: RARITY.legendary, glyph: 'Ticket' } : { grad: TOKEN_LOOKS[item], glyph: TOKEN_LOOKS[item].glyph };
}

/**
 * The inventory, opened from the header, in three tabs (Outfits: see Wardrobe). Bag: wheel tickets and
 * tokens in slots, five of a kind to a slot, each named underneath. When the
 * slots are full the rest waits in a tray below and can still be used. Tap a
 * slot to see what it does and use it. Theme: the theme, the
 * tick celebration and the streak flame (only here). Frames and titles stay
 * on the profile.
 */
export function InventoryScreen({
  state,
  today,
  level,
  tickets,
  onOpenSpin,
  onRest,
  onDouble,
  onAdFree,
  onOpenChallenges,
  onOpenProfile,
  settings,
  owned,
  unlockedThemes,
  fireTier,
  freshLooks,
  onSeenLook,
  onSettings,
  bizzyForm,
  onToggleOutfit,
  startTab,
}: {
  state: GameState;
  today: string;
  level: number;
  /** Wheel tickets ready to spend. */
  tickets: number;
  onOpenSpin: () => void;
  onRest: (day: string) => void;
  onDouble: () => void;
  onAdFree: () => void;
  onOpenChallenges: () => void;
  onOpenProfile: () => void;
  settings: Settings;
  owned: OwnedLooks;
  /** Ids of themes the player may use. */
  unlockedThemes: Set<string>;
  /** Current streak fire tier, so flame previews match the player's own fire. */
  fireTier: number;
  /** Won looks not seen yet, as "kind:id" keys. */
  freshLooks: Set<string>;
  onSeenLook: (key: string) => void;
  onSettings: (s: Partial<Settings>) => void;
  /** Bizzy's form, for the Outfits tab's stage. */
  bizzyForm: number;
  onToggleOutfit: (id: string) => void;
  /** Opens on this tab instead of Bag (or Theme when new looks wait there). */
  startTab?: 'outfits';
}) {
  const s = useStyles(makeStyles);
  const [open, setOpen] = useState<BagItem | null>(null);
  const freshThemes = newOfKind(freshLooks, 'theme');
  const freshCelebrations = newOfKind(freshLooks, 'celebration');
  const freshFlames = newOfKind(freshLooks, 'flame');
  const freshLooksHere = freshThemes.size + freshCelebrations.size + freshFlames.size;
  // New looks and nothing else new: open on Theme, where they are.
  const [tab, setTab] = useState<'bag' | 'customize' | 'outfits'>(startTab ?? (freshLooksHere > 0 ? 'customize' : 'bag'));
  const counts: Record<BagItem, number> = { ticket: tickets, ...tokenCounts(state) };
  const capacity = bagCapacity(level);
  const { slots, waiting } = layoutBag(counts, capacity);
  // What came in since the bag was last opened, kept from the moment it opened
  // (the app marks the bag as seen straight after). Those stacks wear "NEW" for a moment.
  const [fresh, setFresh] = useState(() => newByItem(counts, settings.bagSeen));
  const tags = freshStacks(slots, waiting, fresh);
  const nextSlots = nextSlotLevel(level);
  const offer = restOffer(state, today);
  const rows: (BagStack | undefined)[][] = [];
  for (let i = 0; i < capacity; i += PER_ROW) rows.push(Array.from({ length: PER_ROW }, (_, j) => slots[i + j]));

  function action(item: BagItem): { label: string; onPress?: () => void; note?: string } {
    if (counts[item] <= 0) {
      if (item === 'ticket') return { label: '', note: t('Earn {n} XP for your next ticket.', { n: XP_PER_TICKET }) };
      const next = nextTokenLevel(item, level);
      return { label: '', note: next ? t('Next one at level {n}, or win one on the wheel.', { n: next }) : t('Win more on the wheel.') };
    }
    switch (item) {
      case 'ticket':
        return { label: t('Spin the wheel'), onPress: onOpenSpin };
      case 'rest':
        return offer
          ? { label: offer.missed ? t('Save yesterday') : t('Take today off'), onPress: () => onRest(offer.day) }
          : { label: '', note: t('Nothing to save right now. Use it on a day you can’t do a task.') };
      case 'double':
        return doubleXpActive(state, today) ? { label: '', note: t('On for the rest of today.') } : { label: t('Use now'), onPress: onDouble };
      case 'reroll':
        return { label: t('Pick a challenge'), onPress: onOpenChallenges };
      case 'adfree':
        return adFreeActive(state, today) ? { label: '', note: t('No ads until midnight.') } : { label: t('Use now'), onPress: onAdFree };
    }
  }

  const picked = open ? action(open) : undefined;

  // A locked look that was tapped, and what it needs.
  const [locked, setLocked] = useState<LookRef | null>(null);
  const unlock = locked
    ? unlockFor(locked.kind === 'theme' ? { kind: 'theme', reward: themeById(locked.id).reward ?? '' } : { kind: locked.kind, id: locked.id }, {
        level,
        achievements: achievementStatuses(state, today),
        trophies: trophyStatuses(state, today),
        season: seasonStatus(state, today),
        spinsToPity: spinsToPity(state),
      })
    : undefined;

  const { celebration, flameStyle } = equippedLooks(settings, owned);
  const themeId = unlockedThemes.has(settings.theme) ? settings.theme : 'classic';

  const tabs = (
    <View style={s.segment} accessibilityRole="tablist">
      {(['bag', 'customize', 'outfits'] as const).map((v) => (
        <Pressable
          key={v}
          onPress={() => setTab(v)}
          style={[s.segmentItem, tab === v && s.segmentActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === v }}
          accessibilityLabel={v === 'customize' && freshLooksHere ? t('Theme, {n} new', { n: freshLooksHere }) : TAB_NAMES[v]()}
        >
          <Text style={[s.segmentText, tab === v && s.segmentTextActive]}>{TAB_NAMES[v]()}</Text>
          {v === 'customize' && <CountBadge count={freshLooksHere} style={s.segmentBadge} />}
        </Pressable>
      ))}
    </View>
  );

  if (tab === 'outfits') {
    return (
      <ScrollView contentContainerStyle={s.content}>
        {tabs}
        <Wardrobe state={state} form={bizzyForm} onToggle={onToggleOutfit} />
      </ScrollView>
    );
  }

  if (tab === 'customize') {
    return (
      <ScrollView contentContainerStyle={s.content}>
        {tabs}
        <Text style={[s.section, s.lookHeading]}>{t('Theme')}</Text>
        <ThemeGrid
          current={themeId}
          unlocked={unlockedThemes}
          onPick={(id) => onSettings({ theme: id })}
          fresh={{ ids: freshThemes, onSeen: (id) => onSeenLook(`theme:${id}`) }}
          onLocked={(id) => setLocked({ kind: 'theme', id })}
        />
        <Text style={[s.section, s.lookHeading]}>{t('Tick celebration')}</Text>
        <CelebrationGrid
          owned={owned.celebrations}
          equipped={celebration}
          onPick={(id) => onSettings({ celebration: id })}
          fresh={{ ids: freshCelebrations, onSeen: (id) => onSeenLook(`celebration:${id}`) }}
          onLocked={(id) => setLocked({ kind: 'celebration', id })}
        />
        <Text style={[s.section, s.lookHeading]}>{t('Streak flame')}</Text>
        <FlameGrid
          owned={owned.flames}
          equipped={flameStyle}
          fireTier={fireTier}
          onPick={(id) => onSettings({ flameStyle: id })}
          fresh={{ ids: freshFlames, onSeen: (id) => onSeenLook(`flame:${id}`) }}
          onLocked={(id) => setLocked({ kind: 'flame', id })}
        />
        <Text style={s.muted}>{t('Your fire grows with your streak. The style is yours to pick.')}</Text>
        <Pressable onPress={onOpenProfile} style={s.looksLink} accessibilityRole="button">
          <Text style={s.muted}>{t('Frames and titles are on your profile.')}</Text>
          <Text style={s.linkText}>{t('Open profile')}</Text>
        </Pressable>
        <UnlockSheet look={locked} unlock={unlock} initials={shownName(state.profile.name).trim().slice(0, 2).toUpperCase() || '?'} fireTier={fireTier} onClose={() => setLocked(null)} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      {tabs}
      <View style={s.head}>
        <Text style={s.section}>{t('Bag')}</Text>
        <Text style={s.note}>
          {t('{n} of {total} slots', { n: slots.length, total: capacity })}
          {nextSlots ? ` · ${t('5 more at level {n}', { n: nextSlots })}` : ''}
        </Text>
      </View>

      <View style={s.slots}>
        {rows.map((row, r) => (
          <View key={r} style={s.row}>
            {row.map((stack, j) =>
              stack ? (
                <Slot key={j} stack={stack} isNew={tags.slots.has(r * PER_ROW + j)} onFaded={() => setFresh({})} onPress={() => setOpen(stack.item)} />
              ) : (
                <View key={j} style={[s.slot, s.slotEmpty]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
              ),
            )}
          </View>
        ))}
      </View>
      {slots.length === 0 && <Text style={s.muted}>{t('Empty for now. Every {n} XP gives you a wheel ticket, and levels bring tokens.', { n: XP_PER_TICKET })}</Text>}

      {waiting.length > 0 && (
        <View style={s.tray}>
          <Text style={s.section}>{t('Rewards waiting')}</Text>
          <Text style={s.muted}>{t('Your bag is full, so these wait here. You can still use every one of them.')}</Text>
          <View style={s.trayRow}>
            {waiting.map((w) => (
              <Pressable
                key={w.item}
                onPress={() => setOpen(w.item)}
                style={s.trayItem}
                accessibilityRole="button"
                accessibilityLabel={`${t('{n} more: {item}', { n: w.count, item: itemName(w.item) })}${tags.waiting.has(w.item) ? `, ${t('new')}` : ''}`}
              >
                <Sticker {...itemLook(w.item)} size={30} flat />
                <Text style={s.trayCount}>×{w.count}</Text>
                {tags.waiting.has(w.item) && <NewTag onFaded={() => setFresh({})} />}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Pressable onPress={onOpenProfile} style={s.looksLink} accessibilityRole="button">
        <Text style={s.muted}>{t('Frames and titles are on your profile.')}</Text>
        <Text style={s.linkText}>{t('Open profile')}</Text>
      </Pressable>

      <Sheet visible={open !== null} onClose={() => setOpen(null)} eyebrow={t('In your bag')} title={open ? itemName(open) : ''}>
        {open && picked && (
          <View style={s.detail}>
            <Sticker {...itemLook(open)} size={64} />
            <Text style={s.detailCount}>×{Math.max(0, counts[open])}</Text>
            <Text style={[s.muted, { textAlign: 'center' }]}>{itemDescription(open)}</Text>
            {picked.note && <Text style={[s.note, { textAlign: 'center' }]}>{picked.note}</Text>}
            {picked.onPress && (
              <Pressable
                onPress={() => {
                  setOpen(null);
                  picked.onPress!();
                }}
                style={s.use}
                accessibilityRole="button"
              >
                <Text style={s.useText}>{picked.label}</Text>
              </Pressable>
            )}
          </View>
        )}
      </Sheet>
    </ScrollView>
  );
}

/** How long a "NEW" tag stays before it fades, and how long the fade takes. */
const NEW_SHOWN_MS = 1500;
const NEW_FADE_MS = 400;

/**
 * "NEW" above a bag item that came in since the bag was last opened. It fades
 * away a moment after the bag opens; with less motion it stays until the bag is left.
 */
function NewTag({ onFaded }: { onFaded: () => void }) {
  const s = useStyles(makeStyles);
  const reduce = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) return;
    const fade = Animated.sequence([Animated.delay(NEW_SHOWN_MS), Animated.timing(opacity, { toValue: 0, duration: NEW_FADE_MS, useNativeDriver: nativeDriver })]);
    fade.start(({ finished }) => finished && onFaded());
    return () => fade.stop();
  }, [reduce]);
  return (
    <Animated.View style={[s.newTag, { opacity }]} pointerEvents="none">
      <Text style={s.newTagText}>{t('NEW')}</Text>
    </Animated.View>
  );
}

function Slot({ stack, isNew, onFaded, onPress }: { stack: BagStack; isNew: boolean; onFaded: () => void; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const full = stack.count >= STACK_SIZE;
  return (
    <Pressable
      onPress={onPress}
      style={[s.slot, full && { borderColor: brandLine(c) }]}
      accessibilityRole="button"
      accessibilityLabel={`${itemName(stack.item)}, ${stack.count}${isNew ? `, ${t('new')}` : ''}`}
    >
      {isNew && <NewTag onFaded={onFaded} />}
      <Sticker {...itemLook(stack.item)} size={28} flat />
      <Text style={s.slotName} numberOfLines={1} adjustsFontSizeToFit>
        {t(SHORT_NAME[stack.item])}
      </Text>
      {stack.count > 1 && <Text style={s.slotCount}>{stack.count}</Text>}
    </Pressable>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingTop: 8, paddingBottom: 48, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  section: { ...eyebrow(c, 11), color: c.muted },
  muted: { color: c.muted, fontSize: 13, lineHeight: 18 },
  note: { color: c.faint, fontSize: 12, lineHeight: 17 },
  slots: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  slot: { ...card(c), flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 3, padding: 0, paddingHorizontal: 2 },
  slotName: { color: c.muted, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  slotEmpty: { backgroundColor: 'transparent', borderStyle: 'dashed', boxShadow: 'none' },
  slotCount: {
    position: 'absolute',
    right: 5,
    top: 3,
    color: c.text,
    fontFamily: VIVID_HEAVY,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 3,
  },
  tray: { ...card(c), padding: 14, gap: 8, marginTop: 6 },
  newTag: { position: 'absolute', top: -7, alignSelf: 'center', ...brandFillSmall(c), borderRadius: 6, paddingHorizontal: 5, height: 14, justifyContent: 'center', zIndex: 2 },
  newTagText: { color: brandInk(c), fontFamily: VIVID_HEAVY, fontSize: 9, letterSpacing: 0.6, lineHeight: 11 },
  trayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trayItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: c.border },
  trayCount: { color: c.text, fontFamily: VIVID_HEAVY, fontSize: 14, fontVariant: ['tabular-nums'] },
  looksLink: { marginTop: 14, gap: 4, alignItems: 'center' },
  lookHeading: { marginTop: 8 },
  // Same switch as Awards / Stats on the profile.
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: c.radius + 6, backgroundColor: c.surface, marginTop: 4, marginBottom: 6 },
  segmentItem: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: c.radius + 2 },
  segmentActive: { ...brandFillSmall(c) },
  segmentText: { color: c.muted, fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: brandInk(c), fontFamily: VIVID_HEAVY, ...brandTextShadow(c) },
  segmentBadge: { position: 'absolute', top: -6, right: 10 },
  linkText: { color: c.accent, fontSize: 14, fontWeight: '700' },
  detail: { alignItems: 'center', gap: 8, paddingVertical: 6 },
  detailCount: { color: c.text, fontFamily: VIVID_HEAVY, fontSize: 22, fontVariant: ['tabular-nums'] },
  use: { ...brandFillSmall(c), borderRadius: 14, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center', marginTop: 6 },
  useText: { color: brandInk(c), fontFamily: VIVID_HEAVY, fontSize: 15, ...brandTextShadow(c) },
}));
