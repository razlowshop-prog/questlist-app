import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { ALL_CUES, comboCue, filesFor, setSoundPlayer, setSounds, sound, soundFile, SOUND_STYLES, volumeFor } from './sounds.ts';

test('the sound style only changes the moments Fabian left open', () => {
  for (const cue of ['tick', 'combo2', 'combo3', 'combo4', 'levelUp', 'perfect', 'streak'] as const) {
    assert.notEqual(soundFile(cue, 'marimba'), soundFile(cue, 'air'));
  }
  for (const cue of ['step', 'wheel', 'win', 'jackpot', 'coin', 'unlock', 'focus'] as const) {
    assert.equal(soundFile(cue, 'marimba'), soundFile(cue, 'air'));
  }
  assert.equal(soundFile('levelUp', 'air'), 'levelup-air');
});

test('every sound file exists, and the player knows every file', () => {
  const files = new Set(readdirSync(new URL('../assets/sounds/', import.meta.url)).map((f) => f.replace(/\.mp3$/, '')));
  const player = readFileSync(new URL('./soundPlayer.ts', import.meta.url), 'utf8');
  const needed = new Set(SOUND_STYLES.flatMap(filesFor));
  for (const f of needed) {
    assert.ok(files.has(f), `assets/sounds/${f}.mp3 is missing`);
    assert.ok(player.includes(`require('../assets/sounds/${f}.mp3')`), `soundPlayer.ts doesn't load ${f}`);
  }
  // Nothing unused ships with the app.
  for (const f of files) assert.ok(needed.has(f), `assets/sounds/${f}.mp3 is never played`);
});

test('combos climb from ×2 to ×4 and stay there', () => {
  assert.deepEqual([2, 3, 4, 5, 12].map(comboCue), ['combo2', 'combo3', 'combo4', 'combo4', 'combo4']);
});

test('sounds stay quiet, and the frequent ones quietest', () => {
  for (const cue of ALL_CUES) assert.ok(volumeFor(cue) > 0 && volumeFor(cue) <= 0.7);
  assert.ok(volumeFor('tick') < volumeFor('levelUp'));
});

test('the Sounds switch silences everything; a preview in Settings still plays', () => {
  const played: string[] = [];
  setSoundPlayer((file) => played.push(file));
  setSounds(undefined, undefined);
  sound('tick');
  setSounds(true, 'air');
  sound('tick');
  setSounds(false, 'air');
  sound('tick');
  sound('levelUp', { style: 'marimba', force: true });
  // An unknown saved style falls back to Marimba.
  setSounds(true, 'bells' as never);
  sound('tick');
  assert.deepEqual(played, ['tick-marimba', 'tick-air', 'levelup-marimba', 'tick-marimba']);
});
