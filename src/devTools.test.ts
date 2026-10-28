import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grantLevelRewards } from './achievements.ts';
import {
  addDevTickets,
  addDevTokens,
  addDevXp,
  clearDev,
  DEV_DAY,
  DEV_TOOLS,
  devAllowed,
  hasDevChanges,
  setDevLevel,
  setDevMultiplier,
  setDevStreak,
  setUnlockAll,
  xpAtLevel,
} from './devTools.ts';
import { addTask, currentStreak, emptyState, levelInfo, MAX_LEVEL, resetProgress, streakStatus, toggleTask, totalXp, xpMultiplier, type GameState } from './game.ts';
import { tokenCounts } from './tokens.ts';
import { ticketStatus } from './wheel.ts';

const TODAY = '2026-10-21';

/** A player with one 15-minute task done today. */
function player(): GameState {
  const s = addTask({ ...emptyState, onboarded: true, joinedAt: TODAY }, 'Dishes', true);
  return toggleTask(s, s.tasks[0].id, TODAY);
}

test('the developer page is off in plain node runs (no __DEV__, no EXPO_PUBLIC_DEV_TOOLS)', () => {
  assert.equal(DEV_TOOLS, process.env.EXPO_PUBLIC_DEV_TOOLS === '1');
});

test('picking a level lands on its very start, up or down', () => {
  const s = player();
  for (const target of [1, 2, 10, 37, 99, MAX_LEVEL]) {
    const next = setDevLevel(s, target);
    const info = levelInfo(totalXp(next));
    assert.equal(info.level, target, `level ${target}`);
    assert.equal(info.xpIntoLevel, 0, `level ${target} starts at 0`);
    assert.equal(totalXp(next), xpAtLevel(target));
  }
  // Out of range picks are kept in range.
  assert.equal(levelInfo(totalXp(setDevLevel(s, 0))).level, 1);
  assert.equal(levelInfo(totalXp(setDevLevel(s, 500))).level, MAX_LEVEL);
});

test('picking a level again replaces the test XP instead of adding to it', () => {
  const once = setDevLevel(player(), 20);
  const twice = setDevLevel(setDevLevel(once, 50), 20);
  assert.deepEqual(twice.dev, once.dev);
});

test('going down a level takes back the level rewards above it', () => {
  const high = setDevLevel(player(), 30);
  const rewarded = grantLevelRewards(high, 30);
  assert.ok(rewarded.levelRewards!.some((l) => l > 10));
  const low = setDevLevel(rewarded, 10);
  assert.ok(low.levelRewards!.every((l) => l <= 10));
  assert.ok(low.levelRewards!.length > 0);
});

test('level 1 with no earned XP leaves no dev field behind', () => {
  const s = { ...emptyState, joinedAt: TODAY };
  assert.equal(setDevLevel(s, 1).dev, undefined);
  assert.equal(hasDevChanges(setDevLevel(setDevLevel(s, 40), 1)), false);
});

test('added XP never takes the total below zero', () => {
  const s = player();
  const real = totalXp(s);
  assert.equal(totalXp(addDevXp(s, 1000)), real + 1000);
  assert.equal(totalXp(addDevXp(s, -1_000_000)), 0);
  // Earned XP lost later (an untick) can't make the total negative either.
  const atOne = setDevLevel(s, 1);
  const unticked = toggleTask(atOne, s.tasks[0].id, TODAY);
  assert.equal(totalXp(unticked), 0);
  assert.equal(levelInfo(totalXp(unticked)).progress, 0);
});

test('the test multiplier multiplies finished tasks and shows as its own part', () => {
  const base = addTask({ ...emptyState, joinedAt: TODAY }, 'Dishes', true);
  const plain = toggleTask(base, base.tasks[0].id, TODAY).completions[0].xp;
  const boosted = setDevMultiplier(base, 10);
  assert.equal(toggleTask(boosted, base.tasks[0].id, TODAY).completions[0].xp, plain * 10);
  const parts = xpMultiplier(boosted, TODAY).parts;
  assert.deepEqual(parts.at(-1), { label: 'Test', x: 10 });
  // Back to ×1 is no test change at all.
  assert.equal(setDevMultiplier(boosted, 1).dev, undefined);
  assert.equal(xpMultiplier(setDevMultiplier(boosted, 1), TODAY).parts.length, 1);
});

test('unlock everything turns on and off', () => {
  const on = setUnlockAll(player(), true);
  assert.equal(on.dev?.unlockAll, true);
  assert.equal(setUnlockAll(on, false).dev, undefined);
});

test('extra tokens and tickets land in the bag', () => {
  const s = player();
  const more = addDevTokens(addDevTokens(addDevTokens(s, 'rest', 3), 'rest', 3), 'adfree', 3);
  const counts = tokenCounts(more);
  assert.equal(counts.rest, tokenCounts(s).rest + 6);
  assert.equal(counts.adfree, tokenCounts(s).adfree + 3);
  assert.equal(counts.double, tokenCounts(s).double);
  const tickets = addDevTickets(s, 5);
  assert.equal(ticketStatus(tickets, totalXp(tickets)).tickets, ticketStatus(s, totalXp(s)).tickets + 5);
});

test('jumping to a high level doesn’t flood the wheel with tickets', () => {
  const s = player();
  const high = setDevLevel(s, 60);
  assert.equal(ticketStatus(high, totalXp(high)).tickets, ticketStatus(s, totalXp(s)).tickets);
  const low = setDevLevel(s, 1);
  assert.equal(ticketStatus(low, totalXp(low)).tickets, ticketStatus(s, totalXp(s)).tickets);
});

test('a made-up streak counts the days before today and replaces the last one', () => {
  const s = player();
  const week = setDevStreak(s, 7, TODAY);
  // Today's real task plus 7 made-up days.
  assert.equal(currentStreak(week.completions, TODAY), 8);
  assert.equal(week.completions.filter((c) => c.taskId === DEV_DAY).length, 7);
  const shorter = setDevStreak(week, 3, TODAY);
  assert.equal(currentStreak(shorter.completions, TODAY), 4);
  assert.equal(currentStreak(setDevStreak(shorter, 0, TODAY).completions, TODAY), 1);
  // A full made-up week reaches Inferno once a Monday has passed.
  assert.equal(streakStatus(setDevStreak(s, 14, TODAY).completions, TODAY).tier, 3);
});

test('made-up days skip days that already have a real task', () => {
  let s = player();
  s = { ...s, completions: [...s.completions, { taskId: s.tasks[0].id, date: '2026-10-19', xp: 10 }] };
  const filled = setDevStreak(s, 3, TODAY);
  assert.deepEqual(
    filled.completions.filter((c) => c.taskId === DEV_DAY).map((c) => c.date),
    ['2026-10-18', '2026-10-20'],
  );
});

test('undo takes back every test change and the level rewards they won', () => {
  const s = player();
  let tested = setDevStreak(setUnlockAll(addDevTickets(addDevTokens(setDevMultiplier(setDevLevel(s, 25), 5), 'double', 3), 5), true), 10, TODAY);
  tested = grantLevelRewards(tested, levelInfo(totalXp(tested)).level);
  assert.equal(hasDevChanges(tested), true);
  const undone = clearDev(tested);
  assert.equal(undone.dev, undefined);
  assert.equal(hasDevChanges(undone), false);
  assert.equal(totalXp(undone), totalXp(s));
  assert.deepEqual(undone.completions, s.completions);
  assert.ok((undone.levelRewards ?? []).every((l) => l <= levelInfo(totalXp(s)).level));
  assert.deepEqual(tokenCounts(undone), tokenCounts(s));
});

test('store builds drop test changes from saved data and backups; test builds keep them', () => {
  const s = player();
  const tested = setDevStreak(setDevLevel(s, 40), 5, TODAY);
  assert.equal(devAllowed(tested, true), tested);
  const store = devAllowed(tested, false);
  assert.equal(store.dev, undefined);
  assert.equal(totalXp(store), totalXp(s));
  assert.equal(hasDevChanges(store), false);
  // Normal players are passed through untouched.
  assert.equal(devAllowed(s, false), s);
});

test('reset all progress also clears test changes', () => {
  const reset = resetProgress(setDevStreak(setUnlockAll(setDevLevel(player(), 40), true), 5, TODAY));
  assert.equal(reset.dev, undefined);
  assert.equal(hasDevChanges(reset), false);
});
