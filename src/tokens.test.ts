import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grantLevelRewards, LEVEL_LADDER, LEVEL_MILESTONES, unlockedRewards } from './achievements.ts';
import { addDays, addTask, challengesForWeek, emptyState, streakStatus, toggleTask, weekStart, weeklyChallenges, type Completion, type GameState } from './game.ts';
import { restOffer, spendDoubleXp, spendRestDay, swapChallenge, tokenCounts } from './tokens.ts';

const TODAY = '2026-10-21';
const day = (date: string, xp = 20): Completion => ({ taskId: 'x', date, xp, title: 'Run' });
const streak = (n: number, end: string) => Array.from({ length: n }, (_, i) => day(addDays(end, -i)));
const withLevel = (level: number, extra: Partial<GameState> = {}) => grantLevelRewards({ ...emptyState, joinedAt: TODAY, ...extra }, level);

test('the ladder pays out often early on and never clashes with Climber rewards', () => {
  const levels = LEVEL_MILESTONES.map((m) => m.level);
  for (let l = 2; l <= 10; l++) assert.ok(levels.includes(l), `level ${l}`);
  assert.equal(new Set(levels).size, levels.length);
  const m10 = LEVEL_MILESTONES.find((m) => m.level === 10)!;
  assert.equal(m10.reward?.label, 'Midnight theme');
  assert.equal(m10.climberTier, 1);
  const m5 = LEVEL_MILESTONES.find((m) => m.level === 5)!;
  assert.equal(m5.bonusXp, 25);
  assert.equal(m5.reward?.kind, 'title');
  assert.equal(LEVEL_MILESTONES.find((m) => m.level === 2)!.climberTier, undefined);
  // From level 10 on no gap is longer than 10 levels.
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i] - levels[i - 1] <= 10, `${levels[i - 1]} -> ${levels[i]}`);
});

test('level rewards are handed out once and add up to tokens', () => {
  assert.deepEqual(tokenCounts(withLevel(1)), { rest: 0, double: 0, reroll: 0, adfree: 0 });
  const s = withLevel(9);
  // 2-9: tokens on 2, 3, 4, 7, 9; a title on 5, a frame on 6, a flame on 8.
  assert.deepEqual(tokenCounts(s), { rest: 2, double: 2, reroll: 1, adfree: 0 });
  assert.equal(tokenCounts(withLevel(11)).adfree, 1);
  assert.equal(grantLevelRewards(s, 9), s);
  assert.equal(grantLevelRewards(s, 5), s); // losing levels takes nothing back
  assert.ok(unlockedRewards(s).some((r) => r.label === '"Rising Star" title'));
  const top = withLevel(100);
  assert.equal(top.levelRewards!.length, LEVEL_LADDER.length);
});

test('a rest day keeps a streak through today, or saves a missed yesterday', () => {
  // Streak until yesterday, nothing yet today: offer today.
  let s = withLevel(2, { completions: streak(5, addDays(TODAY, -1)) });
  assert.deepEqual(restOffer(s, TODAY), { day: TODAY, keeps: 5, missed: false, tier: 1, streakLost: false });
  s = spendRestDay(s, TODAY, TODAY);
  assert.equal(streakStatus(s.completions, TODAY, s.restDays).atRisk, false);
  assert.equal(tokenCounts(s).rest, 0);
  assert.equal(restOffer(s, TODAY), undefined);
  // Tomorrow the streak is still 5 days, not broken by the rest day.
  assert.equal(streakStatus(s.completions, addDays(TODAY, 1), s.restDays).days, 5);

  // Missed yesterday, the streak already ended: the token brings it back.
  s = withLevel(2, { completions: streak(4, addDays(TODAY, -2)) });
  assert.equal(streakStatus(s.completions, TODAY).days, 0);
  assert.deepEqual(restOffer(s, TODAY), { day: addDays(TODAY, -1), keeps: 4, missed: true, tier: 0, streakLost: true });
  s = spendRestDay(s, addDays(TODAY, -1), TODAY);
  assert.equal(streakStatus(s.completions, TODAY, s.restDays).days, 4);

  // Nothing to save, or no token: no offer, and spending does nothing.
  const none = withLevel(1, { completions: streak(4, addDays(TODAY, -1)) });
  assert.equal(restOffer(none, TODAY), undefined);
  assert.equal(spendRestDay(none, TODAY, TODAY), none);
  const fresh = withLevel(2);
  assert.equal(restOffer(fresh, TODAY), undefined);
  // An older missed day can't be covered.
  assert.equal(spendRestDay(withLevel(2, { completions: streak(4, addDays(TODAY, -3)) }), addDays(TODAY, -2), TODAY).restDays, undefined);
});

test('double XP doubles every task finished that day, once per token', () => {
  let s = withLevel(3);
  s = addTask(s, 'Go for a run', true, 'run', 30);
  s = spendDoubleXp(s, TODAY);
  assert.deepEqual(s.doubleDays, [TODAY]);
  assert.equal(spendDoubleXp(s, TODAY), s); // already on today
  const ticked = toggleTask(s, 'run', TODAY);
  assert.equal(ticked.completions[0].xp, 40); // 30 min = 20 XP, doubled
  assert.equal(toggleTask(withLevel(3, { tasks: s.tasks }), 'run', TODAY).completions[0].xp, 20);
  assert.equal(spendDoubleXp(withLevel(1), TODAY).doubleDays, undefined);
});

test('a challenge swap replaces one open challenge with a different kind', () => {
  let s = withLevel(4);
  const before = weeklyChallenges(s, TODAY).map((c) => c.def);
  s = swapChallenge(s, before[0].id, TODAY);
  const after = weeklyChallenges(s, TODAY).map((c) => c.def);
  assert.notEqual(after[0].id, before[0].id);
  assert.deepEqual(after.slice(1), before.slice(1));
  assert.equal(new Set(after.map((d) => d.metric)).size, 3);
  assert.equal(tokenCounts(s).reroll, 0);
  assert.equal(swapChallenge(s, after[1].id, TODAY), s); // no token left
  // Next week is untouched.
  assert.deepEqual(weeklyChallenges(s, addDays(TODAY, 7)).map((c) => c.def.id), challengesForWeek(weekStart(addDays(TODAY, 7))).map((d) => d.id));
});

test('a claimed or finished challenge can not be swapped', () => {
  const week = weekStart(TODAY);
  const first = challengesForWeek(week)[0];
  const s = withLevel(4, { claims: [{ challengeId: first.id, week, xp: 100, date: TODAY }] });
  assert.equal(swapChallenge(s, first.id, TODAY), s);
  // Seven active days with plenty of tasks finish most challenges; finished ones stay.
  const busy = withLevel(4, {
    completions: Array.from({ length: 40 }, (_, i) => ({ taskId: 't' + i, date: addDays(week, i % 3), xp: 40, minutes: 90, title: 'Task ' + i })),
  });
  for (const c of weeklyChallenges(busy, TODAY).filter((c) => c.complete)) assert.equal(swapChallenge(busy, c.def.id, TODAY), busy);
});

test('token counts never go below zero', () => {
  // More rest days used than the ladder now gives (e.g. after a level's token became a look).
  const s = withLevel(3, { restDays: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'] });
  assert.equal(tokenCounts(s).rest, 0);
});
