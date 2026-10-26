import { N, t } from './i18n.ts';

// Looks that are won from levels and can be equipped in the inventory:
// frames around the profile picture and styles for the streak flame.
// Pure data; the looks are in vivid.ts, the drawing in ProfileFrame.tsx and Fire.tsx.
// Ids are stored in settings and must not change; names may.

export type LevelFrameId = 'ring' | 'double' | 'dotted' | 'hex' | 'rays' | 'platinum' | 'laurel' | 'titanium' | 'stars' | 'diamond' | 'ember' | 'crown';
export type TrophyFrameId = 'ironWill' | 'marathonMind' | 'crystalClear' | 'dawnBreaker' | 'dreamWalker' | 'pathfinder';
export type FrameId = LevelFrameId | TrophyFrameId;
export type FlameStyleId = 'classic' | 'outline' | 'solid' | 'kindling' | 'twin' | 'glow' | 'sparks' | 'plasma' | 'ink' | 'lava';

/** Frames won from levels, in level order. */
export const FRAMES: { id: LevelFrameId; name: string }[] = [
  { id: 'ring', name: N('Bronze') },
  { id: 'double', name: N('Silver') },
  { id: 'dotted', name: N('Gold') },
  { id: 'hex', name: N('Emerald') },
  { id: 'rays', name: N('Sapphire') },
  { id: 'platinum', name: N('Platinum') },
  { id: 'laurel', name: N('Ruby') },
  { id: 'titanium', name: N('Titanium') },
  { id: 'stars', name: N('Amethyst') },
  { id: 'diamond', name: N('Neon') },
  { id: 'ember', name: N('Inferno') },
  { id: 'crown', name: N('Aurora') },
];

/**
 * Animated frames, each won only with its trophy (trophies.ts), which also
 * gives a title. A frame whose trophy isn't in the app yet (it needs screen
 * time, sleep or step tracking) isn't offered until it is.
 */
export const TROPHY_FRAMES: { id: TrophyFrameId; name: string; trophy: string }[] = [
  { id: 'ironWill', name: N('Iron Will'), trophy: 'ironWill' },
  { id: 'marathonMind', name: N('Marathon Mind'), trophy: 'marathonMind' },
  { id: 'crystalClear', name: N('Crystal Clear'), trophy: 'crystalClear' },
  { id: 'dawnBreaker', name: N('Dawn Breaker'), trophy: 'dawnBreaker' },
  { id: 'dreamWalker', name: N('Dream Walker'), trophy: 'dreamWalker' },
  { id: 'pathfinder', name: N('Pathfinder'), trophy: 'pathfinder' },
];

/** classic is everyone's from the start; the others are won. */
export const FLAME_STYLES: { id: FlameStyleId; name: string }[] = [
  { id: 'classic', name: N('Classic') },
  { id: 'outline', name: N('Toxic') },
  { id: 'solid', name: N('Solar') },
  { id: 'kindling', name: N('Phantom') },
  { id: 'twin', name: N('Twin') },
  { id: 'glow', name: N('Prism') },
  { id: 'sparks', name: N('Pixel') },
  { id: 'plasma', name: N('Plasma') },
  { id: 'ink', name: N('Ink') },
  { id: 'lava', name: N('Lava') },
];

/** Looks for the burst that plays when a task is ticked. classic is everyone's from the start. */
export type CelebrationId = 'classic' | 'confetti' | 'ink' | 'embers' | 'starfall';

export const CELEBRATIONS: { id: CelebrationId; name: string; description: string }[] = [
  { id: 'classic', name: N('Sparks'), description: N('Rainbow sparks burst out of the tick.') },
  { id: 'confetti', name: N('Confetti'), description: N('A little burst of colourful paper.') },
  { id: 'ink', name: N('Ink'), description: N('Drops of ink spread out slowly.') },
  { id: 'embers', name: N('Embers'), description: N('Glowing embers drift upwards.') },
  { id: 'starfall', name: N('Starfall'), description: N('Tiny stars fall and twinkle out.') },
];

// Seasonal events: one themed challenge a month. Finishing it wins that
// month's frame, which only that month (of that year) gives out.

export type SeasonIcon =
  | 'Snowflake' | 'Heart' | 'Clover' | 'Flower' | 'Sprout' | 'Sun'
  | 'Waves' | 'Palette' | 'BookOpen' | 'Leaf' | 'Coffee' | 'Gift';

export interface Season {
  /** Month number, 1-12. */
  month: number;
  name: string;
  /** What the month is about, shown under the name. */
  pitch: string;
  /** Library categories whose tasks count. */
  categories: string[];
  /** Tasks from those categories to finish within the month. */
  target: number;
  icon: SeasonIcon;
}

export const SEASONS: Season[] = [
  { month: 1, name: N('Fresh Start'), pitch: N('New year, new habits: move your body.'), categories: ['fitness', 'health'], target: 20, icon: 'Snowflake' },
  { month: 2, name: N('Kind Hearts'), pitch: N('Make time for the people you love.'), categories: ['social', 'kindness'], target: 12, icon: 'Heart' },
  { month: 3, name: N('Spring Clean'), pitch: N('Clear the clutter, clear the mind.'), categories: ['home', 'errands'], target: 20, icon: 'Clover' },
  { month: 4, name: N('In Bloom'), pitch: N('Get outside and watch things grow.'), categories: ['outdoors', 'pets'], target: 12, icon: 'Flower' },
  { month: 5, name: N('Calm Mind'), pitch: N('A little quiet every day.'), categories: ['mind', 'selfcare'], target: 15, icon: 'Sprout' },
  { month: 6, name: N('Midsummer'), pitch: N('Long days, strong legs.'), categories: ['fitness', 'outdoors'], target: 20, icon: 'Sun' },
  { month: 7, name: N('Slow Summer'), pitch: N('Rest well, eat well, sleep well.'), categories: ['food', 'sleep', 'selfcare'], target: 15, icon: 'Waves' },
  { month: 8, name: N('Maker Month'), pitch: N('Make something just for you.'), categories: ['creative', 'learning'], target: 12, icon: 'Palette' },
  { month: 9, name: N('Back to School'), pitch: N('Learn something new every week.'), categories: ['learning', 'work'], target: 15, icon: 'BookOpen' },
  { month: 10, name: N('Harvest'), pitch: N('Look after your home and your money.'), categories: ['home', 'money', 'food'], target: 20, icon: 'Leaf' },
  { month: 11, name: N('Cozy Season'), pitch: N('Unplug and take care of yourself.'), categories: ['digital', 'selfcare', 'sleep'], target: 15, icon: 'Coffee' },
  { month: 12, name: N('Season of Giving'), pitch: N('Share some time and kindness.'), categories: ['social', 'kindness'], target: 12, icon: 'Gift' },
];

/** The id of a seasonal frame, e.g. "season-2026-10". */
export const seasonFrameId = (month: string) => `season-${month}`;

/** Name of any frame, seasonal ones included ("Harvest 2026"). */
export function frameName(id: string): string {
  const season = /^season-(\d{4})-(\d{2})$/.exec(id);
  if (season) return `${t(SEASONS[Number(season[2]) - 1].name)} ${season[1]}`;
  return t([...FRAMES, ...TROPHY_FRAMES].find((f) => f.id === id)?.name ?? N('Frame'));
}
