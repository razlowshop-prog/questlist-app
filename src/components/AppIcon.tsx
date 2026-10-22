import {
  Award, Bath, BookOpen, Brain, Briefcase, Cake, CalendarCheck, CalendarDays, ClipboardList, Compass, Crown, Dumbbell,
  Flame, FlameKindling, Footprints, Gem, HandHeart, HeartPulse, Hourglass, House, ListChecks, Moon, Mountain, Palette,
  PawPrint, Rocket, Salad, Shield, Shuffle, Smartphone, Sun, Target, Timer, TreePine, Trophy, Users, Wallet, Weight, Zap, type LucideIcon,
} from 'lucide-react-native';
import type { IconName } from '../icons';

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
