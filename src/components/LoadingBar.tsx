import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import type { UpdatePhase } from '../appUpdate';
import { t } from '../i18n';
import { loadingView, sillyOrder } from '../loading';
import { themed, useStyles } from '../theme';

/** Cells in the honeycomb, filled one by one. */
const CELLS = 7;
const CELL_W = 26;
const CELL_H = 30;
const HEX = '13,0 26,7.5 26,22.5 13,30 0,22.5 0,7.5';

/**
 * The loading bar as a row of honeycomb cells that fill with honey one by one,
 * each with a little pop (picked 2026-11-01, style C), and a silly line under
 * it. Calls `onDone` once, when it's full and nothing is left to wait for.
 */
export function LoadingBar({ phase, download, onDone }: { phase: UpdatePhase; download?: number; onDone?: () => void }) {
  const s = useStyles(makeStyles);
  const [lines] = useState(() => sillyOrder(Math.random()));
  const started = useRef(Date.now());
  const [now, setNow] = useState(started.current);
  const view = loadingView(now - started.current, phase, lines, download);
  const told = useRef(false);
  const full = Math.floor(view.progress * CELLS + 1e-6);

  useEffect(() => {
    if (view.done) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [view.done]);

  useEffect(() => {
    if (view.done && !told.current) {
      told.current = true;
      onDone?.();
    }
  }, [view.done]);

  return (
    <View style={s.wrap} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(view.progress * 100) }} accessibilityLabel={t(view.line)}>
      <View style={s.row}>
        {Array.from({ length: CELLS }, (_, i) => (
          <View key={i} style={{ width: CELL_W, height: CELL_H }}>
            <Svg width={CELL_W} height={CELL_H} style={{ position: 'absolute' }}>
              <Polygon points={HEX} fill={s.empty.color} />
            </Svg>
            {i < full && (
              <Animated.View entering={ZoomIn.springify().damping(9)} style={{ position: 'absolute', width: CELL_W, height: CELL_H }}>
                <Svg width={CELL_W} height={CELL_H}>
                  <Defs>
                    <LinearGradient id={`honeyCell${i}`} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#FFE08A" />
                      <Stop offset="0.6" stopColor="#F2B544" />
                      <Stop offset="1" stopColor="#D98A1F" />
                    </LinearGradient>
                  </Defs>
                  <Polygon points={HEX} fill={`url(#honeyCell${i})`} />
                  <Polygon points="7,8 13,4.5 15,5.8 9,9.3" fill="rgba(255,255,255,0.5)" />
                </Svg>
              </Animated.View>
            )}
          </View>
        ))}
      </View>
      <Text style={s.line} numberOfLines={2}>
        {t(view.line)}
      </Text>
    </View>
  );
}

const makeStyles = themed((c) => ({
  wrap: { alignSelf: 'stretch', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 4 },
  empty: { color: c.dark ? 'rgba(255,255,255,0.09)' : c.border },
  line: { color: c.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
}));
