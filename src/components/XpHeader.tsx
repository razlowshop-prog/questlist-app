import { Ban, Crown, Gem, Zap } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { nextLevelReward, type LevelMilestone } from '../achievements';
import { levelInfo } from '../game';
import { eyebrow, FONTS, THEMES, themed, useStyles, useTheme, type BarStyle } from '../theme';
import { LogoMark } from './LogoMark';

/**
 * Always-visible header: wordmark, streak, level and a fine XP line with a
 * diamond tip that glides forward when XP is gained. On a level-up it runs
 * to the end, glows softly, then continues from zero on the new level.
 */
export function XpHeader({ totalXp, streak, bonus }: { totalXp: number; streak: number; bonus: number }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const info = levelInfo(totalXp);
  const fill = useRef(new Animated.Value(info.progress)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const prev = useRef({ xp: totalXp, level: info.level });
  // The level shown lags behind during the level-up animation.
  const [shownLevel, setShownLevel] = useState(info.level);

  useEffect(() => {
    const before = prev.current;
    prev.current = { xp: totalXp, level: info.level };
    if (totalXp === before.xp) return;
    // An interrupted glow would otherwise stay half-lit.
    glow.stopAnimation();
    glow.setValue(0);

    const pulse = Animated.sequence([
      Animated.timing(glow, { toValue: 0.5, duration: 300, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 700, useNativeDriver: false }),
    ]);

    if (info.level > before.level) {
      Animated.sequence([
        Animated.timing(fill, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        pulse,
      ]).start(() => {
        setShownLevel(info.level);
        fill.setValue(0);
        Animated.timing(fill, { toValue: info.progress, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      });
    } else {
      setShownLevel(info.level);
      Animated.parallel([
        Animated.timing(fill, { toValue: info.progress, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        totalXp > before.xp ? pulse : Animated.delay(0),
      ]).start();
    }
  }, [totalXp]);

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: [c.xp, c.text] });


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
            Level {shownLevel} · {info.rank}
          </Text>
          <Text style={s.xpText}>{info.maxed ? 'Max level' : `${info.xpIntoLevel} / ${info.xpForLevel} XP`}</Text>
        </View>
        {c.bar.kind === 'line' ? (
          <View style={s.track}>
            <Animated.View style={[s.fill, { width, backgroundColor: glowColor }]} />
            {c.tip && <Animated.View style={[s.tip, { left: width, backgroundColor: glowColor }]} />}
          </View>
        ) : (
          <StepBar style={c.bar} progress={info.progress} />
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
              <RewardIcon milestone={l.milestone} />
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

/** A tiny picture of the reward: the theme's own colours, or an icon. */
function RewardIcon({ milestone }: { milestone: LevelMilestone }) {
  const c = useTheme();
  const reward = milestone.reward;
  const theme = reward?.kind === 'theme' ? THEMES.find((t) => t.reward === reward.label) : undefined;
  if (theme) {
    return (
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: theme.palette.bg,
          borderWidth: 1,
          borderColor: theme.palette.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.palette.accent }} />
      </View>
    );
  }
  const Icon = reward?.kind === 'title' ? Crown : reward?.kind === 'adfree' ? Ban : reward?.kind === 'premium' ? Gem : Zap;
  return <Icon size={12} color={c.accent} strokeWidth={1.5} aria-hidden />;
}

/** XP bar made of segments or dots; they light up one by one. */
function StepBar({ style, progress }: { style: Exclude<BarStyle, { kind: 'line' }>; progress: number }) {
  const c = useTheme();
  const filled = Math.round(progress * style.count);
  const items = Array.from({ length: style.count }, (_, i) => i < filled);
  if (style.kind === 'segments') {
    return (
      <View style={{ flexDirection: 'row', gap: style.gap }} accessibilityRole="progressbar">
        {items.map((on, i) => (
          <View
            key={i}
            style={{ flex: 1, height: c.lineWeight, borderRadius: style.radius, backgroundColor: on ? c.accent : c.border }}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityRole="progressbar">
      {items.map((on, i) => (
        <View
          key={i}
          style={{
            width: style.size,
            height: style.size,
            borderRadius: style.size / 2,
            backgroundColor: on ? c.accent : c.border,
            ...(on && style.glow ? { boxShadow: `0px 0px 6px ${c.accent}` } : {}),
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
