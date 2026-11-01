import { Ban, Coffee, Gem, Gift, RefreshCw, Sparkles, Star, Ticket, Zap, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { Rarity, WheelPrize } from '../wheel';

/**
 * Rarity colours of the rewards layer: vivid and the same on every theme
 * (design thread, "SuccedoRewards"). c1 -> c2 gradient, ink = glyph colour.
 */
export const RARITY_COLORS: Record<Rarity, { c1: string; c2: string; ink: string; label: string }> = {
  common: { c1: '#5BF0D2', c2: '#0E9BB0', ink: '#FFFFFF', label: '#34E3C4' },
  uncommon: { c1: '#7FD6FF', c2: '#3557FF', ink: '#FFFFFF', label: '#5AC8FF' },
  rare: { c1: '#E77BFF', c2: '#FF3D9A', ink: '#FFFFFF', label: '#E77BFF' },
  legendary: { c1: '#FFE066', c2: '#FF7A00', ink: '#4A2600', label: '#FFC53D' },
};

/** The mythic rainbow, for the super rare prize. */
export const MYTHIC = ['#FF4D6D', '#FFB547', '#FFE45C', '#4DF0A0', '#4DB8FF', '#A45CFF'];

export const KEYLINE = '#0e0b12';

export const TICKET_COLORS = { c1: '#FFE066', c2: '#FF7A00', ink: '#4A2600' };

export function prizeIcon(prize: WheelPrize): LucideIcon {
  if (prize.theme) return Gem;
  if (prize.id === 'jackpot') return Star;
  if (prize.outfit) return Gift;
  switch (prize.token) {
    case 'double':
      return Zap;
    case 'rest':
      return Coffee;
    case 'reroll':
      return RefreshCw;
    case 'adfree':
      return Ban;
  }
  return Sparkles;
}

/** A glossy gradient disc with a glyph: the look of a prize, or of a ticket. */
export function PrizeSticker({ prize, size, ticket }: { prize?: WheelPrize; size: number; ticket?: boolean }) {
  const colors = ticket || !prize ? TICKET_COLORS : RARITY_COLORS[prize.rarity];
  const Icon = ticket || !prize ? Ticket : prizeIcon(prize);
  const id = `sticker-${ticket ? 'ticket' : prize?.id}-${Math.round(size)}`;
  const showXp = prize?.xp && !ticket;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0px ${Math.round(size / 10)}px ${Math.round(size / 3)}px ${colors.c2}80`,
      }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0.15" y1="0" x2="0.85" y2="1">
            <Stop offset="0" stopColor={colors.c1} />
            <Stop offset="1" stopColor={colors.c2} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 0.75} fill={`url(#${id})`} stroke={KEYLINE} strokeWidth={1.5} />
        {/* top gloss */}
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 3} fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={2} strokeDasharray={`${size * 0.9} ${size * 4}`} transform={`rotate(-155 ${size / 2} ${size / 2})`} />
      </Svg>
      {/* Wrapped so the glyph stacks above the absolutely placed disc on web. */}
      <View>
        {showXp ? (
          <Icon size={size * 0.42} color={colors.ink} fill={colors.ink} strokeWidth={1.5} aria-hidden />
        ) : (
          <Icon size={size * 0.46} color={colors.ink} strokeWidth={2} aria-hidden />
        )}
      </View>
    </View>
  );
}
