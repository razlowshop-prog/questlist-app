import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addTask,
  bizzyNudge,
  maxPerWeek,
  reminderPlan,
  upcomingTasks,
  weekdayOf,
  CHALLENGE_POOL,
  challengesForWeek,
  claimChallenge,
  currentStreak,
  DEFAULT_MINUTES,
  deleteTask,
  restoreTask,
  emptyState,
  evolveBizzy,
  resetProgress,
  finishSetup,
  levelInfo,
  longestStreak,
  MAX_LEVEL,
  rankFor,
  repeatLabel,
  secondsUntilTickable,
  nextStreakBonus,
  streakBonus,
  streakStatus,
  taskXp,
  toggleTask,
  totalXp,
  updateSettings,
  visibleTasks,
  weekStart,
  weekStats,
  withDefaults,
  xpFor,
  xpToNext,
  type Completion,
  type GameState,
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
  assert.equal(streakBonus(4), 0);
  assert.equal(streakBonus(5), 0.1);
  assert.equal(streakBonus(9), 0.1);
  assert.equal(streakBonus(10), 0.2);
  assert.equal(streakBonus(29), 0.2);
  assert.equal(streakBonus(30), 0.3);
  assert.equal(streakBonus(149), 0.3);
  assert.equal(streakBonus(150), 0.5);
  assert.equal(streakBonus(1000), 0.5);
  assert.deepEqual(nextStreakBonus(3), { days: 5, bonus: 0.1, daysLeft: 2 });
  assert.equal(nextStreakBonus(150), undefined);
});

test('completing a task awards XP and unticking removes it', () => {
  let s = addTask(emptyState, 'Wash dishes', true, 't1');
  s = toggleTask(s, 't1', TODAY);
  assert.equal(totalXp(s), xpFor(DEFAULT_MINUTES));
  s = toggleTask(s, 't1', TODAY);
  assert.equal(totalXp(s), 0);
});

test('streak bonus is applied on completion', () => {
  let s = addTask(emptyState, 'Run', true, 't1');
  // 6 earlier days done, so today makes 7 -> 1.1x
  s = { ...s, completions: streakOf(6, addDays(TODAY, -1)).map((c) => ({ ...c, xp: 0 })) };
  s = toggleTask(s, 't1', TODAY);
  assert.equal(s.completions.at(-1)!.xp, Math.round(xpFor(DEFAULT_MINUTES, 'hard') * 1.1));
});

test('daily tasks reset each day, one-off tasks disappear after the day they were done', () => {
  let s = addTask(emptyState, 'Daily', true, 'd');
  s = addTask(s, 'Once', false, 'o');
  s = toggleTask(s, 'd', TODAY);
  s = toggleTask(s, 'o', TODAY);
  assert.equal(visibleTasks(s, TODAY).length, 2);
  const tomorrow = addDays(TODAY, 1);
  assert.deepEqual(visibleTasks(s, tomorrow).map((t) => t.id), ['d']);
  // Daily task can be earned again tomorrow
  s = toggleTask(s, 'd', tomorrow);
  assert.equal(totalXp(s), 3 * xpFor(DEFAULT_MINUTES));
});

test('empty titles are ignored and deleting keeps earned XP', () => {
  assert.equal(addTask(emptyState, '   ', false).tasks.length, 0);
  let s = addTask(emptyState, 'A', false, 'a');
  s = toggleTask(s, 'a', TODAY);
  s = deleteTask(s, 'a');
  assert.equal(s.tasks.length, 0);
  assert.equal(totalXp(s), xpFor(DEFAULT_MINUTES));
});

test('undo puts a removed task back in its place, once', () => {
  let s = addTask(emptyState, 'A', false, 'a');
  s = addTask(s, 'B', false, 'b');
  s = addTask(s, 'C', false, 'c');
  const order = s.tasks.map((t) => t.id);
  const i = order.indexOf('b');
  const task = s.tasks[i];
  const gone = deleteTask(s, 'b');
  const back = restoreTask(gone, task, i);
  assert.deepEqual(back.tasks.map((t) => t.id), order);
  // A second Undo changes nothing.
  assert.equal(restoreTask(back, task, i), back);
  // An index past the end (other tasks removed meanwhile) puts it last.
  assert.deepEqual(restoreTask(deleteTask(deleteTask(gone, 'a'), 'c'), task, 5).tasks.map((t) => t.id), ['b']);
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
  let s = addTask(emptyState, 'Long thing', true, 'h');
  // Fill the week with plenty of long, different completions on every day
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(week, i));
  s = {
    ...s,
    completions: days.flatMap((date) =>
      Array.from({ length: 5 }, (_, i) => ({ taskId: 'h', date, xp: 40, minutes: 90, title: `Task ${date} ${i}` })),
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
  let s = addTask(emptyState, 'Gym', 3, 'g');
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
  assert.equal(repeatLabel(addTask(emptyState, 'a', false).tasks[0]), 'One-time');
  assert.equal(repeatLabel(addTask(emptyState, 'a', true).tasks[0]), 'Every day');
  assert.equal(repeatLabel(addTask(emptyState, 'a', 7).tasks[0]), 'Every day');
});

test('finishing setup stores goals and name', () => {
  const s = finishSetup(emptyState, ' Fabian ', ['home', 'fitness']);
  assert.equal(s.onboarded, true);
  assert.equal(s.profile.name, 'Fabian');
  assert.deepEqual(s.goals, ['home', 'fitness']);
});

test('XP comes from time and effort', () => {
  assert.equal(xpFor(5), 5);
  assert.equal(xpFor(15), 15);
  assert.equal(xpFor(30), 20);
  assert.equal(xpFor(60), 35);
  assert.equal(xpFor(120), 55);
  // Active pays x1.25, hard x1.5, willpower a flat 10 whatever the time.
  assert.equal(xpFor(30, 'active'), 25);
  assert.equal(xpFor(30, 'hard'), 30);
  assert.equal(xpFor(60, 'hard'), 55);
  assert.equal(xpFor(5, 'willpower'), 10);
  assert.equal(xpFor(480, 'willpower'), 10);
  // Walking 5 km (~60 min) beats doing the dishes (~15 min) by a lot
  assert.ok(xpFor(60) >= 2 * xpFor(15));
  const s = addTask(emptyState, 'Walk 5 km', false, 'w', 60);
  assert.equal(taskXp(s.tasks[0]), xpFor(60, 'active'));
  assert.equal(toggleTask(s, 'w', TODAY).completions[0].xp, xpFor(60, 'active'));
  // The effort comes from the task, never from the player.
  const lib = addTask(emptyState, 'Strength workout', true, 'g', 45, { libraryId: 'strength-workout' });
  assert.equal(taskXp(lib.tasks[0]), 45);
  assert.equal(taskXp({ ...lib.tasks[0], title: 'Renamed' }), 45, 'the saved library id wins');
  assert.equal(taskXp(addTask(emptyState, 'No alcohol today', true, 'n', 5).tasks[0]), 10);
  assert.equal(taskXp(addTask(emptyState, 'Run 10 km', false, 'r', 60).tasks[0]), xpFor(60, 'hard'));
  assert.equal(taskXp(addTask(emptyState, 'Sort my photos', false, 'p', 30).tasks[0]), 20, 'unknown tasks are light');
  // Old saved tasks with a difficulty and no time get the default time's XP
  assert.equal(taskXp({ id: 'o', title: 'Old', difficulty: 'hard', daily: true, createdAt: '' }), xpFor(DEFAULT_MINUTES));
});

test('anti-cheat: the same task title gives full XP 5 times a day, then less', () => {
  let s = emptyState;
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
  for (const id of ids) s = addTask(s, 'Do the dishes', false, id, 15);
  for (const id of ids) s = toggleTask(s, id, TODAY);
  assert.deepEqual(s.completions.map((c) => c.xp), [15, 15, 15, 15, 15, 8, 4, 2, 2]);
  assert.equal(s.completions[4].limited, undefined);
  assert.equal(s.completions[5].limited, 'repeat');
  assert.equal(s.completions[0].limited, undefined);
});

test('anti-cheat: only 16 hours of task time per day earn XP', () => {
  let s = emptyState;
  for (let i = 0; i < 10; i++) s = addTask(s, `Task ${i}`, false, `t${i}`, 120);
  for (let i = 0; i < 10; i++) s = toggleTask(s, `t${i}`, TODAY);
  const xps = s.completions.map((c) => c.xp);
  assert.ok(xps.slice(0, 8).every((x) => x > 0)); // 8 × 2 h = 16 h
  assert.deepEqual(xps.slice(8), [0, 0]);
  assert.equal(s.completions[9].limited, 'daily');
  // Next day is fine again
  s = toggleTask(addTask(s, 'Tomorrow', false, 'n', 15), 'n', addDays(TODAY, 1));
  assert.equal(s.completions.at(-1)!.xp, xpFor(15));
});

test('anti-cheat: a task cannot be ticked within 20 seconds of adding', () => {
  const s = addTask(emptyState, 'Run', false, 'r', 30);
  const created = Date.parse(s.tasks[0].createdAt);
  assert.equal(toggleTask(s, 'r', TODAY, created + 3_000), s);
  assert.equal(secondsUntilTickable(s.tasks[0], created), 20);
  assert.equal(secondsUntilTickable(s.tasks[0], created + 15_000), 5);
  assert.equal(secondsUntilTickable(s.tasks[0], created + 14_200), 6);
  assert.equal(secondsUntilTickable(s.tasks[0], created + 20_000), 0);
  assert.ok(toggleTask(s, 'r', TODAY, created + 20_000).completions[0].xp > 0);
});

test('anti-cheat: the wait after adding never locks a task longer than 20 seconds', () => {
  const s = addTask(emptyState, 'Run', false, 'r', 30);
  const created = Date.parse(s.tasks[0].createdAt);
  // phone clock turned back an hour after adding
  assert.equal(secondsUntilTickable(s.tasks[0], created - 3_600_000), 0);
  // unticking is never blocked
  const done = toggleTask(s, 'r', TODAY, created + 30_000);
  assert.equal(toggleTask(done, 'r', TODAY, created + 30_000).completions.length, 0);
});

test('long tasks are allowed and keep earning more, up to 16 hours', () => {
  assert.ok(xpFor(240) > xpFor(120));
  assert.ok(xpFor(600) > xpFor(240));
  assert.equal(xpFor(2000), xpFor(16 * 60));
});

test('tasks on fixed weekdays only show on those days', () => {
  const monday = weekStart(TODAY);
  let s = addTask(emptyState, 'Gym', true, 'g', 60, { days: [4, 0, 2, 2, 9] });
  assert.deepEqual(s.tasks[0].days, [0, 2, 4]);
  assert.equal(repeatLabel(s.tasks[0]), 'Mon, Wed, Fri');
  assert.equal(visibleTasks(s, monday).length, 1);
  assert.equal(visibleTasks(s, addDays(monday, 1)).length, 0);
  assert.equal(visibleTasks(s, addDays(monday, 4)).length, 1);
  s = toggleTask(s, 'g', monday);
  assert.equal(visibleTasks(s, monday).length, 1); // ticked stays visible today
  assert.equal(repeatLabel(addTask(emptyState, 'a', true, 'a', 5, { days: [0, 1, 2, 3, 4] }).tasks[0]), 'Weekdays');
});

test('weekday of a date, Monday first', () => {
  const monday = weekStart(TODAY);
  assert.equal(weekdayOf(monday), 0);
  assert.equal(weekdayOf(addDays(monday, 6)), 6);
});

test('week-long tasks can only repeat once a week', () => {
  assert.equal(maxPerWeek('Meal prep for the week'), 1);
  assert.equal(maxPerWeek('Weekly review'), 1);
  assert.equal(maxPerWeek('Wochenplanung'), 1);
  assert.equal(maxPerWeek('Einmal wöchentlich Bad putzen'), 1);
  assert.equal(maxPerWeek('Gehen'), 7);
  assert.equal(maxPerWeek('Clean the bathroom'), 7);
  let s = addTask(emptyState, 'Meal prep for the week', 5, 'm');
  assert.equal(s.tasks[0].perWeek, 1);
  s = addTask(emptyState, 'Meal prep for the week', true, 'm', 90, { days: [6, 2] });
  assert.deepEqual(s.tasks[0].days, [2]);
});

test('one-off tasks planned for a later day wait until then', () => {
  const later = addDays(TODAY, 3);
  const s = addTask(emptyState, 'Dentist', false, 'd', 60, { date: later });
  assert.equal(visibleTasks(s, TODAY).length, 0);
  assert.deepEqual(upcomingTasks(s, TODAY).map((t) => t.id), ['d']);
  assert.equal(visibleTasks(s, later).length, 1);
  assert.equal(visibleTasks(s, addDays(later, 2)).length, 1); // overdue stays
  assert.equal(upcomingTasks(s, later).length, 0);
  // A date on a repeating task is ignored
  assert.equal(addTask(emptyState, 'x', true, 'x', 5, { date: later }).tasks[0].date, undefined);
});

/** Task reminders only, without the streak warning. */
const taskReminders = (...args: Parameters<typeof reminderPlan>) => reminderPlan(...args).filter((r) => r.taskId !== 'streak');

test('reminders: valid times only, skipped once done, not in the past', () => {
  assert.equal(addTask(emptyState, 'a', true, 'a', 5, { reminder: '25:00' }).tasks[0].reminder, undefined);
  const [y, m, d] = TODAY.split('-').map(Number);
  const morning = new Date(y, m - 1, d, 9, 0);
  let s = addTask(emptyState, 'Stretch', true, 's', 10, { reminder: '18:30' });
  let plan = taskReminders(s, morning);
  assert.equal(plan.length, 7);
  assert.equal(plan[0].at.getHours(), 18);
  assert.equal(plan[0].at.getMinutes(), 30);
  // Ticked today: today's reminder goes
  s = toggleTask(s, 's', TODAY);
  plan = taskReminders(s, morning);
  assert.equal(plan.length, 6);
  assert.notEqual(plan[0].at.getDate(), d);
  // After 18:30 today's is in the past
  const evening = new Date(y, m - 1, d, 20, 0);
  assert.equal(taskReminders(addTask(emptyState, 'b', true, 'b', 5, { reminder: '18:30' }), evening).length, 6);
  // One-off: reminders until done, from its date on
  const o = addTask(emptyState, 'Call', false, 'o', 5, { reminder: '10:00', date: addDays(TODAY, 2) });
  assert.equal(taskReminders(o, morning).length, 5);
  assert.equal(taskReminders(toggleTask(o, 'o', addDays(TODAY, 2)), morning).length, 0);
  // The limit holds
  assert.equal(reminderPlan(s, morning, 7, 3).length, 3);
});

test('reminders skip the rest of the week once the weekly target is met', () => {
  const monday = weekStart(TODAY);
  const [y, m, d] = monday.split('-').map(Number);
  let s = addTask(emptyState, 'Run', 1, 'r', 30, { reminder: '07:00' });
  s = toggleTask(s, 'r', monday);
  const plan = taskReminders(s, new Date(y, m - 1, d, 6, 0));
  assert.ok(plan.every((p) => p.at >= new Date(y, m - 1, d + 7)));
  assert.equal(plan.length, 0); // 7-day window ends Sunday
});

test('week stats for the new challenges: hours, long tasks, variety, busy days', () => {
  const monday = weekStart(TODAY);
  const c = (date: string, minutes: number, title: string): Completion => ({ taskId: title, date, xp: 10, minutes, title });
  const s = {
    ...emptyState,
    completions: [
      c(monday, 60, 'Run'),
      c(monday, 30, 'Read'),
      c(monday, 30, 'read '), // same task, different spacing/case
      c(addDays(monday, 1), 90, 'Gym'),
      c(addDays(monday, 2), 15, 'Dishes'),
      c(addDays(monday, 2), 15, 'Dishes'),
      c(addDays(monday, 2), 15, 'Laundry'),
      c(addDays(monday, -1), 600, 'Last week'),
    ],
  };
  const w = weekStats(s, TODAY);
  assert.equal(w.tasksDone, 7);
  assert.equal(w.hoursDone, 4.2); // 255 min, rounded down
  assert.equal(w.longDone, 2);
  assert.equal(w.variety, 5);
  assert.equal(w.busyDays, 2);
});

test('every challenge comes up over the weeks, never two measuring the same thing', () => {
  const seen = new Set<string>();
  let week = weekStart(TODAY);
  for (let i = 0; i < 60; i++, week = addDays(week, 7)) {
    const picks = challengesForWeek(week);
    assert.equal(picks.length, 3);
    assert.equal(new Set(picks.map((p) => p.metric)).size, 3);
    picks.forEach((p) => seen.add(p.id));
  }
  assert.equal(seen.size, CHALLENGE_POOL.length);
});

// Days from Monday 2026-10-05 onward; each active day earns `xp`.
function activeDays(from: string, count: number, xp: number): Completion[] {
  return Array.from({ length: count }, (_, i) => ({ taskId: 'x', date: addDays(from, i), xp }));
}
const MON = '2026-10-05';

test('streak tiers: weekly XP sets the fire tier on Monday', () => {
  assert.equal(weekdayOf(MON), 0);
  // Week 1: 7 × 20 = 140 XP -> Flame on Monday
  let s = streakStatus(activeDays(MON, 8, 20), addDays(MON, 7));
  assert.equal(s.tier, 1);
  assert.equal(s.days, 8);
  // 7 × 50 = 350 XP -> straight to Inferno
  s = streakStatus(activeDays(MON, 8, 50), addDays(MON, 7));
  assert.equal(s.tier, 3);
  // Thresholds are inclusive: 200 XP is Blaze, 300 XP is Inferno, 195 XP only Flame
  const week = (total: number) => [{ taskId: 'x', date: MON, xp: total - 6 * 5 }, ...activeDays(addDays(MON, 1), 7, 5)];
  assert.equal(streakStatus(week(200), addDays(MON, 7)).tier, 2);
  assert.equal(streakStatus(week(300), addDays(MON, 7)).tier, 3);
  assert.equal(streakStatus(week(195), addDays(MON, 7)).tier, 1);
  // 7 × 10 = 70 XP -> still Spark
  s = streakStatus(activeDays(MON, 8, 10), addDays(MON, 7));
  assert.equal(s.tier, 0);
  // Blaze and Inferno wait until the week is over (Flame lit on day 2)
  assert.equal(streakStatus(activeDays(MON, 7, 50), addDays(MON, 6)).tier, 1);
  assert.equal(streakStatus(activeDays(MON, 7, 50), addDays(MON, 6)).weekTier, 3);
});

test('streak tiers: Flame lights the moment a streak has earned 100 XP', () => {
  // 60 + 40 XP: Flame on day 2, today counting right away
  let s = streakStatus(activeDays(MON, 2, 50).map((c, i) => ({ ...c, xp: i ? 40 : 60 })), addDays(MON, 1));
  assert.equal(s.tier, 1);
  assert.equal(s.streakXp, 100);
  assert.deepEqual(s.history, [{ date: addDays(MON, 1), change: 'up', tier: 1, days: 2 }]);
  // 99 XP is still Spark
  s = streakStatus(activeDays(MON, 3, 33), addDays(MON, 2));
  assert.equal(s.tier, 0);
  assert.equal(s.streakXp, 99);
  // A streak running over a Monday counts all its days
  const sun = addDays(MON, 6);
  s = streakStatus([{ taskId: 'x', date: sun, xp: 60 }, { taskId: 'x', date: addDays(sun, 1), xp: 40 }], addDays(sun, 1));
  assert.equal(s.tier, 1);
  assert.equal(s.history.length, 1);
  // A lost streak starts counting again from zero
  s = streakStatus([...activeDays(MON, 2, 40), ...activeDays(addDays(MON, 3), 1, 30)], addDays(MON, 3));
  assert.equal(s.tier, 0);
  assert.equal(s.streakXp, 30);
  assert.equal(s.days, 1);
  // No streak, no streak XP
  assert.equal(streakStatus([], MON).streakXp, 0);
  // Already on Flame from the instant rule: Monday only moves it up, no duplicate change
  s = streakStatus(activeDays(MON, 8, 20), addDays(MON, 7));
  assert.deepEqual(s.history.map((h) => [h.date, h.tier]), [[addDays(MON, 4), 1]]);
});

test('streak tiers: a missed day costs a tier, on the lowest tier the streak ends', () => {
  const week1 = activeDays(MON, 8, 50); // Inferno from the second Monday
  const tue = addDays(MON, 8);
  // Miss Tuesday: Inferno -> Blaze, days kept
  let s = streakStatus([...week1, ...activeDays(addDays(tue, 1), 1, 50)], addDays(tue, 1));
  assert.equal(s.tier, 2);
  assert.equal(s.days, 9);
  // Miss three days in a row: Inferno -> Blaze -> Flame -> streak gone
  s = streakStatus(week1, addDays(tue, 3));
  assert.equal(s.tier, 0);
  assert.equal(s.days, 0);
  assert.equal(s.best, 8);
  // Two missed days leave Flame and the days
  s = streakStatus(week1, addDays(tue, 2));
  assert.equal(s.tier, 1);
  assert.equal(s.days, 8);
  // Flame (from a 140 XP week) loses everything on a single missed day
  s = streakStatus(activeDays(MON, 8, 20), addDays(MON, 9));
  assert.equal(s.days, 0);
  assert.equal(s.tier, 0);
});

test('streak is at risk until something is done today, and today never breaks it', () => {
  const s = streakStatus(streakOf(3, addDays(TODAY, -1)), TODAY);
  assert.equal(s.days, 3);
  assert.equal(s.atRisk, true);
  assert.equal(streakStatus(streakOf(3), TODAY).atRisk, false);
  assert.equal(streakStatus([], TODAY).atRisk, false);
  assert.equal(longestStreak([...streakOf(3, '2026-10-01'), ...streakOf(5, TODAY)]), 5);
});

test('streak warning at 20:00 while nothing is done today, unless turned off', () => {
  const [y, m, d] = TODAY.split('-').map(Number);
  const noon = new Date(y, m - 1, d, 12, 0);
  let s = { ...emptyState, completions: streakOf(4, addDays(TODAY, -1)) };
  let plan = reminderPlan(s, noon).filter((r) => r.taskId === 'streak');
  assert.equal(plan.length, 3);
  assert.equal(plan[0].at.getHours(), 20);
  assert.equal(plan[0].at.getDate(), d);
  assert.match(plan[0].title, /4-day streak ends at midnight/);
  // Bizzy speaks in the reminders.
  assert.match(plan[0].body ?? '', /^🐝 Bizzy is getting nervous/);
  assert.match(plan[1].body ?? '', /^🐝 Bizzy misses you/);
  // Done today: tonight's warning goes, the next days stay
  s = { ...s, completions: [...s.completions, { taskId: 'x', date: TODAY, xp: 10 }] };
  plan = reminderPlan(s, noon).filter((r) => r.taskId === 'streak');
  assert.equal(plan.length, 2);
  assert.notEqual(plan[0].at.getDate(), d);
  // Turned off, or no streak
  assert.equal(reminderPlan(updateSettings(s, { streakReminders: false }), noon).length, 0);
  assert.equal(reminderPlan(emptyState, noon).length, 0);
});

test('task reminders carry a line from Bizzy that changes from day to day', () => {
  const lines = new Set<string>();
  for (let i = 0; i < 14; i++) lines.add(bizzyNudge(addDays(TODAY, i), 't1'));
  assert.ok(lines.size >= 2);
  for (const l of lines) assert.match(l, /^🐝 /);
  // The same day and task always get the same line.
  assert.equal(bizzyNudge(TODAY, 't1'), bizzyNudge(TODAY, 't1'));
  const [y, m, d] = TODAY.split('-').map(Number);
  let s = addTask(emptyState, 'Wash dishes', true, 't1');
  s = { ...s, tasks: s.tasks.map((t) => ({ ...t, reminder: '18:00' })) };
  const plan = taskReminders(s, new Date(y, m - 1, d, 9, 0));
  assert.ok(plan.length > 0);
  assert.equal(plan[0].body, bizzyNudge(TODAY, 't1'));
});

test('resetting progress starts a new player but keeps how the app is set up', () => {
  let s = addTask(emptyState, 'Wash dishes', true, 't1');
  s = toggleTask(s, 't1', TODAY);
  s = {
    ...s,
    onboarded: true,
    joinedAt: TODAY,
    goals: ['fitness'],
    profile: { name: 'Fabian' },
    settings: {
      ...s.settings,
      theme: 'gold',
      title: 'Early bird',
      frame: 'bronze',
      showcase: ['x'],
      guideHidden: true,
      lang: 'de',
      sounds: false,
      haptics: false,
      email: 'a@b.at',
      quoteEmails: true,
      lastBackup: TODAY,
      reviewAsks: [TODAY],
    },
  };
  assert.ok(totalXp(s) > 0);
  const r = resetProgress(s);
  assert.equal(totalXp(r), 0);
  assert.equal(r.tasks.length, 0);
  assert.equal(r.completions.length, 0);
  assert.equal(r.onboarded, false);
  assert.equal(r.joinedAt, '');
  assert.deepEqual(r.goals, []);
  assert.deepEqual(r.profile, emptyState.profile);
  assert.deepEqual(r.settings, {
    quoteEmails: true,
    email: 'a@b.at',
    theme: 'classic',
    lang: 'de',
    sounds: false,
    haptics: false,
    lastBackup: TODAY,
    reviewAsks: [TODAY],
  });
  // A fresh player resets to the same fresh player.
  assert.deepEqual(resetProgress(emptyState), emptyState);
});

test('Bizzy evolves one form per tap, only when the level allows it', () => {
  const at = (xp: number): GameState => ({ ...emptyState, dev: { xp } });
  assert.equal(levelInfo(0).level, 1);
  const larva = at(0);
  assert.equal(evolveBizzy(larva), larva, 'level 1: nothing happens');
  const level2 = at(levelInfo(0).xpForLevel);
  assert.equal(levelInfo(totalXp(level2)).level, 2);
  const bud = evolveBizzy(level2);
  assert.equal(bud.bizzyForm, 2);
  assert.equal(evolveBizzy(bud), bud, 'Buzzling needs level 5');
  // Far past several levels: one step per tap, until he is the Queen.
  let s = at(10_000_000);
  for (let i = 0; i < 20; i++) s = evolveBizzy(s);
  assert.equal(s.bizzyForm, 10);
  assert.equal(resetProgress(s).bizzyForm, undefined, 'starting over brings back the Larva');
});
