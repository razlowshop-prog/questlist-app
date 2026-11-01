// The "×3 combo" pop-up wears its theme (design "ComboPills", 2026-10-26).
// The only part of the rewards layer that follows the theme; themes without
// an entry use Indigo's.

import { N } from './i18n.ts';

export type ComboEntrance = 'pop' | 'grow' | 'bob' | 'rise' | 'zap' | 'flick' | 'slam';
export type ComboIcon = 'star' | 'leaf' | 'bubbles' | 'sun' | 'bolt' | 'peak' | 'embers' | 'moon' | 'coin';

export interface ComboLook {
  /** Corner radius; 999 for a pill. */
  radius: number;
  /** Fill; undefined = no pill at all (Notepad). */
  fill?: string;
  /** A CSS gradient behind the fill, if any. */
  fillImage?: string;
  border?: { width: number; color: string };
  /** A gradient border instead of a plain one. */
  borderGradient?: [string, string];
  shadow?: string;
  /** Which theme font the text uses: the heading face, its italic, or the app's heavy body face. */
  font: 'serif' | 'serifItalic' | 'heavy';
  size: number;
  upper?: boolean;
  letterSpacing?: number;
  color: string;
  /** Text in a gradient (shown as the second colour on phones). */
  gradient?: [string, string];
  textGlow?: string;
  /** Drawn before the text; `bubbles` and `moon` also add one after it. */
  icon?: ComboIcon;
  iconColor?: string;
  entrance: ComboEntrance;
  /** Leans the whole badge (Gym), in degrees. */
  skew?: number;
  /** Tilts the text (Notepad), in degrees. */
  rotate?: number;
  /** A light sweeps across once it has landed (Gold Noir). */
  sheen?: boolean;
  /** A hand-drawn ellipse round the text (Notepad). */
  circle?: string;
  /** Text after the count: " combo" unless given. */
  suffix?: string;
}

export const DEFAULT_COMBO: ComboLook = {
  radius: 999,
  fill: 'rgba(27,32,48,0.92)',
  borderGradient: ['#7FD6FF', '#6A5BFF'],
  shadow: '0px 0px 14px rgba(106,91,255,0.45)',
  font: 'heavy',
  size: 15,
  color: '#8F7BFF',
  gradient: ['#C6F4FF', '#8F7BFF'],
  textGlow: 'rgba(143,123,255,0.6)',
  icon: 'star',
  iconColor: '#C6F4FF',
  entrance: 'pop',
};

export const COMBO_LOOKS: Record<string, ComboLook> = {
  classic: DEFAULT_COMBO,
  honey: { radius: 999, fill: '#201a12', border: { width: 1, color: '#f2b544' }, shadow: '0px 0px 12px rgba(242,181,68,0.35)', font: 'heavy', size: 15, color: '#f2b544', gradient: ['#ffe7a3', '#f2a93b'], icon: 'star', iconColor: '#ffe08a', entrance: 'pop' },
  hive: { radius: 4, fill: '#ffc93c', font: 'heavy', size: 15, color: '#141414', upper: true, letterSpacing: 1, entrance: 'pop' },
  dusk: { radius: 999, fill: '#28221e', border: { width: 1, color: '#d4b27a' }, font: 'serifItalic', size: 16, color: '#d4b27a', entrance: 'pop' },
  forest: {
    radius: 14,
    fill: '#ffffff',
    border: { width: 1.5, color: '#3f6b4a' },
    shadow: '0px 4px 12px rgba(63,107,74,0.18)',
    font: 'serifItalic',
    size: 18,
    color: '#3f6b4a',
    icon: 'leaf',
    iconColor: '#3f6b4a',
    entrance: 'grow',
  },
  ocean: {
    radius: 999,
    fill: 'rgba(15,61,90,0.92)',
    border: { width: 1, color: '#7fe3f0' },
    shadow: '0px 0px 12px rgba(127,227,240,0.3)',
    font: 'serif',
    size: 16,
    color: '#7fe3f0',
    icon: 'bubbles',
    iconColor: '#7fe3f0',
    entrance: 'bob',
  },
  sunset: {
    radius: 999,
    fill: '#ffeadb',
    fillImage: 'linear-gradient(180deg, #ffd9b8, #fffaf6)',
    border: { width: 1, color: '#b44e33' },
    font: 'serifItalic',
    size: 16,
    color: '#b44e33',
    icon: 'sun',
    iconColor: '#e8774f',
    entrance: 'rise',
  },
  thunder: {
    radius: 2,
    fill: '#1f2028',
    border: { width: 1.5, color: '#e6d36a' },
    shadow: '0px 0px 12px rgba(230,211,106,0.35)',
    font: 'serif',
    size: 14,
    upper: true,
    letterSpacing: 0.8,
    color: '#e6d36a',
    icon: 'bolt',
    iconColor: '#fff6b0',
    entrance: 'zap',
  },
  summit: {
    radius: 4,
    fill: '#334250',
    shadow: '0px 3px 8px rgba(51,66,80,0.25)',
    font: 'serif',
    size: 13,
    upper: true,
    letterSpacing: 1.3,
    color: '#ffffff',
    icon: 'peak',
    iconColor: '#c4ced8',
    entrance: 'rise',
  },
  ember: {
    radius: 999,
    fill: '#2b1f1b',
    border: { width: 1, color: 'rgba(234,141,102,0.6)' },
    shadow: '0px 0px 12px rgba(255,74,28,0.3)',
    font: 'serif',
    size: 16,
    color: '#ea8d66',
    gradient: ['#FFE29A', '#ea8d66'],
    textGlow: 'rgba(255,74,28,0.5)',
    icon: 'embers',
    iconColor: '#FFB36B',
    entrance: 'pop',
  },
  gold: {
    radius: 2,
    fill: '#0b0a08',
    borderGradient: ['#fff3c4', '#a8771f'],
    font: 'serif',
    size: 15,
    upper: true,
    letterSpacing: 2.1,
    color: '#c9a046',
    gradient: ['#fff3c4', '#c9a046'],
    entrance: 'pop',
    sheen: true,
  },
  midnight: {
    radius: 999,
    fill: '#1b1e29',
    border: { width: 1, color: 'rgba(163,179,234,0.55)' },
    font: 'serifItalic',
    size: 18,
    color: '#eef1fa',
    icon: 'moon',
    iconColor: '#a3b3ea',
    entrance: 'pop',
  },
  neon: {
    radius: 4,
    fill: '#0a0614',
    border: { width: 1.5, color: '#22e8ff' },
    shadow: '0px 0px 8px #22e8ff, inset 0px 0px 6px rgba(34,232,255,0.5), 0px 0px 18px rgba(255,43,214,0.35)',
    font: 'serif',
    size: 13,
    upper: true,
    color: '#ff9cf0',
    textGlow: '#ff2bd6',
    entrance: 'flick',
  },
  notepad: { radius: 0, font: 'serifItalic', size: 24, color: '#c0392b', rotate: -4, circle: '#c0392b', entrance: 'grow', suffix: N(' combo!') },
  club: {
    radius: 3,
    fill: '#c6ff3d',
    shadow: '0px 3px 0px #6f9e12',
    font: 'serif',
    size: 17,
    upper: true,
    letterSpacing: 1,
    color: '#0b0d0c',
    skew: -10,
    entrance: 'slam',
  },
  stadium: {
    radius: 3,
    fill: '#ff3b3b',
    shadow: '0px 3px 0px #a51d24',
    font: 'serif',
    size: 17,
    upper: true,
    letterSpacing: 1,
    color: '#ffffff',
    skew: -10,
    entrance: 'slam',
  },
  fortune: {
    radius: 999,
    fill: '#1f1530',
    border: { width: 1, color: '#f2c55c' },
    shadow: '0px 0px 12px rgba(242,197,92,0.3)',
    font: 'serif',
    size: 14,
    letterSpacing: 1.1,
    color: '#f2c55c',
    icon: 'coin',
    iconColor: '#f2c55c',
    entrance: 'pop',
  },
};

export function comboLook(themeId: string): ComboLook {
  return COMBO_LOOKS[themeId] ?? DEFAULT_COMBO;
}

/** How the badge comes in: scale, rise and opacity at `e` (0 → 1 over the entrance). Worklet, so it runs on the animation thread. */
export function entranceAt(kind: ComboEntrance, e: number): { scale: number; y: number; x: number; opacity: number } {
  'worklet';
  const lerp = (at: number[], v: number[]) => {
    if (e <= at[0]) return v[0];
    for (let i = 1; i < at.length; i++) if (e <= at[i]) return v[i - 1] + ((v[i] - v[i - 1]) * (e - at[i - 1])) / (at[i] - at[i - 1]);
    return v[v.length - 1];
  };
  const step = (at: number[], v: number[]) => {
    let out = v[0];
    for (let i = 0; i < at.length; i++) if (e >= at[i]) out = v[i];
    return out;
  };
  const fadeIn = Math.min(1, e * 3);
  switch (kind) {
    case 'pop':
      return { scale: lerp([0, 0.6, 1], [0.5, 1.08, 1]), y: lerp([0, 0.6], [8, 0]), x: 0, opacity: fadeIn };
    case 'grow':
      return { scale: lerp([0, 0.7, 1], [0.6, 1.04, 1]), y: 0, x: 0, opacity: fadeIn };
    case 'bob':
      return { scale: 1, y: lerp([0, 0.4, 0.6, 0.8, 1], [12, -3, 2, -1, 0]), x: 0, opacity: fadeIn };
    case 'rise':
      return { scale: 1, y: lerp([0, 0.7, 1], [14, -1, 0]), x: 0, opacity: fadeIn };
    case 'zap':
      return { scale: 1, y: 0, x: step([0, 0.2, 0.4, 0.6, 0.8], [0, -3, 3, -2, 0]), opacity: step([0, 0.1, 0.45, 0.55], [0, 1, 0.3, 1]) };
    case 'flick':
      return { scale: 1, y: 0, x: 0, opacity: step([0, 0.15, 0.25, 0.4, 0.5, 0.65], [0, 1, 0.1, 1, 0.4, 1]) };
    case 'slam':
      return { scale: lerp([0, 0.55, 1], [1.6, 0.94, 1]), y: 0, x: 0, opacity: Math.min(1, e * 5) };
  }
}
