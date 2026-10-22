import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityTimeline } from './activity.ts';
import { addTask, cleanSteps, emptyState, isDoneToday, MAX_STEPS, taskXp, toggleTask, totalXp, type GameState } from './game.ts';
import { librarySteps, LIBRARY } from './library.ts';
import { stepStatus, stepsFor, stepXpEach, suggestedSteps, tickStep, timeCheckpoints } from './steps.ts';

const TODAY = '2026-10-22';
const TOMORROW = '2026-10-23';
const old = '2026-01-01T00:00:00Z';

/** A player with one task (old enough to tick at once). */
function withTask(title: string, minutes: number, daily = true, steps?: string[]): GameState {
  const s = addTask({ ...emptyState, joinedAt: TODAY }, title, daily, 't', minutes, steps ? { steps } : {});
  return { ...s, tasks: s.tasks.map((t) => ({ ...t, createdAt: old })) };
}

test('long library tasks come with steps; the last one is the finish line', () => {
  assert.deepEqual(librarySteps('Deep clean one room'), ['Declutter', 'Dust top to bottom', 'Wipe the surfaces', 'Vacuum', 'Mop the floor']);
  assert.deepEqual(librarySteps('  deep CLEAN one room '), librarySteps('Deep clean one room'));
  assert.equal(librarySteps('Make your bed'), undefined);
  // Every step list names a real library task and fits the limits.
  for (const t of LIBRARY.filter((l) => l.steps)) {
    assert.ok(t.steps!.length >= 2 && t.steps!.length <= MAX_STEPS, t.title);
    assert.deepEqual(cleanSteps(t.steps!), t.steps, t.title);
  }
  assert.ok(LIBRARY.filter((l) => l.steps).length >= 20);
});

test('a task uses its own steps, else the library ones, and [] turns them off', () => {
  assert.deepEqual(stepsFor({ title: 'Go to the gym' }), ['Warm up', 'Main workout', 'Cool down and stretch']);
  assert.deepEqual(stepsFor({ title: 'Go to the gym', steps: ['Legs', 'Arms'] }), ['Legs', 'Arms']);
  assert.deepEqual(stepsFor({ title: 'Go to the gym', steps: [] }), []);
  assert.deepEqual(stepsFor({ title: 'Something new' }), []);
});

test('typed long tasks are offered time checkpoints', () => {
  assert.deepEqual(timeCheckpoints(45), []);
  assert.deepEqual(timeCheckpoints(60), ['20 min in', '40 min in', 'Full 1 h done']);
  assert.deepEqual(timeCheckpoints(120), ['30 min in', '1 h in', '1.5 h in', 'Full 2 h done']);
  assert.deepEqual(suggestedSteps('Write my thesis chapter', 120), timeCheckpoints(120));
  assert.deepEqual(suggestedSteps('Bake bread', 120), librarySteps('Bake bread'));
});

test('steps are cleaned when the task is added', () => {
  const s = withTask('Big project', 120, false, ['  Plan  ', '', 'Build', 'x'.repeat(60), 'a', 'b', 'c', 'd']);
  assert.deepEqual(s.tasks[0].steps, ['Plan', 'Build', 'x'.repeat(40), 'a', 'b', 'c']);
});

test('steps pay a little each, and the task total never changes', () => {
  let s = withTask('Deep clean one room', 90); // 45 XP, 5 steps
  const full = taskXp(s.tasks[0]);
  assert.equal(full, 45);
  assert.equal(stepXpEach(s.tasks[0], 5), 3); // 30 % of 45 = 13.5, split in 5

  s = tickStep(s, 't', 0, TODAY, Date.now()).state;
  s = tickStep(s, 't', 2, TODAY, Date.now()).state;
  assert.equal(totalXp(s), 6);
  const status = stepStatus(s, s.tasks[0], TODAY);
  assert.deepEqual(status.done, [true, false, true, false, false]);
  assert.equal(status.doneCount, 2);

  // Ticking the whole task pays the full 45 in total, not 45 on top of the steps.
  const finished = toggleTask(s, 't', TODAY, Date.now());
  assert.equal(totalXp(finished), full);
  assert.deepEqual(stepStatus(finished, finished.tasks[0], TODAY).done, [true, true, true, true, true]);
  // Unticking the task leaves the steps' XP.
  assert.equal(totalXp(toggleTask(finished, 't', TODAY)), 6);
});

test('the last step finishes the task', () => {
  let s = withTask('Go to the gym', 60); // 35 XP, 3 steps of 4 (30 % of 35 = 10.5)
  s = tickStep(s, 't', 0, TODAY).state;
  s = tickStep(s, 't', 1, TODAY).state;
  assert.equal(totalXp(s), 8);
  const last = tickStep(s, 't', 2, TODAY);
  assert.ok(last.finished);
  assert.ok(isDoneToday(last.state, last.state.tasks[0], TODAY));
  assert.equal(totalXp(last.state), 35);
  // Once done, steps don't change.
  assert.equal(tickStep(last.state, 't', 0, TODAY).state, last.state);
});

test('a step can be unticked, which takes its XP back', () => {
  let s = withTask('Go to the gym', 60);
  s = tickStep(s, 't', 1, TODAY).state;
  assert.equal(totalXp(s), 4);
  const undone = tickStep(s, 't', 1, TODAY);
  assert.equal(totalXp(undone.state), 0);
  assert.equal(undone.finished, false);
  assert.deepEqual(undone.state.stepTicks, []);
});

test('repeating tasks start their steps over each day; one-off tasks keep them', () => {
  let daily = withTask('Go to the gym', 60);
  daily = tickStep(daily, 't', 0, TODAY).state;
  assert.equal(stepStatus(daily, daily.tasks[0], TOMORROW).doneCount, 0);
  // Yesterday's step XP stays: it was earned.
  assert.equal(totalXp(daily), 4);

  let oneOff = withTask('Deep clean one room', 90, false);
  oneOff = tickStep(oneOff, 't', 0, TODAY).state;
  oneOff = tickStep(oneOff, 't', 1, TODAY).state;
  assert.equal(stepStatus(oneOff, oneOff.tasks[0], TOMORROW).doneCount, 2);
  const done = toggleTask(oneOff, 't', TOMORROW);
  assert.equal(totalXp(done), 45);
});

test('steps follow the task rules: wait after adding, multipliers, the daily limit', () => {
  const fresh = addTask({ ...emptyState, joinedAt: TODAY }, 'Go to the gym', true, 't', 60);
  assert.equal(tickStep(fresh, 't', 0, TODAY, Date.now()).state, fresh);

  const doubled = { ...withTask('Go to the gym', 60), doubleDays: [TODAY] };
  assert.equal(tickStep(doubled, 't', 0, TODAY).state.stepTicks![0].xp, 7);

  // 16 h of tasks done today: steps still tick but pay nothing.
  const busy = withTask('Go to the gym', 60);
  busy.completions = [{ taskId: 'other', date: TODAY, xp: 100, minutes: 16 * 60, title: 'Marathon day' }];
  assert.equal(tickStep(busy, 't', 0, TODAY).state.stepTicks![0].xp, 0);

  // Out-of-range steps and tasks without steps do nothing.
  const s = withTask('Go to the gym', 60);
  assert.equal(tickStep(s, 't', 3, TODAY).state, s);
  const plain = withTask('Make your bed', 5);
  assert.equal(tickStep(plain, 't', 0, TODAY).state, plain);
});

test('unfinished steps show in the activity timeline, finished ones count as the task', () => {
  let s = withTask('Go to the gym', 60);
  s = tickStep(s, 't', 0, TODAY).state;
  s = tickStep(s, 't', 1, TODAY).state;
  let day = activityTimeline(s, TODAY).find((d) => d.date === TODAY)!;
  assert.equal(day.xp, 8);
  assert.deepEqual(day.events.filter((e) => e.kind === 'steps'), [{ kind: 'steps', title: 'Go to the gym', count: 2, xp: 8 }]);

  s = tickStep(s, 't', 2, TODAY).state;
  day = activityTimeline(s, TODAY).find((d) => d.date === TODAY)!;
  assert.equal(day.xp, 35);
  assert.equal(day.events.filter((e) => e.kind === 'steps').length, 0);
  assert.equal(day.taskCount, 1);
});
