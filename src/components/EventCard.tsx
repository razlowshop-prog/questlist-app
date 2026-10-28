import { useContext, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { frameName } from '../cosmetics';
import { locale, t, tn } from '../i18n';
import { areaList } from '../library';
import { SEASON_XP, type SeasonStatus } from '../seasons';
import { SEASON_PILL } from '../vivid';
import { bizzyFormOf } from '../bizzy';
import { Bizzy, BizzyFormContext } from './Bizzy';
import { useReduceMotion } from './FireAura';
import { BRAND_FILL_SMALL, BRAND_INK, BRAND_TEXT_SHADOW, fill, VIVID_HEAVY } from './Vivid';

// The monthly event, first on the Challenges tab (design "Harvest", final):
// a picture of the month on top, progress and the reward in a dark footer.
// October has its own scene; the other months use the same card with a
// plain sky until they get theirs.

const HEADING = 'PlayfairDisplay_400Regular';

/** A value going 0 → 1 → 0 every `ms` (or 0 → 1 over and over with `restart`), resting while `on` is false. */
function useWave(ms: number, on: boolean, restart = false): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!on) {
      cancelAnimation(v);
      v.value = 0;
      return;
    }
    v.value = restart
      ? withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false)
      : withRepeat(withSequence(withTiming(1, { duration: ms / 2, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: ms / 2, easing: Easing.inOut(Easing.sin) })), -1, false);
    return () => cancelAnimation(v);
  }, [on, ms]);
  return v;
}

export function EventCard({ season, onClaim }: { season: SeasonStatus; onClaim: () => void }) {
  const reduce = useReduceMotion();
  const month = new Date(`${season.month}-15T12:00:00`).toLocaleDateString(locale(), { month: 'long' });
  const left = season.daysLeft === 0 ? t('last day') : tn(season.daysLeft, '{n} day left', '{n} days left');
  const name = t(season.season.name);
  const pct = Math.min(100, Math.round((season.progress / season.season.target) * 100));
  const frame = frameName(season.frame);
  const harvest = season.season.month === 10;
  return (
    <View style={s.card}>
      <View style={[s.scene, harvest ? s.harvestSky : fill(SEASON_PILL, 160)]}>
        {harvest && <HarvestScene live={!reduce} />}
        <View style={s.text}>
          <Text style={[s.eyebrow, !harvest && s.eyebrowPlain]}>{t('{month} event', { month })}</Text>
          <Text style={s.title}>{name}</Text>
          {/* Short area names ("home" for "Home & chores"), so the goal fits on the picture. */}
          <Text style={[s.goal, !harvest && s.goalPlain]}>
            {t('Finish {n} {areas} tasks', { n: season.season.target, areas: areaList(season.season.categories) })} · {left}
          </Text>
        </View>
      </View>
      <View style={s.footer}>
        <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: season.season.target, now: season.progress }}>
          <View style={[s.fill, { width: `${pct}%` }]} />
          {/* The pumpkin rides the tip of the bar. */}
          {harvest && <Pumpkin live={!reduce} at={pct} />}
        </View>
        <View style={s.row}>
          <Text style={s.count}>
            {t('{n} / {total} tasks', { n: season.progress, total: season.season.target })}
          </Text>
          {season.claimed ? (
            <Text style={s.won}>✓ {t('{frame} frame won · +{xp} XP', { frame, xp: SEASON_XP })}</Text>
          ) : season.complete ? (
            <Pressable style={s.claim} onPress={onClaim} accessibilityRole="button" accessibilityLabel={t('Claim the {frame} frame and {xp} XP', { frame, xp: SEASON_XP })}>
              <Text style={s.claimText}>{t('Claim frame + {xp} XP', { xp: SEASON_XP })}</Text>
            </Pressable>
          ) : (
            <View style={s.chip} accessibilityLabel={t('Wins the {frame} frame and {xp} XP, only this month', { frame, xp: SEASON_XP })}>
              <View style={s.chipDisc} />
              <Text style={s.chipText}>
                {t('{frame} frame + {xp} XP', { frame: name, xp: SEASON_XP })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const LEAF = 'M12 2C6 6 4 12 6 20c1-4 3-7 6-9-2 3-3 6-3 9 7-2 10-9 3-18z';
/** The board's falling leaves: left (of 390), size, colour, turn, duration and start (share of the loop). */
const LEAVES: [number, number, string, number, number, number][] = [
  [193, 10, '#B5651D', 358, 5800, 0.05],
  [64, 18, '#FFB347', 21, 5700, 0.86],
  [128, 11, '#C94A1C', 76, 7200, 0.68],
  [284, 17, '#E8692A', 206, 9000, 0.11],
  [72, 18, '#B5651D', 187, 7400, 0.04],
  [292, 13, '#FFB347', 177, 7300, 0.75],
  [289, 16, '#B5651D', 101, 6500, 0.26],
  [-1, 11, '#F2C14E', 0, 6500, 0.75],
];
const STALKS = 14;
const PUMPKIN = 26;
const BIZZY = 84;

/** October: a sunset field with a pulsing sun, swaying wheat, Bizzy and falling leaves. The pumpkin sits on the progress bar. */
function HarvestScene({ live }: { live: boolean }) {
  const sun = useWave(5000, live);
  const sunStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.08 * sun.value }] }));
  // The young forms are drawn bigger, so the same part of him (down to his middle) shows above the bottom.
  const { k } = bizzyFormOf(useContext(BizzyFormContext));
  const drawn = BIZZY / k;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[s.sun, sunStyle]}>
        <Svg width={70} height={70} viewBox="0 0 70 70">
          <Defs>
            <RadialGradient id="harvestSun" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#FFF3C4" />
              <Stop offset="0.6" stopColor="#FFD36B" />
              <Stop offset="0.72" stopColor="#FFD36B" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={35} cy={35} r={35} fill="url(#harvestSun)" />
        </Svg>
      </Animated.View>
      <Svg viewBox="0 0 390 120" preserveAspectRatio="none" width="100%" height={120} style={s.hills}>
        <Path d="M0 60 Q 90 30 190 55 T 390 45 V120 H0z" fill="#B5651D" />
        <Path d="M0 85 Q 120 60 230 82 T 390 75 V120 H0z" fill="#8A4A16" />
      </Svg>
      <View style={s.wheat}>
        {Array.from({ length: STALKS }, (_, i) => (
          <Stalk key={i} live={live} delay={i * 0.37} />
        ))}
      </View>
      {/* Bizzy stands in the field, cut off by the bottom of the picture. */}
      <Bizzy mood="happy" size={drawn} motion={live ? 'idle' : 'none'} look={[-2, 0]} style={[s.bizzy, { right: 28 - (drawn - BIZZY) / 2, bottom: (-drawn * (14 + 46 * k)) / 200 }]} />
      {live && <FallingLeaves />}
    </View>
  );
}

function Stalk({ live, delay }: { live: boolean; delay: number }) {
  const t = useWave(3000, live, true);
  // Leans 7° and back every 3 s, each stalk a little behind the one before.
  const style = useAnimatedStyle(() => {
    const p = (t.value + delay / 3) % 1;
    return { transform: [{ rotate: `${7 * (0.5 - 0.5 * Math.cos(Math.PI * 2 * p))}deg` }] };
  });
  const grains = [8, 14, 20, 26, 32];
  return (
    <Animated.View style={[{ width: 18, height: 46, transformOrigin: 'bottom' } as ViewStyle, style]}>
      <Svg viewBox="0 0 24 48" width={18} height={46}>
        <Path d="M12 48V8" stroke="#C98A1C" strokeWidth={1.6} />
        {grains.map((y) => (
          <Ellipse key={`l${y}`} cx={9} cy={y} rx={3} ry={5.5} fill="#F2C14E" stroke="#C98A1C" strokeWidth={0.8} transform={`rotate(-30 9 ${y})`} />
        ))}
        {grains.map((y) => (
          <Ellipse key={`r${y}`} cx={15} cy={y} rx={3} ry={5.5} fill="#F2C14E" stroke="#C98A1C" strokeWidth={0.8} transform={`rotate(30 15 ${y})`} />
        ))}
        <Ellipse cx={12} cy={5} rx={2.6} ry={5} fill="#F2C14E" stroke="#C98A1C" strokeWidth={0.8} />
      </Svg>
    </Animated.View>
  );
}

/** A small pumpkin on the progress bar at `at` percent, rocking gently. */
function Pumpkin({ live, at }: { live: boolean; at: number }) {
  const bob = useWave(3000, live);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -1.5 * bob.value }, { rotate: `${-6 * bob.value}deg` }] }));
  return (
    <Animated.View style={[s.pumpkin, { left: `${at}%` }, style]} pointerEvents="none">
      <Svg viewBox="0 0 64 64" width={PUMPKIN} height={PUMPKIN}>
        <Defs>
          <LinearGradient id="harvestPumpkin" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFC66B" />
            <Stop offset="1" stopColor="#E8572A" />
          </LinearGradient>
        </Defs>
        <Path d="M32 14c-3-6 1-10 5-11-1 3-2 6-1 10z" fill="#5a7d2a" />
        <Ellipse cx={20} cy={38} rx={14} ry={17} fill="url(#harvestPumpkin)" />
        <Ellipse cx={44} cy={38} rx={14} ry={17} fill="url(#harvestPumpkin)" />
        <Ellipse cx={32} cy={38} rx={13} ry={19} fill="url(#harvestPumpkin)" stroke="#B8401A" strokeWidth={1} />
        <Path d="M22 26c-2 8-2 16 0 24M42 26c2 8 2 16 0 24" stroke="#B8401A" strokeWidth={1.2} fill="none" opacity={0.6} />
        <Ellipse cx={27} cy={27} rx={4} ry={2} fill="#fff" opacity={0.45} />
      </Svg>
    </Animated.View>
  );
}

function FallingLeaves() {
  const leaves = useMemo(() => LEAVES.map(([x, size, color, turn, ms, start]) => ({ x: x / 390, size, color, turn, ms, start })), []);
  return (
    <>
      {leaves.map((l, i) => (
        <FallingLeaf key={i} {...l} />
      ))}
    </>
  );
}

function FallingLeaf({ x, size, color, turn, ms, start }: { x: number; size: number; color: string; turn: number; ms: number; start: number }) {
  const t = useWave(ms, true, true);
  // Drifts right and back while it falls through the scene and past it, turning.
  const style = useAnimatedStyle(() => {
    const v = (t.value + start) % 1;
    const sway = v < 0.5 ? 26 * (v / 0.5) : 26 - 20 * ((v - 0.5) / 0.5);
    return { transform: [{ translateX: sway }, { translateY: 290 * v }, { rotate: `${340 * v}deg` }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: `${x * 100}%`, top: -24, width: size, height: size }, style]}>
      <Svg viewBox="0 0 24 24" width={size} height={size} style={{ transform: [{ rotate: `${turn}deg` }] }}>
        <Path d={LEAF} fill={color} />
      </Svg>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FFD36B',
    boxShadow: '0px 10px 30px rgba(232,105,42,0.35)',
    marginBottom: 6,
  } as ViewStyle,
  scene: { height: 210, overflow: 'hidden' },
  harvestSky: { backgroundColor: '#F48A4A', backgroundImage: 'linear-gradient(180deg, #FFB06A 0%, #F48A4A 38%, #C9572A 70%)' } as ViewStyle,
  sun: { position: 'absolute', right: 40, top: 26, width: 70, height: 70 },
  hills: { position: 'absolute', left: 0, bottom: 0 },
  bizzy: { position: 'absolute' },
  wheat: { position: 'absolute', left: 0, right: 0, bottom: 22, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 6 },
  text: { position: 'absolute', left: 18, top: 18, right: 120, gap: 3 },
  eyebrow: { fontFamily: VIVID_HEAVY, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: '#5a250c' },
  eyebrowPlain: { color: 'rgba(255,255,255,0.8)' },
  title: { fontFamily: HEADING, fontSize: 34, lineHeight: 38, color: '#fff8ec', textShadowColor: 'rgba(90,37,12,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  goal: { fontFamily: VIVID_HEAVY, fontSize: 13, color: '#4a1f0a' },
  goalPlain: { color: '#FFFFFF' },
  footer: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#2e160b', backgroundImage: 'linear-gradient(180deg, #3b1a0c, #24120a)' } as ViewStyle,
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 6 },
  // Centred on the bar's tip; the stem pokes up above the bar.
  pumpkin: { position: 'absolute', top: 5 - PUMPKIN / 2 - 3, marginLeft: -PUMPKIN / 2, width: PUMPKIN, height: PUMPKIN },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#FFB04D',
    backgroundImage: 'linear-gradient(90deg, #FFE29A, #FF7A00)',
    boxShadow: '0px 0px 10px rgba(255,140,40,0.7)',
  } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  count: { fontFamily: VIVID_HEAVY, fontSize: 14, color: '#fff4e0' },
  chip: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingLeft: 4, paddingRight: 10, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.3)', flexShrink: 1 },
  chipDisc: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFB000', backgroundImage: 'linear-gradient(135deg, #FFE066, #FF7A00)' } as ViewStyle,
  chipText: { fontFamily: VIVID_HEAVY, fontSize: 12, color: '#FFC66B', flexShrink: 1 },
  won: { marginLeft: 'auto', fontFamily: VIVID_HEAVY, fontSize: 12, color: '#FFC66B', flexShrink: 1, textAlign: 'right' },
  claim: { ...BRAND_FILL_SMALL, marginLeft: 'auto', paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 12 },
  claimText: { color: BRAND_INK, fontFamily: VIVID_HEAVY, fontSize: 13, ...BRAND_TEXT_SHADOW },
});
