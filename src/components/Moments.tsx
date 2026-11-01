import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Modal, Pressable, Share, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { DEFAULT_COMBO, entranceAt, type ComboIcon } from '../combo';
import { useThemeFx } from './ThemeFx';
import { APP_NAME } from '../brand';
import { buzz } from '../haptics';
import { sound } from '../sounds';
import { PERFECT_DAY_XP } from '../moments';
import { card, eyebrow, FONTS, themed, useStyles, useTheme } from '../theme';
import { FLAMES, RARITY } from '../vivid';
import { Bizzy } from './Bizzy';
import { Fire } from './Fire';
import { ConfettiBurst, Glyph, GradientText, VIVID_HEAVY, VividButton } from './Vivid';
import { N, t, tn } from '../i18n';

export type Moment = { kind: 'perfect' } | { kind: 'streak'; days: number };

/**
 * A big moment, celebrated full screen: a perfect day (every task done, with
 * its bonus) or a streak milestone. Both can be shared.
 */
export function MomentCelebration({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 11, stiffness: 140 });
    buzz('prize');
    sound(moment.kind === 'perfect' ? 'perfect' : 'streak');
  }, []);

  const cardStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.5), transform: [{ scale: 0.7 + 0.3 * pop.value }] }));

  const perfect = moment.kind === 'perfect';
  const title = perfect ? t('Perfect day') : tn(moment.days, '{n}-day streak#one', '{n}-day streak');
  const body = perfect
    ? t('Every task for today is done. +{xp} XP bonus.', { xp: PERFECT_DAY_XP })
    : moment.days >= 365
      ? t('A whole year, every single day. Legendary.')
      : t('You showed up {n} days in a row. Keep the fire going.', { n: moment.days });
  const message = perfect
    ? t('Perfect day on {app}: every task done today ✨', { app: APP_NAME })
    : t('I just hit a {n}-day streak on {app} 🔥', { n: moment.days, app: APP_NAME });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel={t('Close')} />
      <SafeAreaView style={s.center} pointerEvents="box-none">
        <ConfettiBurst scale={1.4} />
        <Animated.View style={[s.card, cardStyle]} accessibilityViewIsModal>
          <Text style={s.eyebrow}>{perfect ? t('All done') : t('Streak milestone')}</Text>
          <View style={s.emblem}>
            {/* Bizzy guards the streak, so he celebrates its milestones next to the fire. */}
            {perfect ? <Glyph name="Trophy" size={64} grad={RARITY.legendary} /> : <><Fire tier={3} size={76} /><Bizzy mood="excited" size={88} /></>}
          </View>
          <GradientText style={s.title} colors={perfect ? undefined : FLAMES.ember} glow={perfect ? undefined : FLAMES.ember.c2} glowRadius={14}>
            {title}
          </GradientText>
          <Text style={s.body}>{body}</Text>
          <View style={s.buttons}>
            <VividButton label={t('Share')} kind="secondary" compact onPress={() => Share.share({ message }).catch(() => {})} />
            <VividButton label={t('Nice!')} compact onPress={onClose} />
          </View>
          <Text style={[s.small, { color: c.faint }]}>{t('Tap anywhere to close')}</Text>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * "×3 combo": pops up for a moment when tasks are ticked in quick
 * succession, in the theme's own look (combo.ts). Just for fun; it gives no extra XP.
 */
export function ComboPill({ count, play, style: place }: { count: number; play: number; style?: ComponentProps<typeof Animated.View>['style'] }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const look = useThemeFx().combo ?? DEFAULT_COMBO;
  const reduce = useReducedMotion();
  const [circle, setCircle] = useState({ w: 0, h: 0 });
  // In over 0.45 s, hold, then fade; the sheen and Notepad's circle follow the landing.
  const enter = useSharedValue(0);
  const fade = useSharedValue(0);
  const after = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    enter.value = 0;
    after.value = 0;
    fade.value = 0;
    enter.value = withTiming(1, { duration: reduce ? 200 : 450, easing: Easing.linear });
    after.value = withDelay(350, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }));
    fade.value = withDelay(1350, withTiming(1, { duration: 350, easing: Easing.in(Easing.quad) }));
    buzz(count >= 4 ? 'bigCombo' : 'combo');
  }, [play]);
  const kind = look.entrance;
  const style = useAnimatedStyle(() => {
    const e = entranceAt(kind, enter.value);
    if (reduce) return { opacity: Math.min(1, enter.value) * (1 - fade.value) };
    return {
      opacity: e.opacity * (1 - fade.value),
      transform: [{ translateX: e.x }, { translateY: e.y }, { scale: e.scale }, ...(look.rotate ? [{ rotate: `${look.rotate}deg` }] : []), ...(look.skew ? [{ skewX: `${look.skew}deg` }] : [])],
    };
  });
  const sheenStyle = useAnimatedStyle(() => ({ opacity: after.value > 0 && after.value < 1 ? 0.6 : 0, transform: [{ translateX: -40 + after.value * 200 }, { skewX: '-20deg' }] }));
  const circleStyle = useAnimatedStyle(() => ({ width: `${(reduce ? 1 : after.value) * 100}%` }));
  const emberStyle = useAnimatedStyle(() => ({ opacity: (1 - after.value) * (after.value > 0 ? 1 : 0), transform: [{ translateY: -14 * after.value }] }));
  if (!play) return null;

  const fontFamily = look.font === 'heavy' ? VIVID_HEAVY : look.font === 'serif' ? c.fonts.serif : c.fonts.serifItalic;
  const text: TextStyle = {
    fontFamily,
    fontSize: look.size,
    color: look.color,
    fontVariant: ['lining-nums'],
    ...(look.upper && { textTransform: 'uppercase' }),
    ...(look.letterSpacing && { letterSpacing: look.letterSpacing }),
    ...(look.textGlow && { textShadowColor: look.textGlow, textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }),
    // Gym leans the badge; its letters stand up straight.
    ...(look.skew && { transform: [{ skewX: `${-look.skew}deg` }] }),
  };
  // Many display fonts draw a tiny ×, so it always comes from the app's own face. It is
  // its own piece rather than nested text: a gradient clipped to the letters skips nested text on the web.
  const piece = (children: ReactNode, extra?: TextStyle) =>
    look.gradient ? (
      <GradientText style={[text, extra]} colors={{ c1: look.gradient[0], c2: look.gradient[1] }} glow={look.textGlow}>
        {children}
      </GradientText>
    ) : (
      <Text style={[text, extra]}>{children}</Text>
    );
  const label = (
    <View style={s.comboWords}>
      {piece('×', { fontFamily: VIVID_HEAVY })}
      {piece(`${count}${t(look.suffix ?? N(' combo'))}`)}
    </View>
  );
  const pill: ViewStyle = look.fill
    ? {
        borderRadius: look.radius,
        backgroundColor: look.fill,
        ...(look.fillImage && ({ backgroundImage: look.fillImage } as ViewStyle)),
        ...(look.border && { borderWidth: look.border.width, borderColor: look.border.color }),
        ...(look.shadow && !look.borderGradient && { boxShadow: look.shadow }),
        paddingHorizontal: 14,
        paddingVertical: 3,
        overflow: 'hidden',
      }
    : { paddingHorizontal: 12, paddingVertical: 6 };
  const body = (
    <View style={[pill, s.comboRow]}>
      {look.icon && <ComboIconArt icon={look.icon} color={look.iconColor ?? look.color} />}
      {label}
      {(look.icon === 'bubbles' || look.icon === 'moon') && <ComboIconArt icon={look.icon === 'moon' ? 'star' : 'bubbles'} color={look.iconColor ?? look.color} />}
      {look.sheen && <Animated.View style={[s.sheen, sheenStyle]} pointerEvents="none" />}
      {look.circle && (
        // Drawn round the words from left to right, like a pen.
        <View style={s.circleWrap} pointerEvents="none" onLayout={(e) => setCircle({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <Animated.View style={[s.circleReveal, circleStyle]}>
            {circle.w > 0 && (
              <Svg width={circle.w} height={circle.h} viewBox="0 0 100 40" preserveAspectRatio="none">
                <Path d="M8 22 C6 8 40 3 62 5 C86 7 97 14 94 24 C90 35 50 38 28 35 C12 33 4 27 12 15" fill="none" stroke={look.circle} strokeWidth={2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </Svg>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
  return (
    <Animated.View style={[s.combo, place, style]} pointerEvents="none" accessibilityLiveRegion="polite" accessibilityLabel={t('{n} times combo', { n: count })}>
      {look.borderGradient ? (
        // A gradient border: the gradient behind, the fill on top, one pixel in.
        <View style={{ borderRadius: look.radius, padding: 1, backgroundColor: look.borderGradient[1], backgroundImage: `linear-gradient(90deg, ${look.borderGradient[0]}, ${look.borderGradient[1]})`, ...(look.shadow && { boxShadow: look.shadow }) } as ViewStyle}>
          {body}
        </View>
      ) : (
        body
      )}
      {look.icon === 'embers' && !reduce && (
        <>
          <Animated.View style={[s.ember, { left: '30%', backgroundColor: look.iconColor }, emberStyle]} />
          <Animated.View style={[s.ember, { left: '66%', backgroundColor: look.iconColor }, emberStyle]} />
        </>
      )}
    </Animated.View>
  );
}

/** The small picture before (and for some themes after) the combo text. */
function ComboIconArt({ icon, color }: { icon: ComboIcon; color: string }) {
  const size = 12;
  switch (icon) {
    case 'star':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill={color} />
        </Svg>
      );
    case 'leaf':
      return (
        <Svg width={size + 2} height={size + 2} viewBox="0 0 24 24">
          <Path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15m0 0 7-7" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'bubbles':
      return (
        <Svg width={8} height={size} viewBox="0 0 8 12">
          <Circle cx={4} cy={8} r={2.4} fill="none" stroke={color} strokeWidth={1.2} />
          <Circle cx={5.5} cy={2.5} r={1.4} fill="none" stroke={color} strokeWidth={1} />
        </Svg>
      );
    case 'sun':
      return (
        <Svg width={size + 2} height={size - 2} viewBox="0 0 24 16">
          <Path d="M3 15a9 9 0 0 1 18 0z" fill={color} />
          <Path d="M12 1v3M3.5 5.5l2 2M20.5 5.5l-2 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'bolt':
      return (
        <Svg width={size - 2} height={size + 2} viewBox="0 0 12 18">
          <Path d="M7 0 1 10h4l-1 8 7-11H7l1-7z" fill={color} />
        </Svg>
      );
    case 'peak':
      return (
        <Svg width={size + 2} height={size - 2} viewBox="0 0 24 16">
          <Path d="M1 15 9 4l4 5 3-3 7 9z" fill={color} />
        </Svg>
      );
    case 'moon':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M20 15A9 9 0 1 1 9 4a7 7 0 0 0 11 11z" fill={color} />
        </Svg>
      );
    case 'coin':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={10} fill={color} />
          <Circle cx={12} cy={12} r={6.5} fill="none" stroke="#1f1530" strokeWidth={1.5} opacity={0.5} />
        </Svg>
      );
    case 'embers':
      return null;
  }
}

const makeStyles = themed((c) => ({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { ...card(c), backgroundColor: c.bg, width: '100%', maxWidth: 360, alignItems: 'center', gap: 10, padding: 24, borderRadius: 24 },
  eyebrow: { ...eyebrow(c, 12), color: c.muted },
  emblem: { height: 96, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONTS.serif, fontSize: 32, lineHeight: 38, textAlign: 'center' },
  body: { color: c.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  small: { fontSize: 12, marginTop: 4 },
  combo: { position: 'absolute', top: 6, alignSelf: 'center' },
  comboRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 26 },
  comboWords: { flexDirection: 'row', alignItems: 'baseline' },
  sheen: { position: 'absolute', top: -4, bottom: -4, left: 0, width: 14, backgroundColor: '#fff3c4' },
  circleWrap: { position: 'absolute', left: -4, right: -4, top: -2, bottom: -2 },
  circleReveal: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  ember: { position: 'absolute', top: -2, width: 3, height: 3, borderRadius: 2 },
}));
