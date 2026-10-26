import { isDoneToday, timesPerWeek, weekStart, type GameState, type Task } from './game.ts';
import { libraryMatch, libraryTask } from './library.ts';

// Library tasks that already contain another one: once the bigger task is
// done, the smaller one is greyed out until it comes round again, so the same
// work doesn't pay twice ("Meal prep for the week" already plans the meals).

/** Bigger task -> the tasks it includes, by library id. */
const INCLUDES: Record<string, string[]> = {
  'meal-prep-for-the-week': ['plan-meals-for-the-week', 'pack-lunch-for-tomorrow'],
  'clean-the-bathroom': ['clean-the-toilet'],
  'clean-the-kitchen': ['wipe-kitchen-counters', 'clean-the-stovetop'],
  'deep-work-block-90-min': ['focus-session-25-min'],
  'do-the-grocery-shopping': ['write-a-shopping-list'],
  'organise-your-documents': ['sort-the-mail-and-papers'],
  'yoga-session': ['stretch-for-10-minutes'],
  'go-hiking': ['walk', 'spend-30-minutes-outside'],
  'no-social-media-today': ['max-30-minutes-of-social-media'],
  'write-a-short-story': ['write-for-20-minutes'],
  'finish-a-book': ['read-a-chapter-of-a-book', 'read-for-20-minutes'],
  'have-dinner-together-without-phones': ['eat-without-screens'],
  'home-workout': ['20-push-ups', 'do-50-squats', 'plank-for-2-minutes', 'do-30-crunches'],
  'walk-in-a-park-or-forest': ['walk'],
  'take-a-mindful-walk': ['walk'],
  'walk-the-dog': ['walk'],
  'spend-30-minutes-outside': ['get-15-minutes-of-sunlight'],
  'learn-something-new-for-30-minutes': ['take-an-online-course-lesson', 'learn-to-code-for-30-minutes', 'watch-an-educational-video'],
  'practise-a-language-for-15-minutes': ['learn-10-new-words'],
  'review-your-budget': ['track-your-spending', 'check-your-bank-accounts'],
  'clear-your-email-inbox': ['reply-to-important-messages'],
  'host-friends-at-home': ['meet-a-friend'],
  'phone-free-evening': ['do-a-digital-free-hour'],
};

/** The same thing under two names: either one covers the other. */
const SAME: [string, string][] = [
  ['go-to-the-gym', 'strength-workout'],
  ['cook-a-healthy-meal', 'cook-instead-of-ordering'],
  ['try-a-new-recipe', 'cook-something-creative'],
  ['read-for-20-minutes', 'read-a-chapter-of-a-book'],
  ['practise-an-instrument', 'play-music'],
  ['go-swimming', 'go-for-a-swim-in-a-lake'],
  ['hiit-session', 'home-workout'],
];

/** Smaller task -> the tasks that cover it. */
export const COVERED_BY: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  const add = (big: string, small: string) => {
    const list = (out[small] ??= []);
    if (!list.includes(big)) list.push(big);
  };
  for (const [big, smalls] of Object.entries(INCLUDES)) for (const small of smalls) add(big, small);
  for (const [a, b] of SAME) {
    add(a, b);
    add(b, a);
  }
  return out;
})();

/** Every id named above, so a test can check they all exist. */
export const COVER_IDS = [...new Set([...Object.keys(COVERED_BY), ...Object.values(COVERED_BY).flat()])];

/** The library task a task was added from: saved with it, or matched by its title (older tasks, typed ones). */
export function libraryIdOf(task: Pick<Task, 'title' | 'libraryId'>): string | undefined {
  if (task.libraryId && libraryTask(task.libraryId)) return task.libraryId;
  return libraryMatch(task.title)?.id;
}

/**
 * The task that covers this one right now, if any: a task that includes it,
 * done today, or this week for a once-a-week task (one week's meal prep plans
 * that week's meals). A task already done itself stays done.
 */
export function coveredBy(state: GameState, task: Task, today: string): Task | undefined {
  const id = libraryIdOf(task);
  const covers = id ? COVERED_BY[id] : undefined;
  if (!covers) return undefined;
  if (isDoneToday(state, task, today)) return undefined;
  const weekly = task.daily && timesPerWeek(task) === 1;
  const from = weekly ? weekStart(today) : today;
  return state.tasks.find((big) => {
    if (big.id === task.id) return false;
    const bigId = libraryIdOf(big);
    if (!bigId || !covers.includes(bigId)) return false;
    return state.completions.some((c) => c.taskId === big.id && c.date >= from && c.date <= today);
  });
}

/**
 * Library tasks already on the list, which the library and suggestions leave
 * out: every repeating task, and one-offs until they are done and gone (one
 * finished today still shows under "Done today").
 */
export function ownedLibraryIds(state: GameState, today: string): Set<string> {
  const ids = new Set<string>();
  for (const t of state.tasks) {
    if (!t.daily && state.completions.some((c) => c.taskId === t.id && c.date < today)) continue;
    const id = libraryIdOf(t);
    if (id) ids.add(id);
  }
  return ids;
}
