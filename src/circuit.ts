// The Neon theme's background (design "Circuit traces"): six faint circuit
// lines hugging the edges of the screen, each ending in a solder pad, with a
// short light running along one of them now and then. Drawn for a 390×640
// screen; on other sizes each line keeps its shape and its edge, and only
// slides up or down with the screen's height.

export const CIRCUIT_REF = { w: 390, h: 640 };
export const PULSE_LOOP = 12000;
/** Traces start this far apart in the loop, so one light runs every 2 s. */
export const PULSE_STAGGER = 2000;
/** The light's length as a share of its trace. */
export const PULSE_SHARE = 0.06;

type Point = [number, number];

interface TraceSpec {
  points: Point[];
  color: string;
  /** Which edge it holds on to: left/right, and top/bottom, or slides with the height ('middle'). */
  x: 'left' | 'right';
  y: 'top' | 'bottom' | 'middle';
}

const CYAN = '#22e8ff';
const MAGENTA = '#ff2bd6';

const TRACES: TraceSpec[] = [
  { points: [[0, 120], [60, 120], [80, 140], [150, 140]], color: CYAN, x: 'left', y: 'middle' },
  { points: [[390, 210], [330, 210], [310, 230], [310, 300]], color: MAGENTA, x: 'right', y: 'middle' },
  { points: [[0, 520], [40, 520], [60, 500], [120, 500], [140, 520]], color: CYAN, x: 'left', y: 'middle' },
  { points: [[390, 470], [350, 470], [330, 450], [280, 450]], color: MAGENTA, x: 'right', y: 'middle' },
  { points: [[30, 0], [30, 40], [50, 60], [50, 90]], color: CYAN, x: 'left', y: 'top' },
  { points: [[360, 640], [360, 600], [340, 580], [340, 540]], color: MAGENTA, x: 'right', y: 'bottom' },
];

export interface Trace {
  /** Corner points; the last one is the solder pad. */
  points: Point[];
  /** Length up to each point, from the start. */
  at: number[];
  length: number;
  color: string;
  /** SVG path data. */
  d: string;
}

/** The traces placed on a `w`×`h` screen. */
export function circuit(w: number, h: number): Trace[] {
  return TRACES.map((t) => {
    const sy = t.points[0][1];
    const dx = t.x === 'right' ? w - CIRCUIT_REF.w : 0;
    const dy = t.y === 'top' ? 0 : t.y === 'bottom' ? h - CIRCUIT_REF.h : Math.round((sy * h) / CIRCUIT_REF.h) - sy;
    const points = t.points.map(([x, y]) => [x + dx, y + dy] as Point);
    const at = [0];
    for (let i = 1; i < points.length; i++) at.push(at[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
    return { points, at, length: at[at.length - 1], color: t.color, d };
  });
}

/** Where along a trace a share `f` (0..1) of its length lands, and which way it runs there (degrees). */
export function pointOn(points: Point[], at: number[], f: number): { x: number; y: number; angle: number } {
  'worklet';
  const length = at[at.length - 1];
  const s = Math.max(0, Math.min(1, f)) * length;
  let i = 1;
  while (i < at.length - 1 && at[i] < s) i++;
  const [x0, y0] = points[i - 1];
  const [x1, y1] = points[i];
  const seg = at[i] - at[i - 1] || 1;
  const k = (s - at[i - 1]) / seg;
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, angle: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI };
}
