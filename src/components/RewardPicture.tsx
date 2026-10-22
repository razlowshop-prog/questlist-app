import { Ban, Coffee, Droplets, Flame, PartyPopper, RefreshCw, Sparkles, Star, Zap, type LucideIcon } from 'lucide-react-native';
import type { LevelMilestone, TokenKind } from '../achievements';
import type { CelebrationId, FlameStyleId } from '../cosmetics';
import { Fire } from './Fire';
import { Avatar, ProfileFrame } from './ProfileFrame';
import { Sticker } from './Vivid';
import { CELEBRATION_GLYPHS, CELEBRATION_LOOKS, REWARD_LOOKS, TOKEN_LOOKS } from '../vivid';

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
 * A picture of a level reward as a vivid sticker (rewards spec), the same on
 * every theme: tokens in their own colours, a diamond for a theme, a crown
 * for Premium, a medal for a title. Frames and flames show themselves when
 * there is room for them.
 */
export function RewardPicture({ milestone, size }: { milestone: LevelMilestone; size: number }) {
  const reward = milestone.reward;
  if (reward?.kind === 'frame' && reward.item && size >= 40) {
    const inner = size / 1.3;
    return (
      <ProfileFrame frame={reward.item} size={inner}>
        <Avatar initials="" size={inner * 0.82} />
      </ProfileFrame>
    );
  }
  if (reward?.kind === 'flame' && reward.item) return <Fire tier={1} size={size} look={reward.item as FlameStyleId} />;
  const look = reward?.token
    ? TOKEN_LOOKS[reward.token]
    : reward?.kind === 'adfree'
      ? TOKEN_LOOKS.adfree
      : reward?.kind === 'celebration'
        ? { ...(CELEBRATION_LOOKS[reward.item as CelebrationId] ?? REWARD_LOOKS.celebration), glyph: CELEBRATION_GLYPHS[reward.item as CelebrationId] ?? 'Confetti' }
        : reward?.kind === 'theme' || reward?.kind === 'premium' || reward?.kind === 'frame' || reward?.kind === 'title'
          ? REWARD_LOOKS[reward.kind]
          : REWARD_LOOKS.bonus;
  return <Sticker grad={look} glyph={look.glyph} size={size} />;
}
