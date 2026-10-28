import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bizzyLines, greeting, pickLine, pickReaction, SURPRISES, tickleLine, type TalkContext } from './bizzyTalk.ts';
import { setLang } from './i18n.ts';

const base: TalkContext = { mood: 'happy', name: 'Fabian', hour: 14, tasksLeft: 3, tasksDone: 2, streak: 4, nextBonus: { daysLeft: 1, bonus: 0.1 }, level: 7, xpToLevel: 40, maxed: false, tickets: 2, claimable: 1, nearAward: 'Early Bird', canEvolve: false, evolveAt: 10 };
const keys = (c: TalkContext) => bizzyLines(c).map((l) => l.line.key);

test('bizzy talk: lines fit the day', () => {
  setLang('en');
  const k = keys(base);
  for (const key of ['left', 'going', 'streak', 'bonus', 'level', 'award', 'grow', 'tickets', 'claim', 'hi']) assert.ok(k.includes(key), key);
  // Mood lines only in their mood; no "morning" in the afternoon; no evolve hint while he can't.
  for (const key of ['risk', 'awake', 'allDone', 'morning', 'evolve', 'none', 'light']) assert.ok(!k.includes(key), key);
  const text = Object.fromEntries(bizzyLines(base).map((l) => [l.line.key, l.line.text]));
  assert.equal(text.left, '3 tasks left today. One at a time!');
  assert.equal(text.going, '2 done already. Keep it up!');
  assert.equal(text.bonus, '1 more day to a ×1.1 XP bonus!');
  assert.equal(text.level, '40 XP to level 8. You can do it!');
  assert.equal(text.tickets, '2 tickets ready. Spin the wheel!');
  assert.equal(text.hi, 'Hi Fabian! Happy to see you.');

  assert.ok(keys({ ...base, mood: 'worried', streak: 6 }).includes('riskDays'));
  assert.ok(!keys({ ...base, mood: 'worried' }).includes('left'), 'a worried Bizzy talks about the streak, not the list');
  assert.ok(keys({ ...base, mood: 'proud', tasksLeft: 0, tasksDone: 5 }).includes('doneCount'));
  assert.ok(keys({ ...base, mood: 'sleepy' }).includes('awake'));
  assert.ok(keys({ ...base, tasksLeft: 0, tasksDone: 0 }).includes('none'));
  assert.ok(keys({ ...base, tasksLeft: 1 }).includes('lastOne'));
  assert.ok(keys({ ...base, hour: 8, tasksDone: 0 }).includes('morning'));
  assert.ok(keys({ ...base, streak: 0 }).includes('light'));
  assert.ok(keys({ ...base, canEvolve: true }).includes('evolve'));
  assert.ok(!keys({ ...base, canEvolve: true }).includes('grow'));
  assert.ok(!keys({ ...base, maxed: true }).includes('level'));
  assert.equal(greeting({ ...base, name: '' }).text, 'Hi! Happy to see you.');
});

test('bizzy talk: every line is short enough for his bubble, in both languages', () => {
  const contexts: TalkContext[] = [
    base,
    { ...base, mood: 'worried', streak: 365, tickets: 120, claimable: 12, xpToLevel: 4945, level: 99 },
    { ...base, mood: 'proud', tasksLeft: 0, tasksDone: 25, canEvolve: true },
    { ...base, mood: 'sleepy', streak: 0, tasksLeft: 0, tasksDone: 0, hour: 23 },
    { ...base, hour: 7, tasksDone: 0, nearAward: 'Unstoppable' },
  ];
  for (const lang of ['en', 'de'] as const) {
    setLang(lang);
    for (const c of contexts) {
      for (const { line } of bizzyLines(c)) {
        assert.ok(line.text.length <= 62, `${lang} ${line.key}: ${line.text} (${line.text.length})`);
        assert.ok(!/\{|\}|undefined|NaN/.test(line.text), line.text);
      }
    }
  }
  setLang('de');
  assert.equal(bizzyLines(base).find((l) => l.line.key === 'bonus')!.line.text, 'Noch 1 Tag bis zum ×1,1 XP-Bonus!');
  assert.equal(tickleLine().text, 'Hihi, das kitzelt!');
  setLang('en');
});

test('bizzy talk: picks by weight and skips recent lines', () => {
  const all = keys(base);
  const recent = all.slice(0, -1);
  for (let i = 0; i < 20; i++) assert.equal(pickLine(base, recent, () => i / 20).key, all.at(-1));
  // Everything recent: it still says something.
  assert.ok(all.includes(pickLine(base, all, () => 0.5).key));
  assert.equal(pickLine(base, [], () => 0).key, all[0]);
});

test('bizzy reactions: mostly mood-fitting when not happy, never twice in a row', () => {
  assert.equal(pickReaction('worried', undefined, () => 0.1), 'worry');
  assert.equal(pickReaction('sleepy', undefined, () => 0.1), 'wake');
  assert.equal(pickReaction('proud', undefined, () => 0.1), 'proud');
  assert.ok(SURPRISES.includes(pickReaction('worried', undefined, () => 0.9)));
  assert.notEqual(pickReaction('worried', 'worry', () => 0.1), 'worry');
  for (let i = 0; i < 50; i++) {
    const r = pickReaction('happy', 'hop', () => i / 50);
    assert.ok(SURPRISES.includes(r) && r !== 'hop');
  }
  assert.ok(SURPRISES.includes(pickReaction('happy', undefined, () => 0.9999)));
});
