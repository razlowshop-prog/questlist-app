import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from './game.ts';
import { setLang } from './i18n.ts';
import { QUOTES, QUOTES_DE, quoteOfTheDay, quoteSideFor } from './quotes.ts';

test('a different quote every day, all of them before any repeats', () => {
  for (const [language, list] of [['de', QUOTES_DE], ['en', QUOTES]] as const) {
    setLang(language);
    const seen = new Set<string>();
    for (let i = 0; i < list.length; i++) seen.add(quoteOfTheDay(addDays('2026-10-21', i)).text);
    assert.equal(seen.size, list.length, language);
    assert.notEqual(list.length % 7, 0, 'stepping by 7 reaches every quote');
  }
  assert.ok(!QUOTES_DE.some(([text]) => text === quoteOfTheDay('2026-10-21').text), 'English mode shows the English list');
  // Across a month boundary and a year boundary too
  assert.notEqual(quoteOfTheDay('2026-10-31').text, quoteOfTheDay('2026-11-01').text);
  assert.notEqual(quoteOfTheDay('2026-12-31').text, quoteOfTheDay('2027-01-01').text);
  assert.equal(quoteOfTheDay('2026-10-21').text, quoteOfTheDay('2026-10-21').text);
});

test('the quote card starts each new day on the quote and keeps the side within a day', () => {
  assert.equal(quoteSideFor(undefined, '2026-10-26'), 'quote');
  assert.equal(quoteSideFor({ side: 'greet', day: '2026-10-26' }, '2026-10-26'), 'greet');
  assert.equal(quoteSideFor({ side: 'quote', day: '2026-10-26' }, '2026-10-26'), 'quote');
  // The next day, and a phone clock turned back, start on the quote again
  assert.equal(quoteSideFor({ side: 'greet', day: '2026-10-25' }, '2026-10-26'), 'quote');
  assert.equal(quoteSideFor({ side: 'greet', day: '2026-10-27' }, '2026-10-26'), 'quote');
});
