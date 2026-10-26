import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bagCapacity, bagChanged, bagSnapshot, freshStacks, layoutBag, newByItem, newInBag, nextSlotLevel } from './bag.ts';

const none = { ticket: 0, rest: 0, double: 0, reroll: 0, adfree: 0 };

test('the bag grows by five slots at levels 20, 40 and 60', () => {
  assert.equal(bagCapacity(1), 30);
  assert.equal(bagCapacity(19), 30);
  assert.equal(bagCapacity(20), 35);
  assert.equal(bagCapacity(45), 40);
  assert.equal(bagCapacity(99), 45);
  assert.equal(nextSlotLevel(1), 20);
  assert.equal(nextSlotLevel(20), 40);
  assert.equal(nextSlotLevel(60), undefined);
});

test('items stack five to a slot, tokens before tickets', () => {
  const { slots, waiting } = layoutBag({ ...none, ticket: 7, rest: 1, adfree: 5 }, 30);
  assert.deepEqual(slots, [
    { item: 'rest', count: 1 },
    { item: 'adfree', count: 5 },
    { item: 'ticket', count: 5 },
    { item: 'ticket', count: 2 },
  ]);
  assert.deepEqual(waiting, []);
});

test('what does not fit waits in the tray, nothing is lost', () => {
  const { slots, waiting } = layoutBag({ ...none, ticket: 153, double: 3, reroll: -2 }, 30);
  assert.equal(slots.length, 30);
  assert.deepEqual(slots[0], { item: 'double', count: 3 });
  assert.ok(slots.slice(1).every((s) => s.item === 'ticket' && s.count === 5));
  assert.deepEqual(waiting, [{ item: 'ticket', count: 8 }]);
});

test('an empty bag has no stacks', () => {
  assert.deepEqual(layoutBag(none, 30), { slots: [], waiting: [] });
});

test('the backpack badge counts only items added since the bag was last opened', () => {
  const now = { ...none, ticket: 3, rest: 1 };
  // Never opened: everything is new once.
  assert.equal(newInBag(now, undefined), 4);
  const seen = bagSnapshot(now);
  assert.equal(newInBag(now, seen), 0);
  assert.equal(bagChanged(now, seen), false);
  // Two more tickets, one rest day used: the used one doesn't cancel the new ones.
  const later = { ...none, ticket: 5, rest: 0 };
  assert.equal(newInBag(later, seen), 2);
  assert.equal(bagChanged(later, seen), true);
  // Negative or fractional counts never show.
  assert.equal(newInBag({ ...none, ticket: -2, double: 1.7 }, {}), 1);
});

test('only the stacks holding newly added items get a NEW tag', () => {
  const counts = { ticket: 7, rest: 1, double: 2, reroll: 0, adfree: 0 };
  // Before anything was stored: nothing is new.
  assert.deepEqual(newByItem(counts, undefined), {});
  // Two tickets and one double XP came in; the rest day was already there.
  const fresh = newByItem(counts, { ticket: 5, rest: 1, double: 1, reroll: 0, adfree: 0 });
  assert.deepEqual(fresh, { ticket: 2, double: 1 });
  const { slots, waiting } = layoutBag(counts, 30);
  // rest ×1, double ×2, ticket ×5, ticket ×2: the new tickets are in the last stack, the new double XP in its only stack.
  assert.deepEqual(slots.map((x) => `${x.item}${x.count}`), ['rest1', 'double2', 'ticket5', 'ticket2']);
  assert.deepEqual([...freshStacks(slots, waiting, fresh).slots].sort(), [1, 3]);
  // Six new tickets reach into the full stack before the last one.
  assert.deepEqual([...freshStacks(slots, waiting, { ticket: 6 }).slots].sort(), [2, 3]);
  // Items used up don't count as new.
  assert.deepEqual(newByItem({ ...counts, ticket: 3 }, { ticket: 5 }), { rest: 1, double: 2 });
});

test('new items that only fit in the tray tag the tray', () => {
  const counts = { ticket: 12, rest: 0, double: 0, reroll: 0, adfree: 0 };
  const { slots, waiting } = layoutBag(counts, 2);
  assert.deepEqual(waiting, [{ item: 'ticket', count: 2 }]);
  const tags = freshStacks(slots, waiting, { ticket: 2 });
  assert.deepEqual([...tags.waiting], ['ticket']);
  assert.equal(tags.slots.size, 0);
  // Three new: two in the tray, one in the last slot.
  assert.deepEqual([...freshStacks(slots, waiting, { ticket: 3 }).slots], [1]);
});
