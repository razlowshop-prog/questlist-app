// Bizzy's outfits, drawn in the full-grown Bizzy's units (a 200 x 200 box,
// like src/bizzy.ts). Designed on the outfits preview page (2026-10-28,
// /mnt/project-files/design/mascots/outfits/gen.ts). The rules (rarity, how
// each one is won) live in outfits.ts.

export type OutfitSlot = 'head' | 'face' | 'neck' | 'back';

export interface OutfitArt {
  id: string;
  slot: OutfitSlot;
  /** 1 Rare, 2 Epic, 3 Legendary. */
  rarity: 1 | 2 | 3;
  /** Drawn in front of him; for the back slot, behind him. */
  svg: string;
  /** Back pieces only: the part that shows in front (the clasp of a cape). */
  front?: string;
}

// Five-petal flower for the flower crown.
const flower = (x: number, y: number, r: number, c: string) =>
  Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180);
    return `<circle cx="${(x + Math.cos(a) * r).toFixed(1)}" cy="${(y + Math.sin(a) * r).toFixed(1)}" r="${(r * 0.78).toFixed(1)}" fill="${c}"/>`;
  }).join('') + `<circle cx="${x}" cy="${y}" r="${(r * 0.6).toFixed(1)}" fill="#FFD95A"/>`;
const star = (x: number, y: number, s: number, c = '#FFD95A') =>
  `<path d="M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3}Z" fill="${c}"/>`;
const ink = '#12151F';

export const OUTFIT_ART: OutfitArt[] = [
  {
    id: 'beanie', slot: 'head', rarity: 1,
    svg:
      `<path d="M62 84 Q60 46 100 44 Q140 46 138 84Z" fill="#E35D6A"/>` +
      `<g stroke="#C2414F" stroke-width="2.4" stroke-linecap="round" opacity=".7"><path d="M80 52 Q78 66 78 78"/><path d="M100 46 V78"/><path d="M120 52 Q122 66 122 78"/></g>` +
      `<path d="M58 76 Q100 66 142 76 L142 88 Q100 78 58 88Z" fill="#C2414F"/>` +
      `<g stroke="#A8323F" stroke-width="2" opacity=".55"><path d="M70 74 v10"/><path d="M82 71 v10"/><path d="M94 70 v10"/><path d="M106 70 v10"/><path d="M118 71 v10"/><path d="M130 74 v10"/></g>` +
      `<circle cx="100" cy="40" r="10" fill="#FFF1F1"/><circle cx="97" cy="37" r="3" fill="#fff"/>`,
  },
  {
    id: 'party', slot: 'head', rarity: 1,
    svg:
      `<g transform="rotate(14 100 74)"><path d="M80 76 L102 20 L124 76Z" fill="#6A5BFF"/>` +
      `<path d="M86 61 L118 61 L115 53 L89 53Z M93 43 L111 43 L108 36 L96 36Z" fill="#7FD6FF"/>` +
      `<circle cx="92" cy="70" r="2.4" fill="#FFD95A"/><circle cx="110" cy="69" r="2.4" fill="#FFD95A"/><circle cx="102" cy="48" r="2" fill="#FFD95A"/>` +
      `<path d="M78 76 Q102 82 126 76" fill="none" stroke="#FFD95A" stroke-width="4" stroke-linecap="round"/>` +
      `<circle cx="102" cy="18" r="6" fill="#FF8FB1"/><circle cx="96" cy="14" r="3" fill="#FFD95A"/><circle cx="108" cy="13" r="3" fill="#7FD6FF"/></g>`,
  },
  {
    id: 'grad', slot: 'head', rarity: 2,
    svg:
      `<path d="M70 66 Q70 84 100 84 Q130 84 130 66Z" fill="#232838"/>` +
      `<path d="M50 62 L100 44 L150 62 L100 80Z" fill="#2F3650"/><path d="M50 62 L100 80 L150 62 L150 65 L100 83 L50 65Z" fill="#1A1E2B"/>` +
      `<circle cx="100" cy="62" r="3.4" fill="#FFD95A"/><path d="M100 62 Q126 62 140 68 L140 88" fill="none" stroke="#FFD95A" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M136 86 L144 86 L146 98 L134 98Z" fill="#FFD95A"/>`,
  },
  {
    id: 'chef', slot: 'head', rarity: 2,
    svg:
      `<g fill="#FFFFFF" stroke="#D5DBEA" stroke-width="2"><circle cx="80" cy="54" r="15"/><circle cx="120" cy="54" r="15"/><circle cx="100" cy="44" r="19"/></g>` +
      `<path d="M70 84 L72 58 L128 58 L130 84 Q100 78 70 84Z" fill="#FFFFFF" stroke="#D5DBEA" stroke-width="2"/>` +
      `<path d="M78 76 L78 64 M90 77 L90 62 M110 77 L110 62 M122 76 L122 64" stroke="#E3E8F3" stroke-width="2.4" stroke-linecap="round"/>`,
  },
  {
    id: 'wizard', slot: 'head', rarity: 3,
    svg:
      `<path d="M74 78 Q90 52 100 18 Q104 10 116 14 Q106 20 108 34 Q114 56 128 78Z" fill="#4B3BAF"/>` +
      `<ellipse cx="100" cy="79" rx="46" ry="9" fill="#3A2C92"/><path d="M78 72 Q100 66 124 72" fill="none" stroke="#FFD95A" stroke-width="3"/>` +
      star(96, 50, 6) + star(110, 34, 4) + star(88, 64, 3.5, '#7FD6FF'),
  },
  {
    id: 'cap', slot: 'head', rarity: 1,
    svg:
      `<path d="M128 74 Q160 70 170 82 Q152 88 130 84Z" fill="#1F8C80"/>` +
      `<path d="M64 82 Q64 50 100 50 Q136 50 136 82Q100 74 64 82Z" fill="#2BB3A3"/>` +
      `<path d="M100 50 Q96 64 96 78 M80 56 Q76 68 76 80" fill="none" stroke="#1F8C80" stroke-width="2" opacity=".7"/>` +
      `<circle cx="100" cy="50" r="3.2" fill="#1F8C80"/><path d="M84 66 h18 v8 h-18Z" fill="#fff" opacity=".9"/>`,
  },
  {
    id: 'flowers', slot: 'head', rarity: 2,
    svg:
      `<path d="M60 82 Q100 60 140 82" fill="none" stroke="#4F9A52" stroke-width="4" stroke-linecap="round"/>` +
      `<ellipse cx="72" cy="72" rx="6" ry="3" fill="#6BBF6E" transform="rotate(-30 72 72)"/><ellipse cx="128" cy="72" rx="6" ry="3" fill="#6BBF6E" transform="rotate(30 128 72)"/>` +
      flower(64, 78, 5, '#FF8FB1') + flower(84, 68, 6, '#FFFFFF') + flower(100, 65, 6.5, '#FFB0C8') + flower(116, 68, 6, '#C8B6FF') + flower(136, 78, 5, '#FFFFFF'),
  },
  {
    id: 'phones', slot: 'head', rarity: 2,
    svg:
      `<path d="M54 96 Q52 42 100 42 Q148 42 146 96" fill="none" stroke="#2F3650" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M62 60 Q80 46 100 46" fill="none" stroke="#59607A" stroke-width="2.5" stroke-linecap="round"/>` +
      `<rect x="40" y="86" width="20" height="30" rx="9" fill="#6A5BFF"/><rect x="140" y="86" width="20" height="30" rx="9" fill="#6A5BFF"/>` +
      `<rect x="46" y="92" width="8" height="18" rx="4" fill="#7FD6FF"/><rect x="146" y="92" width="8" height="18" rx="4" fill="#7FD6FF"/>`,
  },
  {
    id: 'viking', slot: 'head', rarity: 2,
    svg:
      `<path d="M68 70 Q46 66 38 38 Q54 52 72 60Z" fill="#FFF1D6" stroke="#D9C49A" stroke-width="1.5"/><path d="M132 70 Q154 66 162 38 Q146 52 128 60Z" fill="#FFF1D6" stroke="#D9C49A" stroke-width="1.5"/>` +
      `<path d="M64 84 Q62 50 100 48 Q138 50 136 84Z" fill="#B8C2D6"/><path d="M100 48 V84" stroke="#8E99B0" stroke-width="5"/>` +
      `<path d="M60 78 Q100 70 140 78 L140 88 Q100 80 60 88Z" fill="#8E99B0"/>` +
      `<g fill="#DDE3EE"><circle cx="72" cy="81" r="2"/><circle cx="88" cy="78" r="2"/><circle cx="112" cy="78" r="2"/><circle cx="128" cy="81" r="2"/></g>` +
      `<path d="M74 60 Q84 52 94 51" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`,
  },
  {
    id: 'pirate', slot: 'head', rarity: 2,
    svg:
      `<path d="M46 78 Q60 40 100 36 Q140 40 154 78 Q100 62 46 78Z" fill="#1E1E26"/>` +
      `<path d="M46 78 Q100 62 154 78" fill="none" stroke="#FFD95A" stroke-width="3.5" stroke-linecap="round"/>` +
      `<circle cx="100" cy="52" r="7" fill="#F4F4F2"/><rect x="96" y="56" width="8" height="5" rx="1.5" fill="#F4F4F2"/>` +
      `<circle cx="97.4" cy="51" r="1.8" fill="#1E1E26"/><circle cx="102.6" cy="51" r="1.8" fill="#1E1E26"/>` +
      `<path d="M88 64 L112 70 M112 64 L88 70" stroke="#F4F4F2" stroke-width="2.6" stroke-linecap="round"/>`,
  },
  {
    id: 'shades', slot: 'face', rarity: 1,
    svg:
      `<rect x="68" y="86" width="28" height="19" rx="8" fill="${ink}"/><rect x="104" y="86" width="28" height="19" rx="8" fill="${ink}"/>` +
      `<path d="M96 91 Q100 88 104 91" fill="none" stroke="${ink}" stroke-width="3"/><path d="M68 91 L56 87 M132 91 L144 87" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M73 91 L80 91 L74 99Z M109 91 L116 91 L110 99Z" fill="#fff" opacity=".55"/>`,
  },
  {
    id: 'hearts', slot: 'face', rarity: 2,
    svg:
      [82, 118].map((x) => `<path d="M${x} 106 L${x - 12} 95 Q${x - 16} 88 ${x - 9} 85 Q${x - 3} 84 ${x} 89 Q${x + 3} 84 ${x + 9} 85 Q${x + 16} 88 ${x + 12} 95Z" fill="#FF5C8A" fill-opacity=".55" stroke="#E5306A" stroke-width="2.6" stroke-linejoin="round"/>`).join('') +
      `<path d="M95 92 Q100 89 105 92" fill="none" stroke="#E5306A" stroke-width="2.6"/>`,
  },
  {
    id: 'specs', slot: 'face', rarity: 1,
    svg:
      `<g fill="#DDF3FF" fill-opacity=".25" stroke="#7A4A2A" stroke-width="2.6"><circle cx="82" cy="96" r="12"/><circle cx="118" cy="96" r="12"/></g>` +
      `<path d="M94 94 Q100 90 106 94 M70 94 L58 90 M130 94 L142 90" fill="none" stroke="#7A4A2A" stroke-width="2.6" stroke-linecap="round"/>`,
  },
  {
    id: 'bowtie', slot: 'neck', rarity: 1,
    svg:
      `<path d="M100 121 L80 111 Q76 121 80 131Z" fill="#E5484D"/><path d="M100 121 L120 111 Q124 121 120 131Z" fill="#E5484D"/>` +
      `<path d="M84 115 L94 120 M84 127 L94 122 M116 115 L106 120 M116 127 L106 122" stroke="#B83238" stroke-width="1.8" stroke-linecap="round"/>` +
      `<rect x="95" y="116" width="10" height="10" rx="3" fill="#C73A40"/>`,
  },
  {
    id: 'scarf', slot: 'neck', rarity: 2,
    svg:
      `<path d="M116 124 L130 160 L118 164 L106 128Z" fill="#E35D6A"/><path d="M119 136 L126 133 M123 146 L130 143 M126 156 L132 153" stroke="#fff" stroke-width="4"/>` +
      `<path d="M54 112 Q100 132 146 112 L148 124 Q100 146 52 124Z" fill="#E35D6A"/>` +
      `<g clip-path="url(#scarfclip)"><path d="M66 110 v30 M82 110 v30 M98 110 v30 M114 110 v30 M130 110 v30" stroke="#fff" stroke-width="6"/></g>` +
      `<clipPath id="scarfclip"><path d="M54 112 Q100 132 146 112 L148 124 Q100 146 52 124Z"/></clipPath>`,
  },
  {
    id: 'medal', slot: 'neck', rarity: 2,
    svg:
      `<path d="M84 110 L98 132 L104 130 L94 110Z" fill="#3A6BD9"/><path d="M116 110 L102 132 L96 130 L106 110Z" fill="#5A8BF0"/>` +
      `<circle cx="100" cy="138" r="11" fill="#FFD95A" stroke="#C98A1E" stroke-width="2"/>` + star(100, 138, 6, '#C98A1E'),
  },
  {
    id: 'cape', slot: 'back', rarity: 2,
    svg: `<path d="M58 106 Q100 94 142 106 L166 184 Q148 178 132 190 Q116 180 100 192 Q84 180 68 190 Q52 178 34 184Z" fill="#D93A4A"/><path d="M58 106 Q100 94 142 106" fill="none" stroke="#A82634" stroke-width="5"/>`,
    front: `<circle cx="64" cy="110" r="4.5" fill="#FFD95A"/><circle cx="136" cy="110" r="4.5" fill="#FFD95A"/>`,
  },
  {
    id: 'astro', slot: 'head', rarity: 3,
    svg:
      `<circle cx="100" cy="112" r="70" fill="#BFEAFF" fill-opacity=".18" stroke="#E8EEF8" stroke-width="5"/>` +
      `<path d="M52 72 Q70 48 98 44" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/>` +
      `<path d="M40 150 Q100 176 160 150 L162 166 Q100 192 38 166Z" fill="#E8EEF8"/><rect x="92" y="164" width="16" height="8" rx="3" fill="#FF5C8A"/>` +
      `<circle cx="100" cy="40" r="5" fill="#FF5C8A"/><path d="M100 45 V50" stroke="#E8EEF8" stroke-width="3"/>`,
  },
  {
    id: 'laurel', slot: 'head', rarity: 3,
    svg:
      [-1, 1].map((d) => {
        const leaves = [0, 1, 2, 3, 4].map((i) => {
          const x = 100 + d * (16 + i * 8);
          const y = 66 + i * 4 + i * i * 0.6;
          return `<ellipse cx="${x}" cy="${y}" rx="7" ry="3.4" fill="url(#gl)" transform="rotate(${d * (-20 + i * 14)} ${x} ${y})"/>`;
        }).join('');
        return `<path d="M${100 + d * 10} 66 Q${100 + d * 40} 66 ${100 + d * 50} 88" fill="none" stroke="#C98A1E" stroke-width="2.4"/>` + leaves;
      }).join('') +
      `<defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0A8"/><stop offset="1" stop-color="#E0A93C"/></linearGradient></defs>` +
      star(100, 60, 5, '#FFF7D6'),
  },
  {
    id: 'diamond', slot: 'face', rarity: 3,
    svg:
      [82, 118].map((x) => `<path d="M${x - 14} 92 L${x - 8} 86 L${x + 8} 86 L${x + 14} 92 L${x} 106Z" fill="#9FE3FF" fill-opacity=".8" stroke="#E8F7FF" stroke-width="2.2" stroke-linejoin="round"/><path d="M${x - 14} 92 H${x + 14} M${x - 8} 86 L${x - 3} 92 L${x} 106 M${x + 8} 86 L${x + 3} 92 L${x} 106" fill="none" stroke="#E8F7FF" stroke-width="1.4" opacity=".9"/>`).join('') +
      `<path d="M96 90 Q100 87 104 90" fill="none" stroke="#E8F7FF" stroke-width="2.4"/>` + star(140, 82, 4, '#fff'),
  },
  {
    id: 'rainbow', slot: 'back', rarity: 3,
    svg:
      `<defs><linearGradient id="rb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF5C8A"/><stop offset=".25" stop-color="#FFB347"/><stop offset=".5" stop-color="#FFE48A"/><stop offset=".75" stop-color="#7FD6FF"/><stop offset="1" stop-color="#6A5BFF"/></linearGradient></defs>` +
      `<path d="M58 106 Q100 94 142 106 L170 186 Q150 176 134 190 Q116 178 100 192 Q84 178 66 190 Q50 176 30 186Z" fill="url(#rb)"/><path d="M58 106 Q100 94 142 106" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>`,
    front: `<circle cx="64" cy="110" r="4.5" fill="#fff"/><circle cx="136" cy="110" r="4.5" fill="#fff"/>` + star(100, 104, 5, '#fff'),
  },
];
