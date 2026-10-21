import { Flame } from 'lucide-react-native';
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

/** The streak flame, filled in its tier's colour. */
export function Fire({ tier, size }: { tier: number; size: number }) {
  const c = useTheme();
  const color = fireColor(tier, c);
  return <Flame size={size} color={color} fill={tier === 0 ? 'none' : `${color}55`} strokeWidth={1.75} aria-hidden />;
}
