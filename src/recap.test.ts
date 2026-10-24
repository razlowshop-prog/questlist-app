import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyState, type Completion, type GameState } from './game.ts';
import { recapShareText, recapToShow, weekRecap } from './recap.ts';

// 2026-10-19 is a Monday, 2026-10-25 the Sunday after.
const done = (date: string, xp = 20): Completion => ({ taskId: 't', date, xp, minutes: 15 });
const state = (completions: Completion[], recapSeen?: string): GameState => ({ ...emptyState, completions, settings: { ...emptyState.settings, recapSeen } });

test('the recap counts the week and finds the best day', () => {
  const r = weekRecap(state([done('2026-10-18'), done('2026-10-19'), done('2026-10-21'), done('2026-10-21', 35), done('2026-10-25'), done('2026-10-26')]), '2026-10-19');
  assert.equal(r.tasks, 4);
  assert.equal(r.xp, 95);
  assert.equal(r.minutes, 60);
  assert.equal(r.activeDays, 3);
  assert.deepEqual(r.bestDay, { name: 'Wednesday', tasks: 2 });
  assert.equal(r.lastWeekTasks, 1);
});

test('shown on Sunday evening and on Monday, until seen', () => {
  const s = state([done('2026-10-20')]);
  assert.equal(recapToShow(s, '2026-10-25', 16), undefined, 'Sunday afternoon is too early');
  assert.equal(recapToShow(s, '2026-10-25', 18)?.week, '2026-10-19');
  assert.equal(recapToShow(s, '2026-10-26', 9)?.week, '2026-10-19', 'Monday shows last week');
  assert.equal(recapToShow(s, '2026-10-27', 9), undefined, 'Tuesday shows none');
  assert.equal(recapToShow(state([done('2026-10-20')], '2026-10-19'), '2026-10-26', 9), undefined, 'seen');
  assert.equal(recapToShow(state([]), '2026-10-26', 9), undefined, 'an empty week has no recap');
});

test('share text', () => {
  const r = weekRecap(state([done('2026-10-21')]), '2026-10-19');
  assert.equal(recapShareText(r, 'Succedo'), 'My week on Succedo: 1 task done, +20 XP, active 1 of 7 days. Best day: Wednesday.');
});
