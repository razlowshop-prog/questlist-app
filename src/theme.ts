import { Platform } from 'react-native';

export const C = {
  bg: '#0F1222',
  card: '#1A1E36',
  cardDone: '#151A2B',
  text: '#F2F3FA',
  muted: '#8B90B0',
  accent: '#7C5CFF',
  xp: '#3DD68C',
  gold: '#FFC94D',
  flame: '#FF8A3D',
  border: '#2A2F4F',
};

/** The native animation driver isn't available on web. */
export const nativeDriver = Platform.OS !== 'web';
