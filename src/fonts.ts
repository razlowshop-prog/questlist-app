// Font files per family, imported one cut at a time so only these end up in the app.
import type { ThemeFonts } from './theme';
import { Assistant_400Regular } from '@expo-google-fonts/assistant/400Regular';
import { Assistant_500Medium } from '@expo-google-fonts/assistant/500Medium';
import { Assistant_600SemiBold } from '@expo-google-fonts/assistant/600SemiBold';
import { Assistant_700Bold } from '@expo-google-fonts/assistant/700Bold';
import { Assistant_800ExtraBold } from '@expo-google-fonts/assistant/800ExtraBold';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display/400Regular';
import { PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display/400Regular_Italic';
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond/500Medium_Italic';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display/400Regular';
import { DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display/400Regular_Italic';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces/400Regular';
import { Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces/400Regular_Italic';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk/400Regular';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { Archivo_800ExtraBold_Italic } from '@expo-google-fonts/archivo/800ExtraBold_Italic';
import { BodoniModa_400Regular } from '@expo-google-fonts/bodoni-moda/400Regular';
import { BodoniModa_400Regular_Italic } from '@expo-google-fonts/bodoni-moda/400Regular_Italic';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel/700Bold';
import { Cinzel_800ExtraBold } from '@expo-google-fonts/cinzel/800ExtraBold';

export const FONT_FILES: Record<string, number> = {
  Assistant_400Regular,
  Assistant_500Medium,
  Assistant_600SemiBold,
  Assistant_700Bold,
  Assistant_800ExtraBold,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  Archivo_800ExtraBold,
  Archivo_800ExtraBold_Italic,
  BodoniModa_400Regular,
  BodoniModa_400Regular_Italic,
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  Cinzel_700Bold,
  Cinzel_800ExtraBold,
};

/** The font files a theme needs, ready for expo-font's loadAsync. */
export function fontFilesFor(fonts: ThemeFonts): Record<string, number> {
  const out: Record<string, number> = {};
  for (const name of Object.values(fonts)) {
    if (!FONT_FILES[name]) throw new Error(`Font ${name} is not in FONT_FILES`);
    out[name] = FONT_FILES[name];
  }
  return out;
}

/** Cinzel for the Spin tab, which always wears the Fortuna look whatever the theme. */
export const WHEEL_FONTS: Record<string, number> = { Cinzel_700Bold, Cinzel_800ExtraBold };

/**
 * Assistant for the vivid buttons, badges and numbers, which look the same on
 * every theme. Registered under their own names, so theme font swapping
 * (withFonts) leaves them alone.
 */
export const VIVID_FONTS: Record<string, number> = { Vivid_700Bold: Assistant_700Bold, Vivid_800ExtraBold: Assistant_800ExtraBold };
