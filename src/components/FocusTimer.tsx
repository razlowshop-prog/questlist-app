import { ChevronDown, Pause, Play, Timer } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { clockLabel, focusBonusFor, focusElapsed, focusGoalMinutes, MAX_FOCUS_MINUTES, MIN_FOCUS_MINUTES, type FocusSession } from '../focus';
import type { Task } from '../game';
import { card, eyebrow, FONTS, headingCase, themed, useStyles, useTheme } from '../theme';
import { BRAND, brandLine } from '../vivid';
import { Stepper } from './Stepper';
import { brandFill, brandInk, brandTextShadow, useSvgId, VIVID_HEAVY } from './Vivid';

const RING = 240;
const STROKE = 14;

/** Re-renders once a second while the timer runs, so the clock ticks. */
function useNow(running: boolean): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return now;
}

/**
 * The focus timer, full screen: a ring that fills over the set time, the time
 * left, − / + to change the length a minute at a time, and Finish. Finishing
 * after the time is up adds the focus bonus for that length. Hide keeps it
 * running; a bar on Today brings it back.
 */
export function FocusTimer({
  task,
  session,
  visible,
  onPause,
  onResume,
  onGoal,
  onFinish,
  onStop,
  onHide,
}: {
  task: Task;
  session: FocusSession;
  visible: boolean;
  onPause: () => void;
  onResume: () => void;
  /** The length was changed with − / +, in minutes. */
  onGoal: (minutes: number) => void;
  onFinish: () => void;
  onStop: () => void;
  onHide: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const id = useSvgId('focus');
  const paused = !!session.pausedAt;
  const now = useNow(visible && !paused);
  const goalMinutes = focusGoalMinutes(task, session);
  const goal = goalMinutes * 60_000;
  const bonus = focusBonusFor(goalMinutes);
  const elapsed = focusElapsed(session, now);
  const reached = elapsed >= goal;
  const progress = Math.min(1, elapsed / goal);
  const r = (RING - STROKE) / 2;
  const around = 2 * Math.PI * r;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onHide}>
      <SafeAreaView style={s.screen}>
        <View style={s.top}>
          <Pressable onPress={onHide} hitSlop={10} style={s.hide} accessibilityRole="button" accessibilityLabel="Hide the timer. It keeps running">
            <ChevronDown size={22} color={c.muted} strokeWidth={1.75} aria-hidden />
            <Text style={s.hideText}>Hide</Text>
          </Pressable>
        </View>

        <View style={s.middle}>
          <Text style={s.eyebrow}>Focus</Text>
          <Text style={s.title} numberOfLines={2}>
            {task.title}
          </Text>

          <View style={s.ringWrap} accessible accessibilityRole="timer" accessibilityLabel={reached ? 'Time is up' : `${clockLabel(goal - elapsed)} left`}>
            <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Defs>
                <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={BRAND.c1} />
                  <Stop offset="1" stopColor={BRAND.c2} />
                </LinearGradient>
              </Defs>
              <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={c.surfaceAlt} strokeWidth={STROKE} fill="none" />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={r}
                stroke={`url(#${id})`}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${around} ${around}`}
                strokeDashoffset={around * (1 - progress)}
              />
            </Svg>
            <View style={s.ringCenter} pointerEvents="none">
              <Text style={[s.clock, paused && { opacity: 0.5 }]}>{reached ? `+${clockLabel(elapsed - goal)}` : clockLabel(goal - elapsed)}</Text>
              <Text style={s.clockNote}>{paused ? 'Paused' : reached ? 'Time is up' : `of ${clockLabel(goal)}`}</Text>
            </View>
          </View>

          <Stepper
            value={goalMinutes}
            min={MIN_FOCUS_MINUTES}
            max={MAX_FOCUS_MINUTES}
            format={(m) => `${m} min`}
            onChange={onGoal}
            label="of focus"
          />
          <Text style={[s.bonus, reached && s.bonusReady]}>
            {reached ? `Focus bonus ready: +${bonus} XP when you finish` : `Stay with it until the end for +${bonus} XP`}
          </Text>
        </View>

        <View style={s.actions}>
          <Pressable
            onPress={paused ? onResume : onPause}
            style={s.round}
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play size={22} color={c.text} strokeWidth={2} aria-hidden /> : <Pause size={22} color={c.text} strokeWidth={2} aria-hidden />}
          </Pressable>
          <Pressable onPress={onFinish} style={s.finish} accessibilityRole="button">
            <Text style={s.finishText}>Finish task</Text>
          </Pressable>
        </View>
        <Pressable onPress={onStop} hitSlop={8} style={s.stop} accessibilityRole="button">
          <Text style={s.stopText}>Stop the timer</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

/** The slim bar on Today while a hidden timer runs; tap it to open the timer again. */
export function FocusBar({ task, session, onOpen }: { task: Task; session: FocusSession; onOpen: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const paused = !!session.pausedAt;
  const now = useNow(!paused);
  const goal = focusGoalMinutes(task, session) * 60_000;
  const elapsed = focusElapsed(session, now);
  const left = goal - elapsed;
  return (
    <Pressable onPress={onOpen} style={s.bar} accessibilityRole="button" accessibilityLabel={`Focus on ${task.title}, ${left > 0 ? `${clockLabel(left)} left` : 'time is up'}. Open the timer`}>
      <Timer size={18} color={c.accent} strokeWidth={2} aria-hidden />
      <Text style={s.barTitle} numberOfLines={1}>
        {task.title}
      </Text>
      <Text style={s.barClock}>{paused ? 'Paused' : left > 0 ? clockLabel(left) : 'Time is up'}</Text>
    </Pressable>
  );
}

const makeStyles = themed((c) => ({
  screen: { flex: 1, backgroundColor: c.bg, backgroundImage: c.bgImage, padding: 24, paddingTop: 20, paddingBottom: 24 },
  top: { flexDirection: 'row' },
  hide: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hideText: { color: c.muted, fontSize: 15, fontWeight: '600' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  eyebrow: { ...eyebrow(c, 12), color: c.muted },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 28, lineHeight: 34, textAlign: 'center', maxWidth: 420, ...headingCase(c) },
  ringWrap: { width: RING, height: RING, marginTop: 18, marginBottom: 6, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  clock: { fontFamily: VIVID_HEAVY, color: c.text, fontSize: 52, lineHeight: 60, fontVariant: ['tabular-nums'] },
  clockNote: { color: c.muted, fontSize: 14 },
  bonus: { color: c.muted, fontSize: 14, textAlign: 'center' },
  bonusReady: { color: brandLine(c), fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 420, width: '100%', alignSelf: 'center' },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  finish: { ...brandFill(c), flex: 1, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  finishText: { color: brandInk(c), fontFamily: VIVID_HEAVY, fontSize: 17, ...brandTextShadow(c) },
  stop: { alignSelf: 'center', marginTop: 16 },
  stopText: { color: c.faint, fontSize: 14, fontWeight: '600' },
  bar: { ...card(c), flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderColor: brandLine(c) },
  barTitle: { flex: 1, color: c.text, fontSize: 14, fontWeight: '700' },
  barClock: { color: c.text, fontFamily: VIVID_HEAVY, fontSize: 15, fontVariant: ['tabular-nums'] },
}));
