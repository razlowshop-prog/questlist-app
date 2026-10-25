import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIBRARY } from './library.ts';
import { mashedWord, nonsenseReason } from './sense.ts';

test('every library task passes the nonsense check', () => {
  const blocked = LIBRARY.filter((t) => nonsenseReason(t.title)).map((t) => t.title);
  assert.deepEqual(blocked, []);
});

test('everyday tasks in English and German pass', () => {
  for (const title of [
    'Wash the dishes',
    'Gym',
    'Call mum',
    'Read 20 pages',
    '10 push-ups',
    'Rhythm practice',
    'Train strengths',
    'Fenster putzen',
    'Schrank aufräumen',
    'Herbstputz',
    'Hausaufgaben machen',
    'Schritte zählen',
    'Angstschweiß abwaschen',
    'Einkaufen gehen',
    'Müll rausbringen',
    'Brennnessel jäten',
    'Ménage du salon',
    'Позвонить маме',
    '打扫房间',
    'Tax',
    'Yoga',
  ]) {
    assert.equal(nonsenseReason(title), undefined, title);
  }
});

test('keyboard mash and empty titles are caught', () => {
  for (const title of ['sdggfsaa', 'asdfgh', 'qwertz', 'jhgjhg', 'aaaa', 'xxxxxxx', 'asdkjh qwlekj', 'dfghjk lol', '!!!', '1234', 'a', 'kkk', 'hgfds', 'zzzz xxxx']) {
    assert.ok(nonsenseReason(title), title);
  }
});

test('single words: odd German words alone are mashed, but carry in a sentence', () => {
  assert.equal(mashedWord('Schritt'), true);
  assert.equal(nonsenseReason('Schritt zählen'), undefined);
  assert.equal(mashedWord('dishes'), false);
  assert.equal(mashedWord('cat'), false);
});
