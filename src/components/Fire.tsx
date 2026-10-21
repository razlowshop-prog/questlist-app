import { Flame } from 'lucide-react-native';
import { useTheme } from '../theme';

/** Fire colours per streak tier: Spark (none yet), Flame, Blaze, Inferno. */
export const FIRE_COLORS = ['', '#F0883E', '#4EA8F5', '#B07CFF'];

export function fireColor(tier: number, faint: string): string {
  return tier === 0 ? faint : FIRE_COLORS[tier];
}

/** The streak flame, filled in its tier's colour. */
export function Fire({ tier, size }: { tier: number; size: number }) {
  const c = useTheme();
  const color = fireColor(tier, c.muted);
  return <Flame size={size} color={color} fill={tier === 0 ? 'none' : `${color}55`} strokeWidth={1.75} aria-hidden />;
}
