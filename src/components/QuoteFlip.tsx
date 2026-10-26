import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { QuoteSide } from '../game';
import { buzz } from '../haptics';
import { eyebrow, FONTS, headingCase, themed, useStyles, useTheme, type Palette } from '../theme';

function partOfDay(hour: number): string {
  if (hour < 5) return 'evening';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** Until both sides are measured: about one short quote. */
const FIRST_HEIGHT = 104;

/**
 * The top of Today: the quote of the day, which flips over like a calendar
 * page to the greeting and back (design "QuoteA"). The block keeps the height
 * of its taller side, so nothing below it jumps when it turns.
 */
export function QuoteFlip({
  quote,
  name,
  summary,
  side,
  onSide,
}: {
  quote: { text: string; author: string };
  name: string;
  /** One small line under the greeting, e.g. "3 of 8 tasks done". */
  summary?: string;
  side: QuoteSide;
  onSide: (side: QuoteSide) => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const reduce = useReducedMotion();
  const greet = side === 'greet';
  // 0 shows the quote, 1 the greeting. A saved side shows straight away, without turning.
  const turn = useSharedValue(greet ? 1 : 0);
  const [heights, setHeights] = useState({ quote: 0, greet: 0 });
  const height = Math.max(heights.quote, heights.greet) || FIRST_HEIGHT;

  function flip() {
    const next: QuoteSide = greet ? 'quote' : 'greet';
    turn.value = withTiming(next === 'greet' ? 1 : 0, { duration: reduce ? 250 : 600, easing: Easing.bezier(0.4, 0, 0.2, 1) });
    buzz('tap');
    onSide(next);
  }

  // Each face is hidden while it points away; with less motion they crossfade instead.
  const frontStyle = useAnimatedStyle(() =>
    reduce
      ? { opacity: 1 - turn.value }
      : { opacity: turn.value < 0.5 ? 1 : 0, transform: [{ perspective: 900 }, { rotateX: `${turn.value * 180}deg` }] },
  );
  const backStyle = useAnimatedStyle(() =>
    reduce
      ? { opacity: turn.value }
      : { opacity: turn.value >= 0.5 ? 1 : 0, transform: [{ perspective: 900 }, { rotateX: `${180 + turn.value * 180}deg` }] },
  );
  const measure = (key: 'quote' | 'greet') => (h: number) => setHeights((was) => (Math.abs(was[key] - h) < 1 ? was : { ...was, [key]: h }));

  return (
    <Pressable
      onPress={flip}
      style={[s.block, { height }]}
      accessibilityRole="button"
      accessibilityLabel={
        greet
          ? `Good ${partOfDay(new Date().getHours())}, ${name}.${summary ? ` ${summary}.` : ''} Double tap to show the quote of the day`
          : `Quote of the day: ${quote.text}, ${quote.author}. Double tap to show the greeting`
      }
    >
      <Animated.View style={[s.face, frontStyle]} pointerEvents="none">
        <View style={s.content} onLayout={(e) => measure('quote')(e.nativeEvent.layout.height)}>
          <Text style={s.eyebrow}>Quote of the day</Text>
          <Text style={[s.quote, quoteSize(c)]}>“{quote.text}”</Text>
          <Text style={s.author}>— {quote.author}</Text>
        </View>
      </Animated.View>
      <Animated.View style={[s.face, backStyle]} pointerEvents="none">
        <View style={s.content} onLayout={(e) => measure('greet')(e.nativeEvent.layout.height)}>
          <Text style={s.greeting}>
            Good <Text style={s.greetingEm}>{partOfDay(new Date().getHours())}</Text>, {name}.
          </Text>
          {summary ? <Text style={s.summary}>{summary}</Text> : null}
        </View>
      </Animated.View>
      <View style={s.button} pointerEvents="none">
        <RefreshCw size={14} color={c.muted} strokeWidth={2} aria-hidden />
      </View>
    </Pressable>
  );
}

/** The quote in the heading face: Cormorant and Caveat run small, so they get a little more size. */
function quoteSize(c: Palette) {
  if (c.fonts.serif.startsWith('Caveat')) return { fontSize: 23, lineHeight: 27 };
  if (c.fonts.serif.startsWith('Cormorant')) return { fontSize: 20, lineHeight: 26 };
  return { fontSize: 18, lineHeight: 25 };
}

const makeStyles = themed((c) => ({
  block: { position: 'relative' },
  face: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', backfaceVisibility: 'hidden' },
  // Clear of the flip button on the right.
  content: { paddingRight: 30, gap: 6 },
  eyebrow: { ...eyebrow(c, 11), color: c.muted },
  quote: { fontFamily: FONTS.serifItalic, color: c.text },
  author: { ...eyebrow(c, 11), color: c.accent, marginTop: 1 },
  greeting: { fontFamily: FONTS.serif, color: c.text, fontSize: 26, lineHeight: 32, ...headingCase(c) },
  greetingEm: c.italicAccent ? { fontFamily: FONTS.serifItalic, color: c.accent } : { fontFamily: FONTS.serif, color: c.text },
  summary: { color: c.muted, fontSize: 12 },
  button: {
    position: 'absolute',
    right: 0,
    top: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
