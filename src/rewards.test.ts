import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grantLevelRewards, LEVEL_LADDER, LEVEL_MILESTONES, levelForLook } from './achievements.ts';
import { CELEBRATIONS, FLAME_STYLES, FRAMES, frameName, SEASONS } from './cosmetics.ts';
import { emblemStatuses, EMBLEM_TIERS } from './emblems.ts';
import {
  addDays,
  addTask,
  COMEBACK_DAYS,
  comebackDaysLeft,
  emptyState,
  restDaysOf,
  streakStatus,
  toggleTask,
  type Completion,
  type GameState,
} from './game.ts';
import { equippedLooks, nextTokenLevel, ownedLooks, TROPHY_FRAMES_ON } from './inventory.ts';
import { CATEGORIES } from './library.ts';
import { claimSeason, seasonFrames, seasonStatus } from './seasons.ts';
import { adFreeActive, answerRecovery, recoveryOffer, restOffer, spendAdFree, tokenCounts } from './tokens.ts';

const TODAY = '2026-10-21';
const done = (date: string, title = 'Go for a run', xp = 20): Completion => ({ taskId: 'x', date, xp, title });
const run = (n: number, end: string, xp = 20) => Array.from({ length: n }, (_, i) => done(addDays(end, -i), 'Go for a run', xp));
const player = (level: number, extra: Partial<GameState> = {}) => grantLevelRewards({ ...emptyState, joinedAt: TODAY, ...extra }, level);

test('every level from 2 to 100 pays out, and every look can be won', () => {
  const levels = new Set(LEVEL_MILESTONES.map((m) => m.level));
  for (let l = 2; l <= 100; l++) assert.ok(levels.has(l), `level ${l}`);
  for (const f of FRAMES) assert.ok(levelForLook('frame', f.id), f.id);
  for (const f of FLAME_STYLES.slice(1)) assert.ok(levelForLook('flame', f.id), f.id);
  for (const c of CELEBRATIONS.slice(1)) assert.ok(levelForLook('celebration', c.id), c.id);
  assert.equal(levelForLook('flame', 'classic'), undefined); // everyone's from the start
  // Labels read naturally.
  for (const l of LEVEL_LADDER) assert.doesNotMatch(l.reward.label, /\b(\w+) \1\b/i, l.reward.label);
  assert.equal(nextTokenLevel('adfree', 1), 11);
  assert.equal(nextTokenLevel('adfree', 95), undefined);
});

test('looks are owned once won, and only owned looks are worn', () => {
  const fresh = player(1);
  const none = ownedLooks(fresh);
  assert.deepEqual(none, { titles: [], frames: [], flames: ['classic'], celebrations: ['classic'] });
  const worn = equippedLooks({ ...fresh.settings, frame: 'crown', flameStyle: 'twin', celebration: 'ink', title: 'Legend' }, none);
  assert.deepEqual(worn, { title: undefined, frame: undefined, flameStyle: 'classic', celebration: 'classic' });

  const mid = ownedLooks(player(16));
  assert.deepEqual(mid.frames, ['ring', 'double']);
  assert.deepEqual(mid.flames, ['classic', 'outline', 'solid']);
  assert.deepEqual(mid.celebrations, ['classic', 'confetti']);
  assert.deepEqual(mid.titles, ['Rising Star', 'Steady']);
  assert.equal(equippedLooks({ ...fresh.settings, frame: 'double', flameStyle: 'solid' }, mid).frame, 'double');

  // Browser previews can try everything.
  const all = ownedLooks(fresh, true);
  assert.equal(all.frames.length, FRAMES.length + TROPHY_FRAMES_ON.length);
  assert.equal(all.flames.length, FLAME_STYLES.length);
  assert.ok(all.titles.includes('Legend'));
});

test('a trophy gives its title and, if it has one, its animated frame', () => {
  const s = player(16);
  const won = ownedLooks(s, false, ['ironWill', 'centurion']);
  assert.deepEqual(won.frames, ['ring', 'double', 'ironWill']);
  assert.ok(won.titles.includes('Iron Will') && won.titles.includes('Centurion'));
  assert.equal(equippedLooks({ ...s.settings, frame: 'ironWill', title: 'Iron Will' }, won).frame, 'ironWill');
  // Without the trophy, neither is worn.
  assert.deepEqual(equippedLooks({ ...s.settings, frame: 'ironWill', title: 'Iron Will' }, ownedLooks(s)), { title: undefined, frame: undefined, flameStyle: 'classic', celebration: 'classic' });
  // Frames whose trophy needs tracking the app doesn't have yet aren't offered.
  assert.deepEqual(
    TROPHY_FRAMES_ON.map((f) => f.id),
    ['ironWill', 'marathonMind'],
  );
  assert.equal(frameName('marathonMind'), 'Marathon Mind');
});

test('an ad-free token covers the rest of today, once', () => {
  let s = player(11);
  assert.equal(adFreeActive(s, TODAY), false);
  s = spendAdFree(s, TODAY);
  assert.equal(adFreeActive(s, TODAY), true);
  assert.equal(tokenCounts(s).adfree, 0);
  assert.equal(spendAdFree(s, TODAY), s);
  assert.equal(spendAdFree(s, addDays(TODAY, 1)), s); // none left
  assert.equal(spendAdFree(player(10), TODAY).adFreeDays, undefined);
});

test('the free recovery is offered once, for a streak worth saving', () => {
  // A 5-day streak (and its Flame) until two days ago: yesterday was missed and ended it.
  const missed = player(1, { completions: run(5, addDays(TODAY, -2)) });
  const offer = recoveryOffer(missed, TODAY)!;
  assert.deepEqual(offer, { day: addDays(TODAY, -1), keeps: 5, missed: true, tier: 1, streakLost: true });
  // No rest token needed.
  assert.equal(restOffer(missed, TODAY), undefined);

  const kept = answerRecovery(missed, TODAY, true);
  assert.deepEqual(kept.recovery, { day: addDays(TODAY, -1), used: true });
  assert.equal(streakStatus(kept.completions, TODAY, restDaysOf(kept)).days, 5);
  assert.equal(recoveryOffer(kept, TODAY), undefined);
  // It never comes back, even after another miss.
  const later = { ...kept, completions: [...kept.completions, done(TODAY)] };
  assert.equal(recoveryOffer(later, addDays(TODAY, 2)), undefined);

  // Saying no also uses it up, and the streak is gone.
  const declined = answerRecovery(missed, TODAY, false);
  assert.deepEqual(declined.recovery, { day: addDays(TODAY, -1), used: false });
  assert.equal(streakStatus(declined.completions, TODAY, restDaysOf(declined)).days, 0);
  assert.equal(recoveryOffer(declined, TODAY), undefined);
  assert.equal(answerRecovery(declined, TODAY, true), declined);

  // Too short to be worth it: waits for a bigger streak.
  assert.equal(recoveryOffer(player(1, { completions: run(2, addDays(TODAY, -2)) }), TODAY), undefined);
  // Also with a Flame lit on day two.
  assert.equal(recoveryOffer(player(1, { completions: run(2, addDays(TODAY, -2), 60) }), TODAY), undefined);
  // Nothing missed: nothing offered.
  assert.equal(recoveryOffer(player(1, { completions: run(5, addDays(TODAY, -1)) }), TODAY), undefined);
});

test('the free recovery also saves a fire tier', () => {
  // Two full weeks at 50 XP a day reach Blaze; then yesterday is missed.
  const monday = '2026-10-05';
  const completions = Array.from({ length: 15 }, (_, i) => done(addDays(monday, i), 'Go for a run', 50));
  const s = player(1, { completions });
  const day = addDays(monday, 16);
  const before = streakStatus(s.completions, day, restDaysOf(s));
  const offer = recoveryOffer(s, day)!;
  assert.ok(offer.tier > before.tier, `${offer.tier} > ${before.tier}`);
  assert.equal(offer.streakLost, false); // the days survive a lost tier
  const kept = answerRecovery(s, day, true);
  assert.equal(streakStatus(kept.completions, day, restDaysOf(kept)).tier, offer.tier);
});

test('the comeback boost gives extra XP on the first 3 active days after a lost streak', () => {
  let s = addTask(player(1), 'Go for a run', true, 'run', 30);
  assert.equal(comebackDaysLeft(s, TODAY), 0); // never lost a streak
  // A streak that ended four days ago.
  s = { ...s, completions: run(4, addDays(TODAY, -5)).map((c) => ({ ...c, taskId: 'run' })) };
  assert.equal(comebackDaysLeft(s, TODAY), COMEBACK_DAYS);
  const ticked = toggleTask(s, 'run', TODAY);
  assert.equal(ticked.completions.at(-1)!.xp, 25); // 20 XP + 25 %
  // Two more active days still get it, the fourth doesn't.
  let t = ticked;
  for (let i = 1; i <= 3; i++) {
    const d = addDays(TODAY, i);
    assert.equal(comebackDaysLeft(t, d), COMEBACK_DAYS - i);
    t = toggleTask(t, 'run', d);
  }
  assert.equal(t.completions.slice(-4).map((c) => c.xp).join(), '25,25,25,20');
});

test('emblems count tasks per category, deleted tasks included', () => {
  const none = emblemStatuses(player(1));
  assert.equal(none.length, CATEGORIES.length);
  assert.ok(none.every((e) => e.tier === 0 && e.next === EMBLEM_TIERS[0].goal));
  const completions = [
    ...Array.from({ length: 30 }, (_, i) => done(addDays(TODAY, -i), 'Go for a run')),
    ...Array.from({ length: 5 }, (_, i) => done(addDays(TODAY, -i), 'Do the dishes')),
  ];
  const e = emblemStatuses(player(1, { completions }));
  assert.equal(e[0].category, 'fitness');
  assert.equal(e[0].done, 30);
  assert.equal(e[0].tier, 1);
  assert.equal(e[0].next, 100);
  assert.equal(e.find((x) => x.category === 'home')!.done, 5);
});

test('the monthly event counts that month only and wins a frame once', () => {
  const october = SEASONS[9];
  assert.equal(seasonStatus(player(1), TODAY).season, october);
  assert.equal(seasonStatus(player(1), TODAY).daysLeft, 10);
  const chores = (n: number, from: string) => Array.from({ length: n }, (_, i) => done(addDays(from, i % 20), 'Do the dishes'));
  // September's chores don't count in October.
  let s = player(1, { completions: [...chores(25, '2026-09-01'), ...chores(october.target - 1, '2026-10-01')] });
  let status = seasonStatus(s, TODAY);
  assert.equal(status.progress, october.target - 1);
  assert.equal(status.complete, false);
  assert.equal(claimSeason(s, TODAY), s);
  s = { ...s, completions: [...s.completions, done(TODAY, 'Pay the bills')] };
  status = seasonStatus(s, TODAY);
  assert.equal(status.complete, true);
  s = claimSeason(s, TODAY);
  assert.deepEqual(seasonFrames(s), ['season-2026-10']);
  assert.equal(claimSeason(s, TODAY), s);
  assert.equal(frameName('season-2026-10'), 'Harvest 2026');
  assert.ok(ownedLooks(s).frames.includes('season-2026-10'));
  // Next month is a new event.
  assert.equal(seasonStatus(s, '2026-11-01').claimed, false);
  assert.equal(seasonStatus(s, '2026-11-01').season.name, 'Cozy Season');
});
