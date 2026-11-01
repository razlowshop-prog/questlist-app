import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from './game.ts';
import { setLang } from './i18n.ts';
import { QUOTES, QUOTES_DE, quoteOfTheDay, quoteDue } from './quotes.ts';

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

test('the quote screen shows on the first open of each day, unless turned off', () => {
  assert.equal(quoteDue({}, '2026-11-01'), true);
  assert.equal(quoteDue({ quoteDay: '2026-11-01' }, '2026-11-01'), false);
  assert.equal(quoteDue({ quoteDay: '2026-10-31' }, '2026-11-01'), true);
  assert.equal(quoteDue({ quoteStart: false }, '2026-11-01'), false);
  assert.equal(quoteDue({ quoteStart: true, quoteDay: '2026-10-31' }, '2026-11-01'), true);
});
