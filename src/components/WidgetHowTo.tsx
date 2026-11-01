import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { keyframes } from './fx/hooks';
import { N, t } from '../i18n';
import { themed, useStyles } from '../theme';
import { Bizzy } from './Bizzy';
import { useReduceMotion } from './FireAura';
import { VividButton } from './Vivid';
import { pinWidget } from '../widget';

const LOOP_MS = 7000;
const W = 150;
const H = 200;
/** The four parts of the loop, as shares of it: hold, Widgets, pick Succedo, drop it. */
const PHASES = [0, 0.25, 0.5, 0.75];

/**
 * How to add the home screen widget, as a little looping phone: a finger
 * holds an empty spot, taps Widgets, picks Succedo and drags Bizzy's widget
 * onto the home screen. A caption under it names each step.
 */
export function WidgetHowTo() {
  const s = useStyles(makeStyles);
  const reduce = useReduceMotion();
  const p = useSharedValue(reduce ? 0.95 : 0);
  useEffect(() => {
    if (reduce) return;
    p.value = withRepeat(withTiming(1, { duration: LOOP_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [reduce]);

  // The finger: holds, moves to Widgets, to Succedo, then drags up onto the home screen.
  const finger = useAnimatedStyle(() => {
    const v = p.value;
    const x = keyframes(v, [0, 0.2, 0.3, 0.45, 0.55, 0.7, 0.78, 0.92, 1], [W * 0.5, W * 0.5, W * 0.3, W * 0.3, W * 0.5, W * 0.5, W * 0.5, W * 0.5, W * 0.5]);
    const y = keyframes(v, [0, 0.2, 0.3, 0.45, 0.55, 0.7, 0.78, 0.92, 1], [H * 0.55, H * 0.55, H * 0.83, H * 0.83, H * 0.55, H * 0.55, H * 0.55, H * 0.3, H * 0.3]);
    const press = keyframes(v, [0, 0.04, 0.2, 0.22, 0.36, 0.4, 0.62, 0.66, 0.92, 0.95], [0, 1, 1, 0, 0, 1, 1, 1, 1, 0]);
    return { opacity: keyframes(v, [0, 0.02, 0.95, 0.99], [0, 1, 1, 0]), transform: [{ translateX: x - 14 }, { translateY: y - 14 }, { scale: 1 - 0.18 * press }] };
  });
  const menu = useAnimatedStyle(() => ({ opacity: keyframes(p.value, [0, 0.2, 0.24, 0.42, 0.46], [0, 0, 1, 1, 0]) }));
  const list = useAnimatedStyle(() => ({ opacity: keyframes(p.value, [0, 0.44, 0.48, 0.7, 0.74], [0, 0, 1, 1, 0]) }));
  const widget = useAnimatedStyle(() => {
    const v = p.value;
    // Picked up with the finger at 0.66, carried up, then sits on the home screen.
    const y = keyframes(v, [0, 0.66, 0.78, 0.92, 1], [H * 0.55, H * 0.55, H * 0.55, H * 0.3, H * 0.3]);
    return { opacity: keyframes(v, [0, 0.64, 0.68, 0.97, 1], [0, 0, 1, 1, 0]), transform: [{ translateY: y - 26 }, { scale: keyframes(v, [0, 0.66, 0.72, 0.9, 0.94], [1, 1, 1.06, 1.06, 1]) }] };
  });

  return (
    <View style={s.wrap}>
      <View style={s.phone} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={s.icons}>
          {Array.from({ length: 8 }, (_, i) => (
            <View key={i} style={[s.app, { backgroundColor: ['#5AC8FF', '#FF7A59', '#7BE07B', '#B58CFF'][i % 4] }]} />
          ))}
        </View>
        <Animated.View style={[s.menu, menu]}>
          <Text style={s.menuItem}>{t('Wallpaper')}</Text>
          <Text style={[s.menuItem, s.menuOn]}>{t('Widgets')}</Text>
          <Text style={s.menuItem}>{t('Settings')}</Text>
        </Animated.View>
        <Animated.View style={[s.list, list]}>
          <Text style={s.listHead}>{t('Widgets')}</Text>
          <View style={s.listRow}>
            <Text style={s.listName}>{t('Clock')}</Text>
          </View>
          <View style={[s.listRow, s.listOn]}>
            <Bizzy size={22} motion="none" flap={false} />
            <Text style={s.listName}>Succedo</Text>
          </View>
        </Animated.View>
        <Animated.View style={[s.widget, widget]}>
          <Bizzy size={34} motion="none" flap={false} />
          <View>
            <Text style={s.widgetBig}>{t('3 tasks left')}</Text>
            <Text style={s.widgetSmall}>{t('12-day streak')}</Text>
          </View>
        </Animated.View>
        <Animated.View style={[s.finger, finger]} />
      </View>
      <Captions p={p} />
    </View>
  );
}

/**
 * "Add to home screen": Android shows its own box with the widget and an Add
 * button (asked 2026-11-01). Where the phone can't, it says how by hand.
 */
export function AddWidgetButton() {
  const s = useStyles(makeStyles);
  const [note, setNote] = useState<string>();
  return (
    <View style={s.add}>
      <VividButton
        compact
        label={t('Add to home screen')}
        onPress={async () => {
          const ok = await pinWidget();
          setNote(ok ? t('Tap Add in the box your phone shows.') : t('Your phone can’t add it from here. Hold an empty spot on your home screen, tap Widgets and pick Succedo.'));
        }}
      />
      {note && <Text style={s.addNote}>{note}</Text>}
    </View>
  );
}

const CAPTIONS = [N('1. Hold an empty spot'), N('2. Tap Widgets'), N('3. Find Succedo'), N('4. Drag me onto your screen')];

function Captions({ p }: { p: SharedValue<number> }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.captions}>
      {CAPTIONS.map((text, i) => (
        <Caption key={i} p={p} from={PHASES[i]} to={PHASES[i + 1] ?? 1} text={t(text)} />
      ))}
    </View>
  );
}

function Caption({ p, from, to, text }: { p: SharedValue<number>; from: number; to: number; text: string }) {
  const s = useStyles(makeStyles);
  const style = useAnimatedStyle(() => ({ opacity: p.value >= from && p.value < to ? 1 : 0.35 }));
  return <Animated.Text style={[s.caption, style]}>{text}</Animated.Text>;
}

const makeStyles = themed((c) => ({
  wrap: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 4 },
  phone: { width: W, height: H, borderRadius: 18, borderWidth: 3, borderColor: c.border, backgroundColor: '#20283f', overflow: 'hidden' },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14, paddingTop: 16 },
  app: { width: 22, height: 22, borderRadius: 6, opacity: 0.85 },
  menu: { position: 'absolute', left: 14, right: 14, bottom: 14, backgroundColor: '#F4F6FB', borderRadius: 10, paddingVertical: 4 },
  menuItem: { color: '#30384f', fontSize: 11, paddingHorizontal: 10, paddingVertical: 5 },
  menuOn: { fontWeight: '800', color: '#3557FF' },
  list: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 40, backgroundColor: '#F4F6FB', borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 10, gap: 6 },
  listHead: { color: '#30384f', fontSize: 12, fontWeight: '800' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6, borderRadius: 8, backgroundColor: '#E3E7F2', minHeight: 32 },
  listOn: { borderWidth: 1.5, borderColor: '#3557FF' },
  listName: { color: '#30384f', fontSize: 11, fontWeight: '700' },
  widget: { position: 'absolute', left: 12, right: 12, top: 0, height: 52, borderRadius: 12, backgroundColor: '#141826', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  widgetBig: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  widgetSmall: { color: '#AEB6CF', fontSize: 9 },
  finger: { position: 'absolute', left: 0, top: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 2, borderColor: '#FFFFFF' },
  captions: { flex: 1, gap: 6 },
  add: { gap: 6, alignItems: 'flex-start' },
  addNote: { color: c.muted, fontSize: 13, lineHeight: 18 },
  caption: { color: c.text, fontSize: 13, lineHeight: 17, fontWeight: '600' },
}));
