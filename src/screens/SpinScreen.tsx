import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { CoinCheck, CoinShower, GOLD, GoldDust, GoldText, HOLO, HoloBorder, ShimmerBar, Star4, StarRule, TicketStub } from '../components/Fortuna';
import { KEYLINE, MYTHIC, PrizeSticker, RARITY_COLORS } from '../components/PrizeSticker';
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
const SPIN_MS = 5200;
const BULBS = 24;
/** At most one haptic tick per this many ms. */
const TICK_MS = 40;
const CINZEL = 'Cinzel_800ExtraBold';

/** Each slice's colour and label (design thread, "Fortuna theme and wheel spec"). The theme slice is a rainbow. */
const SLICES: Record<string, { color: string; ink: string; font: number }> = {
  xp20: { color: '#34E3C4', ink: '#063a33', font: 24 },
  xp50: { color: '#1FC7AE', ink: '#063a33', font: 24 },
  double: { color: '#4A7BFF', ink: '#FFFFFF', font: 22 },
  xp100: { color: '#0E9BB0', ink: '#FFFFFF', font: 20 },
  rest: { color: '#3557FF', ink: '#FFFFFF', font: 16 },
  reroll: { color: '#2E46C8', ink: '#FFFFFF', font: 16 },
  adfree: { color: '#C03CE0', ink: '#FFFFFF', font: 13 },
};

/** A prize's colour on the wheel, for dots and rays; the theme (and its jackpot) is rainbow. */
function prizeColor(prize: WheelPrize): string {
  return SLICES[prize.id]?.color ?? '#FFE066';
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
}: {
  tickets: TicketStatus;
  /** Spins left until the theme is guaranteed; undefined once won. */
  pity?: number;
  ownsTheme: boolean;
  spins: WheelSpin[];
  /** Spends a ticket (saved at once); `finish` hands the prize out once it's revealed. */
  onSpin: () => { prize: WheelPrize; finish: () => void } | undefined;
  onWearTheme: () => void;
}) {
  const s = useStyles(makeStyles);
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const size = Math.min(320, Math.max(240, width - 40));
  const k = size / 320;
  const rotation = useRef(new Animated.Value(0)).current;
  const angle = useRef(0);
  const kick = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<WheelPrize | null>(null);
  const [oddsOpen, setOddsOpen] = useState(false);
  const [phase, setPhase] = useState(0);
  const lastSegment = useRef(-1);
  const lastTick = useRef(0);
  const has = tickets.tickets > 0;

  // The bulbs blink alternately while the wheel turns.
  useEffect(() => {
    if (reduceMotion || !spinning) return;
    const id = setInterval(() => setPhase((p) => p + 1), 120);
    return () => clearInterval(id);
  }, [spinning, reduceMotion]);

  // The pointer flicks, and the phone ticks, each time a slice edge passes under it.
  useEffect(() => {
    const id = rotation.addListener(({ value }) => {
      const seg = segmentAt(value);
      if (seg === lastSegment.current) return;
      lastSegment.current = seg;
      kick.setValue(1);
      Animated.timing(kick, { toValue: 0, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      const now = Date.now();
      if (Platform.OS !== 'web' && now - lastTick.current >= TICK_MS) {
        lastTick.current = now;
        Haptics.selectionAsync().catch(() => {});
      }
    });
    return () => rotation.removeListener(id);
  }, []);

  function spin() {
    if (spinning || !has) return;
    const result = onSpin();
    if (!result) return;
    const { prize, finish } = result;
    const { at } = segmentFor(prize.id, Math.random());
    // The pointer is at the top; the wheel turns clockwise until `at` is under it.
    const from = angle.current;
    const wanted = (360 - at * 360) % 360;
    const to = from + (reduceMotion ? 0 : TURNS * 360) + ((wanted - (from % 360) + 360) % 360);
    angle.current = to;
    setSpinning(true);
    Animated.timing(rotation, {
      toValue: to,
      duration: reduceMotion ? 400 : SPIN_MS,
      // Fast start, long slow-down: the last slices crawl past.
      easing: Easing.bezier(0.12, 0.72, 0.08, 1),
      useNativeDriver: false,
    }).start(() => {
      setSpinning(false);
      setWon(prize);
      finish();
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });
  }

  const rotate = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });
  const pointerRotate = kick.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-20deg'] });
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
          <Rim size={size} phase={phase} spinning={spinning} />
          <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate }] }}>
            <WheelFace size={size} ownsTheme={ownsTheme} />
          </Animated.View>
          <Pressable
            onPress={spin}
            disabled={spinning || !has}
            style={{ width: 64 * k, height: 64 * k, borderRadius: 32 * k, boxShadow: '0px 4px 14px rgba(0,0,0,0.5)' }}
            accessibilityRole="button"
            accessibilityLabel={has ? `Spin the wheel, ${tickets.tickets} ${tickets.tickets === 1 ? 'ticket' : 'tickets'}` : 'No tickets yet'}
          >
            <HubCoin size={64 * k} />
          </Pressable>
          <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', top: -22 * k, width: 34 * k, height: 44 * k, transformOrigin: `${17 * k}px ${16 * k}px`, transform: [{ rotate: pointerRotate }] }}
          >
            <Pointer scale={k} />
          </Animated.View>
        </View>

        <SpinButton label={spinning ? 'Good luck…' : has ? 'Spin · 1 ticket' : 'No tickets yet'} disabled={!has || spinning} off={!has && !spinning} onPress={spin} />
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

      <Modal visible={spinning} transparent animationType="none">
        {/* Holds every other tap while the wheel turns, so nothing changes under it. */}
        <View style={{ flex: 1 }} />
      </Modal>
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
function OddsSheet({ ownsTheme, onClose }: { ownsTheme: boolean; onClose: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.revealBackdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={s.revealWrap} pointerEvents="box-none">
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
      </View>
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
const FACE = 136;

/** The slice under the pointer at a wheel rotation in degrees. */
function segmentAt(rotation: number): number {
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

/** A five-pointed star centred on x, y. */
function star(x: number, y: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${x + rr * Math.cos(a)} ${y + rr * Math.sin(a)}`;
  });
  return `M${pts.join(' L')} Z`;
}

/** The turning disc: one slice per prize, sized by its chance, labelled along the radius. */
function WheelFace({ size, ownsTheme }: { size: number; ownsTheme: boolean }) {
  const slices = useMemo(() => {
    let at = 0;
    return WHEEL_SEGMENTS.map((seg, i) => {
      const from = at * 3.6;
      at += seg.share;
      return { ...seg, i, from, to: at * 3.6, prize: prizeById(seg.prize) };
    });
  }, []);
  return (
    <Svg width={size} height={size} viewBox="0 0 320 320">
      <Defs>
        <RadialGradient id="faceShade" cx="50%" cy="50%" r="50%">
          <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
        </RadialGradient>
      </Defs>
      {slices.map((sl) => {
        const mid = (sl.from + sl.to) / 2;
        if (sl.prize.theme) {
          // Six rainbow stripes and a big glowing star.
          const step = (sl.to - sl.from) / MYTHIC.length;
          const [sx, sy] = point(mid, FACE * 0.66);
          return (
            <G key={sl.i}>
              {MYTHIC.map((col, j) => (
                <Path key={col} d={wedge(sl.from + j * step, sl.from + (j + 1) * step, FACE)} fill={col} />
              ))}
              <Path d={wedge(sl.from, sl.to, FACE)} fill="none" stroke="#120a1f" strokeWidth={1.5} strokeLinejoin="round" />
              <Circle cx={sx} cy={sy} r={18} fill="#FFF1B8" opacity={0.35} />
              <Path d={star(sx, sy, 13)} fill={ownsTheme ? GOLD.light : '#FFFFFF'} stroke={KEYLINE} strokeWidth={1.5} />
            </G>
          );
        }
        const look = SLICES[sl.prize.id];
        const [lx, ly] = point(mid, FACE * 0.64);
        // Labels run along the radius, turned so none reads upside down at rest.
        const turn = mid <= 180 ? mid - 90 : mid + 90;
        return (
          <G key={sl.i}>
            <Path d={wedge(sl.from, sl.to, FACE)} fill={look.color} stroke="#120a1f" strokeWidth={1.5} strokeLinejoin="round" />
            <SvgText
              x={lx}
              y={ly + look.font * 0.36}
              fill={look.ink}
              fontFamily={CINZEL}
              fontSize={look.font}
              letterSpacing={look.font < 14 ? 0.6 : 0}
              textAnchor="middle"
              transform={`rotate(${turn} ${lx} ${ly})`}
            >
              {sl.prize.short}
            </SvgText>
          </G>
        );
      })}
      <Circle cx={C} cy={C} r={FACE} fill="url(#faceShade)" />
      <Circle cx={C} cy={C} r={42} fill="#1f1530" stroke={GOLD.mid} strokeWidth={1.5} />
    </Svg>
  );
}

/** The fixed rim: dark violet with two gold rings and 24 bulbs that blink while the wheel turns. */
function Rim({ size, phase, spinning }: { size: number; phase: number; spinning: boolean }) {
  return (
    <View style={{ position: 'absolute', width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 320 320">
        <Circle cx={C} cy={C} r={159} fill="#1f1530" stroke={GOLD.deep} strokeWidth={2} />
        <Circle cx={C} cy={C} r={154.75} fill="none" stroke={GOLD.mid} strokeWidth={1.5} />
        <Circle cx={C} cy={C} r={FACE + 1.5} fill="none" stroke={GOLD.mid} strokeWidth={1.5} />
        {Array.from({ length: BULBS }, (_, i) => {
          const [x, y] = point((i / BULBS) * 360, 146);
          const lit = !spinning || (i + phase) % 2 === 0;
          return (
            <G key={i}>
              {lit && <Circle cx={x} cy={y} r={6} fill={GOLD.bright} opacity={0.3} />}
              <Circle cx={x} cy={y} r={3.2} fill={lit ? GOLD.light : GOLD.deep} opacity={lit ? 1 : 0.6} />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/** The 64 px gold coin at the centre, with an italic S. Tapping it spins. */
function HubCoin({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="hubCoin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GOLD.light} />
          <Stop offset="0.45" stopColor={GOLD.mid} />
          <Stop offset="0.75" stopColor={GOLD.deep} />
          <Stop offset="1" stopColor={GOLD.bright} />
        </LinearGradient>
      </Defs>
      <Circle cx={32} cy={32} r={31} fill="url(#hubCoin)" stroke={KEYLINE} strokeWidth={2} />
      <Circle cx={32} cy={32} r={26.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={1.5} />
      <SvgText x={32} y={42} fill={GOLD.ink} fontFamily={CINZEL} fontSize={30} textAnchor="middle" transform="skewX(-12) translate(8 0)">
        S
      </SvgText>
    </Svg>
  );
}

/** The gold teardrop pointer at the top, with a dark star. */
function Pointer({ scale }: { scale: number }) {
  return (
    <Svg width={34 * scale} height={44 * scale} viewBox="0 0 34 44">
      <Defs>
        <LinearGradient id="pointer" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GOLD.light} />
          <Stop offset="0.55" stopColor={GOLD.mid} />
          <Stop offset="1" stopColor={GOLD.deep} />
        </LinearGradient>
      </Defs>
      <Path d="M17 42C11 33 3 25 3 16a14 14 0 1 1 28 0c0 9-8 17-14 26z" fill="url(#pointer)" stroke={KEYLINE} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M17 9l1.6 5.4L24 16l-5.4 1.6L17 23l-1.6-5.4L10 16l5.4-1.6z" fill={GOLD.ink} />
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
      <View style={s.revealWrap} pointerEvents="box-none">
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
      </View>
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
  preview: { alignSelf: 'stretch', backgroundColor: c.bg, borderRadius: 12, padding: 12, gap: 8, marginTop: 8, borderWidth: 1, borderColor: c.border },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  previewWord: { fontFamily: FONTS.serif, color: c.text, fontSize: 11, letterSpacing: 3 },
  previewTask: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  previewTaskText: { color: c.text, fontSize: 13, fontWeight: '600' },
}));
