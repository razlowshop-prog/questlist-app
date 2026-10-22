import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, categoryForTitle, guessCategory, LIBRARY, searchLibrary, sortTasks, suggestionsFor, taskCategory } from './library.ts';

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

test('task categories: saved, exact library match, closest guess, or other', () => {
  assert.equal(categoryForTitle('  do the DISHES '), 'home');
  assert.equal(categoryForTitle('Feed the dragon'), undefined);
  assert.equal(guessCategory('dishes'), 'home');
  assert.equal(guessCategory('ab'), undefined);
  assert.equal(taskCategory({ title: 'Do the dishes' }), 'home');
  assert.equal(taskCategory({ title: 'Do the dishes', category: 'work' }), 'work');
  assert.equal(guessCategory('Gym session'), 'fitness');
  assert.equal(taskCategory({ title: 'Vacuum the car' }), 'home');
  assert.equal(taskCategory({ title: 'Xyzzy qwrt' }), 'other');
});

test('library sorts by most XP and quickest', () => {
  const xp = sortTasks(LIBRARY, 'xp');
  const quick = sortTasks(LIBRARY, 'quick');
  assert.equal(xp.length, LIBRARY.length);
  for (let i = 1; i < xp.length; i++) assert.ok(xp[i - 1].minutes >= xp[i].minutes);
  for (let i = 1; i < quick.length; i++) assert.ok(quick[i - 1].minutes <= quick[i].minutes);
  assert.notEqual(xp, LIBRARY); // a copy, the library itself stays in order
  assert.equal(LIBRARY[0].category, 'home');
});
