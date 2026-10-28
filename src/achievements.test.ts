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
  nextLevelReward,
  upcomingLevelRewards,
  UPCOMING_REWARDS,
  unlockedRewards,
} from './achievements.ts';
import { addDays, emptyState, levelInfo, MAX_LEVEL, totalXp, xpToNext, type Completion, type GameState } from './game.ts';

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

test('the level achievement follows the level shown in the header', () => {
  let s = stateWith(done(TODAY, 10, 2));
  for (const a of achievementStatuses(s, TODAY)) {
    for (let i = 0; i < a.reached; i++) s = claimAchievement(s, a.def.id, TODAY).state;
  }
  const level = achievementStatuses(s, TODAY).find((a) => a.def.id === 'level')!;
  assert.equal(level.value, levelInfo(totalXp(s)).level);
});

test('next level reward counts from the start of the current level', () => {
  // Level 1: 25 XP to level 2. 10 XP in.
  const r = nextLevelReward(10)!;
  assert.equal(r.milestone.level, 2);
  assert.deepEqual(r.levels.map((l) => l.level), [2]);
  assert.equal(r.xpInto, 10);
  assert.equal(r.xpNeeded, xpToNext(1));
  // At level 10, the next reward is level 11 (every level pays out).
  let xp = 0;
  for (let l = 1; l < 10; l++) xp += xpToNext(l);
  const r10 = nextLevelReward(xp + 5)!;
  assert.deepEqual(r10.levels.map((l) => [l.level, !!l.milestone]), [[11, true]]);
  assert.equal(r10.xpInto, 5);
  assert.equal(r10.xpNeeded, xpToNext(10));
});

test('next level reward skips to the next milestone once one is reached', () => {
  let xp = 0;
  for (let l = 1; l < 10; l++) xp += xpToNext(l);
  const atTen = nextLevelReward(xp)!;
  assert.equal(levelInfo(xp).level, 10);
  assert.equal(atTen.milestone.level, 11);
  assert.equal(atTen.milestone.reward?.label, 'Ad-free day');
  assert.equal(atTen.xpInto, 0);
  assert.equal(atTen.levels.length, 1);
  const nine = nextLevelReward(xp - 1)!;
  assert.equal(nine.milestone.level, 10);
  assert.equal(nine.milestone.reward?.label, 'Midnight theme');
  assert.equal(nine.xpNeeded - nine.xpInto, 1);
});

test('no next level reward at the top', () => {
  let xp = 0;
  for (let l = 1; l < 100; l++) xp += xpToNext(l);
  assert.equal(nextLevelReward(xp), undefined);
  assert.equal(nextLevelReward(xp - 1)!.milestone.level, 100);
});

test('the XP bar preview lists the next levels with the XP still to go', () => {
  const first = upcomingLevelRewards(0);
  assert.equal(first.length, UPCOMING_REWARDS);
  assert.equal(first[0].milestone.level, 2);
  assert.equal(first[0].xpAway, xpToNext(1));
  // Each next level is one level's worth of XP further away.
  for (let i = 1; i < first.length; i++) {
    const prev = first[i - 1].milestone.level;
    assert.ok(first[i].milestone.level > prev);
    if (first[i].milestone.level === prev + 1) assert.equal(first[i].xpAway - first[i - 1].xpAway, xpToNext(prev));
  }
  // Halfway through a level, the first one is only the rest of it away.
  const mid = xpToNext(1) + Math.floor(xpToNext(2) / 2);
  const info = levelInfo(mid);
  assert.equal(upcomingLevelRewards(mid)[0].xpAway, info.xpForLevel - info.xpIntoLevel);
  // Near the top it runs out; at the top it's empty.
  let top = 0;
  for (let l = 1; l < MAX_LEVEL; l++) top += xpToNext(l);
  assert.ok(upcomingLevelRewards(top - 1).length <= 1);
  assert.deepEqual(upcomingLevelRewards(top + 5000), []);
});

test('the secret achievement: 150 taps on Bizzy win the Honey theme', async () => {
  const { tapBizzy } = await import('./game.ts');
  const { BIZZY_TAPS_SECRET, ACHIEVEMENTS } = await import('./achievements.ts');
  const secret = () => (s: GameState) => achievementStatuses(s, TODAY).find((a) => a.def.id === 'secret')!;
  assert.equal(BIZZY_TAPS_SECRET, 150);
  assert.equal(ACHIEVEMENTS.find((a) => a.id === 'secret')?.secret, true);
  let s = stateWith([]);
  assert.equal(secret()(s).value, 0);
  for (let i = 0; i < 149; i++) s = tapBizzy(s);
  assert.equal(secret()(s).reached, 0);
  assert.equal(claimableCount(s, TODAY), 0);
  s = tapBizzy(s);
  assert.equal(s.bizzyTaps, 150);
  assert.equal(secret()(s).reached, 1);
  assert.equal(claimableCount(s, TODAY), 1);
  const won = claimAchievement(s, 'secret', TODAY);
  assert.equal(won.tier?.xp, 50);
  assert.deepEqual(won.tier?.reward, { kind: 'theme', label: 'Honey theme' });
  assert.ok(unlockedRewards(won.state).some((r) => r.kind === 'theme' && r.label === 'Honey theme'));
  // More taps don't give it again.
  assert.equal(claimableCount(tapBizzy(won.state), TODAY), 0);
});
