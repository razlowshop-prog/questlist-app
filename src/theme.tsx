import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

type NamedStyles = { [key: string]: ViewStyle | TextStyle | ImageStyle };

export interface Palette {
  dark: boolean;
  bg: string;
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
  /** Shape of the task checkbox. */
  check: 'circle' | 'square' | 'diamond';
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
}

export type Ornament = 'none' | 'leaf' | 'wave' | 'sun' | 'bolt' | 'peak' | 'dots' | 'double' | 'moon';

export type BarStyle =
  | { kind: 'line' }
  | { kind: 'segments'; count: number; radius: number; gap: number }
  | { kind: 'dots'; count: number; size: number; glow: boolean };

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
}

/** Builds a palette from a design-thread spec line. */
function palette(spec: ThemeSpec): Palette {
  const [bg, surface, surfaceAlt, border, text, muted, faint, outline, accent, onAccent] = spec.colors.map((c) => `#${c.toUpperCase()}`);
  const light = spec.light ?? false;
  const soft = mix(surface, accent, light ? 0.12 : 0.16);
  return {
    dark: !light,
    bg,
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
  };
}

const CORMORANT = heading('CormorantGaramond_500Medium', 'CormorantGaramond_500Medium_Italic');

/**
 * Nine small designs from the design thread (board "Succedo · 9 reward themes").
 * Dusk is the default, from the Razlow shop. Ids and reward labels are stored
 * in settings and achievements: don't change them.
 */
export const THEMES: ThemeDef[] = [
  {
    id: 'classic',
    name: 'Dusk',
    palette: palette({
      colors: ['1c1815', '28221e', '322a25', '4a423a', 'f4f0e9', 'c4bbaf', 'a0968a', '6e6458', 'd4b27a', '1c1815'],
      radius: 4, listStyle: 'lines', check: 'circle', lineWeight: 2, tip: true,
      eyebrowCaps: true, logoRule: true, italicAccent: true, headingUpper: false,
    }),
  },
  {
    id: 'forest',
    name: 'Forest',
    reward: 'Forest theme',
    palette: palette({
      light: true,
      colors: ['eef1ea', 'ffffff', 'e3e9df', 'd3dbcf', '1d2a20', '4f5e52', '6a776c', 'a9b4a6', '3f6b4a', 'ffffff'],
      fonts: CORMORANT,
      radius: 14, listStyle: 'cards', check: 'square', lineWeight: 6, tip: false,
      eyebrowCaps: false, logoRule: false, ornament: 'leaf', italicAccent: true, headingUpper: false,
    }),
  },
  {
    id: 'ocean',
    name: 'Ocean',
    reward: 'Ocean theme',
    palette: palette({
      light: true,
      colors: ['edf3f5', 'ffffff', 'e0eaee', 'cfdde3', '10232c', '3f5864', '5e7480', 'a3b5bd', '226580', 'ffffff'],
      fonts: heading('DMSerifDisplay_400Regular', 'DMSerifDisplay_400Regular_Italic'),
      radius: 20, listStyle: 'lines', check: 'circle', lineWeight: 3, tip: false,
      eyebrowCaps: false, logoRule: false, ornament: 'wave', italicAccent: true, headingUpper: false,
    }),
  },
  {
    id: 'sunset',
    name: 'Sunset',
    reward: 'Sunset theme',
    palette: palette({
      light: true,
      colors: ['f8eee6', 'fffaf6', 'f1e2d6', 'ecd8ca', '2b1a14', '634a3f', '7e6458', 'c4ab9c', 'b44e33', 'ffffff'],
      fonts: heading('Fraunces_400Regular', 'Fraunces_400Regular_Italic'),
      radius: 18, listStyle: 'cards', check: 'circle', lineWeight: 6, tip: false,
      eyebrowCaps: false, logoRule: false, ornament: 'sun', italicAccent: true, headingUpper: false,
      bar: { kind: 'segments', count: 10, radius: 3, gap: 4 },
    }),
  },
  {
    id: 'thunder',
    name: 'Thunder',
    reward: 'Thunder theme',
    palette: palette({
      colors: ['15161c', '1f2028', '282a34', '3a3c48', 'f1f1f5', 'b9bac6', '9496a4', '5d6070', 'e6d36a', '15161c'],
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
    name: 'Summit',
    reward: 'Summit theme',
    palette: palette({
      light: true,
      colors: ['f3f4f5', 'ffffff', 'e8eaec', 'dcdfe2', '1b1f23', '4e565e', '68717a', 'a9b0b5', '334250', 'ffffff'],
      fonts: heading('Archivo_800ExtraBold', 'Archivo_800ExtraBold_Italic'),
      radius: 6, listStyle: 'lines', check: 'circle', lineWeight: 2, tip: false,
      eyebrowCaps: true, logoRule: false, ornament: 'peak', italicAccent: false, headingUpper: true,
    }),
  },
  {
    id: 'ember',
    name: 'Ember',
    reward: 'Ember theme',
    palette: palette({
      colors: ['1e1614', '2b1f1b', '352722', '4f3a33', 'f6eee9', 'cbb9b1', 'a8968e', '75605a', 'ea8d66', '1e1614'],
      fonts: heading('BodoniModa_400Regular', 'BodoniModa_400Regular_Italic'),
      radius: 8, listStyle: 'lines', check: 'circle', lineWeight: 2, tip: true,
      eyebrowCaps: true, logoRule: false, ornament: 'dots', italicAccent: true, headingUpper: false,
    }),
  },
  {
    id: 'gold',
    name: 'Gold',
    reward: 'Gold theme',
    palette: palette({
      colors: ['17140f', '221d15', '2c261b', '4c4232', 'f6efe0', 'cbbf9f', 'a39878', '6f6448', 'e8c66c', '17140f'],
      fonts: CORMORANT,
      radius: 0, listStyle: 'lines', check: 'diamond', lineWeight: 2, tip: true,
      eyebrowCaps: true, logoRule: true, ornament: 'double', italicAccent: false, headingUpper: true,
    }),
  },
  {
    id: 'midnight',
    name: 'Midnight',
    reward: 'Midnight theme',
    palette: palette({
      colors: ['12141c', '1b1e29', '242838', '343a4c', 'eef1fa', 'b6bdd2', '8f97ae', '59607a', 'a3b3ea', '12141c'],
      fonts: heading('InstrumentSerif_400Regular', 'InstrumentSerif_400Regular_Italic'),
      radius: 18, listStyle: 'cards', check: 'circle', lineWeight: 4, tip: false,
      eyebrowCaps: false, logoRule: false, ornament: 'moon', italicAccent: true, headingUpper: false,
      bar: { kind: 'dots', count: 10, size: 7, glow: true },
    }),
  },
];

const DUSK = THEMES[0].palette;

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

const ThemeContext = createContext<Palette>(DUSK);

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
