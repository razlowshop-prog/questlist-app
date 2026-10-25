import assert from 'node:assert/strict';
import { test } from 'node:test';
import { circuit, CIRCUIT_REF, pointOn } from './circuit.ts';

test('on the design size the traces are exactly the board', () => {
  const t = circuit(CIRCUIT_REF.w, CIRCUIT_REF.h);
  assert.equal(t.length, 6);
  assert.equal(t[0].d, 'M0 120 L60 120 L80 140 L150 140');
  assert.equal(t[5].d, 'M360 640 L360 600 L340 580 L340 540');
  assert.deepEqual(t.map((x) => x.points.at(-1)), [[150, 140], [310, 300], [140, 520], [280, 450], [50, 90], [340, 540]]);
});

test('every trace stays on screen and on its own edge at phone and tablet sizes', () => {
  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1280, 800]]) {
    for (const t of circuit(w, h)) {
      for (const [x, y] of t.points) {
        assert.ok(x >= 0 && x <= w && y >= 0 && y <= h, `${w}x${h}: ${x},${y} on screen`);
      }
      const [sx, sy] = t.points[0];
      assert.ok(sx === 0 || sx === w || sy === 0 || sy === h, `${w}x${h}: starts on an edge`);
    }
  }
});

test('a point along a trace walks its corners in order', () => {
  const [t] = circuit(CIRCUIT_REF.w, CIRCUIT_REF.h);
  assert.deepEqual(pointOn(t.points, t.at, 0), { x: 0, y: 120, angle: 0 });
  const end = pointOn(t.points, t.at, 1);
  assert.equal(end.x, 150);
  assert.equal(end.y, 140);
  const mid = pointOn(t.points, t.at, 70 / t.length); // inside the diagonal
  assert.equal(Math.round(mid.angle), 45);
  assert.ok(mid.x > 60 && mid.x < 80);
  assert.deepEqual(pointOn(t.points, t.at, 2), end, 'past the end stays at the pad');
});
