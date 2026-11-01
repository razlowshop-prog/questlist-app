import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Animated, { cancelAnimation, Easing, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { LEVEL_MILESTONES, milestoneLabel, nextLevelReward, type LevelMilestone } from '../achievements';
import { num, t } from '../i18n';
import { useReduceMotion } from './FireAura';
import { levelInfo, MAX_LEVEL, xpToNext } from '../game';
import { MASCOT_SIZE } from '../themeFx';
import { themed, useStyles, useTheme } from '../theme';
import { brandLine } from '../vivid';
import { ShimmerBar } from './Fortuna';
import { RewardPicture } from './RewardPicture';
import { ThemeXpBar, useThemeFx } from './ThemeFx';
import { GradientText, PrismBar, VIVID_HEAVY } from './Vivid';

/** XP needed for each level, so the animation thread can turn a position back into XP numbers. */
const LEVEL_XP = Array.from({ length: MAX_LEVEL + 1 }, (_, l) => (l === 0 ? 1 : xpToNext(l)));

/**
 * Position on the level track: the level plus how far into it, so 3.4 is 40%
 * into level 3. Within a level XP grows linearly, so animating this number
 * moves the bar smoothly and a level-up runs it to the end and on from zero.
 */
function levelPosition(totalXp: number): number {
  const info = levelInfo(totalXp);
  return info.maxed ? MAX_LEVEL : info.level + info.progress;
}

/** Tallest the theme's mascot may ride in the strip, so it stays a slim line under the header. */
const STRIP_MASCOT = 26;

/**
 * Level progress under the header on every tab: "LV 8", the bar (with the
 * theme's mascot riding it in its own lane above) ending in a sticker of the
 * next level's reward, and the XP into the level.
 * Gained XP counts up wherever it was earned: a light "ghost" bar jumps ahead
 * to the new total, the solid bar fills after it, the numbers tick up and
 * "+N XP" pops up above them. A level-up runs the bar to the end and
 * continues from zero on the new level. Tapping it opens the level details.
 *
 * The bar runs on the animation thread (Reanimated), so it stays smooth while
 * the rest of the app is busy; only the numbers re-render, once per XP.
 */
export function XpProgress({ totalXp, onPress }: { totalXp: number; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const fx = useThemeFx();
  const real = levelInfo(totalXp);
  // On first show the bar fills up from the start of the current level.
  const startXp = totalXp - real.xpIntoLevel;
  const pos = useSharedValue(levelPosition(startXp));
  const [shown, setShown] = useState({ level: real.level, xp: 0 });
  const glow = useSharedValue(0);
  const gainAnim = useSharedValue(0);
  const [gain, setGain] = useState(0);
  const [gainKey, setGainKey] = useState(0);
  const prevXp = useRef<number | null>(null);

  useEffect(() => {
    const before = prevXp.current;
    prevXp.current = totalXp;
    const diff = before === null ? 0 : totalXp - before;
    const to = levelPosition(totalXp);
    const levels = Math.max(0, real.level - levelInfo(before ?? totalXp).level);
    const motion = fx.bar?.motion;
    pos.value =
      motion && before !== null
        ? // The theme's own pace, when it has one.
          withDelay(motion.delay, withTiming(to, { duration: motion.duration + Math.min(levels, 3) * 300, easing: Easing.inOut(Easing.cubic) }))
        : withDelay(
            before === null ? 350 : 200,
            // Longer when a level-up runs the bar to the end first.
            withTiming(to, { duration: before === null ? 1200 : 1100 + Math.min(levels, 3) * 500, easing: Easing.out(Easing.cubic) }),
          );
    if (diff > 0) {
      setGain(diff);
      setGainKey((k) => k + 1);
      glow.value = withSequence(withTiming(1, { duration: 250 }), withTiming(0, { duration: 1100 }));
      gainAnim.value = 0;
      gainAnim.value = withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(setGain, 0);
      });
    }
  }, [totalXp]);

  // How full the bar is: the part after the decimal point, or full at the top level.
  const fraction = useDerivedValue(() => (pos.value >= MAX_LEVEL ? 1 : pos.value - Math.floor(pos.value)));

  // The numbers follow the bar, re-rendering only when the shown XP changes.
  useAnimatedReaction(
    () => {
      const level = Math.min(MAX_LEVEL, Math.floor(pos.value));
      const need = LEVEL_XP[level] ?? 1;
      return level * 100000 + (level >= MAX_LEVEL ? 0 : Math.min(need, Math.round((pos.value - level) * need)));
    },
    (now, before) => {
      if (now !== before) scheduleOnRN(setShown, { level: Math.floor(now / 100000), xp: now % 100000 });
    },
  );

  const maxed = shown.level >= MAX_LEVEL;
  const forLevel = maxed ? 0 : xpToNext(shown.level);
  // Where the bar is heading: the new total, or the end while a level-up is still running.
  const ghost = shown.level === real.level ? real.progress : 1;
  const gainStyle = useAnimatedStyle(() => ({
    opacity: gainAnim.value < 0.1 ? gainAnim.value * 10 : gainAnim.value > 0.7 ? (1 - gainAnim.value) / 0.3 : 1,
    // Pops up above the numbers and stays there, in the free space beside the mascot's lane.
    transform: [{ translateY: 6 * (1 - Math.min(1, gainAnim.value / 0.25)) }],
  }));

  const size = fx.mascot ? MASCOT_SIZE[fx.mascot] : undefined;
  const mascotScale = size ? Math.min(fx.mascotScale ?? 1, STRIP_MASCOT / size.height) : 1;
  // The level and the numbers sit level with the bar, below the mascot's lane.
  const side = { height: fx.bar ? fx.bar.height : c.bar.kind === 'shimmer' ? 18 : 16, marginBottom: fx.bar?.decor === 'vine' ? 6 : 0 };
  // The reward the bar runs towards; it moves on as the bar passes a level-up.
  const goal = maxed ? undefined : LEVEL_MILESTONES.find((m) => m.level > shown.level);

  return (
    <Pressable
      onPress={onPress}
      // Without a mascot there is no lane above the bar: leave room there for "+N XP".
      style={[s.strip, !(fx.bar && fx.mascot) && s.noLane]}
      accessibilityRole="button"
      accessibilityLabel={`${t('Level {n}', { n: real.level })}, ${real.rank}. ${real.maxed ? t('Max level') : t('{n} of {total} XP to level {level}', { n: real.xpIntoLevel, total: real.xpForLevel, level: real.level + 1 })}. ${t('Show upcoming rewards')}`}
    >
      <View style={[s.side, side]}>
        <View style={s.pill}>
          <Text style={s.pillLv}>{t('LV')}</Text>
          <Text style={s.pillLevel}>{shown.level}</Text>
        </View>
      </View>
      <View style={[s.bar, goal && s.barToGoal]}>
        {fx.bar ? (
          <ThemeXpBar spec={fx.bar} mascot={fx.mascot} scale={mascotScale} live={fraction} ghost={ghost} progress={real.progress} gainKey={gainKey} />
        ) : c.bar.kind === 'shimmer' ? (
          <ShimmerBar progress={real.progress} live={fraction} ghost={ghost} glow={gain > 0 ? glow : undefined} glowFrom={c.xp} glowTo={c.text} />
        ) : (
          <PrismBar progress={real.progress} live={fraction} ghost={ghost} />
        )}
        {goal && <GoalSticker milestone={goal} totalXp={totalXp} close={real.progress >= CLOSE} bottom={side.marginBottom + side.height / 2 - GOAL / 2} />}
      </View>
      <View style={[s.side, s.xpSide, side]}>
        {gain > 0 && (
          <Animated.View style={[s.gainWrap, gainStyle]}>
            <GradientText style={s.gain}>+{gain} XP</GradientText>
          </Animated.View>
        )}
        <View style={s.xpRow}>
          <GradientText style={s.xpNumbers}>{maxed ? t('Max level') : `${shown.xp} / ${forLevel} XP`}</GradientText>
          {/* Says the strip opens something: the upcoming rewards (asked 2026-10-31, nobody found it). */}
          <ChevronRight size={14} color={brandLine(c)} strokeWidth={2.5} aria-hidden />
        </View>
      </View>
    </Pressable>
  );
}

/** Size of the reward sticker at the end of the bar. */
const GOAL = 26;
/** From this far into the level the sticker starts to glow. */
const CLOSE = 0.75;

/**
 * The next level's reward as a sticker at the finish of the bar, so the
 * mascot always flies towards it (big ones, themes and Premium, get a gold
 * ring). Close to the level-up it pulses. Tapping it names the reward and the
 * XP still to go in a small bubble under the strip.
 */
function GoalSticker({ milestone, totalXp, close, bottom }: { milestone: LevelMilestone; totalXp: number; close: boolean; bottom: number }) {
  const s = useStyles(makeStyles);
  const reduce = useReduceMotion();
  const [tip, setTip] = useState(false);
  const pulse = useSharedValue(0);
  const big = milestone.reward?.kind === 'theme' || milestone.reward?.kind === 'premium';
  const next = nextLevelReward(totalXp);
  const toGo = next ? next.xpNeeded - next.xpInto : 0;

  useEffect(() => {
    if (close && !reduce) pulse.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1);
    else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(pulse);
  }, [close, reduce]);
  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(() => setTip(false), 3000);
    return () => clearTimeout(timer);
  }, [tip]);
  // A new reward to run towards: the old bubble no longer fits it.
  useEffect(() => setTip(false), [milestone.level]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.14 * pulse.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: close ? (reduce ? 0.6 : 0.3 + 0.7 * pulse.value) : 0 }));
  const label = milestoneLabel(milestone);

  return (
    <>
      <Pressable
        onPress={() => setTip((v) => !v)}
        hitSlop={8}
        style={[s.goal, { bottom }]}
        accessibilityRole="button"
        accessibilityLabel={`${t('Next reward at level {n}', { n: milestone.level })}: ${label}`}
      >
        <Animated.View style={[s.goalGlow, big && s.goalGlowBig, glowStyle]} pointerEvents="none" />
        <Animated.View style={[s.goalSticker, big && s.goalBig, pulseStyle]}>
          <RewardPicture milestone={milestone} size={GOAL} />
        </Animated.View>
      </Pressable>
      {tip && (
        <View style={s.tip} pointerEvents="none" accessibilityLiveRegion="polite">
          <Text style={s.tipText} numberOfLines={1}>
            {t('Lvl {n}', { n: milestone.level })} · {label}
            {toGo > 0 && <Text style={s.tipXp}> · {num(toGo)} XP</Text>}
          </Text>
        </View>
      )}
    </>
  );
}

const makeStyles = themed((c) => ({
  strip: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 8, maxWidth: 664, width: '100%', alignSelf: 'center' },
  noLane: { paddingTop: 18 },
  side: { justifyContent: 'center' },
  xpSide: { alignItems: 'flex-end', minWidth: 74 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  bar: { flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brandLine(c),
    backgroundColor: c.surface,
  },
  pillLv: { color: c.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  pillLevel: { color: brandLine(c), fontFamily: VIVID_HEAVY, fontSize: 13, fontVariant: ['tabular-nums'] },
  gainWrap: { position: 'absolute', right: 0, bottom: '100%', marginBottom: 6 },
  gain: { fontFamily: VIVID_HEAVY, fontSize: 13 },
  xpNumbers: { fontFamily: VIVID_HEAVY, fontSize: 13, fontVariant: ['tabular-nums'] },
  barToGoal: { marginRight: GOAL / 2 + 2 },
  goal: { position: 'absolute', right: -GOAL / 2 - 2, width: GOAL, height: GOAL, zIndex: 3, alignItems: 'center', justifyContent: 'center' },
  goalSticker: { width: GOAL, height: GOAL, borderRadius: GOAL / 2, alignItems: 'center', justifyContent: 'center' },
  goalBig: { borderRadius: GOAL / 2, boxShadow: '0px 0px 0px 2px #FFD36B, 0px 0px 10px rgba(255,211,107,0.6)' },
  // A soft shadow glow rather than a blur filter, which older Android phones don't draw.
  goalGlow: { position: 'absolute', width: GOAL, height: GOAL, borderRadius: GOAL / 2, backgroundColor: c.xp, opacity: 0, boxShadow: `0px 0px 10px 4px ${c.xp}` },
  goalGlowBig: { backgroundColor: '#FFD36B', boxShadow: '0px 0px 10px 4px #FFD36B' },
  tip: {
    position: 'absolute',
    right: -6,
    top: '100%',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    boxShadow: '0px 8px 20px rgba(0,0,0,0.35)',
    zIndex: 20,
  },
  tipText: { color: c.text, fontSize: 13, fontWeight: '700' },
  tipXp: { color: c.muted, fontWeight: '600' },
}));
