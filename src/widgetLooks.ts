// Bizzy's moods for the home screen widget (picked 2026-11-01): several looks
// per mood, drawn as plain SVG strings from the real Bizzy (bizzy.ts) with his
// face swapped, so every look works in all ten forms. The preview page with
// all of them: https://claude.ai/artifact/VsjwfuNRkg2d8yWs4LMucx

import { bizzySvg } from './bizzy.ts';

const INK = '#12151F';
const LEG = '#5A6596';
const CHEEK = '#FF8FB1';
const SOFT = '#C9D2F5';
const TEAR = '#9FE3FF';
const GOLD = '#FFD95A';
const RED = '#FF5A6E';

const S = (w = 3.2) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const L = (d: string, w = 3.2) => `<path d="${d}" ${S(w)}/>`;

// ---- eyes -----------------------------------------------------------------
const dot = (x: number, y: number, r = 7.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + r * 0.38}" cy="${y - r * 0.38}" r="${r * 0.36}" fill="#fff"/>`;
const eyes = (r = 7.5, dx = 0, dy = 0) => dot(82 + dx, 96 + dy, r) + dot(118 + dx, 96 + dy, r);
/** Half-closed: the bottom half of the eye under a flat lid. */
const lid = (x: number, y: number, r = 7.5) => `<path d="M${x - r} ${y} A${r} ${r} 0 0 0 ${x + r} ${y}Z" fill="${INK}"/><circle cx="${x + 2.6}" cy="${y + 2.4}" r="1.8" fill="#fff"/>` + L(`M${x - r - 1.5} ${y} L${x + r + 1.5} ${y}`, 3.4);
const lids = (dx = 0, dy = 0) => lid(82 + dx, 96 + dy) + lid(118 + dx, 96 + dy);
const closedDown = () => L('M75 95 Q82 101 89 95', 3.5) + L('M111 95 Q118 101 125 95', 3.5); // asleep
const closedUp = () => L('M75 98 Q82 90 89 98', 3.5) + L('M111 98 Q118 90 125 98', 3.5); // content ^^
const squeeze = () => L('M76 90 L87 96 L76 102', 3.4) + L('M124 90 L113 96 L124 102', 3.4); // > <
const wide = (p = 3.2) => `<circle cx="82" cy="96" r="9.5" fill="#fff" stroke="${INK}" stroke-width="2.6"/><circle cx="118" cy="96" r="9.5" fill="#fff" stroke="${INK}" stroke-width="2.6"/><circle cx="82" cy="97" r="${p}" fill="${INK}"/><circle cx="118" cy="97" r="${p}" fill="${INK}"/>`;
const spiral = (x: number, y: number) => L(`M${x} ${y} m-1 0 a1.5 1.5 0 1 1 3 0 a3 3 0 1 1 -6 0 a4.5 4.5 0 1 1 9 0 a6 6 0 1 1 -12 0`, 2.4);
const shiny = (r = 9) => dot(82, 96, r) + dot(118, 96, r) + `<circle cx="79" cy="99" r="1.6" fill="#fff"/><circle cx="115" cy="99" r="1.6" fill="#fff"/>`;

// ---- brows ----------------------------------------------------------------
const browsWorried = (y = 0) => L(`M74 ${86 + y} L88 ${81 + y}`) + L(`M126 ${86 + y} L112 ${81 + y}`);
const browsCross = () => L('M74 81 L89 86') + L('M126 81 L111 86');
const browRaised = () => L('M109 80 Q118 73 128 79');
const browsHigh = () => L('M72 81 Q82 73 92 80') + L('M108 80 Q118 73 128 81');
const browFlat = () => L('M73 84 L90 84');

// ---- mouths ---------------------------------------------------------------
const smile = () => L('M93 106 Q100 113 107 106');
const bigSmile = () => `<path d="M91 105 Q100 122 109 105Z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="100" cy="111.5" rx="3.5" ry="1.9" fill="#FF7A9C"/>`;
const flat = () => L('M93 109 L107 109');
const frown = () => L('M93 111 Q100 104 107 111');
const wobble = () => L('M91 110 Q95 106 98 109 Q101 112 104 108 Q107 105 109 109', 3);
const yawn = () => `<ellipse cx="100" cy="111" rx="5.5" ry="7.5" fill="${INK}"/><ellipse cx="100" cy="115" rx="3.2" ry="2.4" fill="#FF7A9C"/>`;
const wail = () => `<path d="M88 117 Q100 99 112 117Z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="100" cy="114.5" rx="4" ry="2" fill="#FF7A9C"/>`;
const scream = () => `<ellipse cx="100" cy="113" rx="6.5" ry="8.5" fill="${INK}" stroke="#FFE7A3" stroke-width="1.2"/><ellipse cx="100" cy="117.5" rx="3.6" ry="2.6" fill="#FF7A9C"/>`;
const smirk = () => L('M94 110 Q104 111 110 103');
const ooh = () => `<ellipse cx="100" cy="110" rx="3.2" ry="3.8" fill="${INK}"/>`;
const firm = () => L('M94 107 Q100 110 106 107');

const cheeks = (o = 0.7) => `<ellipse cx="70" cy="108" rx="5" ry="3.3" fill="${CHEEK}" opacity="${o}"/><ellipse cx="130" cy="108" rx="5" ry="3.3" fill="${CHEEK}" opacity="${o}"/>`;

// ---- arms -----------------------------------------------------------------
function hand(hx: number, hy: number, cx: number, cy: number): string {
  const turn = Math.round((Math.atan2(hy - cy, hx - cx) * 180) / Math.PI + 90);
  return `<g transform="translate(${hx} ${hy}) rotate(${turn}) scale(1.3)"><ellipse cx="-5.6" cy="-3.2" rx="2.4" ry="3.8" transform="rotate(-38 -5.6 -3.2)" fill="${LEG}"/><circle cx="0" cy="-5" r="5.8" fill="${LEG}"/></g>`;
}
const arm = (sx: number, sy: number, cx: number, cy: number, hx: number, hy: number) =>
  `<path d="M${sx} ${sy} Q${cx} ${cy} ${hx} ${hy}" fill="none" stroke="${LEG}" stroke-width="7" stroke-linecap="round"/>` + hand(hx, hy, cx, cy);
const restL = () => arm(54, 128, 40, 136, 45, 156);
const restR = () => arm(146, 128, 160, 136, 155, 156);
const waveR = () => arm(146, 128, 176, 124, 172, 82);
const ARMS = {
  wave: () => restL() + waveR(),
  stretch: () => arm(54, 124, 30, 104, 40, 62) + arm(146, 124, 170, 104, 160, 62),
  crossed: () => arm(54, 130, 78, 160, 128, 146) + arm(146, 130, 122, 162, 72, 148),
  cheeks: () => arm(54, 130, 34, 120, 60, 112) + arm(146, 130, 166, 120, 140, 112),
  belly: () => arm(54, 130, 56, 160, 84, 160) + arm(146, 130, 144, 160, 116, 160),
  front: () => arm(54, 130, 58, 160, 82, 156) + arm(146, 130, 142, 160, 118, 156),
  forehead: () => restL() + arm(146, 126, 182, 92, 128, 78),
  fist: () => restL() + arm(146, 128, 180, 118, 170, 84),
  point: () => arm(54, 128, 30, 116, 22, 100) + restR(),
  sideHold: () => restL() + arm(146, 128, 168, 152, 160, 144),
  rest: () => restL() + restR(),
  thumb: () => restL() + arm(146, 128, 172, 132, 168, 104),
};

// ---- props ----------------------------------------------------------------
const sparkle = (x: number, y: number, s: number, c = '#FFE48A') => `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z" fill="${c}"/>`;
const sun = (x = 34, y = 50) => `<g>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M${x} ${y - 17} L${x} ${y - 23}" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="12" fill="${GOLD}"/></g>`;
const halfSun = () => `<path d="M8 196 A30 30 0 0 1 68 196Z" fill="#FFB347"/>` + [-60, -30, 0, 30, 60].map((a) => `<path d="M38 158 L38 150" stroke="#FFB347" stroke-width="3.5" stroke-linecap="round" transform="rotate(${a} 38 196)"/>`).join('');
const moon = (x = 166, y = 46, r = 15) => `<path d="M${x} ${y - r} A${r} ${r} 0 1 0 ${x + r} ${y + 4} A${r * 0.8} ${r * 0.8} 0 0 1 ${x} ${y - r}Z" fill="#FFE7A3"/>`;
const stars = () => sparkle(30, 44, 5, SOFT) + sparkle(48, 24, 3.5, SOFT) + sparkle(186, 92, 4, SOFT);
const zzz = (x = 150, y = 40) => `<path d="M${x} ${y} h10 l-10 11 h10 M${x + 14} ${y - 14} h7 l-7 8 h7 M${x + 24} ${y - 25} h5 l-5 6 h5" fill="none" stroke="${SOFT}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
const sweat = (x = 148, y = 84) => `<path d="M${x} ${y} Q${x + 6} ${y + 9} ${x} ${y + 13} Q${x - 6} ${y + 9} ${x} ${y}Z" fill="${TEAR}"/>`;
const tear = (x: number, y: number) => `<path d="M${x} ${y} Q${x + 4.5} ${y + 7} ${x} ${y + 10} Q${x - 4.5} ${y + 7} ${x} ${y}Z" fill="${TEAR}"/>`;
const rivers = () => `<path d="M80 104 Q74 130 80 150 Q84 166 76 182" fill="none" stroke="${TEAR}" stroke-width="6" stroke-linecap="round" opacity=".9"/><path d="M120 104 Q126 130 120 150 Q116 166 124 182" fill="none" stroke="${TEAR}" stroke-width="6" stroke-linecap="round" opacity=".9"/>`;
const puddle = () => `<ellipse cx="100" cy="193" rx="62" ry="6" fill="${TEAR}" opacity=".55"/>`;
const shake = () => L('M30 100 Q24 110 30 120 M22 96 Q14 110 22 124 M170 100 Q176 110 170 120 M178 96 Q186 110 178 124', 2.6).replaceAll(INK, SOFT);
const bang = (x = 170, y = 40) => `<path d="M${x} ${y} L${x - 2} ${y + 22} M${x + 12} ${y + 2} L${x + 9} ${y + 24}" stroke="${RED}" stroke-width="5" stroke-linecap="round"/><circle cx="${x - 2.5}" cy="${y + 31}" r="3" fill="${RED}"/><circle cx="${x + 8.5}" cy="${y + 33}" r="3" fill="${RED}"/>`;
const tissue = (x = 160, y = 140) => `<path d="M${x - 9} ${y} Q${x - 12} ${y - 14} ${x} ${y - 16} Q${x + 12} ${y - 14} ${x + 9} ${y} Q${x} ${y + 6} ${x - 9} ${y}Z" fill="#fff" stroke="${SOFT}" stroke-width="1.5"/>`;
const mug = (x = 168, y = 132, c = '#FFB347') => `<path d="M${x + 11} ${y + 4} q8 0 8 7 q0 7 -8 7" fill="none" stroke="#E8EBF5" stroke-width="3.5"/><rect x="${x - 11}" y="${y}" width="22" height="24" rx="5" fill="#E8EBF5"/><rect x="${x - 11}" y="${y + 6}" width="22" height="5" fill="${c}"/><path d="M${x - 4} ${y - 4} q-4 -6 0 -12 M${x + 4} ${y - 4} q-4 -6 0 -12" fill="none" stroke="${SOFT}" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>`;
const clipboard = (x = 164, y = 118) => `<rect x="${x - 15}" y="${y}" width="30" height="40" rx="4" fill="#C8A16A"/><rect x="${x - 11}" y="${y + 5}" width="22" height="31" rx="2" fill="#fff"/><rect x="${x - 6}" y="${y - 3}" width="12" height="7" rx="2" fill="${LEG}"/>` + L(`M${x - 7} ${y + 12} l3 3 l5 -6 M${x - 7} ${y + 22} h14 M${x - 7} ${y + 29} h14`, 2);
const tally = (x = 164, y = 118) => `<rect x="${x - 15}" y="${y}" width="30" height="40" rx="4" fill="#C8A16A"/><rect x="${x - 11}" y="${y + 5}" width="22" height="31" rx="2" fill="#fff"/><rect x="${x - 6}" y="${y - 3}" width="12" height="7" rx="2" fill="${LEG}"/>` + `<path d="M${x - 7} ${y + 11} v10 M${x - 3} ${y + 11} v10 M${x + 1} ${y + 11} v10 M${x + 5} ${y + 11} v10 M${x - 9} ${y + 19} L${x + 7} ${y + 13}" stroke="${RED}" stroke-width="2" stroke-linecap="round"/>` + L(`M${x - 7} ${y + 29} h14`, 2);
const watch = () => `<circle cx="62" cy="114" r="7" fill="#fff" stroke="${INK}" stroke-width="2"/>` + L('M62 114 v-4 M62 114 h3', 1.6);
const nightcap = () => `<path d="M58 92 Q62 50 104 46 Q146 44 174 100 Q152 74 142 92 Q100 68 58 92Z" fill="#6A5BFF"/><path d="M58 92 Q100 68 142 92" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><circle cx="174" cy="102" r="7.5" fill="#fff"/>`;
const partyHat = () => `<g transform="rotate(14 100 70)"><path d="M80 74 L100 18 L120 74 Q100 67 80 74Z" fill="#FF6FA8"/><path d="M86 58 L114 58 M92 41 L108 41" stroke="${GOLD}" stroke-width="5"/><circle cx="100" cy="17" r="6" fill="${GOLD}"/></g>`;
const cake = () => `<rect x="74" y="140" width="52" height="26" rx="5" fill="#FFF1D6"/><path d="M74 148 Q80 156 87 148 Q93 156 100 148 Q107 156 113 148 Q120 156 126 148 L126 144 Q126 140 122 140 L78 140 Q74 140 74 144Z" fill="#FF6FA8"/><rect x="97" y="124" width="6" height="16" rx="2" fill="#7FD6FF"/><path d="M100 112 Q106 120 100 124 Q94 120 100 112Z" fill="#FFB347"/>`;
const balloons = () => `<path d="M168 104 Q160 80 166 58 M168 104 Q182 84 186 72" fill="none" stroke="${SOFT}" stroke-width="1.6"/><ellipse cx="164" cy="44" rx="13" ry="16" fill="#FF6FA8"/><ellipse cx="188" cy="58" rx="11" ry="14" fill="#7FD6FF"/><circle cx="160" cy="38" r="3" fill="#fff" opacity=".5"/>`;
const confetti = () => [[26, 40, '#FF6FA8', 20], [46, 22, '#7FD6FF', -30], [150, 26, GOLD, 40], [178, 50, '#B9A6FF', -10], [20, 92, GOLD, 60], [184, 120, '#FF6FA8', 15], [34, 150, '#7FD6FF', -45]].map(([x, y, c, a]) => `<rect x="${x}" y="${y}" width="8" height="4" rx="1" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`).join('');
const gift = (x = 160, y = 134) => `<rect x="${x - 15}" y="${y}" width="30" height="26" rx="3" fill="#B9A6FF"/><rect x="${x - 17}" y="${y - 7}" width="34" height="9" rx="2" fill="#9A85FF"/><rect x="${x - 3}" y="${y - 7}" width="6" height="33" fill="${GOLD}"/><path d="M${x} ${y - 7} q-12 -12 -14 -2 q2 4 14 2 q12 -12 14 -2 q-2 4 -14 2" fill="${GOLD}"/>`;
const shades = () => `<rect x="68" y="88" width="27" height="15" rx="6" fill="${INK}"/><rect x="105" y="88" width="27" height="15" rx="6" fill="${INK}"/>` + L('M95 93 L105 93', 3) + `<path d="M72 92 L80 92" stroke="#fff" stroke-width="2" opacity=".5" stroke-linecap="round"/><path d="M109 92 L117 92" stroke="#fff" stroke-width="2" opacity=".5" stroke-linecap="round"/>`;
const pillow = () => `<rect x="34" y="166" width="132" height="26" rx="13" fill="#E8EBF5" opacity=".95"/>`;
const blanket = () => `<path d="M40 150 Q100 136 160 150 L162 190 Q100 198 38 190Z" fill="#6A5BFF"/><path d="M40 150 Q100 136 160 150" fill="none" stroke="#B9A6FF" stroke-width="4"/>`;
const bubble = () => `<circle cx="112" cy="116" r="7" fill="${TEAR}" opacity=".55" stroke="#fff" stroke-width="1"/>`;
const sofa = () => `<rect x="18" y="150" width="164" height="34" rx="12" fill="#B23A5E"/><rect x="10" y="134" width="22" height="50" rx="10" fill="#C94A70"/><rect x="168" y="134" width="22" height="50" rx="10" fill="#C94A70"/>`;
const heart = (x: number, y: number, s = 1, c = '#FF6FA8') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4 C-6 -4 -14 2 0 12 C14 2 6 -4 0 4Z" fill="${c}"/>`;
const motion = () => `<path d="M184 74 l8 -4 M186 88 l9 0 M182 100 l8 4" stroke="${SOFT}" stroke-width="2.6" stroke-linecap="round"/>`;

// ---- assembling -----------------------------------------------------------
/** Bizzy's happy face as bizzySvg draws it, to swap for another face in every form. */
function happyFace(svg: string): string {
  const a = svg.indexOf('<ellipse cx="70" cy="108"');
  const m = svg.indexOf('<path d="M93 106 Q100 113 107 106"');
  if (a < 0 || m < 0) throw new Error('happy face not found');
  return svg.slice(a, svg.indexOf('/>', m) + 2);
}
interface Look {
  face: string;
  /** Drawn behind Bizzy (sun, moon, pillow, sofa), outside his body group. */
  back?: string;
  /** Drawn on top of him, outside his body group (so it is not scaled with the young forms). */
  top?: string;
  /** Tilt the whole bee (degrees). */
  tilt?: number;
  /** Lower him, e.g. lying on a pillow. */
  drop?: number;
}
function bee(form: number, look: Look): string {
  const svg = bizzySvg('happy', !look.back?.includes('rx="13"'), { form });
  const f = happyFace(svg);
  let out = svg.replace(f, look.face);
  if (look.tilt || look.drop) {
    const open = out.indexOf('</defs>') + 7;
    out = out.slice(0, open) + `<g transform="translate(0 ${look.drop ?? 0}) rotate(${look.tilt ?? 0} 100 130)">` + out.slice(open, out.lastIndexOf('</svg>')) + '</g></svg>';
  }
  if (look.back) {
    const open = out.indexOf('</defs>') + 7;
    out = out.slice(0, open) + look.back + out.slice(open);
  }
  if (look.top) out = out.replace(/<\/svg>$/, look.top + '</svg>');
  return out;
}

// Each option: what he looks like, plus the widget's words.
type Opt = { id: string; name: string; note: string; look: Look; rec?: boolean };

const MOODS = {
  morning: [
    { id: 'A', name: 'Big stretch', note: 'Arms up, one eye still shut, mid-yawn. The sun peeks in.', rec: true, look: { face: cheeks(0.5) + L('M75 96 Q82 101 89 96', 3.5) + lid(118, 96) + yawn() + ARMS.stretch(), back: sun() } },
    { id: 'B', name: 'Honey coffee', note: 'Holds a steaming honey mug, wide awake and smiling.', look: { face: cheeks() + eyes() + smile() + ARMS.sideHold() + mug(), back: sun() } },
    { id: 'C', name: 'Sunrise wave', note: 'Waves good morning in front of a warm sunrise glow.', look: { face: cheeks() + eyes() + bigSmile() + ARMS.wave(), back: halfSun() } },
  ],
  hello: [
    { id: 'A', name: 'Wave', note: 'The friendly wave from today’s widget.', rec: true, look: { face: cheeks() + eyes() + smile() + ARMS.wave() } },
    { id: 'B', name: 'Peek', note: 'Looks over to your task count, curious.', look: { face: cheeks(0.6) + eyes(7.8, -5, 0) + L('M107 81 Q113 77 120 81') + ooh() + ARMS.rest() } },
    { id: 'C', name: 'Hearts', note: 'Happy to see you, little hearts float up.', look: { face: cheeks(0.85) + closedUp() + bigSmile() + ARMS.rest(), top: heart(160, 50, 1.1) + heart(176, 74, 0.8, '#FFB1CB') } },
  ],
  todo: [
    { id: 'A', name: 'Clipboard', note: 'Focused brows, holding today’s list with the first tick on it.', rec: true, look: { face: cheeks(0.5) + eyes() + browsCross() + firm() + ARMS.sideHold() + clipboard(164, 118) } },
    { id: 'B', name: 'Points at it', note: 'Points at the number of tasks left: "these ones!"', look: { face: cheeks() + eyes(7.5, -3, 0) + bigSmile() + ARMS.point() } },
    { id: 'C', name: 'Let’s go', note: 'Fist up, ready to go, a little whoosh.', look: { face: cheeks() + eyes() + browsCross() + bigSmile() + ARMS.fist(), top: motion() } },
  ],
  judgy: [
    { id: 'A', name: 'Side-eye', note: 'Half-closed eyes slide to the side, flat mouth, one brow up. Says nothing. Says everything.', rec: true, look: { face: lids(5, 0) + browRaised() + browFlat() + flat() + ARMS.rest() } },
    { id: 'B', name: 'Arms crossed', note: 'Crossed arms, raised brow, tight little mouth.', look: { face: lids() + browRaised() + L('M95 109 Q100 107 105 109') + ARMS.crossed() } },
    { id: 'C', name: 'Tally sheet', note: 'Holds a clipboard full of red tally marks and taps it.', look: { face: lids(-2, 0) + browRaised() + flat() + ARMS.sideHold() + tally(164, 118) } },
    { id: 'D', name: 'Checks his watch', note: 'Looks at his wrist watch, then at you.', look: { face: lids(-4, 2) + browRaised() + flat() + arm(54, 128, 44, 140, 64, 118) + watch() + restR() } },
  ],
  evening: [
    { id: 'A', name: 'Moon and tea', note: 'Relaxed half-closed eyes, a cup of tea, the moon is up.', rec: true, look: { face: cheeks(0.6) + lids() + smile() + ARMS.sideHold() + mug(168, 132, '#9FE3FF'), back: moon(36, 44, 13) } },
    { id: 'C', name: 'Evening wave', note: 'A calm wave with the moon behind him.', look: { face: cheeks() + eyes() + smile() + ARMS.wave(), back: moon(36, 44, 13) } },
  ],
  done: [
    { id: 'A', name: 'Happy', note: 'Big smile, sparkles, thumbs up.', look: { face: cheeks() + eyes(8.8) + bigSmile() + ARMS.thumb(), top: sparkle(36, 70, 7) + sparkle(170, 40, 6) } },
    { id: 'B', name: 'Smirk', note: 'Half-closed eyes, raised brow, a sly smirk: "too easy."', look: { face: cheeks(0.5) + lids() + browRaised() + smirk() + ARMS.crossed() } },
    { id: 'C', name: 'Satisfied', note: 'Eyes closed, content smile, hands on his full belly.', look: { face: cheeks(0.85) + closedUp() + smile() + ARMS.belly() } },
    { id: 'D', name: 'Cool shades', note: 'Sunglasses on, smirk, sparkle on the lens.', look: { face: cheeks(0.5) + shades() + smirk() + ARMS.thumb(), top: sparkle(124, 86, 5, '#fff') } },
  ],
  night: [
    { id: 'A', name: 'Sleepy', note: 'Nightcap on, drooping eyes, yawning, zzz.', look: { face: cheeks(0.4) + lids(0, 1) + yawn() + nightcap() + ARMS.rest(), top: zzz(150, 40) } },
    { id: 'B', name: 'Fast asleep', note: 'Asleep on a pillow, eyes shut, a sleep bubble, moon and stars.', look: { face: cheeks(0.5) + closedDown() + bubble() + nightcap(), back: pillow() + moon(36, 44, 13) + stars(), top: zzz(148, 52), tilt: -8, drop: 8 } },
    { id: 'C', name: 'Teddy hug', note: 'Asleep hugging a tiny honey-pot pillow.', look: { face: cheeks(0.5) + closedDown() + L('M96 109 Q100 111 104 109', 2.6) + ARMS.front() + `<rect x="78" y="140" width="44" height="26" rx="12" fill="#FFB347"/><path d="M84 148 h32" stroke="#C47A1E" stroke-width="3" stroke-linecap="round"/>`, back: moon(166, 40, 13) + stars(), top: zzz(150, 40) } },
    { id: 'D', name: 'Cozy blanket', note: 'Wrapped in a blanket, soft smile.', look: { face: cheeks(0.6) + closedUp() + smile() + blanket(), back: moon(166, 40, 13) + stars() } },
  ],
  birthday: [
    { id: 'A', name: 'Cake', note: 'Party hat, holding a cake with one candle.', rec: true, look: { face: cheeks(0.85) + eyes(8.5) + bigSmile() + partyHat() + ARMS.front() + cake() } },
    { id: 'B', name: 'Balloons', note: 'Party hat, a bunch of balloons and confetti.', look: { face: cheeks() + closedUp() + bigSmile() + partyHat() + restL() + arm(146, 128, 170, 120, 168, 104), back: confetti(), top: balloons() } },
    { id: 'C', name: 'A gift for you', note: 'Holds out a wrapped present (tapping it could open a small birthday reward).', look: { face: cheeks() + eyes(8.2) + bigSmile() + partyHat() + ARMS.sideHold() + gift(162, 136), back: confetti() } },
  ],
} satisfies Record<string, Opt[]>;

// The late-and-unfinished ladder: four steps, getting more dramatic. Three routes.
type Route = { name: string; note: string; rec?: boolean; steps: { name: string; look: Look }[] };
const LADDER = {
  sad: {
    name: 'Sad route',
    note: 'Gets sadder: pout, teary eyes, crying, then sobbing into a puddle.',
    steps: [
      { name: 'Pout', look: { face: cheeks(0.4) + eyes() + browsWorried() + frown() + ARMS.rest() } },
      { name: 'Teary', look: { face: shiny(9) + browsWorried() + wobble() + tear(76, 104) + ARMS.rest() } },
      { name: 'Crying', look: { face: squeeze() + browsWorried(-2) + wail() + rivers() + ARMS.rest() } },
      { name: 'Sobbing puddle', look: { face: squeeze() + browsWorried(-3) + wail() + rivers() + ARMS.sideHold() + tissue(162, 140), back: puddle(), top: tear(40, 120) + tear(166, 96) } },
    ],
  },
  scared: {
    name: 'Scared route',
    note: 'Gets more scared: nervous, sweating, shaking, then screaming with his hands on his face.',
    steps: [
      { name: 'Nervous', look: { face: eyes() + browsWorried() + L('M93 109 Q96 106 100 109 Q104 112 107 109', 3) + ARMS.rest() } },
      { name: 'Sweating', look: { face: eyes(7) + browsWorried() + frown() + sweat() + sweat(52, 78) + ARMS.rest() } },
      { name: 'Shaking', look: { face: wide(3) + browsHigh() + wobble() + sweat() + sweat(52, 78) + ARMS.rest(), top: shake() } },
      { name: 'Screaming', look: { face: wide(2.4) + browsHigh() + scream() + ARMS.cheeks(), top: shake() + bang(166, 26) } },
    ],
  },
  drama: {
    name: 'Drama queen',
    note: 'Mixes both and ends in full theatre: nervous, teary, panicking, then fainting onto a sofa.',
    rec: true,
    steps: [
      { name: 'Nervous', look: { face: eyes() + browsWorried() + L('M93 109 Q96 106 100 109 Q104 112 107 109', 3) + ARMS.rest(), top: watch() } },
      { name: 'Teary', look: { face: shiny(9) + browsWorried() + wobble() + tear(76, 104) + ARMS.rest() } },
      { name: 'Panic', look: { face: wide(2.6) + browsHigh() + scream() + ARMS.cheeks(), top: shake() + bang(166, 26) } },
      { name: 'Fainted on the sofa', look: { face: spiral(82, 96) + spiral(118, 96) + ooh() + ARMS.forehead(), back: sofa(), top: tear(46, 120), tilt: -24, drop: -2 } },
    ],
  },
} satisfies Record<string, Route>;


export type WidgetMood = keyof typeof MOODS;
export type DramaRoute = keyof typeof LADDER;

/** The looks there are for each mood ('A', 'B', ...). */
export function widgetLooks(mood: WidgetMood): string[] {
  return MOODS[mood].map((o) => o.id);
}
export const DRAMA_ROUTES = Object.keys(LADDER) as DramaRoute[];

/** Bizzy in one look of a mood, as a complete SVG. */
export function widgetBizzySvg(mood: WidgetMood, look: string, form: number): string {
  const opt = MOODS[mood].find((o) => o.id === look) ?? MOODS[mood][0];
  return bee(form, opt.look);
}
/** Bizzy in one step (0 to 3) of a late-drama route, as a complete SVG. */
export function dramaBizzySvg(route: DramaRoute, step: number, form: number): string {
  const steps = LADDER[route].steps;
  return bee(form, steps[Math.max(0, Math.min(steps.length - 1, step))].look);
}
