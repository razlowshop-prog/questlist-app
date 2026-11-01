import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { N } from './i18n';

type NamedStyles = { [key: string]: ViewStyle | TextStyle | ImageStyle };

export interface Palette {
  dark: boolean;
  bg: string;
  /** A gradient over the whole screen behind everything (fixed, it doesn't scroll); bg is its solid fallback. */
  bgImage?: string;
  /** Background of the bottom tab bar. */
  tabBar: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  /** Third text level: meta lines. */
  faint: string;
  /** Border of an empty checkbox. */
  outline: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  xp: string;
  xpSoft: string;
  gold: string;
  goldSoft: string;
  onGold: string;
  flame: string;
  /** Card shadow; empty = cards get a hairline border instead. */
  shadow: string;

  // Shape and type: themes are small designs, not just colours.
  /** Corner radius of cards, inputs and buttons. */
  radius: number;
  /** 'lines' = tasks as rows split by hairlines, 'cards' = each task in its own card. */
  listStyle: 'lines' | 'cards';
  /** Shape of the task checkbox; 'coin' = a gold coin that flips when ticked (Fortuna), 'hex' = a honeycomb cell (Hive). */
  check: 'circle' | 'square' | 'diamond' | 'coin' | 'hex';
  /** Thickness of progress lines (XP bar, challenges, achievements). */
  lineWeight: number;
  /** Diamond tip at the end of the XP line. */
  tip: boolean;
  /** Small labels in spaced capitals (true) or normal case. */
  eyebrowCaps: boolean;
  /** Brass rule with diamond ends beside the wordmark. */
  logoRule: boolean;
  /** Small drawing before the wordmark when the rule is off. */
  ornament: Ornament;
  /** How the XP bar is drawn. */
  bar: BarStyle;
  /** The italic, accent-coloured word in headings ("Good *evening*"). */
  italicAccent: boolean;
  /** Headings in capitals. */
  headingUpper: boolean;
  /** Colour of small labels: accent on dark themes, muted on light ones (accent is too faint at small sizes there). */
  label: string;
  /** Font files for this theme; keys of FONT_FILES registered in App.tsx. */
  fonts: ThemeFonts;
  /** Fortuna extras: drifting rainbow borders on task cards, and rising gold dust behind everything. */
  holo: boolean;
  backdrop: 'none' | 'dust';
  /**
   * The theme's own accent instead of the blue-violet brand (Gold): fill for
   * buttons and selected things (CSS gradient + solid colour), text on it,
   * outline colour and the gradient for highlighted numbers and words.
   */
  brand?: { fill: string; color: string; ink: string; line: string; text: { c1: string; c2: string } };
}

export type Ornament = 'none' | 'leaf' | 'wave' | 'sun' | 'bolt' | 'peak' | 'dots' | 'double' | 'moon' | 'star4';

export type BarStyle =
  | { kind: 'line' }
  | { kind: 'segments'; count: number; radius: number; gap: number }
  | { kind: 'dots'; count: number; size: number; glow: boolean }
  /** A gold gradient bar with a light sweeping across and a twinkling star at the tip (Fortuna). */
  | { kind: 'shimmer' };

export interface ThemeFonts {
  serif: string;
  serifItalic: string;
  body: string;
  bodyMedium: string;
  bodySemiBold: string;
  bodyBold: string;
  bodyExtraBold: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  /** The achievement reward that unlocks it; undefined = always available. */
  reward?: string;
  palette: Palette;
}

/** Mixes two #rrggbb colours; t = share of b. */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Default fonts: Playfair Display headings, Assistant body (as in the Razlow shop). */
export const FONTS: ThemeFonts = {
  serif: 'PlayfairDisplay_400Regular',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',
  body: 'Assistant_400Regular',
  bodyMedium: 'Assistant_500Medium',
  bodySemiBold: 'Assistant_600SemiBold',
  bodyBold: 'Assistant_700Bold',
  bodyExtraBold: 'Assistant_800ExtraBold',
};

/** Theme fonts with another heading face and the default Assistant body. */
const heading = (serif: string, serifItalic: string): ThemeFonts => ({ ...FONTS, serif, serifItalic });

interface ThemeSpec {
  light?: boolean;
  bgImage?: string;
  tabBar?: string;
  /** bg / card / card2 / line / text / muted / faint / outline / accent / onAccent */
  colors: [string, string, string, string, string, string, string, string, string, string];
  fonts?: ThemeFonts;
  radius: number;
  listStyle: Palette['listStyle'];
  check: Palette['check'];
  lineWeight: number;
  tip: boolean;
  eyebrowCaps: boolean;
  logoRule: boolean;
  ornament?: Ornament;
  bar?: BarStyle;
  italicAccent: boolean;
  headingUpper: boolean;
  holo?: boolean;
  backdrop?: Palette['backdrop'];
  brand?: Palette['brand'];
}

/** Builds a palette from a design-thread spec line. */
function palette(spec: ThemeSpec): Palette {
  const [bg, surface, surfaceAlt, border, text, muted, faint, outline, accent, onAccent] = spec.colors.map((c) => `#${c.toUpperCase()}`);
  const light = spec.light ?? false;
  const soft = mix(surface, accent, light ? 0.12 : 0.16);
  return {
    dark: !light,
    bg,
    bgImage: spec.bgImage,
    tabBar: spec.tabBar ?? bg,
    surface,
    surfaceAlt,
    text,
    muted,
    faint,
    outline,
    border,
    accent,
    accentSoft: soft,
    onAccent,
    xp: accent,
    xpSoft: soft,
    // Rewards use the theme's accent too, so each theme stays one colour.
    gold: accent,
    goldSoft: soft,
    onGold: onAccent,
    flame: light ? '#B4532A' : '#E8A87C',
    shadow: light ? '0px 1px 2px rgba(0,0,0,0.04)' : '',
    label: light ? muted : accent,
    radius: spec.radius,
    listStyle: spec.listStyle,
    check: spec.check,
    lineWeight: spec.lineWeight,
    tip: spec.tip,
    eyebrowCaps: spec.eyebrowCaps,
    logoRule: spec.logoRule,
    ornament: spec.ornament ?? 'none',
    bar: spec.bar ?? { kind: 'line' },
    italicAccent: spec.italicAccent,
    headingUpper: spec.headingUpper,
    fonts: spec.fonts ?? FONTS,
    holo: spec.holo ?? false,
    backdrop: spec.backdrop ?? 'none',
    brand: spec.brand,
  };
}

const CORMORANT = heading('CormorantGaramond_500Medium', 'CormorantGaramond_500Medium_Italic');

/**
 * Small designs from the design thread (board "Succedo · 9 reward themes").
 * Indigo is the default (home variant F "Kühl"): it took over the 'classic'
 * id so everyone on the default moves to it; Dusk, the first default from the
 * Razlow shop, is still free to pick. Other ids and reward labels are stored
 * in settings and achievements: don't change them.
 */
export const THEMES: ThemeDef[] = [
  {
    id: 'classic',
    name: N('Indigo'),
    palette: palette({
      colors: ['12151f', '1b2030', '262c40', '2f3650', 'eef1fa', 'b6bdd2', '8f97ae', '59607a', 'a3b3ea', '12151f'],
      bgImage: 'linear-gradient(165deg, #13213a 0%, #12151f 48%, #1f1636 100%)',
      tabBar: 'rgba(28,20,50,0.85)',
      radius: 4, listStyle: 'cards', check: 'circle', lineWeight: 2, tip: true,
      eyebrowCaps: true, logoRule: true, italicAccent: true, headingUpper: false,
    }),
  },
  {
    id: 'dusk',
    name: N('Dusk'),
    palette: palette({
      colors: ['1c1815', '28221e', '322a25', '4a423a', 'f4f0e9', 'c4bbaf', 'a0968a', '6e6458', 'd4b27a', '1c1815'],
      radius: 4, listStyle: 'lines', check: 'circle', lineWeight: 2, tip: true,
      eyebrowCaps: true, logoRule: true, italicAccent: true, headingUpper: false,
    }),
  },
  {
    // Bee themes (picked 2026-10-28): warm brown and honey, with a faint honeycomb at the top.
    // Won with the secret achievement (tap Bizzy 150 times); Hive stays free like Indigo and Dusk.
    id: 'honey',
    name: N('Honey'),
    reward: 'Honey theme',
    palette: palette({
      colors: ['15120d', '201a12', '2e261a', '3a3022', 'f7f0e2', 'c9bba2', 'a3957d', '6b5d45', 'f2b544', '1a140b'],
      bgImage: 'linear-gradient(180deg, #221a0f 0%, #15120d 45%)',
      tabBar: 'rgba(21,18,13,0.92)',
      radius: 8, listStyle: 'cards', check: 'circle', lineWeight: 2, tip: true,
      eyebrowCaps: true, logoRule: true, italicAccent: true, headingUpper: false,
      brand: { fill: 'linear-gradient(135deg, #ffe08a, #f2b544 50%, #d98a1f)', color: '#f2b544', ink: '#1a140b', line: '#f2b544', text: { c1: '#ffe7a3', c2: '#f2a93b' } },
    }),
  },
  {
    // Clean graphite and bee yellow: honeycomb checkboxes and a honeycomb XP bar, nothing else.
    id: 'hive',
    name: N('Hive'),
    palette: palette({
      colors: ['121212', '1c1c1e', '2a2a2d', '2c2c30', 'f4f4f2', 'b5b5ae', '8f8f89', '5c5c58', 'ffc93c', '141414'],
      bgImage: 'linear-gradient(180deg, #171717 0%, #101010 100%)',
      tabBar: 'rgba(21,21,21,0.94)',
      radius: 12, listStyle: 'cards', check: 'hex', lineWeight: 2, tip: false,
      eyebrowCaps: true, logoRule: false, italicAccent: false, headingUpper: false,
      brand: { fill: 'linear-gradient(135deg, #ffd96b, #ffc93c 55%, #f0b21e)', color: '#ffc93c', ink: '#141414', line: '#ffc93c', text: { c1: '#ffe39a', c2: '#ffc93c' } },
    }),
  },
  {
    id: 'forest',
    name: N('Forest'),
    reward: 'Forest theme',
    palette: palette({
      light: true,
      colors: ['ebf2e3', 'ffffff', 'e3e9df', 'd3dbcf', '1d2a20', '4f5e52', '5b6b5e', 'a9b4a6', '3f6b4a', 'ffffff'],
      bgImage: 'linear-gradient(180deg, #f3f7ec 0%, #e3eedb 100%)',
      fonts: CORMORANT,
      radius: 14, listStyle: 'cards', check: 'square', lineWeight: 6, tip: false,
      eyebrowCaps: false, logoRule: false, ornament: 'leaf', italicAccent: true, headingUpper: false,
    }),
  },
  {
    id: 'ocean',
    name: N('Ocean'),
    reward: 'Ocean theme',
    // Dark since the animated themes (spec "themes-frames-event"): deep sea, boat on the bar.
    palette: palette({
      colors: ['08324a', '0b3149', '0f3d5a', '1f5468', 'eaf7fb', 'bfe1ea', '9cc3d1', '5f8fa0', '7fe3f0', '04192a'],
      bgImage: 'linear-gradient(180deg, #0d4a66 0%, #08324a 45%, #04192a 100%)',
      tabBar: 'rgba(4,25,42,0.9)',
      fonts: heading('DMSerifDisplay_400Regular', 'DMSerifDisplay_400Regular_Italic'),
      radius: 18, listStyle: 'cards', check: 'circle', lineWeight: 3, tip: false,
      eyebrowCaps: false, logoRule: false, ornament: 'wave', italicAccent: true, headingUpper: false,
    }),
  },
  {
    id: 'sunset',
    name: N('Sunset'),
    reward: 'Sunset theme',
    palette: palette({
      light: true,
      colors: ['f8eee6', 'fffaf6', 'f1e2d6', 'ecd8ca', '2b1a14', '634a3f', '7e6458', 'c4ab9c', 'b44e33', 'ffffff'],
      bgImage: 'linear-gradient(180deg, #ffd9b8 0%, #f8eee6 40%, #f8eee6 100%)',
      fonts: heading('Fraunces_400Regular', 'Fraunces_400Regular_Italic'),
      radius: 18, listStyle: 'cards', check: 'circle', lineWeight: 6, tip: false,
      eyebrowCaps: false, logoRule: false, ornament: 'sun', italicAccent: true, headingUpper: false,
      bar: { kind: 'segments', count: 10, radius: 3, gap: 4 },
    }),
  },
  {
    id: 'thunder',
    name: N('Thunder'),
    reward: 'Thunder theme',
    palette: palette({
      colors: ['15161c', '1f2028', '282a34', '3a3c48', 'f1f1f5', 'b9bac6', '9496a4', '5d6070', 'e6d36a', '15161c'],
      bgImage: 'radial-gradient(100% 50% at 50% 0%, #262836 0%, #15161c 70%)',
      fonts: {
        serif: 'SpaceGrotesk_700Bold',
        serifItalic: 'SpaceGrotesk_700Bold',
        body: 'SpaceGrotesk_400Regular',
        bodyMedium: 'SpaceGrotesk_500Medium',
        bodySemiBold: 'SpaceGrotesk_600SemiBold',
        bodyBold: 'SpaceGrotesk_700Bold',
        bodyExtraBold: 'SpaceGrotesk_700Bold',
      },
      radius: 2, listStyle: 'cards', check: 'square', lineWeight: 8, tip: false,
      eyebrowCaps: true, logoRule: false, ornament: 'bolt', italicAccent: false, headingUpper: false,
      bar: { kind: 'segments', count: 10, radius: 1, gap: 4 },
    }),
  },
  {
    id: 'summit',
    name: N('Summit'),
    reward: 'Summit theme',
    palette: palette({
      light: true,
      colors: ['f3f4f5', 'ffffff', 'e8eaec', 'dcdfe2', '1b1f23', '4e565e', '68717a', 'a9b0b5', '334250', 'ffffff'],
      bgImage: 'linear-gradient(180deg, #dfe7ee 0%, #f3f4f5 50%)',
      fonts: heading('Archivo_800ExtraBold', 'Archivo_800ExtraBold_Italic'),
      radius: 6, listStyle: 'cards', check: 'circle', lineWeight: 2, tip: false,
      eyebrowCaps: true, logoRule: false, ornament: 'peak', italicAccent: false, headingUpper: true,
    }),
  },
  {
    id: 'ember',
    name: N('Ember'),
    reward: 'Ember theme',
    palette: palette({
      colors: ['1e1614', '2b1f1b', '352722', '4f3a33', 'f6eee9', 'cbb9b1', 'a8968e', '75605a', 'ea8d66', '1e1614'],
      bgImage: 'radial-gradient(100% 50% at 50% 100%, #3a1a10 0%, #1e1614 65%)',
      fonts: heading('BodoniModa_400Regular', 'BodoniModa_400Regular_Italic'),
      radius: 8, listStyle: 'cards', check: 'circle', lineWeight: 2, tip: true,
      eyebrowCaps: true, logoRule: false, ornament: 'dots', italicAccent: true, headingUpper: false,
    }),
  },
  {
    id: 'gold',
    name: N('Gold'),
    reward: 'Gold theme',
    // Design "Noir": black and gold, a sheen running round the task cards, gold dust.
    palette: palette({
      colors: ['0b0a08', '14110c', '1c170f', '3a2f1c', 'f6efe0', 'cbbf9f', 'a39878', '5a4a2c', 'e8c66c', '1a1206'],
      bgImage: 'radial-gradient(90% 55% at 50% 0%, #221a0e 0%, #0b0a08 62%)',
      tabBar: 'rgba(11,10,8,0.92)',
      fonts: CORMORANT,
      radius: 2, listStyle: 'cards', check: 'diamond', lineWeight: 2, tip: false,
      eyebrowCaps: true, logoRule: true, ornament: 'double', italicAccent: false, headingUpper: true,
      brand: { fill: 'linear-gradient(135deg, #fff3c4, #e8c66c 45%, #a8771f)', color: '#e8c66c', ink: '#1a1206', line: '#e8c66c', text: { c1: '#fff3c4', c2: '#c9a046' } },
    }),
  },
  {
    id: 'midnight',
    name: N('Midnight'),
    reward: 'Midnight theme',
    palette: palette({
      colors: ['12141c', '1b1e29', '242838', '343a4c', 'eef1fa', 'b6bdd2', '8f97ae', '59607a', 'a3b3ea', '12141c'],
      bgImage: 'radial-gradient(120% 60% at 70% 0%, #1d2340 0%, #12141c 65%)',
      fonts: heading('InstrumentSerif_400Regular', 'InstrumentSerif_400Regular_Italic'),
      radius: 18, listStyle: 'cards', check: 'circle', lineWeight: 4, tip: false,
      eyebrowCaps: false, logoRule: false, ornament: 'moon', italicAccent: true, headingUpper: false,
      bar: { kind: 'dots', count: 10, size: 7, glow: true },
    }),
  },
  {
    id: 'neon',
    name: N('Neon'),
    reward: 'Neon theme',
    palette: palette({
      colors: ['0a0614', '120822', '1c1030', '3a2266', 'f2eaff', 'cdbcee', 'a58fd0', '6b5296', '22e8ff', '0a0614'],
      bgImage: 'radial-gradient(120% 60% at 50% 0%, #2a0b45 0%, #0a0614 60%)',
      tabBar: 'rgba(14,6,28,0.9)',
      fonts: heading('Orbitron_700Bold', 'Orbitron_700Bold'),
      radius: 4, listStyle: 'cards', check: 'square', lineWeight: 2, tip: false,
      eyebrowCaps: true, logoRule: false, ornament: 'bolt', italicAccent: false, headingUpper: false,
    }),
  },
  {
    id: 'notepad',
    name: N('Notepad'),
    reward: 'Notepad theme',
    // Sticky notes on kraft paper (picked 2026-11-01, Notepad C).
    palette: palette({
      light: true,
      colors: ['e8d2aa', 'fff2a6', 'fbe98a', 'e3cf6e', '3a2f1e', '62523a', '7a6a4c', 'b9a46a', 'd9483c', 'ffffff'],
      bgImage: 'repeating-linear-gradient(45deg, #e8d2aa 0px, #e8d2aa 6px, #e1c99e 6px, #e1c99e 7px)',
      tabBar: '#dcc398',
      fonts: heading('Caveat_700Bold', 'Caveat_700Bold'),
      radius: 2, listStyle: 'cards', check: 'square', lineWeight: 2, tip: false,
      eyebrowCaps: false, logoRule: false, ornament: 'none', italicAccent: false, headingUpper: false,
    }),
  },
  {
    id: 'club',
    name: N('Club'),
    reward: 'Club theme',
    // A night gym in lime, with a running shoe on the bar (picked 2026-11-01; was Gym).
    palette: palette({
      colors: ['0b0d0c', '151a16', '1d241e', '2a3329', 'f2f7ee', 'b3bfae', '86917f', '4c5749', 'c6ff3d', '0b0d0c'],
      bgImage: 'radial-gradient(100% 50% at 50% 0%, #1c2a12 0%, #0b0d0c 65%)',
      tabBar: 'rgba(11,13,12,0.94)',
      fonts: heading('Archivo_800ExtraBold_Italic', 'Archivo_800ExtraBold_Italic'),
      radius: 14, listStyle: 'cards', check: 'circle', lineWeight: 3, tip: false,
      eyebrowCaps: true, logoRule: false, ornament: 'none', italicAccent: false, headingUpper: true,
      brand: { fill: 'linear-gradient(135deg, #e6ff9a, #c6ff3d 50%, #8fdc1a)', color: '#c6ff3d', ink: '#0b0d0c', line: '#c6ff3d', text: { c1: '#eaffb0', c2: '#a8f02a' } },
    }),
  },
  {
    id: 'stadium',
    name: N('Stadium'),
    reward: 'Stadium theme',
    // Floodlit navy and red, with a kettlebell on the bar (picked 2026-11-01).
    palette: palette({
      colors: ['0a1630', '102246', '16305e', '24407a', 'f3f6fc', 'b9c5de', '8d9bbb', '4d6496', 'ff3b3b', 'ffffff'],
      bgImage: 'radial-gradient(120% 60% at 50% 0%, #1b2f5a 0%, #0a1630 65%)',
      tabBar: 'rgba(10,22,48,0.94)',
      fonts: heading('Orbitron_700Bold', 'Orbitron_700Bold'),
      radius: 4, listStyle: 'cards', check: 'square', lineWeight: 6, tip: false,
      eyebrowCaps: true, logoRule: false, ornament: 'none', italicAccent: false, headingUpper: true,
      bar: { kind: 'segments', count: 10, radius: 1, gap: 3 },
      brand: { fill: 'linear-gradient(135deg, #ff8a7a, #ff3b3b 55%, #d81f2a)', color: '#ff3b3b', ink: '#ffffff', line: '#ff3b3b', text: { c1: '#ffb0a8', c2: '#ff3b3b' } },
    }),
  },
  {
    // Only won on the lucky wheel (design thread, "Fortuna theme and wheel spec").
    id: 'fortune',
    name: N('Fortuna'),
    reward: 'Fortuna theme',
    palette: palette({
      colors: ['120a1f', '1f1530', '2a1d40', '3d2d5c', 'fbf6ea', 'cfc3e0', 'a596bf', '7a66a2', 'f2c55c', '2a1600'],
      fonts: heading('Cinzel_700Bold', 'Cinzel_700Bold'),
      radius: 14, listStyle: 'cards', check: 'coin', lineWeight: 6, tip: false,
      eyebrowCaps: true, logoRule: true, ornament: 'star4', italicAccent: false, headingUpper: true,
      bar: { kind: 'shimmer' }, holo: true, backdrop: 'dust',
    }),
  },
];


const DEFAULT = THEMES[0].palette;

function bodyFont(f: ThemeFonts, weight: unknown): string {
  const w = Number(weight === 'bold' ? 700 : weight ?? 400);
  if (w >= 800) return f.bodyExtraBold;
  if (w >= 700) return f.bodyBold;
  if (w >= 600) return f.bodySemiBold;
  if (w >= 500) return f.bodyMedium;
  return f.body;
}

/** Which theme font a style asked for: style code names fonts by their FONTS (Dusk) value. */
const FONT_ROLE = Object.fromEntries(Object.entries(FONTS).map(([role, file]) => [file, role])) as Record<string, keyof ThemeFonts>;

/**
 * Gives every text style the theme's fonts. Custom fonts on Android ignore
 * fontWeight, so the weight picks the matching font file instead.
 * Styles name a font by its FONTS value (e.g. FONTS.serif, plus fontStyle
 * italic for the italic cut); it is swapped for the theme's font in that role.
 */
export function withFonts<T extends NamedStyles>(styles: T, fonts: ThemeFonts = FONTS): T {
  const out: NamedStyles = {};
  for (const [key, style] of Object.entries(styles)) {
    const st = style as TextStyle;
    if (st.fontSize === undefined && st.fontWeight === undefined && st.fontFamily === undefined) {
      out[key] = style;
      continue;
    }
    const { fontWeight, ...rest } = st;
    const role = st.fontFamily ? FONT_ROLE[st.fontFamily] : undefined;
    if (role === 'serif' || role === 'serifItalic') {
      const italic = role === 'serifItalic' || st.fontStyle === 'italic';
      out[key] = { ...rest, fontFamily: italic ? fonts.serifItalic : fonts.serif, fontStyle: 'normal' };
    } else if (role) {
      out[key] = { ...rest, fontFamily: fonts[role] };
    } else if (st.fontFamily) {
      out[key] = style;
    } else {
      out[key] = { ...rest, fontFamily: bodyFont(fonts, fontWeight) };
    }
  }
  return out as T;
}

export function themeById(id: string | undefined): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** The native animation driver isn't available on web. */
export const nativeDriver = Platform.OS !== 'web';

const ThemeContext = createContext<Palette>(DEFAULT);

export function ThemeProvider({ palette, children }: { palette: Palette; children: ReactNode }) {
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}

/** Builds a component's styles from the current palette, rebuilt only when the theme changes. */
export function useStyles<T extends NamedStyles>(factory: (c: Palette) => T): T {
  const c = useTheme();
  return useMemo(() => StyleSheet.create(withFonts(factory(c), c.fonts)), [c]);
}

/** Card look shared by most surfaces. */
export function card(c: Palette) {
  return {
    backgroundColor: c.surface,
    borderRadius: c.radius,
    borderWidth: 1,
    borderColor: c.border,
    ...(c.shadow ? { boxShadow: c.shadow } : {}),
  } as const;
}

/** Heading style tweaks per theme (capitals). Font comes from FONTS.serif via withFonts. */
export function headingCase(c: Palette) {
  return c.headingUpper ? ({ textTransform: 'uppercase', letterSpacing: 1 } as const) : ({} as const);
}

/** Small label style: spaced capitals or normal case, per theme. */
export function eyebrow(c: Palette, size = 12) {
  return c.eyebrowCaps
    ? ({ fontSize: size, fontWeight: '600', letterSpacing: size * 0.22, textTransform: 'uppercase' } as const)
    : ({ fontSize: size + 1, fontWeight: '600', letterSpacing: 0.2, textTransform: 'none' } as const);
}

/** Declares a style factory; keeps literal style values typed without `as const`. */
export function themed<T extends NamedStyles>(factory: (c: Palette) => T): (c: Palette) => T {
  return factory;
}
