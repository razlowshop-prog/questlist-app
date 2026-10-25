import * as Haptics from 'expo-haptics';
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, PanResponder, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, { cancelAnimation, Easing as REasing, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CoinCheck, CoinShower, GOLD, GoldDust, GoldText, HOLO, HoloBorder, ShimmerBar, Star4, StarRule, TicketStub } from '../components/Fortuna';
import { KEYLINE, MYTHIC, prizeIcon, PrizeSticker, RARITY_COLORS } from '../components/PrizeSticker';
import { TOKEN_INFO } from '../tokens';
import { fill, VIVID_HEAVY } from '../components/Vivid';
import { BRAND } from '../vivid';
import { useReduceMotion } from '../components/FireAura';
import { eyebrow, FONTS, headingCase, themed, useStyles } from '../theme';
import {
  JACKPOT,
  PITY_SPINS,
  prizeById,
  RARITY_NAMES,
  segmentFor,
  WHEEL_PRIZES,
  WHEEL_SEGMENTS,
  XP_PER_TICKET,
  type TicketStatus,
  type WheelPrize,
} from '../wheel';
import type { WheelSpin } from '../game';

const TURNS = 6;
/** A swipe spins between these many turns, more for a faster flick. */
const SWIPE_TURNS = [3, 9];
/** Slowest flick that still spins the wheel, in radians per millisecond. */
const MIN_FLICK = 0.003;
const SPIN_MS = 3200;
/** At most one haptic tick per this many ms. */
const TICK_MS = 40;
const CINZEL = 'Cinzel_800ExtraBold';

/** Each slice's short label on the wheel (design "Calm"); rarity shows as the rim arc and icon colour. */
const LABELS: Record<string, string> = {
  xp20: '20 XP',
  xp50: '50 XP',
  xp100: '100 XP',
  double: '2× XP',
  rest: 'Rest day',
  reroll: 'Swap',
  adfree: 'Ad-free',
  theme: 'Fortuna',
  jackpot: 'Jackpot',
};
/** The two slice colours, alternating round the wheel. */
const SLICE_FILLS = ['#1d2335', '#252c42'];
const LABEL_INK = '#eef1fa';
const FORTUNA_INK = '#f2c55c';

/** What a slice gives, for the note under the wheel when it is tapped. */
function prizeAbout(prize: WheelPrize, ownsTheme: boolean): string {
  if (prize.theme) return ownsTheme ? 'You own Fortuna, so this slice now pays a big XP jackpot.' : 'The Fortuna theme: a gold and violet look for the whole app. The rarest slice.';
  if (prize.token) return `${TOKEN_INFO[prize.token].description} It goes into your bag until you use it.`;
  return `${prize.xp} XP straight onto your level bar. Wheel XP doesn’t earn new tickets.`;
}

/** A prize's colour, for dots and rays: its rarity's colour; the theme (and its jackpot) is rainbow. */
function prizeColor(prize: WheelPrize): string {
  return RARITY_COLORS[prize.rarity].c1;
}

const isMythic = (prize: WheelPrize) => !!prize.theme || prize.id === JACKPOT.id;

/**
 * The lucky wheel tab, always in the Fortuna look: tickets and how they're
 * earned, the wheel with its slices drawn to scale, the odds and the latest
 * wins. A spin runs about five seconds with the rim bulbs blinking and the
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
  onBusy,
}: {
  tickets: TicketStatus;
  /** Spins left until the theme is guaranteed; undefined once won. */
  pity?: number;
  ownsTheme: boolean;
  spins: WheelSpin[];
  /** Spends a ticket (saved at once); `finish` hands the prize out once it's revealed. */
  onSpin: () => { prize: WheelPrize; finish: () => void } | undefined;
  onWearTheme: () => void;
  /** True while the wheel turns: the app holds the tabs, so the prize can't be left behind. */
  onBusy?: (busy: boolean) => void;
}) {
  const s = useStyles(makeStyles);
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const size = Math.min(320, Math.max(240, width - 40));
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
  const [won, setWon] = useState<WheelPrize | null>(null);
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
    if (Platform.OS !== 'web' && now - lastTick.current >= TICK_MS) {
      lastTick.current = now;
      Haptics.selectionAsync().catch(() => {});
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

  function landed(prize: WheelPrize) {
    const finish = pending.current;
    if (!finish) return;
    pending.current = null;
    setSpinning(false);
    setWon(prize);
    finish();
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
    const { prize, finish } = result;
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
      () => scheduleOnRN(landed, prize),
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
            if (Math.hypot(tx, ty) < size * 0.14) return;
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

  return (
    <View style={s.screen}>
      <GoldDust />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.eyebrowRow}>
          <StarRule end="left" style={{ width: 54 }} />
          <Text style={s.eyebrow}>Fortuna</Text>
          <StarRule end="right" style={{ width: 54 }} />
        </View>
        <GoldText style={s.heading}>Spin the wheel</GoldText>
        <Pressable onPress={() => setOddsOpen(true)} hitSlop={10} style={s.oddsButton} accessibilityRole="button" accessibilityLabel="Show the odds">
          <Text style={s.oddsButtonText}>?</Text>
        </Pressable>

        <HoloBorder radius={14} style={{ marginTop: 18 }}>
          <View style={s.ticketCard}>
            <View style={s.ticketRow}>
              <TicketStub dim={!has} />
              <View style={{ flex: 1 }}>
                <GoldText style={s.ticketCount}>× {tickets.tickets}</GoldText>
                <Text style={s.ticketLabel}>{tickets.tickets === 1 ? 'ticket' : 'tickets'} ready to spin</Text>
              </View>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={s.nextLabel}>
                Next ticket · {toGo} XP to go
              </Text>
              <ShimmerBar progress={tickets.progress / XP_PER_TICKET} ghost={tickets.progress / XP_PER_TICKET} />
            </View>
            <Text style={s.copy}>
              You earn 1 ticket for every {XP_PER_TICKET} XP from finished tasks. Tickets are free and can never be bought.
            </Text>
          </View>
        </HoloBorder>

        <View style={[s.wheelBox, { width: size, height: size, borderRadius: size / 2, marginTop: 34 * k + 14 }]}>
          <Rim size={size} />
          <Reanimated.View style={[{ position: 'absolute', width: size, height: size }, wheelStyle]}>
            <WheelFace size={size} ownsTheme={ownsTheme} />
            <SliceLabels size={size} ownsTheme={ownsTheme} rotation={rotation} still={reduceMotion} />
          </Reanimated.View>
          {/* Doesn't turn, so touch positions stay simple; the hub coin sits above it. */}
          <View
            {...touch.panHandlers}
            style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2 }}
            accessibilityHint="Swipe around the wheel to spin it, or tap a slice to see what it gives"
          />
          <Pressable
            onPress={() => spin()}
            disabled={spinning || !has}
            style={{ width: 64 * k, height: 64 * k, borderRadius: 32 * k, boxShadow: '0px 4px 14px rgba(0,0,0,0.5)' }}
            accessibilityRole="button"
            accessibilityLabel={has ? `Spin the wheel, ${tickets.tickets} ${tickets.tickets === 1 ? 'ticket' : 'tickets'}` : 'No tickets yet'}
          >
            <Hub size={64 * k} />
          </Pressable>
          <Reanimated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: -20 * k, width: 28 * k, height: 34 * k, transformOrigin: `${14 * k}px ${11 * k}px` }, pointerStyle]}
          >
            <Pointer scale={k} />
          </Reanimated.View>
        </View>

        {about && !spinning ? (
          <>
            <SliceNote prize={about} ownsTheme={ownsTheme} onClose={() => setAbout(null)} />
            {about.theme && !ownsTheme && <ThemePreview />}
          </>
        ) : (
          <Text style={s.hint}>{has ? 'Swipe the wheel or tap Spin · tap a slice to see what it gives' : 'Tap a slice to see what it gives'}</Text>
        )}
        <SpinButton label={spinning ? 'Good luck…' : has ? 'Spin · 1 ticket' : 'No tickets yet'} disabled={!has || spinning} off={!has && !spinning} onPress={() => spin()} />
        {pity !== undefined && (
          <Text style={s.small}>
            {pity <= 1 ? 'Lucky meter: your next spin wins Fortuna for sure.' : `Lucky meter: ${pity} spins left until Fortuna is guaranteed.`}
          </Text>
        )}

        <Text style={s.section}>How tickets work</Text>
        <View style={s.panel}>
          <Info text={`Every ${XP_PER_TICKET} XP from tasks, weekly challenges and achievements gives one ticket.`} />
          <Info text="XP won on the wheel counts for your level, but doesn't earn new tickets." />
          <Info text="Tickets are never sold and never come from ads. They only come from what you get done." />
        </View>

        {recent.length > 0 && (
          <>
            <Text style={s.section}>Your latest wins</Text>
            <View style={s.panel}>
              {recent.map((sp, i) => {
                const p = prizeById(sp.prize);
                return (
                  <View key={i} style={s.oddsRow}>
                    <PrizeSticker prize={p} size={26} />
                    <Text style={s.oddsLabel}>{p.label}</Text>
                    <Text style={[s.rarity, { color: RARITY_COLORS[p.rarity].label }]}>{RARITY_NAMES[p.rarity]}</Text>
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
          prize={won}
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
    <Pressable onPress={onClose} style={s.note} accessibilityRole="button" accessibilityLabel={`${prize.label}, ${RARITY_NAMES[prize.rarity]}. ${prizeAbout(prize, ownsTheme)} Tap to close`}>
      <PrizeSticker prize={prize} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.noteTitle}>
          {prize.label} <Text style={[s.noteRarity, { color: RARITY_COLORS[prize.rarity].c1 }]}>· {RARITY_NAMES[prize.rarity]}</Text>
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
      <Pressable style={s.revealBackdrop} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView style={s.revealWrap} pointerEvents="box-none">
        <HoloBorder radius={18} style={{ width: '100%', maxWidth: 380 }}>
          <View style={s.oddsSheet}>
            <Text style={s.oddsTitle}>Odds</Text>
            {WHEEL_PRIZES.map((p) => {
              const shown = p.theme && ownsTheme ? JACKPOT : p;
              return (
                <View key={p.id} style={s.oddsRow}>
                  {isMythic(shown) ? <RainbowDot /> : <View style={[s.dot, { backgroundColor: prizeColor(shown) }]} />}
                  <Text style={s.oddsLabel}>{shown.label}</Text>
                  <Text style={[s.rarity, { color: RARITY_COLORS[shown.rarity].label }]}>{RARITY_NAMES[shown.rarity]}</Text>
                  <Text style={s.oddsValue}>{p.odds}%</Text>
                </View>
              );
            })}
            <Text style={s.footnote}>
              All slices look the same, but the chances differ as listed.{' '}
              {ownsTheme
                ? `You own Fortuna, so its slice now pays a ${JACKPOT.xp} XP jackpot.`
                : `If you haven't won the Fortuna theme after ${PITY_SPINS} spins, spin ${PITY_SPINS} gives it to you.`}
            </Text>
            <GoldAction label="Got it" onPress={onClose} />
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

/** The gold spin button, gently pulsing while a ticket is ready. */
function SpinButton({ label, disabled, off, onPress }: { label: string; disabled: boolean; off: boolean; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion || disabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [reduceMotion, disabled]);
  return (
    <View style={s.spinWrap}>
      {!off && (
        <Animated.View
          pointerEvents="none"
          style={[s.spinGlow, { opacity: disabled ? 0.25 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] }) }]}
        />
      )}
      <Pressable onPress={onPress} disabled={disabled} style={[s.spinButton, off && s.spinButtonOff]} accessibilityRole="button" accessibilityState={{ disabled }}>
        {!off && <GoldFill id="spinFill" />}
        <Text style={[s.spinText, off && s.spinTextOff]}>{label.toUpperCase()}</Text>
      </Pressable>
    </View>
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
        const label = LABELS[prize.id];
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

/** The 64 px brand-gradient hub that says SPIN. Tapping it spins. */
function Hub({ size }: { size: number }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, fill(BRAND, 135)]}>
      <Text style={{ color: '#FFFFFF', fontFamily: VIVID_HEAVY, fontSize: 14 * (size / 64), letterSpacing: 0.8 }}>SPIN</Text>
    </View>
  );
}

/** The white pin at the top. */
function Pointer({ scale }: { scale: number }) {
  return (
    <Svg width={28 * scale} height={34 * scale} viewBox="0 0 28 34">
      <Path d="M14 33 2.6 10.6A12 12 0 1 1 25.4 10.6z" fill="#000000" opacity={0.35} transform="translate(0 1.5)" />
      <Path d="M14 33 2.6 10.6A12 12 0 1 1 25.4 10.6z" fill="#FFFFFF" />
      <Circle cx={14} cy={11} r={4} fill="#12151f" />
    </Svg>
  );
}

// ---------- the win card ----------

/** The prize card: rays in the prize's colour, sparks, the sticker flipping in, and COLLECT. */
function PrizeReveal({
  prize,
  ticketsLeft,
  onClose,
  onAgain,
  onWearTheme,
}: {
  prize: WheelPrize;
  ticketsLeft: number;
  onClose: () => void;
  onAgain: () => void;
  onWearTheme: () => void;
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
    Animated.spring(show, { toValue: 1, friction: 6, tension: 60, useNativeDriver: false }).start();
    const loop = Animated.loop(Animated.timing(spinRays, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, []);

  const title = prize.theme ? 'Fortuna is yours!' : prize.id === JACKPOT.id ? 'Jackpot!' : big ? 'Lucky!' : 'You won';
  const desc = prize.theme
    ? 'A theme you can only win on this wheel. Gold coins, holo cards and stardust.'
    : prize.token
      ? 'Added to your bag. Use it whenever you like.'
      : 'Added to your XP.';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.revealBackdrop} onPress={onClose} accessibilityLabel="Close" />
      {mythic && <CoinShower count={30} />}
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
              <Text style={[s.revealRarity, { color: RARITY_COLORS[prize.rarity].label }]}>{RARITY_NAMES[prize.rarity]}</Text>
              <Text style={s.revealTitle}>{title}</Text>
              <Animated.View
                style={{
                  marginVertical: 8,
                  transform: [{ perspective: 600 }, { rotateY: show.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '0deg'] }) }],
                }}
              >
                <PrizeSticker prize={prize} size={big ? 108 : 90} />
              </Animated.View>
              <Text style={s.revealPrize}>{prize.label}</Text>
              <Text style={s.revealDesc}>{desc}</Text>
              {prize.theme && <ThemePreview />}
              <GoldAction label={prize.theme ? 'Wear it now' : 'Collect'} onPress={prize.theme ? onWearTheme : onClose} />
              {prize.theme ? (
                <Pressable onPress={onClose} style={s.revealSecondary} accessibilityRole="button">
                  <Text style={s.revealSecondaryText}>Later</Text>
                </Pressable>
              ) : ticketsLeft > 0 ? (
                <Pressable onPress={onAgain} style={s.revealSecondary} accessibilityRole="button">
                  <Text style={s.revealSecondaryText}>
                    Spin again · {ticketsLeft} {ticketsLeft === 1 ? 'ticket' : 'tickets'} left
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
    <View style={s.preview} accessible accessibilityLabel="Preview of the Fortuna theme">
      <View style={s.previewTop}>
        <StarRule end="left" style={{ width: 28 }} />
        <Text style={s.previewWord}>SUCCEDO</Text>
        <StarRule end="right" style={{ width: 28 }} />
      </View>
      <ShimmerBar progress={0.62} ghost={0.62} />
      <HoloBorder radius={10}>
        <View style={s.previewTask}>
          <Text style={s.previewTaskText}>Morning run</Text>
          <CoinCheck done size={22} />
        </View>
      </HoloBorder>
    </View>
  );
}

const makeStyles = themed((c) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center', alignItems: 'stretch' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  eyebrow: { fontFamily: CINZEL, color: GOLD.mid, fontSize: 12, letterSpacing: 4 },
  heading: { fontFamily: FONTS.serif, fontSize: 30, lineHeight: 38, textAlign: 'center', marginTop: 6, ...headingCase(c) },
  ticketCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, gap: 12 },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ticketCount: { fontFamily: CINZEL, fontSize: 30, lineHeight: 36, fontVariant: ['lining-nums'] },
  ticketLabel: { color: c.muted, fontSize: 14 },
  nextLabel: { ...eyebrow(c, 11), color: c.label },
  copy: { color: c.muted, fontSize: 13, lineHeight: 19 },
  wheelBox: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 14px 44px rgba(122,60,210,0.55)' },
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
  hint: { color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 16, minHeight: 16 },
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
