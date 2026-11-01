import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlockedRewards } from './achievements.ts';
import { activityTimeline } from './activity.ts';
import { addDays, emptyState, totalXp, xpMultiplier, type Completion, type GameState, type WheelSpin } from './game.ts';
import { tokenCounts } from './tokens.ts';
import {
  wheelSize,
  JACKPOT_XP,
  ownsWheelTheme,
  PITY_SPINS,
  prizeForRoll,
  segmentFor,
  spinsToPity,
  spinWheel,
  ticketStatus,
  WHEEL_PRIZES,
  WHEEL_SEGMENTS,
  WHEEL_THEME_REWARD,
  wheelTokens,
} from './wheel.ts';
import { readFileSync } from 'node:fs';

const TODAY = '2026-10-22';
const done = (date: string, xp: number): Completion => ({ taskId: 'x', date, xp, title: 'Run' });
/** A player with `xp` XP from tasks and the given spins. */
const player = (xp: number, spins: WheelSpin[] = []): GameState => ({ ...emptyState, joinedAt: TODAY, completions: xp ? [done(TODAY, xp)] : [], wheelSpins: spins });
const spin = (prize: string, xp?: number): WheelSpin => ({ date: TODAY, prize, ...(xp && { xp }) });

test('the odds add up to 100 and every prize has one equal slice', () => {
  assert.equal(WHEEL_PRIZES.reduce((n, p) => n + p.odds * 10, 0), 1000);
  assert.equal(WHEEL_SEGMENTS.length, WHEEL_PRIZES.length);
  assert.ok(Math.abs(WHEEL_SEGMENTS.reduce((n, s) => n + s.share, 0) - 100) < 1e-9);
  for (const seg of WHEEL_SEGMENTS) assert.equal(seg.share, 100 / WHEEL_SEGMENTS.length);
  assert.deepEqual(new Set(WHEEL_SEGMENTS.map((s) => s.prize)), new Set(WHEEL_PRIZES.map((p) => p.id)));
  // The approved odds (changed 2026-10-31: tokens 5 %, ad-free 3 %, the rest to the XP slices).
  const odds = Object.fromEntries(WHEEL_PRIZES.map((p) => [p.id, p.odds]));
  assert.deepEqual(odds, { xp20: 40, xp50: 22, xp100: 10, double: 5, rest: 5, reroll: 5, adfree: 3, o1: 6, o2: 2.5, o3: 0.5, theme: 1 });
});

test('rolls land on each prize exactly as often as its odds say', () => {
  const counts: Record<string, number> = {};
  for (let i = 0; i < 1000; i++) {
    const id = prizeForRoll(i / 1000).id;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  for (const p of WHEEL_PRIZES) assert.equal(counts[p.id], p.odds * 10, p.id);
  assert.equal(prizeForRoll(0).id, 'xp20');
  assert.equal(prizeForRoll(0.399).id, 'xp20');
  assert.equal(prizeForRoll(0.4).id, 'xp50');
  assert.equal(prizeForRoll(0.985).id, 'o3');
  assert.equal(prizeForRoll(0.99).id, 'theme');
  assert.equal(prizeForRoll(0.999999).id, 'theme');
});

test('a ticket for every 100 XP, not counting XP won on the wheel', () => {
  assert.deepEqual(ticketStatus(player(0), 0), { tickets: 0, progress: 0, earned: 0, spent: 0 });
  const p = player(250);
  assert.deepEqual(ticketStatus(p, totalXp(p)), { tickets: 2, progress: 50, earned: 2, spent: 0 });
  // One spin that won 100 XP: the total goes up, the tickets don't.
  const after = player(250, [spin('xp100', 100)]);
  assert.equal(totalXp(after), 350);
  assert.deepEqual(ticketStatus(after, totalXp(after)), { tickets: 1, progress: 50, earned: 2, spent: 1 });
  // Unticking tasks can't push tickets below zero.
  const unticked = player(50, [spin('xp20', 20)]);
  assert.equal(ticketStatus(unticked, totalXp(unticked)).tickets, 0);
});

test('spinning spends a ticket and records the prize', () => {
  const p = player(100);
  const { state, prize } = spinWheel(p, totalXp(p), TODAY, 0.45);
  assert.equal(prize?.id, 'xp50');
  assert.deepEqual(state.wheelSpins, [{ date: TODAY, prize: 'xp50', xp: 50 }]);
  assert.equal(totalXp(state), 150);
  assert.equal(ticketStatus(state, totalXp(state)).tickets, 0);
  // No ticket left: nothing changes.
  const again = spinWheel(state, totalXp(state), TODAY, 0.1);
  assert.equal(again.state, state);
  assert.equal(again.prize, undefined);
});

test('the theme is guaranteed on spin 150 and pays a jackpot once owned', () => {
  const misses = Array.from({ length: PITY_SPINS - 1 }, () => spin('xp20', 20));
  const p = player(PITY_SPINS * 100, misses);
  assert.equal(spinsToPity(p), 1);
  const pity = spinWheel(p, totalXp(p), TODAY, 0.01);
  assert.equal(pity.prize?.id, 'theme');
  assert.ok(ownsWheelTheme(pity.state));
  assert.equal(spinsToPity(pity.state), undefined);

  const owner = player(500, [spin('theme')]);
  const jackpot = spinWheel(owner, totalXp(owner), TODAY, 0.995);
  assert.equal(jackpot.prize?.id, 'jackpot');
  assert.equal(jackpot.state.wheelSpins!.at(-1)!.xp, JACKPOT_XP);
  // A lucky early win resets nothing else and needs no pity.
  assert.equal(spinWheel(player(100), 100, TODAY, 0.995).prize?.id, 'theme');
});

test('tokens won on the wheel land in the bag', () => {
  const p = player(500, [spin('double'), spin('rest'), spin('rest'), spin('reroll'), spin('adfree'), spin('xp20', 20)]);
  assert.deepEqual(wheelTokens(p), { rest: 2, double: 1, reroll: 1, adfree: 1 });
  assert.deepEqual(tokenCounts(p), { rest: 2, double: 1, reroll: 1, adfree: 1 });
  // A spin saved by a future version with an unknown prize is ignored.
  assert.deepEqual(wheelTokens(player(0, [spin('mystery')])), { rest: 0, double: 0, reroll: 0, adfree: 0 });
});

test('winning the theme unlocks Fortuna', () => {
  // theme.tsx needs React Native, so its entry is checked as text.
  const themes = readFileSync(new URL('./theme.tsx', import.meta.url), 'utf8');
  assert.match(themes, new RegExp(`id: 'fortune',\\s*name: N\\('Fortuna'\\),\\s*reward: '${WHEEL_THEME_REWARD}'`));
  assert.ok(!unlockedRewards(player(0)).some((r) => r.label === WHEEL_THEME_REWARD));
  assert.ok(unlockedRewards(player(0, [spin('theme')])).some((r) => r.kind === 'theme' && r.label === WHEEL_THEME_REWARD));
});

test('the pointer stops inside the middle of the winning slice', () => {
  for (const p of WHEEL_PRIZES) {
    for (const roll of [0, 0.25, 0.5, 0.999]) {
      const { index, at } = segmentFor(p.id, roll);
      const seg = WHEEL_SEGMENTS[index];
      assert.equal(seg.prize, p.id);
      const start = WHEEL_SEGMENTS.slice(0, index).reduce((n, s) => n + s.share, 0) / 100;
      const end = start + seg.share / 100;
      assert.ok(at > start + (seg.share / 100) * 0.19 && at < end - (seg.share / 100) * 0.19, `${p.id} ${roll}: ${at}`);
    }
  }
  assert.equal(WHEEL_SEGMENTS[segmentFor('jackpot', 0.5).index].prize, 'theme');
});

test('wheel wins show up in the activity timeline', () => {
  const p = player(100, [spin('xp50', 50), spin('rest')]);
  const day = activityTimeline(p, TODAY).find((d) => d.date === TODAY)!;
  assert.equal(day.xp, 150);
  const wheel = day.events.filter((e) => e.kind === 'wheel');
  assert.deepEqual(wheel, [
    { kind: 'wheel', prize: '50 XP', rarity: 'common', xp: 50 },
    { kind: 'wheel', prize: 'Rest day token', rarity: 'uncommon', xp: 0 },
  ]);
});

test('the XP multiplier lists what it is made of, counting today in the streak', () => {
  assert.deepEqual(xpMultiplier(player(0), TODAY), { total: 1, parts: [{ label: 'Streak', x: 1 }], streak: 1 });
  // Four days done before today: the next task makes it five, so 1.1x.
  const run: GameState = { ...player(0), completions: [1, 2, 3, 4].map((i) => done(addDays(TODAY, -i), 20)) };
  const m = xpMultiplier(run, TODAY);
  assert.equal(m.streak, 5);
  assert.equal(m.total, 1.1);
  const doubled = xpMultiplier({ ...run, doubleDays: [TODAY] }, TODAY);
  assert.deepEqual(doubled.parts.map((p) => p.label), ['Streak', 'Double XP']);
  assert.ok(Math.abs(doubled.total - 2.2) < 1e-9);
});

test('wheel: sizes itself so the whole wheel fits between header and tab bar', () => {
  // Regular phone (360 wide, ~600 between the bars): limited by the width.
  assert.equal(wheelSize(360, 600), 304);
  assert.equal(wheelSize(360, 470), 294);
  // Small phone (~420 between the bars): limited by the height, so nothing is cut off.
  assert.equal(wheelSize(360, 420), 244);
  // Big phone or tablet: capped.
  assert.equal(wheelSize(412, 780), 356);
  assert.equal(wheelSize(1024, 1200), 360);
  // Never smaller than 200.
  assert.equal(wheelSize(300, 200), 200);
  for (const [w, h] of [[320, 480], [360, 560], [390, 700], [412, 760]]) assert.ok(wheelSize(w, h) + 176 <= h && wheelSize(w, h) + 56 <= w, `${w}x${h}`);
});
