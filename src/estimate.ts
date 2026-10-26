import type { GameState } from './game.ts';
import { LIBRARY, searchLibrary } from './library.ts';
import { measuredMinutes, parseMeasured, PACE } from './measure.ts';

// Task time is estimated from the title, never picked by the player, so a
// two-minute chore can't be entered as an eight-hour task for lots of XP.
// This runs on the phone, instantly and offline. A server-side AI check can
// replace or confirm it once accounts exist.

export interface Estimate {
  minutes: number;
  /** library = a library task, rule = a known activity, default = nothing recognised. */
  source: 'library' | 'rule' | 'default';
}

/** Time for a task nothing is known about. */
export const UNKNOWN_MINUTES = 15;
/** Most a stated time ("practise speech 2 h") counts for when the activity isn't recognised. */
export const UNKNOWN_MAX_MINUTES = 60;

interface Rule {
  match: RegExp;
  /** Usual time, used when the title doesn't say how long. */
  minutes: number;
  /** Longest believable time, the cap for a stated time or distance. */
  max: number;
  /** Minutes per km, for "walk 5 km". */
  perKm?: number;
  /** Minutes per page, for "read 30 pages". */
  perPage?: number;
  /** Minutes per step, for "8,000 steps". */
  perStep?: number;
}

// Checked in order, so specific activities come before general ones
// ("meal prep" before "cook", "dishwasher" before "dishes").
const RULES: Rule[] = [
  { match: /\b(make|made|making)( up)? (my |the |your )?bed\b/, minutes: 5, max: 10 },
  { match: /\b(water|watering) (the |my )?plants?\b/, minutes: 5, max: 15 },
  { match: /\b(trash|garbage|rubbish|bins?|recycling)\b/, minutes: 5, max: 15 },
  { match: /\b(brush|floss)\w*\b|\bteeth\b/, minutes: 5, max: 10 },
  { match: /\b(vitamins?|pills?|meds|medication|supplements?)\b/, minutes: 5, max: 5 },
  { match: /\b(drink|glass(es)? of) water\b/, minutes: 5, max: 5 },
  { match: /\b(sleep|nap|bed ?time|go to bed)\b/, minutes: 10, max: 15 },
  { match: /\bmeal ?prep\w*\b/, minutes: 60, max: 180 },
  { match: /\b(cook|cooking|dinner|lunch|breakfast|bake|baking)\b/, minutes: 30, max: 90 },
  { match: /\bdishwasher\b/, minutes: 10, max: 20 },
  { match: /\b(dishes|wash up|washing up)\b/, minutes: 15, max: 30 },
  { match: /\b(laundry|washing machine|fold\w*|iron\w*)\b/, minutes: 20, max: 60 },
  { match: /\b(vacuum\w*|hoover\w*|mop\w*)\b/, minutes: 25, max: 60 },
  { match: /\b(tidy\w*|declutter\w*|organi[sz]e\w*)\b/, minutes: 15, max: 60 },
  { match: /\b(clean\w*|scrub\w*|dust\w*)\b/, minutes: 25, max: 120 },
  { match: /\b(groceries|grocery|shopping|supermarket)\b/, minutes: 45, max: 120 },
  { match: /\b(e-?mails?|inbox)\b/, minutes: 15, max: 60 },
  { match: /\b(call|phone|ring|text)\b/, minutes: 15, max: 60 },
  { match: /\b(meditat\w*|breath\w*|mindful\w*)\b/, minutes: 10, max: 60 },
  { match: /\b(journal\w*|diary|gratitude)\b/, minutes: 10, max: 30 },
  { match: /\b(stretch\w*|mobility)\b/, minutes: 10, max: 30 },
  { match: /\b(yoga|pilates)\b/, minutes: 30, max: 90 },
  { match: /\d\s*k?\s*steps\b/, minutes: 40, max: 200, perStep: 1 / PACE.stepsPerMinute },
  { match: /\b(hike|hiking)\b/, minutes: 120, max: 360, perKm: 15 },
  { match: /\b(run|running|jog|jogging)\b/, minutes: 30, max: 150, perKm: PACE.run },
  { match: /\b(walk|walking|stroll)\b/, minutes: 30, max: 150, perKm: PACE.walk },
  { match: /\b(cycle|cycling|bike|biking|ride)\b/, minutes: 45, max: 240, perKm: 3 },
  { match: /\b(swim|swimming)\b/, minutes: 45, max: 90, perKm: 30 },
  { match: /\b(gym|workout|work out|lift\w*|weights|training|exercise)\b/, minutes: 60, max: 120 },
  { match: /\b(push-?ups|sit-?ups|squats|plank)\b/, minutes: 10, max: 30 },
  { match: /\b(read|reading)\b/, minutes: 20, max: 120, perPage: 1.5 },
  { match: /\bdeep work\b|\bfocus(ed)? (block|session|time)\b/, minutes: 60, max: 240 },
  { match: /\b(study|studying|homework|revise|revision|learn\w*|course|lecture)\b/, minutes: 45, max: 180 },
  { match: /\b(practi[cs]e|piano|guitar|violin|drums|sing\w*)\b/, minutes: 30, max: 90 },
  { match: /\b(draw\w*|paint\w*|sketch\w*|writ\w*)\b/, minutes: 30, max: 120 },
];

/** "45 min", "1.5 h", "2 hours", "10-minute" in a title, as minutes. */
function statedMinutes(title: string): number | undefined {
  const m = title.match(/(\d+(?:[.,]\d+)?)[\s-]*(h|hr|hrs|hours?|m|mins?|minutes?)\b/);
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(',', '.'));
  return m[2].startsWith('h') ? n * 60 : n;
}

/** "8,000 steps", "8000 steps", "10k steps". */
function statedSteps(title: string): number | undefined {
  const m = title.match(/(\d{1,3}(?:[,.' ]\d{3})+|\d+(?:[.,]\d+)?)\s*(k)?\s*steps\b/);
  if (!m) return undefined;
  if (m[2]) return parseFloat(m[1].replace(',', '.')) * 1000;
  return Number(m[1].replace(/[,.' ]/g, ''));
}

function statedNumber(title: string, unit: RegExp): number | undefined {
  const m = title.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${unit.source}`));
  return m ? parseFloat(m[1].replace(',', '.')) : undefined;
}

/** Rounds to a sensible step (5 min below an hour, 15 min above) within 5 min and the cap. */
function tidy(minutes: number, max: number): number {
  const capped = Math.min(Math.max(minutes, 5), max);
  const step = capped < 60 ? 5 : 15;
  return Math.min(Math.max(5, Math.round(capped / step) * step), max);
}

/** How long a task with this title takes, judged from the title alone. */
export function estimateMinutes(title: string): Estimate {
  const t = title.trim().toLowerCase().replace(/\s+/g, ' ');
  const exact = LIBRARY.find((l) => l.title.toLowerCase() === t);
  if (exact) return { minutes: exact.minutes, source: 'library' };
  // Walk, Run or Steps with the player's own amount: by pace, within the same caps.
  const measured = parseMeasured(t);
  if (measured) {
    const max = RULES.find((r) => r.match.test(t))?.max ?? UNKNOWN_MAX_MINUTES;
    return { minutes: tidy(measuredMinutes(measured.measure, measured.amount), max), source: 'library' };
  }

  const rule = RULES.find((r) => r.match.test(t));
  const stated = statedMinutes(t);
  if (rule) {
    const km = rule.perKm ? statedNumber(t, /(km|kilometers?|kilometres?)\b/) : undefined;
    const pages = rule.perPage ? statedNumber(t, /pages?\b/) : undefined;
    const steps = rule.perStep ? statedSteps(t) : undefined;
    const raw =
      stated ?? (km !== undefined ? km * rule.perKm! : pages !== undefined ? pages * rule.perPage! : steps !== undefined ? steps * rule.perStep! : rule.minutes);
    return { minutes: tidy(raw, rule.max), source: 'rule' };
  }

  // The closest library task, when every word of the title fits it.
  const near = t.length >= 3 ? searchLibrary(t, 1)[0] : undefined;
  if (near && stated === undefined) return { minutes: near.minutes, source: 'library' };
  if (stated !== undefined) return { minutes: tidy(stated, near ? Math.max(near.minutes, UNKNOWN_MAX_MINUTES) : UNKNOWN_MAX_MINUTES), source: 'rule' };
  return { minutes: UNKNOWN_MINUTES, source: 'default' };
}

/**
 * Re-times saved tasks with the estimate, for tasks whose time was picked by
 * hand in older versions. Past completions keep the XP they earned.
 */
export function withEstimatedTimes(state: GameState): GameState {
  let changed = false;
  const tasks = state.tasks.map((t) => {
    const minutes = estimateMinutes(t.title).minutes;
    if (t.minutes === minutes) return t;
    changed = true;
    return { ...t, minutes };
  });
  return changed ? { ...state, tasks } : state;
}
