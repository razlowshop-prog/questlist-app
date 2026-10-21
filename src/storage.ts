import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyState, type GameState } from './game';

// Data lives on the device for now. Cloud sync (Supabase) comes later.
const KEY = 'questlist/state/v1';

export async function loadState(): Promise<GameState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
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
