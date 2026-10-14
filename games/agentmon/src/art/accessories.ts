/**
 * Dressing a friend (1.1): draws an accessory onto a creature sprite. Every Agentmon has a different
 * shape, so the accessory finds its place from the sprite itself: hats sit on the top of the head,
 * bows and scarves where the body is about halfway down, capes behind. Drawn with the creature
 * painter (design pixels, the same outline), so it matches at 32 and 64 px. Pure (no DOM).
 */
import type { AccessoryDef } from '../data/accessories';
import { Painter } from './painter';
import { PixelCanvas, T } from './pixelcanvas';

interface Shape { top: number; bottom: number; headX: number; neckY: number; neckX: number; neckHalf: number; bodyHalf: number; bodyX: number }

/**
 * Where the head and the neck are on a sprite, in design units (32-px space). With the face's place
 * (from the painter), the head is the body straight above the face, and the neck just under the
 * mouth; without it, the top and the middle of the silhouette.
 */
function shapeOf(pc: PixelCanvas, size: number, pad: number, face?: { x0: number; y0: number; x1: number; y1: number } | null): Shape {
  const s = size / 32;
  const rows: [number, number][] = [];
  let top = -1, bottom = -1;
  for (let y = 0; y < pc.h; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < pc.w; x++) if (pc.px[y * pc.w + x] !== T) { if (l < 0) l = x; r = x; }
    rows.push([l, r]);
    if (l >= 0) { if (top < 0) top = y; bottom = y; }
  }
  if (top < 0) return { top: 8, bottom: 30, headX: 16, neckY: 18, neckX: 16, neckHalf: 6, bodyHalf: 8, bodyX: 16 };
  // the head: the middle of the top few rows (the widest of them, so ears and antennae don't win)
  const band = Math.max(2, Math.round(3 * s));
  let best = rows[top]!;
  for (let y = top; y < Math.min(pc.h, top + band * 2); y++) if (rows[y]![1] - rows[y]![0] > best[1] - best[0]) best = rows[y]!;
  const d = (v: number) => (v - pad) / s;
  if (face) {
    // up from the face through the body until the air (ears, wings and floating bits stay free)
    const cx = Math.round((face.x0 + face.x1) / 2);
    let y = face.y0;
    while (y > 0 && pc.px[(y - 1) * pc.w + cx] !== T) y--;
    const neckRow = Math.min(bottom, face.y1 + Math.round(2.5 * s));
    const [nl, nr] = rows[neckRow]!;
    const half = Math.min(((nr - nl) / 2 / s) * 0.8, (face.x1 - face.x0) / s * 0.75 + 2);
    return { top: d(y + band * 0.6), bottom: d(bottom), headX: d(cx), neckY: d(neckRow), neckX: d(cx), neckHalf: Math.max(3, half), bodyHalf: (nr - nl) / 2 / s, bodyX: d((nl + nr) / 2) };
  }
  const neckRow = Math.round(top + (bottom - top) * 0.55);
  const [nl, nr] = rows[neckRow]!;
  return {
    top: d(top + band * 0.6), bottom: d(bottom),
    headX: d((best[0] + best[1]) / 2), neckY: d(neckRow), neckX: d((nl + nr) / 2), neckHalf: Math.max(3, ((nr - nl) / 2 / s) * 0.8),
    bodyHalf: (nr - nl) / 2 / s, bodyX: d((nl + nr) / 2),
  };
}

const COL = {
  white: 0xfffbf2, navy: 0x3f6fc9, gold: 0xffd84a, red: 0xe85a4f, pink: 0xff8fb0, green: 0x4fa66a, leaf: 0x7fd36a,
  lamp: 0xfff6c0, helmet: 0xf2b33d, silver: 0xdfe4f0, sky: 0x8fd8ff, ink: 0x2a1f3d, cape: 0x4a5ab8,
};

function drawOn(p: Painter, a: AccessoryDef, sh: Shape): void {
  const { headX: hx, top: ht, neckX: nx, neckY: ny, neckHalf: hw } = sh;
  switch (a.id) {
    case 'sailor-hat': p.ellipse(hx, ht - 1.4, 5, 2.6, COL.white).rect(hx - 5, ht, 10.5, 1.5, COL.navy).dot(hx + 3, ht - 2, COL.navy); break;
    case 'flower-crown':
      [-2, -1, 0, 1, 2].forEach((i, k) => p.circle(hx + i * 2.4, ht + 0.4 - (2 - Math.abs(i)) * 0.45, 1.3, [COL.pink, COL.gold, COL.white, COL.gold, COL.pink][k]!));
      [-2, -1, 0, 1, 2].forEach(i => p.dot(hx + i * 2.4, ht + 0.4 - (2 - Math.abs(i)) * 0.45, i % 2 ? COL.white : COL.gold));
      break;
    case 'miner-lamp': p.ellipse(hx, ht - 0.6, 5, 3, COL.helmet).rect(hx - 5.5, ht + 1, 11, 1, 0xc88a2a).circle(hx, ht - 1, 1.4, COL.lamp); break;
    case 'sun-hat': p.ellipse(hx, ht + 0.6, 8, 1.7, COL.gold).ellipse(hx, ht - 1.4, 4, 2.6, COL.gold).rect(hx - 4, ht - 0.2, 8, 1, COL.red); break;
    case 'snow-earmuffs':
      p.line(hx - 5, ht + 1.5, hx - 2.5, ht - 1.2, COL.navy).line(hx - 2.5, ht - 1.2, hx + 2.5, ht - 1.2, COL.navy).line(hx + 2.5, ht - 1.2, hx + 5, ht + 1.5, COL.navy);
      p.circle(hx - 5.4, ht + 2.6, 2, COL.white).circle(hx + 5.4, ht + 2.6, 2, COL.white);
      break;
    case 'lantern-cap': p.ellipse(hx, ht - 0.4, 4.2, 2.3, COL.green).line(hx + 1, ht - 2.4, hx + 3, ht - 4.5, 0x6a4e36).circle(hx + 3.4, ht - 4.2, 1.4, 0xffd86b).dot(hx + 3.4, ht - 4.2, COL.lamp); break;
    case 'agent-goggles':
      p.rect(hx - 5.5, ht + 1.2, 11, 1.2, COL.ink).circle(hx - 2.3, ht + 1.6, 1.8, COL.sky).circle(hx + 2.3, ht + 1.6, 1.8, COL.sky);
      p.dot(hx - 3, ht + 1, COL.white).dot(hx + 1.6, ht + 1, COL.white);
      break;
    case 'teacup-bow':
      p.poly([[nx - 3.6, ny - 1.8], [nx - 3.6, ny + 1.8], [nx, ny]], COL.pink).poly([[nx + 3.6, ny - 1.8], [nx + 3.6, ny + 1.8], [nx, ny]], COL.pink).circle(nx, ny, 1, 0xff6b8a);
      break;
    case 'silver-star':
      p.line(nx - hw * 0.6, ny - 1.5, nx, ny, COL.navy).line(nx + hw * 0.6, ny - 1.5, nx, ny, COL.navy);
      p.poly([[nx, ny - 0.6], [nx + 0.9, ny + 1.2], [nx + 2.6, ny + 1.4], [nx + 1.3, ny + 2.6], [nx + 1.7, ny + 4.4], [nx, ny + 3.4], [nx - 1.7, ny + 4.4], [nx - 1.3, ny + 2.6], [nx - 2.6, ny + 1.4], [nx - 0.9, ny + 1.2]], COL.silver);
      break;
    case 'rainbow-scarf': {
      const cols = [COL.red, 0xf59a3a, COL.gold, COL.leaf, COL.sky, 0xb48ae0];
      cols.forEach((c, i) => p.rect(nx - hw + (i * 2 * hw) / cols.length, ny - 1.2, (2 * hw) / cols.length + 0.5, 2.4, c));
      p.rect(nx + hw * 0.35, ny + 1, 2, 4, COL.red).rect(nx + hw * 0.35, ny + 3, 2, 2, COL.gold);
      break;
    }
    case 'star-cape': {
      // behind the body, fanning out past it on both sides
      const bx = sh.bodyX, bh = sh.bodyHalf, y0 = ny - 4;
      p.poly([[bx - bh * 0.6, y0], [bx + bh * 0.6, y0], [bx + bh + 3, sh.bottom - 1], [bx - bh - 3, sh.bottom - 1]], COL.cape);
      for (const [dx, dy] of [[-bh - 1.5, 4], [bh + 1.5, 3], [-bh - 0.5, 8], [bh + 1, 8]] as const) p.dot(bx + dx, Math.min(sh.bottom - 2, y0 + dy), COL.gold);
      break;
    }
    case 'leaf-cape': {
      const bx = sh.bodyX, bh = sh.bodyHalf, y0 = ny - 4;
      p.poly([[bx - bh * 0.6, y0], [bx + bh * 0.6, y0], [bx + bh + 3.5, sh.bottom - 3], [bx + bh + 1, sh.bottom], [bx - bh - 1, sh.bottom], [bx - bh - 3.5, sh.bottom - 3]], COL.leaf);
      p.line(bx - bh - 2.5, sh.bottom - 3, bx - bh * 0.4, y0 + 1, COL.green).line(bx + bh + 2.5, sh.bottom - 3, bx + bh * 0.4, y0 + 1, COL.green);
      break;
    }
  }
}

/** The creature picture `pc` (drawn at `size` with margin `pad`, its face at `face`) wearing `a`. Returns a new canvas. */
export function dress(pc: PixelCanvas, a: AccessoryDef, size: 16 | 32 | 64, pad: number, face?: { x0: number; y0: number; x1: number; y1: number } | null): PixelCanvas {
  if (size === 16) return pc; // too small to show well; the menus and battles use 32 and 64
  const sh = shapeOf(pc, size, pad, face);
  const p = new Painter(size);
  drawOn(p, a, sh);
  const acc = p.finish();
  const out = new PixelCanvas(pc.w, pc.h);
  if (a.slot === 'back') { out.blit(acc, 0, 0); out.blit(pc, 0, 0); }
  else { out.blit(pc, 0, 0); out.blit(acc, 0, 0); }
  return out;
}
