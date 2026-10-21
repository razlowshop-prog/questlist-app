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
  /** Soft card shadow; empty in dark themes. */
  shadow: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  /** The achievement reward that unlocks it; undefined = always available. */
  reward?: string;
  palette: Palette;
}

const LIGHT: Palette = {
  dark: false,
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F1F6',
  text: '#14162B',
  muted: '#6E7391',
  border: '#E4E6EF',
  accent: '#5B5BF7',
  accentSoft: '#ECECFE',
  onAccent: '#FFFFFF',
  xp: '#22C55E',
  xpSoft: '#DCFCE7',
  gold: '#F59E0B',
  goldSoft: '#FEF3C7',
  onGold: '#3B2500',
  flame: '#F97316',
  shadow: '0px 1px 2px rgba(20,22,43,0.05), 0px 4px 14px rgba(20,22,43,0.05)',
};

const light = (overrides: Partial<Palette>): Palette => ({ ...LIGHT, ...overrides });

/** Reward themes are deliberately close to the default: a new accent and a faint background tint. */
export const THEMES: ThemeDef[] = [
  { id: 'classic', name: 'Classic', palette: LIGHT },
  {
    id: 'forest',
    name: 'Forest',
    reward: 'Forest theme',
    palette: light({ accent: '#15803D', accentSoft: '#E3F4E8', bg: '#F3F7F4', xp: '#65A30D', xpSoft: '#ECFCCB' }),
  },
  {
    id: 'ocean',
    name: 'Ocean',
    reward: 'Ocean theme',
    palette: light({ accent: '#0369A1', accentSoft: '#E0F0FA', bg: '#F2F7FA', xp: '#06B6D4', xpSoft: '#CFFAFE' }),
  },
  {
    id: 'sunset',
    name: 'Sunset',
    reward: 'Sunset theme',
    palette: light({ accent: '#E11D48', accentSoft: '#FDE8EC', bg: '#FAF5F4', xp: '#FB923C', xpSoft: '#FFEDD5' }),
  },
  {
    id: 'thunder',
    name: 'Thunder',
    reward: 'Thunder theme',
    palette: light({ accent: '#B45309', accentSoft: '#FDF0DC', bg: '#FAF8F2', xp: '#EAB308', xpSoft: '#FEF9C3' }),
  },
  {
    id: 'summit',
    name: 'Summit',
    reward: 'Summit theme',
    palette: light({ accent: '#334155', accentSoft: '#E7EBF0', bg: '#F4F6F8', xp: '#0EA5E9', xpSoft: '#E0F2FE' }),
  },
  {
    id: 'ember',
    name: 'Ember',
    reward: 'Ember theme',
    palette: light({ accent: '#C2410C', accentSoft: '#FCEBE2', bg: '#FAF5F2', xp: '#F97316', xpSoft: '#FFEDD5' }),
  },
  {
    id: 'gold',
    name: 'Gold',
    reward: 'Gold theme',
    palette: light({ accent: '#A16207', accentSoft: '#FBF1D6', bg: '#FAF8F0', gold: '#CA8A04', xp: '#CA8A04', xpSoft: '#FEF9C3' }),
  },
  {
    id: 'midnight',
    name: 'Midnight',
    reward: 'Midnight theme',
    palette: {
      dark: true,
      bg: '#0F1222',
      surface: '#1A1E36',
      surfaceAlt: '#232845',
      text: '#F2F3FA',
      muted: '#8B90B0',
      border: '#2A2F4F',
      accent: '#8B7CFF',
      accentSoft: '#2A2752',
      onAccent: '#FFFFFF',
      xp: '#3DD68C',
      xpSoft: '#173A2B',
      gold: '#FFC94D',
      goldSoft: '#3A3016',
      onGold: '#2A1E00',
      flame: '#FF8A3D',
      shadow: '',
    },
  },
];

export function themeById(id: string | undefined): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** The native animation driver isn't available on web. */
export const nativeDriver = Platform.OS !== 'web';

const ThemeContext = createContext<Palette>(LIGHT);

export function ThemeProvider({ palette, children }: { palette: Palette; children: ReactNode }) {
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}

/** Builds a component's styles from the current palette, rebuilt only when the theme changes. */
export function useStyles<T extends NamedStyles>(factory: (c: Palette) => T): T {
  const c = useTheme();
  return useMemo(() => StyleSheet.create(factory(c)), [c]);
}

/** Card look shared by most surfaces. */
export function card(c: Palette) {
  return {
    backgroundColor: c.surface,
    borderRadius: 18,
    ...(c.shadow ? { boxShadow: c.shadow } : { borderWidth: 1, borderColor: c.border }),
  } as const;
}

/** Declares a style factory; keeps literal style values typed without `as const`. */
export function themed<T extends NamedStyles>(factory: (c: Palette) => T): (c: Palette) => T {
  return factory;
}
