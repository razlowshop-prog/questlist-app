import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupName, backupSummary, checksum, makeBackup, readBackup } from './backup.ts';
import { emptyState, type GameState } from './game.ts';

const state: GameState = {
  ...emptyState,
  onboarded: true,
  profile: { name: 'Fabian' },
  joinedAt: '2026-10-01',
  tasks: [{ id: 't1', title: 'Wäsche falten 🧺', daily: true, minutes: 15, createdAt: '2026-10-01' } as GameState['tasks'][number]],
  completions: [{ taskId: 't1', date: '2026-10-02', xp: 15, minutes: 15, title: 'Wäsche falten 🧺' } as GameState['completions'][number]],
  settings: { ...emptyState.settings, theme: 'neon', seenLooks: ['theme:neon'] },
};
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const AT = '2026-10-25T11:30:00.000Z';

test('a backup reads back to the same progress and photo, and remembers the day it was saved', () => {
  const read = readBackup(makeBackup(state, PHOTO, AT, '2026-10-25'));
  assert.ok(read.ok);
  if (!read.ok) return;
  assert.deepEqual(read.state.tasks, state.tasks);
  assert.deepEqual(read.state.completions, state.completions);
  assert.equal(read.state.settings.theme, 'neon');
  assert.equal(read.state.settings.lastBackup, '2026-10-25');
  assert.equal(read.photo, PHOTO);
  assert.equal(read.savedAt, AT);
  assert.equal(backupName('2026-10-25'), 'succedo-backup-2026-10-25.json');
});

test('without a photo there is none after restoring', () => {
  const read = readBackup(makeBackup(state, undefined, AT, '2026-10-25'));
  assert.ok(read.ok && read.photo === undefined);
});

test('old backups get the fields newer versions added', () => {
  const old = { ...state, settings: { quoteEmails: false, email: '', theme: 'classic' } } as GameState;
  const read = readBackup(makeBackup(old, undefined, AT, '2026-10-25'));
  assert.ok(read.ok && read.state.profile.name === 'Fabian' && Array.isArray(read.state.achievementClaims));
});

test('a file changed by hand is refused', () => {
  const file = JSON.parse(makeBackup(state, undefined, AT, '2026-10-25'));
  file.state.completions[0].xp = 99999;
  const read = readBackup(JSON.stringify(file));
  assert.equal(read.ok, false);
  assert.match(!read.ok ? read.error : '', /changed after it was saved/);
});

test('other files are refused with a plain reason', () => {
  for (const text of ['', 'hello', '[]', 'null', '{"app":"Other","kind":"backup","version":1}', '{"app":"Succedo","kind":"backup","version":1,"state":{"tasks":"x"}}']) {
    const read = readBackup(text);
    assert.equal(read.ok, false, text);
    assert.match(!read.ok ? read.error : '', /isn't a Succedo backup/);
  }
  const newer = JSON.parse(makeBackup(state, undefined, AT, '2026-10-25'));
  newer.version = 99;
  const read = readBackup(JSON.stringify(newer));
  assert.match(!read.ok ? read.error : '', /newer version/);
});

test('a photo that is not an image is dropped', () => {
  const file = JSON.parse(makeBackup(state, 'javascript:alert(1)', AT, '2026-10-25'));
  const read = readBackup(JSON.stringify(file));
  assert.ok(read.ok && read.photo === undefined);
});

test('checksum and summary', () => {
  assert.equal(checksum(''), '811c9dc5');
  assert.notEqual(checksum('a'), checksum('b'));
  assert.deepEqual(backupSummary(state), { level: 1, tasksDone: 1, tasks: 1 });
});
