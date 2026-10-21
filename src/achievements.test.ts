import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  achievementStatuses,
  bestDay,
  bestTaskXp,
  bestWeek,
  claimableCount,
  claimAchievement,
  monthsSince,
  unlockedRewards,
} from './achievements.ts';
import { addDays, emptyState, totalXp, type Completion, type GameState } from './game.ts';

const TODAY = '2026-10-21';

function done(date: string, xp = 10, n = 1): Completion[] {
  return Array.from({ length: n }, () => ({ taskId: 't', date, xp }));
}

function stateWith(completions: Completion[], extra: Partial<GameState> = {}): GameState {
  return { ...emptyState, joinedAt: TODAY, completions, ...extra };
}

test('best day, best week and biggest task', () => {
  const s = stateWith([...done('2026-10-19', 10, 4), ...done('2026-10-20', 90, 1), ...done('2026-10-27', 10, 2)]);
  assert.equal(bestDay(s), 4);
  assert.equal(bestWeek(s), 5); // 19th + 20th are the same week
  assert.equal(bestTaskXp(s), 90);
  assert.equal(bestDay(emptyState), 0);
});

test('member months count full calendar months', () => {
  assert.equal(monthsSince('2026-01-15', '2026-02-14'), 0);
  assert.equal(monthsSince('2026-01-15', '2026-02-15'), 1);
  assert.equal(monthsSince('2025-10-21', '2026-10-21'), 12);
  assert.equal(monthsSince('', TODAY), 0);
});

test('tiers are claimed one at a time, in order, and add XP', () => {
  let s = stateWith(done(TODAY, 10, 12)); // 12 tasks: tiers 1 and 10 reached
  const tasks = () => achievementStatuses(s, TODAY).find((a) => a.def.id === 'tasks')!;
  assert.equal(tasks().reached, 2);
  const before = totalXp(s);
  let r = claimAchievement(s, 'tasks', TODAY);
  assert.equal(r.tier?.goal, 1);
  s = r.state;
  r = claimAchievement(s, 'tasks', TODAY);
  assert.equal(r.tier?.goal, 10);
  s = r.state;
  assert.equal(totalXp(s), before + 10 + 25);
  // Nothing left to claim for this one
  assert.equal(claimAchievement(s, 'tasks', TODAY).tier, undefined);
  assert.equal(tasks().claimed, 2);
});

test('member-since rewards unlock after 1, 3, 6 and 12 months', () => {
  let s = stateWith([], { joinedAt: addDays(TODAY, -400) });
  assert.equal(achievementStatuses(s, TODAY).find((a) => a.def.id === 'member')!.reached, 4);
  for (let i = 0; i < 4; i++) s = claimAchievement(s, 'member', TODAY).state;
  const labels = unlockedRewards(s).map((r) => r.label);
  assert.ok(labels.includes('1 month Premium for free'));
  assert.equal(labels.length, 4);
});

test('claimable count drops as tiers are claimed', () => {
  let s = stateWith(done(TODAY, 10, 3)); // tasks tier 1 + power day tier 3
  const n = claimableCount(s, TODAY);
  assert.ok(n >= 2);
  s = claimAchievement(s, 'tasks', TODAY).state;
  assert.equal(claimableCount(s, TODAY), n - 1);
});

test('claiming achievement XP never unlocks a level achievement by itself', () => {
  let s = stateWith(done(TODAY, 10, 2));
  for (const a of achievementStatuses(s, TODAY)) {
    for (let i = 0; i < a.reached; i++) s = claimAchievement(s, a.def.id, TODAY).state;
  }
  const level = achievementStatuses(s, TODAY).find((a) => a.def.id === 'level')!;
  assert.equal(level.reached, 0);
});
