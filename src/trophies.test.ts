import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, emptyState, type Completion } from './game.ts';
import { SHOWCASE_SIZE, showcaseTrophies, toggleShowcase, TROPHIES, trophyStatuses } from './trophies.ts';

const TODAY = '2026-10-21';
const find = (s: ReturnType<typeof trophyStatuses>, id: string) => s.find((t) => t.def.id === id)!;

test('a new player has no trophies and every trophy explains itself', () => {
  const s = trophyStatuses({ ...emptyState, joinedAt: TODAY }, TODAY);
  assert.equal(s.filter((t) => t.earned).length, 0);
  for (const t of TROPHIES) assert.ok(t.description.length > 10, t.id);
  assert.equal(new Set(TROPHIES.map((t) => t.id)).size, TROPHIES.length);
});

test('streak, time and marathon trophies count real history', () => {
  const completions: Completion[] = Array.from({ length: 100 }, (_, i) => ({
    taskId: 'x',
    date: addDays(TODAY, -i),
    xp: 50,
    minutes: 60,
    title: 'Go for a run',
  }));
  completions.push(...Array.from({ length: 7 }, () => ({ taskId: 'y', date: TODAY, xp: 40, minutes: 60, title: 'Deep work' })));
  const s = trophyStatuses({ ...emptyState, completions, joinedAt: addDays(TODAY, -100) }, TODAY);
  assert.equal(find(s, 'ironWill').earned, true);
  assert.equal(find(s, 'yearOfFire').value, 100);
  assert.equal(find(s, 'marathonDay').earned, true); // 1 h + 7 h today
  assert.equal(find(s, 'timeLord').value, 107);
  assert.ok(find(s, 'infernoKeeper').value >= 8); // 350 XP weeks, no gaps
  assert.equal(find(s, 'veteran').value, 3);
  // Values never pass the target
  assert.equal(find(s, 'ironWill').value, 100);
});

test('up to three won trophies can be pinned to the profile, in order', () => {
  const completions: Completion[] = Array.from({ length: 100 }, (_, i) => ({ taskId: 'x', date: addDays(TODAY, -i), xp: 50, minutes: 60, title: 'Go for a run' }));
  const s = trophyStatuses({ ...emptyState, completions, joinedAt: addDays(TODAY, -100) }, TODAY);
  let pins = toggleShowcase(undefined, 'ironWill');
  pins = toggleShowcase(pins, 'timeLord'); // not won: pinned, but not shown
  pins = toggleShowcase(pins, 'infernoKeeper');
  assert.equal(toggleShowcase(pins, 'veteran'), pins, 'a full showcase stays as it is');
  assert.equal(pins.length, SHOWCASE_SIZE);
  assert.deepEqual(showcaseTrophies(s, pins).map((t) => t.def.id), ['ironWill', 'infernoKeeper']);
  assert.deepEqual(toggleShowcase(pins, 'ironWill'), ['timeLord', 'infernoKeeper'], 'tapping again unpins');
  assert.deepEqual(showcaseTrophies(s, undefined), []);
});
