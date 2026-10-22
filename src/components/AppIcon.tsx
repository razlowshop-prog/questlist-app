import {
  Award, Bath, BookOpen, Brain, Briefcase, Cake, CalendarCheck, CalendarDays, ClipboardList, Compass, Crown, Dumbbell,
  Flame, FlameKindling, Footprints, Gem, HandHeart, HeartPulse, Hourglass, House, ListChecks, Moon, Mountain, Palette,
  PawPrint, Rocket, Salad, Shield, Shuffle, Smartphone, Sun, Target, Timer, TreePine, Trophy, Users, Wallet, Weight, Zap, type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';
import type { IconName } from '../icons';
import { useTheme } from '../theme';

const ICONS: Record<IconName, LucideIcon> = {
  Award, Bath, BookOpen, Brain, Briefcase, Cake, CalendarCheck, CalendarDays, ClipboardList, Compass, Crown, Dumbbell,
  Flame, FlameKindling, Footprints, Gem, HandHeart, HeartPulse, Hourglass, House, ListChecks, Moon, Mountain, Palette,
  PawPrint, Rocket, Salad, Shield, Shuffle, Smartphone, Sun, Target, Timer, TreePine, Trophy, Users, Wallet, Weight, Zap,
};

/** A line icon: 1.5 stroke, 20 px in lists, 28 px on badges. */
export function AppIcon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  const Icon = ICONS[name];
  return <Icon size={size} color={color} strokeWidth={1.5} aria-hidden />;
}

export type BadgeState = 'earned' | 'normal' | 'locked';

/**
 * Achievement badge: the icon inside a 1 px ring in the outline colour, accent
 * once earned (icon muted, or faint while locked). A diamond instead of a circle when the theme's check is a diamond.
 */
export function AchievementBadge({ name, state, size = 28 }: { name: IconName; state: BadgeState; size?: number }) {
  const c = useTheme();
  const earned = state === 'earned';
  const color = earned ? c.accent : state === 'locked' ? c.faint : c.muted;
  const box = Math.round(size * 1.75);
  const diamond = c.check === 'diamond';
  // A rotated square needs a smaller side to fit the same box.
  const side = diamond ? Math.round(box / Math.SQRT2) : box;
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: side,
          height: side,
          borderWidth: 1,
          borderColor: earned ? c.accent : c.outline,
          borderRadius: diamond ? 0 : side / 2,
          transform: diamond ? [{ rotate: '45deg' }] : undefined,
        }}
      />
      <AppIcon name={name} size={diamond ? Math.round(size * 0.8) : size} color={color} />
    </View>
  );
}
