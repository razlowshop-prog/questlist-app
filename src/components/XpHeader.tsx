import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { levelInfo } from '../game';
import { eyebrow, FONTS, themed, useStyles, useTheme, type BarStyle } from '../theme';
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
      </View>
    </View>
  );
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
  tip: { position: 'absolute', width: 8, height: 8, marginLeft: -4, transform: [{ rotate: '45deg' }] },
}));
