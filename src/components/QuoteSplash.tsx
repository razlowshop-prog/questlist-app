import { useContext, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { quoted, t } from '../i18n';
import { eyebrow, FONTS, themed, useStyles } from '../theme';
import { restartIntoUpdate, type UpdatePhase } from '../appUpdate';
import { Bizzy, BizzyFormContext } from './Bizzy';
import { LoadingBar } from './LoadingBar';

/** At least the fully grown Bizzy, as in the tour: a larva every morning looked odd. */
const SPLASH_FORM = 5;

/**
 * The quote of the day as the app opens (picked 2026-10-31, design A): Bizzy
 * floats above the quote. It waits for a tap, so there is time to read it
 * (asked 2026-10-31), then fades into the app. Once a day, on the first open.
 * The honey loading bar runs under it first (asked 2026-11-01): taps wait until
 * it's full, and a found update downloads there and restarts the app.
 */
export function QuoteSplash({ quote, update, onDone }: { quote: { text: string; author: string }; update: { phase: UpdatePhase; progress?: number }; onDone: () => void }) {
  const s = useStyles(makeStyles);
  const reduce = useReducedMotion();
  const form = Math.max(useContext(BizzyFormContext), SPLASH_FORM);
  // Fully covering from the first frame: fading in let Today show through for a moment (2026-11-01).
  const shown = useSharedValue(1);
  const rise = useSharedValue(0);
  const hint = useSharedValue(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    rise.value = withDelay(reduce ? 0 : 250, withTiming(1, { duration: reduce ? 150 : 700, easing: Easing.out(Easing.cubic) }));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // "Tap to start" fades in once the bar is full and breathes gently.
    hint.value = reduce ? withTiming(1) : withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.45, { duration: 900 })), -1, true);
  }, [loaded]);

  useEffect(() => {
    if (update.phase !== 'ready') return;
    const id = setTimeout(restartIntoUpdate, 900);
    return () => clearTimeout(id);
  }, [update.phase]);

  function leave() {
    if (!loaded) return;
    shown.value = withTiming(0, { duration: reduce ? 120 : 380 }, (done) => {
      if (done) scheduleOnRN(onDone);
    });
  }

  const wrap = useAnimatedStyle(() => ({ opacity: shown.value }));
  const text = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: 14 * (1 - rise.value) }] }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hint.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.screen, wrap]}>
      <Pressable
        style={s.press}
        onPress={leave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !loaded }}
        accessibilityLabel={`${t('Quote of the day: {quote}, {author}.', { quote: quote.text, author: quote.author })} ${t('Tap to start')}`}
      >
        <BizzyFormContext.Provider value={form}>
          <Bizzy size={112} mood="happy" motion={reduce ? 'none' : 'bob'} />
        </BizzyFormContext.Provider>
        <Animated.View style={[s.body, text]}>
          <Text style={s.eyebrow}>{t('Quote of the day')}</Text>
          <Text style={s.quote}>{quoted(quote.text)}</Text>
          <Text style={s.author}>— {quote.author}</Text>
        </Animated.View>
        <View style={s.footer}>
          {loaded ? <Animated.Text style={[s.hint, hintStyle]}>{t('Tap to start')}</Animated.Text> : <LoadingBar phase={update.phase} download={update.progress} onDone={() => setLoaded(true)} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = themed((c) => ({
  screen: { backgroundColor: c.bg, zIndex: 60 },
  press: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 22 },
  body: { alignItems: 'center', gap: 10, maxWidth: 440 },
  eyebrow: { ...eyebrow(c, 11), color: c.muted },
  quote: { fontFamily: FONTS.serifItalic, color: c.text, fontSize: 24, lineHeight: 32, textAlign: 'center' },
  author: { ...eyebrow(c, 11), color: c.accent, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 48, left: 40, right: 40, alignItems: 'center', minHeight: 44, justifyContent: 'flex-end' },
  hint: { color: c.text, fontSize: 14, fontWeight: '700' },
}));
