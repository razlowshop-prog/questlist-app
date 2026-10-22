// Looks that are won from levels and can be equipped in the inventory:
// frames around the profile picture and styles for the streak flame.
// Pure data; the drawing lives in ProfileFrame.tsx and Fire.tsx.

export type FrameId = 'ring' | 'double' | 'dotted' | 'hex' | 'rays' | 'laurel' | 'stars' | 'diamond' | 'ember' | 'crown';
export type FlameStyleId = 'classic' | 'outline' | 'solid' | 'kindling' | 'twin' | 'glow' | 'sparks';

export const FRAMES: { id: FrameId; name: string }[] = [
  { id: 'ring', name: 'Brass ring' },
  { id: 'double', name: 'Double ring' },
  { id: 'dotted', name: 'Pearl ring' },
  { id: 'hex', name: 'Hexagon' },
  { id: 'rays', name: 'Sunburst' },
  { id: 'laurel', name: 'Laurel' },
  { id: 'stars', name: 'Starlit' },
  { id: 'diamond', name: 'Diamond' },
  { id: 'ember', name: 'Ember ring' },
  { id: 'crown', name: 'Crown' },
];

/** classic is everyone's from the start; the others are won. */
export const FLAME_STYLES: { id: FlameStyleId; name: string }[] = [
  { id: 'classic', name: 'Classic' },
  { id: 'outline', name: 'Outline' },
  { id: 'solid', name: 'Solid' },
  { id: 'kindling', name: 'Kindling' },
  { id: 'twin', name: 'Twin' },
  { id: 'glow', name: 'Glow' },
  { id: 'sparks', name: 'Crackle' },
];

/** Looks for the burst that plays when a task is ticked. classic is everyone's from the start. */
export type CelebrationId = 'classic' | 'confetti' | 'ink' | 'embers' | 'starfall';

export const CELEBRATIONS: { id: CelebrationId; name: string; description: string }[] = [
  { id: 'classic', name: 'Sparks', description: 'Brass sparks fly out of the tick.' },
  { id: 'confetti', name: 'Confetti', description: 'A little burst of colourful paper.' },
  { id: 'ink', name: 'Ink', description: 'Drops of ink spread out slowly.' },
  { id: 'embers', name: 'Embers', description: 'Glowing embers drift upwards.' },
  { id: 'starfall', name: 'Starfall', description: 'Tiny stars fall and twinkle out.' },
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
  { month: 1, name: 'Fresh Start', pitch: 'New year, new habits: move your body.', categories: ['fitness', 'health'], target: 20, icon: 'Snowflake' },
  { month: 2, name: 'Kind Hearts', pitch: 'Make time for the people you love.', categories: ['social', 'kindness'], target: 12, icon: 'Heart' },
  { month: 3, name: 'Spring Clean', pitch: 'Clear the clutter, clear the mind.', categories: ['home', 'errands'], target: 20, icon: 'Clover' },
  { month: 4, name: 'In Bloom', pitch: 'Get outside and watch things grow.', categories: ['outdoors', 'pets'], target: 12, icon: 'Flower' },
  { month: 5, name: 'Calm Mind', pitch: 'A little quiet every day.', categories: ['mind', 'selfcare'], target: 15, icon: 'Sprout' },
  { month: 6, name: 'Midsummer', pitch: 'Long days, strong legs.', categories: ['fitness', 'outdoors'], target: 20, icon: 'Sun' },
  { month: 7, name: 'Slow Summer', pitch: 'Rest well, eat well, sleep well.', categories: ['food', 'sleep', 'selfcare'], target: 15, icon: 'Waves' },
  { month: 8, name: 'Maker Month', pitch: 'Make something just for you.', categories: ['creative', 'learning'], target: 12, icon: 'Palette' },
  { month: 9, name: 'Back to School', pitch: 'Learn something new every week.', categories: ['learning', 'work'], target: 15, icon: 'BookOpen' },
  { month: 10, name: 'Harvest', pitch: 'Look after your home and your money.', categories: ['home', 'money', 'food'], target: 20, icon: 'Leaf' },
  { month: 11, name: 'Cozy Season', pitch: 'Unplug and take care of yourself.', categories: ['digital', 'selfcare', 'sleep'], target: 15, icon: 'Coffee' },
  { month: 12, name: 'Season of Giving', pitch: 'Share some time and kindness.', categories: ['social', 'kindness'], target: 12, icon: 'Gift' },
];

/** The id of a seasonal frame, e.g. "season-2026-10". */
export const seasonFrameId = (month: string) => `season-${month}`;

/** Name of any frame, seasonal ones included ("Harvest 2026"). */
export function frameName(id: string): string {
  const season = /^season-(\d{4})-(\d{2})$/.exec(id);
  if (season) return `${SEASONS[Number(season[2]) - 1].name} ${season[1]}`;
  return FRAMES.find((f) => f.id === id)?.name ?? 'Frame';
}
