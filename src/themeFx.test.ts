import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mascotLeft, MASCOT_SIZE, PLAIN_FX, THEME_FX, themeFx } from './themeFx.ts';
import { COMBO_LOOKS, comboLook, DEFAULT_COMBO, entranceAt } from './combo.ts';

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
  const ids = new Set(['classic', 'dusk', 'honey', 'hive', 'forest', 'ocean', 'sunset', 'thunder', 'summit', 'ember', 'gold', 'midnight', 'fortune', 'neon', 'notepad', 'gym', 'notepad-a', 'notepad-b', 'notepad-c', 'gym-a', 'gym-b', 'gym-c']);
  for (const [id, fx] of Object.entries(THEME_FX)) {
    assert.ok(ids.has(id), `${id} is a theme`);
    if (fx.mascot) assert.ok(MASCOT_SIZE[fx.mascot], `${fx.mascot} has a size`);
    assert.ok(fx.finishMs >= 400 && fx.finishMs <= 1200, `${id} finish stays about a second`);
  }
  // Gold got its own look (design "Noir"): crown, coin finish, sheen on the cards.
  assert.equal(themeFx('gold').mascot, 'crown');
  assert.equal(themeFx('gold').finish, 'gild');
  assert.equal(themeFx('neon').ambient, 'circuit');
  // Bee themes: Bizzy rides the Honey bar over a faint honeycomb; Hive's bar is cut into honeycomb cells.
  assert.equal(themeFx('honey').mascot, 'bee');
  assert.equal(themeFx('honey').ambient, 'comb');
  assert.equal(themeFx('hive').bar?.cells?.count, 12);
  assert.equal(themeFx('hive').mascot, undefined);
  const { combo, ...fortune } = themeFx('fortune');
  assert.deepEqual(fortune, PLAIN_FX, 'Fortuna stays as it is');
  assert.equal(combo?.icon, 'coin');
});

test('every theme has its combo pop-up, and later themes fall back to Indigo', () => {
  for (const id of ['classic', 'dusk', 'honey', 'hive', 'forest', 'ocean', 'sunset', 'thunder', 'summit', 'ember', 'gold', 'midnight', 'fortune', 'neon', 'notepad', 'gym']) {
    assert.ok(COMBO_LOOKS[id], `${id} has a combo look`);
  }
  assert.equal(comboLook('someday'), DEFAULT_COMBO);
  assert.equal(themeFx('neon'), themeFx('neon'), 'the same object each time, for the context');
  // Notepad has no pill: just the red handwriting with a circle round it.
  assert.equal(COMBO_LOOKS.notepad.fill, undefined);
  assert.ok(COMBO_LOOKS.notepad.circle);
});

test('combo entrances start hidden and end at rest', () => {
  for (const kind of ['pop', 'grow', 'bob', 'rise', 'zap', 'flick', 'slam'] as const) {
    assert.equal(entranceAt(kind, 0).opacity, 0, `${kind} starts hidden`);
    assert.deepEqual(entranceAt(kind, 1), { scale: 1, y: 0, x: 0, opacity: 1 }, `${kind} lands`);
  }
  assert.ok(entranceAt('slam', 0).scale > 1.5, 'Gym slams down from big');
});
