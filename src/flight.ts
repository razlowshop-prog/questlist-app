// Bizzy's flights in the big moments (morning hello, all done, jackpot,
// profile): paths are chains of cubic Bézier curves, each [start, c1, c2, end]
// in screen points. Worklets, so the animation thread can follow them.

export type Pt = [number, number];
export type Curve = [Pt, Pt, Pt, Pt];

/** A point on one cubic curve at t in [0, 1]. */
export function cubicAt(c: Curve, t: number): Pt {
  'worklet';
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]];
}

/** A point on a chain of curves at p in [0, 1]; each curve takes an equal share. */
export function chainAt(chain: Curve[], p: number): Pt {
  'worklet';
  if (chain.length === 0) return [0, 0];
  const q = Math.min(1, Math.max(0, p)) * chain.length;
  const i = Math.min(chain.length - 1, Math.floor(q));
  return cubicAt(chain[i], q - i);
}

/** A gentle hop from `from` to `to`: up and over, the way he flies between spots. */
export function hop(from: Pt, to: Pt, lift = 60): Curve[] {
  const top = Math.min(from[1], to[1]) - lift;
  const dx = to[0] - from[0];
  return [[from, [from[0] + dx * 0.15, top], [to[0] - dx * 0.15, top], to]];
}

/** Which of `n` takes plays on a day ("2026-10-31"): they simply take turns, day by day. */
export function dayTurn(day: string, n: number): number {
  const days = Math.round(Date.parse(`${day}T12:00:00Z`) / 86_400_000);
  return ((days % n) + n) % n;
}
