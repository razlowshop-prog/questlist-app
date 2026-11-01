import { Bell, ChevronDown, ChevronUp, Timer, Trash2 } from 'lucide-react-native';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, Text, View } from 'react-native';
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
import { taskEffort, tonightHour, tooEarlyToTick } from '../estimate';
import { stepStatus } from '../steps';
import { shownTitle, taskCategory } from '../library';
import { quoted, t, tn } from '../i18n';
import { buzz } from '../haptics';
import { brandLine, categoryLook, midColor, MYTHIC } from '../vivid';
import { FinishFx, RowPulse, RowSheen, useThemeFx } from './ThemeFx';
import { fill, GradientText, Sticker } from './Vivid';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** How far a row slides to show Remove. */
const REMOVE_W = 96;
/** Closes the row whose Remove is showing, so only one is open at a time. */
let openRow: (() => void) | null = null;

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
  focusing,
  onFocus,
  coveredBy,
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
  /** The focus timer runs for this task. */
  focusing?: boolean;
  /** Opens the focus timer for this task. */
  onFocus?: () => void;
  /** A bigger task that already includes this one is done (covers.ts): greyed out, can't be ticked. */
  coveredBy?: string;
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

  // Remove sits behind the row: swipe the row left (or hold it) to show it.
  const swipe = useRef(new Animated.Value(0)).current;
  const opened = useRef(false);
  function slide(open: boolean) {
    opened.current = open;
    if (open) {
      if (openRow && openRow !== close) openRow();
      openRow = close;
    } else if (openRow === close) openRow = null;
    Animated.spring(swipe, { toValue: open ? -REMOVE_W : 0, useNativeDriver: nativeDriver, bounciness: 4 }).start();
  }
  const close = useRef(() => slide(false)).current;
  useEffect(() => () => {
    if (openRow === close) openRow = null;
  }, []);
  const pan = useMemo(
    () =>
      PanResponder.create({
        // Only a clearly sideways drag; up and down still scrolls the list.
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_e, g) => {
          const base = opened.current ? -REMOVE_W : 0;
          swipe.setValue(Math.max(-REMOVE_W - 30, Math.min(0, base + g.dx)));
        },
        onPanResponderRelease: (_e, g) => {
          const base = opened.current ? -REMOVE_W : 0;
          slide(base + g.dx < -REMOVE_W / 2 || g.vx < -0.5);
        },
        onPanResponderTerminate: () => slide(opened.current),
      }),
    [],
  );

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
  const weekly = perWeek > 0 && perWeek < 7 ? ` · ${t('{done}/{n} this week', { done: doneThisWeek(state, task, today), n: perWeek })}` : '';
  const name = shownTitle(task.title);
  const coverName = coveredBy && shownTitle(coveredBy);

  function press() {
    if (!done && coveredBy) {
      refuse(t('Already part of {task}', { task: quoted(coverName!) }));
      return;
    }
    if (!done && tooEarlyToTick(task, Date.now())) {
      refuse(t('Tick it off from {h}:00', { h: tonightHour(task)! }));
      return;
    }
    if (!done && waitLeft > 0) {
      refuse(t('New tasks can be ticked {n} s after adding', { n: waitSeconds }));
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
      refuse(t('New tasks can be ticked {n} s after adding', { n: waitSeconds }));
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

  /** A tick that can't happen yet: the reason under the row, a shake and an error buzz. */
  function refuse(text: string) {
    setLabel({ text, warn: true });
    animate(false);
    buzz('blocked');
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
  const covered = !!coveredBy && !done;
  // An evening willpower task before its hour (effort.ts).
  const early = !done && tooEarlyToTick(task, Date.now());

  const row = (
    <View style={[s.row, label && !c.holo && { zIndex: 2 }, covered && s.covered]}>
      {fx.rowPulse && c.listStyle === 'cards' && <RowPulse colors={fx.rowPulse} radius={c.radius} />}
      {fx.rowSheen && c.listStyle === 'cards' && <RowSheen colors={fx.rowSheen} radius={c.radius} fillColor={c.surface} index={index} />}
      <Animated.View style={[s.flash, flashStyle]} pointerEvents="none" />
      <View style={[s.edge, fill(cat, 180)]} pointerEvents="none" />
      <View style={s.top}>
      <Pressable
        onPress={() => (opened.current ? slide(false) : press())}
        onLongPress={() => {
          buzz('tap');
          slide(true);
        }}
        delayLongPress={450}
        style={s.main}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: covered }}
        accessibilityHint={covered ? t('Already covered by {task}', { task: coverName! }) : early ? t('Can be ticked from {h}:00', { h: tonightHour(task)! }) : undefined}
      >
        <Sticker grad={cat} glyph={cat.glyph} size={26} flat />
        <View style={{ flex: 1 }}>
          <Text style={[s.title, done && s.titleDone]}>{name}</Text>
          {covered ? (
            <Text style={s.meta} numberOfLines={2}>
              {t('Covered by {task}', { task: quoted(coverName!) })}
            </Text>
          ) : locked ? (
            <Text style={[s.meta, s.wait]}>
              {tn(waitLeft, 'Wait {n} more second', 'Wait {n} more seconds')}
            </Text>
          ) : (
            <View style={s.metaRow}>
              <Text style={s.meta}>
                {/* A willpower task's time says nothing, so it isn't shown. */}
                {early ? `${t('From {h}:00', { h: tonightHour(task)! })} · ` : task.minutes && taskEffort(task) !== 'willpower' ? `${durationLabel(task.minutes)} · ` : ''}
                {repeatLabel(task)}
                {weekly}
              </Text>
              {onFocus && !done && (
                <Pressable onPress={onFocus} hitSlop={8} style={[s.focus, focusing && s.focusOn]} accessibilityRole="button" accessibilityLabel={focusing ? t('Open the focus timer for {task}', { task: name }) : t('Start a focus timer for {task}', { task: name })}>
                  <Timer size={12} color={focusing ? c.accent : c.muted} strokeWidth={2} aria-hidden />
                  <Text style={[s.focusText, focusing && { color: c.accent }]}>{focusing ? t('Focusing') : t('Focus')}</Text>
                </Pressable>
              )}
              {task.reminder && (
                <View style={s.reminder} accessibilityLabel={t('Reminder at {time}', { time: task.reminder })}>
                  <Bell size={12} color={c.faint} strokeWidth={1.5} aria-hidden />
                  <Text style={[s.meta, { marginTop: 0 }]}>{task.reminder}</Text>
                </View>
              )}
            </View>
          )}
          {hasSteps && !done && !locked && !covered && (
            <Pressable
              onPress={() => setStepsOpen((o) => !o)}
              hitSlop={6}
              style={s.stepStrip}
              accessibilityRole="button"
              accessibilityState={{ expanded: stepsOpen }}
              accessibilityLabel={`${tn(steps.titles.length, '{done} of {n} step done.', '{done} of {n} steps done.', { done: steps.doneCount })} ${stepsOpen ? t('Hide steps') : t('Show steps')}`}
            >
              <View style={s.stepBars}>
                {steps.done.map((d, i) => (
                  <View key={i} style={[s.stepBar, d && fill(cat, 90)]} />
                ))}
              </View>
              <Text style={s.stepCount}>
                {t('{done}/{n} steps', { done: steps.doneCount, n: steps.titles.length })}
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
                (locked || early) && s.checkboxLocked,
                {
                  transform: [
                    { perspective: 400 },
                    { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                    { scale: flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.25, 1] }) },
                  ],
                },
              ]}
            >
              <CoinCheck done={done} size={38} />
            </Animated.View>
          ) : c.check === 'hex' ? (
            <Animated.View style={[s.hexBox, (locked || covered || early) && { opacity: 0.6 }, { transform: [{ scale: pop }] }]}>
              <HexCheck size={38} line={catLine} grad={cat} done={done} dashed={locked || covered || early} />
              {done && <Text style={[s.checkmark, { color: cat.ink }]}>✓</Text>}
            </Animated.View>
          ) : (
            <Animated.View
              style={[s.checkbox, { borderColor: catLine }, done && { ...fill(cat), borderColor: 'transparent' }, (locked || covered || early) && s.checkboxLocked, { transform: [{ scale: pop }, ...rotate] }]}
            >
              {done && <Text style={[s.checkmark, { color: cat.ink }, c.check === 'diamond' && s.checkmarkDiamond]}>✓</Text>}
            </Animated.View>
          )}
        </View>
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
                accessibilityLabel={last ? t('{step}, finishes the task', { step: title }) : title}
              >
                {c.check === 'coin' ? (
                  <CoinCheck done={steps.done[i]} size={18} />
                ) : c.check === 'hex' ? (
                  <View style={s.hexStep}>
                    <HexCheck size={20} line={catLine} grad={cat} done={steps.done[i]} />
                    {steps.done[i] && <Text style={[s.stepTick, { color: cat.ink }]}>✓</Text>}
                  </View>
                ) : (
                  <View style={[s.stepCheck, { borderColor: catLine }, steps.done[i] && { ...fill(cat), borderColor: 'transparent' }]}>
                    {steps.done[i] && <Text style={[s.stepTick, { color: cat.ink }]}>✓</Text>}
                  </View>
                )}
                <Text style={[s.stepTitle, steps.done[i] && s.stepTitleDone]}>{title}</Text>
                {!steps.done[i] && <Text style={[s.stepXp, last && s.stepXpLast]}>{last ? t('Finish') : `+${steps.xpEach} XP`}</Text>}
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
      <View style={label && { zIndex: 2 }}>
        <Animated.View style={[s.removeWrap, { opacity: swipe.interpolate({ inputRange: [-REMOVE_W, -16, 0], outputRange: [1, 0, 0] }) }]}>
          <Pressable
            onPress={() => {
              slide(false);
              onDelete();
            }}
            style={s.remove}
            accessibilityRole="button"
            accessibilityLabel={t('Delete {task}', { task: name })}
          >
            <Trash2 size={18} color="#2A0A12" strokeWidth={2} aria-hidden />
            <Text style={s.removeText}>{t('Remove')}</Text>
          </Pressable>
        </Animated.View>
        <Animated.View
          {...pan.panHandlers}
          style={{ transform: [{ translateX: swipe }] }}
          accessibilityActions={[{ name: 'delete', label: t('Remove') }]}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
        >
          {c.holo ? (
            <HoloBorder radius={c.radius} style={[{ marginBottom: 10 }, label && { zIndex: 2 }]}>
              {row}
            </HoloBorder>
          ) : (
            row
          )}
        </Animated.View>
      </View>
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
  covered: { opacity: 0.5 },
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
  focus: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, borderWidth: 1, borderColor: c.border },
  focusOn: { borderColor: brandLine(c) },
  focusText: { color: c.muted, fontSize: 11, fontWeight: '700' },
  wait: { color: c.flame, fontWeight: '600' },
  xp: { color: brandLine(c), fontFamily: 'Vivid_800ExtraBold', fontSize: 14, fontVariant: ['tabular-nums'] },
  checkWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: c.check === 'circle' || c.check === 'coin' ? 30 : c.check === 'square' ? Math.min(c.radius * 2, 12) : 4,
    borderWidth: 2,
    borderColor: brandLine(c),
  },
  checkbox: {
    width: c.check === 'diamond' ? 28 : 36,
    height: c.check === 'diamond' ? 28 : 36,
    borderRadius: c.check === 'circle' ? 18 : c.check === 'square' ? Math.min(c.radius, 6) : 2,
    borderWidth: 2,
    borderColor: c.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLocked: { borderStyle: 'dashed', opacity: 0.6 },
  hexBox: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  hexStep: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#FFFFFF', fontWeight: '800', fontSize: 19 },
  /** Turns the tick upright again inside the rotated diamond. */
  checkmarkDiamond: { transform: [{ rotate: '-45deg' }] },
  removeWrap: { position: 'absolute', right: 0, top: 0, bottom: c.listStyle === 'cards' || c.holo ? 10 : 0, width: REMOVE_W + 24, borderRadius: c.listStyle === 'cards' ? c.radius : 0, overflow: 'hidden' },
  remove: { flex: 1, marginLeft: 24, backgroundColor: '#FF6B81', alignItems: 'center', justifyContent: 'center', gap: 2 },
  removeText: { color: '#2A0A12', fontWeight: '800', fontSize: 14 },
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

/** Hive's checkbox: a honeycomb cell, outlined in the category's colour, filled with its gradient once ticked. */
function HexCheck({ size, line, grad, done, dashed }: { size: number; line: string; grad: { c1: string; c2: string }; done: boolean; dashed?: boolean }) {
  // One gradient per category colour pair, so repeats on a page are the same drawing.
  const id = `hex${grad.c1}${grad.c2}`.replace(/#/g, '');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={grad.c1} />
          <Stop offset="1" stopColor={grad.c2} />
        </LinearGradient>
      </Defs>
      <Path
        d="M7 2.8 H17 L21.8 12 L17 21.2 H7 L2.2 12Z"
        fill={done ? `url(#${id})` : 'none'}
        stroke={done ? 'none' : line}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeDasharray={dashed ? '3 2.2' : undefined}
      />
    </Svg>
  );
}
