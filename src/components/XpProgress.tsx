import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { milestoneLabel, nextLevelReward } from '../achievements';
import { num, t } from '../i18n';
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
 * theme's mascot riding it in its own lane above) and the XP into the level.
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
        ? // The theme's own pace (Gym: after the lifter has picked the barbell up).
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
      <View style={s.bar}>
        {fx.bar ? (
          <ThemeXpBar spec={fx.bar} mascot={fx.mascot} scale={mascotScale} live={fraction} ghost={ghost} progress={real.progress} gainKey={gainKey} />
        ) : c.bar.kind === 'shimmer' ? (
          <ShimmerBar progress={real.progress} live={fraction} ghost={ghost} glow={gain > 0 ? glow : undefined} glowFrom={c.xp} glowTo={c.text} />
        ) : (
          <PrismBar progress={real.progress} live={fraction} ghost={ghost} />
        )}
      </View>
      <View style={[s.side, s.xpSide, side]}>
        {gain > 0 && (
          <Animated.View style={[s.gainWrap, gainStyle]}>
            <GradientText style={s.gain}>+{gain} XP</GradientText>
          </Animated.View>
        )}
        <GradientText style={s.xpNumbers}>{maxed ? t('Max level') : `${shown.xp} / ${forLevel} XP`}</GradientText>
      </View>
    </Pressable>
  );
}

/**
 * The coming levels as small slots, empty unless the level pays out, then the
 * next reward level and the XP still to go to reach it.
 */
export function NextReward({ totalXp }: { totalXp: number }) {
  const s = useStyles(makeStyles);
  const next = nextLevelReward(totalXp);
  if (!next) return null;
  const { milestone, levels } = next;
  // Long gaps: the first few levels, a gap mark, then the reward level.
  const shown = levels.length > 5 ? [...levels.slice(0, 3), null, levels[levels.length - 1]] : levels;
  const label = milestoneLabel(milestone);
  return (
    <View
      style={s.next}
      accessible
      accessibilityLabel={t('Next reward at level {n}: {reward}. {into} of {needed} XP.', { n: milestone.level, reward: label, into: next.xpInto, needed: next.xpNeeded })}
    >
      <View style={s.slots}>
        {shown.map((l, i) =>
          l === null ? (
            <Text key="gap" style={s.gap}>···</Text>
          ) : l.milestone ? (
            <View key={l.level} style={[s.slot, s.slotReward]}>
              <RewardPicture milestone={l.milestone} size={l.milestone.reward?.kind === 'theme' ? 14 : 12} />
            </View>
          ) : (
            <View key={l.level} style={[s.slot, i === 0 && s.slotNext]} />
          ),
        )}
      </View>
      <Text style={s.nextLabel} numberOfLines={1}>
        {t('Lvl {n}', { n: milestone.level })} · {label}
      </Text>
      {/* When the reward is the very next level, the bar above already shows these numbers. */}
      {levels.length > 1 && (
        <Text style={s.nextXp}>
          {num(next.xpInto)} / {num(next.xpNeeded)} XP
        </Text>
      )}
    </View>
  );
}

const makeStyles = themed((c) => ({
  strip: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 8, maxWidth: 664, width: '100%', alignSelf: 'center' },
  noLane: { paddingTop: 18 },
  side: { justifyContent: 'center' },
  xpSide: { alignItems: 'flex-end', minWidth: 74 },
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
  next: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  slots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  slot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: c.outline },
  slotNext: { borderColor: c.muted },
  slotReward: { width: 22, height: 22, borderRadius: 11, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  gap: { color: c.faint, fontSize: 11, letterSpacing: 1 },
  nextLabel: { flex: 1, color: c.muted, fontSize: 12 },
  nextXp: { color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
}));
