// Short sounds at the good moments, picked by Fabian from the sound board
// (2026-10-26). Every sound in the app goes through here, so the Sounds switch
// in Settings silences all of them. The files live in assets/sounds and are
// played by soundPlayer.ts; this file only decides which one and how loud.

export type Cue =
  | 'tick'
  /** A step of a long task. */
  | 'step'
  /** A combo of quick ticks: ×2, ×3, and ×4 and up. */
  | 'combo2'
  | 'combo3'
  | 'combo4'
  | 'levelUp'
  | 'perfect'
  | 'streak'
  /** A slice edge passing the wheel's pointer. */
  | 'wheel'
  | 'win'
  /** An epic or legendary wheel prize. */
  | 'jackpot'
  /** A reward collected: an award, a level reward, a challenge. */
  | 'coin'
  /** A new look won: a theme, flame or frame. */
  | 'unlock'
  /** The focus timer reached the full time. */
  | 'focus';

export const ALL_CUES: readonly Cue[] = ['tick', 'step', 'combo2', 'combo3', 'combo4', 'levelUp', 'perfect', 'streak', 'wheel', 'win', 'jackpot', 'coin', 'unlock', 'focus'];

/** Settings → Sound style: changes the sounds of the moments that happen most. */
export type SoundStyle = 'marimba' | 'air';
export const SOUND_STYLES: readonly SoundStyle[] = ['marimba', 'air'];
export const DEFAULT_SOUND_STYLE: SoundStyle = 'marimba';

/** The cues that follow the sound style; the rest sound the same in both. */
const STYLED: ReadonlySet<Cue> = new Set<Cue>(['tick', 'combo2', 'combo3', 'combo4', 'levelUp', 'perfect', 'streak']);

/** The file a cue plays (without ".mp3"), as named in assets/sounds. */
export function soundFile(cue: Cue, style: SoundStyle = DEFAULT_SOUND_STYLE): string {
  const name = cue === 'levelUp' ? 'levelup' : cue;
  return STYLED.has(cue) ? `${name}-${style}` : name;
}

/** Every file a style needs, for loading them up front. */
export function filesFor(style: SoundStyle): string[] {
  return ALL_CUES.map((c) => soundFile(c, style));
}

/** The combo sound for a run of `count` quick ticks (2 or more). */
export function comboCue(count: number): Cue {
  return count >= 4 ? 'combo4' : count === 3 ? 'combo3' : 'combo2';
}

/** Kept quiet on purpose; the ones that play most often are the softest. */
const VOLUME: Partial<Record<Cue, number>> = { tick: 0.55, step: 0.5, wheel: 0.3 };
export function volumeFor(cue: Cue): number {
  return VOLUME[cue] ?? 0.65;
}

let enabled = true;
let style: SoundStyle = DEFAULT_SOUND_STYLE;
let player: ((file: string, volume: number) => void) | undefined;

/** Follows Settings → Sounds (on unless switched off) and Sound style. */
export function setSounds(on: boolean | undefined, chosen: SoundStyle | undefined): void {
  enabled = on !== false;
  style = chosen && SOUND_STYLES.includes(chosen) ? chosen : DEFAULT_SOUND_STYLE;
}

/** soundPlayer.ts hands over the function that actually plays a file. */
export function setSoundPlayer(play: (file: string, volume: number) => void): void {
  player = play;
}

/** Plays a cue, unless sounds are off. `force` plays it anyway, for previewing a style in Settings. */
export function sound(cue: Cue, opts?: { style?: SoundStyle; force?: boolean }): void {
  if (!player || (!enabled && !opts?.force)) return;
  player(soundFile(cue, opts?.style ?? style), volumeFor(cue));
}
