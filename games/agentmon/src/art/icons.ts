/**
 * Small icons (12×12): the eight element icons (distinct shapes, so they never rely on colour), the
 * five status icons, item icons (snacks, berries, gear, key items) and a few UI glyphs.
 */
import type { Element, StatusId } from '../core/types';
import { ELEMENT_INFO } from '../data/elements';
import { P } from './palette';
import { darken, lighten, PixelCanvas } from './pixelcanvas';

const S = 12;
const icon = () => new PixelCanvas(S, S);

export function elementIcon(e: Element, mono = false): PixelCanvas {
  const info = ELEMENT_INFO[e];
  const c = icon();
  const col = mono ? P.white : info.color;
  const dark = mono ? P.white : info.dark;
  switch (info.icon) {
    case 'flame':
      c.poly([[6, 0], [10, 6], [10, 9], [6, 12], [2, 9], [2, 6], [4, 4], [5, 6]], col);
      c.poly([[6, 5], [8, 8], [6, 11], [4, 8]], mono ? P.white : lighten(col, 0.5));
      break;
    case 'drop':
      c.poly([[6, 0], [10, 7], [6, 12], [2, 7]], col);
      c.ellipse(6, 8, 4, 3.6, col);
      c.set(4, 6, lighten(col, 0.6)).set(4, 7, lighten(col, 0.6));
      break;
    case 'leaf':
      c.poly([[1, 11], [2, 5], [7, 1], [11, 0], [10, 5], [6, 10]], col);
      c.line(2, 10, 9, 2, dark);
      break;
    case 'mountain':
      c.poly([[0, 11], [5, 1], [7, 4], [8.5, 3], [12, 11]], col);
      c.poly([[5, 1], [7, 4], [5.5, 6], [3.5, 5]], mono ? P.ink : lighten(col, 0.35));
      break;
    case 'swirl':
      // a gust of wind: a spiral curl
      for (let a = 0; a < 640; a += 10) {
        const r = 5.6 - a / 125, rad = (a * Math.PI) / 180;
        c.set(6 + Math.cos(rad) * r, 6 + Math.sin(rad) * r, col);
        c.set(6 + Math.cos(rad) * (r - 0.8), 6 + Math.sin(rad) * (r - 0.8), col);
      }
      c.line(6, 0, 11, 0, col);
      void dark;
      break;
    case 'snowflake':
      c.line(6, 0, 6, 11, col).line(1, 3, 11, 9, col).line(1, 9, 11, 3, col);
      c.line(5, 1, 7, 1, col).line(5, 10, 7, 10, col);
      c.set(6, 6, lighten(col, 0.6));
      break;
    case 'bolt':
      c.poly([[7, 0], [2, 7], [6, 7], [4, 12], [10, 4], [6, 4], [8, 0]], col);
      break;
    case 'star':
      c.poly([[6, 0], [7.5, 4.5], [12, 6], [7.5, 7.5], [6, 12], [4.5, 7.5], [0, 6], [4.5, 4.5]], col);
      c.set(6, 5, lighten(col, 0.6)).set(5, 6, lighten(col, 0.6));
      break;
  }
  c.outline(mono ? P.ink : darken(info.dark, 0.3));
  return c;
}

export const STATUS_COLORS: Record<StatusId, number> = { sleepy: 0x8f8fe0, dizzy: 0xd8a0ff, soaked: 0x5fb4ff, toasty: 0xff8a4a, chilly: 0xa8e0ff };

export function statusIcon(s: StatusId): PixelCanvas {
  const c = icon();
  const col = STATUS_COLORS[s];
  switch (s) {
    case 'sleepy': // a little "z z"
      c.rows(['1111', '..1.', '.1..', '1111'], { 1: col }, 1, 1).rows(['111', '.1.', '111'], { 1: col }, 7, 6);
      break;
    case 'dizzy': // a swirl
      c.circle(6, 6, 5, col).circle(6, 6, 3, 0x0).circle(7, 5, 1.5, col);
      for (let i = 0; i < c.px.length; i++) if (c.px[i] === 0) c.px[i] = -1;
      break;
    case 'soaked': // drops
      c.poly([[3, 1], [5, 5], [3, 7], [1, 5]], col).poly([[8, 4], [10, 8], [8, 10], [6, 8]], col);
      break;
    case 'toasty': // three warm, wavy lines of heat
      for (const x of [2, 6, 10]) for (let y = 1; y <= 10; y++) c.set(x + (y % 4 < 2 ? 0 : 1) - 1, y, col);
      break;
    case 'chilly': // a little ice cube
      c.rect(2, 2, 8, 8, col).rect(3, 3, 3, 2, lighten(col, 0.6)).set(8, 8, darken(col, 0.2));
      break;
  }
  c.outline(darken(col, 0.55));
  return c;
}

/** Item icons by id; unknown ids get a generic bag. */
export function itemIcon(id: string): PixelCanvas {
  const c = icon();
  const drawBerry = (col: number) => { c.circle(6, 7, 4.5, col).set(4, 5, lighten(col, 0.6)).set(5, 4, lighten(col, 0.6)); c.line(6, 1, 7, 3, P.leaf).set(8, 1, P.leafLight); };
  const charm = (col: number) => { c.circle(6, 7, 4, col); c.circle(6, 7, 2, lighten(col, 0.4)); c.line(6, 0, 6, 3, 0xb0a070); };
  switch (id) {
    case 'berry-bun': c.ellipse(6, 7, 5.5, 4, 0xe8b070); c.set(4, 6, 0xc04060).set(7, 7, 0xc04060).set(6, 5, 0xc04060); break;
    case 'crunch-seed': for (const [x, y] of [[3, 5], [7, 4], [5, 8], [9, 8]] as const) c.ellipse(x, y, 1.6, 2.2, 0xc99a62); break;
    case 'honey-drop': c.poly([[6, 1], [10, 7], [6, 11], [2, 7]], 0xf2b33d); c.set(5, 5, 0xfff0b0); break;
    case 'sea-crisp': c.poly([[1, 4], [11, 2], [10, 9], [2, 10]], 0x3f8f5a); c.line(2, 6, 10, 5, 0x6fc48a); break;
    case 'sun-pepper': c.ellipse(6, 7, 3.5, 4.5, 0xffa040); c.rect(5, 1, 2, 2, P.leaf); break;
    case 'frost-mint': c.poly([[1, 10], [3, 3], [8, 1], [11, 2], [9, 8]], 0x8fe0c8); c.line(2, 9, 9, 3, 0x4fa68a); break;
    case 'spark-fizz': c.circle(6, 6, 4.5, 0xf5c830); c.set(4, 4, P.white).line(6, 2, 7, 5, 0xfff8c0).line(7, 5, 5, 8, 0xfff8c0); break;
    case 'moon-melon': c.poly([[1, 4], [11, 4], [9, 9], [3, 9]], 0xd8f0c0); c.hline(2, 10, 4, 0x6fc48a); c.set(5, 6, P.ink).set(7, 6, P.ink); break;
    case 'pep-berry': drawBerry(0xff6b8a); break;
    case 'big-pep-berry': drawBerry(0xe0405a); c.circle(9, 9, 2, 0xe0405a); break;
    case 'calm-leaf': c.poly([[1, 11], [2, 5], [7, 1], [11, 0], [10, 5], [6, 10]], 0x9fdc8a); c.line(2, 10, 9, 2, 0x5fa64a); break;
    case 'wake-berry': drawBerry(0xffc84a); break;
    case 'rainbow-berry': drawBerry(0xff8fc0); c.set(7, 7, 0x8fd8ff).set(8, 8, 0xa8f0a0).set(6, 9, 0xffe066); break;
    case 'comfy-scarf': c.rect(1, 3, 10, 3, 0xd9604f); c.rect(7, 5, 3, 6, 0xd9604f); c.hline(1, 10, 4, 0xf08a7a); break;
    case 'swift-ribbon': c.poly([[1, 2], [6, 6], [1, 10]], 0x5fd6b8).poly([[11, 2], [6, 6], [11, 10]], 0x5fd6b8); break;
    case 'sturdy-band': c.circle(6, 6, 5, 0xb08050); c.circle(6, 6, 3, -1 as number); break;
    case 'agent-card': c.rect(1, 2, 10, 8, P.white); c.rect(2, 3, 3, 4, 0x9fc0e8); c.hline(6, 9, 4, P.r2); c.hline(6, 9, 6, P.r2); c.set(8, 8, P.beacon); break;
    case 'field-guide': c.rect(2, 1, 8, 10, 0x4fa66a); c.rect(3, 2, 6, 8, 0x74c464); c.set(6, 5, P.beacon); break;
    case 'beacon-lens': c.circle(6, 6, 5, 0xd8eaff); c.circle(6, 6, 3, 0xfff3b0); c.set(5, 5, P.white); break;
    case 'snack-pouch': c.ellipse(6, 7, 5, 4, 0xc99a62); c.hline(3, 9, 3, 0x9a6a44); break;
    case 'tower-pass': c.rect(1, 3, 10, 6, 0x9a5fb8); c.rect(5, 1, 2, 10, 0xfff3b0); break;
    case 'tide-pearl': c.circle(6, 6, 4.5, 0xf4f4ff); c.set(4, 4, P.white).set(8, 8, 0xc8d8ff); break;
    case 'canyon-bell': c.poly([[3, 9], [4, 3], [6, 1], [8, 3], [9, 9]], 0xe0a050); c.rect(2, 9, 8, 1, 0xc08040); c.set(6, 11, 0xc08040); break;
    case 'frost-feather': c.poly([[2, 11], [5, 4], [10, 0], [9, 6]], 0xd8f0ff); c.line(2, 11, 9, 1, 0x9fc8f0); break;
    default:
      if (id.endsWith('-charm')) {
        const e = id.slice(0, -6) as Element;
        charm(ELEMENT_INFO[e]?.color ?? 0xcccccc);
      } else { c.ellipse(6, 7, 5, 4.5, 0xc99a62); c.hline(3, 9, 3, 0x9a6a44); }
  }
  c.outline(P.ink, true);
  return c;
}
