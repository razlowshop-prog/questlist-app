// Bizzy the bee, the app's mascot (picked 2026-10-27), as a plain SVG string.
// Plain strings work everywhere: the Android home screen widget draws them
// natively, and the app can show them with react-native-svg's SvgXml.
// 200x200 drawing; every gradient is defined inside, so each string stands alone.

export type BizzyMood = 'happy' | 'excited' | 'proud' | 'worried' | 'sleepy' | 'wave' | 'curious';

/** Extras for the app: where the eyes look (a few units each way) and a blink. */
export interface BizzyLook {
  look?: [number, number];
  blink?: boolean;
}

const INK = '#12151F';
const NAVY = '#2F3650';
const LEG = '#5A6596';
const CHEEK = '#FF8FB1';
const SOFT = '#C9D2F5';

const r1 = (n: number) => Math.round(n * 10) / 10;
const stroke = (w: number) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

function eyeOf(x: number, y: number, r: number, shut = false): string {
  if (shut) return `<path d="M${r1(x - r)} ${y} Q${x} ${r1(y + r * 0.55)} ${r1(x + r)} ${y}" ${stroke(3.2)}/>`;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${r1(x + r * 0.38)}" cy="${r1(y - r * 0.38)}" r="${r1(r * 0.36)}" fill="#fff"/>`;
}

function cheeks(opacity: number): string {
  return `<ellipse cx="70" cy="108" rx="5" ry="3.3" fill="${CHEEK}" opacity="${opacity}"/><ellipse cx="130" cy="108" rx="5" ry="3.3" fill="${CHEEK}" opacity="${opacity}"/>`;
}

function sparkle(x: number, y: number, s: number): string {
  return `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z" fill="#FFE48A"/>`;
}

/** Eyes, brows, mouth and extras for one mood. Eyes sit at y 96, the mouth at y 106; `lx`/`ly` move the eyes to look somewhere. */
function face(mood: BizzyMood, [lx, ly]: [number, number] = [0, 0], shut = false): string {
  const [x1, x2, y, r, my, w] = [82 + lx, 118 + lx, 96 + ly, 7.5, 106, 7];
  const smile = `<path d="M${x1 + 11} ${my} Q100 ${my + w} ${x2 - 11} ${my}" ${stroke(3.2)}/>`;
  const eye = (x: number, ey: number, er: number) => eyeOf(x, ey, er, shut);
  switch (mood) {
    case 'excited': {
      const R = r * 1.18;
      return (
        cheeks(0.7) +
        eye(x1, y, R) +
        eye(x2, y, R) +
        `<path d="M${r1(100 - w * 1.25)} ${my - 1} Q100 ${r1(my + w * 2.3)} ${r1(100 + w * 1.25)} ${my - 1}Z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
        `<ellipse cx="100" cy="${r1(my + w * 0.78)}" rx="${r1(w * 0.5)}" ry="${r1(w * 0.27)}" fill="#FF7A9C"/>` +
        sparkle(164, 72, 7) +
        sparkle(34, 86, 5)
      );
    }
    case 'proud':
      return (
        cheeks(0.85) +
        `<path d="M${x1 - r} ${y + 2} Q${x1} ${y - r} ${x1 + r} ${y + 2}" ${stroke(3.5)}/><path d="M${x2 - r} ${y + 2} Q${x2} ${y - r} ${x2 + r} ${y + 2}" ${stroke(3.5)}/>` +
        `<path d="M${100 - w} ${my + 1} Q101 ${r1(my + w * 0.95)} ${r1(100 + w * 1.3)} ${my - 2}" ${stroke(3.2)}/>`
      );
    case 'worried': {
      const by = r1(y - r - 6);
      return (
        eye(x1, y + 1, r * 0.95) +
        eye(x2, y + 1, r * 0.95) +
        `<path d="M${x1 - 7} ${by + 2} L${x1 + 6} ${by - 3}" ${stroke(3.2)}/><path d="M${x2 + 7} ${by + 2} L${x2 - 6} ${by - 3}" ${stroke(3.2)}/>` +
        `<path d="M${100 - w} ${r1(my + w * 0.7)} Q100 ${r1(my - w * 0.25)} ${100 + w} ${r1(my + w * 0.7)}" ${stroke(3.2)}/>` +
        `<path d="M148 84 Q154 93 148 97 Q142 93 148 84Z" fill="#9FE3FF"/><circle cx="146.5" cy="92" r="1.5" fill="#fff" opacity=".8"/>`
      );
    }
    case 'sleepy':
      return (
        cheeks(0.45) +
        `<path d="M${x1 - r} ${y - 1} Q${x1} ${r1(y + r * 0.75)} ${x1 + r} ${y - 1}" ${stroke(3.5)}/><path d="M${x2 - r} ${y - 1} Q${x2} ${r1(y + r * 0.75)} ${x2 + r} ${y - 1}" ${stroke(3.5)}/>` +
        `<ellipse cx="100" cy="${r1(my + w * 0.35)}" rx="${r1(w * 0.3)}" ry="${r1(w * 0.36)}" fill="${INK}"/>` +
        // "z z z" drawn as paths, so no font is needed.
        `<path d="M150 40 h10 l-10 11 h10 M164 26 h7 l-7 8 h7 M174 15 h5 l-5 6 h5" fill="none" stroke="${SOFT}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    case 'curious':
      return (
        cheeks(0.6) +
        eye(x1, y, r * 1.05) +
        eye(x2, y, r * 1.05) +
        `<path d="M${x2 - 6} ${y - 13} Q${x2} ${y - 17} ${x2 + 7} ${y - 13}" ${stroke(3)}/>` +
        `<ellipse cx="100" cy="${my + 3}" rx="3.2" ry="3.6" fill="${INK}"/>`
      );
    default:
      return cheeks(0.7) + eye(x1, y, r) + eye(x2, y, r) + smile;
  }
}

/**
 * A round hand with a thumb on its left, in the arm's colour, drawn pointing up
 * from (0, 0), then turned to follow the arm's last stretch (from the curve's
 * control point to the hand).
 */
function hand(hx: number, hy: number, cx: number, cy: number): string {
  const turn = r1((Math.atan2(hy - cy, hx - cx) * 180) / Math.PI + 90);
  return (
    `<g transform="translate(${hx} ${hy}) rotate(${turn}) scale(1.3)">` +
    `<ellipse cx="-5.6" cy="-3.2" rx="2.4" ry="3.8" transform="rotate(-38 -5.6 -3.2)" fill="${LEG}"/>` +
    `<circle cx="0" cy="-5" r="5.8" fill="${LEG}"/>` +
    `</g>`
  );
}

/** Arms for the waving mood: left arm resting, right arm up, thumbs towards the body. */
function waveArms(): string {
  const arm = (sx: number, sy: number, cx: number, cy: number, hx: number, hy: number) =>
    `<path d="M${sx} ${sy} Q${cx} ${cy} ${hx} ${hy}" fill="none" stroke="${LEG}" stroke-width="7" stroke-linecap="round"/>` + hand(hx, hy, cx, cy);
  return arm(54, 128, 40, 136, 45, 156) + arm(146, 128, 176, 124, 172, 82);
}

/** Bizzy as a complete SVG document. `shadow` adds the soft ground shadow (off for tiny sizes). */
export function bizzySvg(mood: BizzyMood = 'happy', shadow = true, { look, blink }: BizzyLook = {}): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">` +
    `<defs><linearGradient id="bzg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8"/><stop offset="1" stop-color="#E0A93C"/></linearGradient><clipPath id="bzc"><ellipse cx="100" cy="122" rx="52" ry="54"/></clipPath></defs>` +
    (shadow ? `<ellipse cx="100" cy="186" rx="42" ry="7" fill="#000" opacity=".3"/>` : '') +
    `<ellipse cx="74" cy="70" rx="24" ry="30" fill="#DDF3FF" opacity=".75" transform="rotate(-24 74 70)"/>` +
    `<ellipse cx="126" cy="70" rx="24" ry="30" fill="#DDF3FF" opacity=".75" transform="rotate(24 126 70)"/>` +
    `<path d="M88 60 Q80 40 70 36 M112 60 Q120 40 130 36" fill="none" stroke="${LEG}" stroke-width="3.5" stroke-linecap="round"/>` +
    `<circle cx="70" cy="36" r="5.5" fill="url(#bzg)"/><circle cx="130" cy="36" r="5.5" fill="url(#bzg)"/>` +
    `<ellipse cx="100" cy="122" rx="52" ry="54" fill="url(#bzg)"/>` +
    // Stripes are cut to the body's outline; the top one sits well below the mouth.
    `<g clip-path="url(#bzc)"><path d="M44 130 Q100 114 156 130 L156 144 Q100 128 44 144Z" fill="${NAVY}"/>` +
    `<path d="M44 160 Q100 148 156 160 L156 172 Q100 160 44 172Z" fill="${NAVY}"/></g>` +
    `<path d="M66 96 Q74 82 90 78" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".55"/>` +
    face(mood, look, blink) +
    `<path d="M100 176 L94 186 L106 186Z" fill="${NAVY}"/>` +
    (mood === 'wave' ? waveArms() : '') +
    `</svg>`
  );
}

/**
 * One of Bizzy's hands seen from the front, fingers curled over an edge at the
 * middle of its top: for when he holds on to a card or a field from behind.
 */
export function bizzyGripSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -8 20 16" width="20" height="16">` +
    `<ellipse cx="0" cy="1.5" rx="7.2" ry="5.2" fill="${LEG}"/>` +
    `<circle cx="-4.4" cy="-1.6" r="2.6" fill="${LEG}"/><circle cx="0" cy="-2.4" r="2.7" fill="${LEG}"/><circle cx="4.4" cy="-1.6" r="2.6" fill="${LEG}"/>` +
    `<path d="M-2.2 -1.4 v2.4 M2.2 -1.4 v2.4" stroke="#3E476F" stroke-width=".9" stroke-linecap="round"/></svg>`
  );
}
