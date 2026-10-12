/**
 * UI icons as inline SVG (vector, generated in code, crisp at any size).
 * Every button shows an icon next to its words so non-readers can follow along.
 */

const K = '#20124d';
const wrap = (body: string) =>
  `<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" stroke="${K}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS: Record<string, string> = {
  play: wrap('<path d="M16 10 L38 24 L16 38 Z" fill="#8cff66"/>'),
  gear: wrap('<path d="M24 6 l4 5 6-2 1 6 6 2-2 6 4 5-4 5 2 6-6 2-1 6-6-2-4 5-4-5-6 2-1-6-6-2 2-6-4-5 4-5-2-6 6-2 1-6 6 2z" fill="#c9d2ee"/><circle cx="24" cy="24" r="6" fill="#fff"/>'),
  back: wrap('<path d="M28 10 L14 24 L28 38" stroke-width="6" stroke="#fff"/><path d="M28 10 L14 24 L28 38" stroke-width="2.5"/>'),
  next: wrap('<path d="M18 10 L32 24 L18 38" stroke-width="6" stroke="#fff"/><path d="M18 10 L32 24 L18 38" stroke-width="2.5"/>'),
  close: wrap('<path d="M13 13 L35 35 M35 13 L13 35" stroke-width="7" stroke="#fff"/><path d="M13 13 L35 35 M35 13 L13 35" stroke-width="2.5"/>'),
  pause: wrap('<rect x="12" y="10" width="9" height="28" rx="3" fill="#fff"/><rect x="27" y="10" width="9" height="28" rx="3" fill="#fff"/>'),
  rocket: wrap('<path d="M18 30 l-6 8 9-2z M30 30 l6 8-9-2z" fill="#ff5d73"/><path d="M24 4 C33 12 33 26 30 34 L18 34 C15 26 15 12 24 4z" fill="#fff"/><circle cx="24" cy="18" r="4" fill="#4dd4ff"/><path d="M20 38 Q24 46 28 38" fill="#ffb43b"/>'),
  map: wrap('<path d="M6 12 L17 8 L31 12 L42 8 L42 36 L31 40 L17 36 L6 40 Z" fill="#fff6e0"/><path d="M17 8 L17 36 M31 12 L31 40" stroke-width="2.5"/><circle cx="24" cy="24" r="4" fill="#ff5d73"/>'),
  star: wrap('<path d="M24 5 L29.5 17.5 L43 18.5 L32.5 27.5 L36 41 L24 34 L12 41 L15.5 27.5 L5 18.5 L18.5 17.5 Z" fill="#ffe066"/>'),
  starHalf: wrap('<defs><clipPath id="hs"><rect x="0" y="0" width="24" height="48"/></clipPath></defs><path d="M24 5 L29.5 17.5 L43 18.5 L32.5 27.5 L36 41 L24 34 L12 41 L15.5 27.5 L5 18.5 L18.5 17.5 Z" fill="#3a2a7a" stroke="#6b5aa8"/><path clip-path="url(#hs)" d="M24 5 L29.5 17.5 L43 18.5 L32.5 27.5 L36 41 L24 34 L12 41 L15.5 27.5 L5 18.5 L18.5 17.5 Z" fill="#ffe066"/>'),
  starEmpty: wrap('<path d="M24 5 L29.5 17.5 L43 18.5 L32.5 27.5 L36 41 L24 34 L12 41 L15.5 27.5 L5 18.5 L18.5 17.5 Z" fill="#3a2a7a" stroke="#6b5aa8"/>'),
  book: wrap('<path d="M6 10 Q15 6 24 11 Q33 6 42 10 L42 38 Q33 34 24 39 Q15 34 6 38 Z" fill="#4c7dff"/><path d="M24 11 L24 39" /><path d="M11 16 L19 15 M11 22 L19 21 M29 15 L37 16 M29 21 L37 22" stroke="#fff" stroke-width="2.5"/>'),
  badge: wrap('<path d="M15 4 L22 18 M33 4 L26 18" stroke-width="5" stroke="#ff5d73"/><circle cx="24" cy="29" r="13" fill="#ffc83d"/><path d="M24 21 l2.5 5.5 6 .5-4.5 4 1.5 6-5.5-3.2-5.5 3.2 1.5-6-4.5-4 6-.5z" fill="#fff6e0" stroke-width="2"/>'),
  sticker: wrap('<path d="M8 8 H40 V28 L28 40 H8 Z" fill="#ff7ad9"/><path d="M40 28 L28 28 L28 40" fill="#fff"/><circle cx="18" cy="20" r="3" fill="#20124d"/><circle cx="30" cy="20" r="3" fill="#20124d"/>'),
  wrench: wrap('<path d="M30 6 a10 10 0 0 0-9 14 L7 34 a4 4 0 0 0 6 6 L27 26 a10 10 0 0 0 14-9 l-6 4-5-3-1-5 6-4z" fill="#c9d2ee"/>'),
  chat: wrap('<path d="M6 10 Q6 6 10 6 L30 6 Q34 6 34 10 L34 22 Q34 26 30 26 L16 26 L9 32 L10 26 Q6 26 6 22 Z" fill="#fff"/><path d="M38 16 Q42 16 42 20 L42 32 Q42 36 38 36 L37 41 L31 36 L22 36 Q18 36 18 32 L18 30" fill="#ffe066"/>'),
  speaker: wrap('<path d="M8 18 L16 18 L26 9 L26 39 L16 30 L8 30 Z" fill="#fff"/><path d="M32 16 Q36 24 32 32 M37 11 Q44 24 37 37"/>'),
  mute: wrap('<path d="M8 18 L16 18 L26 9 L26 39 L16 30 L8 30 Z" fill="#9aa4c7"/><path d="M33 18 L43 30 M43 18 L33 30"/>'),
  music: wrap('<path d="M18 34 L18 10 L38 6 L38 30" /><circle cx="13" cy="35" r="6" fill="#ff7ad9"/><circle cx="33" cy="31" r="6" fill="#ff7ad9"/>'),
  check: wrap('<path d="M9 25 L20 36 L40 12" stroke-width="8" stroke="#fff"/><path d="M9 25 L20 36 L40 12" stroke-width="3"/>'),
  lock: wrap('<rect x="10" y="21" width="28" height="21" rx="5" fill="#ffc83d"/><path d="M16 21 L16 15 a8 8 0 0 1 16 0 L32 21"/><circle cx="24" cy="31" r="3" fill="#20124d"/>'),
  coin: wrap('<circle cx="24" cy="24" r="18" fill="#ffc83d"/><circle cx="24" cy="24" r="12" fill="#ffe066" stroke-width="2"/><path d="M24 15 l2.6 5.6 6 .6-4.5 4 1.4 6-5.5-3.2-5.5 3.2 1.4-6-4.5-4 6-.6z" fill="#ff9f43" stroke-width="1.8"/>'),
  fuel: wrap('<rect x="12" y="10" width="24" height="32" rx="6" fill="#8cff66"/><rect x="18" y="5" width="12" height="6" rx="2" fill="#c9d2ee"/><path d="M26 16 L19 27 L24 27 L22 36 L29 24 L24 24 Z" fill="#fff" stroke-width="2"/>'),
  shield: wrap('<path d="M24 5 L39 11 Q38 33 24 43 Q10 33 9 11 Z" fill="#4dd4ff"/><path d="M24 15 l2.5 5 5.5.5-4 3.6 1.3 5.4-5.3-3-5.3 3 1.3-5.4-4-3.6 5.5-.5z" fill="#fff" stroke-width="2"/>'),
  home: wrap('<path d="M6 24 L24 8 L42 24" stroke-width="5"/><path d="M11 22 L11 40 L37 40 L37 22" fill="#ffe066"/><rect x="20" y="28" width="8" height="12" fill="#ff5d73"/>'),
  fullscreen: wrap('<path d="M8 18 V8 H18 M30 8 H40 V18 M40 30 V40 H30 M18 40 H8 V30" stroke-width="5" stroke="#fff"/><path d="M8 18 V8 H18 M30 8 H40 V18 M40 30 V40 H30 M18 40 H8 V30" stroke-width="2"/>'),
  trash: wrap('<path d="M10 14 H38 L35 42 H13 Z" fill="#ff5d73"/><path d="M6 14 H42 M18 14 V8 H30 V14"/><path d="M19 21 V35 M29 21 V35" stroke-width="2.5"/>'),
  plus: wrap('<path d="M24 9 V39 M9 24 H39" stroke-width="8" stroke="#fff"/><path d="M24 9 V39 M9 24 H39" stroke-width="3"/>'),
  hand: wrap('<path d="M16 26 L16 10 a3 3 0 0 1 6 0 L22 22 L22 7 a3 3 0 0 1 6 0 L28 22 L28 10 a3 3 0 0 1 6 0 L34 26 L34 16 a3 3 0 0 1 6 0 L40 30 Q40 43 28 43 L22 43 Q14 43 10 34 L6 26 a3 3 0 0 1 5-3 L16 30 Z" fill="#ffe0c2"/>'),
  jump: wrap('<path d="M24 6 L40 24 L30 24 L30 40 L18 40 L18 24 L8 24 Z" fill="#8cff66"/>'),
  boost: wrap('<path d="M24 4 Q36 18 30 28 Q36 26 36 20 Q44 34 32 42 L16 42 Q4 34 12 20 Q12 26 18 28 Q12 18 24 4z" fill="#ff9f43"/><path d="M24 22 Q30 30 26 38 L22 38 Q18 30 24 22z" fill="#ffe066" stroke-width="2"/>'),
  question: wrap('<circle cx="24" cy="24" r="19" fill="#4dd4ff"/><path d="M18 19 a6 6 0 1 1 9 5 q-3 2-3 5" stroke-width="4"/><circle cx="24" cy="36" r="2.5" fill="#20124d"/>'),
  reset: wrap('<path d="M38 24 A14 14 0 1 1 33 13" stroke-width="5"/><path d="M33 5 L34 14 L25 15" stroke-width="5"/>'),
  gift: wrap('<rect x="8" y="20" width="32" height="20" rx="3" fill="#ff7ad9"/><rect x="6" y="14" width="36" height="8" rx="2" fill="#ff7ad9"/><path d="M24 14 V40" stroke="#ffe066" stroke-width="5"/><path d="M24 14 Q14 4 12 12 Q12 16 24 14 Q34 4 36 12 Q36 16 24 14" fill="#ffe066"/>'),
  calendar: wrap('<rect x="7" y="10" width="34" height="31" rx="5" fill="#fff"/><path d="M7 19 H41" /><rect x="7" y="10" width="34" height="9" rx="4" fill="#ff5d73"/><path d="M15 6 V13 M33 6 V13"/><circle cx="17" cy="27" r="2.5" fill="#20124d"/><circle cx="24" cy="27" r="2.5" fill="#20124d"/><circle cx="31" cy="27" r="2.5" fill="#20124d"/><circle cx="17" cy="34" r="2.5" fill="#20124d"/>'),
  trophy: wrap('<path d="M14 6 H34 Q34 26 24 28 Q14 26 14 6z" fill="#ffc83d"/><path d="M14 10 Q5 10 8 18 Q10 22 15 21 M34 10 Q43 10 40 18 Q38 22 33 21"/><path d="M24 28 V35"/><rect x="15" y="35" width="18" height="7" rx="2" fill="#b5764a"/>'),
  person: wrap('<circle cx="24" cy="17" r="11" fill="#fff"/><rect x="16" y="11" width="16" height="12" rx="6" fill="#4c7dff"/><path d="M9 43 Q9 30 24 30 Q39 30 39 43 Z" fill="#fff"/>'),
  paint: wrap('<path d="M24 5 Q41 5 42 21 Q42 30 33 28 Q27 27 28 33 Q29 42 22 42 Q6 41 6 24 Q6 5 24 5z" fill="#fff6e0"/><circle cx="16" cy="18" r="3.5" fill="#ff5d73"/><circle cx="25" cy="13" r="3.5" fill="#ffe066"/><circle cx="34" cy="17" r="3.5" fill="#4dd4ff"/><circle cx="14" cy="28" r="3.5" fill="#8cff66"/>'),
  bag: wrap('<path d="M9 16 H39 L36 42 H12 Z" fill="#2ed47a"/><path d="M17 20 V12 a7 7 0 0 1 14 0 V20"/>'),
  flag: wrap('<path d="M12 6 V44" stroke-width="4"/><path d="M14 8 L40 14 L14 24 Z" fill="#ff5d73"/>'),
  target: wrap('<circle cx="24" cy="24" r="18" fill="#ff5d73"/><circle cx="24" cy="24" r="11" fill="#fff"/><circle cx="24" cy="24" r="4" fill="#ff5d73"/>'),
  eye: wrap('<path d="M4 24 Q24 6 44 24 Q24 42 4 24z" fill="#fff"/><circle cx="24" cy="24" r="7" fill="#4c7dff"/>'),
  scan: wrap('<path d="M8 16 V8 H16 M32 8 H40 V16 M40 32 V40 H32 M16 40 H8 V32"/><circle cx="24" cy="24" r="8" fill="#4dd4ff"/>'),
  land: wrap('<path d="M24 4 C30 9 30 18 28 24 L20 24 C18 18 18 9 24 4z" fill="#fff"/><path d="M24 26 V36 M18 32 L24 38 L30 32" stroke-width="4"/><path d="M8 43 H40" stroke-width="5"/>'),
  sparkle: wrap('<path d="M24 4 Q26 22 44 24 Q26 26 24 44 Q22 26 4 24 Q22 22 24 4z" fill="#ffe066"/>'),
  tow: wrap('<rect x="10" y="10" width="28" height="22" rx="9" fill="#ffe066"/><circle cx="19" cy="20" r="3" fill="#20124d"/><circle cx="29" cy="20" r="3" fill="#20124d"/><path d="M24 32 V38 M20 42 Q24 46 28 42" />'),
  alien: wrap('<path d="M8 28 Q8 10 24 10 Q40 10 40 28 Q40 42 24 42 Q8 42 8 28z" fill="#2de0c7"/><circle cx="17" cy="25" r="4" fill="#fff"/><circle cx="31" cy="25" r="4" fill="#fff"/><circle cx="24" cy="18" r="3.5" fill="#fff"/><path d="M17 10 L12 3 M31 10 L36 3"/>'),
  planet: wrap('<circle cx="24" cy="24" r="12" fill="#ff9f43"/><ellipse cx="24" cy="24" rx="21" ry="7" transform="rotate(-20 24 24)"/>'),
  cone: wrap('<path d="M24 4 C34 14 37 30 38 42 L10 42 C11 30 14 14 24 4z" fill="#ff5d73"/><path d="M18 20 Q24 16 30 20" stroke="#fff" stroke-width="3"/>'),
  capsule: wrap('<rect x="12" y="4" width="24" height="40" rx="12" fill="#f4f7ff"/><circle cx="24" cy="17" r="5" fill="#4dd4ff"/><path d="M12 32 H36" stroke="#4c7dff" stroke-width="4"/>'),
  nozzle: wrap('<path d="M16 6 H32 L38 26 H10 Z" fill="#c9d2ee"/><path d="M14 26 Q24 50 34 26 Z" fill="#ff9f43"/><path d="M19 26 Q24 40 29 26 Z" fill="#ffe066" stroke-width="2"/>'),
  fin: wrap('<path d="M18 6 L18 40 L40 44 Z" fill="#ff5d73"/><path d="M8 10 L8 40" stroke-width="5"/>'),
  box: wrap('<rect x="7" y="12" width="34" height="28" rx="4" fill="#ffc58a"/><path d="M7 20 H41 M24 12 V40"/>'),
  bulb: wrap('<path d="M24 5 A13 13 0 0 1 32 29 L31 34 H17 L16 29 A13 13 0 0 1 24 5z" fill="#ffe066"/><path d="M18 38 H30 M20 43 H28"/>'),
  info: wrap('<circle cx="24" cy="24" r="19" fill="#4c7dff"/><path d="M24 22 V35" stroke="#fff" stroke-width="5"/><circle cx="24" cy="14" r="3" fill="#fff" stroke="none"/>'),
};

export function icon(name: string): string {
  return ICONS[name] ?? ICONS.star;
}

export function hasIcon(name: string): boolean {
  return name in ICONS;
}
