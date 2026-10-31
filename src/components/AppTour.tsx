import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type HostInstance } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import type { StreakStatus } from '../game';
import { hop, type Pt } from '../flight';
import { t } from '../i18n';
import { card, eyebrow, FONTS, themed, useStyles, useTheme } from '../theme';
import type { TourStep, TourTab } from '../tour';
import { brandLine } from '../vivid';
import { FlyingBizzy, measureIn, useFlyer } from './fx/Flyer';
import { useReduceMotion } from './FireAura';
import { WeekBar } from './LevelDetails';
import { VividButton } from './Vivid';
import { WidgetHowTo } from './WidgetHowTo';

type Box = { x: number; y: number; w: number; h: number };
const PAD = 6;
const BIZZY = 64;

/**
 * The first-time tour: the app dims except for what Bizzy is showing, an
 * arrow bounces at it, and his card explains it. He flies along to each new
 * spot. Next and Back step through; Skip ends it at once.
 */
export function AppTour({
  steps,
  targets,
  streak,
  onTab,
  onDone,
}: {
  steps: TourStep[];
  targets: Map<string, HostInstance | null>;
  streak: StreakStatus;
  onTab: (tab: TourTab) => void;
  /** Finished or skipped. */
  onDone: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const reduce = useReduceMotion();
  const root = useRef<HostInstance>(null);
  const [at, setAt] = useState(0);
  const [room, setRoom] = useState<{ w: number; h: number }>();
  const [hole, setHole] = useState<Box | null>(null);
  const [cardBox, setCardBox] = useState<{ h: number }>({ h: 220 });
  const flyer = useFlyer('wave');
  const fade = useSharedValue(0);
  const bounce = useSharedValue(0);
  const step = steps[at];
  const last = at === steps.length - 1;

  useEffect(() => {
    fade.value = withTiming(1, { duration: 300 });
    bounce.value = withRepeat(withSequence(withTiming(1, { duration: 450, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) })), -1, false);
  }, []);

  // Each step: open its tab, let it draw, then find what it points at.
  useEffect(() => {
    if (!room) return;
    let gone = false;
    if (step.tab) onTab(step.tab);
    setHole(null);
    const id = setTimeout(async () => {
      const box = step.target ? await measureIn(targets.get(step.target) ?? null, root.current) : undefined;
      if (gone) return;
      setHole(box && box.w > 0 ? { x: box.x - PAD, y: box.y - PAD, w: box.w + PAD * 2, h: box.h + PAD * 2 } : null);
    }, 380);
    return () => {
      gone = true;
      clearTimeout(id);
    };
  }, [at, room]);

  // The card sits away from what is shown: below it when it's in the top half, else above.
  const targetMid = hole ? hole.y + hole.h / 2 : undefined;
  const cardTop = !room ? 0 : targetMid === undefined ? Math.max(80, room.h / 2 - cardBox.h / 2) : targetMid < room.h / 2 ? Math.min(room.h - cardBox.h - 24, hole!.y + hole!.h + 56) : Math.max(56, hole!.y - cardBox.h - 56);
  // Bizzy perches on the card's top edge, on the side nearer the target.
  const perch: Pt | undefined = room ? [hole && hole.x + hole.w / 2 < room.w / 2 ? 54 : room.w - 54, cardTop - BIZZY * 0.32] : undefined;

  useEffect(() => {
    if (!perch) return;
    if (reduce || flyer.opacity.value === 0) {
      flyer.place(perch[0], perch[1]);
      return;
    }
    flyer.setMood('happy');
    flyer.fly(hop([flyer.x.value, flyer.y.value], perch, 40), 650).then(() => flyer.setMood(hole ? 'curious' : 'wave'));
  }, [perch?.[0], perch?.[1]]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (hole && cardTop > hole.y ? 1 : -1) * 8 * bounce.value }] }));
  const dim = 'rgba(4,6,14,0.72)';
  const arrowBelow = hole && cardTop > hole.y;

  return (
    <View ref={root} style={[StyleSheet.absoluteFill, { zIndex: 50 }]} onLayout={(e) => setRoom({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} accessibilityViewIsModal>
    <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
      {/* The dim, with a window round what he shows. Touches never reach the app behind. */}
      {hole && room ? (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(0, hole.y), backgroundColor: dim }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: hole.y + hole.h, bottom: 0, backgroundColor: dim }} />
          <View style={{ position: 'absolute', left: 0, width: Math.max(0, hole.x), top: hole.y, height: hole.h, backgroundColor: dim }} />
          <View style={{ position: 'absolute', left: hole.x + hole.w, right: 0, top: hole.y, height: hole.h, backgroundColor: dim }} />
          <View pointerEvents="none" style={[s.ring, { left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderColor: brandLine(c) }]} />
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: hole.x + hole.w / 2 - 14, top: arrowBelow ? hole.y + hole.h + 8 : hole.y - 38 }, arrowStyle]}>
            {arrowBelow ? <ArrowUp size={28} color={brandLine(c)} strokeWidth={3} /> : <ArrowDown size={28} color={brandLine(c)} strokeWidth={3} />}
          </Animated.View>
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: dim }]} />
      )}
      <Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={() => {}} />

      <Pressable onPress={onDone} style={s.skip} hitSlop={8} accessibilityRole="button">
        <Text style={s.skipText}>{t('Skip tour')}</Text>
      </Pressable>

      {room && (
        <View style={[s.card, { top: cardTop }]} onLayout={(e) => setCardBox({ h: e.nativeEvent.layout.height })}>
          <Text style={s.count}>
            {at + 1} / {steps.length}
          </Text>
          <Text style={s.title} accessibilityRole="header">
            {t(step.title)}
          </Text>
          <Text style={s.body}>{t(step.body)}</Text>
          {step.extra === 'tiers' && <WeekBar streak={streak} />}
          {step.extra === 'widget' && <WidgetHowTo />}
          <View style={s.buttons}>
            {at > 0 ? <VividButton label={t('Back')} kind="secondary" compact onPress={() => setAt(at - 1)} /> : <View />}
            <VividButton label={last ? t('Let’s go!') : t('Next')} compact onPress={() => (last ? onDone() : setAt(at + 1))} />
          </View>
        </View>
      )}
      <FlyingBizzy flyer={flyer} size={BIZZY} />
    </Animated.View>
    </View>
  );
}

const makeStyles = themed((c) => ({
  ring: { position: 'absolute', borderWidth: 2, borderRadius: 14 },
  skip: { position: 'absolute', top: 10, left: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', zIndex: 2 },
  skipText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  card: { ...card(c), position: 'absolute', left: 16, right: 16, maxWidth: 480, alignSelf: 'center', backgroundColor: c.bg, padding: 18, paddingTop: 22, gap: 8 },
  count: { ...eyebrow(c, 11), color: c.faint, position: 'absolute', right: 16, top: 12 },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 22, lineHeight: 28 },
  body: { color: c.muted, fontSize: 15, lineHeight: 21 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
}));
