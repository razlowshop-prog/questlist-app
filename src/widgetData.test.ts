import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addTask, birthdayIn, birthdayLockedUntil, emptyState, isBirthday, restDaysOf, setBirthday, validBirthday, type GameState } from './game.ts';
import { BIZZY_FORMS, bizzyEdge, bizzyFormOf, bizzyGripSvg, bizzyMiddle, bizzySvg, bizzyWingRoot, bizzyWingsSvg, canEvolve, cocoonSvg, nextBizzyForm, type BizzyMood } from './bizzy.ts';
import { setLang } from './i18n.ts';
import { bizzyMood, pickOfDay, widgetData, type WidgetData } from './widgetData.ts';
import { DRAMA_ROUTES, dramaBizzySvg, widgetBizzySvg, widgetLooks } from './widgetLooks.ts';

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

const at2 = (hour: number, minute = 0, day = TODAY) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute);
};
const moodOf = (d: WidgetData) => ('route' in d.art ? 'drama' : d.art.mood);
/** Six daily tasks, `done` of them ticked today (at `hour`), and a streak that ran until yesterday. */
function busy(done: number, hour = 9): GameState {
  let s: GameState = { ...emptyState, onboarded: true };
  for (let i = 0; i < 6; i++) s = addTask(s, `Task ${i}`, true, `t${i}`);
  const ids = s.tasks.map((x) => x.id);
  const past = [3, 2, 1].map((n) => ({ taskId: ids[0], date: addDays(TODAY, -n), xp: 22 }));
  const today = ids.slice(0, done).map((taskId) => ({ taskId, date: TODAY, xp: 15, hour }));
  return { ...s, completions: [...past, ...today] };
}

test('widget: before onboarding Bizzy waves and asks to plan the day', () => {
  setLang('en');
  const d = widgetData(emptyState, at(10));
  assert.deepEqual(d.art, { mood: 'hello', look: 'A' });
  assert.equal(d.headline, 'Hi!');
  assert.equal(d.streak, '');
  assert.equal(d.level, 1);
  assert.equal(d.tint, 0);
});

test('widget: the moods through a normal day (picked 2026-11-01)', () => {
  setLang('en');
  assert.equal(moodOf(widgetData(busy(0), at2(7))), 'morning');
  assert.equal(widgetData(busy(0), at2(7)).headline, 'Good morning!');
  assert.equal(widgetData(busy(0), at2(7)).sub, '6 tasks today.');
  assert.equal(moodOf(widgetData(busy(0), at2(11))), 'hello');
  assert.equal(moodOf(widgetData(busy(2), at2(11))), 'todo');
  assert.equal(widgetData(busy(2), at2(11)).headline, '4');
  assert.equal(widgetData(busy(2), at2(11)).sub, 'tasks left today');
  assert.equal(widgetData(busy(2), at2(11)).streak, '4 days');
  // Judgy from 13:00 with 4+ left and under a third done.
  assert.equal(moodOf(widgetData(busy(1), at2(12, 30))), 'todo');
  assert.equal(moodOf(widgetData(busy(1), at2(13))), 'judgy');
  assert.equal(moodOf(widgetData(busy(2), at2(15))), 'todo');
  assert.equal(moodOf(widgetData(busy(4), at2(17))), 'evening');
  assert.equal(widgetData(busy(4), at2(17)).sub, '2 tasks left. Still time.');
  assert.equal(moodOf(widgetData(busy(4), at2(18, 30))), 'drama');
});

test('widget: the late drama gets worse, and the streak only matters when nothing is ticked', () => {
  setLang('en');
  const step = (s: GameState, h: number, m = 0) => {
    const d = widgetData(s, at2(h, m));
    return 'route' in d.art ? d.art.step : -1;
  };
  // Two ticked: the streak is safe, so it's only about the open tasks.
  const two = busy(2);
  assert.deepEqual([step(two, 18), step(two, 18, 30), step(two, 20), step(two, 22), step(two, 23, 30)], [-1, 0, 1, 2, 3]);
  assert.equal(widgetData(two, at2(23, 30)).sub, '4 tasks still open. I can’t watch!');
  assert.ok(!widgetData(two, at2(23, 30)).sub.includes('streak'));
  assert.equal(widgetData(two, at2(22)).tint, 3);
  // Nothing ticked: one step more, and the streak is mentioned.
  const none = busy(0);
  assert.deepEqual([step(none, 18, 30), step(none, 20), step(none, 22)], [1, 2, 3]);
  assert.equal(widgetData(none, at2(20)).sub, 'Your 3-day streak ends at midnight');
  // Just one left: one step calmer.
  assert.deepEqual([step(busy(5), 18, 30), step(busy(5), 20)], [0, 0]);
  assert.equal(widgetData(busy(5), at2(18, 30)).sub, '1 task left. The day’s nearly over…');
});

test('widget: all done celebrates by when you finished, then sleeps', () => {
  setLang('en');
  const look = (s: GameState, h: number, m = 0) => widgetData(s, at2(h, m)).art;
  assert.ok(['B', 'D'].includes((look(busy(6, 10), 11) as { look: string }).look));
  assert.deepEqual(look(busy(6, 14), 15), { mood: 'done', look: 'A' });
  assert.deepEqual(look(busy(6, 19), 20), { mood: 'done', look: 'C' });
  assert.equal(widgetData(busy(6, 19), at2(20)).headline, 'All done!');
  assert.equal(widgetData(busy(6, 19), at2(20)).sub, '+90 XP today. See you tomorrow.');
  const sleepy = look(busy(6, 19), 22) as { mood: string; look: string };
  assert.equal(sleepy.mood, 'night');
  assert.ok(['A', 'D'].includes(sleepy.look));
  assert.ok(['B', 'C'].includes((look(busy(6, 19), 23, 30) as { look: string }).look));
  assert.equal(widgetData(busy(6, 19), at2(23, 30)).headline, 'Shh…');
  // After midnight he sleeps, even with the new day's tasks open.
  assert.equal(moodOf(widgetData(busy(0), at2(3))), 'night');
});

test('widget: looks change from day to day, but stay the same all day', () => {
  setLang('en');
  const seen = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const day = addDays(TODAY, i);
    const d = widgetData(busy(0), at2(7, 0, day));
    const again = widgetData(busy(0), at2(9, 30, day));
    assert.deepEqual(d.art, again.art);
    seen.add((d.art as { look: string }).look);
  }
  assert.deepEqual([...seen].sort(), ['A', 'B', 'C']);
  assert.equal(pickOfDay(['x', 'y'], TODAY, 'a'), pickOfDay(['x', 'y'], TODAY, 'a'));
});

test('widget: birthday all day', () => {
  setLang('en');
  const s = setBirthday(busy(0), TODAY.slice(5), '2026-01-01');
  for (const h of [7, 13, 21]) assert.equal(moodOf(widgetData(s, at2(h))), 'birthday');
  assert.equal(widgetData(s, at2(13)).headline, 'Happy birthday!');
  assert.equal(widgetData(s, at2(13)).sub, '6 tasks today. Take it easy.');
});

test('widget: a day with nothing planned', () => {
  setLang('en');
  let s: GameState = { ...emptyState, onboarded: true };
  s = addTask(s, 'Clean the windows', false, 'win');
  s = { ...s, tasks: s.tasks.map((x) => ({ ...x, createdAt: addDays(TODAY, -5) + 'T08:00:00Z' })), completions: [{ taskId: 'win', date: addDays(TODAY, -5), xp: 20 }] };
  const d = widgetData(s, at(10));
  assert.equal(d.headline, 'Free day');
  assert.equal(moodOf(d), 'hello');
  assert.equal(moodOf(widgetData(s, at2(22, 30))), 'night');
});

test('widget: German texts', () => {
  setLang('de');
  try {
    assert.equal(widgetData(busy(0), at2(7)).headline, 'Guten Morgen!');
    assert.equal(widgetData(busy(2), at2(11)).sub, 'Aufgaben heute offen');
    assert.equal(widgetData(busy(0), at2(20)).sub, 'Deine 3-Tage-Serie endet um Mitternacht');
    assert.equal(widgetData(busy(5), at2(18, 30)).sub, 'Noch 1 Aufgabe. Der Tag ist fast vorbei…');
  } finally {
    setLang('en');
  }
});

test('widget: every look and drama step draws in every form', () => {
  for (const f of [1, 5, 10]) {
    for (const mood of ['morning', 'hello', 'todo', 'judgy', 'evening', 'done', 'night', 'birthday'] as const) {
      for (const look of widgetLooks(mood)) {
        const svg = widgetBizzySvg(mood, look, f);
        assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${mood} ${look} ${f}`);
      }
    }
    for (const route of DRAMA_ROUTES) for (let st = 0; st < 4; st++) assert.ok(dramaBizzySvg(route, st, f).endsWith('</svg>'));
  }
});

test('birthday: a free rest day from when it was set, changeable once a year', () => {
  let s = busy(0);
  assert.equal(validBirthday('02-29'), true);
  assert.equal(validBirthday('13-01'), false);
  assert.equal(validBirthday('04-31'), false);
  assert.equal(birthdayIn(2027, '02-29'), '2027-02-28');
  assert.equal(birthdayIn(2028, '02-29'), '2028-02-29');
  s = setBirthday(s, '10-20', '2026-10-25');
  assert.equal(s.profile.birthday, '10-20');
  // Set after the 20 October 2026: that one doesn't count, the next year's does.
  assert.ok(!restDaysOf(s).includes('2026-10-20'));
  assert.ok(restDaysOf(s).includes('2027-10-20'));
  // Locked for a year.
  assert.equal(birthdayLockedUntil(s, '2026-11-01'), addDays('2026-10-25', 365));
  assert.equal(setBirthday(s, '05-05', '2026-11-01'), s);
  assert.equal(setBirthday(s, '05-05', addDays('2026-10-25', 365)).profile.birthday, '05-05');
  assert.equal(isBirthday(s, '2027-10-20'), true);
  assert.equal(isBirthday(s, '2027-10-21'), false);
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

test('bizzy: the wings come apart to flap, and together they draw the same Bizzy', () => {
  const ellipses = (svg: string) => (svg.match(/<ellipse [^>]*rotate[^>]*\/>/g) ?? []).sort();
  for (const f of BIZZY_FORMS) {
    const whole = bizzySvg('happy', true, { form: f.n });
    const bare = bizzySvg('happy', true, { form: f.n, wings: false });
    const left = bizzyWingsSvg(f.n, 'left');
    const right = bizzyWingsSvg(f.n, 'right');
    if (f.wings === 'none') {
      assert.equal(left, '');
      assert.equal(right, '');
      assert.equal(bare, whole);
      continue;
    }
    for (const side of [left, right]) {
      assert.match(side, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*>.*<\/svg>$/s);
      assert.ok(!/NaN|undefined/.test(side));
    }
    // The split loses no wing and adds none: the bare body plus both sides hold exactly the whole drawing's wings.
    assert.deepEqual([...ellipses(bare), ...ellipses(left), ...ellipses(right)].sort(), ellipses(whole));
    assert.equal(ellipses(left).length, ellipses(right).length);
    assert.ok(ellipses(left).length > 0);
    // Young forms are placed like the body, so the wings sit on his back.
    if (f.k !== 1) assert.ok(left.includes(`scale(${f.k})`));
    // Left wings on the left, right wings on the right, roots on his back between them.
    const [lx, ly] = bizzyWingRoot(f.n, 'left');
    const [rx, ry] = bizzyWingRoot(f.n, 'right');
    assert.ok(lx < 0.5 && rx > 0.5 && Math.abs(lx + rx - 1) < 1e-9 && ly === ry && ly > 0.3 && ly < 0.75);
  }
  assert.deepEqual(bizzyWingRoot(5, 'left'), [0.46, 0.45]);
});
