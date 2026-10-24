import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clockLabel, focusBonus, focusElapsed, focusGoalMinutes, pauseFocus, resumeFocus, startFocus, FOCUS_BONUS_XP } from './focus.ts';
import { emptyState, toggleTask, totalXp, type Task } from './game.ts';

const MIN = 60_000;

test('the goal is the task time, 25 minutes without one, kept between 5 and 90', () => {
  assert.equal(focusGoalMinutes({ minutes: 30 }), 30);
  assert.equal(focusGoalMinutes({}), 25);
  assert.equal(focusGoalMinutes({ minutes: 2 }), 5);
  assert.equal(focusGoalMinutes({ minutes: 240 }), 90);
});

test('pauses do not count as focused time', () => {
  let s = startFocus('t', 0);
  s = pauseFocus(s, 10 * MIN);
  assert.equal(focusElapsed(s, 50 * MIN), 10 * MIN);
  assert.equal(pauseFocus(s, 20 * MIN), s, 'pausing twice keeps the first pause');
  s = resumeFocus(s, 30 * MIN);
  assert.equal(s.pausedAt, undefined);
  assert.equal(focusElapsed(s, 35 * MIN), 15 * MIN);
  assert.equal(resumeFocus(s, 40 * MIN), s);
});

test('the bonus comes only once the goal time is focused, and only for that task', () => {
  const task = { id: 't', minutes: 20 };
  const s = startFocus('t', 0);
  assert.equal(focusBonus(s, task, 19 * MIN), 0);
  assert.equal(focusBonus(s, task, 20 * MIN), FOCUS_BONUS_XP);
  assert.equal(focusBonus(s, { id: 'other', minutes: 20 }, 60 * MIN), 0);
  assert.equal(focusBonus(undefined, task, 60 * MIN), 0);
  assert.equal(focusBonus(pauseFocus(s, 5 * MIN), task, 60 * MIN), 0);
});

test('a finished task carries the bonus, and unticking takes it back', () => {
  const task: Task = { id: 't', title: 'Read', daily: true, createdAt: '2026-01-01T00:00:00.000Z', minutes: 20 } as Task;
  const state = { ...emptyState, tasks: [task] };
  const plain = toggleTask(state, 't', '2026-10-24');
  const focused = toggleTask(state, 't', '2026-10-24', undefined, FOCUS_BONUS_XP);
  assert.equal(totalXp(focused) - totalXp(plain), FOCUS_BONUS_XP);
  assert.equal(focused.completions[0].focusXp, FOCUS_BONUS_XP);
  assert.equal(totalXp(toggleTask(focused, 't', '2026-10-24')), 0);
});

test('clock labels', () => {
  assert.equal(clockLabel(0), '0:00');
  assert.equal(clockLabel(65_000), '1:05');
  assert.equal(clockLabel(25 * MIN), '25:00');
  assert.equal(clockLabel(62 * MIN + 5000), '1:02:05');
  assert.equal(clockLabel(-5), '0:00');
});
