import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { bagCapacity, layoutBag, nextSlotLevel, STACK_SIZE, type BagItem, type BagStack } from '../bag';
import type { GameState, Settings } from '../game';
import { equippedLooks, newOfKind, nextTokenLevel, type OwnedLooks } from '../inventory';
import { card, eyebrow, themed, useStyles, useTheme } from '../theme';
import { adFreeActive, doubleXpActive, restOffer, TOKEN_INFO, tokenCounts } from '../tokens';
import { XP_PER_TICKET } from '../wheel';
import { CelebrationGrid, ThemeGrid } from '../components/LooksPickers';
import { Sheet } from '../components/Sheet';
import { BRAND_FILL_SMALL, BRAND_INK, BRAND_TEXT_SHADOW, CountBadge, Sticker, VIVID_HEAVY } from '../components/Vivid';
import type { GlyphName } from '../glyphs';
import { brandLine, RARITY, TOKEN_LOOKS, type Grad } from '../vivid';

const PER_ROW = 5;

const ITEM_INFO: Record<BagItem, { name: string; description: string }> = {
  ticket: { name: 'Wheel ticket', description: `One spin of the lucky wheel. You get a ticket for every ${XP_PER_TICKET} XP.` },
  ...TOKEN_INFO,
};

/** The name under each slot, short enough for a fifth of a phone's width. */
const SHORT_NAME: Record<BagItem, string> = { ticket: 'Ticket', rest: 'Rest day', double: 'Double XP', reroll: 'Swap', adfree: 'Ad-free' };

function itemLook(item: BagItem): { grad: Grad; glyph: GlyphName } {
  return item === 'ticket' ? { grad: RARITY.legendary, glyph: 'Ticket' } : { grad: TOKEN_LOOKS[item], glyph: TOKEN_LOOKS[item].glyph };
}

/**
 * The inventory, opened from the header, in two tabs. Bag: wheel tickets and
 * tokens in slots, five of a kind to a slot, each named underneath. When the
 * slots are full the rest waits in a tray below and can still be used. Tap a
 * slot to see what it does and use it. Customize: the theme and the tick
 * celebration (also still on the profile). Frames, flames and titles stay on
 * the profile.
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
  freshLooks,
  onSeenLook,
  onSettings,
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
  /** Won looks not seen yet, as "kind:id" keys. */
  freshLooks: Set<string>;
  onSeenLook: (key: string) => void;
  onSettings: (s: Partial<Settings>) => void;
}) {
  const s = useStyles(makeStyles);
  const [open, setOpen] = useState<BagItem | null>(null);
  const freshThemes = newOfKind(freshLooks, 'theme');
  const freshCelebrations = newOfKind(freshLooks, 'celebration');
  const freshLooksHere = freshThemes.size + freshCelebrations.size;
  // New looks and nothing else new: open on Customize, where they are.
  const [tab, setTab] = useState<'bag' | 'customize'>(freshLooksHere > 0 ? 'customize' : 'bag');
  const counts: Record<BagItem, number> = { ticket: tickets, ...tokenCounts(state) };
  const capacity = bagCapacity(level);
  const { slots, waiting } = layoutBag(counts, capacity);
  const nextSlots = nextSlotLevel(level);
  const offer = restOffer(state, today);
  const rows: (BagStack | undefined)[][] = [];
  for (let i = 0; i < capacity; i += PER_ROW) rows.push(Array.from({ length: PER_ROW }, (_, j) => slots[i + j]));

  function action(item: BagItem): { label: string; onPress?: () => void; note?: string } {
    if (counts[item] <= 0) {
      if (item === 'ticket') return { label: '', note: `Earn ${XP_PER_TICKET} XP for your next ticket.` };
      const next = nextTokenLevel(item, level);
      return { label: '', note: next ? `Next one at level ${next}, or win one on the wheel.` : 'Win more on the wheel.' };
    }
    switch (item) {
      case 'ticket':
        return { label: 'Spin the wheel', onPress: onOpenSpin };
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

  const picked = open ? action(open) : undefined;

  const { celebration } = equippedLooks(settings, owned);
  const themeId = unlockedThemes.has(settings.theme) ? settings.theme : 'classic';

  const tabs = (
    <View style={s.segment} accessibilityRole="tablist">
      {(['bag', 'customize'] as const).map((v) => (
        <Pressable
          key={v}
          onPress={() => setTab(v)}
          style={[s.segmentItem, tab === v && s.segmentActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === v }}
          accessibilityLabel={v === 'bag' ? 'Bag' : `Customize${freshLooksHere ? `, ${freshLooksHere} new` : ''}`}
        >
          <Text style={[s.segmentText, tab === v && s.segmentTextActive]}>{v === 'bag' ? 'Bag' : 'Customize'}</Text>
          {v === 'customize' && <CountBadge count={freshLooksHere} style={s.segmentBadge} />}
        </Pressable>
      ))}
    </View>
  );

  if (tab === 'customize') {
    return (
      <ScrollView contentContainerStyle={s.content}>
        {tabs}
        <Text style={[s.section, s.lookHeading]}>Theme</Text>
        <ThemeGrid
          current={themeId}
          unlocked={unlockedThemes}
          onPick={(id) => onSettings({ theme: id })}
          fresh={{ ids: freshThemes, onSeen: (id) => onSeenLook(`theme:${id}`) }}
        />
        <Text style={[s.section, s.lookHeading]}>Tick celebration</Text>
        <CelebrationGrid
          owned={owned.celebrations}
          equipped={celebration}
          onPick={(id) => onSettings({ celebration: id })}
          fresh={{ ids: freshCelebrations, onSeen: (id) => onSeenLook(`celebration:${id}`) }}
        />
        <Pressable onPress={onOpenProfile} style={s.looksLink} accessibilityRole="button">
          <Text style={s.muted}>Frames, flames and titles are on your profile.</Text>
          <Text style={s.linkText}>Open profile</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      {tabs}
      <View style={s.head}>
        <Text style={s.section}>Bag</Text>
        <Text style={s.note}>
          {slots.length} of {capacity} slots{nextSlots ? ` · 5 more at level ${nextSlots}` : ''}
        </Text>
      </View>

      <View style={s.slots}>
        {rows.map((row, r) => (
          <View key={r} style={s.row}>
            {row.map((stack, j) =>
              stack ? (
                <Slot key={j} stack={stack} onPress={() => setOpen(stack.item)} />
              ) : (
                <View key={j} style={[s.slot, s.slotEmpty]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
              ),
            )}
          </View>
        ))}
      </View>
      {slots.length === 0 && <Text style={s.muted}>Empty for now. Every {XP_PER_TICKET} XP gives you a wheel ticket, and levels bring tokens.</Text>}

      {waiting.length > 0 && (
        <View style={s.tray}>
          <Text style={s.section}>Rewards waiting</Text>
          <Text style={s.muted}>Your bag is full, so these wait here. You can still use every one of them.</Text>
          <View style={s.trayRow}>
            {waiting.map((w) => (
              <Pressable key={w.item} onPress={() => setOpen(w.item)} style={s.trayItem} accessibilityRole="button" accessibilityLabel={`${w.count} more ${ITEM_INFO[w.item].name}`}>
                <Sticker {...itemLook(w.item)} size={30} flat />
                <Text style={s.trayCount}>×{w.count}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Pressable onPress={onOpenProfile} style={s.looksLink} accessibilityRole="button">
        <Text style={s.muted}>Frames, flames and titles are on your profile.</Text>
        <Text style={s.linkText}>Open profile</Text>
      </Pressable>

      <Sheet visible={open !== null} onClose={() => setOpen(null)} eyebrow="In your bag" title={open ? ITEM_INFO[open].name : ''}>
        {open && picked && (
          <View style={s.detail}>
            <Sticker {...itemLook(open)} size={64} />
            <Text style={s.detailCount}>×{Math.max(0, counts[open])}</Text>
            <Text style={[s.muted, { textAlign: 'center' }]}>{ITEM_INFO[open].description}</Text>
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

function Slot({ stack, onPress }: { stack: BagStack; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const full = stack.count >= STACK_SIZE;
  return (
    <Pressable onPress={onPress} style={[s.slot, full && { borderColor: brandLine(c.dark) }]} accessibilityRole="button" accessibilityLabel={`${ITEM_INFO[stack.item].name}, ${stack.count}`}>
      <Sticker {...itemLook(stack.item)} size={28} flat />
      <Text style={s.slotName} numberOfLines={1} adjustsFontSizeToFit>
        {SHORT_NAME[stack.item]}
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
  trayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trayItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: c.border },
  trayCount: { color: c.text, fontFamily: VIVID_HEAVY, fontSize: 14, fontVariant: ['tabular-nums'] },
  looksLink: { marginTop: 14, gap: 4, alignItems: 'center' },
  lookHeading: { marginTop: 8 },
  // Same switch as Awards / Stats on the profile.
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: c.radius + 6, backgroundColor: c.surface, marginTop: 4, marginBottom: 6 },
  segmentItem: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: c.radius + 2 },
  segmentActive: { ...BRAND_FILL_SMALL },
  segmentText: { color: c.muted, fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: BRAND_INK, fontFamily: VIVID_HEAVY, ...BRAND_TEXT_SHADOW },
  segmentBadge: { position: 'absolute', top: -6, right: 10 },
  linkText: { color: c.accent, fontSize: 14, fontWeight: '700' },
  detail: { alignItems: 'center', gap: 8, paddingVertical: 6 },
  detailCount: { color: c.text, fontFamily: VIVID_HEAVY, fontSize: 22, fontVariant: ['tabular-nums'] },
  use: { ...BRAND_FILL_SMALL, borderRadius: 14, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center', marginTop: 6 },
  useText: { color: BRAND_INK, fontFamily: VIVID_HEAVY, fontSize: 15, ...BRAND_TEXT_SHADOW },
}));
