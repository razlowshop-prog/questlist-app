import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { nextLevelReward } from '../achievements';
import { levelInfo, MAX_LEVEL, xpToNext } from '../game';
import { eyebrow, themed, useStyles, useTheme } from '../theme';
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

/**
 * Level progress at the top of Today: the bar (with the theme's mascot in its
 * own lane above it), then "Level 8 → 9" and the XP into the level below it,
 * so the mascot never covers them, then the next reward. Gained XP counts up: a light "ghost" bar
 * jumps ahead to the new total, the solid bar fills after it, the numbers tick
 * up and "+N XP" pops in beside them. A level-up runs the bar to the end and continues
 * from zero on the new level. Tapping it opens the level details.
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
  const prevXp = useRef<number | null>(null);

  useEffect(() => {
    const before = prevXp.current;
    prevXp.current = totalXp;
    const diff = before === null ? 0 : totalXp - before;
    const to = levelPosition(totalXp);
    const levels = Math.max(0, real.level - levelInfo(before ?? totalXp).level);
    pos.value = withDelay(
      before === null ? 350 : 200,
      // Longer when a level-up runs the bar to the end first.
      withTiming(to, { duration: before === null ? 1200 : 1100 + Math.min(levels, 3) * 500, easing: Easing.out(Easing.cubic) }),
    );
    if (diff > 0) {
      setGain(diff);
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
    // Pops up into the label row and stays there, clear of the bar above.
    transform: [{ translateY: 6 * (1 - Math.min(1, gainAnim.value / 0.25)) }],
  }));

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={onPress}
        style={s.press}
        accessibilityRole="button"
        accessibilityLabel={`Level ${real.level}, ${real.rank}. ${real.maxed ? 'Max level' : `${real.xpIntoLevel} of ${real.xpForLevel} XP to level ${real.level + 1}`}. Show level details`}
      >
        {fx.bar ? (
          <ThemeXpBar spec={fx.bar} mascot={fx.mascot} scale={fx.mascotScale} live={fraction} ghost={ghost} progress={real.progress} />
        ) : c.bar.kind === 'shimmer' ? (
          <ShimmerBar progress={real.progress} live={fraction} ghost={ghost} glow={gain > 0 ? glow : undefined} glowFrom={c.xp} glowTo={c.text} />
        ) : (
          <PrismBar progress={real.progress} live={fraction} ghost={ghost} />
        )}
        <View style={s.labels}>
          <Text style={s.level}>{maxed ? `Level ${shown.level} · max` : `Level ${shown.level} → ${shown.level + 1}`}</Text>
          <View style={s.xpWrap}>
            {gain > 0 && (
              <Animated.View style={gainStyle}>
                <GradientText style={s.gain}>+{gain} XP</GradientText>
              </Animated.View>
            )}
            {!maxed && (
              <GradientText style={s.xpNumbers}>
                {shown.xp} / {forLevel} XP
              </GradientText>
            )}
          </View>
        </View>
      </Pressable>
      <NextReward totalXp={totalXp} />
    </View>
  );
}

/**
 * The coming levels as small slots, empty unless the level pays out, then the
 * next reward level and the XP still to go to reach it.
 */
function NextReward({ totalXp }: { totalXp: number }) {
  const s = useStyles(makeStyles);
  const next = nextLevelReward(totalXp);
  if (!next) return null;
  const { milestone, levels } = next;
  // Long gaps: the first few levels, a gap mark, then the reward level.
  const shown = levels.length > 5 ? [...levels.slice(0, 3), null, levels[levels.length - 1]] : levels;
  const label = milestone.reward?.label ?? `+${milestone.bonusXp} XP bonus`;
  return (
    <View
      style={s.next}
      accessible
      accessibilityLabel={`Next reward at level ${milestone.level}: ${label}. ${next.xpInto} of ${next.xpNeeded} XP.`}
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
        Lvl {milestone.level} · {label}
      </Text>
      {/* When the reward is the very next level, the bar above already shows these numbers. */}
      {levels.length > 1 && (
        <Text style={s.nextXp}>
          {next.xpInto.toLocaleString()} / {next.xpNeeded.toLocaleString()} XP
        </Text>
      )}
    </View>
  );
}

const makeStyles = themed((c) => ({
  wrap: { gap: 10, marginTop: 14 },
  press: { gap: 8 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  level: { ...eyebrow(c, 12), color: c.muted },
  xpWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  gain: { fontFamily: VIVID_HEAVY, fontSize: 14 },
  xpNumbers: { fontFamily: VIVID_HEAVY, fontSize: 15, fontVariant: ['tabular-nums'] },
  next: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  slot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: c.outline },
  slotNext: { borderColor: c.muted },
  slotReward: { width: 22, height: 22, borderRadius: 11, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  gap: { color: c.faint, fontSize: 11, letterSpacing: 1 },
  nextLabel: { flex: 1, color: c.muted, fontSize: 12 },
  nextXp: { color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
}));
