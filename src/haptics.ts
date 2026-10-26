import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small vibrations at the good moments. Phones only; a failed buzz is ignored.
// Every buzz in the app goes through here, so the Vibration switch in Settings
// silences all of them.

export type Buzz =
  /** A task ticked off. */
  | 'tick'
  /** A step of a task, or a slice edge passing the wheel's pointer. */
  | 'step'
  | 'levelUp'
  /** A wheel prize, a perfect day or a streak milestone. */
  | 'prize'
  /** A button press. */
  | 'tap'
  /** A combo of quick ticks; ×4 and up hits harder. */
  | 'combo'
  | 'bigCombo'
  /** A reward, award or challenge collected. */
  | 'claim'
  /** Something that can't be done yet, like ticking a task in its first 20 seconds. */
  | 'blocked'
  /** A token used: a rest day, double XP, a challenge swap… */
  | 'token';

let enabled = true;

/** Follows Settings → Vibration (on unless switched off). */
export function setHapticsEnabled(on: boolean | undefined): void {
  enabled = on !== false;
}

export function buzz(kind: Buzz): void {
  if (!enabled || Platform.OS === 'web') return;
  const done = (p: Promise<void>) => void p.catch(() => {});
  switch (kind) {
    case 'tick':
    case 'combo':
    case 'token':
      return done(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    case 'bigCombo':
      return done(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    case 'tap':
      return done(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    case 'step':
      return done(Haptics.selectionAsync());
    case 'levelUp':
    case 'prize':
    case 'claim':
      return done(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    case 'blocked':
      return done(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  }
}
