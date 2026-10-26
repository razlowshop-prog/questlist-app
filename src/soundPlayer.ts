import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { setSoundPlayer } from './sounds';

// Plays the files in assets/sounds for sounds.ts. Each file gets its own player,
// made the first time it's needed and kept; the wheel click gets a few, so
// quick clicks don't cut each other off. A sound that fails to play is ignored.

const FILES: Record<string, number> = {
  'tick-marimba': require('../assets/sounds/tick-marimba.mp3'),
  'tick-air': require('../assets/sounds/tick-air.mp3'),
  'combo2-marimba': require('../assets/sounds/combo2-marimba.mp3'),
  'combo2-air': require('../assets/sounds/combo2-air.mp3'),
  'combo3-marimba': require('../assets/sounds/combo3-marimba.mp3'),
  'combo3-air': require('../assets/sounds/combo3-air.mp3'),
  'combo4-marimba': require('../assets/sounds/combo4-marimba.mp3'),
  'combo4-air': require('../assets/sounds/combo4-air.mp3'),
  'levelup-marimba': require('../assets/sounds/levelup-marimba.mp3'),
  'levelup-air': require('../assets/sounds/levelup-air.mp3'),
  'perfect-marimba': require('../assets/sounds/perfect-marimba.mp3'),
  'perfect-air': require('../assets/sounds/perfect-air.mp3'),
  'streak-marimba': require('../assets/sounds/streak-marimba.mp3'),
  'streak-air': require('../assets/sounds/streak-air.mp3'),
  step: require('../assets/sounds/step.mp3'),
  wheel: require('../assets/sounds/wheel.mp3'),
  win: require('../assets/sounds/win.mp3'),
  jackpot: require('../assets/sounds/jackpot.mp3'),
  coin: require('../assets/sounds/coin.mp3'),
  unlock: require('../assets/sounds/unlock.mp3'),
  focus: require('../assets/sounds/focus.mp3'),
};

/** How many players a file gets; more than one lets a sound overlap itself. */
const COPIES: Record<string, number> = { wheel: 4 };

const players = new Map<string, { list: AudioPlayer[]; next: number }>();

function playerFor(file: string): AudioPlayer | undefined {
  const source = FILES[file];
  if (source === undefined) return undefined;
  let entry = players.get(file);
  if (!entry) {
    entry = { list: Array.from({ length: COPIES[file] ?? 1 }, () => createAudioPlayer(source)), next: 0 };
    players.set(file, entry);
  }
  const p = entry.list[entry.next];
  entry.next = (entry.next + 1) % entry.list.length;
  return p;
}

function play(file: string, volume: number): void {
  try {
    const p = playerFor(file);
    if (!p) return;
    p.volume = volume;
    // From the start, also when the last play hasn't finished.
    if (p.currentTime > 0) p.seekTo(0).then(() => p.play(), () => {});
    else p.play();
  } catch {
    // No sound is better than a crash.
  }
}

/** Once at start: mixes with the player's own music, and stays quiet when the phone is on silent. */
export function startSounds(preload: string[]): void {
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
  setSoundPlayer(play);
  for (const f of preload) {
    try {
      playerFor(f);
    } catch {}
  }
}
