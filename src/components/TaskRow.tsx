import { Bell, ChevronDown, ChevronUp } from 'lucide-react-native';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import {
  doneThisWeek,
  durationLabel,
  QUICK_TICK_MS,
  repeatLabel,
  secondsUntilTickable,
  taskXp,
  timesPerWeek,
  type GameState,
  type Task,
} from '../game';
import type { CelebrationId } from '../cosmetics';
import { card, FONTS, nativeDriver, themed, useStyles, useTheme, type Palette } from '../theme';
import { FIRE_COLORS } from './Fire';
import { CoinCheck, HoloBorder } from './Fortuna';
import { stepStatus } from '../steps';
import { taskCategory } from '../library';
import { brandLine, categoryLook, midColor, MYTHIC } from '../vivid';
import { FinishFx, useThemeFx } from './ThemeFx';
import { fill, GradientText, Sticker } from './Vivid';

/** The tick celebration the player has equipped. */
export const CelebrationContext = createContext<CelebrationId>('classic');

/**
 * One task, as a numbered line. Completing it pops the check, sends a ring
 * and a burst out of it (sparks, or the celebration look the player equipped), flashes the row and lets a big "+XP"
 * figure bounce in, hang for a moment and rise away. When a limit cut the
 * XP, a short note shows instead.
 * A freshly added task counts down until it may be ticked.
 */
export function TaskRow({
  index,
  task,
  state,
  today,
  done,
  onToggle,
  onStep,
  onDelete,
  leaving = false,
  onLeft,
}: {
  /** Position in today's list, shown as 01, 02 … */
  index: number;
  task: Task;
  state: GameState;
  today: string;
  /** Returns the XP gained (0 when unticked) and a note when a limit applied. */
  onToggle: () => { xp: number; note?: string };
  done: boolean;
  /** Ticks or unticks a step; `finished` when it was the last one and completed the task. */
  onStep: (step: number) => { xp: number; finished: boolean; note?: string };
  onDelete: () => void;
  /** Just finished: plays the theme's finish animation, then `onLeft` drops it from the list. */
  leaving?: boolean;
  onLeft?: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const look = useContext(CelebrationContext);
  const fx = useThemeFx();
  const particles = useMemo(() => particlesFor(look, c), [look, c]);
  // The task's category colours: the edge, the check outline and the filled check.
  const cat = useMemo(() => categoryLook(taskCategory(task)), [task.title, task.category]);
  const catLine = midColor(cat);
  const pop = useRef(new Animated.Value(1)).current;
  // The Fortuna coin flips over when it turns gold.
  const flip = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const [label, setLabel] = useState<{ text: string; warn: boolean; small?: boolean } | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const steps = stepStatus(state, task, today);
  const hasSteps = steps.titles.length > 0;
  const [waitLeft, setWaitLeft] = useState(() => secondsUntilTickable(task, Date.now()));
  const waitSeconds = QUICK_TICK_MS / 1000;

  useEffect(() => {
    if (secondsUntilTickable(task, Date.now()) === 0) return;
    const timer = setInterval(() => {
      const left = secondsUntilTickable(task, Date.now());
      setWaitLeft(left);
      if (left === 0) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [task.createdAt]);
  const perWeek = timesPerWeek(task);
  const weekly = perWeek > 0 && perWeek < 7 ? ` · ${doneThisWeek(state, task, today)}/${perWeek} this week` : '';

  function press() {
    if (!done && waitLeft > 0) {
      setLabel({ text: `New tasks can be ticked ${waitSeconds} s after adding`, warn: true });
      animate(false);
      return;
    }
    const wasDone = done;
    const { xp, note } = onToggle();
    if (wasDone) return;
    setLabel(xp > 0 ? { text: `+${xp} XP`, warn: false } : { text: note ?? '+0 XP', warn: true });
    if (xp > 0) celebrate();
    if (c.check === 'coin') {
      flip.setValue(0);
      Animated.timing(flip, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
    }
    animate(xp > 0);
  }

  function pressStep(i: number) {
    if (waitLeft > 0) {
      setLabel({ text: `New tasks can be ticked ${waitSeconds} s after adding`, warn: true });
      animate(false);
      return;
    }
    const wasDone = steps.done[i];
    const { xp, finished, note } = onStep(i);
    if (wasDone) return;
    if (finished) {
      setLabel(xp > 0 ? { text: `+${xp} XP`, warn: false } : { text: note ?? '+0 XP', warn: true });
      if (xp > 0) celebrate();
      if (c.check === 'coin') {
        flip.setValue(0);
        Animated.timing(flip, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
      }
      animate(xp > 0);
      return;
    }
    if (xp > 0) {
      setLabel({ text: `+${xp} XP`, warn: false, small: true });
      animate(true);
    }
  }

  function celebrate() {
    ring.setValue(0);
    burst.setValue(0);
    flash.setValue(0);
    Animated.parallel([
      Animated.timing(ring, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
      Animated.timing(burst, { toValue: 1, duration: particles.duration, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: nativeDriver }),
        Animated.timing(flash, { toValue: 0, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
      ]),
    ]).start();
  }

  function animate(success: boolean) {
    float.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pop, { toValue: 0.6, duration: 0, useNativeDriver: nativeDriver }),
        Animated.timing(pop, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(1.6)), useNativeDriver: nativeDriver }),
      ]),
      // Linear, so the bounce, the pause and the rise below keep their timing.
      Animated.timing(float, { toValue: 1, duration: success ? 2400 : 1800, easing: Easing.linear, useNativeDriver: nativeDriver }),
    ]).start(({ finished }) => finished && setLabel(null));
  }

  const floatStyle = label?.warn
    ? {
        opacity: float.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ translateY: float.interpolate({ inputRange: [0, 0.2, 1], outputRange: [6, -2, -22] }) }],
      }
    : {
        // Bounces in big, settles, hangs for about a second, then rises and fades.
        opacity: float.interpolate({ inputRange: [0, 0.06, 0.72, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: float.interpolate({ inputRange: [0, 0.12, 0.65, 1], outputRange: [12, -4, -8, -40] }) },
          { scale: float.interpolate({ inputRange: [0, 0.1, 0.18, 1], outputRange: [0.3, 1.35, 1, 1] }) },
        ],
      };
  const flashStyle = { opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) };
  const rotate = c.check === 'diamond' ? [{ rotate: '45deg' }] : [];
  const ringStyle = {
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
    // Inline transforms replace the stylesheet's, so the diamond's rotation is repeated here.
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }, ...rotate],
  };
  const locked = waitLeft > 0 && !done;

  const row = (
    <View style={[s.row, label && !c.holo && { zIndex: 2 }]}>
      <Animated.View style={[s.flash, flashStyle]} pointerEvents="none" />
      <View style={[s.edge, fill(cat, 180)]} pointerEvents="none" />
      <View style={s.top}>
      <Pressable onPress={press} style={s.main} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
        <Sticker grad={cat} glyph={cat.glyph} size={26} flat />
        <View style={{ flex: 1 }}>
          <Text style={[s.title, done && s.titleDone]}>{task.title}</Text>
          {locked ? (
            <Text style={[s.meta, s.wait]}>
              Wait {waitLeft} more {waitLeft === 1 ? 'second' : 'seconds'}
            </Text>
          ) : (
            <View style={s.metaRow}>
              <Text style={s.meta}>
                {task.minutes ? `${durationLabel(task.minutes)} · ` : ''}
                {repeatLabel(task)}
                {weekly}
              </Text>
              {task.reminder && (
                <View style={s.reminder} accessibilityLabel={`Reminder at ${task.reminder}`}>
                  <Bell size={12} color={c.faint} strokeWidth={1.5} aria-hidden />
                  <Text style={[s.meta, { marginTop: 0 }]}>{task.reminder}</Text>
                </View>
              )}
            </View>
          )}
          {hasSteps && !done && !locked && (
            <Pressable
              onPress={() => setStepsOpen((o) => !o)}
              hitSlop={6}
              style={s.stepStrip}
              accessibilityRole="button"
              accessibilityState={{ expanded: stepsOpen }}
              accessibilityLabel={`${steps.doneCount} of ${steps.titles.length} steps done. ${stepsOpen ? 'Hide' : 'Show'} steps`}
            >
              <View style={s.stepBars}>
                {steps.done.map((d, i) => (
                  <View key={i} style={[s.stepBar, d && fill(cat, 90)]} />
                ))}
              </View>
              <Text style={s.stepCount}>
                {steps.doneCount}/{steps.titles.length} steps
              </Text>
              {stepsOpen ? <ChevronUp size={14} color={c.muted} strokeWidth={1.75} aria-hidden /> : <ChevronDown size={14} color={c.muted} strokeWidth={1.75} aria-hidden />}
            </Pressable>
          )}
        </View>
        <Text style={s.xp}>+{taskXp(task)}</Text>
        <View style={s.checkWrap}>
          <Animated.View style={[s.ring, ringStyle]} pointerEvents="none" />
          {particles.list.map((p, i) => (
            <Animated.View
              key={`${look}-${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: p.w,
                height: p.h,
                borderRadius: p.round ? p.w / 2 : 0,
                backgroundColor: p.color,
                ...(p.glow && { boxShadow: `0px 0px 6px ${p.color}` }),
                opacity: burst.interpolate({ inputRange: [0, 0.12, p.fadeFrom, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: burst.interpolate({ inputRange: [0, 0.5, 1], outputRange: [p.x[0], p.x[1], p.x[2]] }) },
                  { translateY: burst.interpolate({ inputRange: [0, 0.5, 1], outputRange: [p.y[0], p.y[1], p.y[2]] }) },
                  { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [p.scale[0], p.scale[1]] }) },
                  { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: [`${p.spin[0]}deg`, `${p.spin[1]}deg`] }) },
                ],
              }}
            />
          ))}
          {c.check === 'coin' ? (
            <Animated.View
              style={[
                locked && s.checkboxLocked,
                {
                  transform: [
                    { perspective: 400 },
                    { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                    { scale: flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.25, 1] }) },
                  ],
                },
              ]}
            >
              <CoinCheck done={done} size={30} />
            </Animated.View>
          ) : (
            <Animated.View
              style={[s.checkbox, { borderColor: catLine }, done && { ...fill(cat), borderColor: 'transparent' }, locked && s.checkboxLocked, { transform: [{ scale: pop }, ...rotate] }]}
            >
              {done && <Text style={[s.checkmark, { color: cat.ink }, c.check === 'diamond' && s.checkmarkDiamond]}>✓</Text>}
            </Animated.View>
          )}
        </View>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={10} style={s.deleteWrap} accessibilityLabel={`Delete ${task.title}`}>
        <Text style={s.delete}>✕</Text>
      </Pressable>
      </View>
      {hasSteps && stepsOpen && !done && !locked && (
        <View style={s.steps}>
          {steps.titles.map((title, i) => {
            const last = i === steps.titles.length - 1;
            return (
              <Pressable
                key={i}
                onPress={() => pressStep(i)}
                style={s.step}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: steps.done[i] }}
                accessibilityLabel={`${title}${last ? ', finishes the task' : ''}`}
              >
                {c.check === 'coin' ? (
                  <CoinCheck done={steps.done[i]} size={18} />
                ) : (
                  <View style={[s.stepCheck, { borderColor: catLine }, steps.done[i] && { ...fill(cat), borderColor: 'transparent' }]}>
                    {steps.done[i] && <Text style={[s.stepTick, { color: cat.ink }]}>✓</Text>}
                  </View>
                )}
                <Text style={[s.stepTitle, steps.done[i] && s.stepTitleDone]}>{title}</Text>
                {!steps.done[i] && <Text style={[s.stepXp, last && s.stepXpLast]}>{last ? 'Finish' : `+${steps.xpEach} XP`}</Text>}
              </Pressable>
            );
          })}
        </View>
      )}
      {label &&
        (label.warn ? (
          <Animated.Text style={[s.float, s.floatWarn, floatStyle]} pointerEvents="none">
            {label.text}
          </Animated.Text>
        ) : (
          <Animated.View style={[s.floatBox, floatStyle]} pointerEvents="none">
            <GradientText style={[s.floatText, label.small && s.floatSmall]}>{label.text}</GradientText>
          </Animated.View>
        ))}
    </View>
  );
  // Fortuna draws a drifting holo border around each card.
  return (
    <FinishFx kind={fx.finish} ms={fx.finishMs} leaving={leaving} onDone={() => onLeft?.()}>
      {c.holo ? (
        <HoloBorder radius={c.radius} style={[{ marginBottom: 10 }, label && { zIndex: 2 }]}>
          {row}
        </HoloBorder>
      ) : (
        row
      )}
    </FinishFx>
  );
}

interface Particle {
  w: number;
  h: number;
  round?: boolean;
  color: string;
  /** Positions at the start, middle and end of the burst. */
  x: [number, number, number];
  y: [number, number, number];
  scale: [number, number];
  spin: [number, number];
  /** Point of the burst (0-1) from which it fades out. */
  fadeFrom: number;
  /** A soft glow in its own colour. */
  glow?: boolean;
}

/** The pieces that fly out of the check for each celebration look. */
function particlesFor(look: CelebrationId, c: Palette): { duration: number; list: Particle[] } {
  const around = (n: number, i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const fire = FIRE_COLORS[c.dark ? 'dark' : 'light'];
  switch (look) {
    case 'confetti': {
      const colors = [c.accent, fire[1], fire[2], fire[3], c.xp, c.gold];
      return {
        duration: 1100,
        list: Array.from({ length: 14 }, (_, i) => {
          const a = around(14, i);
          const r = 22 + (i % 3) * 7;
          // Out, then drifting down as it falls.
          return {
            w: 6,
            h: 3,
            color: colors[i % colors.length],
            x: [0, Math.cos(a) * r, Math.cos(a) * r * 1.15],
            y: [0, Math.sin(a) * r - 6, Math.sin(a) * r + 14],
            scale: [1, 0.9],
            spin: [0, (i % 2 ? 1 : -1) * (180 + i * 25)],
            fadeFrom: 0.6,
          };
        }),
      };
    }
    case 'ink':
      return {
        duration: 1300,
        list: Array.from({ length: 7 }, (_, i) => {
          const a = around(7, i) + 0.3;
          const r = 16 + (i % 2) * 8;
          return {
            w: 9 - (i % 3) * 2,
            h: 9 - (i % 3) * 2,
            round: true,
            color: i % 2 ? c.accent : c.muted,
            x: [0, Math.cos(a) * r * 0.8, Math.cos(a) * r],
            y: [0, Math.sin(a) * r * 0.8, Math.sin(a) * r],
            scale: [0.4, 1.6],
            spin: [0, 0],
            fadeFrom: 0.45,
          };
        }),
      };
    case 'embers':
      return {
        duration: 1400,
        list: Array.from({ length: 9 }, (_, i) => {
          const dx = (i - 4) * 5;
          return {
            w: i % 3 ? 3 : 4,
            h: i % 3 ? 3 : 4,
            round: true,
            color: fire[1 + (i % 2)],
            x: [0, dx * 0.8, dx + (i % 2 ? 6 : -6)],
            y: [4, -18 - (i % 4) * 5, -38 - (i % 4) * 7],
            scale: [1, 0.5],
            spin: [0, 0],
            fadeFrom: 0.55,
          };
        }),
      };
    case 'starfall':
      return {
        duration: 1200,
        list: Array.from({ length: 7 }, (_, i) => {
          const dx = (i - 3) * 11;
          // Each from its own height, falling and shrinking as it twinkles out.
          const top = -26 - ((i * 5) % 4) * 9;
          return {
            w: i % 2 ? 4 : 6,
            h: i % 2 ? 4 : 6,
            color: i % 2 ? c.xp : c.gold,
            x: [dx * 0.6, dx * 0.85, dx],
            y: [top, top + 26, top + 48],
            scale: [1.2, 0.3],
            spin: [45, 225],
            fadeFrom: 0.45,
          };
        }),
      };
    default:
      // Rainbow sparks bursting out of the check (rewards spec).
      return {
        duration: 850,
        list: Array.from({ length: 12 }, (_, i) => {
          const a = around(12, i);
          const r = i % 2 ? 28 : 38;
          const size = 6 + (i % 4);
          return {
            w: size,
            h: size,
            round: i % 3 === 0,
            color: MYTHIC[i % MYTHIC.length],
            glow: true,
            x: [0, Math.cos(a) * r * 0.55, Math.cos(a) * r],
            y: [0, Math.sin(a) * r * 0.55, Math.sin(a) * r],
            scale: [1, 0.6],
            spin: [45, 135],
            fadeFrom: 0.35,
          };
        }),
      };
  }
}

const makeStyles = themed((c) => ({
  row:
    c.listStyle === 'cards'
      ? { ...card(c), paddingHorizontal: 14, marginBottom: c.holo ? 0 : 10, overflow: 'visible', ...(c.holo && { borderWidth: 0 }) }
      : { borderBottomWidth: 1, borderBottomColor: c.border, paddingLeft: 12 },
  /** The 3 px category edge on the left. */
  edge:
    c.listStyle === 'cards'
      ? { position: 'absolute', left: -1, top: 10, bottom: 10, width: 3, borderRadius: 2 }
      : { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
  top: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  title: { color: c.text, fontSize: 16, fontWeight: '600' },
  titleDone: { color: c.faint, textDecorationLine: 'line-through', textDecorationColor: c.accent },
  meta: { color: c.faint, fontSize: 13, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  wait: { color: c.flame, fontWeight: '600' },
  xp: { color: brandLine(c.dark), fontFamily: 'Vivid_800ExtraBold', fontSize: 14, fontVariant: ['tabular-nums'] },
  checkWrap: { width: c.check === 'coin' ? 30 : 24, height: c.check === 'coin' ? 30 : 24, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: c.check === 'circle' || c.check === 'coin' ? 24 : c.check === 'square' ? Math.min(c.radius * 2, 12) : 4,
    borderWidth: 2,
    borderColor: brandLine(c.dark),
  },
  checkbox: {
    width: c.check === 'diamond' ? 20 : 24,
    height: c.check === 'diamond' ? 20 : 24,
    borderRadius: c.check === 'circle' ? 12 : c.check === 'square' ? Math.min(c.radius, 6) : 2,
    borderWidth: 1.5,
    borderColor: c.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLocked: { borderStyle: 'dashed', opacity: 0.6 },
  checkmark: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  /** Turns the tick upright again inside the rotated diamond. */
  checkmarkDiamond: { transform: [{ rotate: '-45deg' }] },
  deleteWrap: { paddingLeft: 14, paddingVertical: 10 },
  delete: { color: c.faint, fontSize: 13 },
  flash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: c.accentSoft,
    borderRadius: c.listStyle === 'cards' ? c.radius : 0,
  },
  floatBox: { position: 'absolute', right: 64, top: 2 },
  float: { position: 'absolute', right: 64, top: 2 },
  floatText: { fontFamily: 'Vivid_800ExtraBold', fontSize: 28 },
  floatSmall: { fontSize: 19 },
  stepStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, alignSelf: 'flex-start' },
  stepBars: { flexDirection: 'row', gap: 3 },
  stepBar: { width: 14, height: 4, borderRadius: 2, backgroundColor: c.border },
  stepCount: { color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  steps: { paddingLeft: 36, paddingBottom: 10, gap: 2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  stepCheck: {
    width: 18,
    height: 18,
    borderRadius: c.check === 'square' ? Math.min(c.radius, 4) : 9,
    borderWidth: 1.5,
    borderColor: c.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTick: { color: '#FFFFFF', fontWeight: '800', fontSize: 10 },
  stepTitle: { flex: 1, color: c.text, fontSize: 14 },
  stepTitleDone: { color: c.faint, textDecorationLine: 'line-through' },
  stepXp: { color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  stepXpLast: { color: c.accent, fontWeight: '700' },
  floatWarn: { fontFamily: FONTS.bodySemiBold, color: c.flame, fontSize: 13, right: 0, top: 8, textShadowRadius: 0 },
}));
