import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lookKeys, markLooksSeen, newLooks, newOfKind } from './inventory.ts';

test('won looks are new until seen; the free ones never are', () => {
  const keys = lookKeys(['forest'], { flames: ['classic', 'glow'], celebrations: ['classic'] });
  assert.deepEqual(keys, ['theme:forest', 'flame:glow']);
  // Nothing stored yet (existing players before this update): no badges.
  assert.equal(newLooks(keys, undefined).size, 0);
  const fresh = newLooks(keys, ['theme:forest']);
  assert.deepEqual([...fresh], ['flame:glow']);
  assert.deepEqual([...newOfKind(fresh, 'flame')], ['glow']);
  assert.equal(newOfKind(fresh, 'theme').size, 0);
  const seen = markLooksSeen(['theme:forest'], ['flame:glow', 'theme:forest']);
  assert.deepEqual(seen, ['theme:forest', 'flame:glow']);
  assert.equal(newLooks(keys, seen).size, 0);
});
