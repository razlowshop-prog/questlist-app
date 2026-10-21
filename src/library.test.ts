import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, LIBRARY, searchLibrary, suggestionsFor } from './library.ts';

test('library is big and every task has a known category', () => {
  assert.ok(LIBRARY.length >= 200, `only ${LIBRARY.length} tasks`);
  const ids = new Set(CATEGORIES.map((c) => c.id));
  for (const t of LIBRARY) assert.ok(ids.has(t.category), t.title);
});

test('no duplicate titles', () => {
  const titles = LIBRARY.map((t) => t.title.toLowerCase());
  assert.equal(new Set(titles).size, titles.length);
});

test('search ranks title prefix first and also matches tags', () => {
  assert.equal(searchLibrary('dish')[0].title, 'Do the dishes');
  assert.equal(searchLibrary('walk 5')[0].title, 'Walk 5 km');
  assert.ok(searchLibrary('instagram').some((t) => t.title.includes('social media')));
  assert.equal(searchLibrary('zzzzqqq').length, 0);
});

test('setup suggestions only include repeating tasks from the chosen areas', () => {
  const s = suggestionsFor(['home', 'fitness']);
  assert.ok(s.length > 0);
  assert.ok(s.every((t) => ['home', 'fitness'].includes(t.category) && t.perWeek > 0));
});
