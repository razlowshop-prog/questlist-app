import type { GlyphName } from './glyphs.ts';
import type { IconName } from './icons.ts';
import type { CelebrationId, FlameStyleId, FrameId } from './cosmetics.ts';

// Succedo Vivid (design thread, "vivid-app-wide-spec" and "rewards-layer-spec"):
// everything you can press, everything that shows progress and everything you
// earn has a fixed, flashy look that is the same on every theme. The theme
// keeps the background, cards, text, heading font and shapes.
// Pure data here; the drawing lives in components/Vivid.tsx.

/** A two-colour gradient and the colour of a glyph or text on it. */
export interface Grad {
  c1: string;
  c2: string;
  ink: string;
}

const g = (c1: string, c2: string, ink = '#FFFFFF'): Grad => ({ c1, c2, ink });

/**
 * The brand gradient (home variant F "Kühl"): buttons, chips, toggles, the
 * active tab. Blue to violet with white text; rewards keep their own colours.
 */
export const BRAND: Grad = g('#7FD6FF', '#6A5BFF');

/** A theme that may bring its own accent in place of the brand (theme.tsx Palette). */
export interface BrandHost {
  dark: boolean;
  brand?: { line: string; text: { c1: string; c2: string } };
}

/** One solid brand colour for outlines, highlighted cards and the active tab label; a theme's own accent if it has one. */
export function brandLine(c: BrandHost | boolean): string {
  if (typeof c !== 'boolean' && c.brand) return c.brand.line;
  const dark = typeof c === 'boolean' ? c : c.dark;
  return dark ? '#9FB4FF' : '#4A3BD6';
}

/** The brand glow, at a given strength (0-1). */
export const brandGlow = (alpha: number) => `rgba(106,91,255,${alpha})`;

/** The progress gradient: the XP bar. */
export const PRISM = ['#5BF0D2', '#4DB8FF', '#A45CFF', '#FF3D9A'];

/** The mythic rainbow, for the rarest things. */
export const MYTHIC = ['#FF4D6D', '#FFB547', '#FFE45C', '#4DF0A0', '#4DB8FF', '#A45CFF'];

/** Outline around every sticker. */
export const KEYLINE = '#0e0b12';

/** Notification and counter badges. White on it is 4.4:1. */
export const BADGE_RED = '#E0335F';

/** Big numbers in gradient text: ice blue to violet on dark themes, a deep blue-violet (4.5:1 or better) on light ones. No glow. */
export function textGradient(dark: boolean): { c1: string; c2: string; glow?: string } {
  return dark ? { c1: '#C6F4FF', c2: '#8F7BFF' } : { c1: '#3F4FD8', c2: '#4A3BD6' };
}

/** Solid fallback for gradient text where a gradient can't be clipped to letters (phones). */
export function textSolid(dark: boolean): string {
  return dark ? '#A9B8FF' : '#4A3BD6';
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const RARITY: Record<Rarity, Grad & { label: string; name: string }> = {
  common: { ...g('#5BF0D2', '#0E9BB0'), label: '#34E3C4', name: 'Common' },
  rare: { ...g('#7FD6FF', '#3557FF'), label: '#5AC8FF', name: 'Rare' },
  epic: { ...g('#E77BFF', '#FF3D9A'), label: '#E77BFF', name: 'Epic' },
  legendary: { ...g('#FFE066', '#FF7A00', '#4A2600'), label: '#FFC53D', name: 'Legendary' },
  mythic: { ...g('#FF4D6D', '#A45CFF'), label: '#FF8FB1', name: 'Mythic' },
};

/** Rarity labels are bright for dark themes; on light themes the deep end of the gradient reads better. */
export function rarityLabel(rarity: Rarity, dark: boolean): string {
  if (dark) return RARITY[rarity].label;
  return { common: '#0B7C8C', rare: '#2F48D8', epic: '#C0267A', legendary: '#B45309', mythic: '#B4246A' }[rarity];
}

/** The level badge's colour band. */
export function levelBand(level: number): Rarity {
  if (level >= 100) return 'mythic';
  if (level >= 50) return 'legendary';
  if (level >= 25) return 'epic';
  if (level >= 10) return 'rare';
  return 'common';
}

/** Fixed colours and glyph of each task category (the same as the library's ids). */
export const CATEGORY_LOOKS: Record<string, Grad & { glyph: GlyphName }> = {
  home: { ...g('#FFB547', '#FF5A1F'), glyph: 'House' },
  fitness: { ...g('#FF8A8A', '#E0123A'), glyph: 'Barbell' },
  health: { ...g('#7CFFC0', '#12B886'), glyph: 'Heartbeat' },
  food: { ...g('#EEFF8A', '#22C55E', '#0F3A12'), glyph: 'ForkKnife' },
  mind: { ...g('#E77BFF', '#7B2CFF'), glyph: 'Brain' },
  sleep: { ...g('#8FE0FF', '#3B6BFF'), glyph: 'MoonStars' },
  work: { ...g('#9AD9FF', '#2340FF'), glyph: 'Briefcase' },
  learning: { ...g('#FFE066', '#FF7A00', '#4A2600'), glyph: 'BookOpen' },
  money: { ...g('#9DFFD2', '#0BA360', '#053B2A'), glyph: 'Wallet' },
  social: { ...g('#FF84DC', '#FF3D9A'), glyph: 'UsersThree' },
  selfcare: { ...g('#FFB3EF', '#C03CE0'), glyph: 'Bathtub' },
  digital: { ...g('#6FE3FF', '#0E9BB0'), glyph: 'DeviceMobile' },
  creative: { ...g('#FF9AD5', '#A45CFF'), glyph: 'Palette' },
  outdoors: { ...g('#B7F06A', '#2E9E44', '#0F3A12'), glyph: 'TreeEvergreen' },
  pets: { ...g('#FFD3A1', '#B4622E'), glyph: 'PawPrint' },
  errands: { ...g('#E3E8EE', '#6C7886', '#1E2630'), glyph: 'ClipboardText' },
  kindness: { ...g('#FFA3B3', '#E0335F'), glyph: 'HandHeart' },
  other: { ...g('#D7C8FF', '#7B5CFF'), glyph: 'Sparkle' },
};

export function categoryLook(id: string): Grad & { glyph: GlyphName } {
  return CATEGORY_LOOKS[id] ?? CATEGORY_LOOKS.other;
}

/** The middle of a gradient, for thin lines and outlines where a gradient would be lost. */
export function midColor(grad: { c1: string; c2: string }): string {
  return mixHex(grad.c1, grad.c2, 0.55);
}

/** Mixes two #rrggbb colours; t = share of b. */
export function mixHex(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** One-time tokens. */
export const TOKEN_LOOKS: Record<'rest' | 'double' | 'reroll' | 'adfree', Grad & { glyph: GlyphName }> = {
  rest: { ...g('#8FE0FF', '#3B6BFF'), glyph: 'Moon' },
  double: { ...g('#FFE45A', '#FF8A00', '#4A2600'), glyph: 'Lightning' },
  reroll: { ...g('#7CFFC0', '#12B886', '#053B2A'), glyph: 'ArrowsLeftRight' },
  adfree: { ...g('#FF84DC', '#7B5CFF'), glyph: 'ShieldCheck' },
};

/** Level rewards that aren't a token, frame or flame. */
export const REWARD_LOOKS = {
  theme: { ...g('#E77BFF', '#7B2CFF'), glyph: 'Diamond' as GlyphName },
  premium: { ...RARITY.legendary, glyph: 'Crown' as GlyphName },
  frame: { ...RARITY.rare, glyph: 'Star' as GlyphName },
  title: { ...RARITY.epic, glyph: 'Medal' as GlyphName },
  celebration: { ...g('#FF9AD5', '#A45CFF'), glyph: 'Confetti' as GlyphName },
  bonus: { ...RARITY.common, glyph: 'Sparkle' as GlyphName },
};

/** The five avatar discs the player can pick from (Profile). */
export const AVATAR_DISCS: Grad[] = [
  g('#FF8A5B', '#FF3D9A'),
  g('#5AC8FF', '#3557FF'),
  g('#7CFFC0', '#12B886'),
  g('#D35CFF', '#7B5CFF'),
  g('#FFB547', '#FF5A1F'),
];

export function avatarDisc(index: number | undefined): Grad {
  return AVATAR_DISCS[index !== undefined && index >= 0 && index < AVATAR_DISCS.length ? index : 0];
}

export interface FrameLook {
  name: string;
  rarity: Rarity;
  /** Colour stops round the ring. */
  stops: string[];
  /** A sweep round the ring (conic) instead of a straight gradient. */
  conic?: boolean;
  /** Turns once every 6 s. */
  spin?: boolean;
  glow?: boolean;
  /**
   * Drawn by FrameArt instead of the plain ring: `metal` is a polished ring
   * (conic `stops`) with a shine sweeping over it; the rest are the trophy
   * frames, each with its own drawing.
   */
  art?: FrameArt;
}

export type FrameArt = 'metal' | 'flames' | 'laurel' | 'crystal' | 'sunrise' | 'aurora' | 'orbit';

/**
 * The ten profile frames, in the order the levels hand them out. Ids are
 * stored in settings, so they stay; only the looks and names are new.
 */
export const FRAME_LOOKS: Record<FrameId, FrameLook> = {
  // The metal rings sweep round from the lower left (conic, from 210°), as on the frames board.
  ring: { name: 'Bronze', rarity: 'common', stops: ['#7a4a26', '#e0a070', '#8a5530', '#f2c299', '#7a4a26'], art: 'metal' },
  double: { name: 'Silver', rarity: 'common', stops: ['#7c8591', '#f4f7fa', '#9aa4b0', '#ffffff', '#7c8591'], art: 'metal' },
  dotted: { name: 'Gold', rarity: 'rare', stops: ['#9a6412', '#ffe7a0', '#c48a20', '#fff6d0', '#9a6412'], art: 'metal' },
  hex: { name: 'Emerald', rarity: 'rare', stops: ['#9DFFD2', '#0BA360', '#047A47'] },
  rays: { name: 'Sapphire', rarity: 'rare', stops: ['#9AD9FF', '#2340FF', '#14208F'] },
  platinum: { name: 'Platinum', rarity: 'rare', stops: ['#8fa3b8', '#ffffff', '#c9d6e3', '#eef4fa', '#8fa3b8'], art: 'metal' },
  laurel: { name: 'Ruby', rarity: 'epic', stops: ['#FFA3B3', '#E0123A', '#8A0620'] },
  titanium: { name: 'Titanium', rarity: 'epic', stops: ['#2b3140', '#9aa6bf', '#3a4256', '#d7deeb', '#2b3140'], art: 'metal' },
  stars: { name: 'Amethyst', rarity: 'epic', stops: ['#ECBDFF', '#7A2CFF', '#3F0F99'] },
  diamond: { name: 'Neon', rarity: 'legendary', stops: ['#00F0FF', '#FF00E5', '#00F0FF'], conic: true, spin: true, glow: true },
  ember: { name: 'Inferno', rarity: 'legendary', stops: ['#FFE066', '#FF5A1F', '#FF2D7A', '#FFE066'], conic: true, spin: true, glow: true },
  crown: { name: 'Aurora', rarity: 'mythic', stops: [...MYTHIC, MYTHIC[0]], conic: true, spin: true, glow: true },
  // Trophy frames (the trophy's rarity on the frames board).
  ironWill: { name: 'Iron Will', rarity: 'legendary', stops: ['#FF2D1C', '#FF7A00', '#FFE29A', '#FF7A00', '#FF2D1C', '#FF7A00', '#FFE29A', '#FF2D1C'], art: 'flames' },
  marathonMind: { name: 'Marathon Mind', rarity: 'legendary', stops: ['#FFF1A8', '#E8B33A', '#9A6412'], art: 'laurel' },
  crystalClear: { name: 'Crystal Clear', rarity: 'epic', stops: ['#E6FBFF', '#9BE8FF', '#C9B6FF', '#ffffff', '#7FD6FF', '#E2C9FF', '#E6FBFF'], art: 'crystal' },
  dawnBreaker: { name: 'Dawn Breaker', rarity: 'epic', stops: ['#FF7A00', '#FFD36B', '#FFF3C4', '#FFD36B', '#FF7A00'], art: 'sunrise' },
  dreamWalker: { name: 'Dream Walker', rarity: 'epic', stops: ['#3CFFB0', '#2BD9FF', '#7A5CFF', '#E77BFF', '#3CFFB0'], art: 'aurora' },
  pathfinder: { name: 'Pathfinder', rarity: 'legendary', stops: ['#7FD6FF'], art: 'orbit' },
};

/** Monthly event frames: the Aurora ring with a month pill. */
export const SEASON_FRAME: FrameLook = { ...FRAME_LOOKS.crown, name: 'Event' };
export const SEASON_PILL = g('#FF4D6D', '#A45CFF');

/** Flame colours: the streak's fire tier picks Ember, Blaze or Inferno; some won styles have their own. */
export const FLAMES = {
  ember: { ...g('#FFE29A', '#FF4A1C'), name: 'Ember' },
  blaze: { ...g('#C6F4FF', '#2F7BFF'), name: 'Blaze' },
  inferno: { ...g('#FFB3EF', '#9B30FF'), name: 'Inferno' },
  toxic: { ...g('#EEFF8A', '#22C55E'), name: 'Toxic' },
  solar: { ...g('#FFFBE0', '#FFB000'), name: 'Solar' },
  phantom: { ...g('#E0FFFB', '#7C5CFF'), name: 'Phantom' },
};

/** The flame's colours for a fire tier (0 = no fire yet: undefined, drawn as an outline). */
export function tierFlame(tier: number): Grad | undefined {
  return [undefined, FLAMES.ember, FLAMES.blaze, FLAMES.inferno][Math.max(0, Math.min(3, tier))];
}

/** Won flame styles that bring their own colours; the rest take the fire tier's. */
export const STYLE_FLAMES: Partial<Record<FlameStyleId, Grad>> = {
  outline: FLAMES.toxic,
  solid: FLAMES.solar,
  kindling: FLAMES.phantom,
};

/** Category emblems, by tier (1 bronze, 2 silver, 3 gold). */
export const EMBLEM_METALS: Grad[] = [g('#FFD3A1', '#A0522D'), g('#FFFFFF', '#8E9BAA', '#1E2630'), g('#FFF4B0', '#E0A100', '#4A2600')];

/** A CSS linear-gradient for `backgroundImage` (works in browsers and in React Native 0.76+). */
export function linear(colors: string[], angle = 135): string {
  return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
}

/** The filled glyph for each line icon name used in the data files (icons.ts). */
export const ICON_GLYPHS: Record<IconName, GlyphName> = {
  Award: 'Medal', Bath: 'Bathtub', BookOpen: 'BookOpen', Brain: 'Brain', Briefcase: 'Briefcase', Cake: 'Cake',
  CalendarCheck: 'CalendarCheck', CalendarDays: 'CalendarDots', ClipboardList: 'ClipboardText', Compass: 'Compass',
  Crown: 'Crown', Dumbbell: 'Barbell', Flame: 'Fire', FlameKindling: 'Campfire', Footprints: 'Footprints', Gem: 'Diamond',
  HandHeart: 'HandHeart', HeartPulse: 'Heartbeat', Hourglass: 'Hourglass', House: 'House', ListChecks: 'ListChecks',
  Moon: 'Moon', Mountain: 'Mountains', Palette: 'Palette', PawPrint: 'PawPrint', Rocket: 'Rocket', Salad: 'ForkKnife',
  Shield: 'Shield', Shuffle: 'Shuffle', Smartphone: 'DeviceMobile', Sun: 'Sun', Target: 'Target', Timer: 'Timer',
  TreePine: 'TreeEvergreen', Trophy: 'Trophy', Users: 'UsersThree', Wallet: 'Wallet', Weight: 'Scales', Zap: 'Lightning',
};

/** A challenge's rarity from its XP reward: bigger rewards, rarer colours. */
export function challengeRarity(rewardXp: number): Rarity {
  if (rewardXp > 180) return 'legendary';
  if (rewardXp > 130) return 'epic';
  if (rewardXp > 100) return 'rare';
  return 'common';
}

/** Achievement tiers Bronze to Legend, in metals first and then the rarity colours. */
export const ACHIEVEMENT_TIER_LOOKS: Grad[] = [
  EMBLEM_METALS[0],
  EMBLEM_METALS[1],
  EMBLEM_METALS[2],
  RARITY.common,
  RARITY.rare,
  RARITY.epic,
  RARITY.mythic,
];

export function achievementTierLook(tier: number): Grad {
  return ACHIEVEMENT_TIER_LOOKS[Math.max(0, Math.min(ACHIEVEMENT_TIER_LOOKS.length - 1, tier))];
}

/** Tick celebrations, each with its own sticker colours and glyph. */
export const CELEBRATION_LOOKS: Record<CelebrationId, Grad> = {
  classic: RARITY.epic,
  confetti: g('#FF9AD5', '#A45CFF'),
  ink: RARITY.rare,
  embers: g('#FFB547', '#FF5A1F'),
  starfall: RARITY.common,
};
export const CELEBRATION_GLYPHS: Record<CelebrationId, GlyphName> = { classic: 'Sparkle', confetti: 'Confetti', ink: 'Drop', embers: 'Fire', starfall: 'Star' };
