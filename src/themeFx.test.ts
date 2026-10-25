import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mascotLeft, MASCOT_SIZE, PLAIN_FX, THEME_FX, themeFx } from './themeFx.ts';

test('the mascot centres on the tip but never leaves the bar', () => {
  assert.equal(mascotLeft(0.5, 300, 60), 120);
  assert.equal(mascotLeft(0, 300, 60), 0);
  assert.equal(mascotLeft(0.05, 300, 60), 0);
  assert.equal(mascotLeft(1, 300, 60), 240);
  assert.equal(mascotLeft(1.4, 300, 60), 240);
  assert.equal(mascotLeft(-1, 300, 60), 0);
});

test('every theme effect belongs to a real theme, and mascots have a size', () => {
  // Theme ids from theme.tsx (tests can't load .tsx files).
  const ids = new Set(['classic', 'dusk', 'forest', 'ocean', 'sunset', 'thunder', 'summit', 'ember', 'gold', 'midnight', 'fortune', 'neon', 'notepad', 'gym']);
  for (const [id, fx] of Object.entries(THEME_FX)) {
    assert.ok(ids.has(id), `${id} is a theme`);
    if (fx.mascot) assert.ok(MASCOT_SIZE[fx.mascot], `${fx.mascot} has a size`);
    assert.ok(fx.finishMs >= 400 && fx.finishMs <= 1200, `${id} finish stays about a second`);
  }
  // Gold got its own look (design "Noir"): crown, coin finish, sheen on the cards.
  assert.equal(themeFx('gold').mascot, 'crown');
  assert.equal(themeFx('gold').finish, 'gild');
  assert.equal(themeFx('neon').ambient, 'skyline');
  assert.equal(themeFx('fortune'), PLAIN_FX, 'Fortuna stays as it is');
});
