import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateMinutes, UNKNOWN_MAX_MINUTES, UNKNOWN_MINUTES, withEstimatedTimes } from './estimate.ts';
import { addTask, emptyState } from './game.ts';
import { LIBRARY } from './library.ts';

const min = (t: string) => estimateMinutes(t).minutes;

test('library tasks keep their library time', () => {
  for (const l of LIBRARY.slice(0, 40)) assert.equal(min(l.title), l.minutes, l.title);
  assert.equal(estimateMinutes('  make YOUR bed ').source, 'library');
});

test('common phrasings are recognised', () => {
  assert.equal(min('make my bed'), 5);
  assert.equal(min('Water the plants'), 5);
  assert.equal(min('Take my vitamins'), 5);
  assert.equal(min('Meal prep'), 60);
  assert.equal(min('cook dinner'), 30);
  assert.equal(min('Gym session'), 60);
  assert.equal(min('Deep work'), 60);
  assert.equal(min('Study for my exam'), 45);
});

test('a stated time can not inflate a short chore', () => {
  assert.equal(min('make my bed for 8 hours'), 10);
  assert.equal(min('take out the trash 3h'), 15);
  assert.equal(min('sleep 8 hours'), 5); // a library task: the bedtime routine, not the night
  assert.equal(min('nap 3 hours'), 15);
  assert.equal(min('take vitamins 2 hours'), 5);
});

test('a stated time or distance counts within what is believable', () => {
  assert.equal(min('Read for 30 minutes'), 30);
  assert.equal(min('Read 40 pages'), 60);
  assert.equal(min('walk 10 km'), 120);
  assert.equal(min('run 5km'), 30);
  assert.equal(min('run 100 km'), 150);
  assert.equal(min('Study 2 hours'), 120);
  assert.equal(min('Study 1,5 h'), 90);
  assert.equal(min('Study 10 hours'), 180);
});

test('unknown tasks get a short default, stated times are capped', () => {
  assert.deepEqual(estimateMinutes('Fix the bike light zzz'), estimateMinutes('Fix the bike light zzz'));
  assert.equal(estimateMinutes('Qwerty thing').source, 'default');
  assert.equal(min('Qwerty thing'), UNKNOWN_MINUTES);
  assert.equal(min('Qwerty thing 45 min'), 45);
  assert.equal(min('Qwerty thing 8 hours'), UNKNOWN_MAX_MINUTES);
  assert.equal(min('x'), UNKNOWN_MINUTES);
});

test('hand-picked times from older versions are replaced, completions untouched', () => {
  let s = addTask(emptyState, 'Make my bed', true, 'a', 480);
  s = addTask(s, 'Do the dishes', true, 'b', 15);
  s = { ...s, completions: [{ taskId: 'a', date: '2026-10-20', xp: 150, minutes: 480 }] };
  const next = withEstimatedTimes(s);
  assert.deepEqual(next.tasks.map((t) => t.minutes), [5, 15]);
  assert.equal(next.completions, s.completions);
  assert.equal(withEstimatedTimes(next), next); // nothing left to change
});
