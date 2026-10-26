import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateMinutes } from './estimate.ts';
import { libraryMatch, librarySteps, LIBRARY } from './library.ts';
import { clampAmount, DEFAULT_AMOUNTS, MEASURE_RANGES, measuredSteps, measuredTitle, parseMeasured, thousands } from './measure.ts';

test('Walk, Run and Steps are library tasks sized by the player', () => {
  const measured = LIBRARY.filter((t) => t.measure).map((t) => [t.title, t.measure, t.minutes]);
  assert.deepEqual(measured, [
    ['Walk', 'walk', 30],
    ['Run', 'run', 30],
    ['Steps', 'steps', 40],
  ]);
  // The fixed-size versions are gone.
  for (const old of ['Walk 5 km', 'Walk 10,000 steps', 'Go for a 5 km run', 'Go for a 10 km run', 'Jog for 20 minutes', 'Go for a 10-minute walk']) {
    assert.ok(!LIBRARY.some((t) => t.title === old), old);
  }
});

test('the amount is part of the title, and reads back', () => {
  assert.equal(measuredTitle('walk', { unit: 'km', value: 2.5 }), 'Walk 2.5 km');
  assert.equal(measuredTitle('run', { unit: 'min', value: 45 }), 'Run 45 min');
  assert.equal(measuredTitle('steps', DEFAULT_AMOUNTS.steps), 'Walk 4,000 steps');
  assert.equal(thousands(12500), '12,500');
  for (const title of ['Walk 2.5 km', 'Run 45 min', 'Walk 4,000 steps', 'Walk 12,500 steps']) {
    const m = parseMeasured(title)!;
    assert.equal(measuredTitle(m.measure, m.amount), title);
  }
  assert.deepEqual(parseMeasured('  walk  10000 steps '), { measure: 'steps', amount: { unit: 'steps', value: 10000 } });
  assert.equal(parseMeasured('Walk the dog'), undefined);
  assert.equal(parseMeasured('Run 5 miles'), undefined);
  assert.equal(libraryMatch('Walk 3 km')?.id, 'walk');
  assert.equal(libraryMatch('Walk 6,000 steps')?.id, 'steps');
  assert.equal(libraryMatch('Run 10 km')?.id, 'run');
});

test('amounts stay in range on whole steps', () => {
  assert.deepEqual(clampAmount('walk', { unit: 'km', value: 0.2 }), { unit: 'km', value: 0.5 });
  assert.deepEqual(clampAmount('walk', { unit: 'km', value: 30 }), { unit: 'km', value: 12.5 });
  assert.deepEqual(clampAmount('run', { unit: 'km', value: 5.3 }), { unit: 'km', value: 5.5 });
  assert.deepEqual(clampAmount('steps', { unit: 'steps', value: 4200 }), { unit: 'steps', value: 4000 });
  assert.deepEqual(clampAmount('steps', { unit: 'km', value: 3 }), DEFAULT_AMOUNTS.steps, 'steps have no distance');
});

test('XP follows the amount by pace, within the same caps as typed titles', () => {
  const min = (t: string) => estimateMinutes(t).minutes;
  assert.equal(min('Walk 30 min'), 30);
  assert.equal(min('Walk 3 km'), 35);
  assert.equal(min('Run 5 km'), 30);
  assert.equal(min('Walk 4,000 steps'), 40);
  assert.equal(min('Walk 10,000 steps'), 105);
  // The longest of each range is the most it can count for.
  assert.equal(min(measuredTitle('walk', { unit: 'km', value: MEASURE_RANGES.walk.km!.max })), 150);
  assert.equal(min(measuredTitle('run', { unit: 'km', value: MEASURE_RANGES.run.km!.max })), 150);
  assert.equal(min('Walk 50 km'), 150, 'typed past the range: capped');
  assert.ok(min(measuredTitle('steps', { unit: 'steps', value: MEASURE_RANGES.steps.steps!.max })) <= 200);
  // Typed step counts work too.
  assert.equal(min('8,000 steps'), 75);
  assert.equal(min('10k steps'), 105);
  assert.equal(min('Clean the front steps'), 25, 'steps without a number are not a step count');
});

test('longer walks and runs get steps along the way that scale with the amount', () => {
  assert.equal(librarySteps('Walk 20 min'), undefined);
  assert.deepEqual(librarySteps('Walk 3 km'), ['1 km', '2 km', '3 km']);
  assert.deepEqual(librarySteps('Run 30 min'), ['10 min', '20 min', '30 min']);
  assert.deepEqual(librarySteps('Walk 10,000 steps'), ['2,500 steps', '5,000 steps', '7,500 steps', '10,000 steps']);
  assert.deepEqual(measuredSteps({ unit: 'km', value: 12.5 }, 150), ['3 km', '6.5 km', '9.5 km', '12.5 km']);
  // Marks never repeat or reach the end early on short distances.
  assert.deepEqual(measuredSteps({ unit: 'km', value: 1 }, 30), ['0.5 km', '1 km']);
});
