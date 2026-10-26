import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isProfileLook, lookKeys, markLooksSeen, newLooks, newOfKind, seedProfileLooks } from './inventory.ts';

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

test('frames and titles get "new" badges too, for the Profile', () => {
  const keys = lookKeys([], { flames: ['classic'], celebrations: ['classic'], frames: ['ring', 'season-2026-10'], titles: ['Rising Star'] });
  assert.deepEqual(keys, ['frame:ring', 'frame:season-2026-10', 'title:Rising Star']);
  assert.ok(keys.every(isProfileLook));
  assert.equal(isProfileLook('theme:forest'), false);
  assert.equal(isProfileLook('flame:glow'), false);
  // The Harvest frame won after the last look: new until its tile is tapped.
  const fresh = newLooks(keys, ['frame:ring', 'title:Rising Star']);
  assert.deepEqual([...newOfKind(fresh, 'frame')], ['season-2026-10']);
  assert.equal(newOfKind(fresh, 'title').size, 0);
});

test('players from before the profile badges start with their frames and titles seen', () => {
  const keys = lookKeys(['forest'], { flames: ['classic', 'glow'], celebrations: ['classic'], frames: ['ring'], titles: ['Rising Star'] });
  // A bag look they hadn't seen stays new; frames and titles they had don't light up.
  const seen = seedProfileLooks(['theme:forest'], keys);
  assert.deepEqual([...newLooks(keys, seen)], ['flame:glow']);
  // The next frame won is new.
  const later = lookKeys(['forest'], { flames: ['classic', 'glow'], celebrations: ['classic'], frames: ['ring', 'laurel'], titles: ['Rising Star'] });
  assert.deepEqual([...newLooks(later, seen)].filter(isProfileLook), ['frame:laurel']);
});
