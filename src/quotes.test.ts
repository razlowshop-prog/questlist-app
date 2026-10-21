import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from './game.ts';
import { QUOTES, quoteOfTheDay } from './quotes.ts';

test('a different quote every day, all of them before any repeats', () => {
  const seen = new Set<string>();
  for (let i = 0; i < QUOTES.length; i++) seen.add(quoteOfTheDay(addDays('2026-10-21', i)).text);
  assert.equal(seen.size, QUOTES.length);
  // Across a month boundary and a year boundary too
  assert.notEqual(quoteOfTheDay('2026-10-31').text, quoteOfTheDay('2026-11-01').text);
  assert.notEqual(quoteOfTheDay('2026-12-31').text, quoteOfTheDay('2027-01-01').text);
  assert.equal(quoteOfTheDay('2026-10-21').text, quoteOfTheDay('2026-10-21').text);
});
