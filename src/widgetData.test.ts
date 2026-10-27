import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addTask, emptyState, type GameState } from './game.ts';
import { bizzySvg, type BizzyMood } from './bizzy.ts';
import { setLang } from './i18n.ts';
import { widgetData } from './widgetData.ts';

const TODAY = '2026-10-27';
const at = (hour: number, day = TODAY) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hour, 30);
};

/** Onboarded, with two daily tasks and a streak that ran until yesterday. */
function player(): GameState {
  let s: GameState = { ...emptyState, onboarded: true };
  s = addTask(s, 'Wash the dishes', true, 'dishes');
  s = addTask(s, 'Read 10 pages', true, 'read');
  const completions = [3, 2, 1].map((n) => ({ taskId: 'dishes', date: addDays(TODAY, -n), xp: 22 }));
  return { ...s, completions };
}

test('widget: before onboarding Bizzy waves and asks to plan the day', () => {
  setLang('en');
  const d = widgetData(emptyState, at(10));
  assert.equal(d.mood, 'wave');
  assert.equal(d.headline, 'Hi!');
  assert.equal(d.streak, '');
  assert.equal(d.level, 1);
});

test('widget: tasks left, streak and level in the daytime', () => {
  setLang('en');
  const d = widgetData(player(), at(10));
  assert.equal(d.headline, '2');
  assert.equal(d.sub, 'tasks left today');
  assert.equal(d.streak, '3 days');
  assert.equal(d.mood, 'happy');
  assert.ok(d.progress > 0 && d.progress < 1);
});

test('widget: one task left uses the singular', () => {
  setLang('en');
  const s = player();
  const d = widgetData({ ...s, completions: [...s.completions, { taskId: 'read', date: TODAY, xp: 15 }] }, at(10));
  assert.equal(d.headline, '1');
  assert.equal(d.sub, 'task left today');
  assert.equal(d.streak, '4 days');
});

test('widget: streak at risk in the evening makes Bizzy worried', () => {
  setLang('en');
  const d = widgetData(player(), at(20));
  assert.equal(d.mood, 'worried');
  assert.equal(d.sub, 'Your 3-day streak ends at midnight');
  // Before the reminder hour it is still a normal day.
  assert.equal(widgetData(player(), at(19)).mood, 'happy');
});

test('widget: late at night Bizzy is sleepy once the streak is safe', () => {
  setLang('en');
  const s = player();
  const safe = { ...s, completions: [...s.completions, { taskId: 'dishes', date: TODAY, xp: 20 }] };
  assert.equal(widgetData(safe, at(23)).mood, 'sleepy');
  assert.equal(widgetData(safe, at(3)).mood, 'sleepy');
  // A streak in danger wins over sleepy.
  assert.equal(widgetData(s, at(23)).mood, 'worried');
});

test('widget: all done shows today’s XP and an excited Bizzy', () => {
  setLang('en');
  const s = player();
  const done = { ...s, completions: [...s.completions, { taskId: 'dishes', date: TODAY, xp: 20 }, { taskId: 'read', date: TODAY, xp: 15 }] };
  const d = widgetData(done, at(23));
  assert.equal(d.mood, 'excited');
  assert.equal(d.headline, 'All done!');
  assert.equal(d.sub, '+35 XP today. See you tomorrow.');
});

test('widget: a day with nothing planned', () => {
  setLang('en');
  let s: GameState = { ...emptyState, onboarded: true };
  s = addTask(s, 'Dentist', false, 'dentist', undefined, { date: addDays(TODAY, 3) });
  const d = widgetData(s, at(10));
  assert.equal(d.headline, 'Free day');
  assert.equal(d.mood, 'happy');
});

test('widget: German texts', () => {
  setLang('de');
  try {
    const d = widgetData(player(), at(10));
    assert.equal(d.sub, 'Aufgaben heute offen');
    assert.equal(d.streak, '3 Tage');
    assert.equal(widgetData(player(), at(21)).sub, 'Deine 3-Tage-Serie endet um Mitternacht');
  } finally {
    setLang('en');
  }
});

test('bizzy: every mood is one complete SVG with its own gradient', () => {
  const moods: BizzyMood[] = ['happy', 'excited', 'proud', 'worried', 'sleepy', 'wave'];
  const all = moods.map((m) => bizzySvg(m));
  for (const svg of all) {
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*>.*<\/svg>$/s);
    assert.ok(svg.includes('<linearGradient id="bzg"'));
    assert.ok(!/NaN|undefined/.test(svg));
    assert.equal((svg.match(/<svg/g) ?? []).length, 1);
  }
  assert.equal(new Set(all).size, moods.length);
  assert.ok(!bizzySvg('happy', false).includes('opacity=".3"'));
});
