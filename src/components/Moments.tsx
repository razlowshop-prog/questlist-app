import * as Haptics from 'expo-haptics';
import { useEffect, type ComponentProps } from 'react';
import { Modal, Platform, Pressable, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { APP_NAME } from '../brand';
import { PERFECT_DAY_XP } from '../moments';
import { card, eyebrow, FONTS, themed, useStyles, useTheme } from '../theme';
import { FLAMES, RARITY } from '../vivid';
import { Fire } from './Fire';
import { ConfettiBurst, Glyph, GradientText, VIVID_HEAVY, VividButton } from './Vivid';

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
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const cardStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.5), transform: [{ scale: 0.7 + 0.3 * pop.value }] }));

  const perfect = moment.kind === 'perfect';
  const title = perfect ? 'Perfect day' : `${moment.days}-day streak`;
  const body = perfect
    ? `Every task for today is done. +${PERFECT_DAY_XP} XP bonus.`
    : moment.days >= 365
      ? 'A whole year, every single day. Legendary.'
      : `You showed up ${moment.days} days in a row. Keep the fire going.`;
  const message = perfect
    ? `Perfect day on ${APP_NAME}: every task done today ✨`
    : `I just hit a ${moment.days}-day streak on ${APP_NAME} 🔥`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView style={s.center} pointerEvents="box-none">
        <ConfettiBurst scale={1.4} />
        <Animated.View style={[s.card, cardStyle]} accessibilityViewIsModal>
          <Text style={s.eyebrow}>{perfect ? 'All done' : 'Streak milestone'}</Text>
          <View style={s.emblem}>
            {perfect ? <Glyph name="Trophy" size={64} grad={RARITY.legendary} /> : <Fire tier={3} size={76} />}
          </View>
          <GradientText style={s.title} colors={perfect ? undefined : FLAMES.ember} glow={perfect ? undefined : FLAMES.ember.c2} glowRadius={14}>
            {title}
          </GradientText>
          <Text style={s.body}>{body}</Text>
          <View style={s.buttons}>
            <VividButton label="Share" kind="secondary" compact onPress={() => Share.share({ message }).catch(() => {})} />
            <VividButton label="Nice!" compact onPress={onClose} />
          </View>
          <Text style={[s.small, { color: c.faint }]}>Tap anywhere to close</Text>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * "×3 combo": pops up for a moment when tasks are ticked in quick
 * succession. Just for fun; it gives no extra XP.
 */
export function ComboPill({ count, play, style: place }: { count: number; play: number; style?: ComponentProps<typeof Animated.View>['style'] }) {
  const s = useStyles(makeStyles);
  const t = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    t.value = 0;
    t.value = withSequence(withSpring(1, { damping: 9, stiffness: 220 }), withDelay(900, withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) })));
    if (Platform.OS !== 'web') Haptics.impactAsync(count >= 4 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [play]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, t.value * 1.4), transform: [{ scale: 0.5 + 0.5 * t.value }, { translateY: 8 * (1 - t.value) }] }));
  if (!play) return null;
  return (
    <Animated.View style={[s.combo, place, style]} pointerEvents="none" accessibilityLiveRegion="polite" accessibilityLabel={`${count} times combo`}>
      <GradientText style={s.comboText} colors={FLAMES.ember} glow={FLAMES.ember.c2} glowRadius={10}>
        ×{count} combo
      </GradientText>
    </Animated.View>
  );
}

const makeStyles = themed((c) => ({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { ...card(c), backgroundColor: c.bg, width: '100%', maxWidth: 360, alignItems: 'center', gap: 10, padding: 24, borderRadius: 24 },
  eyebrow: { ...eyebrow(c, 12), color: c.muted },
  emblem: { height: 96, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONTS.serif, fontSize: 32, lineHeight: 38, textAlign: 'center' },
  body: { color: c.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  small: { fontSize: 12, marginTop: 4 },
  combo: { position: 'absolute', top: 6, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(20,14,30,0.85)', borderWidth: 1, borderColor: 'rgba(255,122,60,0.5)' },
  comboText: { fontFamily: VIVID_HEAVY, fontSize: 15 },
}));
