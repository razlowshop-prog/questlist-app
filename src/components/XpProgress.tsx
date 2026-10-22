import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { nextLevelReward } from '../achievements';
import { levelInfo } from '../game';
import { eyebrow, themed, useStyles, useTheme } from '../theme';
import { ShimmerBar } from './Fortuna';
import { RewardPicture } from './RewardPicture';
import { GradientText, PrismBar, VIVID_HEAVY } from './Vivid';

/**
 * Level progress at the top of Today: "Level 8 → 9", the XP into the level and
 * the bar, then the next reward. Gained XP counts up: a light "ghost" bar
 * jumps ahead to the new total, the solid bar fills after it, the numbers tick
 * up and "+N XP" floats by. A level-up runs the bar to the end and continues
 * from zero on the new level. Tapping it opens the level details.
 */
export function XpProgress({ totalXp, onPress }: { totalXp: number; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const real = levelInfo(totalXp);
  // On first show the bar fills up from the start of the current level.
  const [shownXp, setShownXp] = useState(totalXp - real.xpIntoLevel);
  const anim = useRef(new Animated.Value(totalXp - real.xpIntoLevel)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const gainAnim = useRef(new Animated.Value(0)).current;
  const [gain, setGain] = useState(0);
  const prevXp = useRef<number | null>(null);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setShownXp(Math.round(value)));
    return () => anim.removeListener(id);
  }, []);

  useEffect(() => {
    const before = prevXp.current;
    prevXp.current = totalXp;
    const diff = before === null ? 0 : totalXp - before;
    anim.stopAnimation();
    glow.stopAnimation();
    glow.setValue(0);
    const levels = Math.max(0, real.level - levelInfo(before ?? totalXp).level);
    Animated.timing(anim, {
      toValue: totalXp,
      // Longer when a level-up runs the bar to the end first.
      duration: before === null ? 1200 : 1100 + Math.min(levels, 3) * 500,
      delay: before === null ? 350 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    if (diff > 0) {
      setGain(diff);
      gainAnim.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 250, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 1100, useNativeDriver: false }),
        ]),
        Animated.timing(gainAnim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]).start(({ finished }) => finished && setGain(0));
    }
  }, [totalXp]);

  const shown = levelInfo(shownXp);
  // Where the bar is heading: the new total, or the end while a level-up is still running.
  const ghost = shown.level === real.level ? real.progress : 1;
  const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: [c.xp, c.text] });
  const gainStyle = {
    opacity: gainAnim.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
    transform: [{ translateY: gainAnim.interpolate({ inputRange: [0, 1], outputRange: [4, -8] }) }],
  };

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={onPress}
        style={s.press}
        accessibilityRole="button"
        accessibilityLabel={`Level ${shown.level}, ${shown.rank}. ${shown.maxed ? 'Max level' : `${shown.xpIntoLevel} of ${shown.xpForLevel} XP to level ${shown.level + 1}`}. Show level details`}
      >
        <View style={s.labels}>
          <Text style={s.level}>{shown.maxed ? `Level ${shown.level} · max` : `Level ${shown.level} → ${shown.level + 1}`}</Text>
          <View style={s.xpWrap}>
            {gain > 0 && (
              <Animated.View style={gainStyle}>
                <GradientText style={s.gain}>+{gain} XP</GradientText>
              </Animated.View>
            )}
            {!shown.maxed && (
              <GradientText style={s.xpNumbers}>
                {shown.xpIntoLevel} / {shown.xpForLevel} XP
              </GradientText>
            )}
          </View>
        </View>
        {c.bar.kind === 'shimmer' ? (
          <ShimmerBar progress={shown.progress} ghost={ghost} glow={gain > 0 ? glowColor : undefined} />
        ) : (
          <PrismBar progress={shown.progress} ghost={ghost} />
        )}
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
