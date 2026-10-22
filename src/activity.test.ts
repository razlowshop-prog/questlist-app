import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityDayLabel, activitySummary, activityTimeline } from './activity.ts';
import { emptyState, type Completion, type GameState } from './game.ts';

const TODAY = '2026-10-21'; // a Wednesday
const done = (date: string, xp: number, title = 'Dishes', minutes?: number): Completion => ({ taskId: title, date, xp, title, minutes });
const state = (extra: Partial<GameState>): GameState => ({ ...emptyState, joinedAt: '2026-10-01', ...extra });

test('a new player has an empty timeline and a zero week', () => {
  assert.deepEqual(activityTimeline(state({}), TODAY), []);
  const s = activitySummary(state({}), TODAY);
  assert.deepEqual(s.thisWeek, { tasks: 0, minutes: 0, xp: 0, activeDays: 0 });
  assert.equal(s.week.length, 7);
  assert.deepEqual(s.week.map((d) => d.future), [false, false, false, true, true, true, true]);
});

test('tasks are grouped per day and title, newest day first, future days ignored', () => {
  const t = activityTimeline(
    state({ completions: [done('2026-10-20', 5, 'Dishes'), done(TODAY, 5, 'Dishes'), done(TODAY, 5, 'dishes '), done(TODAY, 35, 'Gym', 60), done('2026-10-22', 5)] }),
    TODAY,
  );
  assert.deepEqual(t.map((d) => d.date), [TODAY, '2026-10-20']);
  assert.deepEqual(t[0].tasks, [
    { title: 'Dishes', count: 2, xp: 10 },
    { title: 'Gym', count: 1, xp: 35 },
  ]);
  assert.equal(t[0].taskCount, 3);
  assert.equal(t[0].minutes, 15 + 15 + 60); // missing durations count as 15 min
  assert.equal(t[0].xp, 45);
});

test('the day a new level is reached shows a level up first', () => {
  const t = activityTimeline(state({ completions: [done('2026-10-20', 20), done(TODAY, 10)] }), TODAY);
  assert.deepEqual(t[0].events[0], { kind: 'level', level: 2, from: 1 });
  assert.equal(t[1].events.length, 0);
});

test('claimed challenges and achievements appear on their day, older claims get a fallback day', () => {
  const t = activityTimeline(
    state({
      claims: [
        { challengeId: 'tasks15', week: '2026-10-12', xp: 100, date: '2026-10-16' },
        { challengeId: 'days5', week: '2026-10-05', xp: 120 }, // no date: end of that week
        { challengeId: 'xp300', week: '2026-10-19', xp: 100 }, // no date, this week: today
      ],
      achievementClaims: [{ achievementId: 'tasks', tier: 0, xp: 25 }], // no date: joined day
    }),
    TODAY,
  );
  const kinds = (date: string) => t.find((d) => d.date === date)?.events.map((e) => e.kind);
  assert.deepEqual(kinds('2026-10-16'), ['level', 'challenge']);
  assert.ok(kinds('2026-10-11')?.includes('challenge'));
  assert.ok(kinds(TODAY)?.includes('challenge'));
  const joined = t.find((d) => d.date === '2026-10-01')!;
  assert.equal(joined.events.find((e) => e.kind === 'achievement')?.kind, 'achievement');
  assert.equal(joined.xp, 25);
  assert.equal(joined.taskCount, 0);
});

test('fire changes show: a Monday tier up, then a missed day costs a tier, then the streak is lost', () => {
  const lastWeek = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
  const t = activityTimeline(state({ completions: lastWeek.map((d) => done(d, 30)) }), TODAY);
  const fire = t.flatMap((d) => d.events.filter((e) => e.kind === 'fire').map((e) => ({ date: d.date, ...e })));
  assert.deepEqual(
    fire.sort((a, b) => (a.date < b.date ? -1 : 1)),
    [
      { date: '2026-10-19', kind: 'fire', change: 'up', tier: 2, days: 7 },
      { date: '2026-10-19', kind: 'fire', change: 'down', tier: 1, days: 7 },
      { date: '2026-10-20', kind: 'fire', change: 'lost', tier: 0, days: 7 },
    ],
  );
});

test('the week summary compares with the same days of last week', () => {
  const s = activitySummary(
    state({ completions: [done('2026-10-12', 10), done('2026-10-15', 50), done('2026-10-19', 20), done('2026-10-20', 15, 'Run', 30)] }),
    TODAY,
  );
  assert.deepEqual(s.thisWeek, { tasks: 2, minutes: 45, xp: 35, activeDays: 2 });
  assert.deepEqual(s.lastWeekSoFar, { tasks: 1, minutes: 15, xp: 10, activeDays: 1 });
  assert.deepEqual(s.week.slice(0, 3).map((d) => d.xp), [20, 15, 0]);
});

test('day labels read naturally', () => {
  assert.equal(activityDayLabel(TODAY, TODAY), 'Today');
  assert.equal(activityDayLabel('2026-10-20', TODAY), 'Yesterday');
  assert.equal(activityDayLabel('2026-10-19', TODAY), 'Mon 19 Oct');
  assert.equal(activityDayLabel('2025-12-31', TODAY), 'Wed 31 Dec 2025');
});

test('used rest and double XP tokens show on their day', () => {
  const t = activityTimeline(state({ completions: [done('2026-10-19', 20)], restDays: ['2026-10-20'], doubleDays: ['2026-10-19'] }), TODAY);
  assert.deepEqual(t.find((d) => d.date === '2026-10-20')?.events, [{ kind: 'token', token: 'rest' }]);
  assert.ok(t.find((d) => d.date === '2026-10-19')?.events.some((e) => e.kind === 'token' && e.token === 'double'));
});
