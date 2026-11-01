import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tourSteps } from './tour.ts';

test('the tour has the player tick one test task and remove the other, right after the task list', () => {
  const ids = tourSteps({ widget: false }).map((s) => s.id);
  assert.deepEqual(ids.slice(0, 4), ['hello', 'tasks', 'tick', 'remove']);
  assert.equal(tourSteps({ widget: true })[1].id, 'widget');
  const steps = tourSteps({ widget: false });
  assert.deepEqual(steps.find((s) => s.id === 'tasks')?.also, ['tour-task', 'tour-swipe']);
  assert.ok(steps.filter((s) => s.wait).every((s) => s.target));
});

test('a replayed tour skips the test tasks, so the tick gives no XP twice', () => {
  const steps = tourSteps({ widget: false, tried: true });
  assert.ok(!steps.some((s) => s.wait));
  assert.equal(steps.find((s) => s.id === 'tasks')?.also, undefined);
});

test('the bag and profile steps open their page to show it', () => {
  const steps = tourSteps({ widget: false });
  assert.equal(steps.find((s) => s.id === 'bag')?.page, 'inventory');
  assert.equal(steps.find((s) => s.id === 'profile')?.page, 'profile');
});
