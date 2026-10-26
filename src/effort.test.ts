import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFORT_IDS, libraryEffort, TONIGHT_IDS } from './effort.ts';
import { estimateMinutes, tonightHour, tooEarlyToTick } from './estimate.ts';
import { addTask, emptyState, isDoneToday, toggleTask, xpFor } from './game.ts';
import { LIBRARY, libraryTask } from './library.ts';

const xpOf = (id: string) => xpFor(libraryTask(id)!.minutes, libraryEffort(id));

test('every effort list names a real library task, once', () => {
  for (const id of EFFORT_IDS) assert.ok(libraryTask(id), id);
  assert.equal(new Set(EFFORT_IDS).size, EFFORT_IDS.length);
});

test('library XP matches the table Fabian approved (2026-10-26)', () => {
  assert.equal(xpOf('go-skiing'), 140);
  assert.equal(xpOf('go-hiking'), 85);
  assert.equal(xpOf('deep-clean-one-room'), 70);
  assert.equal(xpOf('20-push-ups'), 10);
  assert.equal(xpOf('do-your-taxes'), 70);
  assert.equal(xpOf('steps'), 35);
  assert.equal(xpOf('walk'), 25);
  assert.equal(xpOf('take-the-stairs-instead-of-the-lift'), 10);
  assert.equal(xpOf('no-alcohol-today'), 10);
  assert.equal(xpOf('read-for-20-minutes'), xpFor(20), 'light tasks stay as they were');
  // 59 tasks earn more by effort, and the 25 willpower tasks go from 5 to 10.
  const raised = LIBRARY.filter((t) => libraryEffort(t.id) !== 'willpower' && xpOf(t.id) !== xpFor(t.minutes));
  assert.equal(raised.length, 59);
  assert.equal(LIBRARY.filter((t) => libraryEffort(t.id) === 'willpower').length, 25);
  assert.ok(LIBRARY.every((t) => xpOf(t.id) >= xpFor(t.minutes)), 'no task earns less');
});

test('typed tasks get their effort from the same rules as their time', () => {
  assert.equal(estimateMinutes('Run 5 km').effort, 'hard');
  assert.equal(estimateMinutes('walk 3 km').effort, 'active');
  assert.equal(estimateMinutes('8,000 steps').effort, 'active');
  assert.equal(estimateMinutes('leg day at the gym').effort, 'hard');
  assert.equal(estimateMinutes('vacuum the stairs').effort, 'active');
  assert.equal(estimateMinutes('answer emails').effort, 'light');
  assert.equal(estimateMinutes('No alcohol today').effort, 'willpower');
  assert.equal(estimateMinutes('xyzzy plugh').effort, 'light');
});

test('evening willpower tasks wait for their hour; morning ones can be ticked any time', () => {
  for (const id of TONIGHT_IDS) assert.equal(libraryEffort(id), 'willpower', id);
  const at = (h: number, m = 0) => new Date(2026, 9, 26, h, m).getTime();
  const task = (title: string) => ({ title });
  assert.ok(tooEarlyToTick(task('No alcohol today'), at(17, 59)));
  assert.ok(!tooEarlyToTick(task('No alcohol today'), at(18)));
  assert.ok(tooEarlyToTick(task('Phone-free evening'), at(20, 30)));
  assert.ok(!tooEarlyToTick(task('Drink 2 litres of water'), at(9)), 'targets can be hit early');
  assert.ok(!tooEarlyToTick(task('Sleep 8 hours'), at(7)), 'last night’s sleep is ticked in the morning');
  assert.equal(tonightHour(task('Sleep 8 hours')), undefined, 'and stays in the day’s list');
  assert.equal(tonightHour(task('Drink 2 litres of water')), 0);
  assert.equal(tonightHour({ title: 'Renamed', libraryId: 'no-junk-food-today' }), 18);
  assert.equal(tonightHour(task('Clean the kitchen')), undefined);

  const TODAY = '2026-10-26';
  const s = { ...addTask(emptyState, 'No alcohol today', true, 'a'), joinedAt: TODAY };
  const old = { ...s, tasks: s.tasks.map((t) => ({ ...t, createdAt: '2026-01-01T00:00:00Z' })) };
  assert.equal(toggleTask(old, 'a', TODAY, at(12)), old, 'refused at noon');
  assert.ok(isDoneToday(toggleTask(old, 'a', TODAY, at(19)), old.tasks[0], TODAY));
});
