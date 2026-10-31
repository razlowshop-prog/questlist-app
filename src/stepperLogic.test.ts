import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holdPause, holdRepeats, HOLD_FAST_MS, HOLD_EVERY_MS, stepped, tapCounts, IGNORE_REPEAT_MS } from './stepperLogic.ts';

test('one step, kept in range', () => {
  assert.equal(stepped(3, 1, 1, 1, 7), 4);
  assert.equal(stepped(3, -1, 1, 1, 7), 2);
  assert.equal(stepped(7, 1, 1, 1, 7), 7);
  assert.equal(stepped(1, -1, 1, 1, 7), 1);
  assert.equal(stepped(0.3, 1, 0.1, 0, 5), 0.4);
  assert.equal(stepped(25, 1, 5, 5, 90), 30);
});

test('times a week never repeats on hold; focus minutes and the level picker do', () => {
  assert.equal(holdRepeats(1, 7, 1), false);
  assert.equal(holdRepeats(5, 90, 1), true);
  assert.equal(holdRepeats(1, 100, 1), true);
  // A long range with big steps is still few taps.
  assert.equal(holdRepeats(5, 60, 5), false);
});

test('a second tap a moment after the first is ignored, a real second tap counts', () => {
  assert.equal(tapCounts(1000, undefined), true);
  assert.equal(tapCounts(1000 + 30, 1000), false);
  assert.equal(tapCounts(1000 + IGNORE_REPEAT_MS - 1, 1000), false);
  assert.equal(tapCounts(1000 + IGNORE_REPEAT_MS, 1000), true);
  assert.equal(tapCounts(1000 + 400, 1000), true);
});

test('holding speeds up after a few steps', () => {
  assert.equal(holdPause(0), HOLD_EVERY_MS);
  assert.equal(holdPause(7), HOLD_EVERY_MS);
  assert.equal(holdPause(8), HOLD_FAST_MS);
});
