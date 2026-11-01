import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bizzySvg } from './bizzy.ts';
import { emptyState, totalXp, type Completion, type GameState, type WheelSpin } from './game.ts';
import {
  AREA_GOAL,
  LEGENDARY_PITY,
  OUTFIT_XP,
  OUTFITS,
  outfitCounts,
  outfitDrawing,
  outfitForSlice,
  outfitList,
  ownedOutfits,
  spinsSinceLegendary,
  toggleOutfit,
  wornOutfits,
} from './outfits.ts';
import { prizeById, spinWheel, ticketStatus, wheelTokens } from './wheel.ts';

const TODAY = '2026-10-31';
const done = (title: string, xp = 10): Completion => ({ taskId: 'x', date: TODAY, xp, title });
const player = (completions: Completion[] = [], spins: WheelSpin[] = []): GameState => ({ ...emptyState, joinedAt: TODAY, completions, wheelSpins: spins });
const STARTERS = OUTFITS.filter((o) => o.starter).map((o) => o.id);

test('21 outfits with unique ids, one slot each, and three starters', () => {
  assert.equal(OUTFITS.length, 21);
  assert.equal(new Set(OUTFITS.map((o) => o.id)).size, 21);
  assert.deepEqual(STARTERS.sort(), ['beanie', 'bowtie', 'specs']);
  for (const o of OUTFITS) assert.ok(o.name && o.svg, o.id);
  // Every rarity is reachable on the wheel (not only by areas or starters).
  for (const r of [1, 2, 3] as const) assert.ok(OUTFITS.some((o) => o.rarity === r && !o.area && !o.starter), `rarity ${r}`);
});

test('a new player owns only the starters', () => {
  assert.deepEqual([...ownedOutfits(player())].sort(), ['beanie', 'bowtie', 'specs']);
});

test('50 tasks in an area earn its outfit, 49 do not', () => {
  const chores = (n: number) => Array.from({ length: n }, () => done('Do the dishes'));
  assert.ok(!ownedOutfits(player(chores(AREA_GOAL - 1))).has('scarf'));
  assert.ok(ownedOutfits(player(chores(AREA_GOAL))).has('scarf'));
  const list = outfitList(player(chores(20)));
  assert.equal(list.find((x) => x.outfit.id === 'scarf')?.progress, 20);
});

test('the wheel never gives an outfit twice, then pays XP', () => {
  const rare = OUTFITS.filter((o) => o.rarity === 1);
  const owned = new Set(rare.map((o) => o.id));
  assert.equal(outfitForSlice(1, owned, 0.5), undefined);
  owned.delete(rare[2].id);
  assert.equal(outfitForSlice(1, owned, 0.99)?.id, rare[2].id);
  // Spin until every Rare is owned: each win is new, the next one pays OUTFIT_XP.
  let state = player([done('Run', 100_000)]);
  const roll = 0.93; // lands on the Rare outfit slice (o1: 90 to 96 %)
  assert.equal(prizeById('o1').outfit, 1);
  const seen = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const { state: next, prize } = spinWheel(state, totalXp(state), TODAY, roll);
    if (prize?.id !== 'o1') assert.fail(`roll ${roll} gave ${prize?.id}`);
    const spin = next.wheelSpins!.at(-1)!;
    if (spin.outfit) {
      assert.ok(!seen.has(spin.outfit) && !STARTERS.includes(spin.outfit), spin.outfit);
      seen.add(spin.outfit);
    } else assert.equal(spin.xp, OUTFIT_XP[1]);
    state = next;
  }
  assert.ok(rare.every((o) => ownedOutfits(state).has(o.id)));
  // Outfit spins hand out no tokens.
  assert.deepEqual(wheelTokens(state), { rest: 0, double: 0, reroll: 0, adfree: 0 });
});

test('XP from a complete rarity counts as wheel XP, so it earns no tickets', () => {
  const state = player([done('Run', 1000)], [{ date: TODAY, prize: 'o1', xp: 30 }]);
  const before = ticketStatus(player([done('Run', 1000)], [{ date: TODAY, prize: 'o1' }]), 1000);
  assert.equal(ticketStatus(state, 1030).earned, before.earned);
});

test('a Legendary outfit is certain after LEGENDARY_PITY spins without one', () => {
  const spins: WheelSpin[] = Array.from({ length: LEGENDARY_PITY - 1 }, () => ({ date: TODAY, prize: 'xp20', xp: 20 }));
  // Fortuna owned, so its own pity doesn't come first.
  spins[0] = { date: TODAY, prize: 'theme' };
  const state = player([done('Run', 1_000_000)], spins);
  assert.equal(spinsSinceLegendary(state), LEGENDARY_PITY - 1);
  const { state: next, prize } = spinWheel(state, totalXp(state), TODAY, 0);
  assert.equal(prize?.id, 'o3');
  assert.equal(OUTFITS.find((o) => o.id === next.wheelSpins!.at(-1)!.outfit)?.rarity, 3);
  assert.equal(spinsSinceLegendary(next), 0);
});

test('outfits go on and off one per slot, and only owned ones', () => {
  let state = player();
  state = toggleOutfit(state, 'beanie');
  assert.deepEqual(wornOutfits(state), { head: 'beanie' });
  // Not owned: nothing changes.
  assert.equal(toggleOutfit(state, 'wizard'), state);
  state = toggleOutfit(state, 'specs');
  assert.deepEqual(wornOutfits(state), { head: 'beanie', face: 'specs' });
  state = toggleOutfit(state, 'beanie');
  assert.deepEqual(wornOutfits(state), { face: 'specs' });
  // A worn outfit that is no longer owned (or sits in the wrong slot) is dropped.
  assert.deepEqual(wornOutfits({ ...state, bizzyWear: { head: 'wizard', neck: 'specs', face: 'specs' } }), { face: 'specs' });
});

test('the wardrobe lists owned outfits on top, then locked ones, each rarest first', () => {
  const state = player([], [{ date: TODAY, prize: 'o3', outfit: 'wizard' }, { date: TODAY, prize: 'o2', outfit: 'viking' }]);
  const list = outfitList(state);
  // Every owned outfit before every locked one.
  const firstLocked = list.findIndex((x) => !x.owned);
  assert.ok(list.slice(firstLocked).every((x) => !x.owned));
  // Within each group, Legendary, then Epic, then Rare.
  for (let i = 1; i < list.length; i++) if (list[i - 1].owned === list[i].owned) assert.ok(list[i - 1].outfit.rarity >= list[i].outfit.rarity);
  assert.equal(list[0].outfit.id, 'wizard');
  assert.deepEqual(list.filter((x) => x.owned).map((x) => x.outfit.id), ['wizard', 'viking', 'beanie', 'specs', 'bowtie']);
  assert.deepEqual(outfitCounts(state), { 1: [3, 6], 2: [1, 10], 3: [1, 5] });
});

test('every outfit draws on every form, and covers what it replaces', () => {
  for (const o of OUTFITS) {
    const drawing = outfitDrawing({ [o.slot]: o.id });
    assert.ok(drawing);
    for (let form = 1; form <= 10; form++) {
      const svg = bizzySvg('happy', true, { form, outfit: drawing });
      assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${o.id} on form ${form}`);
      assert.equal((svg.match(/<svg/g) ?? []).length, 1, `${o.id}: no nested svg`);
    }
  }
  assert.equal(outfitDrawing({}), undefined);
  assert.deepEqual(outfitDrawing({ head: 'beanie' })?.covers, { head: true, neck: false, back: false });
});
