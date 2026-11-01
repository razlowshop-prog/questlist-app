import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type HostInstance, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop, SvgXml } from 'react-native-svg';
import { chainAt, type Curve, type Pt } from '../flight';
import { t } from '../i18n';
import { FlyingBizzy, measureIn, useFlyer, useWait } from './fx/Flyer';
import { seeded } from './fx/hooks';

// The two Today moments picked on 2026-10-29: the morning hello (A "honeycomb
// hatch" and B "out of the hive", taking turns day by day) and all done (A
// "honey check mark", drawn while Bizzy stays on the streak card). They play over the Today screen, end with Bizzy back in
// his spot on the streak card, and a tap skips them.

function hexPath(r: number): string {
  return (
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
    }).join(' ') + 'Z'
  );
}
const CELL = `<svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg"><path d="${hexPath(46)}" fill="#B8651B"/><path d="${hexPath(38)}" fill="#4A2A0E"/></svg>`;
const capHalf = (side: -1 | 1) =>
  `<svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cap${side}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7A0"/><stop offset="1" stop-color="#E8A73C"/></linearGradient></defs><path d="${side < 0 ? 'M0 -38 L-33 -19 L-33 19 L0 38 L5 24 L-4 10 L5 -4 L-3 -20Z' : 'M0 -38 L33 -19 L33 19 L0 38 L5 24 L-4 10 L5 -4 L-3 -20Z'}" fill="url(#cap${side})"/><path d="M${side * 20} -22 Q${side * 26} -14 ${side * 24} -4" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/></svg>`;
const CAP_L = capHalf(-1);
const CAP_R = capHalf(1);
const SKEP = `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg"><path d="M60 0 V18" stroke="#6b4a2a" stroke-width="3"/><path d="M16 112 Q14 40 60 18 Q106 40 104 112Z" fill="#E8A73C"/>${[38, 54, 70, 86, 100]
  .map((y, i) => `<path d="M${24 - i * 1.5} ${y} Q60 ${y + 10} ${96 + i * 1.5} ${y}" fill="none" stroke="#B8651B" stroke-width="3.5" stroke-linecap="round"/>`)
  .join('')}<path d="M48 112 Q48 92 60 92 Q72 92 72 112Z" fill="#3a2208"/><rect x="8" y="110" width="104" height="10" rx="4" fill="#8a5a2b"/><path d="M34 34 Q46 26 56 24" stroke="#FFE7A0" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/></svg>`;

const backOut = Easing.out(Easing.back(1.7));
const SPARK_COLORS = ['#FFE48A', '#FFC53D', '#FFFFFF'];

/** A burst of little sparks from a point; mount it (with a new key) to play it. */
function Sparks({ at, n = 12, spread = 60, colors = SPARK_COLORS }: { at: Pt; n?: number; spread?: number; colors?: string[] }) {
  const go = useSharedValue(0);
  useEffect(() => {
    go.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
  }, []);
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Spark key={i} i={i} at={at} spread={spread} color={colors[i % colors.length]} go={go} />
      ))}
    </>
  );
}

function Spark({ i, at, spread, color, go }: { i: number; at: Pt; spread: number; color: string; go: SharedValue<number> }) {
  const size = 5 + seeded(i, 1) * 5;
  const a = seeded(i, 2) * Math.PI * 2;
  const d = spread * (0.5 + seeded(i, 3) * 0.6);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - go.value,
    transform: [{ translateX: Math.cos(a) * d * go.value }, { translateY: Math.sin(a) * d * go.value }, { scale: 1 - 0.7 * go.value }],
  }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: at[0] - size / 2, top: at[1] - size / 2, width: size, height: size, borderRadius: size, backgroundColor: color }, style]} />;
}

/** A piece of art placed by its centre that can scale, turn, move and fade. */
function useProp() {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(0);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(1);
  return { x, y, scale, rot, opacity };
}
type Prop = ReturnType<typeof useProp>;

function PropArt({ prop, xml, w, h, origin }: { prop: Prop; xml: string; w: number; h: number; origin?: 'top' }) {
  const style = useAnimatedStyle(() => ({
    opacity: prop.opacity.value,
    transform: [{ translateX: prop.x.value - w / 2 }, { translateY: prop.y.value - h / 2 }, { scale: prop.scale.value }, { rotate: `${prop.rot.value}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: origin === 'top' ? '50% 0%' : '50% 50%' }, style]}>
      <SvgXml xml={xml} width={w} height={h} />
    </Animated.View>
  );
}

/** A dotted flight trail: dot `i` sits at `p` of the path and shows for a moment once Bizzy has passed it. */
function TrailDot({ chain, at, flight }: { chain: Curve[]; at: number; flight: SharedValue<number> }) {
  const [x, y] = chainAt(chain, at);
  const style = useAnimatedStyle(() => {
    const since = flight.value - at;
    return { opacity: since <= 0 ? 0 : Math.max(0, 0.9 - since * 2.2) };
  });
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - 2.5, top: y + 14, width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFE48A' }, style]} />;
}

export type TodayMomentKind = 'hatch' | 'hive' | DoneKind;
/** The all-done moments: A honey check (picked), B honey rain, C trophy stamp, D sun rays (alternatives asked 2026-11-01). */
export type DoneKind = 'check' | 'rain' | 'stamp' | 'rays';
export const DONE_KINDS: DoneKind[] = ['check', 'rain', 'stamp', 'rays'];

/**
 * Plays one Today moment over the screen. `spot` is the streak card's Bizzy:
 * he is hidden while the moment plays (`onLand` brings him back, with what he
 * says). Tapping anywhere skips to the end.
 */
export function TodayMoment({
  kind,
  spot,
  greeting,
  onLand,
  onDone,
}: {
  kind: TodayMomentKind;
  spot: HostInstance | null;
  greeting: string;
  /** He's back in his spot: show him there, saying `line`. */
  onLand: (line: string) => void;
  onDone: () => void;
}) {
  const root = useRef<HostInstance>(null);
  const [size, setSize] = useState<{ w: number; h: number }>();
  const [target, setTarget] = useState<{ at: Pt; size: number }>();
  const [sparks, setSparks] = useState<{ key: number; at: Pt } | null>(null);
  const [trail, setTrail] = useState<Curve[] | null>(null);
  const [check, setCheck] = useState<Pt[] | null>(null);
  const flyer = useFlyer(kind === 'hatch' ? 'sleepy' : 'excited');
  const cell = useProp();
  const capL = useProp();
  const capR = useProp();
  const hive = useProp();
  const dim = useSharedValue(0);
  const drawn = useSharedValue(0);
  const checkFade = useSharedValue(1);
  const { alive, wait } = useWait();
  const finished = useRef(false);

  /** He's home: he shows in his spot and speaks; the overlay closes after `linger` ms. */
  function finish(line: string, linger = 0) {
    if (finished.current) return;
    finished.current = true;
    onLand(line);
    if (linger) setTimeout(onDone, linger);
    else onDone();
  }
  const done = kind === 'check' || kind === 'rain' || kind === 'stamp' || kind === 'rays';
  const landLine = done ? t('All done today!') : greeting;

  // Where his spot is, once the overlay has its size.
  useEffect(() => {
    if (!size) return;
    measureIn(spot, root.current).then((m) => {
      if (!m || !m.w) return finish(landLine);
      setTarget({ at: [m.x + m.w / 2, m.y + m.h / 2], size: m.w });
    });
  }, [size]);

  useEffect(() => {
    if (!target || !size) return;
    (kind === 'hatch' ? hatch : kind === 'hive' ? outOfHive : kind === 'rain' ? honeyRain : kind === 'stamp' ? trophyStamp : kind === 'rays' ? sunRays : honeyCheck)(target.at, size).catch(() => finish(landLine));
  }, [target]);

  const ok = () => alive.current && !finished.current;

  async function hatch(spotAt: Pt, { w, h }: { w: number; h: number }) {
    const c: Pt = [w / 2, h * 0.42];
    dim.value = withTiming(0.45, { duration: 250 });
    for (const pr of [cell, capL, capR]) {
      pr.x.value = c[0];
      pr.y.value = c[1];
      pr.scale.value = withTiming(1, { duration: 320, easing: backOut });
    }
    await wait(340);
    // The capped cell wobbles…
    for (const pr of [cell, capL, capR]) pr.rot.value = withSequence(...[8, -8, 6, -4, 0].map((r) => withTiming(r, { duration: 90 })));
    await wait(460);
    if (!ok()) return;
    // …cracks open, and a sleepy Bizzy wakes inside.
    flyer.setFast(false);
    flyer.place(c[0], c[1], 0.3);
    setSparks({ key: 1, at: c });
    const away = { duration: 420, easing: Easing.out(Easing.quad) };
    capL.x.value = withTiming(c[0] - 60, away);
    capR.x.value = withTiming(c[0] + 60, away);
    for (const [pr, r] of [[capL, -60], [capR, 60]] as const) {
      pr.y.value = withSequence(withTiming(c[1] - 22, { duration: 160 }), withTiming(c[1] + 50, { duration: 260, easing: Easing.in(Easing.quad) }));
      pr.rot.value = withTiming(r, away);
      pr.opacity.value = withTiming(0, away);
    }
    await flyer.to(1.05, 0, 300, backOut);
    await wait(250);
    if (!ok()) return;
    flyer.setMood('excited');
    flyer.setFast(true);
    flyer.rot.value = withSequence(...[10, -10, 10, -10, 0].map((r) => withTiming(r, { duration: 40 })));
    await wait(200);
    cell.scale.value = withTiming(0.4, { duration: 300, easing: Easing.in(Easing.quad) });
    cell.opacity.value = withTiming(0, { duration: 300 });
    dim.value = withDelay(200, withTiming(0, { duration: 700 }));
    const from: Pt = [c[0], c[1] - 6];
    await flyer.fly([[from, [from[0] - 120, from[1] - 60], [spotAt[0] - 40, spotAt[1] + 120], spotAt]], 750, { scale: target!.size / 68 });
    if (!ok()) return;
    finish(landLine);
  }

  async function outOfHive(spotAt: Pt, { w, h }: { w: number; h: number }) {
    const hx = Math.max(56, w * 0.17);
    const hy = h * 0.2;
    hive.x.value = hx;
    hive.y.value = hy - 140;
    hive.rot.value = 14;
    hive.scale.value = 1;
    hive.y.value = withTiming(hy, { duration: 500, easing: backOut });
    hive.rot.value = withSequence(withTiming(0, { duration: 500, easing: backOut }), withTiming(4, { duration: 220 }), withTiming(-3, { duration: 220 }), withTiming(0, { duration: 220 }));
    await wait(750);
    if (!ok()) return;
    const door: Pt = [hx, hy + 32];
    setSparks({ key: 2, at: door });
    const chain: Curve[] = [
      [door, [hx + 40, hy + 140], [hx + 170, hy + 160], [hx + 160, hy + 60]],
      [[hx + 160, hy + 60], [hx + 150, hy - 10], [hx + 60, hy + 20], [hx + 110, hy + 80]],
      [[hx + 110, hy + 80], [hx + 160, hy + 140], [spotAt[0] + 10, spotAt[1] + 70], spotAt],
    ];
    setTrail(chain);
    flyer.place(door[0], door[1], 0.25);
    await flyer.fly(chain, 1500, { scale: target!.size / 68 });
    if (!ok()) return;
    hive.y.value = withTiming(hy - 160, { duration: 450, easing: Easing.in(Easing.quad) });
    hive.rot.value = withTiming(-10, { duration: 450 });
    finish(landLine);
  }

  async function honeyCheck(_spotAt: Pt, { w, h }: { w: number; h: number }) {
    // The check mark draws itself over the list while Bizzy cheers in his spot on
    // the streak card: one Bizzy only, he no longer flies down (asked 2026-11-01).
    const A: Pt = [w * 0.2, h * 0.62];
    const B: Pt = [w * 0.4, h * 0.72];
    const C: Pt = [w * 0.82, h * 0.5];
    setCheck([A, B, C]);
    const l1 = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const l2 = Math.hypot(C[0] - B[0], C[1] - B[1]);
    const share = l1 / (l1 + l2);
    drawn.value = withSequence(withTiming(share, { duration: 700 * share, easing: Easing.in(Easing.quad) }), withTiming(1, { duration: 700 * (1 - share), easing: Easing.out(Easing.quad) }));
    await wait(720);
    if (!ok()) return;
    setSparks({ key: 3, at: C });
    checkFade.value = withDelay(1100, withTiming(0, { duration: 500 }));
    finish(landLine, 1650);
  }

  // B: honey drops burst out of Bizzy's corner and rain down over the screen.
  const [rain, setRain] = useState<Pt | null>(null);
  async function honeyRain(spotAt: Pt) {
    setRain(spotAt);
    await wait(2300);
    if (!ok()) return;
    finish(landLine);
  }

  // C: a gold trophy drops onto the list like a stamp, a ring runs out, a ribbon says it.
  const stamp = useProp();
  const ring = useSharedValue(0);
  const [stampAt, setStampAt] = useState<Pt | null>(null);
  async function trophyStamp(_spotAt: Pt, { w, h }: { w: number; h: number }) {
    const at: Pt = [w / 2, h * 0.6];
    setStampAt(at);
    stamp.x.value = at[0];
    stamp.y.value = at[1];
    stamp.scale.value = 2.6;
    stamp.opacity.value = 0;
    stamp.opacity.value = withTiming(1, { duration: 120 });
    stamp.scale.value = withSequence(withTiming(0.86, { duration: 260, easing: Easing.in(Easing.quad) }), withTiming(1.06, { duration: 140 }), withTiming(1, { duration: 120 }));
    await wait(260);
    if (!ok()) return;
    stamp.rot.value = withSequence(...[-6, 5, -3, 0].map((r) => withTiming(r, { duration: 70 })));
    ring.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
    setSparks({ key: 4, at });
    await wait(1500);
    if (!ok()) return;
    stamp.opacity.value = withTiming(0, { duration: 400 });
    stamp.scale.value = withTiming(0.7, { duration: 400 });
    finish(landLine, 420);
  }

  // D: golden rays turn behind Bizzy on the card while he cheers, with a ring of light.
  const [raysAt, setRaysAt] = useState<Pt | null>(null);
  async function sunRays(spotAt: Pt) {
    setRaysAt(spotAt);
    setSparks({ key: 5, at: spotAt });
    await wait(2400);
    if (!ok()) return;
    finish(landLine);
  }

  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value > 0 ? 1 - ring.value : 0, transform: [{ scale: 0.4 + 2.2 * ring.value }] }));

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const checkLen = check ? Math.hypot(check[1][0] - check[0][0], check[1][1] - check[0][1]) + Math.hypot(check[2][0] - check[1][0], check[2][1] - check[1][1]) : 0;
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: checkLen * (1 - drawn.value) }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: checkFade.value }));

  return (
    <View ref={root} style={StyleSheet.absoluteFill} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} pointerEvents="box-none">
      {/* A tap skips it; he's back in his spot at once. The check mark stays tappable-through once he's home. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => finish(landLine)} accessibilityRole="button" accessibilityLabel={t('Skip')} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dimStyle]} />
      {check && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, checkStyle]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="honeyCheck" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFE08A" />
                <Stop offset="1" stopColor="#F28C1E" />
              </LinearGradient>
            </Defs>
            <AnimatedPath d={`M${check[0].join(' ')} L${check[1].join(' ')} L${check[2].join(' ')}`} fill="none" stroke="url(#honeyCheck)" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${checkLen} ${checkLen}`} animatedProps={checkProps} />
            <AnimatedPath d={`M${check[0].join(' ')} L${check[1].join(' ')} L${check[2].join(' ')}`} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${checkLen} ${checkLen}`} animatedProps={checkProps} transform="translate(-3 -4)" />
          </Svg>
        </Animated.View>
      )}
      {kind === 'hatch' && (
        <>
          <PropArt prop={cell} xml={CELL} w={96} h={96} />
          <PropArt prop={capL} xml={CAP_L} w={96} h={96} />
          <PropArt prop={capR} xml={CAP_R} w={96} h={96} />
        </>
      )}
      {kind === 'hive' && <PropArt prop={hive} xml={SKEP} w={84} h={92} origin="top" />}
      {trail && Array.from({ length: 36 }, (_, i) => <TrailDot key={i} chain={trail} at={(i + 1) / 40} flight={flyer.p} />)}
      {rain && Array.from({ length: 34 }, (_, i) => <Drop key={i} i={i} at={rain} h={size?.h ?? 800} />)}
      {raysAt && <Rays at={raysAt} />}
      {stampAt && (
        <>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: stampAt[0] - 60, top: stampAt[1] - 60, width: 120, height: 120, borderRadius: 60, borderWidth: 6, borderColor: '#FFD36B' }, ringStyle]} />
          <PropArt prop={stamp} xml={TROPHY} w={150} h={170} />
        </>
      )}
      {sparks && <Sparks key={sparks.key} at={sparks.at} n={kind === 'stamp' || kind === 'rays' ? 18 : 12} spread={kind === 'stamp' ? 110 : 60} />}
      <FlyingBizzy flyer={flyer} size={68} />
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const TROPHY = `<svg viewBox="0 0 150 170" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1B0"/><stop offset=".5" stop-color="#FFC53D"/><stop offset="1" stop-color="#D9831A"/></linearGradient></defs><path d="M38 22 H112 V60 Q112 104 75 112 Q38 104 38 60Z" fill="url(#tg)"/><path d="M38 34 H18 Q16 70 44 78" fill="none" stroke="#FFC53D" stroke-width="9" stroke-linecap="round"/><path d="M112 34 H132 Q134 70 106 78" fill="none" stroke="#FFC53D" stroke-width="9" stroke-linecap="round"/><rect x="66" y="110" width="18" height="22" fill="#E9A229"/><rect x="44" y="130" width="62" height="14" rx="4" fill="#B8651B"/><path d="M14 146 H136 L128 166 H22Z" fill="#E8423F"/><text x="75" y="161" font-family="Arial, sans-serif" font-weight="900" font-size="13" fill="#fff" text-anchor="middle">100%</text><path d="M56 32 Q60 64 72 92" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".45"/><path d="M75 44 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2Z" fill="#FFF7D6"/></svg>`;

const DROP_COLORS = ['#FFE08A', '#FFC53D', '#F2A93B', '#FFF4C7'];

/** A honey drop of the rain: shoots up and out of Bizzy's corner, then falls, turning, and fades near the bottom. */
function Drop({ i, at, h }: { i: number; at: Pt; h: number }) {
  const go = useSharedValue(0);
  const delay = seeded(i, 7) * 260;
  useEffect(() => {
    go.value = withDelay(delay, withTiming(1, { duration: 1900, easing: Easing.linear }));
  }, []);
  const vx = (seeded(i, 1) - 0.65) * 520;
  const vy = -260 - seeded(i, 2) * 360;
  const g = 1500;
  const size = 9 + seeded(i, 3) * 9;
  const spin = (seeded(i, 4) - 0.5) * 900;
  const style = useAnimatedStyle(() => {
    const tt = go.value * 1.9;
    const y = vy * tt + 0.5 * g * tt * tt;
    return {
      opacity: go.value === 0 ? 0 : Math.min(1, Math.max(0, (h - (at[1] + y)) / 160)),
      transform: [{ translateX: vx * tt }, { translateY: y }, { rotate: `${spin * tt}deg` }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: at[0] - size / 2, top: at[1] - size / 2, width: size, height: size * 1.25, borderTopLeftRadius: size, borderTopRightRadius: size * 0.2, borderBottomLeftRadius: size, borderBottomRightRadius: size, backgroundColor: DROP_COLORS[i % DROP_COLORS.length], transform: [{ rotate: '45deg' }] }, style]} />
  );
}

/** Golden rays turning slowly behind a point, growing in and fading out. */
function Rays({ at }: { at: Pt }) {
  const go = useSharedValue(0);
  useEffect(() => {
    go.value = withTiming(1, { duration: 2400, easing: Easing.linear });
  }, []);
  const R = 150;
  const style = useAnimatedStyle(() => ({
    opacity: go.value < 0.15 ? go.value / 0.15 : go.value > 0.75 ? (1 - go.value) / 0.25 : 1,
    transform: [{ rotate: `${go.value * 120}deg` }, { scale: 0.6 + 0.4 * Math.min(1, go.value * 4) }],
  }));
  const rays = Array.from({ length: 12 }, (_, k) => {
    const a = (Math.PI * 2 * k) / 12;
    const b = a + 0.13;
    // They start outside Bizzy, so he stays in sight on the card.
    const r0 = 44;
    return `M${(Math.cos(a) * r0).toFixed(1)} ${(Math.sin(a) * r0).toFixed(1)} L${(Math.cos(a) * R).toFixed(1)} ${(Math.sin(a) * R).toFixed(1)} L${(Math.cos(b) * R).toFixed(1)} ${(Math.sin(b) * R).toFixed(1)} L${(Math.cos(b) * r0).toFixed(1)} ${(Math.sin(b) * r0).toFixed(1)}Z`;
  }).join(' ');
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: at[0] - R, top: at[1] - R, width: R * 2, height: R * 2 }, style]}>
      <Svg width={R * 2} height={R * 2} viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}>
        <Defs>
          <LinearGradient id="ray" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFF1B0" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#FFB000" stopOpacity={0.15} />
          </LinearGradient>
        </Defs>
        <Path d={rays} fill="url(#ray)" />
      </Svg>
    </Animated.View>
  );
}
