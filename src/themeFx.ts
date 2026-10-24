// What makes each theme move (design spec "themes-frames-event-spec.md"):
// its XP bar, the mascot riding on the bar, the background layer, and how a
// ticked task leaves the list. Themes without an entry keep the brand bar
// and a plain fade.

export type MascotKind = 'rocket';
export type FinishKind = 'rocket' | 'fade';
export type AmbientKind = 'stars';

export interface ThemeBarSpec {
  height: number;
  track: string;
  /** CSS background for the fill; `fillColor` shows where gradients aren't drawn. */
  fill: string;
  fillColor: string;
  /** The tip glow while XP is added. */
  glow: string;
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
    bar: { height: 10, track: '#d8e3d2', fill: linear(90, '#6aa060', '#3f6b4a'), fillColor: '#548655', glow: '#9cd08f' },
    finish: 'fade',
    finishMs: 600,
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

/** Mascot drawings, unscaled: width and height in px. */
export const MASCOT_SIZE: Record<MascotKind, { width: number; height: number }> = {
  rocket: { width: 58, height: 30 },
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
