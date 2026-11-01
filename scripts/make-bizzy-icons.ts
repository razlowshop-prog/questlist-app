// The app icon (picked 2026-10-31: logo 10 "Bizzy with sparkles", with Bizzy much
// bigger). Writes assets/brand/*.svg; scripts/render-brand-pngs.cjs turns them
// into the PNGs app.json uses.
//   node scripts/make-bizzy-icons.ts && node scripts/render-brand-pngs.cjs
import { writeFileSync } from 'node:fs';
import { bizzySvg } from '../src/bizzy.ts';

const OUT = new URL('../assets/brand/', import.meta.url).pathname;

/** Bizzy's drawing (200 × 200) cropped close round him: feelers to the tip of his sting. */
const CROP = '17 30 166 166';

function bee(x: number, y: number, size: number, silhouette = false): string {
  const inner = bizzySvg('excited', false, { form: 5 })
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '');
  const body = silhouette ? `<g filter="url(#solid)">${inner}</g>` : inner;
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${CROP}">${body}</svg>`;
}

/** Four-pointed sparkles, as in the app. */
function sparkles(list: [number, number, number][], fill = '#FFFFFF'): string {
  return list.map(([x, y, r]) => `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`).join('');
}

const BRAND = `<linearGradient id="br" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7FD6FF"/><stop offset="1" stop-color="#6A5BFF"/></linearGradient>`;
/** Turns anything white, keeping its shape (the monochrome icon). */
const SOLID = `<filter id="solid"><feFlood flood-color="#FFFFFF"/><feComposite in2="SourceAlpha" operator="in"/></filter>`;

const svg = (size: number, body: string, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024"><defs>${BRAND}${SOLID}${defs}</defs>${body}</svg>\n`;
const back = `<rect width="1024" height="1024" fill="url(#br)"/>`;

const files: Record<string, string> = {
  // iOS and older Android: Bizzy fills most of the square, sparkles in the corners.
  'icon.svg': svg(1024, back + sparkles([[150, 170, 44], [880, 210, 34], [890, 840, 46], [140, 860, 30]]) + bee(72, 80, 880)),
  // Adaptive icon: the phone crops to a circle or squircle of about the middle two thirds.
  'android-icon-foreground.svg': svg(1024, sparkles([[250, 300, 26], [790, 320, 22], [780, 730, 28]]) + bee(217, 236, 590)),
  'android-icon-background.svg': svg(1024, back),
  'android-icon-monochrome.svg': svg(1024, bee(217, 236, 590, true)),
  'splash-icon.svg': svg(1024, bee(112, 112, 800)),
  'favicon.svg': svg(48, back + bee(40, 48, 960)),
};
for (const [name, content] of Object.entries(files)) writeFileSync(OUT + name, content);
console.log('wrote', Object.keys(files).join(', '));
