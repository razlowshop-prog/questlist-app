import { Ban, Coffee, Crown, Gem, RefreshCw, Sparkles, Zap, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import type { LevelMilestone, TokenKind } from '../achievements';
import { THEMES, useTheme } from '../theme';

/** Icon of each one-time token. */
export const TOKEN_ICONS: Record<TokenKind, LucideIcon> = { rest: Coffee, double: Zap, reroll: RefreshCw };

/** A picture of a level reward: the theme's own colours, or an icon for a title, token, ad-free time, Premium or bonus XP. */
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
  const Icon = reward?.token
    ? TOKEN_ICONS[reward.token]
    : reward?.kind === 'title'
      ? Crown
      : reward?.kind === 'adfree'
        ? Ban
        : reward?.kind === 'premium'
          ? Gem
          : Sparkles;
  return <Icon size={size} color={c.accent} strokeWidth={1.5} aria-hidden />;
}
