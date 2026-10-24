import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideSteps } from './guide.ts';
import { emptyState } from './game.ts';

test('first steps tick themselves off as the player plays', () => {
  const fresh = guideSteps(emptyState, 0, 0);
  assert.deepEqual(fresh.map((s) => s.done), [false, false, false]);
  assert.equal(fresh[2].note, '0 / 100 XP to your first ticket');

  const ticked = { ...emptyState, completions: [{ taskId: 'a', date: '2026-10-24', xp: 30 }] };
  const after = guideSteps(ticked, 30, 30);
  assert.deepEqual(after.map((s) => s.done), [true, true, false]);
  assert.equal(after[2].ready, false);

  const ready = guideSteps(ticked, 120, 100);
  assert.equal(ready[2].ready, true);
  assert.equal(ready[2].note, 'Your ticket is ready');

  const spun = guideSteps({ ...ticked, wheelSpins: [{ date: '2026-10-24', prize: 'xp20', xp: 20 }] }, 140, 100);
  assert.ok(spun.every((s) => s.done));
});
