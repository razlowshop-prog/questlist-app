import { comboLook, type ComboLook } from './combo.ts';

// What makes each theme move (design spec "themes-frames-event-spec.md"):
// its XP bar, the mascot riding on the bar, the background layer, and how a
// ticked task leaves the list. Themes without an entry keep the brand bar
// and a plain fade.

export type MascotKind = 'bee' | 'rocket' | 'sprout' | 'boat' | 'car' | 'pencil' | 'lifter' | 'sun' | 'bolt' | 'climber' | 'flame' | 'moon' | 'crown' | 'highlighter' | 'plane' | 'sneaker' | 'kettlebell';
export type FinishKind = 'rocket' | 'blow' | 'wash' | 'glitch' | 'cross' | 'throw' | 'sink' | 'zap' | 'up' | 'burn' | 'dust' | 'gild' | 'fade';
export type AmbientKind = 'comb' | 'stars' | 'leaves' | 'sea' | 'circuit' | 'floor' | 'dusk' | 'storm' | 'peaks' | 'embers' | 'night' | 'noir';
/** Drawn on the fill and revealed as it grows. */
export type BarDecor = 'comb' | 'vine' | 'wavetop' | 'arcs' | 'coals' | 'sheen';

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
  /** Cuts the bar into this many honeycomb cells, in `color` (the screen behind the bar) (Hive). */
  cells?: { count: number; color: string };
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
  /** Task cards whose outline catches a light running round it: [outline, light] (Gold). */
  rowSheen?: [string, string];
  /** The "×3 combo" pop-up's look (combo.ts). */
  combo?: ComboLook;
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
  // Bizzy himself rides the Honey bar, over a faint honeycomb.
  honey: {
    bar: { height: 10, track: '#2e261a', fill: linear(90, '#ffe08a', '#f2a93b'), fillColor: '#f5b84a', glow: '#ffd36b', decor: 'comb' },
    mascot: 'bee',
    finish: 'fade',
    finishMs: 600,
    ambient: 'comb',
  },
  hive: {
    bar: { height: 12, track: '#2a2a2d', fill: '#ffc93c', fillColor: '#ffc93c', glow: '#ffe39a', radius: 0, cells: { count: 12, color: '#161616' } },
    finish: 'fade',
    finishMs: 600,
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
    mascotScale: 0.95,
    finish: 'glitch',
    finishMs: 900,
    ambient: 'circuit',
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
    mascot: 'sun',
    mascotScale: 1.2,
    finish: 'sink',
    finishMs: 1000,
    ambient: 'dusk',
  },
  thunder: {
    bar: {
      height: 10,
      track: '#282a34',
      fill: linear(90, '#c9b84a', '#e6d36a', '#fff6b0'),
      fillColor: '#e6d36a',
      glow: '#fff6b0',
      radius: 2,
      fillShadow: '0 0 10px rgba(230,211,106,0.7)',
      decor: 'arcs',
    },
    mascot: 'bolt',
    mascotScale: 1.2,
    finish: 'zap',
    finishMs: 850,
    ambient: 'storm',
  },
  summit: {
    bar: { height: 6, track: '#dcdfe2', fill: linear(90, '#7d93a8', '#334250'), fillColor: '#56697c', glow: '#7d93a8' },
    mascot: 'climber',
    mascotScale: 1.2,
    finish: 'up',
    finishMs: 1000,
    ambient: 'peaks',
  },
  ember: {
    bar: { height: 8, track: '#352722', fill: linear(90, '#7a2a12', '#e0541c', '#ffb347'), fillColor: '#e0541c', glow: '#ffb347', fillShadow: '0 0 10px rgba(234,141,102,0.7)', decor: 'coals' },
    mascot: 'flame',
    mascotScale: 1.2,
    finish: 'burn',
    finishMs: 1150,
    ambient: 'embers',
  },
  gold: {
    bar: {
      height: 6,
      radius: 1,
      track: '#1c170f',
      fill: linear(90, '#9a6b1c', '#e8c66c', '#fff3c4', '#e8c66c'),
      fillColor: '#e8c66c',
      glow: '#fff3c4',
      fillShadow: '0 0 10px rgba(232,198,108,0.45)',
      decor: 'sheen',
    },
    mascot: 'crown',
    mascotScale: 1.2,
    finish: 'gild',
    finishMs: 1100,
    ambient: 'noir',
    rowSheen: ['#3a2f1c', '#f7dc8a'],
  },
  midnight: {
    bar: { height: 6, track: '#242838', fill: linear(90, '#59607a', '#a3b3ea', '#ffffff'), fillColor: '#a3b3ea', glow: '#ffffff' },
    mascot: 'moon',
    mascotScale: 1.2,
    finish: 'dust',
    finishMs: 1100,
    ambient: 'night',
  },
};

// The Notepad and Gym redesign ideas (preview builds only, theme.tsx PREVIEW_THEMES).
Object.assign(THEME_FX, {
  'notepad-a': {
    bar: { height: 12, track: 'transparent', fill: 'repeating-linear-gradient(-55deg, #2b59c3 0 2px, transparent 2px 5px)', fillColor: '#5b7fd0', glow: '#2b59c3', radius: 3, dashedBase: '#aab6cc', fillOpacity: 0.9 },
    mascot: 'pencil',
    mascotScale: 1.1,
    finish: 'cross',
    finishMs: 1000,
  },
  'notepad-b': {
    bar: { height: 14, track: 'transparent', fill: 'linear-gradient(180deg, rgba(255,216,77,0.45) 0%, #ffd84d 25%, #ffd84d 75%, rgba(255,216,77,0.45) 100%)', fillColor: '#ffd84d', glow: '#ffe98a', radius: 2, dashedBase: '#cfcabd' },
    mascot: 'highlighter',
    mascotScale: 1.1,
    finish: 'cross',
    finishMs: 1000,
  },
  'notepad-c': {
    bar: { height: 14, track: 'rgba(58,47,30,0.15)', fill: 'repeating-linear-gradient(90deg, #f3ead0 0 8px, #e6dab8 8px 9px)', fillColor: '#efe4c4', glow: '#fff6d8', radius: 1, fillShadow: '0 1px 2px rgba(0,0,0,0.25)' },
    mascot: 'plane',
    mascotScale: 1.15,
    finish: 'blow',
    finishMs: 1000,
  },
  'gym-a': {
    bar: { height: 12, track: '#25282e', fill: linear(90, '#ff5a1f', '#ff8a2a'), fillColor: '#FF6A24', glow: '#FFB000', radius: 2, cells: { count: 10, color: '#141518' }, motion: { delay: 500, duration: 650 } },
    mascot: 'lifter',
    mascotScale: 1.4,
    finish: 'throw',
    finishMs: 1000,
    ambient: 'floor',
  },
  'gym-b': {
    bar: { height: 10, track: '#1d241e', fill: linear(90, '#8fdc1a', '#c6ff3d', '#eaffb0'), fillColor: '#c6ff3d', glow: '#eaffb0', fillShadow: '0 0 10px rgba(198,255,61,0.6)' },
    mascot: 'sneaker',
    mascotScale: 1.1,
    finish: 'zap',
    finishMs: 850,
  },
  'gym-c': {
    bar: { height: 10, track: '#16305e', fill: linear(90, '#d81f2a', '#ff3b3b'), fillColor: '#ff3b3b', glow: '#ffb0a8', radius: 1 },
    mascot: 'kettlebell',
    mascotScale: 1.15,
    finish: 'throw',
    finishMs: 1000,
  },
} satisfies Record<string, ThemeFx>);

const withCombo = new Map<string, ThemeFx>();

/** The theme's motion, with its combo pop-up look; the same object each time, so it can sit in a context. */
export function themeFx(themeId: string): ThemeFx {
  let fx = withCombo.get(themeId);
  if (!fx) {
    fx = { ...(THEME_FX[themeId] ?? PLAIN_FX), combo: comboLook(themeId) };
    withCombo.set(themeId, fx);
  }
  return fx;
}

/**
 * Mascot drawings, unscaled: width and height in px, and `sink`, how far the
 * drawing dips into the bar (the pencil's tip has to touch it).
 */
export const MASCOT_SIZE: Record<MascotKind, { width: number; height: number; sink?: number }> = {
  bee: { width: 34, height: 34, sink: 6 },
  rocket: { width: 58, height: 30 },
  sprout: { width: 26, height: 26 },
  boat: { width: 34, height: 30 },
  car: { width: 46, height: 24 },
  pencil: { width: 40, height: 40, sink: 9 },
  lifter: { width: 40, height: 44 },
  sun: { width: 30, height: 30 },
  bolt: { width: 18, height: 26 },
  climber: { width: 22, height: 30 },
  flame: { width: 20, height: 28 },
  moon: { width: 24, height: 24 },
  crown: { width: 30, height: 24 },
  highlighter: { width: 40, height: 40, sink: 9 },
  plane: { width: 40, height: 26 },
  sneaker: { width: 42, height: 26 },
  kettlebell: { width: 30, height: 32 },
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
