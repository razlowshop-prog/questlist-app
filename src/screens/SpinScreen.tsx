import { buzz } from '../haptics';
import { sound } from '../sounds';
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, { cancelAnimation, Easing as REasing, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CoinCheck, CoinShower, GOLD, GoldText, HOLO, HoloBorder, ShimmerBar, Star4, StarRule } from '../components/Fortuna';
import { KEYLINE, MYTHIC, prizeIcon, PrizeSticker, RARITY_COLORS } from '../components/PrizeSticker';
import { TOKEN_INFO } from '../tokens';
import { VIVID_HEAVY } from '../components/Vivid';
import { useReduceMotion } from '../components/FireAura';
import { eyebrow, FONTS, headingCase, themed, useStyles, useTheme } from '../theme';
import {
  JACKPOT,
  PITY_SPINS,
  prizeById,
  prizeLabel,
  rarityName,
  segmentFor,
  wheelSize,
  WHEEL_PRIZES,
  WHEEL_SEGMENTS,
  XP_PER_TICKET,
  type TicketStatus,
  type WheelPrize,
} from '../wheel';
import type { WheelSpin } from '../game';
import { Bizzy } from '../components/Bizzy';
import { FlyingBizzy, useFlyer } from '../components/fx/Flyer';
import { outfitById, outfitDrawing, outfitName, OUTFIT_XP, RARITY_LABEL, type Outfit } from '../outfits';
import { N, t, tn } from '../i18n';

const TURNS = 6;
/** A swipe spins between these many turns, more for a faster flick. */
const SWIPE_TURNS = [3, 9];
/** Slowest flick that still spins the wheel, in radians per millisecond. */
const MIN_FLICK = 0.003;
const SPIN_MS = 3200;
/** At most one haptic tick per this many ms. */
const TICK_MS = 40;
const CINZEL = 'Cinzel_800ExtraBold';
/** The gold centre's width as a share of the wheel: it is the Spin button. */
const HUB_SHARE = 0.3;
/** Room above the wheel for the pointer, and the same below, so the corner chips stay clear of the rim. */
const SLOT_PAD = 26;


/** Each slice's short label on the wheel (design "Calm"); rarity shows as the rim arc and icon colour. */
const LABELS: Record<string, string> = {
  xp20: '20 XP',
  xp50: '50 XP',
  xp100: '100 XP',
  double: '2× XP',
  rest: N('Rest day'),
  reroll: N('Swap'),
  adfree: N('Ad-free'),
  theme: 'Fortuna',
  jackpot: N('Jackpot'),
  o1: N('Rare'),
  o2: N('Epic'),
  o3: N('Legendary'),
};
/** The two slice colours, alternating round the wheel. */
const SLICE_FILLS = ['#1d2335', '#252c42'];
const LABEL_INK = '#eef1fa';
const FORTUNA_INK = '#f2c55c';

/** What a slice gives, for the note under the wheel when it is tapped. */
function prizeAbout(prize: WheelPrize, ownsTheme: boolean): string {
  if (prize.theme) return ownsTheme ? t('You own Fortuna, so this slice now pays a big XP jackpot.') : t('The Fortuna theme: a gold and violet look for the whole app. The rarest slice.');
  if (prize.token) return `${t(TOKEN_INFO[prize.token].description)} ${t('It goes into your bag until you use it.')}`;
  if (prize.outfit)
    return t('A {rarity} outfit for Bizzy that you don’t have yet. Once you own every {rarity} one, this slice pays {n} XP instead.', { rarity: t(RARITY_LABEL[prize.outfit]), n: OUTFIT_XP[prize.outfit] });
  return t('{n} XP straight onto your level bar. Wheel XP doesn’t earn new tickets.', { n: prize.xp! });
}

/** A prize's colour, for dots and rays: its rarity's colour; the theme (and its jackpot) is rainbow. */
function prizeColor(prize: WheelPrize): string {
  return RARITY_COLORS[prize.rarity].c1;
}

const isMythic = (prize: WheelPrize) => !!prize.theme || prize.id === JACKPOT.id;

/**
 * The lucky wheel tab (design "layout B, look L4"): the page wears the
 * player's theme, and only the wheel, its gold centre and a soft glow behind
 * it are Fortuna. The whole wheel fits the screen as the tab opens: it sizes
 * itself to the space left. The gold centre is the Spin button and shows the
 * tickets; tickets, the odds ("?"), the next ticket and the lucky meter sit
 * as small chips in the free corners round the wheel. How tickets work and
 * the latest wins follow below. A spin runs about five seconds with the
 * pointer flicking (and the phone ticking) over each slice edge, then the
 * prize card pops up.
 */
export function SpinScreen({
  tickets,
  pity,
  ownsTheme,
  spins,
  onSpin,
  onWearTheme,
  onWearOutfit,
  onBusy,
}: {
  tickets: TicketStatus;
  /** Spins left until the theme is guaranteed; undefined once won. */
  pity?: number;
  ownsTheme: boolean;
  spins: WheelSpin[];
  /** Spends a ticket (saved at once); `finish` hands the prize out once it's revealed. */
  onSpin: () => ({ finish: () => void } & Won) | undefined;
  onWearTheme: () => void;
  /** Puts on an outfit just won. */
  onWearOutfit: (id: string) => void;
  /** True while the wheel turns: the app holds the tabs, so the prize can't be left behind. */
  onBusy?: (busy: boolean) => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const reduceMotion = useReduceMotion();
  const window = useWindowDimensions();
  // The space between the header and the tab bar; until it's measured, a guess from the window.
  const [room, setRoom] = useState({ w: window.width, h: window.height - 190 });
  const size = wheelSize(room.w, room.h);
  const k = size / 320;
  // The wheel and pointer turn on the animation thread (Reanimated), so the spin stays smooth.
  const rotation = useSharedValue(0);
  const angle = useRef(0);
  const kick = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  useEffect(() => {
    onBusy?.(spinning);
    return () => onBusy?.(false);
  }, [spinning]);
  const [won, setWon] = useState<Won | null>(null);
  const [oddsOpen, setOddsOpen] = useState(false);
  /** The slice the player tapped, explained under the wheel. */
  const [about, setAbout] = useState<WheelPrize | null>(null);
  const lastTick = useRef(0);
  // The prize hand-out of a spin still turning. Run when it lands, or at once if the screen closes first.
  const pending = useRef<(() => void) | null>(null);
  const has = tickets.tickets > 0;

  useEffect(
    () => () => {
      pending.current?.();
      pending.current = null;
    },
    [],
  );

  function tick() {
    const now = Date.now();
    if (now - lastTick.current >= TICK_MS) {
      lastTick.current = now;
      buzz('step');
      sound('wheel');
    }
  }

  // The pointer flicks, and the phone ticks, each time a slice edge passes under it.
  useAnimatedReaction(
    () => segmentAt(rotation.value),
    (seg, before) => {
      if (before === null || seg === before) return;
      kick.value = 1;
      kick.value = withTiming(0, { duration: 140, easing: REasing.out(REasing.quad) });
      scheduleOnRN(tick);
    },
  );

  function landed(result: Won) {
    const finish = pending.current;
    if (!finish) return;
    pending.current = null;
    setSpinning(false);
    setWon(result);
    // The prize buzz comes with the hand-out.
    finish();
  }

  /**
   * Spends a ticket and turns the wheel onto the prize. The prize is drawn
   * here, by chance, exactly like the button: a swipe only picks the
   * direction (-1 = anticlockwise) and how many turns it takes.
   */
  function spin(direction: 1 | -1 = 1, turns = TURNS) {
    if (spinning || !has) return;
    const result = onSpin();
    if (!result) return;
    const { prize, finish, outfit, xp } = result;
    setAbout(null);
    const { at } = segmentFor(prize.id, Math.random());
    // The pointer is at the top; the wheel turns until `at` is under it.
    const from = angle.current;
    const wanted = (360 - at * 360) % 360;
    const ahead = (wanted - (from % 360) + 360) % 360;
    const whole = reduceMotion ? 0 : turns * 360;
    const to = direction === 1 ? from + whole + ahead : from - whole - ((360 - ahead) % 360);
    angle.current = to;
    pending.current = finish;
    setSpinning(true);
    rotation.value = withTiming(
      to,
      // Fast start, long slow-down: the last slices crawl past. More turns take a little longer.
      { duration: reduceMotion ? 400 : SPIN_MS + (turns - TURNS) * 300, easing: REasing.bezier(0.12, 0.75, 0.15, 1) },
      () => scheduleOnRN(landed, { prize, outfit, xp }),
    );
  }

  // Latest values for the touch handler, which is created once.
  const live = useRef({ spin, spinning, has, size, ownsTheme });
  live.current = { spin, spinning, has, size, ownsTheme };

  /**
   * Touches on the wheel face: a flick around the centre spins it that way,
   * a faster flick for longer; a tap explains the slice under the finger.
   */
  const touch = useMemo(
    () =>
      PanResponder.create({
        // Not while it turns, so a drag that starts on the wheel still scrolls the page.
        onStartShouldSetPanResponder: () => !live.current.spinning,
        // The page may still take the touch over: an up or down drag on the wheel
        // scrolls, a sideways flick spins and a tap explains the slice.
        onShouldBlockNativeResponder: () => false,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (e, g) => {
          const { spin, spinning, has, size, ownsTheme } = live.current;
          if (spinning) return;
          // Where the touch started, relative to the centre.
          const rx = e.nativeEvent.locationX - g.dx - size / 2;
          const ry = e.nativeEvent.locationY - g.dy - size / 2;
          const moved = Math.hypot(g.dx, g.dy);
          if (moved < 8) {
            const tx = rx + g.dx;
            const ty = ry + g.dy;
            if (Math.hypot(tx, ty) < size * HUB_SHARE * 0.5) return;
            // The tapped spot's angle, clockwise from the top, then back onto the unturned face.
            const tapped = (Math.atan2(tx, -ty) * 180) / Math.PI;
            const seg = WHEEL_SEGMENTS[segmentAt(angle.current - tapped)];
            const prize = prizeById(seg.prize);
            setAbout((a) => (a?.id === prize.id ? null : ownsTheme && prize.theme ? JACKPOT : prize));
            return;
          }
          // Spin speed around the centre: the sideways part of the flick over the distance from the centre.
          const r2 = Math.max(rx * rx + ry * ry, (size * 0.15) ** 2);
          const omega = (rx * g.vy - ry * g.vx) / r2;
          if (!has || Math.abs(omega) < MIN_FLICK) return;
          const [least, most] = SWIPE_TURNS;
          const turns = Math.round(Math.min(most, Math.max(least, least + (Math.abs(omega) - MIN_FLICK) * 600)));
          spin(omega > 0 ? 1 : -1, turns);
        },
      }),
    [],
  );

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const pointerStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-20 * kick.value}deg` }] }));
  const recent = spins.slice(-5).reverse();
  const toGo = XP_PER_TICKET - tickets.progress;

  const hub = size * HUB_SHARE;
  return (
    <View style={s.screen} onLayout={(e) => setRoom({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <ScrollView contentContainerStyle={s.content}>
        {/* The first screen: title, the wheel with its corner chips, and the hint. */}
        <View style={s.eyebrowRow}>
          <StarRule end="left" style={{ width: 40 }} />
          <Text style={[s.eyebrow, !c.dark && { color: GOLD.deep }]}>{t('Fortuna')}</Text>
          <StarRule end="right" style={{ width: 40 }} />
        </View>
        <Gold dark={c.dark} style={s.heading}>
          {t('Spin the wheel')}
        </Gold>

        <View style={[s.slot, { height: size + 2 * SLOT_PAD }]}>
          <Halo size={size} light={!c.dark} />
          <View style={[s.wheelBox, { width: size, height: size, borderRadius: size / 2 }]}>
            <Rim size={size} />
            <Reanimated.View style={[{ position: 'absolute', width: size, height: size }, wheelStyle]}>
              <WheelFace size={size} ownsTheme={ownsTheme} />
              <SliceLabels size={size} ownsTheme={ownsTheme} rotation={rotation} still={reduceMotion} />
            </Reanimated.View>
            {/* Doesn't turn, so touch positions stay simple; the gold centre sits above it. */}
            <View
              {...touch.panHandlers}
              style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2 }}
              accessibilityHint={t('Swipe around the wheel to spin it, or tap a slice to see what it gives')}
            />
            <Pressable
              onPress={() => spin()}
              disabled={spinning || !has}
              style={{ width: hub, height: hub, borderRadius: hub / 2 }}
              accessibilityRole="button"
              accessibilityState={{ disabled: spinning || !has }}
              accessibilityLabel={has ? tn(tickets.tickets, 'Spin the wheel, {n} ticket', 'Spin the wheel, {n} tickets') : t('No tickets yet')}
            >
              <Hub size={hub} tickets={tickets.tickets} spinning={spinning} />
            </Pressable>
            <Reanimated.View
              pointerEvents="none"
              style={[{ position: 'absolute', top: -20 * k, width: 28 * k, height: 34 * k, transformOrigin: `${14 * k}px ${11 * k}px` }, pointerStyle]}
            >
              <Pointer scale={k} dark={!c.dark} />
            </Reanimated.View>
          </View>
          {/* The free corners round the wheel. */}
          <View style={[s.chip, s.chipTopLeft]} accessibilityLabel={tn(tickets.tickets, '{n} ticket ready to spin', '{n} tickets ready to spin')}>
            <MiniTicket dim={!has} />
            <Text style={s.chipText}>× {tickets.tickets}</Text>
          </View>
          <Pressable onPress={() => setOddsOpen(true)} hitSlop={10} style={[s.chip, s.chipRound, s.chipTopRight]} accessibilityRole="button" accessibilityLabel={t('Show the odds')}>
            <Text style={s.oddsButtonText}>?</Text>
          </Pressable>
          <View style={[s.chip, s.chipBottomLeft]} accessibilityLabel={t('Next ticket · {n} XP to go', { n: toGo })}>
            <Text style={s.chipText}>{t('{n} XP', { n: toGo })}</Text>
            <View style={s.mini}>
              <View style={[s.miniFill, { width: `${(tickets.progress / XP_PER_TICKET) * 100}%` }]} />
            </View>
          </View>
          {pity !== undefined && (
            <View style={[s.chip, s.chipBottomRight]} accessibilityLabel={pity <= 1 ? t('Lucky meter: your next spin wins Fortuna for sure.') : t('Lucky meter: {n} spins left until Fortuna is guaranteed.', { n: pity })}>
              <Star4 size={11} color={GOLD.mid} />
              <Text style={s.chipText}>{pity}</Text>
            </View>
          )}
        </View>

        {about && !spinning ? (
          <>
            <SliceNote prize={about} ownsTheme={ownsTheme} onClose={() => setAbout(null)} />
            {about.theme && !ownsTheme && <ThemePreview />}
          </>
        ) : (
          <Text style={s.hint}>{spinning ? t('Good luck…') : has ? t('Tap the gold middle or swipe the wheel · tap a slice to see what it gives') : t('Tap a slice to see what it gives')}</Text>
        )}

        {pity !== undefined && (
          <Text style={s.small}>
            {pity <= 1 ? t('Lucky meter: your next spin wins Fortuna for sure.') : t('Lucky meter: {n} spins left until Fortuna is guaranteed.', { n: pity })}
          </Text>
        )}
        <Text style={s.section}>{t('How tickets work')}</Text>
        <View style={s.panel}>
          <Info text={t('Every {n} XP from tasks, weekly challenges and achievements gives one ticket.', { n: XP_PER_TICKET })} />
          <Info text={t('Next ticket · {n} XP to go', { n: toGo })} />
          <Info text={t('XP won on the wheel counts for your level, but doesn’t earn new tickets.')} />
          <Info text={t('Tickets are never sold and never come from ads. They only come from what you get done.')} />
        </View>

        {recent.length > 0 && (
          <>
            <Text style={s.section}>{t('Your latest wins')}</Text>
            <View style={s.panel}>
              {recent.map((sp, i) => {
                const p = prizeById(sp.prize);
                return (
                  <View key={i} style={s.oddsRow}>
                    <PrizeSticker prize={p} size={26} />
                    <Text style={s.oddsLabel}>{prizeLabel(p)}</Text>
                    <Text style={[s.rarity, { color: RARITY_COLORS[p.rarity].label }]}>{rarityName(p.rarity)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {oddsOpen && <OddsSheet ownsTheme={ownsTheme} onClose={() => setOddsOpen(false)} />}
      {won && (
        <PrizeReveal
          prize={won.prize}
          outfit={outfitById(won.outfit)}
          xp={won.xp}
          ticketsLeft={tickets.tickets}
          onClose={() => setWon(null)}
          onAgain={() => {
            setWon(null);
            setTimeout(spin, 50);
          }}
          onWearTheme={() => {
            setWon(null);
            onWearTheme();
          }}
          onWearOutfit={(id) => {
            setWon(null);
            onWearOutfit(id);
          }}
        />
      )}
    </View>
  );
}

/** The chances of each prize, behind the "?" next to the heading. */
/** What a tapped slice gives: its sticker, name, rarity and a line on how it works. */
function SliceNote({ prize, ownsTheme, onClose }: { prize: WheelPrize; ownsTheme: boolean; onClose: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <Pressable onPress={onClose} style={s.note} accessibilityRole="button" accessibilityLabel={`${prizeLabel(prize)}, ${rarityName(prize.rarity)}. ${prizeAbout(prize, ownsTheme)} ${t('Tap to close')}`}>
      <PrizeSticker prize={prize} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.noteTitle}>
          {prizeLabel(prize)} <Text style={[s.noteRarity, { color: RARITY_COLORS[prize.rarity].c1 }]}>· {rarityName(prize.rarity)}</Text>
        </Text>
        <Text style={s.noteBody}>{prizeAbout(prize, ownsTheme)}</Text>
      </View>
    </Pressable>
  );
}

function OddsSheet({ ownsTheme, onClose }: { ownsTheme: boolean; onClose: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.revealBackdrop} onPress={onClose} accessibilityLabel={t('Close')} />
      <SafeAreaView style={s.revealWrap} pointerEvents="box-none">
        <HoloBorder radius={18} style={{ width: '100%', maxWidth: 380 }}>
          <View style={s.oddsSheet}>
            <Text style={s.oddsTitle}>{t('Odds')}</Text>
            {WHEEL_PRIZES.map((p) => {
              const shown = p.theme && ownsTheme ? JACKPOT : p;
              return (
                <View key={p.id} style={s.oddsRow}>
                  {isMythic(shown) ? <RainbowDot /> : <View style={[s.dot, { backgroundColor: prizeColor(shown) }]} />}
                  <Text style={s.oddsLabel}>{prizeLabel(shown)}</Text>
                  <Text style={[s.rarity, { color: RARITY_COLORS[shown.rarity].label }]}>{rarityName(shown.rarity)}</Text>
                  <Text style={s.oddsValue}>{p.odds}%</Text>
                </View>
              );
            })}
            <Text style={s.footnote}>
              {t('All slices look the same, but the chances differ as listed.')}{' '}
              {ownsTheme
                ? t('You own Fortuna, so its slice now pays a {n} XP jackpot.', { n: JACKPOT.xp! })
                : t('If you haven’t won the Fortuna theme after {n} spins, spin {n} gives it to you.', { n: PITY_SPINS })}
            </Text>
            <GoldAction label={t('Got it')} onPress={onClose} />
          </View>
        </HoloBorder>
      </SafeAreaView>
    </Modal>
  );
}

function Info({ text }: { text: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.infoRow}>
      <Star4 size={10} color={GOLD.mid} style={{ marginTop: 5 }} />
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

function RainbowDot() {
  return (
    <Svg width={10} height={10}>
      <Defs>
        <LinearGradient id="rainbowDot" x1="0" y1="0" x2="1" y2="1">
          {MYTHIC.map((col, i) => (
            <Stop key={col} offset={i / (MYTHIC.length - 1)} stopColor={col} />
          ))}
        </LinearGradient>
      </Defs>
      <Circle cx={5} cy={5} r={5} fill="url(#rainbowDot)" />
    </Svg>
  );
}

/** A gold gradient filling its parent (which clips it to its corners). */
function GoldFill({ id }: { id: string }) {
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute', left: 0, top: 0 }} preserveAspectRatio="none" viewBox="0 0 100 40">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GOLD.light} />
          <Stop offset="0.5" stopColor={GOLD.mid} />
          <Stop offset="1" stopColor={GOLD.deep} />
        </LinearGradient>
      </Defs>
      <Rect width={100} height={40} fill={`url(#${id})`} />
    </Svg>
  );
}

// ---------- the wheel (drawn in a 320 box, scaled to fit) ----------

const C = 160;
const FACE = 151;

/** The slice under the pointer at a wheel rotation in degrees. */
function segmentAt(rotation: number): number {
  'worklet';
  const at = (((-rotation % 360) + 360) % 360) / 3.6;
  let sum = 0;
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    sum += WHEEL_SEGMENTS[i].share;
    if (at < sum) return i;
  }
  return WHEEL_SEGMENTS.length - 1;
}

function point(angleDeg: number, r: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function wedge(from: number, to: number, r: number): string {
  const [x1, y1] = point(from, r);
  const [x2, y2] = point(to, r);
  return `M${C} ${C} L${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
}

/** The slices with their middle angle (degrees clockwise from the top) and prize. */
const SLICE_LIST = (() => {
  let at = 0;
  return WHEEL_SEGMENTS.map((seg, i) => {
    const from = at * 3.6;
    at += seg.share;
    const to = at * 3.6;
    return { i, from, to, mid: (from + to) / 2, prize: prizeById(seg.prize) };
  });
})();

/** The rim arc just inside a slice's edge, a little short of its sides. */
function rimArc(from: number, to: number, r: number): string {
  const [x1, y1] = point(from + 4, r);
  const [x2, y2] = point(to - 4, r);
  return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`;
}

/** The turning disc (design "Calm"): dark slices in two shades, each with a rim arc in its rarity's colours. */
// Memoised: the disc only turns, so it never needs to redraw while spinning.
const WheelFace = memo(function WheelFace({ size, ownsTheme }: { size: number; ownsTheme: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 320 320">
      <Defs>
        {(Object.keys(RARITY_COLORS) as (keyof typeof RARITY_COLORS)[]).map((r) => (
          <LinearGradient key={r} id={`rim-${r}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={RARITY_COLORS[r].c1} />
            <Stop offset="1" stopColor={RARITY_COLORS[r].c2} />
          </LinearGradient>
        ))}
        <RadialGradient id="fortunaSlice" cx="50%" cy="20%" r="80%">
          <Stop offset="0" stopColor="#3a2350" />
          <Stop offset="1" stopColor="#120a1f" />
        </RadialGradient>
      </Defs>
      {SLICE_LIST.map((sl, n) => {
        const prize = sl.prize.theme && ownsTheme ? JACKPOT : sl.prize;
        return (
          <G key={sl.i}>
            <Path d={wedge(sl.from, sl.to, FACE)} fill={sl.prize.theme ? 'url(#fortunaSlice)' : SLICE_FILLS[n % 2]} stroke="#12151f" strokeWidth={1.5} strokeLinejoin="round" />
            <Path d={rimArc(sl.from, sl.to, FACE - 3)} fill="none" stroke={`url(#rim-${prize.rarity})`} strokeWidth={5} strokeLinecap="round" />
          </G>
        );
      })}
    </Svg>
  );
});

/**
 * Each slice's icon (near the rim, in its rarity's colour) and label, kept
 * upright while the wheel turns: each turns back by the wheel's angle.
 */
const SliceLabels = memo(function SliceLabels({ size, ownsTheme, rotation, still }: { size: number; ownsTheme: boolean; rotation: SharedValue<number>; still: boolean }) {
  const k = size / 320;
  return (
    <View style={{ position: 'absolute', width: size, height: size }} pointerEvents="none">
      {SLICE_LIST.map((sl) => {
        const prize = sl.prize.theme && ownsTheme ? JACKPOT : sl.prize;
        const [ix, iy] = point(sl.mid, FACE - 32);
        const [lx, ly] = point(sl.mid, FACE - 66);
        const label = t(LABELS[prize.id]);
        const Icon = prizeIcon(prize);
        const fortuna = !!sl.prize.theme && !ownsTheme;
        return (
          <View key={sl.i}>
            <Upright x={ix * k} y={iy * k} box={24 * k} rotation={rotation}>
              {fortuna ? <Twinkle size={18 * k} still={still} /> : <Icon size={18 * k} color={RARITY_COLORS[prize.rarity].c1} strokeWidth={2.4} />}
            </Upright>
            <Upright x={lx * k} y={ly * k} box={72 * k} rotation={rotation}>
              <Text style={{ fontFamily: VIVID_HEAVY, fontSize: (label.length > 6 ? 12 : 13.5) * k, color: fortuna ? FORTUNA_INK : LABEL_INK, textAlign: 'center' }} numberOfLines={1}>
                {label}
              </Text>
            </Upright>
          </View>
        );
      })}
    </View>
  );
});

/** A box centred on x, y that turns back by the wheel's angle, so what's in it stays upright. */
function Upright({ x, y, box, rotation, children }: { x: number; y: number; box: number; rotation: SharedValue<number>; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rotation.value}deg` }] }));
  return <Reanimated.View style={[{ position: 'absolute', left: x - box / 2, top: y - box / 2, width: box, height: box, alignItems: 'center', justifyContent: 'center' }, style]}>{children}</Reanimated.View>;
}

/** Fortuna's live preview on its slice: a gold star twinkling, as on the theme. */
function Twinkle({ size, still }: { size: number; still: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: 2400, easing: REasing.inOut(REasing.sin) }), -1, false);
    return () => cancelAnimation(t);
  }, [still]);
  const style = useAnimatedStyle(() => {
    const p = Math.sin(Math.PI * t.value);
    return { opacity: 1 - 0.3 * p, transform: [{ scale: 1 + 0.35 * p }, { rotate: `${45 * p}deg` }] };
  });
  return (
    <Reanimated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill={FORTUNA_INK} />
      </Svg>
    </Reanimated.View>
  );
}

/** The fixed outer ring round the disc. */
function Rim({ size }: { size: number }) {
  return (
    <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, boxShadow: '0px 14px 40px rgba(0,0,0,0.5)' }} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 320 320">
        <Circle cx={C} cy={C} r={159.5} fill="#3a4262" />
        <Circle cx={C} cy={C} r={158.5} fill="#262c40" />
      </Svg>
    </View>
  );
}

/**
 * The gold centre: the Spin button, with the tickets left under SPIN. It
 * breathes softly while a ticket is ready, and goes dim without one.
 */
function Hub({ size, tickets, spinning }: { size: number; tickets: number; spinning: boolean }) {
  const reduce = useReduceMotion();
  const live = tickets > 0 && !spinning;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce || !live) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [reduce, live]);
  const k = size / 96;
  return (
    <View style={{ width: size, height: size }}>
      {live && (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2, boxShadow: `0px 0px ${22 * k}px ${GOLD.mid}`, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }}
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: 1.5, borderColor: live ? KEYLINE : '#3d2d5c', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a1d40', boxShadow: '0px 4px 14px rgba(0,0,0,0.5)' }}>
        {live && (
          <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="hubGold" cx="40%" cy="30%" r="75%">
                <Stop offset="0" stopColor={GOLD.light} />
                <Stop offset="0.45" stopColor={GOLD.mid} />
                <Stop offset="1" stopColor={GOLD.deep} />
              </RadialGradient>
            </Defs>
            <Circle cx={50} cy={50} r={50} fill="url(#hubGold)" />
          </Svg>
        )}
        <Text style={{ fontFamily: CINZEL, color: live ? GOLD.ink : '#a596bf', fontSize: 19 * k, lineHeight: 22 * k, letterSpacing: 1.2 * k }}>{t('SPIN')}</Text>
        <Text style={{ fontFamily: VIVID_HEAVY, color: live ? GOLD.ink : '#a596bf', fontSize: 12 * k, lineHeight: 15 * k, opacity: 0.8 }}>× {tickets}</Text>
      </View>
    </View>
  );
}

/** A soft violet glow behind the wheel, the one bit of Fortuna's page that stays in every theme. */
function Halo({ size, light }: { size: number; light: boolean }) {
  const d = size * 1.7;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: SLOT_PAD + size / 2 - d / 2, width: d, height: d, alignSelf: 'center' }}>
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id="wheelHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0.45" stopColor="#8a4fe0" stopOpacity={light ? 0.28 : 0.5} />
            <Stop offset="0.7" stopColor="#6a3cc0" stopOpacity={light ? 0.12 : 0.22} />
            <Stop offset="1" stopColor="#6a3cc0" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={d / 2} fill="url(#wheelHalo)" />
      </Svg>
    </View>
  );
}

/** A small gold ticket for the tickets chip. */
function MiniTicket({ dim }: { dim: boolean }) {
  return (
    <Svg width={26} height={16} viewBox="0 0 26 16" style={{ opacity: dim ? 0.45 : 1 }}>
      <Defs>
        <LinearGradient id="miniTicket" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GOLD.light} />
          <Stop offset="0.5" stopColor={GOLD.mid} />
          <Stop offset="1" stopColor={GOLD.deep} />
        </LinearGradient>
      </Defs>
      <Path d="M2 0h22a2 2 0 0 1 2 2v4a2 2 0 0 0 0 4v4a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-4a2 2 0 0 0 0-4V2a2 2 0 0 1 2-2z" fill="url(#miniTicket)" />
      <Path d="M18.5 2.5v11" stroke={GOLD.ink} strokeWidth={0.8} strokeDasharray="1.5 1.5" opacity={0.5} />
      <Path d={STAR_SMALL} fill={GOLD.ink} opacity={0.55} />
    </Svg>
  );
}
const STAR_SMALL = 'M9 4l1 2.6 2.8.2-2.2 1.8.7 2.7L9 9.8l-2.3 1.5.7-2.7-2.2-1.8 2.8-.2z';

/** Gold lettering: the shining gradient on dark themes, a deep gold that reads on light ones. */
function Gold({ dark, style, children }: { dark: boolean; style?: StyleProp<TextStyle>; children: ReactNode }) {
  return dark ? <GoldText style={style}>{children}</GoldText> : <Text style={[style, { color: '#8A5A06' }]}>{children}</Text>;
}

/** The pin at the top: white, or ink on light themes so it stands out. */
function Pointer({ scale, dark }: { scale: number; dark: boolean }) {
  return (
    <Svg width={28 * scale} height={34 * scale} viewBox="0 0 28 34">
      <Path d="M14 33 2.6 10.6A12 12 0 1 1 25.4 10.6z" fill="#000000" opacity={0.35} transform="translate(0 1.5)" />
      <Path d="M14 33 2.6 10.6A12 12 0 1 1 25.4 10.6z" fill={dark ? '#26324A' : '#FFFFFF'} />
      <Circle cx={14} cy={11} r={4} fill={dark ? '#FFFFFF' : '#12151f'} />
    </Svg>
  );
}

// ---------- the win card ----------

/** What a spin gave: the prize, and on an outfit slice the outfit (or the XP paid once its rarity is complete). */
interface Won {
  prize: WheelPrize;
  outfit?: string;
  xp?: number;
}

/** The prize card: rays in the prize's colour, sparks, the sticker flipping in, and COLLECT. */
function PrizeReveal({
  prize,
  outfit,
  xp,
  ticketsLeft,
  onClose,
  onAgain,
  onWearTheme,
  onWearOutfit,
}: {
  prize: WheelPrize;
  outfit?: Outfit;
  xp?: number;
  ticketsLeft: number;
  onClose: () => void;
  onAgain: () => void;
  onWearTheme: () => void;
  onWearOutfit: (id: string) => void;
}) {
  const s = useStyles(makeStyles);
  const reduceMotion = useReduceMotion();
  const show = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const spinRays = useRef(new Animated.Value(0)).current;
  const mythic = isMythic(prize);
  const big = mythic || prize.rarity === 'rare';
  const color = prizeColor(prize);
  const sparkColors = mythic ? MYTHIC : [color, RARITY_COLORS[prize.rarity].c1, '#FFFFFF'];

  useEffect(() => {
    if (reduceMotion) return;
    // A jackpot first slams JACKPOT! onto the screen with Bizzy zooming in; then the card rises.
    Animated.sequence([Animated.delay(mythic ? 850 : 0), Animated.spring(show, { toValue: 1, friction: 6, tension: 60, useNativeDriver: false })]).start();
    const loop = Animated.loop(Animated.timing(spinRays, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, []);

  const title = prize.theme ? t('Fortuna is yours!') : prize.id === JACKPOT.id ? t('Jackpot!') : outfit ? t('New outfit!') : big ? t('Lucky!') : t('You won');
  const desc = prize.theme
    ? t('A theme you can only win on this wheel. Gold coins, holo cards and stardust.')
    : prize.token
      ? t('Added to your bag. Use it whenever you like.')
      : outfit
        ? t('Added to your outfits. Find them in your bag, under Outfits.')
        : prize.outfit
          ? t('You already own every {rarity} outfit, so this pays XP instead.', { rarity: t(RARITY_LABEL[prize.outfit]) })
          : t('Added to your XP.');
  const wearsNew = useMemo(() => (outfit ? outfitDrawing({ [outfit.slot]: outfit.id }) : undefined), [outfit?.id]);
  // Wearing it now replaces the Fortuna "Wear it now" button; outfits and the theme never come together.
  const wear = prize.theme ? onWearTheme : outfit ? () => onWearOutfit(outfit.id) : undefined;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.revealBackdrop} onPress={onClose} accessibilityLabel={t('Close')} />
      {mythic && <CoinShower count={30} />}
      {mythic && !reduceMotion && <JackpotIntro />}
      <SafeAreaView style={s.revealWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            s.rays,
            {
              opacity: show.interpolate({ inputRange: [0, 1], outputRange: [0, big ? 0.9 : 0.6] }),
              transform: [{ rotate: spinRays.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
            },
          ]}
          pointerEvents="none"
        >
          <Svg width={420} height={420}>
            <Defs>
              <RadialGradient id="rayFade" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
              <Mask id="rayMask">
                <Circle cx={210} cy={210} r={210} fill="url(#rayFade)" />
              </Mask>
            </Defs>
            <G mask="url(#rayMask)">
              {Array.from({ length: 18 }, (_, i) => {
                const a1 = ((i * 20 - 3) * Math.PI) / 180;
                const a2 = ((i * 20 + 3) * Math.PI) / 180;
                return (
                  <Path
                    key={i}
                    d={`M210 210 L${210 + 210 * Math.cos(a1)} ${210 + 210 * Math.sin(a1)} L${210 + 210 * Math.cos(a2)} ${210 + 210 * Math.sin(a2)} Z`}
                    fill={mythic ? MYTHIC[i % MYTHIC.length] : color}
                    opacity={0.8}
                  />
                );
              })}
            </G>
          </Svg>
        </Animated.View>
        {!reduceMotion &&
          Array.from({ length: big ? 20 : 12 }, (_, i) => {
            const n = big ? 20 : 12;
            const a = (i / n) * Math.PI * 2;
            const dist = 120 + (i % 3) * 30;
            const col = sparkColors[i % sparkColors.length];
            return (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  opacity: show.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0.9] }),
                  transform: [
                    { translateX: show.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * dist] }) },
                    { translateY: show.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * dist] }) },
                  ],
                }}
              >
                <Star4 size={i % 2 ? 10 : 14} color={col} />
              </Animated.View>
            );
          })}
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 340,
            opacity: show.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [{ scale: show.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}
        >
          <HoloBorder radius={20} colors={mythic ? [...MYTHIC, MYTHIC[0]] : HOLO}>
            <View style={s.revealCard}>
              <Text style={[s.revealRarity, { color: RARITY_COLORS[prize.rarity].label }]}>{rarityName(prize.rarity)}</Text>
              <Text style={s.revealTitle}>{title}</Text>
              <Animated.View
                style={{
                  marginVertical: 8,
                  transform: [{ perspective: 600 }, { rotateY: show.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '0deg'] }) }],
                }}
              >
                {outfit ? <Bizzy size={120} mood="excited" motion="bob" outfit={wearsNew} /> : <PrizeSticker prize={prize} size={big ? 108 : 90} />}
              </Animated.View>
              <Text style={s.revealPrize}>{outfit ? outfitName(outfit) : xp ? `+${t('{n} XP', { n: xp })}` : prizeLabel(prize)}</Text>
              <Text style={s.revealDesc}>{desc}</Text>
              {prize.theme && <ThemePreview />}
              <GoldAction label={wear ? t('Wear it now') : t('Collect')} onPress={wear ?? onClose} />
              {wear && !(outfit && ticketsLeft > 0) ? (
                <Pressable onPress={onClose} style={s.revealSecondary} accessibilityRole="button">
                  <Text style={s.revealSecondaryText}>{t('Later')}</Text>
                </Pressable>
              ) : ticketsLeft > 0 ? (
                <Pressable onPress={onAgain} style={s.revealSecondary} accessibilityRole="button">
                  <Text style={s.revealSecondaryText}>
                    {tn(ticketsLeft, 'Spin again · {n} ticket left', 'Spin again · {n} tickets left')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </HoloBorder>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Jackpot moment (design "Gold rain", picked 2026-10-29): a gold flash,
 * JACKPOT! slams down with a shake while the coins rain (CoinShower), and
 * Bizzy zooms in cheering above the prize card.
 */
function JackpotIntro() {
  const [room, setRoom] = useState<{ w: number; h: number }>();
  const flash = useSharedValue(0);
  const slam = useSharedValue(0);
  const shake = useSharedValue(0);
  const flyer = useFlyer('excited');
  useEffect(() => {
    if (!room) return;
    const { w, h } = room;
    flash.value = withSequence(withTiming(0.85, { duration: 120 }), withTiming(0, { duration: 260 }));
    slam.value = withTiming(1, { duration: 420, easing: REasing.in(REasing.quad) });
    shake.value = withDelay(400, withSequence(...[8, -7, 5, -3, 0].map((x) => withTiming(x, { duration: 55 }))));
    flyer.place(-40, h * 0.42, 0.6);
    flyer.fly([[[-40, h * 0.42], [80, h * 0.22], [w * 0.55, h * 0.5], [w * 0.8, h * 0.2]]], 900, { scale: 1 });
  }, [room]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const slamStyle = useAnimatedStyle(() => {
    // 2.6× and tilted, down to a little under size at 70 %, then settles.
    const v = slam.value;
    const scale = v < 0.7 ? 2.6 - (1.68 * v) / 0.7 : 0.92 + (0.08 * (v - 0.7)) / 0.3;
    return { opacity: Math.min(1, v / 0.7), transform: [{ translateX: shake.value }, { scale }, { rotate: `${-8 + 5 * Math.min(1, v / 0.7)}deg` }] };
  });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setRoom({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFE9A8' }, flashStyle]} />
      <Reanimated.View style={[{ position: 'absolute', left: 0, right: 0, top: room ? room.h * 0.08 : 60, alignItems: 'center' }, slamStyle]}>
        <GoldText style={{ fontFamily: CINZEL, fontSize: 46, lineHeight: 56, letterSpacing: 2 }}>{t('JACKPOT!')}</GoldText>
      </Reanimated.View>
      <FlyingBizzy flyer={flyer} size={76} />
    </View>
  );
}

function GoldAction({ label, onPress }: { label: string; onPress: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={s.goldAction} accessibilityRole="button">
      <GoldFill id="actionFill" />
      <Text style={s.spinText}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

/** A tiny Today screen in Fortuna, shown when the theme is won. */
function ThemePreview() {
  const s = useStyles(makeStyles);
  return (
    <View style={s.preview} accessible accessibilityLabel={t('Preview of the Fortuna theme')}>
      <View style={s.previewTop}>
        <StarRule end="left" style={{ width: 28 }} />
        <Text style={s.previewWord}>{t('SUCCEDO')}</Text>
        <StarRule end="right" style={{ width: 28 }} />
      </View>
      <ShimmerBar progress={0.62} ghost={0.62} />
      <HoloBorder radius={10}>
        <View style={s.previewTask}>
          <Text style={s.previewTaskText}>{t('Morning run')}</Text>
          <CoinCheck done size={22} />
        </View>
      </HoloBorder>
    </View>
  );
}

const makeStyles = themed((c) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center', alignItems: 'stretch' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  eyebrow: { fontFamily: CINZEL, color: GOLD.mid, fontSize: 12, letterSpacing: 4 },
  heading: { fontFamily: FONTS.serif, fontSize: 24, lineHeight: 30, textAlign: 'center', marginTop: 2, ...headingCase(c) },
  slot: { marginTop: 4, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  chip: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: c.surface, borderWidth: 1, borderColor: c.dark ? 'rgba(242,197,92,0.45)' : c.border },
  chipRound: { width: 30, paddingHorizontal: 0, justifyContent: 'center' },
  chipTopLeft: { left: 0, top: 0 },
  chipTopRight: { right: 0, top: 0 },
  chipBottomLeft: { left: 0, bottom: 0 },
  chipBottomRight: { right: 0, bottom: 0 },
  chipText: { color: c.text, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  mini: { width: 40, height: 5, borderRadius: 3, backgroundColor: c.dark ? 'rgba(255,255,255,0.14)' : c.border, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 3, backgroundColor: GOLD.mid, backgroundImage: `linear-gradient(90deg, ${GOLD.deep}, ${GOLD.mid})` },
  ticketCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, gap: 12 },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ticketCount: { fontFamily: CINZEL, fontSize: 30, lineHeight: 36, fontVariant: ['lining-nums'] },
  ticketLabel: { color: c.muted, fontSize: 14 },
  nextLabel: { ...eyebrow(c, 11), color: c.label },
  copy: { color: c.muted, fontSize: 13, lineHeight: 19 },
  wheelBox: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  spinWrap: { marginTop: 22, height: 58, alignSelf: 'stretch' },
  spinGlow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 29, boxShadow: `0px 0px 26px ${GOLD.mid}` },
  spinButton: {
    flex: 1,
    borderRadius: 29,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: KEYLINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinButtonOff: { backgroundColor: '#2a1d40', borderColor: '#3d2d5c' },
  spinText: { fontFamily: CINZEL, color: GOLD.ink, fontSize: 16, letterSpacing: 1.5 },
  spinTextOff: { color: '#a596bf' },
  small: { color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 12 },
  hint: { color: c.muted, fontSize: 12, lineHeight: 16, textAlign: 'center', marginTop: 8, minHeight: 32 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,224,102,0.25)' },
  noteTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  noteRarity: { fontSize: 12, fontWeight: '700' },
  noteBody: { color: c.muted, fontSize: 12, lineHeight: 17 },
  section: { ...eyebrow(c), color: c.label, marginTop: 30, marginBottom: 12 },
  panel: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, gap: 12 },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  oddsLabel: { flex: 1, color: c.text, fontSize: 14 },
  rarity: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  oddsValue: { color: c.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 34, textAlign: 'right' },
  footnote: { color: c.muted, fontSize: 12, lineHeight: 18 },
  oddsButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: GOLD.mid,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  oddsButtonText: { fontFamily: CINZEL, color: GOLD.mid, fontSize: 16, lineHeight: 20 },
  oddsSheet: { backgroundColor: c.surface, borderRadius: 18, padding: 20, gap: 12 },
  oddsTitle: { fontFamily: FONTS.serif, color: c.text, fontSize: 22, ...headingCase(c) },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { flex: 1, color: c.text, fontSize: 14, lineHeight: 20 },
  revealBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#07050a', opacity: 0.88 },
  revealWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  rays: { position: 'absolute', width: 420, height: 420 },
  revealCard: { backgroundColor: c.surface, borderRadius: 20, paddingVertical: 24, paddingHorizontal: 22, alignItems: 'center', gap: 6 },
  revealRarity: { fontSize: 12, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  revealTitle: { fontFamily: FONTS.serif, color: c.muted, fontSize: 14, letterSpacing: 2, ...headingCase(c) },
  revealPrize: { fontFamily: FONTS.serif, color: c.text, fontSize: 24, lineHeight: 30, textAlign: 'center', ...headingCase(c) },
  revealDesc: { color: c.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  goldAction: {
    marginTop: 12,
    minHeight: 50,
    alignSelf: 'stretch',
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: KEYLINE,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 4px 18px ${GOLD.mid}66`,
  },
  revealSecondary: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  revealSecondaryText: { color: c.muted, fontWeight: '700' },
  // Fortuna's own colours, whatever theme is worn.
  preview: { alignSelf: 'stretch', backgroundColor: '#120a1f', borderRadius: 12, padding: 12, gap: 8, marginTop: 8, borderWidth: 1, borderColor: '#3d2d5c' },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  previewWord: { fontFamily: CINZEL, color: '#fbf6ea', fontSize: 11, letterSpacing: 3 },
  previewTask: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1f1530', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  previewTaskText: { color: '#fbf6ea', fontSize: 13, fontWeight: '600' },
}));
