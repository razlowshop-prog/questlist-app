// How hard a task is, next to how long it takes (approved 2026-10-26). A hard
// 30-minute workout pays more than 30 minutes of reading, and all-day willpower
// tasks ("No alcohol today") pay a flat amount, since their time says nothing.

export type Effort = 'light' | 'active' | 'hard' | 'willpower';

/** XP multiplier on top of the time-based XP. Willpower tasks pay WILLPOWER_XP instead. */
export const EFFORT_FACTOR: Record<Exclude<Effort, 'willpower'>, number> = { light: 1, active: 1.25, hard: 1.5 };

/** What a willpower task pays, before streak and other multipliers. */
export const WILLPOWER_XP = 10;

/** Workouts, running, sport, heavy outdoor work, a deep clean. */
const HARD = new Set([
  'strength-workout', 'go-to-the-gym', 'home-workout', '20-push-ups', 'do-50-squats', 'plank-for-2-minutes',
  'do-30-crunches', 'do-10-pull-ups', 'hiit-session', 'go-swimming', 'play-a-sport',
  'skip-rope-for-10-minutes', 'rowing-machine-session', 'martial-arts-class',
  'climbing-or-bouldering-session', 'go-hiking', 'go-skiing', 'run', 'shovel-snow', 'clean-the-gutters',
  'deep-clean-one-room', 'tidy-the-cellar-or-garage',
]);

/** Physical chores, walking, cycling, yoga, batch cooking, dreaded admin. */
const ACTIVE = new Set([
  'walk', 'steps', 'cycle-for-30-minutes', 'yoga-session', 'pilates-session', 'dance-for-15-minutes',
  'take-the-stairs-instead-of-the-lift', 'go-ice-skating', 'balance-training', 'vacuum-the-floors',
  'mop-the-floors', 'clean-the-bathroom', 'clean-the-kitchen', 'clean-the-windows', 'clean-the-oven',
  'mow-the-lawn', 'weed-the-garden', 'rake-the-leaves', 'wash-the-car', 'clean-the-car-inside',
  'declutter-your-wardrobe', 'change-the-bed-sheets', 'defrost-the-freezer', 'fix-something-broken-at-home',
  'meal-prep-for-the-week', 'walk-in-a-park-or-forest', 'go-foraging', 'walk-the-dog', 'clean-the-aquarium',
  'clean-the-cage', 'volunteer', 'help-a-neighbour', 'plant-a-tree', 'donate-blood',
  'do-the-grocery-shopping', 'study-for-an-exam', 'do-your-taxes', 'prepare-for-a-job-interview',
  'apply-for-a-job', 'make-a-phone-call-you-have-been-avoiding',
]);

/** All-day tasks you hold out on or hit a target for. */
const WILLPOWER = new Set([
  'no-alcohol-today', 'no-smoking-today', 'no-sugary-drinks-today', 'no-junk-food-today',
  'no-snacking-after-dinner', 'stay-within-your-calorie-goal', 'keep-to-your-eating-window',
  'hit-your-protein-goal', 'eat-meat-free-today', 'go-to-bed-before-11-pm', 'sleep-8-hours',
  'no-phone-in-bed', 'get-up-without-snoozing', 'no-caffeine-after-2-pm', 'wake-up-at-the-same-time',
  'max-30-minutes-of-social-media', 'no-phone-for-the-first-hour', 'screen-time-under-2-hours',
  'no-social-media-today', 'phone-free-evening', 'no-youtube-or-streaming-today',
  'no-unnecessary-spending-today', 'take-a-cold-shower', 'drink-2-litres-of-water',
  'eat-5-portions-of-fruit-and-veg',
]);

/** Effort of a library task by its id; everything not listed is light. */
export function libraryEffort(id: string | undefined): Effort {
  if (!id) return 'light';
  if (WILLPOWER.has(id)) return 'willpower';
  if (HARD.has(id)) return 'hard';
  if (ACTIVE.has(id)) return 'active';
  return 'light';
}

/**
 * Willpower tasks that are settled at the end of the day, grouped under
 * "Tonight's check" on Today, with the hour each can be ticked from (0 = any
 * time, for targets that can be hit early). The morning ones (sleep, bedtime,
 * getting up, a cold shower) are about last night or done early, so they stay
 * in the day's list and can be ticked whenever.
 */
const TONIGHT: Record<string, number> = {
  'drink-2-litres-of-water': 0,
  'eat-5-portions-of-fruit-and-veg': 0,
  'hit-your-protein-goal': 0,
  'no-alcohol-today': 18,
  'no-smoking-today': 18,
  'no-sugary-drinks-today': 18,
  'no-junk-food-today': 18,
  'stay-within-your-calorie-goal': 18,
  'eat-meat-free-today': 18,
  'keep-to-your-eating-window': 18,
  'no-caffeine-after-2-pm': 18,
  'no-unnecessary-spending-today': 18,
  'max-30-minutes-of-social-media': 18,
  'screen-time-under-2-hours': 18,
  'no-social-media-today': 18,
  'no-youtube-or-streaming-today': 18,
  'no-snacking-after-dinner': 20,
  'phone-free-evening': 21,
};

/** For a library task under "Tonight's check": the hour it can be ticked from (0 = any time). Else undefined. */
export function tonightFrom(id: string | undefined): number | undefined {
  return id ? TONIGHT[id] : undefined;
}

/** Every id named above, so a test can check they all exist. */
export const EFFORT_IDS = [...HARD, ...ACTIVE, ...WILLPOWER];
export const TONIGHT_IDS = Object.keys(TONIGHT);
