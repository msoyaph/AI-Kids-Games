import type { ItemId } from '../data/types';

// Hand-made, original SVG icons for items (used in the HUD item slot and the collection screen).
const S = (body: string): string => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export const ITEM_ICONS: Record<ItemId, string> = {
  bumperBall: S(
    '<circle cx="32" cy="34" r="20" fill="#ff4d6d" stroke="#7a1030" stroke-width="3"/><path d="M12 34h40" stroke="#ffd23f" stroke-width="7"/><circle cx="25" cy="25" r="5" fill="#fff" opacity=".7"/>',
  ),
  paperPlane: S(
    '<path d="M6 34 58 12 40 54 30 38z" fill="#fff" stroke="#3fa7ff" stroke-width="3" stroke-linejoin="round"/><path d="M30 38 58 12" stroke="#3fa7ff" stroke-width="3"/><path d="M30 38v12l6-8" fill="#cfe8ff" stroke="#3fa7ff" stroke-width="2"/>',
  ),
  gooPuddle: S(
    '<path d="M8 44c0-10 10-12 14-18s4-14 12-14 8 10 12 14 12 6 12 16-12 12-24 12S8 54 8 44z" fill="#b34dff" stroke="#5b1a8a" stroke-width="3"/><circle cx="26" cy="30" r="4" fill="#e0a8ff"/><circle cx="40" cy="44" r="3" fill="#e0a8ff"/>',
  ),
  turbo: S(
    '<rect x="20" y="10" width="24" height="44" rx="6" fill="#ff9f1c" stroke="#8a4a00" stroke-width="3"/><rect x="24" y="6" width="16" height="6" rx="2" fill="#c0c8d8"/><path d="M34 18 26 34h8l-4 14 10-18h-8l4-12z" fill="#ffe45c"/>',
  ),
  turbo3: S(
    '<g fill="#ff9f1c" stroke="#8a4a00" stroke-width="2.5"><rect x="6" y="16" width="16" height="36" rx="5"/><rect x="24" y="10" width="16" height="42" rx="5"/><rect x="42" y="16" width="16" height="36" rx="5"/></g><path d="M34 18 28 30h6l-3 12 8-14h-6l3-10z" fill="#ffe45c"/>',
  ),
  magnet: S(
    '<path d="M14 12h12v22a6 6 0 0 0 12 0V12h12v22a18 18 0 0 1-36 0z" fill="#ff4d6d" stroke="#7a1030" stroke-width="3"/><rect x="14" y="12" width="12" height="8" fill="#c0c8d8"/><rect x="38" y="12" width="12" height="8" fill="#c0c8d8"/><path d="M8 50l6-4M56 50l-6-4M32 60v-6" stroke="#3fa7ff" stroke-width="3" stroke-linecap="round"/>',
  ),
  shield: S(
    '<circle cx="32" cy="32" r="24" fill="#7fe7ff" fill-opacity=".55" stroke="#2a8fff" stroke-width="4"/><path d="M20 24a14 14 0 0 1 12-8" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/>',
  ),
  cloud: S(
    '<path d="M16 46a10 10 0 0 1 0-20 14 14 0 0 1 26-6 11 11 0 0 1 8 26z" fill="#d9d4f2" stroke="#6a5f99" stroke-width="3"/><circle cx="27" cy="36" r="2.5" fill="#4a4466"/><circle cx="37" cy="36" r="2.5" fill="#4a4466"/><path d="M28 42q4 3 8 0" stroke="#4a4466" stroke-width="2" fill="none"/>',
  ),
  tornado: S(
    '<g fill="none" stroke="#2bbfaa" stroke-width="5" stroke-linecap="round"><path d="M10 14h44"/><path d="M16 24h34"/><path d="M22 34h22"/><path d="M26 44h14"/><path d="M30 54h6"/></g>',
  ),
  rocketDash: S(
    '<path d="M14 42 40 16c6-6 14-6 14-6s0 8-6 14L22 50z" fill="#fff" stroke="#3fa7ff" stroke-width="3"/><circle cx="42" cy="22" r="5" fill="#3fa7ff"/><path d="M14 42l-6 2 4-10 8-2zM22 50l-2 6 10-4 2-8z" fill="#ff4d6d"/><path d="M16 48 6 58" stroke="#ff9f1c" stroke-width="5" stroke-linecap="round"/>',
  ),
  springTrap: S(
    '<rect x="10" y="50" width="44" height="6" rx="2" fill="#8a8fa8"/><path d="M16 48c0-6 32-6 32-10S16 34 16 30s32-4 32-8-32-4-32-8" fill="none" stroke="#ffc21a" stroke-width="5" stroke-linecap="round"/><rect x="14" y="8" width="36" height="6" rx="2" fill="#ff4d6d"/>',
  ),
  popper: S(
    '<path d="M10 54 22 18l24 24z" fill="#8cff6b" stroke="#2e7d32" stroke-width="3" stroke-linejoin="round"/><path d="M16 36l12 12M19 27l18 18" stroke="#ff6fae" stroke-width="3"/><g fill="#ffd23f"><circle cx="44" cy="14" r="3"/><circle cx="54" cy="22" r="2.5"/><circle cx="36" cy="8" r="2"/></g><g fill="#4ce0d2"><rect x="48" y="8" width="5" height="3" transform="rotate(30 50 9)"/><rect x="54" y="32" width="5" height="3"/></g>',
  ),
};

export const TROPHY_SVG = (color: string): string =>
  S(
    `<path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="${color}" stroke="#5a3a00" stroke-width="2.5"/><path d="M18 12H8a10 10 0 0 0 12 14M46 12h10a10 10 0 0 1-12 14" fill="none" stroke="${color}" stroke-width="4"/><rect x="28" y="36" width="8" height="10" fill="${color}"/><rect x="18" y="46" width="28" height="8" rx="2" fill="#8d5524"/>`,
  );

export const BALLOON_SVG = (color: string): string =>
  S(`<path d="M32 6c11 0 18 9 18 19 0 12-10 21-18 23-8-2-18-11-18-23C14 15 21 6 32 6z" fill="${color}" stroke="#00000055" stroke-width="2"/><path d="M32 48l-3 5h6zM32 53q-4 5 0 10" stroke="#fff" stroke-width="2" fill="#fff"/><ellipse cx="25" cy="18" rx="4" ry="6" fill="#fff" opacity=".5"/>`);
