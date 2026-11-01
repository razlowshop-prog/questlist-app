import { DE } from './i18n.de.ts';

// The app speaks English or German (phone-test item 19). English text is the
// key: t('Today') shows "Heute" in German, and anything without a German entry
// falls back to English. Saved data (task titles, ids, chosen titles) stays in
// English, so switching language never breaks history; it is translated only
// where it is shown. The German speaks to the player as "du".

export type Lang = 'en' | 'de';

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
];

let current: Lang = 'en';

/** Set by the app on every render from the saved setting (or the phone's language). */
export function setLang(lang: Lang): void {
  current = lang;
}

export function lang(): Lang {
  return current;
}

/** The phone's own language, if it is one the app speaks; English otherwise. */
export function systemLang(): Lang {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return locale.toLowerCase().startsWith('de') ? 'de' : 'en';
  } catch {
    return 'en';
  }
}

type Vars = Record<string, string | number>;

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (all, key: string) => (key in vars ? String(vars[key]) : all));
}

/** The text in the current language. `{name}` placeholders are filled from `vars`. */
export function t(en: string, vars?: Vars): string {
  return fill(current === 'de' ? (DE[en] ?? plain(en)) : plain(en), vars);
}

/**
 * A key may end in "#one" when its English is the same for one and many but
 * German isn't ("1 day streak", "1 Tag in Folge"): the mark is never shown.
 */
function plain(en: string): string {
  return en.endsWith('#one') ? en.slice(0, -4) : en;
}

/** One or many: `tn(n, '{n} task', '{n} tasks')`. `n` is filled in too. */
export function tn(n: number, one: string, other: string, vars?: Vars): string {
  return t(n === 1 ? one : other, { n: num(n), ...vars });
}

/**
 * Marks English text for translation without translating it yet, for data
 * defined once at start-up (award names, token descriptions). Shown with t().
 */
export function N(en: string): string {
  return en;
}

/** For dates and Intl: "en-GB" or "de-AT". */
export function locale(): string {
  return current === 'de' ? 'de-AT' : 'en-GB';
}

/** A whole number with thousands separators: 4,000 in English, 4.000 in German. */
export function num(n: number): string {
  const sep = current === 'de' ? '.' : ',';
  const [whole, frac] = String(n).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return frac ? `${grouped}${current === 'de' ? ',' : '.'}${frac}` : grouped;
}

/** Quotes around a phrase: “like this” in English, „so“ in German. */
export function quoted(text: string): string {
  return current === 'de' ? `„${text}“` : `“${text}”`;
}

/** A number with one decimal: 1.5 in English, 1,5 in German. */
export function decimal(n: number, digits = 1): string {
  const text = n.toFixed(digits);
  return current === 'de' ? text.replace('.', ',') : text;
}
