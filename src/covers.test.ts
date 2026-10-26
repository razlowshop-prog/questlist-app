import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COVER_IDS, COVERED_BY, coveredBy, libraryIdOf, ownedLibraryIds } from './covers.ts';
import { addTask, emptyState, toggleTask, type GameState } from './game.ts';
import { LIBRARY, libraryTask, slug } from './library.ts';
import { syncPerfectDay } from './moments.ts';

const MON = '2026-10-19';
const WED = '2026-10-21';
const NEXT_MON = '2026-10-26';
const old = '2026-01-01T00:00:00Z';

/** A player with these tasks, each [id, title, times a week (true = every day, false = once)]. */
function player(...tasks: [string, string, boolean | number][]): GameState {
  let s: GameState = { ...emptyState, joinedAt: MON };
  for (const [id, title, repeat] of tasks) s = addTask(s, title, repeat, id, 15);
  return { ...s, tasks: s.tasks.map((t) => ({ ...t, createdAt: old })) };
}

test('library ids are unique, stable and every covered pair names real tasks', () => {
  const ids = LIBRARY.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(slug('Do the dishes'), 'do-the-dishes');
  assert.equal(slug("Brush your pet's teeth"), 'brush-your-pets-teeth');
  assert.equal(slug('Deep work block (90 min)'), 'deep-work-block-90-min');
  for (const id of COVER_IDS) assert.ok(libraryTask(id), id);
  for (const [small, bigs] of Object.entries(COVERED_BY)) assert.ok(!bigs.includes(small), small);
  // Fabian's example.
  assert.ok(COVERED_BY['plan-meals-for-the-week'].includes('meal-prep-for-the-week'));
});

test('a done bigger task greys out the smaller one for the day', () => {
  let s = player(['big', 'Clean the kitchen', true], ['small', 'Wipe kitchen counters', true]);
  assert.equal(coveredBy(s, s.tasks[1], WED), undefined);
  s = toggleTask(s, 'big', WED);
  assert.equal(coveredBy(s, s.tasks[1], WED)?.id, 'big');
  assert.equal(coveredBy(s, s.tasks[0], WED), undefined, 'not the other way round');
  // A new day, a new chance.
  assert.equal(coveredBy(s, s.tasks[1], '2026-10-22'), undefined);
});

test('for a once-a-week task, it lasts the week', () => {
  let s = player(['prep', 'Meal prep for the week', 1], ['plan', 'Plan meals for the week', 1]);
  s = toggleTask(s, 'prep', MON);
  assert.equal(coveredBy(s, s.tasks[1], WED)?.id, 'prep');
  assert.equal(coveredBy(s, s.tasks[1], NEXT_MON), undefined);
});

test('the same task under two names covers both ways', () => {
  let s = player(['gym', 'Go to the gym', 3], ['lift', 'Strength workout', 3]);
  s = toggleTask(s, 'lift', WED);
  assert.equal(coveredBy(s, s.tasks[0], WED)?.id, 'lift');
});

test('a task done before the bigger one stays done, and unrelated tasks are never covered', () => {
  let s = player(['big', 'Clean the kitchen', true], ['small', 'Wipe kitchen counters', true], ['x', 'Do the dishes', true]);
  s = toggleTask(s, 'small', WED);
  s = toggleTask(s, 'big', WED);
  assert.equal(coveredBy(s, s.tasks[1], WED), undefined);
  assert.equal(coveredBy(s, s.tasks[2], WED), undefined);
});

test('Walk, Run and Steps are matched whatever the amount', () => {
  let s = player(['hike', 'Go hiking', false], ['walk', 'Walk 3 km', 5]);
  s = toggleTask(s, 'hike', WED);
  assert.equal(coveredBy(s, s.tasks[1], WED)?.id, 'hike');
  assert.equal(coveredBy(s, s.tasks[1], '2026-10-22'), undefined, 'a walk a few times a week: only that day');
  assert.equal(libraryIdOf({ title: 'Walk 6,000 steps' }), 'steps');
  assert.equal(libraryIdOf({ title: 'Feed the dragon' }), undefined);
  assert.equal(libraryIdOf({ title: 'Something renamed', libraryId: 'walk' }), 'walk');
});

test('a covered task counts as done for a perfect day', () => {
  let s = player(['big', 'Clean the kitchen', true], ['small', 'Wipe kitchen counters', true], ['a', 'Do the dishes', true]);
  s = toggleTask(s, 'big', WED);
  s = toggleTask(s, 'a', WED);
  assert.equal(syncPerfectDay(s, WED).earned, true);
});

test('library tasks on the list are left out of the library until they are done and gone', () => {
  const s0 = player(['bed', 'Make your bed', true], ['once', 'Clean the oven', false], ['walk', 'Walk 30 min', 5], ['own', 'Feed the dragon', true]);
  assert.deepEqual([...ownedLibraryIds(s0, WED)].sort(), ['clean-the-oven', 'make-your-bed', 'walk']);
  // A one-off finished today still shows under "Done today"; from tomorrow it is back in the library.
  const s1 = toggleTask(s0, 'once', WED);
  assert.ok(ownedLibraryIds(s1, WED).has('clean-the-oven'));
  assert.ok(!ownedLibraryIds(s1, '2026-10-22').has('clean-the-oven'));
  // Repeating tasks stay out for good while on the list.
  const s2 = toggleTask(s1, 'bed', WED);
  assert.ok(ownedLibraryIds(s2, '2026-10-22').has('make-your-bed'));
});

test('the overlaps Fabian approved on 2026-10-26 are in', () => {
  const covers = (big: string, small: string) => COVERED_BY[small]?.includes(big) ?? false;
  for (const small of ['20-push-ups', 'do-50-squats', 'plank-for-2-minutes', 'do-30-crunches']) assert.ok(covers('home-workout', small), small);
  assert.ok(covers('hiit-session', 'home-workout') && covers('home-workout', 'hiit-session'));
  for (const walk of ['walk-in-a-park-or-forest', 'take-a-mindful-walk', 'walk-the-dog']) assert.ok(covers(walk, 'walk'), walk);
  assert.ok(covers('phone-free-evening', 'do-a-digital-free-hour'));
  assert.ok(!covers('phone-free-evening', 'no-phone-in-bed'), 'bed stays its own task');
  assert.ok(!covers('walk', 'steps') && !covers('run', 'steps'), 'steps are the whole day');
  assert.ok(!covers('write-in-your-journal', 'write-down-3-things-you-are-grateful-for'));
});
