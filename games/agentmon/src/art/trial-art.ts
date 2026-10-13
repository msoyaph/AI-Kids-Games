/**
 * Trial room art: themed floors and walls baked into one canvas per room, plus the puzzle pieces
 * (blocks, plates, colour switches and gates, light emitters, mirrors, crystals, platforms, vines,
 * ice blocks, the door and the exit stairs). Colour pieces also carry a shape (circle, triangle,
 * square), so they never rely on colour alone.
 */
import type { Room } from '../core/puzzle/puzzle';
import type { TrialDef } from '../data/trials';
import { hash32 } from '../core/rng';
import { P } from './palette';
import { darken, lighten, PixelCanvas } from './pixelcanvas';

type Theme = TrialDef['theme'];

interface ThemeColors { floor: number; floor2: number; wall: number; wallTop: number; edge: number; gap: number }

export const THEME: Record<Theme, ThemeColors> = {
  lighthouse: { floor: 0xe8dcc8, floor2: 0xd8c8b0, wall: 0x6f8fc0, wallTop: 0xb8d0f0, edge: 0x4a6a9a, gap: 0x1f2f50 },
  canopy: { floor: 0xc99a62, floor2: 0xb3844f, wall: 0x3f8f45, wallTop: 0x7cc96a, edge: 0x2c6a35, gap: 0x2a4a30 },
  mine: { floor: 0xa88a68, floor2: 0x8f7458, wall: 0x5a4e66, wallTop: 0x8a7a8a, edge: 0x3a3246, gap: 0x1c1830 },
  canyon: { floor: 0xf0d098, floor2: 0xe0b878, wall: 0xd9774b, wallTop: 0xeaa16b, edge: 0xa84f30, gap: 0x5a2a20 },
  summit: { floor: 0xeef4ff, floor2: 0xd4e2f6, wall: 0x8fb0e0, wallTop: 0xd8e8ff, edge: 0x5a7ab0, gap: 0x2a3a60 },
  spire: { floor: 0xf4f0ff, floor2: 0xe0d8f8, wall: 0x9a7ad8, wallTop: 0xd0c0f8, edge: 0x6a4ab0, gap: 0x8fc8ff },
  woods: { floor: 0x9ed97a, floor2: 0x74c464, wall: 0x2f6e3e, wallTop: 0x55a957, edge: 0x1f4a2a, gap: 0x1f3a20 },
  pass: { floor: 0xeef4ff, floor2: 0xd4e2f6, wall: 0x6e6280, wallTop: 0x9a8aa8, edge: 0x463c52, gap: 0x2a2440 },
  ridge: { floor: 0xf4f6ff, floor2: 0xdfe6fa, wall: 0xa8b8e0, wallTop: 0xe0e8ff, edge: 0x7a8ac0, gap: 0x8fc8ff },
};

const T = 16;

/** Bake a room's floor, walls, ice, pits, gaps, plates and the exit into one canvas. */
export function bakeRoom(room: Room, theme: Theme): PixelCanvas {
  const c = new PixelCanvas(room.w * T, room.h * T);
  const th = THEME[theme];
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= room.w || y >= room.h ? '#' : room.grid[y * room.w + x]!);
  for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
    const ch = at(tx, ty);
    const ox = tx * T, oy = ty * T;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const n = hash32(ox + x, oy + y, 3) & 63;
      let col = (x + ((y >> 3) % 2) * 8) % 16 === 0 || y % 8 === 0 ? th.floor2 : n === 0 ? th.floor2 : th.floor;
      if (ch === '#') {
        const below = at(tx, ty + 1) !== '#';
        col = below && y >= 9 ? (y === 9 ? th.edge : (x + (y >> 1)) % 6 === 0 ? th.edge : th.wall) : n < 2 ? darken(th.wallTop, 0.08) : th.wallTop;
      } else if (ch === ',') {
        col = (x + y * 2) % 19 === 0 || (x * 2 - y + 40) % 23 === 0 ? P.ice3 : P.ice2;
      } else if (ch === 'x') {
        const r = Math.hypot(x - 7.5, y - 7.5);
        col = r < 6 ? th.gap : r < 7.2 ? darken(th.floor2, 0.25) : col;
      } else if (ch === '=') {
        col = th.gap;
        if (theme === 'mine' && (y === 4 || y === 11)) col = 0x8a8aa0; // rails
        if ((theme === 'spire' || theme === 'ridge') && n < 4) col = 0xffffff;
      } else if (ch === '~') {
        col = n < 6 ? P.w3 : P.w2;
      } else if (ch === '_') {
        const r = Math.hypot(x - 7.5, y - 7.5);
        col = r < 5.5 ? (r < 3.5 ? 0xffd86b : 0xe0a83a) : r < 6.5 ? darken(th.floor, 0.3) : col;
      } else if (ch === 'E') {
        // stairs going up
        col = y % 4 < 1 ? th.edge : y % 4 < 2 ? lighten(th.wallTop, 0.3) : th.wallTop;
        if (x < 2 || x > 13) col = th.wall;
      }
      c.px[(oy + y) * c.w + ox + x] = col;
    }
  }
  return c;
}

export function block(theme: Theme): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const base = theme === 'summit' || theme === 'pass' ? 0x9fc0e8 : theme === 'canopy' || theme === 'woods' ? 0xb08050 : 0xb4a490;
  c.rect(1, 2, 14, 13, darken(base, 0.2)).rect(1, 1, 14, 11, base).rect(2, 2, 12, 2, lighten(base, 0.3));
  c.line(4, 6, 11, 6, darken(base, 0.15)).line(4, 9, 8, 9, darken(base, 0.15));
  return c.outline(P.ink, true);
}

const COLOR: Record<string, number> = { p: 0xff7ac0, t: 0x3fd0c0, y: 0xf5c830 };

/** Colour switch: a round button with its colour's shape (circle, triangle, square). */
export function colorSwitch(color: 'p' | 't' | 'y'): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.ellipse(8, 9, 6.5, 5, 0x6a6a7a).ellipse(8, 8, 5.5, 4, COLOR[color]!);
  shape(c, color, 8, 8, P.white, 2);
  return c.outline(P.ink, true);
}

export function colorGate(color: 'p' | 't' | 'y', open: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const col = COLOR[color]!;
  if (open) {
    c.rect(1, 12, 14, 3, darken(col, 0.3)).rect(1, 12, 14, 1, col);
  } else {
    c.rect(0, 1, 2, 15, 0x6a6a7a).rect(14, 1, 2, 15, 0x6a6a7a);
    for (const x of [3, 7, 11]) c.rect(x, 2, 2, 13, col).rect(x, 2, 1, 13, lighten(col, 0.4));
    shape(c, color, 8, 8, P.white, 2.5);
  }
  return c.outline(P.ink, true);
}

function shape(c: PixelCanvas, color: 'p' | 't' | 'y', cx: number, cy: number, col: number, r: number): void {
  if (color === 'p') c.circle(cx, cy, r, col);
  else if (color === 't') c.poly([[cx, cy - r - 0.5], [cx + r + 0.5, cy + r], [cx - r - 0.5, cy + r]], col);
  else c.rect(cx - r, cy - r, r * 2, r * 2, col);
}

export function door(open: boolean, theme: Theme): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const th = THEME[theme];
  if (open) c.rect(0, 0, 16, 16, th.floor2).rect(0, 0, 2, 16, th.wall).rect(14, 0, 2, 16, th.wall);
  else {
    c.rect(0, 0, 16, 16, th.wall).rect(2, 1, 12, 15, 0xc0904a).rect(2, 1, 12, 2, 0xe0b06a);
    c.rect(7, 7, 2, 4, 0x6a4a20).circle(8, 6, 2, 0xffd86b);
  }
  return c.outline(P.ink, true);
}

export function emitter(dir: number): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(2, 2, 12, 12, 0x8a7aa8).rect(3, 3, 10, 10, 0x6a5a88);
  const [dx, dy] = [[0, 1], [-1, 0], [1, 0], [0, -1]][dir]!;
  c.circle(8 + dx * 4, 8 + dy * 4, 2.5, 0xfff3b0).circle(8, 8, 2, 0xffd84a);
  return c.outline(P.ink, true);
}

export function mirror(kind: '/' | '\\', turnable: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.ellipse(8, 13, 6, 2.5, turnable ? 0x8f70e0 : 0x8a8aa0);
  for (let i = 0; i < 12; i++) {
    const x = kind === '/' ? 2 + i : 13 - i, y = 13 - i;
    c.rect(x, y - 1, 2, 3, i % 3 === 0 ? P.white : 0xc8e8ff);
  }
  if (turnable) c.set(2, 2, 0xffd84a).set(3, 2, 0xffd84a).set(2, 3, 0xffd84a);
  return c.outline(P.ink, true);
}

export function crystal(lit: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(4, 12, 8, 3, 0x6a6a7a);
  c.poly([[8, 1], [12, 6], [8, 13], [4, 6]], lit ? 0xffe6a0 : 0x8f98c0);
  c.poly([[8, 1], [8, 13], [4, 6]], lit ? 0xfff6d0 : 0xa8b0d0);
  if (lit) c.set(6, 4, P.white).set(7, 3, P.white);
  return c.outline(P.ink, true);
}

export function platformSprite(theme: Theme): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  if (theme === 'mine') {
    c.rect(1, 4, 14, 8, 0x7a6a5a).rect(2, 5, 12, 2, 0x9a8a7a).circle(4, 13, 2, 0x3a3a46).circle(12, 13, 2, 0x3a3a46);
  } else if (theme === 'spire' || theme === 'ridge') {
    c.ellipse(8, 9, 7.5, 5, P.cloud2).ellipse(5, 7, 4, 3, 0xffffff).ellipse(11, 8, 4, 3, P.cloud1);
  } else {
    c.rect(1, 3, 14, 10, P.wood3);
    for (const y of [5, 8, 11]) c.hline(1, 14, y, P.wood1);
  }
  return c.outline(P.ink, true);
}

export function iceBlock(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(1, 1, 14, 14, P.ice1).rect(2, 2, 6, 3, P.ice3).line(9, 4, 12, 11, P.white);
  return c.outline(0x4a6a9a);
}

export function vineWall(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  for (const x of [1, 5, 9, 13]) for (let y = 0; y < 16; y++) c.set(x + Math.round(Math.sin(y * 0.7 + x) * 1.2), y, y % 4 === 0 ? P.leafLight : P.leafDark).set(x + 1, y, P.leaf);
  return c.outline(P.ink, true);
}
