import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimDaily, dailyChallenges, dailyChallengesFor, dayStats, DAILY_POOL } from './daily.ts';
import { addDays, emptyState, totalXp, type Completion, type GameState } from './game.ts';

const TODAY = '2026-10-24';

function withDone(done: Partial<Completion>[], date = TODAY): GameState {
  const s = emptyState;
  return { ...s, completions: done.map((c, i) => ({ taskId: `t${i}`, date, xp: 10, title: `Task ${i}`, ...c })) };
}

test('two daily challenges a day, measuring different things, at most one with a deadline', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const picks = dailyChallengesFor(addDays(TODAY, i));
    assert.equal(picks.length, 2);
    assert.notEqual(picks[0].metric, picks[1].metric);
    assert.ok(picks.filter((p) => p.untilHour !== undefined).length <= 1);
    picks.forEach((p) => seen.add(p.id));
  }
  // Every challenge comes round within two months.
  assert.equal(seen.size, DAILY_POOL.length);
});

test('the same day gives the same challenges, the next day new ones', () => {
  assert.deepEqual(dailyChallengesFor(TODAY), dailyChallengesFor(TODAY));
  assert.notDeepEqual(dailyChallengesFor(TODAY), dailyChallengesFor(addDays(TODAY, 1)));
});

test('day stats only count today, and the morning only counts ticks with a known hour', () => {
  let s = withDone([{ hour: 8 }, { hour: 11, minutes: 30 }, { hour: 15, title: 'Task 0' }, {}]);
  s.completions = [...s.completions, { taskId: 'old', date: addDays(TODAY, -1), xp: 50, hour: 7 }];
  const st = dayStats(s, TODAY);
  assert.equal(st.tasksDone, 4);
  assert.equal(st.xpEarned, 40);
  assert.equal(st.morningDone, 2);
  assert.equal(st.earlyDone, 1);
  assert.equal(st.focusDone, 1);
  assert.equal(st.variety, 3);
});

test('a done challenge is claimed once and its XP counts', () => {
  const s = withDone(Array.from({ length: 6 }, (_, i) => ({ hour: 7, minutes: 30, title: `T${i}` })));
  const before = totalXp(s);
  const status = dailyChallenges(s, TODAY, 20);
  assert.ok(status.every((c) => c.complete && !c.claimed && !c.ended));
  const id = status[0].def.id;
  const claimed = claimDaily(s, id, TODAY, 20);
  assert.equal(totalXp(claimed), before + status[0].def.rewardXp);
  assert.equal(claimDaily(claimed, id, TODAY, 20), claimed, 'only once');
  assert.ok(dailyChallenges(claimed, TODAY, 20).find((c) => c.def.id === id)!.claimed);
  // Tomorrow it starts fresh.
  assert.ok(!dailyChallenges(claimed, addDays(TODAY, 7), 20).some((c) => c.claimed));
});

test('an unfinished challenge can not be claimed, and a deadline one ends at its hour', () => {
  const s = withDone([]);
  for (const c of dailyChallenges(s, TODAY, 10)) assert.equal(claimDaily(s, c.def.id, TODAY, 10), s);
  // Find a day with a deadline challenge and check it ends.
  for (let i = 0; i < 14; i++) {
    const day = addDays(TODAY, i);
    const timed = dailyChallengesFor(day).find((d) => d.untilHour !== undefined);
    if (!timed) continue;
    const before = dailyChallenges(s, day, timed.untilHour! - 1).find((c) => c.def.id === timed.id)!;
    const after = dailyChallenges(s, day, timed.untilHour!).find((c) => c.def.id === timed.id)!;
    assert.equal(before.ended, false);
    assert.equal(after.ended, true);
    return;
  }
  assert.fail('no deadline challenge in two weeks');
});
