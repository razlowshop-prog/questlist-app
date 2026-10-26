// A quick check, on the phone, that a typed task title is made of words and
// not keyboard mash like "sdggfsaa", which would otherwise earn the standard
// XP. It looks at the shape of the letters only, so it works for English,
// German and other Latin-script languages without a dictionary. Titles in
// other scripts are let through. A server-side AI check can follow once
// accounts exist.

import { t } from './i18n.ts';

const notATask = () => t('That doesn’t look like a task yet. Try e.g. “{example}”.', { example: t('Clean the kitchen') });
const VOWELS = /[aeiouyäöüàáâãåæèéêëìíîïòóôõøùúûýÿœ]/;
const LATIN = /^[a-zà-öø-ÿßœæ]+$/;
/** Five keys side by side on a QWERTY or QWERTZ keyboard: "asdfg", "qwert". */
const KEY_ROWS = ['qwertyuiop', 'qwertzuiop', 'asdfghjkl', 'yxcvbnm', 'zxcvbnm'];

function keyboardRun(word: string): boolean {
  for (const row of KEY_ROWS) {
    for (let i = 0; i + 5 <= row.length; i++) {
      const run = row.slice(i, i + 5);
      if (word.includes(run) || word.includes([...run].reverse().join(''))) return true;
    }
  }
  return false;
}

/** Longest stretch of consonants, counting "sch", "ch", "ck", "ph", "sh" and "th" as one sound. */
function consonantRun(word: string): number {
  const sounds = word.replace(/sch|ch|ck|ph|sh|th/g, 'c');
  let best = 0;
  let run = 0;
  for (const ch of sounds) {
    run = VOWELS.test(ch) ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return best;
}

/** True when a single word looks typed at random. */
export function mashedWord(word: string): boolean {
  const w = word.toLowerCase();
  if (w.length < 4) return false;
  const vowels = [...w].filter((ch) => VOWELS.test(ch)).length;
  if (vowels === 0) return true;
  if (/(.)\1\1\1/.test(w)) return true;
  if (keyboardRun(w)) return true;
  if (consonantRun(w) >= 6) return true;
  return w.length >= 6 && vowels / w.length <= 1 / 6;
}

/**
 * Why a typed title can't be a task, or undefined when it looks fine: no
 * letters at all, a single letter over and over, or mostly mashed words.
 */
export function nonsenseReason(title: string): string | undefined {
  const words = title.toLowerCase().match(/\p{L}+/gu) ?? [];
  const letters = words.join('');
  if (letters.length < 2) return t('Give your task a name in words, e.g. “{example}”.', { example: t('Clean the kitchen') });
  // Another script (Cyrillic, Chinese …): nothing here can judge it.
  if (!words.every((w) => LATIN.test(w))) return undefined;
  if (new Set(letters).size === 1) return notATask();
  const long = words.filter((w) => w.length >= 4);
  const mashed = long.filter(mashedWord).length;
  // More than half of the real words: one odd word ("Herbstschmuck") among others is fine.
  if (long.length > 0 && mashed * 2 > long.length) return notATask();
  if (!words.some((w) => w.length >= 2 && VOWELS.test(w))) return notATask();
  return undefined;
}
