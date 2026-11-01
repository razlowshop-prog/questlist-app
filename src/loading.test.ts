import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECK_LINE, CHECK_WAIT_MS, FIRST_LINE, GOT_LINE, LOADING_MIN_MS, loadingView, READY_LINE, RESTART_LINE, SILLY_LINES, sillyOrder } from './loading.ts';

test('loading: Bizzy wakes up first, then every silly line once, in an order that changes', () => {
  const a = sillyOrder(0.12);
  const b = sillyOrder(0.77);
  assert.equal(a[0], FIRST_LINE);
  assert.equal(a.length, SILLY_LINES.length + 1);
  assert.deepEqual([...a.slice(1)].sort(), [...SILLY_LINES].sort());
  assert.notDeepEqual(a, b);
  assert.deepEqual(sillyOrder(0.12), a);
});

test('loading: runs at least the shortest time, then is done', () => {
  const lines = sillyOrder(0.5);
  const start = loadingView(0, 'none', lines);
  assert.equal(start.line, FIRST_LINE);
  assert.equal(start.done, false);
  const mid = loadingView(1200, 'none', lines);
  assert.ok(mid.progress > start.progress && mid.progress < 1);
  assert.equal(mid.line, lines[1]);
  const end = loadingView(LOADING_MIN_MS, 'none', lines);
  assert.deepEqual(end, { progress: 1, line: READY_LINE, done: true });
});

test('loading: waits for the update check, but not forever', () => {
  const lines = sillyOrder(0.5);
  const waiting = loadingView(LOADING_MIN_MS + 500, 'checking', lines);
  assert.equal(waiting.done, false);
  assert.equal(waiting.progress, 0.9);
  assert.equal(waiting.line, CHECK_LINE);
  assert.equal(loadingView(CHECK_WAIT_MS, 'checking', lines).done, true);
});

test('loading: an update shows its download and then the restart', () => {
  const lines = sillyOrder(0.5);
  const dl = loadingView(3000, 'downloading', lines, 0.5);
  assert.equal(dl.line, GOT_LINE);
  assert.equal(dl.done, false);
  assert.ok(Math.abs(dl.progress - 0.625) < 1e-9);
  assert.equal(loadingView(9000, 'downloading', lines).progress, 0.3);
  assert.deepEqual(loadingView(100, 'ready', lines), { progress: 1, line: RESTART_LINE, done: false });
});
