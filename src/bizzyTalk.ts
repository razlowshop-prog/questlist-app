import type { BizzyMood } from './bizzy.ts';
import { decimal, t, tn } from './i18n.ts';

// What Bizzy says and does when he is tapped on the streak card: short lines
// about the day (tasks, streak, level, tickets, awards, his next evolution),
// lines that fit his mood, and a few cheers. Kept short so a line fits his
// small speech bubble in both languages.

/** What he knows about the player's day. */
export interface TalkContext {
  mood: BizzyMood;
  /** The player's name, or empty while they haven't typed one. */
  name: string;
  hour: number;
  tasksLeft: number;
  tasksDone: number;
  streak: number;
  /** Days to the next streak multiplier step and that step's bonus (0.2 = ×1.2). */
  nextBonus?: { daysLeft: number; bonus: number };
  level: number;
  xpToLevel: number;
  maxed: boolean;
  tickets: number;
  /** Award tiers reached but not claimed yet. */
  claimable: number;
  /** An award close to its next tier (three quarters or more of the way), already in the player's language. */
  nearAward?: string;
  canEvolve: boolean;
  /** The level his next form needs, if he isn't fully grown. */
  evolveAt?: number;
}

export interface Line {
  /** Stays the same across languages, so recent lines aren't repeated. */
  key: string;
  text: string;
}

/** Every line that makes sense right now, each with how much it matters (higher comes up more often). */
export function bizzyLines(c: TalkContext): { line: Line; weight: number }[] {
  const out: { line: Line; weight: number }[] = [];
  const add = (key: string, text: string, weight = 1) => out.push({ line: { key, text }, weight });

  // His mood first: it says the most about the day.
  if (c.mood === 'worried') {
    add('risk', t('Your streak is at risk! One quick task saves it.'), 4);
    if (c.streak > 1) add('riskDays', t('{n} days of streak. Let’s keep them tonight!', { n: c.streak }), 3);
    add('riskBed', t('Just one task before bed and we’re safe.'), 3);
  }
  if (c.mood === 'sleepy') {
    add('awake', t('Huh? I’m awake! … mostly.'), 3);
    add('night', t('Good night! Tomorrow the streak goes on.'), 2);
    add('rest', t('Sleep well. Rested bees work better.'), 2);
  }
  if (c.mood === 'proud') {
    add('allDone', t('All done today. You’re amazing!'), 3);
    if (c.tasksDone > 1) add('doneCount', t('{n} tasks done. Time to relax!', { n: c.tasksDone }), 3);
    add('perfect', t('A perfect day! I’m so proud of you.'), 3);
  }

  // Things worth doing now.
  if (c.claimable > 0) add('claim', tn(c.claimable, 'An award is waiting in your profile!', '{n} awards are waiting in your profile!'), 3);
  if (c.canEvolve) add('evolve', t('I can evolve! Tap Evolve under me.'), 3);
  if (c.tickets > 0) add('tickets', tn(c.tickets, 'You have a ticket. Spin the wheel!', '{n} tickets ready. Spin the wheel!'), 2);

  // Today's tasks.
  if (c.mood === 'happy') {
    if (c.tasksLeft + c.tasksDone === 0) add('none', t('Nothing planned yet. Add a task with +!'), 3);
    else if (c.tasksLeft === 1) add('lastOne', t('Just 1 task left. You’ve got this!'), 3);
    else if (c.tasksLeft > 1) add('left', t('{n} tasks left today. One at a time!', { n: c.tasksLeft }), 2);
    if (c.tasksDone > 0 && c.tasksLeft > 0) add('going', tn(c.tasksDone, '1 done already. Keep it up!', '{n} done already. Keep it up!'), 2);
    if (c.hour >= 5 && c.hour < 11 && c.tasksDone === 0 && c.tasksLeft > 0) add('morning', t('Good morning! Which task do we start with?'), 2);
  }

  // Streak, level, awards, growing up.
  if (c.streak === 0) add('light', t('Finish one task to light your streak!'), 2);
  else if (c.streak > 1) add('streak', t('{n}-day streak! Let’s make it {m}.', { n: c.streak, m: c.streak + 1 }));
  if (c.nextBonus && c.streak > 0) add('bonus', tn(c.nextBonus.daysLeft, '1 more day to a ×{x} XP bonus!', '{n} more days to a ×{x} XP bonus!', { x: decimal(1 + c.nextBonus.bonus) }));
  if (!c.maxed) add('level', t('{n} XP to level {l}. You can do it!', { n: c.xpToLevel, l: c.level + 1 }));
  if (c.nearAward) add('award', t('{award} is almost yours!', { award: c.nearAward }));
  if (!c.canEvolve && c.evolveAt) add('grow', t('At level {n} I can evolve. Help me grow!', { n: c.evolveAt }));

  // Cheers that always fit.
  add('hi', c.name ? t('Hi {name}! Happy to see you.', { name: c.name }) : t('Hi! Happy to see you.'));
  add('steps', t('Small steps, big wins.'));
  add('better', t('You’re doing better than you think.'));
  add('done', t('Done is better than perfect.'));
  add('stronger', t('Every task makes me a bit stronger!'));
  return out;
}

/** Picks a line at random by weight, skipping the `recent` ones while others are left. */
export function pickLine(c: TalkContext, recent: string[], random = Math.random): Line {
  const all = bizzyLines(c);
  const fresh = all.filter((l) => !recent.includes(l.line.key));
  const pool = fresh.length ? fresh : all;
  let roll = random() * pool.reduce((n, l) => n + l.weight, 0);
  for (const l of pool) {
    roll -= l.weight;
    if (roll < 0) return l.line;
  }
  return pool[pool.length - 1].line;
}

/** His greeting, for when he waves. */
export function greeting(c: TalkContext): Line {
  return bizzyLines(c).find((l) => l.line.key === 'hi')!.line;
}

/** What he says when tapped many times in a row. */
export function tickleLine(): Line {
  return { key: 'tickle', text: t('Hehe, that tickles!') };
}

export type Reaction = 'giggle' | 'hop' | 'wave' | 'loop' | 'blush' | 'wiggle' | 'zoom' | 'burst' | 'worry' | 'wake' | 'proud';

/** The surprise mix: one of these on any tap. */
export const SURPRISES: Reaction[] = ['giggle', 'hop', 'wave', 'loop', 'blush', 'wiggle', 'zoom', 'burst'];
/** What fits each mood; a happy Bizzy just picks from the surprises. */
const FITS: Partial<Record<BizzyMood, Reaction>> = { worried: 'worry', sleepy: 'wake', proud: 'proud' };

/**
 * His reaction to a tap: in a worried, sleepy or proud mood mostly the one
 * that fits it (six times in ten), otherwise a surprise, never the same one
 * twice in a row.
 */
export function pickReaction(mood: BizzyMood, last: Reaction | undefined, random = Math.random): Reaction {
  const fits = FITS[mood];
  if (fits && fits !== last && random() < 0.6) return fits;
  const pool = SURPRISES.filter((r) => r !== last);
  return pool[Math.floor(random() * pool.length) % pool.length];
}
