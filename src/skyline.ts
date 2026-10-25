// The Neon theme's city along the bottom of the screen (design "Skyline"):
// dark towers with a few lit windows. Every window sits on a grid inside its
// own tower, never beside or above it.

export interface Tower {
  x: number;
  width: number;
  height: number;
  /** A thin mast on the tallest towers. */
  antenna: boolean;
}

export interface Window {
  x: number;
  /** From the top of the skyline box. */
  y: number;
  color: string;
  /** Which of the blink groups it belongs to, so they don't all blink together. */
  group: number;
}

export const SKYLINE_HEIGHT = 170;
export const WINDOW_W = 3;
export const WINDOW_H = 4;
export const BLINK_GROUPS = 4;
const SIDE = 4;
const TOP = 8;
const COL = 7;
const ROW = 9;
const LIT = 0.22;
const COLORS = ['#22e8ff', '#ff2bd6', '#ffb347', '#ffe6a8'];

/** A steady pseudo-random number in [0, 1), so the city doesn't change between renders. */
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Towers side by side across `width`, 62–132 px tall (as on a 390 px screen), and their lit windows. */
export function skyline(width: number): { towers: Tower[]; windows: Window[] } {
  const towers: Tower[] = [];
  let x = 0;
  for (let i = 0; x < width; i++) {
    const w = 18 + Math.round(rand(i, 1) * 14);
    const h = 62 + Math.round(rand(i, 2) * 70);
    towers.push({ x, width: Math.min(w, width - x), height: h, antenna: h > 110 });
    x += w + 2 + Math.round(rand(i, 3) * 2);
  }
  const windows: Window[] = [];
  towers.forEach((t, ti) => {
    const top = SKYLINE_HEIGHT - t.height;
    const cols = Math.floor((t.width - 2 * SIDE - WINDOW_W) / COL) + 1;
    const rows = Math.floor((t.height - TOP - 6 - WINDOW_H) / ROW) + 1;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const n = ti * 97 + c * 13 + r;
        if (rand(n, 4) >= LIT) continue;
        windows.push({ x: t.x + SIDE + c * COL, y: top + TOP + r * ROW, color: COLORS[Math.floor(rand(n, 5) * COLORS.length)], group: Math.floor(rand(n, 6) * BLINK_GROUPS) });
      }
    }
  });
  return { towers, windows };
}
