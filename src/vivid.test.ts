import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CELEBRATIONS, FLAME_STYLES, FRAMES } from './cosmetics.ts';
import { addDays, emptyState, weekDots, weekStart, type GameState } from './game.ts';
import { GLYPHS } from './glyphs.ts';
import { CATEGORIES } from './library.ts';
import {
  ACHIEVEMENT_TIER_LOOKS,
  avatarDisc,
  AVATAR_DISCS,
  BRAND,
  brandLine,
  CATEGORY_LOOKS,
  categoryLook,
  CELEBRATION_GLYPHS,
  challengeRarity,
  FRAME_LOOKS,
  ICON_GLYPHS,
  levelBand,
  mixHex,
  STYLE_FLAMES,
  textSolid,
  tierFlame,
} from './vivid.ts';

/** WCAG contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [0, 1, 2].map((i) => {
      const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('level badge bands follow the spec', () => {
  assert.deepEqual([1, 9, 10, 24, 25, 49, 50, 99, 100, 140].map(levelBand), [
    'common', 'common', 'rare', 'rare', 'epic', 'epic', 'legendary', 'legendary', 'mythic', 'mythic',
  ]);
});

test('every library category has its own colours and a glyph; unknown ones fall back', () => {
  for (const cat of CATEGORIES) assert.ok(CATEGORY_LOOKS[cat.id], `${cat.id} has no look`);
  assert.equal(categoryLook('nope'), CATEGORY_LOOKS.other);
  for (const look of Object.values(CATEGORY_LOOKS)) assert.ok(GLYPHS[look.glyph], look.glyph);
});

test('every frame, flame style and celebration has a vivid look', () => {
  for (const f of FRAMES) {
    assert.ok(FRAME_LOOKS[f.id], f.id);
    assert.equal(FRAME_LOOKS[f.id].name, f.name, 'frame names come from the vivid looks');
  }
  for (const id of Object.keys(STYLE_FLAMES)) assert.ok(FLAME_STYLES.some((f) => f.id === id), id);
  for (const c of CELEBRATIONS) assert.ok(GLYPHS[CELEBRATION_GLYPHS[c.id]], c.id);
  // Rarer frames come later in the level ladder.
  const order = ['common', 'rare', 'epic', 'legendary', 'mythic'];
  const ranks = FRAMES.map((f) => order.indexOf(FRAME_LOOKS[f.id].rarity));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});

test('fire tiers map to Ember, Blaze and Inferno, no fire to none', () => {
  assert.equal(tierFlame(0), undefined);
  assert.equal(tierFlame(1)?.c2, '#FF4A1C');
  assert.equal(tierFlame(2)?.c2, '#2F7BFF');
  assert.equal(tierFlame(3)?.c2, '#9B30FF');
  assert.equal(tierFlame(9)?.c2, '#9B30FF');
});

test('every line icon used in the data has a filled glyph', () => {
  for (const [icon, glyph] of Object.entries(ICON_GLYPHS)) assert.ok(GLYPHS[glyph], `${icon} -> ${glyph}`);
  const iconNames = [...readFileSync(new URL('./icons.ts', import.meta.url), 'utf8').matchAll(/'(\w+)'/g)].map((m) => m[1]);
  for (const name of iconNames) assert.ok(name in ICON_GLYPHS, `${name} has no glyph`);
});

test('avatar discs: a picked index, the first one otherwise', () => {
  assert.equal(avatarDisc(undefined), AVATAR_DISCS[0]);
  assert.equal(avatarDisc(3), AVATAR_DISCS[3]);
  assert.equal(avatarDisc(9), AVATAR_DISCS[0]);
  assert.equal(avatarDisc(-1), AVATAR_DISCS[0]);
});

test('challenge rarity grows with the reward', () => {
  assert.deepEqual([100, 110, 130, 150, 180, 200].map(challengeRarity), ['common', 'rare', 'rare', 'epic', 'epic', 'legendary']);
  assert.equal(ACHIEVEMENT_TIER_LOOKS.length, 7);
});

test('gradient numbers stay readable on every light theme background', () => {
  const src = readFileSync(new URL('./theme.tsx', import.meta.url), 'utf8');
  const light = [...src.matchAll(/light: true,\s*colors: \['(\w{6})', '(\w{6})'/g)].map((m) => [`#${m[1]}`, `#${m[2]}`]);
  assert.ok(light.length >= 3, 'found the light themes');
  for (const [bg, cardBg] of light) {
    assert.ok(contrast(textSolid(false), bg) >= 4.5, `on ${bg}`);
    assert.ok(contrast(textSolid(false), cardBg) >= 4.5, `on ${cardBg}`);
  }
});

test('mixHex blends two colours', () => {
  assert.equal(mixHex('#000000', '#FFFFFF', 0.5), '#808080');
  assert.equal(mixHex('#FF0000', '#0000FF', 0), '#FF0000');
});

test('week dots: done days, rest days, today, missed and days still to come', () => {
  const today = '2026-10-22'; // a Thursday
  const monday = weekStart(today);
  const state: GameState = {
    ...emptyState,
    joinedAt: '2026-01-01',
    completions: [
      { taskId: 'a', date: monday, xp: 10 } as GameState['completions'][number],
      { taskId: 'a', date: addDays(monday, 2), xp: 10 } as GameState['completions'][number],
    ],
    restDays: [addDays(monday, 1)],
  };
  assert.deepEqual(weekDots(state, today), ['done', 'rest', 'done', 'today', 'future', 'future', 'future']);
  const ticked = { ...state, completions: [...state.completions, { taskId: 'a', date: today, xp: 5 } as GameState['completions'][number]] };
  assert.equal(weekDots(ticked, today)[3], 'done');
  // Days before joining don't count as missed.
  assert.deepEqual(weekDots({ ...state, completions: [], restDays: [], joinedAt: today }, today).slice(0, 4), ['future', 'future', 'future', 'today']);
  assert.equal(weekDots({ ...state, restDays: [] }, today)[1], 'missed');
});

test('the default theme is Indigo with its blue-violet fade, and Dusk can still be picked', () => {
  const src = readFileSync(new URL('./theme.tsx', import.meta.url), 'utf8');
  const first = src.slice(src.indexOf('export const THEMES'));
  const ids = [...first.matchAll(/\bid: '(\w+)',\s*name: N\('(\w+)'\),(\s*reward:)?/g)].map((m) => [m[1], m[2], !!m[3]]);
  assert.deepEqual(ids[0], ['classic', 'Indigo', false], 'everyone on the default moves to Indigo');
  assert.deepEqual(ids[1], ['dusk', 'Dusk', false], 'Dusk stays free to pick');
  assert.deepEqual(ids.slice(2, 4), [['honey', 'Honey', true], ['hive', 'Hive', false]], 'Honey is won with the secret achievement, Hive is free');
  assert.equal(new Set(ids.map((i) => i[0])).size, ids.length, 'theme ids are unique');
  assert.match(first, /bgImage: 'linear-gradient\(165deg, #13213a 0%, #12151f 48%, #1f1636 100%\)'/);
});

test('blue-violet brand colours stay readable', () => {
  const indigo = { bg: '#12151F', card: '#1B2030' };
  // White button text on the violet end of the brand gradient.
  assert.ok(contrast('#FFFFFF', BRAND.c2) >= 4.5);
  // Gradient-number fallback, outlines and the active tab label on the Indigo background and cards.
  for (const bg of [indigo.bg, indigo.card]) {
    assert.ok(contrast(textSolid(true), bg) >= 4.5, `numbers on ${bg}`);
    assert.ok(contrast(brandLine(true), bg) >= 4.5, `label on ${bg}`);
  }
  assert.ok(contrast(brandLine(false), '#FFFFFF') >= 4.5, 'label on light cards');
});
