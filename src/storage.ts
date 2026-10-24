import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyState, type GameState } from './game';

// Data lives on the device for now. Cloud sync (Supabase) comes later.
// Kept from the app's old working name so saved progress isn't lost.
const KEY = 'questlist/state/v1';

export async function loadState(): Promise<GameState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState;
    // Merge so fields added in newer versions get their defaults.
    const saved = JSON.parse(raw);
    return {
      ...emptyState,
      ...saved,
      profile: { ...emptyState.profile, ...saved.profile },
      settings: { ...emptyState.settings, ...saved.settings },
    };

  } catch {
    return emptyState;
  }
}

export async function saveState(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Saving failed (e.g. private browser window). The app keeps working in memory.
  }
}

const PHOTO_KEY = 'questlist/photo/v1';

/**
 * The profile photo, as a data URI. Kept apart from the game state so the
 * picture isn't written again on every tick. It stays on this device.
 */
export async function loadPhoto(): Promise<string | undefined> {
  try {
    return (await AsyncStorage.getItem(PHOTO_KEY)) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function savePhoto(photo: string | undefined): Promise<void> {
  try {
    if (photo) await AsyncStorage.setItem(PHOTO_KEY, photo);
    else await AsyncStorage.removeItem(PHOTO_KEY);
  } catch {
    // Too big or storage blocked: the photo shows until the app is closed.
  }
}
