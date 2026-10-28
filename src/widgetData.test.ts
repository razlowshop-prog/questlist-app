import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addTask, emptyState, type GameState } from './game.ts';
import { BIZZY_FORMS, bizzyEdge, bizzyFormOf, bizzyGripSvg, bizzyMiddle, bizzySvg, canEvolve, cocoonSvg, nextBizzyForm, type BizzyMood } from './bizzy.ts';
import { setLang } from './i18n.ts';
import { bizzyMood, widgetData } from './widgetData.ts';

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

test('bizzy mood on the streak card: happy, worried, sleepy, proud', () => {
  const s = player();
  assert.equal(bizzyMood(s, at(10)), 'happy');
  assert.equal(bizzyMood(s, at(19)), 'happy');
  assert.equal(bizzyMood(s, at(20)), 'worried');
  // A streak in danger wins over sleepy.
  assert.equal(bizzyMood(s, at(23)), 'worried');
  const one = { ...s, completions: [...s.completions, { taskId: 'dishes', date: TODAY, xp: 20 }] };
  assert.equal(bizzyMood(one, at(20)), 'happy');
  assert.equal(bizzyMood(one, at(23)), 'sleepy');
  assert.equal(bizzyMood(one, at(3)), 'sleepy');
  const all = { ...one, completions: [...one.completions, { taskId: 'read', date: TODAY, xp: 15 }] };
  assert.equal(bizzyMood(all, at(9)), 'proud');
  assert.equal(bizzyMood(all, at(23)), 'proud');
  // Nothing planned today and no streak: just happy.
  assert.equal(bizzyMood({ ...emptyState, onboarded: true }, at(10)), 'happy');
});

test('bizzy: looking around, blinking and holding on', () => {
  const plain = bizzySvg('happy');
  assert.notEqual(bizzySvg('happy', true, { look: [3, 2] }), plain);
  assert.equal(bizzySvg('happy', true, { look: [0, 0] }), plain);
  // A blink swaps the round eyes for shut ones.
  const shut = bizzySvg('happy', true, { blink: true });
  assert.ok((plain.match(/fill="#fff"/g) ?? []).length > (shut.match(/fill="#fff"/g) ?? []).length);
  assert.notEqual(bizzySvg('curious'), plain);
  for (const svg of [shut, bizzySvg('curious', false, { look: [-2, 3] }), bizzyGripSvg()]) {
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*>.*<\/svg>$/s);
    assert.ok(!/NaN|undefined/.test(svg));
  }
});

test('bizzy: every mood is one complete SVG with its own gradient', () => {
  const moods: BizzyMood[] = ['happy', 'excited', 'proud', 'worried', 'sleepy', 'wave', 'curious'];
  const all = moods.map((m) => bizzySvg(m));
  for (const svg of all) {
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*>.*<\/svg>$/s);
    assert.ok(svg.includes('<linearGradient id="bzg5"'), 'the full Bizzy unless a form is given');
    assert.ok(!/NaN|undefined/.test(svg));
    assert.equal((svg.match(/<svg/g) ?? []).length, 1);
  }
  assert.equal(new Set(all).size, moods.length);
  assert.ok(!bizzySvg('happy', false).includes('opacity=".3"'));
  // Hands with a thumb only come out for the wave.
  assert.equal((bizzySvg('wave').match(/scale\(1\.3\)/g) ?? []).length, 2);
  assert.ok(!bizzySvg('happy').includes('scale(1.3)'));
});

test('bizzy: every face, blink and glance works in every one of his ten forms', () => {
  const moods: BizzyMood[] = ['happy', 'excited', 'proud', 'worried', 'sleepy', 'wave', 'curious'];
  assert.equal(BIZZY_FORMS.length, 10);
  const happies = new Set<string>();
  for (const f of BIZZY_FORMS) {
    const all = moods.map((m) => bizzySvg(m, true, { form: f.n }));
    for (const svg of all) {
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*>.*<\/svg>$/s);
      assert.ok(!/NaN|undefined/.test(svg), `${f.name} draws cleanly`);
      assert.ok(svg.includes(`id="bzg${f.n}"`) && svg.includes(`url(#bzc${f.n})`), `${f.name} has its own gradient and clip`);
    }
    assert.equal(new Set(all).size, moods.length, `${f.name} shows every face differently`);
    const plain = bizzySvg('happy', true, { form: f.n });
    assert.notEqual(bizzySvg('happy', true, { form: f.n, blink: true }), plain, `${f.name} blinks`);
    assert.notEqual(bizzySvg('happy', true, { form: f.n, look: [3, 1] }), plain, `${f.name} looks around`);
    assert.equal((bizzySvg('wave', true, { form: f.n }).match(/scale\(1\.3\)/g) ?? []).length, 2, `${f.name} waves with both hands`);
    happies.add(plain);
  }
  assert.equal(happies.size, 10, 'each form looks different');
  // Young forms stand smaller on the same ground; the Larva has no wings or feelers yet.
  assert.match(bizzySvg('happy', true, { form: 1 }), /scale\(0\.56\)/);
  assert.ok(!bizzySvg('happy', true, { form: 1 }).includes('Q80 40 70 36'));
  assert.ok(!bizzySvg('happy', true, { form: 5 }).includes('scale(0.'));
  assert.ok(bizzySvg('happy', true, { form: 10 }).includes('#6A3FC8'), 'the Queen wears her cape');
});

test('bizzy: evolving one form at a time, the Larva already at level 2', () => {
  assert.deepEqual(BIZZY_FORMS.map((f) => f.level), [1, 2, 5, 10, 15, 25, 35, 50, 65, 80]);
  assert.equal(bizzyFormOf(undefined).name, 'Larva');
  assert.equal(bizzyFormOf(0).n, 1);
  assert.equal(bizzyFormOf(99).n, 10);
  assert.equal(bizzyFormOf('3').n, 1);
  assert.equal(nextBizzyForm(1)?.name, 'Bud');
  assert.equal(nextBizzyForm(10), undefined);
  assert.equal(canEvolve(1, 1), false);
  assert.equal(canEvolve(1, 2), true);
  assert.equal(canEvolve(4, 14), false);
  assert.equal(canEvolve(4, 15), true);
  assert.equal(canEvolve(2, 90), true, 'far past it: still one step per tap');
  assert.equal(canEvolve(10, 100), false);
  // His chin is on an edge at 57% for the full Bizzy (as before); young forms sit lower in their box.
  assert.equal(bizzyEdge(5), 0.57);
  assert.ok(bizzyEdge(1) > bizzyEdge(5) && bizzyMiddle(1) > bizzyMiddle(5));
});

test('bizzy: the honey cocoon wraps each form and splits in two', () => {
  for (const f of BIZZY_FORMS) {
    for (const part of ['left', 'right', 'crack'] as const) {
      const svg = cocoonSvg(f.n, part);
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*>.*<\/svg>$/s);
      assert.ok(!/NaN|undefined/.test(svg));
    }
  }
  // Both halves share the zigzag, so they close up without a gap.
  const zig = (svg: string) => svg.match(/ L([\d. L]+)Z/)?.[1];
  assert.equal(zig(cocoonSvg(3, 'left')), zig(cocoonSvg(3, 'right')));
  assert.ok(zig(cocoonSvg(3, 'left')));
});
