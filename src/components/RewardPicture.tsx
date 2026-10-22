import { Ban, Coffee, Crown, Droplets, Flame, Gem, PartyPopper, RefreshCw, Sparkles, Star, Zap, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import type { LevelMilestone, TokenKind } from '../achievements';
import type { CelebrationId, FlameStyleId } from '../cosmetics';
import { THEMES, useTheme } from '../theme';
import { Fire } from './Fire';
import { ProfileFrame } from './ProfileFrame';

/** Icon of each one-time token. */
export const TOKEN_ICONS: Record<TokenKind, LucideIcon> = { rest: Coffee, double: Zap, reroll: RefreshCw, adfree: Ban };

/** Icon of each tick celebration. */
export const CELEBRATION_ICONS: Record<CelebrationId, LucideIcon> = {
  classic: Sparkles,
  confetti: PartyPopper,
  ink: Droplets,
  embers: Flame,
  starfall: Star,
};

/**
 * A picture of a level reward: the theme's own colours, the frame or flame
 * itself, or an icon for a title, token, celebration, ad-free time, Premium or bonus XP.
 */
export function RewardPicture({ milestone, size }: { milestone: LevelMilestone; size: number }) {
  const c = useTheme();
  const reward = milestone.reward;
  const theme = reward?.kind === 'theme' ? THEMES.find((t) => t.reward === reward.label) : undefined;
  if (theme) {
    const dot = Math.round(size * 0.43);
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.palette.bg,
          borderWidth: 1,
          borderColor: theme.palette.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: theme.palette.accent }} />
      </View>
    );
  }
  if (reward?.kind === 'frame' && reward.item) {
    const inner = size / 1.3;
    return (
      <ProfileFrame frame={reward.item} size={inner}>
        <View style={{ width: inner * 0.82, height: inner * 0.82, borderRadius: inner, backgroundColor: c.accentSoft }} />
      </ProfileFrame>
    );
  }
  if (reward?.kind === 'flame' && reward.item) return <Fire tier={1} size={size} look={reward.item as FlameStyleId} />;
  const Icon = reward?.token
    ? TOKEN_ICONS[reward.token]
    : reward?.kind === 'celebration'
      ? CELEBRATION_ICONS[reward.item as CelebrationId]
      : reward?.kind === 'title'
        ? Crown
        : reward?.kind === 'adfree'
          ? Ban
          : reward?.kind === 'premium'
            ? Gem
            : Sparkles;
  return <Icon size={size} color={c.accent} strokeWidth={1.5} aria-hidden />;
}
