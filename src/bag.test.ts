import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bagCapacity, layoutBag, nextSlotLevel } from './bag.ts';

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
