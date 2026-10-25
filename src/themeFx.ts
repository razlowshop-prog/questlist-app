// What makes each theme move (design spec "themes-frames-event-spec.md"):
// its XP bar, the mascot riding on the bar, the background layer, and how a
// ticked task leaves the list. Themes without an entry keep the brand bar
// and a plain fade.

export type MascotKind = 'rocket' | 'sprout' | 'boat' | 'car' | 'pencil' | 'lifter';
export type FinishKind = 'rocket' | 'blow' | 'wash' | 'glitch' | 'cross' | 'throw' | 'fade';
export type AmbientKind = 'stars' | 'leaves' | 'sea' | 'synth' | 'floor';
/** Drawn on the fill and revealed as it grows. */
export type BarDecor = 'vine' | 'wavetop';

export interface ThemeBarSpec {
  height: number;
  track: string;
  /** CSS background for the fill; `fillColor` shows where gradients aren't drawn. */
  fill: string;
  fillColor: string;
  /** The tip glow while XP is added. */
  glow: string;
  decor?: BarDecor;
  /** Corner radius of the track and fill; half the height when left out. */
  radius?: number;
  /** A dashed line under the track instead of a filled one (Notepad). */
  dashedBase?: string;
  fillOpacity?: number;
  /** A glow around the fill (CSS box-shadow). */
  fillShadow?: string;
  /**
   * How the fill moves to a new total, when it isn't the usual quick ease-out:
   * Gym waits while the lifter picks the barbell up, then carries it along.
   */
  motion?: { delay: number; duration: number };
}

export interface ThemeFx {
  bar?: ThemeBarSpec;
  mascot?: MascotKind;
  /** How much bigger than its drawing the mascot shows. */
  mascotScale?: number;
  finish: FinishKind;
  /** How long the task-finish animation runs before the row leaves. */
  finishMs: number;
  ambient?: AmbientKind;
  /** Task cards whose outline pulses between two colours (Neon). */
  rowPulse?: [string, string];
}

const linear = (angle: number, ...colors: string[]) => `linear-gradient(${angle}deg, ${colors.join(', ')})`;

export const PLAIN_FX: ThemeFx = { finish: 'fade', finishMs: 600 };

export const THEME_FX: Record<string, ThemeFx> = {
  classic: {
    bar: { height: 8, track: '#262c40', fill: linear(90, '#7FD6FF', '#6A5BFF'), fillColor: '#7499FF', glow: '#7FD6FF' },
    mascot: 'rocket',
    mascotScale: 1.15,
    finish: 'rocket',
    finishMs: 950,
    ambient: 'stars',
  },
  forest: {
    bar: { height: 10, track: '#d8e3d2', fill: linear(90, '#6aa060', '#3f6b4a'), fillColor: '#548655', glow: '#9cd08f', decor: 'vine' },
    mascot: 'sprout',
    mascotScale: 1.25,
    finish: 'blow',
    finishMs: 1000,
    ambient: 'leaves',
  },
  ocean: {
    bar: { height: 12, track: 'rgba(255,255,255,0.12)', fill: linear(180, '#7fe3f0', '#1aa6c4'), fillColor: '#4cc5dc', glow: '#7fe3f0', decor: 'wavetop' },
    mascot: 'boat',
    mascotScale: 1.45,
    finish: 'wash',
    finishMs: 1100,
    ambient: 'sea',
  },
  neon: {
    bar: { height: 8, track: '#1c1030', fill: linear(90, '#22e8ff', '#ff2bd6'), fillColor: '#8e8af0', glow: '#ff2bd6', fillShadow: '0 0 10px #ff2bd6, 0 0 16px #22e8ff' },
    mascot: 'car',
    mascotScale: 1.35,
    finish: 'glitch',
    finishMs: 900,
    ambient: 'synth',
    rowPulse: ['rgba(34,232,255,0.55)', 'rgba(255,43,214,0.85)'],
  },
  notepad: {
    bar: {
      height: 12,
      track: 'transparent',
      fill: 'repeating-linear-gradient(-55deg, #3a4256 0 2px, transparent 2px 5px)',
      fillColor: '#8a92a6',
      glow: '#c0392b',
      radius: 3,
      dashedBase: '#b9c2d3',
      fillOpacity: 0.85,
    },
    mascot: 'pencil',
    mascotScale: 1.1,
    finish: 'cross',
    finishMs: 1000,
  },
  gym: {
    bar: {
      height: 12,
      track: '#2a2d33',
      fill: 'repeating-linear-gradient(-45deg, #FF5A1F 0 10px, #FF8A2A 10px 20px)',
      fillColor: '#FF6A24',
      glow: '#FFB000',
      radius: 3,
      motion: { delay: 500, duration: 650 },
    },
    mascot: 'lifter',
    mascotScale: 1.4,
    finish: 'throw',
    finishMs: 1000,
    ambient: 'floor',
  },
  sunset: {
    bar: { height: 10, track: '#f1e2d6', fill: linear(90, '#ffb36b', '#e0603c', '#b44e33'), fillColor: '#e0603c', glow: '#ffb36b' },
    finish: 'fade',
    finishMs: 600,
  },
  thunder: {
    bar: { height: 10, track: '#282a34', fill: linear(90, '#c9b84a', '#e6d36a', '#fff6b0'), fillColor: '#e6d36a', glow: '#fff6b0' },
    finish: 'fade',
    finishMs: 600,
  },
  summit: {
    bar: { height: 6, track: '#dcdfe2', fill: linear(90, '#7d93a8', '#334250'), fillColor: '#56697c', glow: '#7d93a8' },
    finish: 'fade',
    finishMs: 600,
  },
  ember: {
    bar: { height: 8, track: '#352722', fill: linear(90, '#7a2a12', '#e0541c', '#ffb347'), fillColor: '#e0541c', glow: '#ffb347' },
    finish: 'fade',
    finishMs: 600,
  },
  midnight: {
    bar: { height: 6, track: '#242838', fill: linear(90, '#59607a', '#a3b3ea', '#ffffff'), fillColor: '#a3b3ea', glow: '#ffffff' },
    finish: 'fade',
    finishMs: 600,
  },
};

export function themeFx(themeId: string): ThemeFx {
  return THEME_FX[themeId] ?? PLAIN_FX;
}

/**
 * Mascot drawings, unscaled: width and height in px, and `sink`, how far the
 * drawing dips into the bar (the pencil's tip has to touch it).
 */
export const MASCOT_SIZE: Record<MascotKind, { width: number; height: number; sink?: number }> = {
  rocket: { width: 58, height: 30 },
  sprout: { width: 26, height: 26 },
  boat: { width: 34, height: 30 },
  car: { width: 46, height: 24 },
  pencil: { width: 40, height: 40, sink: 9 },
  lifter: { width: 40, height: 44 },
};

/**
 * Left edge of the mascot over a bar `barWidth` wide at `fraction` full:
 * centred on the fill's tip, but never past either end of the bar.
 */
export function mascotLeft(fraction: number, barWidth: number, mascotWidth: number): number {
  'worklet';
  const f = Math.max(0, Math.min(1, fraction));
  return Math.max(0, Math.min(barWidth - mascotWidth, f * barWidth - mascotWidth / 2));
}
