import assert from 'node:assert/strict';
import { test } from 'node:test';
import { skyline, SKYLINE_HEIGHT, WINDOW_H, WINDOW_W } from './skyline.ts';

test('every lit window sits inside its own tower, on every screen width', () => {
  for (const width of [320, 360, 390, 430, 768, 1280]) {
    const { towers, windows } = skyline(width);
    assert.ok(towers.length >= 10, `${width}: ${towers.length} towers`);
    assert.ok(windows.length > 10, `${width}: ${windows.length} windows`);
    for (const t of towers) {
      assert.ok(t.height >= 62 && t.height <= 132);
      assert.ok(t.x + t.width <= width);
    }
    for (const win of windows) {
      const inside = towers.some(
        (t) => win.x >= t.x + 4 && win.x + WINDOW_W <= t.x + t.width - 4 && win.y >= SKYLINE_HEIGHT - t.height && win.y + WINDOW_H <= SKYLINE_HEIGHT,
      );
      assert.ok(inside, `${width}: window at ${win.x},${win.y} outside every tower`);
    }
  }
});
