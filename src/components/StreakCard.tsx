import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { nextBizzyForm, type BizzyMood } from '../bizzy';
import type { Line, TalkContext } from '../bizzyTalk';
import { STREAK_TIERS, streakTierName, type StreakStatus, type WeekDot, type xpMultiplier } from '../game';
import { card, themed, useStyles, useTheme } from '../theme';
import { brandLine, tierFlame } from '../vivid';
import { TapBizzy } from './TapBizzy';
import { Fire } from './Fire';
import { MultiplierPill } from './MultiplierPill';
import { fill, GradientText, VIVID_HEAVY } from './Vivid';
import { N, t } from '../i18n';

const DAY_NAMES = [N('Monday'), N('Tuesday'), N('Wednesday'), N('Thursday'), N('Friday'), N('Saturday'), N('Sunday')];
const DOT_WORDS: Record<WeekDot, string> = { done: N('done'), rest: N('rest day'), today: N('today'), missed: N('missed'), future: N('to come') };

/**
 * The streak on the home screen: a still flame, the big glowing day count and
 * the fire's name on top, this week's days spread over the full width below,
 * inside a thin border in the fire tier's gradient. The XP
 * multiplier sits on the right while it is above 1. Bizzy lives in the free
 * corner on the right, in the mood of the day, with his next evolution under
 * him: an Evolve button once the level allows it, otherwise the level it
 * needs. Tapping him plays a little reaction and he says something about the
 * day in a small bubble, shown for a moment in place of the flame and count so
 * it covers nothing. Tapping the rest of the card opens the level sheet with the streak
 * bonus and the fire tiers.
 */
export function StreakCard({
  streak,
  week,
  multiplier,
  bizzy,
  onPress,
}: {
  streak: StreakStatus;
  /** Monday to Sunday of this week. */
  week: WeekDot[];
  multiplier: ReturnType<typeof xpMultiplier>;
  /** Bizzy's mood, a count that goes up each time he should jump for joy, his form, the player's level, what Evolve does and what he knows about the day. */
  bizzy?: { mood: BizzyMood; cheer: number; form: number; level: number; onEvolve: () => void; talk: () => TalkContext };
  onPress: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const grad = tierFlame(streak.tier);
  const days = week.map((d, i) => `${t(DAY_NAMES[i])} ${t(DOT_WORDS[d])}`).join(', ');
  // What Bizzy just said, shown for a few seconds (longer lines a little longer).
  const [said, setSaid] = useState<Line & { id: number }>();
  const hush = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hush.current), []);
  const say = (line: Line) => {
    setSaid({ ...line, id: Date.now() });
    clearTimeout(hush.current);
    hush.current = setTimeout(() => setSaid(undefined), Math.min(5000, 1600 + 50 * line.text.length));
  };
  const talking = useSharedValue(0);
  useEffect(() => {
    talking.value = withTiming(said ? 1 : 0, { duration: 180 });
  }, [!!said]);
  const labelStyle = useAnimatedStyle(() => ({ opacity: 1 - talking.value }));
  const bubbleStyle = useAnimatedStyle(() => ({ opacity: talking.value, transform: [{ scale: 0.9 + 0.1 * talking.value }] }));

  return (
    <Pressable
      onPress={onPress}
      style={[s.border, grad ? fill(grad, 135) : { backgroundColor: c.border }]}
      accessibilityRole="button"
      accessibilityLabel={t('{n}-day streak, {tier}. This week: {days}. Show the streak bonus and fire tiers', { n: streak.days, tier: streakTierName(streak.tier), days })}
    >
      <View style={s.card}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Animated.View style={[s.row, labelStyle]}>
              <Fire tier={streak.tier} size={48} still />
              <StreakNumber days={streak.days} tier={streak.tier} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.label} numberOfLines={2}>
                  {t('day streak')}
                </Text>
                {/* The multiplier shares the tier's line, so a long streak still fits on small phones. */}
                <View style={s.labelRow}>
                  <Text style={s.tier} numberOfLines={1}>
                    {streakTierName(streak.tier)}
                  </Text>
                  {multiplier.total > 1 && <MultiplierPill multiplier={multiplier} size="small" />}
                </View>
              </View>
            </Animated.View>
            {/* While Bizzy talks, his bubble takes the place of the flame, count and label for a moment, pointing at him. */}
            <Animated.View pointerEvents="none" style={[s.speechBox, bubbleStyle]}>
              {said && (
                <View style={s.speech} accessibilityLiveRegion="polite">
                  <Text style={s.speechText} numberOfLines={3}>
                    {said.text}
                  </Text>
                  <View style={s.speechTail} />
                </View>
              )}
            </Animated.View>
          </View>
          {bizzy && (
            <View style={s.corner}>
              <TapBizzy mood={bizzy.mood} cheer={bizzy.cheer} size={68} look={[-2, 1]} talk={bizzy.talk} onSay={say} />
              <EvolveNext form={bizzy.form} level={bizzy.level} onEvolve={bizzy.onEvolve} />
            </View>
          )}
        </View>
        {/* This week's days spread over the whole card, each with its letter. */}
        <View style={s.week}>
          {week.map((d, i) => (
            <View key={i} style={s.day}>
              <Dot state={d} grad={grad} />
              <Text style={[s.dayLetter, d === 'today' && s.dayToday]}>{t(DAY_NAMES[i])[0]}</Text>
            </View>
          ))}
        </View>
        {streak.atRisk && <Text style={s.risk}>{t('Nothing done yet today. One task keeps your streak going.')}</Text>}
        {streak.days === 0 && <Text style={s.note}>{t('Finish a task today to light your streak.')}</Text>}
        {/* Flame lights the moment the streak has earned its XP. */}
        {streak.days > 0 && streak.tier === 0 && (
          <Text style={s.note}>
            {t('{n} XP more to light {tier}', { n: STREAK_TIERS[0].weekXp - streak.streakXp, tier: t(STREAK_TIERS[0].name) })}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** Under Bizzy: Evolve (gently pulsing) when his next form's level is reached, else the level it needs; nothing once he is the Queen. */
function EvolveNext({ form, level, onEvolve }: { form: number; level: number; onEvolve: () => void }) {
  const s = useStyles(makeStyles);
  const next = nextBizzyForm(form);
  const ready = !!next && level >= next.level;
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = ready && !reduce ? withRepeat(withSequence(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) })), -1) : 0;
  }, [ready, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * pulse.value }], boxShadow: `0px 0px ${4 + 8 * pulse.value}px rgba(255,201,77,${0.35 + 0.35 * pulse.value})` }));
  if (!next) return <Text style={s.evolveWait}>{t('Fully grown')}</Text>;
  if (!ready) return <Text style={s.evolveWait}>{t('Reach level {n} to evolve', { n: next.level })}</Text>;
  return (
    <Animated.View style={[s.evolve, style]}>
      <Pressable onPress={onEvolve} hitSlop={8} style={s.evolveTap} accessibilityRole="button" accessibilityLabel={t('Evolve Bizzy into {name}', { name: t(next.name) })}>
        <Text style={s.evolveText}>{t('Evolve')} ✦</Text>
      </Pressable>
    </Animated.View>
  );
}

/** How the day count burns per fire tier (Spark, Flame, Blaze, Inferno): glow size and flicker strength. */
const NUMBER_FIRE = [
  { glow: 0, flicker: 0 },
  { glow: 10, flicker: 0.04 },
  { glow: 16, flicker: 0.07 },
  { glow: 24, flicker: 0.1 },
];

/**
 * The day count, big, in the fire tier's colours. It glows and flickers
 * softly like a flame, more with every tier; a Spark streak stays calm.
 */
function StreakNumber({ days, tier }: { days: number; tier: number }) {
  const s = useStyles(makeStyles);
  const grad = tierFlame(tier);
  const fire = NUMBER_FIRE[Math.max(0, Math.min(3, tier))];
  const reduce = useReducedMotion();
  const flicker = useSharedValue(0);
  const lit = days > 0 && fire.flicker > 0 && !reduce;

  useEffect(() => {
    if (!lit) {
      flicker.value = 0;
      return;
    }
    // Uneven steps, so it reads as a flame rather than a pulse.
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: 260, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.8, { duration: 340, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [lit]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - fire.flicker * 1.5 * flicker.value,
    transform: [{ scale: 1 + fire.flicker * 0.5 * flicker.value }],
  }));

  return (
    <Animated.View style={style}>
      <GradientText style={[s.days, days >= 100 && s.daysLong]} colors={grad} glow={grad && days > 0 ? grad.c2 : undefined} glowRadius={fire.glow}>
        {days}
      </GradientText>
    </Animated.View>
  );
}

/** One day of the week: filled in the flame gradient when done, dashed on a rest day, a ring for today, an outline otherwise. */
function Dot({ state, grad }: { state: WeekDot; grad?: { c1: string; c2: string } }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const doneGrad = grad ?? { c1: '#FFE29A', c2: '#FF4A1C' };
  if (state === 'done') return <View style={[s.dot, fill(doneGrad, 180), { borderColor: 'transparent' }]} />;
  if (state === 'rest') return <View style={[s.dot, { borderColor: doneGrad.c2, borderStyle: 'dashed' }]} />;
  if (state === 'today') return <View style={[s.dot, { borderColor: brandLine(c), borderWidth: 2 }]} />;
  return <View style={[s.dot, state === 'future' && { opacity: 0.6 }]} />;
}

const makeStyles = themed((c) => ({
  border: { borderRadius: c.radius + 1.5, padding: 1.5, marginTop: 16 },
  card: { ...card(c), borderWidth: 0, borderRadius: c.radius, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  corner: { minWidth: 84, maxWidth: 104, alignItems: 'center', gap: 2 },
  // Honey gold, the same in every theme: evolving belongs to the rewards layer.
  evolve: { borderRadius: 999, backgroundColor: '#FFC94D', backgroundImage: 'linear-gradient(90deg, #FFE48A, #FFB347)' },
  evolveTap: { paddingHorizontal: 12, paddingVertical: 5 },
  evolveText: { fontFamily: VIVID_HEAVY, fontSize: 13, color: '#2A1A05' },
  evolveWait: { maxWidth: 84, color: c.muted, fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  days: { fontFamily: VIVID_HEAVY, fontSize: 72, lineHeight: 80, fontVariant: ['lining-nums'], minWidth: 44, textAlign: 'center' },
  daysLong: { fontFamily: VIVID_HEAVY, fontSize: 56, lineHeight: 66 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: c.text, fontSize: 18, fontWeight: '800' },
  speechBox: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  speech: { alignSelf: 'flex-end', maxWidth: '100%', backgroundColor: c.surfaceAlt, borderColor: c.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 },
  speechText: { color: c.text, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  speechTail: { position: 'absolute', right: -5, top: '50%', marginTop: -4, width: 8, height: 8, backgroundColor: c.surfaceAlt, borderColor: c.border, borderTopWidth: 1, borderRightWidth: 1, transform: [{ rotate: '45deg' }] },
  tier: { flexShrink: 1, color: c.muted, fontSize: 13, fontWeight: '700' },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 2 },
  day: { alignItems: 'center', gap: 4 },
  dayLetter: { color: c.faint, fontSize: 11, fontWeight: '700' },
  dayToday: { color: c.text },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: c.outline },
  note: { color: c.muted, fontSize: 12 },
  risk: { color: c.flame, fontSize: 13, fontWeight: '600' },
}));
