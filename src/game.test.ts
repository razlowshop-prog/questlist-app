import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addTask,
  challengesForWeek,
  claimChallenge,
  currentStreak,
  deleteTask,
  emptyState,
  finishSetup,
  levelInfo,
  longestStreak,
  MAX_LEVEL,
  rankFor,
  repeatLabel,
  secondsUntilTickable,
  streakBonus,
  taskXp,
  toggleTask,
  totalXp,
  visibleTasks,
  weekStart,
  weekStats,
  withDefaults,
  xpFor,
  xpToNext,
  type Completion,
} from './game.ts';

const TODAY = '2026-10-21';

function streakOf(days: number, endingOn = TODAY): Completion[] {
  return Array.from({ length: days }, (_, i) => ({
    taskId: 'x',
    date: addDays(endingOn, -i),
    xp: 10,
  }));
}

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('levels: first ones are quick, later ones much slower', () => {
  assert.equal(xpToNext(1), 25);
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(24).level, 1);
  assert.equal(levelInfo(25).level, 2);
  assert.equal(levelInfo(30).xpIntoLevel, 5);
  for (let l = 1; l < 99; l++) assert.ok(xpToNext(l + 1) > xpToNext(l), `level ${l} curve`);
  assert.ok(xpToNext(99) > 150 * xpToNext(1));
});

test('level 100 is the cap', () => {
  let total = 0;
  for (let l = 1; l < MAX_LEVEL; l++) total += xpToNext(l);
  assert.ok(total > 150_000 && total < 250_000, `total ${total}`);
  assert.equal(levelInfo(total - 1).level, 99);
  const top = levelInfo(total + 1_000_000);
  assert.equal(top.level, 100);
  assert.equal(top.maxed, true);
  assert.equal(top.rank, 'Immortal');
});

test('ranks change every 10 levels', () => {
  assert.equal(rankFor(1), 'Rookie');
  assert.equal(rankFor(9), 'Rookie');
  assert.equal(rankFor(10), 'Apprentice');
  assert.equal(rankFor(95), 'Mythic');
  assert.equal(rankFor(100), 'Immortal');
});

test('streak counts consecutive days ending today', () => {
  assert.equal(currentStreak(streakOf(5), TODAY), 5);
});

test('streak survives until the end of today if yesterday was done', () => {
  assert.equal(currentStreak(streakOf(4, addDays(TODAY, -1)), TODAY), 4);
});

test('streak breaks after a fully missed day', () => {
  assert.equal(currentStreak(streakOf(4, addDays(TODAY, -2)), TODAY), 0);
});

test('streak bonus tiers', () => {
  assert.equal(streakBonus(2), 0);
  assert.equal(streakBonus(3), 0.1);
  assert.equal(streakBonus(7), 0.25);
  assert.equal(streakBonus(30), 0.5);
});

test('completing a task awards XP and unticking removes it', () => {
  let s = addTask(emptyState, 'Wash dishes', 'medium', true, 't1');
  s = toggleTask(s, 't1', TODAY);
  assert.equal(totalXp(s), 20);
  s = toggleTask(s, 't1', TODAY);
  assert.equal(totalXp(s), 0);
});

test('streak bonus is applied on completion', () => {
  let s = addTask(emptyState, 'Run', 'hard', true, 't1');
  // 6 earlier days done, so today makes 7 -> +25 %
  s = { ...s, completions: streakOf(6, addDays(TODAY, -1)).map((c) => ({ ...c, xp: 0 })) };
  s = toggleTask(s, 't1', TODAY);
  assert.equal(s.completions.at(-1)!.xp, 50);
});

test('daily tasks reset each day, one-off tasks disappear after the day they were done', () => {
  let s = addTask(emptyState, 'Daily', 'easy', true, 'd');
  s = addTask(s, 'Once', 'easy', false, 'o');
  s = toggleTask(s, 'd', TODAY);
  s = toggleTask(s, 'o', TODAY);
  assert.equal(visibleTasks(s, TODAY).length, 2);
  const tomorrow = addDays(TODAY, 1);
  assert.deepEqual(visibleTasks(s, tomorrow).map((t) => t.id), ['d']);
  // Daily task can be earned again tomorrow
  s = toggleTask(s, 'd', tomorrow);
  assert.equal(totalXp(s), 30);
});

test('empty titles are ignored and deleting keeps earned XP', () => {
  assert.equal(addTask(emptyState, '   ', 'easy', false).tasks.length, 0);
  let s = addTask(emptyState, 'A', 'easy', false, 'a');
  s = toggleTask(s, 'a', TODAY);
  s = deleteTask(s, 'a');
  assert.equal(s.tasks.length, 0);
  assert.equal(totalXp(s), 10);
});

test('weekStart returns the Monday', () => {
  assert.equal(weekStart('2026-10-21'), '2026-10-19'); // Wednesday
  assert.equal(weekStart('2026-10-19'), '2026-10-19'); // Monday
  assert.equal(weekStart('2026-10-25'), '2026-10-19'); // Sunday
});

test('three different challenges each week, rotating', () => {
  const a = challengesForWeek('2026-10-19');
  const b = challengesForWeek('2026-10-26');
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map((c) => c.metric)).size, 3);
  assert.notDeepEqual(a.map((c) => c.id), b.map((c) => c.id));
});

test('challenge can be claimed once when complete, and adds XP', () => {
  const week = weekStart(TODAY);
  const def = challengesForWeek(week)[0];
  let s = addTask(emptyState, 'Hard thing', 'hard', true, 'h');
  // Fill the week with plenty of hard completions on different days
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(week, i));
  s = {
    ...s,
    completions: days.flatMap((date) =>
      Array.from({ length: 5 }, () => ({ taskId: 'h', date, xp: 40, difficulty: 'hard' as const })),
    ),
  };
  const before = totalXp(s);
  assert.equal(claimChallenge(emptyState, def.id, TODAY), emptyState); // not complete
  s = claimChallenge(s, def.id, TODAY);
  assert.equal(totalXp(s), before + def.rewardXp);
  assert.equal(claimChallenge(s, def.id, TODAY), s); // second claim does nothing
});

test('last week does not count towards this week', () => {
  const lastWeek = addDays(weekStart(TODAY), -1);
  const s = { ...emptyState, completions: [{ taskId: 'x', date: lastWeek, xp: 10 }] };
  assert.equal(weekStats(s, TODAY).tasksDone, 0);
});

test('longest streak', () => {
  const completions = [...streakOf(7, '2026-09-10'), ...streakOf(2)];
  assert.equal(longestStreak(completions), 7);
});

test('join date defaults to the first completion, or today', () => {
  assert.equal(withDefaults(emptyState, TODAY).joinedAt, TODAY);
  const s = { ...emptyState, completions: streakOf(3) };
  assert.equal(withDefaults(s, TODAY).joinedAt, addDays(TODAY, -2));
  assert.equal(withDefaults({ ...s, joinedAt: '2026-01-01' }, TODAY).joinedAt, '2026-01-01');
});

test('tasks repeating N times a week hide once the weekly target is met', () => {
  const monday = weekStart(TODAY);
  let s = addTask(emptyState, 'Gym', 'hard', 3, 'g');
  assert.equal(s.tasks[0].perWeek, 3);
  assert.equal(repeatLabel(s.tasks[0]), '3× a week');
  s = toggleTask(s, 'g', monday);
  s = toggleTask(s, 'g', addDays(monday, 1));
  assert.equal(visibleTasks(s, addDays(monday, 2)).length, 1);
  s = toggleTask(s, 'g', addDays(monday, 2));
  // Still shown (ticked) on the day it hit the target, gone the day after
  assert.equal(visibleTasks(s, addDays(monday, 2)).length, 1);
  assert.equal(visibleTasks(s, addDays(monday, 3)).length, 0);
  // Back next week
  assert.equal(visibleTasks(s, addDays(monday, 7)).length, 1);
});

test('repeat labels', () => {
  assert.equal(repeatLabel(addTask(emptyState, 'a', 'easy', false).tasks[0]), 'One-time');
  assert.equal(repeatLabel(addTask(emptyState, 'a', 'easy', true).tasks[0]), 'Every day');
  assert.equal(repeatLabel(addTask(emptyState, 'a', 'easy', 7).tasks[0]), 'Every day');
});

test('finishing setup stores goals and name', () => {
  const s = finishSetup(emptyState, ' Fabian ', ['home', 'fitness']);
  assert.equal(s.onboarded, true);
  assert.equal(s.profile.name, 'Fabian');
  assert.deepEqual(s.goals, ['home', 'fitness']);
});

test('XP grows with time and effort', () => {
  assert.equal(xpFor(5, 'easy'), 5);
  assert.equal(xpFor(15, 'easy'), 10);
  assert.ok(xpFor(60, 'easy') > xpFor(15, 'easy'));
  assert.ok(xpFor(60, 'hard') > xpFor(60, 'easy'));
  // Walking 5 km (~60 min) beats doing the dishes (~15 min) by a lot
  assert.ok(xpFor(60, 'medium') >= 3 * xpFor(15, 'easy'));
  const s = addTask(emptyState, 'Walk 5 km', 'medium', false, 'w', 60);
  assert.equal(taskXp(s.tasks[0]), xpFor(60, 'medium'));
  assert.equal(toggleTask(s, 'w', TODAY).completions[0].xp, xpFor(60, 'medium'));
});

test('anti-cheat: the same task title gives full XP 5 times a day, then less', () => {
  let s = emptyState;
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
  for (const id of ids) s = addTask(s, 'Do the dishes', 'easy', false, id, 15);
  for (const id of ids) s = toggleTask(s, id, TODAY);
  assert.deepEqual(s.completions.map((c) => c.xp), [10, 10, 10, 10, 10, 5, 3, 1, 1]);
  assert.equal(s.completions[4].limited, undefined);
  assert.equal(s.completions[5].limited, 'repeat');
  assert.equal(s.completions[0].limited, undefined);
});

test('anti-cheat: only 16 hours of task time per day earn XP', () => {
  let s = emptyState;
  for (let i = 0; i < 10; i++) s = addTask(s, `Task ${i}`, 'easy', false, `t${i}`, 120);
  for (let i = 0; i < 10; i++) s = toggleTask(s, `t${i}`, TODAY);
  const xps = s.completions.map((c) => c.xp);
  assert.ok(xps.slice(0, 8).every((x) => x > 0)); // 8 × 2 h = 16 h
  assert.deepEqual(xps.slice(8), [0, 0]);
  assert.equal(s.completions[9].limited, 'daily');
  // Next day is fine again
  s = toggleTask(addTask(s, 'Tomorrow', 'easy', false, 'n', 15), 'n', addDays(TODAY, 1));
  assert.equal(s.completions.at(-1)!.xp, 10);
});

test('anti-cheat: a task cannot be ticked within 20 seconds of adding', () => {
  const s = addTask(emptyState, 'Run', 'hard', false, 'r', 30);
  const created = Date.parse(s.tasks[0].createdAt);
  assert.equal(toggleTask(s, 'r', TODAY, created + 3_000), s);
  assert.equal(secondsUntilTickable(s.tasks[0], created), 20);
  assert.equal(secondsUntilTickable(s.tasks[0], created + 15_000), 5);
  assert.equal(secondsUntilTickable(s.tasks[0], created + 14_200), 6);
  assert.equal(secondsUntilTickable(s.tasks[0], created + 20_000), 0);
  assert.ok(toggleTask(s, 'r', TODAY, created + 20_000).completions[0].xp > 0);
});

test('anti-cheat: the wait after adding never locks a task longer than 20 seconds', () => {
  const s = addTask(emptyState, 'Run', 'hard', false, 'r', 30);
  const created = Date.parse(s.tasks[0].createdAt);
  // phone clock turned back an hour after adding
  assert.equal(secondsUntilTickable(s.tasks[0], created - 3_600_000), 0);
  // unticking is never blocked
  const done = toggleTask(s, 'r', TODAY, created + 30_000);
  assert.equal(toggleTask(done, 'r', TODAY, created + 30_000).completions.length, 0);
});

test('long tasks are allowed and keep earning more, up to 16 hours', () => {
  assert.ok(xpFor(240, 'easy') > xpFor(120, 'easy'));
  assert.ok(xpFor(600, 'easy') > xpFor(240, 'easy'));
  assert.equal(xpFor(2000, 'easy'), xpFor(16 * 60, 'easy'));
});
