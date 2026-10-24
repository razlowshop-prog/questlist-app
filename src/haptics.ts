import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small vibrations at the good moments. Phones only; a failed buzz is ignored.

export type Buzz = 'tick' | 'step' | 'levelUp' | 'prize';

export function buzz(kind: Buzz, enabled: boolean | undefined): void {
  if (enabled === false || Platform.OS === 'web') return;
  const done = (p: Promise<void>) => void p.catch(() => {});
  switch (kind) {
    case 'tick':
      return done(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    case 'step':
      return done(Haptics.selectionAsync());
    case 'levelUp':
    case 'prize':
      return done(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }
}
