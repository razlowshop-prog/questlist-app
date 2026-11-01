// Bizzy the bee, the app's mascot (picked 2026-10-27), as a plain SVG string.
// Plain strings work everywhere: the Android home screen widget draws them
// natively, and the app can show them with react-native-svg's SvgXml.
// 200x200 drawing; every gradient is defined inside, so each string stands alone.
// Bizzy evolves through ten forms (picked 2026-10-28): the young ones are the
// same drawing, smaller, standing on the same ground; the later ones add
// wings, a tuft, goggles, honey and crowns. Every face works in every form.

import { N } from './i18n.ts';

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

function sparkle(x: number, y: number, s: number, color = '#FFE48A'): string {
  return `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z" fill="${color}"/>`;
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

export interface BizzyForm {
  /** 1 to 10; saved in the game state. */
  n: number;
  name: string;
  /** The level the player needs before this form can be evolved into. */
  level: number;
  text: string;
  /** Size against the full-grown drawing; the young forms stand smaller on the same ground. */
  k: number;
  body: 'cream' | 'soft' | 'gold' | 'amber' | 'bright' | 'royal';
  wings: keyof typeof WINGS;
  feelers: 'none' | 'nubs' | 'full';
  /** 0 = faint lines only, 1 = one pale stripe, 2 = both navy stripes. */
  stripes: 0 | 1 | 2;
  extra?: 'fluff' | 'goggles' | 'honey' | 'tiara' | 'queen';
}

const wing = (cx: number, cy: number, rx: number, ry: number, rot: number, color = '#DDF3FF', opacity = 0.75) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${opacity}" transform="rotate(${rot} ${cx} ${cy})"/>`;

type WingSpec = [cx: number, cy: number, rx: number, ry: number, rot: number, color?: string, opacity?: number];
/** The left wings of each kind, back ones first; the right ones are their mirror image. */
const WINGS: Record<'none' | 'buds' | 'normal' | 'big' | 'swift' | 'amber' | 'four' | 'queen', WingSpec[]> = {
  none: [],
  buds: [[80, 78, 12, 16, -24]],
  normal: [[74, 70, 24, 30, -24]],
  big: [[72, 66, 27, 34, -26]],
  swift: [[66, 70, 18, 42, -48, '#CFEFFF', 0.8]],
  amber: [[72, 66, 27, 34, -26, '#FFF1CF', 0.7]],
  four: [
    [54, 88, 26, 34, -42, '#DDF3FF', 0.55],
    [74, 68, 24, 30, -24],
  ],
  queen: [
    [48, 86, 32, 42, -42, '#E6E0FF', 0.6],
    [72, 64, 27, 34, -24, '#F3F0FF', 0.8],
  ],
};

/** One side's wings of a form, in the full-grown drawing's units. */
function wingsOf(f: BizzyForm, side: 'left' | 'right'): string {
  return WINGS[f.wings].map(([cx, cy, rx, ry, rot, color, opacity]) => (side === 'left' ? wing(cx, cy, rx, ry, rot, color, opacity) : wing(200 - cx, cy, rx, ry, -rot, color, opacity))).join('');
}

/** Places a young form, which stands smaller on the same ground; empty for the full-grown size. */
function placeOf(f: BizzyForm): string {
  return f.k === 1 ? '' : `translate(${r1(100 * (1 - f.k))} ${r1(186 * (1 - f.k))}) scale(${f.k})`;
}

/** Body gradient, top to bottom. */
const BODY: Record<BizzyForm['body'], [string, string]> = {
  cream: ['#FFF6DC', '#F2D58E'],
  soft: ['#FFF0C2', '#EBC46A'],
  gold: ['#FFE9A8', '#E0A93C'],
  amber: ['#FFD98A', '#D9822B'],
  bright: ['#FFF2B8', '#E8B23A'],
  royal: ['#FFF4C6', '#E3A12A'],
};

/** Drawn on the head, under the face. */
const EXTRA: Record<NonNullable<BizzyForm['extra']>, string> = {
  fluff: `<g fill="#FFF8EA"><circle cx="92" cy="72" r="7"/><circle cx="100" cy="68" r="8"/><circle cx="108" cy="72" r="7"/><circle cx="97" cy="76" r="6"/><circle cx="104" cy="76" r="6"/></g>`,
  goggles:
    `<path d="M50 84 Q100 70 150 84" fill="none" stroke="#7A4A2A" stroke-width="4"/><g stroke="#7A4A2A" stroke-width="3.5" fill="#BFEAFF" fill-opacity=".85"><circle cx="86" cy="76" r="9"/><circle cx="114" cy="76" r="9"/></g>` +
    `<path d="M95 76 h10" stroke="#7A4A2A" stroke-width="3"/><circle cx="83" cy="73" r="2.4" fill="#fff"/><circle cx="111" cy="73" r="2.4" fill="#fff"/>`,
  honey: `<path d="M80 72 Q100 64 120 72 Q121 79 116 80 Q115 88 111 88 Q107 88 107 81 Q100 83 93 80 Q92 86 88 86 Q84 86 85 79 Q79 78 80 72Z" fill="#E8902A" opacity=".95"/>`,
  tiara: `<path d="M88 72 L92 62 L96 68 L100 58 L104 68 L108 62 L112 72Z" fill="#FFE29A" stroke="#C98A1E" stroke-width="1.5"/><circle cx="100" cy="64" r="2.2" fill="#7FD6FF"/>`,
  queen:
    `<path d="M83 74 L83 54 L91.5 64 L100 50 L108.5 64 L117 54 L117 74Z" fill="#FFD95A" stroke="#C98A1E" stroke-width="1.5"/>` +
    `<circle cx="100" cy="64" r="3" fill="#FF5C8A"/><circle cx="88" cy="68" r="1.8" fill="#7FD6FF"/><circle cx="112" cy="68" r="1.8" fill="#7FD6FF"/>`,
};

/** Honeyguard's badge: on his chest, so a neck outfit takes its place. */
const HONEY_BADGE = `<path d="M100 146 l6.5 3.75 v7.5 l-6.5 3.75 l-6.5 -3.75 v-7.5Z" fill="#FFE29A" stroke="#B8651B" stroke-width="2"/>`;

/**
 * What he wears (outfits.ts): the drawing behind him (a cape) and in front of
 * him (hats, glasses, neckwear), in the full-grown Bizzy's units, and which of
 * his form's own extras an outfit covers: a hat takes the place of his tuft,
 * goggles or crown, a neck piece of the Honeyguard badge, a cape of the
 * Queen's cape.
 */
export interface BizzyOutfit {
  back?: string;
  front?: string;
  covers?: { head?: boolean; neck?: boolean; back?: boolean };
}

/** Bizzy's ten forms, from the tiny Larva to the Queen. The Larva can evolve at level 2 already. */
export const BIZZY_FORMS: BizzyForm[] = [
  { n: 1, name: N('Larva'), level: 1, text: N('Where it all starts: a tiny, pale grub.'), k: 0.56, body: 'cream', wings: 'none', feelers: 'none', stripes: 0 },
  { n: 2, name: N('Bud'), level: 2, text: N('First feelers and a first stripe.'), k: 0.64, body: 'soft', wings: 'none', feelers: 'nubs', stripes: 1 },
  { n: 3, name: N('Buzzling'), level: 5, text: N('Little wing buds. Can almost fly.'), k: 0.74, body: 'gold', wings: 'buds', feelers: 'full', stripes: 2 },
  { n: 4, name: N('Worker'), level: 10, text: N('Real wings. A busy bee now.'), k: 0.84, body: 'gold', wings: 'normal', feelers: 'full', stripes: 2 },
  { n: 5, name: N('Bizzy'), level: 15, text: N('The Bizzy everyone knows, fully grown.'), k: 1, body: 'gold', wings: 'normal', feelers: 'full', stripes: 2 },
  { n: 6, name: N('Fuzzy'), level: 25, text: N('A soft fluffy tuft and bigger wings.'), k: 1, body: 'gold', wings: 'big', feelers: 'full', stripes: 2, extra: 'fluff' },
  { n: 7, name: N('Swift'), level: 35, text: N('Long racing wings and flying goggles.'), k: 1, body: 'gold', wings: 'swift', feelers: 'full', stripes: 2, extra: 'goggles' },
  { n: 8, name: N('Honeyguard'), level: 50, text: N('Glows like honey, with the honeycomb badge.'), k: 1, body: 'amber', wings: 'amber', feelers: 'full', stripes: 2, extra: 'honey' },
  { n: 9, name: N('Royal'), level: 65, text: N('A second pair of wings and a tiara.'), k: 1, body: 'bright', wings: 'four', feelers: 'full', stripes: 2, extra: 'tiara' },
  { n: 10, name: N('Queen'), level: 80, text: N('Crown, cape and four great wings. The end goal.'), k: 1, body: 'royal', wings: 'queen', feelers: 'full', stripes: 2, extra: 'queen' },
];

/** A saved form number, kept to 1..10 (a missing or broken value is the Larva). */
export function bizzyFormOf(n: unknown): BizzyForm {
  const i = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 1;
  return BIZZY_FORMS[Math.max(1, Math.min(BIZZY_FORMS.length, i)) - 1];
}

/** The form Bizzy evolves into next, if he isn't the Queen yet. */
export function nextBizzyForm(form: number): BizzyForm | undefined {
  return BIZZY_FORMS[bizzyFormOf(form).n];
}

/** Whether the player's level allows the next evolution now. */
export function canEvolve(form: number, level: number): boolean {
  const next = nextBizzyForm(form);
  return !!next && level >= next.level;
}

/**
 * Where a form's chin and middle are, as shares of his box from the top: the
 * line that sits on an edge when he peeks over it, and the centre of his body.
 */
export function bizzyEdge(form: number): number {
  return (186 - 72 * bizzyFormOf(form).k) / 200;
}
export function bizzyMiddle(form: number): number {
  return (186 - 64 * bizzyFormOf(form).k) / 200;
}

/**
 * Bizzy as a complete SVG document. `shadow` adds the soft ground shadow (off
 * for tiny sizes). `form` is how far he has evolved (the full Bizzy, form 5,
 * unless said otherwise). Ids carry the form, so different forms can share a
 * page; the same form draws the same gradients, so repeats don't matter.
 */
export function bizzySvg(
  mood: BizzyMood = 'happy',
  shadow = true,
  { look, blink, form = 5, wings = true, outfit }: BizzyLook & { form?: number; wings?: boolean; outfit?: BizzyOutfit } = {},
): string {
  const f = bizzyFormOf(form);
  const g = `bzg${f.n}`;
  const c = `bzc${f.n}`;
  const [top, bottom] = BODY[f.body];
  const at = placeOf(f);
  const feelers =
    f.feelers === 'full'
      ? `<path d="M88 60 Q80 40 70 36 M112 60 Q120 40 130 36" fill="none" stroke="${LEG}" stroke-width="3.5" stroke-linecap="round"/><circle cx="70" cy="36" r="5.5" fill="url(#${g})"/><circle cx="130" cy="36" r="5.5" fill="url(#${g})"/>`
      : f.feelers === 'nubs'
        ? `<path d="M90 70 Q86 60 82 57 M110 70 Q114 60 118 57" fill="none" stroke="${LEG}" stroke-width="3.5" stroke-linecap="round"/><circle cx="82" cy="57" r="4" fill="url(#${g})"/><circle cx="118" cy="57" r="4" fill="url(#${g})"/>`
        : '';
  // Stripes are cut to the body's outline; the top one sits well below the mouth.
  const stripes =
    f.stripes === 0
      ? `<g clip-path="url(#${c})" fill="none" stroke="#E5C27A" stroke-width="2.5" opacity=".8"><path d="M44 134 Q100 120 156 134"/><path d="M44 156 Q100 144 156 156"/></g>`
      : f.stripes === 1
        ? `<g clip-path="url(#${c})"><path d="M44 134 Q100 118 156 134 L156 146 Q100 132 44 146Z" fill="${NAVY}" opacity=".55"/></g>`
        : `<g clip-path="url(#${c})"><path d="M44 130 Q100 114 156 130 L156 144 Q100 128 44 144Z" fill="${NAVY}"/><path d="M44 160 Q100 148 156 160 L156 172 Q100 160 44 172Z" fill="${NAVY}"/></g>`;
  const covers = outfit?.covers ?? {};
  const cape = f.extra === 'queen' && !covers.back ? `<path d="M58 104 Q100 92 142 104 L160 182 Q100 196 40 182Z" fill="#6A3FC8"/><path d="M58 104 Q100 92 142 104" fill="none" stroke="#FFD95A" stroke-width="4"/>` : '';
  const body =
    (wings ? wingsOf(f, 'left') + wingsOf(f, 'right') : '') +
    feelers +
    cape +
    (outfit?.back ?? '') +
    // The stinger (picked 2026-11-01, 4A): a clear cone pointing down from behind the body,
    // with a thin light rim so it doesn't melt into the shadow.
    `<path d="M90 168 Q100 177 110 168 L100 194Z" fill="${NAVY}" stroke="#FFE7A3" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<ellipse cx="100" cy="122" rx="52" ry="54" fill="url(#${g})"/>` +
    stripes +
    `<path d="M66 96 Q74 82 90 78" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".55"/>` +
    (f.extra && !covers.head ? EXTRA[f.extra] : '') +
    (f.extra === 'honey' && !covers.neck ? HONEY_BADGE : '') +
    face(mood, look, blink) +
    (mood === 'wave' ? waveArms() : '') +
    (outfit?.front ?? '');
  // Honeyguard glows amber, the Queen violet.
  const glow = f.extra === 'queen' ? ['#B9A6FF', 88, 110] : f.body === 'amber' ? ['#FFB347', 78, 116] : undefined;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">` +
    `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>` +
    (glow ? `<radialGradient id="bza${f.n}"><stop offset="0" stop-color="${glow[0]}" stop-opacity=".45"/><stop offset="1" stop-color="${glow[0]}" stop-opacity="0"/></radialGradient>` : '') +
    `<clipPath id="${c}"><ellipse cx="100" cy="122" rx="52" ry="54"/></clipPath></defs>` +
    (glow ? `<circle cx="100" cy="${glow[2]}" r="${glow[1]}" fill="url(#bza${f.n})"/>` : '') +
    (shadow ? `<ellipse cx="100" cy="192" rx="${r1(42 * Math.max(f.k, 0.7))}" ry="7" fill="#000" opacity=".3"/>` : '') +
    (at ? `<g transform="${at}">${body}</g>` : body) +
    (f.n >= 9 ? sparkle(30, 140, 6) + sparkle(172, 128, 5) + sparkle(160, 40, 4, SOFT) : '') +
    `</svg>`
  );
}

/**
 * One side's wings on their own, as a full 200x200 drawing to lay behind
 * `bizzySvg(..., { wings: false })` so they can flap; empty for the forms
 * without wings.
 */
export function bizzyWingsSvg(form: number, side: 'left' | 'right'): string {
  const f = bizzyFormOf(form);
  const drawn = wingsOf(f, side);
  if (!drawn) return '';
  const at = placeOf(f);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">` + (at ? `<g transform="${at}">${drawn}</g>` : drawn) + `</svg>`;
}

/** Where one side's wings join his back, as shares of his box (left, top): they flap around this point. */
export function bizzyWingRoot(form: number, side: 'left' | 'right'): [number, number] {
  const k = bizzyFormOf(form).k;
  const x = side === 'left' ? 92 : 108;
  return [(100 * (1 - k) + x * k) / 200, (186 * (1 - k) + 90 * k) / 200];
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

/**
 * The honey cocoon he evolves in, sized to wrap `form`: one half (left or
 * right, split along a zigzag so they burst apart), or the glowing crack
 * along that zigzag. Each is a full 200x200 drawing, to lay over Bizzy.
 */
export function cocoonSvg(form: number, part: 'left' | 'right' | 'crack'): string {
  const k = bizzyFormOf(form).k;
  const rx = r1(58 * k + 10);
  const ry = r1(68 * k + 10);
  const my = bizzyMiddle(form) * 200;
  const top = r1(my - ry);
  const bottom = r1(my + ry);
  const zig = Array.from({ length: 9 }, (_, i) => `${i % 2 ? 106 : 94} ${r1(bottom - (i * (bottom - top)) / 8)}`).join(' L');
  const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">`;
  if (part === 'crack') return open + `<path d="M${zig}" fill="none" stroke="#FFF7D6" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
  const side = part === 'left' ? -1 : 1;
  // Silk wrapped round the cocoon, in three bands.
  const silk = [0.3, 0.5, 0.7]
    .map((p) => {
      const y = top + (bottom - top) * p;
      return `<path d="M100 ${r1(y + 4)} Q${r1(100 + side * rx * 0.6)} ${r1(y - 8)} ${r1(100 + side * rx * 0.95)} ${r1(y + 2)}" fill="none" stroke="#FFE7B0" stroke-width="2.4" opacity=".6"/>`;
    })
    .join('');
  return (
    open +
    `<defs><linearGradient id="bzk${part}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD67A"/><stop offset="1" stop-color="#C9741F"/></linearGradient></defs>` +
    `<path d="M100 ${top} A${rx} ${ry} 0 0 ${part === 'left' ? 0 : 1} 100 ${bottom} L${zig}Z" fill="url(#bzk${part})"/>` +
    silk +
    `</svg>`
  );
}
