import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, emptyState } from './game.ts';
import { REVIEW_GAP_DAYS, REVIEW_MAX_ASKS, reviewDue } from './review.ts';

const TODAY = '2026-10-24';
const player = (joined: string, reviewAsks?: string[]) => ({ ...emptyState, joinedAt: joined, settings: { ...emptyState.settings, reviewAsks } });

test('the review pop-up waits for a week of use and level 5', () => {
  assert.equal(reviewDue(player(addDays(TODAY, -6)), 8, TODAY), false);
  assert.equal(reviewDue(player(addDays(TODAY, -7)), 4, TODAY), false);
  assert.equal(reviewDue(player(addDays(TODAY, -7)), 5, TODAY), true);
  assert.equal(reviewDue(player(''), 9, TODAY), false);
});

test('the review pop-up comes back only after a long gap, and at most 3 times', () => {
  const joined = '2025-01-01';
  const last = addDays(TODAY, -(REVIEW_GAP_DAYS - 1));
  assert.equal(reviewDue(player(joined, [last]), 20, TODAY), false);
  assert.equal(reviewDue(player(joined, [last]), 20, addDays(last, REVIEW_GAP_DAYS)), true);
  const asks = Array.from({ length: REVIEW_MAX_ASKS }, (_, i) => addDays('2025-02-01', i * 200));
  assert.equal(reviewDue(player(joined, asks), 40, '2030-01-01'), false);
});
