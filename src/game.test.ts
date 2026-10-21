import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addTask,
  badges,
  challengesForWeek,
  claimChallenge,
  currentStreak,
  deleteTask,
  emptyState,
  levelInfo,
  longestStreak,
  rankFor,
  streakBonus,
  toggleTask,
  totalXp,
  visibleTasks,
  weekStart,
  weekStats,
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

test('levels: 0 XP is level 1, 100 XP is level 2, 250 XP is level 3', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(249).level, 2);
  assert.equal(levelInfo(250).level, 3);
  assert.equal(levelInfo(130).xpIntoLevel, 30);
  assert.equal(levelInfo(130).xpForLevel, 150);
});

test('ranks change every 5 levels and cap at Legend', () => {
  assert.equal(rankFor(1), 'Rookie');
  assert.equal(rankFor(5), 'Rookie');
  assert.equal(rankFor(6), 'Apprentice');
  assert.equal(rankFor(999), 'Legend');
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

test('longest streak and badges', () => {
  const completions = [...streakOf(7, '2026-09-10'), ...streakOf(2)];
  assert.equal(longestStreak(completions), 7);
  const s = { ...emptyState, completions };
  const earned = badges(s, TODAY).filter((b) => b.earned).map((b) => b.id);
  assert.deepEqual(earned, ['first', 'streak3', 'streak7']);
});
