import { createContext, useContext, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { MASCOT_SIZE, mascotLeft, PLAIN_FX, type MascotKind, type ThemeBarSpec, type ThemeFx } from '../themeFx';
import Svg, { Path } from 'react-native-svg';
import { BarDecor, DECOR_PAD } from './fx/BarDecor';
import { Mascot } from './fx/Mascots';

// The moving parts of a theme: the XP bar with its mascot, the background
// layer and the way a ticked task leaves the list (see themeFx.ts and fx/).

export { Ambient } from './fx/Ambient';
export { FinishFx, RowPulse, RowSheen } from './fx/Finish';

/** The moving parts of the theme on screen, set in App. */
export const ThemeFxContext = createContext<ThemeFx>(PLAIN_FX);
export const useThemeFx = () => useContext(ThemeFxContext);

/**
 * The theme's XP bar: a lane above it for the mascot (nothing else goes
 * there, so it never covers the numbers below), the track, a faint "ghost"
 * of where the fill is heading, the fill itself and any drawing on it. The
 * fill, the drawing and the mascot follow `live` on the animation thread.
 */
export function ThemeXpBar({
  spec,
  mascot,
  scale = 1,
  live,
  ghost,
  progress,
  gainKey,
}: {
  spec: ThemeBarSpec;
  mascot?: MascotKind;
  scale?: number;
  live: SharedValue<number>;
  ghost: number;
  progress: number;
  /** Counts up each time XP is added, for mascots that react to it. */
  gainKey: number;
}) {
  const [width, setWidth] = useState(0);
  const size = mascot ? MASCOT_SIZE[mascot] : undefined;
  const mw = size ? size.width * scale : 0;
  const mh = size ? size.height * scale : 0;
  const fillStyle = useAnimatedStyle(() => ({ width: Math.max(0, Math.min(1, live.value)) * width }));
  const mascotStyle = useAnimatedStyle(() => ({ left: mascotLeft(live.value, width, mw) }));
  const r = spec.radius ?? spec.height / 2;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.max(0, Math.min(1, progress)) * 100) }}>
      {size && (
        // The mascot rides on the bar: its lane ends where the bar starts.
        <View style={{ height: mh + 4, zIndex: 2 }} pointerEvents="none">
          {width > 0 && (
            <Animated.View style={[{ position: 'absolute', bottom: -(size.sink ? size.sink * scale : Math.min(4, r)), width: mw, height: mh }, mascotStyle]}>
              <Mascot kind={mascot!} scale={scale} live={live} gainKey={gainKey} />
            </Animated.View>
          )}
        </View>
      )}
      {/* Leaves on the vine reach below the bar: keep them off the numbers. */}
      <View style={{ marginBottom: spec.decor === 'vine' ? 6 : 0 }}>
        {/* A glowing fill needs room to glow, so only a plain bar clips it. */}
        <View style={{ height: spec.height, borderRadius: r, backgroundColor: spec.track, overflow: spec.fillShadow ? 'visible' : 'hidden' }}>
          {spec.dashedBase && <DashedLine color={spec.dashedBase} />}
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min(1, ghost)) * 100}%`, backgroundColor: spec.fillColor, opacity: 0.25, borderRadius: r }} />
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                borderRadius: r,
                backgroundColor: spec.fillColor,
                backgroundImage: spec.fill,
                opacity: spec.fillOpacity ?? 1,
                boxShadow: spec.fillShadow,
              } as ViewStyle,
              fillStyle,
            ]}
          />
          {spec.cells && width > 0 && <Cells width={width} height={spec.height} count={spec.cells.count} color={spec.cells.color} />}
        </View>
        {spec.decor && width > 0 && (
          // Drawn over the whole bar, shown only as far as the fill reaches; it may poke out above and below.
          <Animated.View style={[{ position: 'absolute', left: 0, top: -DECOR_PAD, height: spec.height + 2 * DECOR_PAD, overflow: 'hidden' }, fillStyle]} pointerEvents="none">
            <View style={{ position: 'absolute', left: 0, top: DECOR_PAD, width, height: spec.height }}>
              <BarDecor kind={spec.decor} width={width} height={spec.height} live={live} />
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

/**
 * Cuts the bar into honeycomb cells (Hive): everything around `count`
 * hexagons is painted in the colour of the screen behind the bar.
 */
function Cells({ width, height, count, color }: { width: number; height: number; count: number; color: string }) {
  const cell = width / count;
  const gap = 1.5;
  let d = `M0 0 H${width} V${height} H0Z`;
  for (let i = 0; i < count; i++) {
    const x0 = i * cell + gap;
    const x1 = (i + 1) * cell - gap;
    const tip = Math.min(height / 2, (x1 - x0) / 3);
    d += ` M${(x0 + tip).toFixed(1)} 0 H${(x1 - tip).toFixed(1)} L${x1.toFixed(1)} ${height / 2} L${(x1 - tip).toFixed(1)} ${height} H${(x0 + tip).toFixed(1)} L${x0.toFixed(1)} ${height / 2}Z`;
  }
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Path d={d} fill={color} fillRule="evenodd" />
    </Svg>
  );
}

/**
 * A 2px dashed rule along the bottom of the bar (Notepad). Phones can't dash
 * one side of a box, so this is a dashed box with all but its bottom edge cut off.
 */
function DashedLine({ color }: { color: string }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, overflow: 'hidden' }} pointerEvents="none">
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: color }} />
    </View>
  );
}
