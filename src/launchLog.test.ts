import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLaunchCheck, type NoteBox } from './launchLog.ts';

function memoryBox(start?: string): NoteBox & { text?: string; writes: number } {
  const box = {
    text: start,
    writes: 0,
    read: () => box.text,
    write: (t: string) => {
      box.text = t;
      box.writes++;
    },
  };
  return box;
}

test('first start ever: no report', () => {
  assert.equal(makeLaunchCheck(memoryBox()).lastCrash, undefined);
});

test('a start that ran fine: no report next time', () => {
  const box = memoryBox();
  const a = makeLaunchCheck(box);
  a.step('started');
  a.step('save read');
  a.step('drawn');
  a.ok();
  assert.equal(makeLaunchCheck(box).lastCrash, undefined);
});

test('a start that closed early is reported with the steps it reached, in order', () => {
  const box = memoryBox();
  const a = makeLaunchCheck(box);
  a.step('started');
  a.step('save read');
  a.step('look ready');
  assert.deepEqual(makeLaunchCheck(box).lastCrash, ['started', 'save read', 'look ready']);
});

test('each step is written at once, and only once', () => {
  const box = memoryBox();
  const a = makeLaunchCheck(box);
  a.step('started');
  assert.equal(box.writes, 1);
  a.step('started');
  assert.equal(box.writes, 1);
  a.ok();
  a.ok();
  assert.equal(box.writes, 2);
  // After running fine, later steps don't turn it back into a crash.
  a.step('drawn');
  assert.equal(makeLaunchCheck(box).lastCrash, undefined);
});

test('reading the report does not clear it until the new start writes', () => {
  const box = memoryBox(JSON.stringify({ steps: ['started'], ok: false }));
  const b = makeLaunchCheck(box);
  assert.deepEqual(b.lastCrash, ['started']);
  // Still there if this start dies before writing anything.
  assert.deepEqual(makeLaunchCheck(box).lastCrash, ['started']);
  b.step('started');
  b.ok();
  assert.equal(makeLaunchCheck(box).lastCrash, undefined);
});

test('restart begins a fresh note', () => {
  const box = memoryBox();
  const a = makeLaunchCheck(box);
  a.step('started');
  a.ok();
  a.restart();
  a.step('started');
  assert.deepEqual(makeLaunchCheck(box).lastCrash, ['started']);
});

test('a broken or odd note never stops the app', () => {
  for (const text of ['', '{', 'null', '"x"', '{"steps":"no"}', JSON.stringify({ steps: ['started', 'made up', 42], ok: false })]) {
    const check = makeLaunchCheck(memoryBox(text));
    assert.ok(check.lastCrash === undefined || Array.isArray(check.lastCrash), text);
  }
  assert.deepEqual(makeLaunchCheck(memoryBox(JSON.stringify({ steps: ['started', 'made up', 42], ok: false }))).lastCrash, ['started']);
});

test('a box that throws never stops the app', () => {
  const check = makeLaunchCheck({
    read: () => {
      throw new Error('no disk');
    },
    write: () => {
      throw new Error('no disk');
    },
  });
  assert.equal(check.lastCrash, undefined);
  check.step('started');
  check.ok();
  check.restart();
});
