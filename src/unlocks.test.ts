import assert from 'node:assert/strict';
import { test } from 'node:test';
import { achievementStatuses } from './achievements.ts';
import { emptyState, type GameState } from './game.ts';
import { seasonStatus } from './seasons.ts';
import { trophyStatuses } from './trophies.ts';
import { unlockFor, type UnlockContext } from './unlocks.ts';

const today = '2026-10-26';

function ctx(state: GameState, level = 3, spinsToPity?: number): UnlockContext {
  return { level, achievements: achievementStatuses(state, today), trophies: trophyStatuses(state, today), season: seasonStatus(state, today), spinsToPity };
}

function withCompletions(n: number): GameState {
  return {
    ...emptyState,
    joinedAt: '2026-10-01',
    completions: Array.from({ length: n }, (_, i) => ({ taskId: `t${i}`, date: today, xp: 5 })) as GameState['completions'],
  };
}

test('a locked theme names its award tier and shows the progress', () => {
  const u = unlockFor({ kind: 'theme', reward: 'Notepad theme' }, ctx(withCompletions(120)));
  assert.equal(u.how, 'Win Diamond in the Task Master award: finish 250 tasks in total.');
  assert.deepEqual(u.progress, { value: 120, goal: 250, unit: 'tasks' });
  assert.equal(u.ready, undefined);
});

test('a theme whose tier is reached but not claimed says where to claim it', () => {
  const u = unlockFor({ kind: 'theme', reward: 'Forest theme' }, ctx(withCompletions(130)));
  assert.deepEqual(u.progress, { value: 100, goal: 100, unit: 'tasks' });
  assert.match(u.ready ?? '', /Claim it under Awards on your profile/);
});

test('Fortuna is won on the wheel, with the guarantee counting down', () => {
  const u = unlockFor({ kind: 'theme', reward: 'Fortuna theme' }, ctx(emptyState, 3, 140));
  assert.match(u.how, /lucky wheel.*1% chance.*spin 150/);
  assert.deepEqual(u.progress, { value: 10, goal: 150, unit: 'spins' });
});

test('level looks name their level, trophy frames their trophy, the event frame its goal', () => {
  const level = unlockFor({ kind: 'frame', id: 'ring' }, ctx(emptyState, 3));
  assert.match(level.how, /^Reach level \d+\.$/);
  assert.equal(level.progress?.value, 3);
  const flame = unlockFor({ kind: 'flame', id: 'outline' }, ctx(emptyState, 1));
  assert.match(flame.how, /^Reach level \d+\.$/);
  const trophy = unlockFor({ kind: 'frame', id: 'ironWill' }, ctx(emptyState));
  assert.match(trophy.how, /^Win the .+ trophy: .+\.$/);
  assert.equal(trophy.progress?.value, 0);
  const event = unlockFor({ kind: 'frame', id: 'season-2026-10' }, ctx(emptyState));
  assert.match(event.how, /^Finish 20 home, money or food tasks in October for the Harvest event/);
  assert.deepEqual(event.progress, { value: 0, goal: 20, unit: 'tasks' });
});
