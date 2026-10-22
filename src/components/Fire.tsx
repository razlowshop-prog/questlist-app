import { Flame, FlameKindling } from 'lucide-react-native';
import { createContext, useContext } from 'react';
import { View } from 'react-native';
import type { FlameStyleId } from '../cosmetics';
import { useTheme, type Palette } from '../theme';

/**
 * Fire colours per streak tier: Spark (none yet), Flame, Blaze, Inferno.
 * Same hues on both, softer on dark themes and deeper on light ones so they stay readable.
 */
export const FIRE_COLORS = {
  dark: ['', '#E0915A', '#8FB4D9', '#B49AD8'],
  light: ['', '#B8612A', '#3F6E99', '#6E4FA3'],
};

/** The tier's colour on this theme; Spark (tier 0) uses `none`, the muted text colour unless given. */
export function fireColor(tier: number, c: Palette, none: string = c.muted): string {
  return tier === 0 ? none : FIRE_COLORS[c.dark ? 'dark' : 'light'][tier];
}

/** The flame style the player has equipped, for every flame in the app. */
export const FlameStyleContext = createContext<FlameStyleId>('classic');

/** The streak flame in its tier's colour, drawn in the equipped (or given) flame style. */
export function Fire({ tier, size, look }: { tier: number; size: number; /** Overrides the equipped style, for previews. */ look?: FlameStyleId }) {
  const c = useTheme();
  const equipped = useContext(FlameStyleContext);
  const style = look ?? equipped;
  const color = fireColor(tier, c);
  const lit = tier > 0;
  const fill = !lit || style === 'outline' ? 'none' : style === 'solid' ? color : `${color}55`;
  const icon =
    style === 'kindling' ? (
      <FlameKindling size={size} color={color} fill={fill} strokeWidth={1.75} aria-hidden />
    ) : (
      <Flame size={size} color={color} fill={fill} strokeWidth={style === 'outline' ? 1.4 : 1.75} aria-hidden />
    );
  if (style === 'twin') {
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', left: -size * 0.22, top: size * 0.22, opacity: 0.55 }}>
          <Flame size={size * 0.75} color={color} fill={fill} strokeWidth={1.75} aria-hidden />
        </View>
        {icon}
      </View>
    );
  }
  if (style === 'glow' || style === 'sparks') {
    const spark = Math.max(2, Math.round(size / 10));
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {style === 'glow' && lit && (
          <View
            style={{ position: 'absolute', width: size * 0.95, height: size * 0.95, borderRadius: size, backgroundColor: color, opacity: 0.18 }}
          />
        )}
        {icon}
        {style === 'sparks' &&
          lit &&
          [
            [0.86, 0.12],
            [0.02, 0.3],
            [0.92, 0.55],
          ].map(([x, y], i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: x * size,
                top: y * size,
                width: spark,
                height: spark,
                backgroundColor: color,
                transform: [{ rotate: '45deg' }],
              }}
            />
          ))}
      </View>
    );
  }
  return icon;
}
