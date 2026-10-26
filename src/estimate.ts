import { libraryEffort, tonightFrom, type Effort } from './effort.ts';
import type { GameState, Task } from './game.ts';
import { LIBRARY, libraryExact, libraryMatch, libraryTask, searchLibrary } from './library.ts';
import { measuredMinutes, parseMeasured, PACE } from './measure.ts';

// Task time is estimated from the title, never picked by the player, so a
// two-minute chore can't be entered as an eight-hour task for lots of XP.
// This runs on the phone, instantly and offline. A server-side AI check can
// replace or confirm it once accounts exist.

export interface Estimate {
  minutes: number;
  /** library = a library task, rule = a known activity, default = nothing recognised. */
  source: 'library' | 'rule' | 'default';
  /** How hard it is (effort.ts), judged the same way as the time. */
  effort: Effort;
}

/** Time for a task nothing is known about. */
export const UNKNOWN_MINUTES = 15;
/** Most a stated time ("practise speech 2 h") counts for when the activity isn't recognised. */
export const UNKNOWN_MAX_MINUTES = 60;

interface Rule {
  match: RegExp;
  /** The same activity in German. German packs words together ("Küchenputz"), so these match the start of a word. */
  de?: RegExp;
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
  /** Missing = light. */
  effort?: Effort;
}

/** German words that start a word (or a compound): "putz" finds "Putzen" and "Fensterputz" … only at the start, so "Küchenputz" needs "küche" too. */
const de = (words: string): RegExp => new RegExp(`(?<!\\p{L})(${words})`, 'u');

// Checked in order, so specific activities come before general ones
// ("meal prep" before "cook", "dishwasher" before "dishes").
// The German words don't depend on the app's language: saved tasks are re-timed
// on start, and a switch of language must not change their XP.
const RULES: Rule[] = [
  { match: /\b(make|made|making)( up)? (my |the |your )?bed\b/, de: de('bett (machen|richten)|bett ?machen'), minutes: 5, max: 10 },
  { match: /\b(water|watering) (the |my )?plants?\b/, de: de('(pflanzen|blumen) gießen|gieß'), minutes: 5, max: 15 },
  { match: /\b(trash|garbage|rubbish|bins?|recycling)\b/, de: de('müll|mist raus|abfall|altpapier'), minutes: 5, max: 15 },
  { match: /\b(brush|floss)\w*\b|\bteeth\b/, de: de('zähne|zahnseide'), minutes: 5, max: 10 },
  { match: /\b(vitamins?|pills?|meds|medication|supplements?)\b/, de: de('vitamin|tablette|medikament|nahrungsergänzung'), minutes: 5, max: 5 },
  { match: /\b(drink|glass(es)? of) water\b/, de: de('wasser trinken|glas wasser|gläser wasser'), minutes: 5, max: 5 },
  { match: /\b(sleep|nap|bed ?time|go to bed)\b/, de: de('schlaf|nickerchen|ins bett'), minutes: 10, max: 15 },
  { match: /\bmeal ?prep\w*\b/, de: de('vorkoch|meal ?prep'), minutes: 60, max: 180, effort: 'active' },
  { match: /\b(cook|cooking|dinner|lunch|breakfast|bake|baking)\b/, de: de('koch|abendessen|mittagessen|frühstück|backen\\b'), minutes: 30, max: 90 },
  { match: /\bdishwasher\b/, de: de('spülmaschine|geschirrspüler'), minutes: 10, max: 20 },
  { match: /\b(dishes|wash up|washing up)\b/, de: de('abwasch|geschirr|spülen'), minutes: 15, max: 30 },
  { match: /\b(laundry|washing machine|fold\w*|iron\w*)\b/, de: de('wäsche|waschmaschine|bügel|falten|zusammenlegen'), minutes: 20, max: 60 },
  { match: /\b(vacuum\w*|hoover\w*|mop\w*)\b/, de: de('staubsaug|saugen|wischen|boden wischen'), minutes: 25, max: 60, effort: 'active' },
  { match: /\b(tidy\w*|declutter\w*|organi[sz]e\w*)\b/, de: de('aufräum|ausmisten|ordnen|sortier'), minutes: 15, max: 60 },
  { match: /\b(clean\w*|scrub\w*|dust\w*)\b/, de: de('putz|reinig|sauber|schrubb|staub|küche|bad\\b'), minutes: 25, max: 120 },
  { match: /\b(groceries|grocery|shopping|supermarket)\b/, de: de('einkauf|wocheneinkauf|supermarkt|lebensmittel'), minutes: 45, max: 120, effort: 'active' },
  { match: /\b(e-?mails?|inbox)\b/, de: de('posteingang'), minutes: 15, max: 60 },
  { match: /\b(call|phone|ring|text)\b/, de: de('anruf|telefonier|nachricht'), minutes: 15, max: 60 },
  { match: /\b(meditat\w*|breath\w*|mindful\w*)\b/, de: de('meditier|meditation|atem|achtsam'), minutes: 10, max: 60 },
  { match: /\b(journal\w*|diary|gratitude)\b/, de: de('tagebuch|dankbar|journal'), minutes: 10, max: 30 },
  { match: /\b(stretch\w*|mobility)\b/, de: de('dehn|stretch|mobilit'), minutes: 10, max: 30 },
  { match: /\b(yoga|pilates)\b/, de: de('yoga|pilates'), minutes: 30, max: 90, effort: 'active' },
  { match: /\d\s*k?\s*steps\b/, de: de('\\d[\\d.]*\\s*schritte'), minutes: 40, max: 200, perStep: 1 / PACE.stepsPerMinute, effort: 'active' },
  { match: /\b(hike|hiking)\b/, de: de('wander'), minutes: 120, max: 360, perKm: 15, effort: 'hard' },
  { match: /\b(run|running|jog|jogging)\b/, de: de('lauf|jogg'), minutes: 30, max: 150, perKm: PACE.run, effort: 'hard' },
  { match: /\b(walk|walking|stroll)\b/, de: de('gehen|spazier'), minutes: 30, max: 150, perKm: PACE.walk, effort: 'active' },
  { match: /\b(cycle|cycling|bike|biking|ride)\b/, de: de('rad\\b|fahrrad|radfahr|radel'), minutes: 45, max: 240, perKm: 3, effort: 'active' },
  { match: /\b(swim|swimming)\b/, de: de('schwimm'), minutes: 45, max: 90, perKm: 30, effort: 'hard' },
  { match: /\b(gym|workout|work out|lift\w*|weights|training|exercise)\b/, de: de('fitnessstudio|gym|workout|training|trainier|krafttraining|hantel|sport machen|sport treiben|sporteln'), minutes: 60, max: 120, effort: 'hard' },
  { match: /\b(push-?ups|sit-?ups|squats|plank)\b/, de: de('liegestütz|kniebeuge|sit-?ups|plank|unterarmstütz'), minutes: 10, max: 30, effort: 'hard' },
  { match: /\b(read|reading)\b/, de: de('lesen|lese'), minutes: 20, max: 120, perPage: 1.5 },
  { match: /\bdeep work\b|\bfocus(ed)? (block|session|time)\b/, de: de('fokuszeit|konzentriert arbeiten|deep work'), minutes: 60, max: 240 },
  { match: /\b(study|studying|homework|revise|revision|learn\w*|course|lecture)\b/, de: de('lern|hausaufgabe|hausübung|vorlesung|kurs|studier|wiederhol'), minutes: 45, max: 180 },
  { match: /\b(practi[cs]e|piano|guitar|violin|drums|sing\w*)\b/, de: de('üben|übung|klavier|gitarre|geige|schlagzeug|sing'), minutes: 30, max: 90 },
  { match: /\b(draw\w*|paint\w*|sketch\w*|writ\w*)\b/, de: de('zeichn|malen|skizz|schreib'), minutes: 30, max: 120 },
];

/** "45 min", "1.5 h", "2 hours", "10-minute", "2 Stunden" in a title, as minutes. */
function statedMinutes(title: string): number | undefined {
  const m = title.match(/(\d+(?:[.,]\d+)?)[\s-]*(h|hr|hrs|hours?|std|stunden?|m|mins?|minutes?|minuten)\b/);
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(',', '.'));
  return /^[hs]/.test(m[2]) ? n * 60 : n;
}

/** "8,000 steps", "8000 steps", "10k steps", "8.000 Schritte". */
function statedSteps(title: string): number | undefined {
  const m = title.match(/(\d{1,3}(?:[,.' ]\d{3})+|\d+(?:[.,]\d+)?)\s*(k)?\s*(steps|schritte)\b/);
  if (!m) return undefined;
  if (m[2]) return parseFloat(m[1].replace(',', '.')) * 1000;
  return Number(m[1].replace(/[,.' ]/g, ''));
}

function statedNumber(title: string, unit: RegExp): number | undefined {
  const m = title.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${unit.source}`));
  return m ? parseFloat(m[1].replace(',', '.')) : undefined;
}

function fits(rule: Rule, title: string): boolean {
  return rule.match.test(title) || !!rule.de?.test(title);
}

/** Rounds to a sensible step (5 min below an hour, 15 min above) within 5 min and the cap. */
function tidy(minutes: number, max: number): number {
  const capped = Math.min(Math.max(minutes, 5), max);
  const step = capped < 60 ? 5 : 15;
  return Math.min(Math.max(5, Math.round(capped / step) * step), max);
}

/** How long a task with this title takes, and how hard it is, judged from the title alone. */
export function estimateMinutes(title: string): Estimate {
  const t = title.trim().toLowerCase().replace(/\s+/g, ' ');
  const exact = libraryExact(t);
  if (exact) return { minutes: exact.minutes, source: 'library', effort: libraryEffort(exact.id) };
  // Walk, Run or Steps with the player's own amount: by pace, within the same caps.
  const measured = parseMeasured(t);
  if (measured) {
    const max = RULES.find((r) => fits(r, t))?.max ?? UNKNOWN_MAX_MINUTES;
    const effort = libraryEffort(LIBRARY.find((l) => l.measure === measured.measure)?.id);
    return { minutes: tidy(measuredMinutes(measured.measure, measured.amount), max), source: 'library', effort };
  }

  const rule = RULES.find((r) => fits(r, t));
  const stated = statedMinutes(t);
  if (rule) {
    const km = rule.perKm ? statedNumber(t, /(km|kilometers?|kilometres?)\b/) : undefined;
    const pages = rule.perPage ? statedNumber(t, /(pages?|seiten?)\b/) : undefined;
    const steps = rule.perStep ? statedSteps(t) : undefined;
    const raw =
      stated ?? (km !== undefined ? km * rule.perKm! : pages !== undefined ? pages * rule.perPage! : steps !== undefined ? steps * rule.perStep! : rule.minutes);
    return { minutes: tidy(raw, rule.max), source: 'rule', effort: rule.effort ?? 'light' };
  }

  // The closest library task, when every word of the title fits it.
  const near = t.length >= 3 ? searchLibrary(t, 1)[0] : undefined;
  const effort = libraryEffort(near?.id);
  if (near && stated === undefined) return { minutes: near.minutes, source: 'library', effort };
  if (stated !== undefined) return { minutes: tidy(stated, near ? Math.max(near.minutes, UNKNOWN_MAX_MINUTES) : UNKNOWN_MAX_MINUTES), source: 'rule', effort };
  return { minutes: UNKNOWN_MINUTES, source: 'default', effort };
}

/** The library task a task came from: its saved id, else the one with its title. */
function libraryIdFor(task: Pick<Task, 'title' | 'libraryId'>): string | undefined {
  if (task.libraryId && libraryTask(task.libraryId)) return task.libraryId;
  return libraryMatch(task.title)?.id;
}

/** For a task under "Tonight's check" (effort.ts): the hour it can be ticked from, 0 = any time. Else undefined. */
export function tonightHour(task: Pick<Task, 'title' | 'libraryId'>): number | undefined {
  return tonightFrom(libraryIdFor(task));
}

/** Whether it is too early in the day to tick this task off ("No alcohol today" waits for the evening). */
export function tooEarlyToTick(task: Pick<Task, 'title' | 'libraryId'>, now: number): boolean {
  return new Date(now).getHours() < (tonightHour(task) ?? 0);
}

const effortCache = new Map<string, Effort>();

/**
 * How hard a task is: from the library task it was added from, else judged
 * from its title like its time. Asked on every render, so remembered per title.
 */
export function taskEffort(task: Pick<Task, 'title' | 'libraryId'>): Effort {
  const id = libraryIdFor(task);
  if (id) return libraryEffort(id);
  let effort = effortCache.get(task.title);
  if (!effort) {
    effort = estimateMinutes(task.title).effort;
    effortCache.set(task.title, effort);
  }
  return effort;
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
