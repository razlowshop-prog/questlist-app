import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addTask, emptyState, toggleTask, totalXp, type GameState } from './game.ts';
import { PERFECT_DAY_XP, reachStreakMilestone, syncPerfectDay } from './moments.ts';

const TODAY = '2026-10-24';

function withTasks(n: number): GameState {
  let s: GameState = { ...emptyState, joinedAt: TODAY };
  for (let i = 0; i < n; i++) s = addTask(s, `Task ${i}`, true, `t${i}`);
  return s;
}

const tick = (s: GameState, id: string) => syncPerfectDay(toggleTask(s, id, TODAY), TODAY);

test('a perfect day pays its bonus once every task for today is done', () => {
  let s = withTasks(3);
  let r = tick(s, 't0');
  assert.equal(r.earned, false);
  r = tick(r.state, 't1');
  assert.equal(r.earned, false);
  const before = totalXp(r.state);
  r = tick(r.state, 't2');
  assert.equal(r.earned, true);
  assert.equal(totalXp(r.state), before + PERFECT_DAY_XP + r.state.completions.at(-1)!.xp);
  // Syncing again changes nothing.
  assert.equal(syncPerfectDay(r.state, TODAY).state, r.state);
  s = r.state;

  // A new task added later doesn't take it away...
  const added = syncPerfectDay(addTask(s, 'Late task', true, 'late'), TODAY);
  assert.equal(added.state.perfectDays?.length, 1);
  // ...but unticking one does, and ticking it again brings it back.
  const unticked = tick(s, 't1');
  assert.equal(unticked.state.perfectDays?.length, 0);
  const again = tick(unticked.state, 't1');
  assert.equal(again.state.perfectDays?.length, 1);
});

test('one or two tasks are not enough for a perfect day', () => {
  let r = tick(withTasks(2), 't0');
  r = tick(r.state, 't1');
  assert.equal(r.earned, false);
  assert.equal(r.state.perfectDays, undefined);
});

test('streak milestones are reached once, at 7, 30, 100 and 365 days', () => {
  const six = { ...emptyState, completions: Array.from({ length: 6 }, (_, i) => ({ taskId: 'x', date: addDays(TODAY, -1 - i), xp: 10 })) };
  const seven = { ...six, completions: [...six.completions, { taskId: 'x', date: TODAY, xp: 10 }] };
  const r = reachStreakMilestone(six, seven, TODAY);
  assert.equal(r.days, 7);
  assert.deepEqual(r.state.streakMilestones, [{ days: 7, date: TODAY }]);
  // Untick and tick again the same day: no second celebration.
  assert.equal(reachStreakMilestone(six, r.state, TODAY).days, undefined);
  // An ordinary day in between is not a milestone.
  assert.equal(reachStreakMilestone(seven, seven, TODAY).days, undefined);
});
