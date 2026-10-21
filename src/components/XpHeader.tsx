import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { nextLevelReward } from '../achievements';
import { levelInfo } from '../game';
import { eyebrow, FONTS, themed, useStyles, useTheme, type BarStyle } from '../theme';
import { LogoMark } from './LogoMark';
import { RewardPicture } from './RewardPicture';

/**
 * Always-visible header: wordmark, streak, level and the XP bar. Gained XP
 * counts up: a light "ghost" bar jumps ahead to the new total, the solid bar
 * fills after it, the numbers tick up and the bar glows. A level-up runs the
 * bar to the end and continues from zero on the new level.
 */
export function XpHeader({ totalXp, streak, bonus }: { totalXp: number; streak: number; bonus: number }) {
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
      <View style={s.inner}>
        <View style={s.top}>
          <LogoMark textStyle={s.wordmark} ruleWidth={22} />
          <View style={s.streak} accessibilityLabel={`Streak: ${streak} days`}>
            <View style={s.streakMark} />
            <Text style={s.streakText}>
              {streak} {streak === 1 ? 'day' : 'days'}
              {bonus > 0 ? `  +${Math.round(bonus * 100)}%` : ''}
            </Text>
          </View>
        </View>
        <View style={s.labels}>
          <Text style={s.eyebrow}>
            Level {shown.level} · {shown.rank}
          </Text>
          <View style={s.xpWrap}>
            {gain > 0 && <Animated.Text style={[s.gain, gainStyle]}>+{gain}</Animated.Text>}
            <Text style={s.xpText}>{shown.maxed ? 'Max level' : `${shown.xpIntoLevel} / ${shown.xpForLevel} XP`}</Text>
          </View>
        </View>
        {c.bar.kind === 'line' ? (
          <View style={s.track} accessibilityRole="progressbar">
            <View style={[s.ghost, { width: `${ghost * 100}%` }]} />
            <Animated.View style={[s.fill, { width: `${shown.progress * 100}%`, backgroundColor: glowColor }]} />
            {c.tip && <Animated.View style={[s.tip, { left: `${shown.progress * 100}%`, backgroundColor: glowColor }]} />}
          </View>
        ) : (
          <StepBar style={c.bar} progress={shown.progress} ghost={ghost} />
        )}
        <NextReward totalXp={totalXp} />
      </View>
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
      <Text style={s.nextXp}>
        {next.xpInto.toLocaleString()} / {next.xpNeeded.toLocaleString()} XP
      </Text>
    </View>
  );
}

/** XP bar made of segments or dots; they light up one by one, the ones about to fill shown faintly. */
function StepBar({ style, progress, ghost }: { style: Exclude<BarStyle, { kind: 'line' }>; progress: number; ghost: number }) {
  const c = useTheme();
  const filled = Math.round(progress * style.count);
  const coming = Math.round(ghost * style.count);
  const color = (i: number) => (i < filled ? c.accent : i < coming ? c.accentSoft : c.border);
  if (style.kind === 'segments') {
    return (
      <View style={{ flexDirection: 'row', gap: style.gap }} accessibilityRole="progressbar">
        {Array.from({ length: style.count }, (_, i) => (
          <View key={i} style={{ flex: 1, height: c.lineWeight, borderRadius: style.radius, backgroundColor: color(i) }} />
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityRole="progressbar">
      {Array.from({ length: style.count }, (_, i) => (
        <View
          key={i}
          style={{
            width: style.size,
            height: style.size,
            borderRadius: style.size / 2,
            backgroundColor: color(i),
            ...(i < filled && style.glow ? { boxShadow: `0px 0px 6px ${c.accent}` } : {}),
          }}
        />
      ))}
    </View>
  );
}

const makeStyles = themed((c) => ({
  wrap: { backgroundColor: c.bg, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 },
  inner: { maxWidth: 640, width: '100%', alignSelf: 'center', gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  wordmark: { fontFamily: FONTS.serif, color: c.text, fontSize: 15, letterSpacing: 3.6 },
  streak: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: c.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakMark: { width: 6, height: 6, backgroundColor: c.accent, transform: [{ rotate: '45deg' }] },
  streakText: { ...eyebrow(c, 11), color: c.text },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eyebrow: { ...eyebrow(c), color: c.muted },
  xpText: { color: c.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
  xpWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  gain: { fontFamily: FONTS.serif, fontStyle: 'italic', color: c.accent, fontSize: 15 },
  ghost: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: c.accent, opacity: 0.3, borderRadius: c.tip ? 0 : c.lineWeight / 2 },
  track: { height: c.lineWeight, borderRadius: c.tip ? 0 : c.lineWeight / 2, backgroundColor: c.border, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: c.tip ? 0 : c.lineWeight / 2 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -2 },
  slots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  slot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: c.outline },
  slotNext: { borderColor: c.muted },
  slotReward: { width: 22, height: 22, borderRadius: 11, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  gap: { color: c.faint, fontSize: 11, letterSpacing: 1 },
  nextLabel: { flex: 1, color: c.muted, fontSize: 12 },
  nextXp: { color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  tip: { position: 'absolute', width: 8, height: 8, marginLeft: -4, transform: [{ rotate: '45deg' }] },
}));
