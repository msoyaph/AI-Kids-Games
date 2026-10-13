/**
 * Ground baking: a whole map's terrain is painted once into one big PixelCanvas (then uploaded as
 * a few textures). Each terrain has a seeded 16×16 texture; neighbouring terrains blend with soft,
 * noisy edges (the higher layer spills over the lower), water gets a foam line along the shore,
 * cliffs get a grassy lip and a rock face. Pure and deterministic: the same map always looks the same.
 */
import { hash32 } from '../core/rng';
import { TER, type Ter } from '../data/terrain';
import { P } from './palette';
import { darken, lighten, mix, PixelCanvas, T } from './pixelcanvas';

const TILE = 16;

/** Deterministic noise 0..1 for a pixel. */
const noise = (x: number, y: number, k = 0) => (hash32(x, y, k) & 0xffff) / 0xffff;

/** A detail stamped once per cell (tufts, wave lines, pebbles): is (x, y) on it? */
function cellFeature(x: number, y: number, cell: number, k: number, chance: number): { dx: number; dy: number } | null {
  const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
  const h = hash32(cx, cy, k);
  if ((h & 0xff) / 255 > chance) return null;
  const ox = 2 + ((h >> 8) % (cell - 5)), oy = 2 + ((h >> 16) % (cell - 4));
  return { dx: (x % cell) - ox, dy: (y % cell) - oy };
}

/** Colour of one pixel of a terrain's texture at world pixel (x, y). Flat colours, sparse details. */
export function terrainPixel(t: Ter, x: number, y: number, theme = 0): number {
  const n = noise(x, y, 7);
  switch (t) {
    case 'grass': case 'flowers': case 'tall': {
      const base = theme === 1 ? P.g2 : P.g3;
      const dark = theme === 1 ? P.g1 : P.g2;
      let c: number = base;
      const tuft = cellFeature(x, y, 8, 21, 0.55);
      if (tuft) {
        const { dx, dy } = tuft;
        if ((dy === 0 && (dx === 0 || dx === 2)) || (dy === 1 && dx === 1)) c = dark;
        if (dy === -1 && (dx === 0 || dx === 2)) c = theme === 1 ? P.g3 : P.g4;
      }
      if (n > 0.985) c = P.g4;
      if (t === 'flowers') {
        const f = cellFeature(x, y, 8, 31, 0.8);
        if (f && Math.abs(f.dx) + Math.abs(f.dy) <= 1) {
          const col = [P.flowerPink, P.flowerYellow, P.flowerWhite, P.flowerBlue][hash32(x >> 3, y >> 3, 3) % 4]!;
          c = f.dx === 0 && f.dy === 0 ? P.flowerYellow : col;
        }
      }
      if (t === 'tall') c = mix(c, P.tall1, 0.6);
      return c;
    }
    case 'path': {
      const peb = cellFeature(x, y, 6, 41, 0.5);
      if (peb && peb.dy === 0 && (peb.dx === 0 || peb.dx === 1)) return P.dirt1;
      if (peb && peb.dy === -1 && peb.dx === 0) return P.dirt3;
      return n > 0.97 ? P.dirt3 : n < 0.03 ? P.dirt1 : P.dirt2;
    }
    case 'plaza': {
      const bx = (x + ((y >> 3) % 2) * 4) % 8, by = y % 8;
      if (bx === 0 || by === 0) return P.cob0;
      if (bx === 1 || by === 1) return P.cob3;
      return hash32(x >> 3, y >> 3, 9) % 5 === 0 ? P.cob1 : P.cob2;
    }
    case 'sand': {
      const s = cellFeature(x, y, 7, 51, 0.45);
      if (s && s.dy === 0 && s.dx >= 0 && s.dx <= 2) return P.sand1;
      return n > 0.98 ? P.sand3 : n < 0.02 ? P.sand1 : P.sand2;
    }
    case 'snow': {
      const s = cellFeature(x, y, 8, 61, 0.5);
      if (s && s.dy === 0 && s.dx >= -1 && s.dx <= 1) return P.snow1;
      return n < 0.015 ? P.snow1 : P.snow2;
    }
    case 'ice': {
      const streak = (x + y * 2) % 19 === 0 || (x * 2 - y + 40) % 23 === 0;
      return streak ? P.ice3 : P.ice2;
    }
    case 'water': {
      const wave = cellFeature(x, y, 12, 71, 0.7);
      if (wave && wave.dy === 0 && wave.dx >= 0 && wave.dx <= 4) return P.w3;
      if (wave && wave.dy === 1 && wave.dx >= 1 && wave.dx <= 3) return P.w1;
      return P.w2;
    }
    case 'shallow': {
      const wave = cellFeature(x, y, 10, 73, 0.6);
      if (wave && wave.dy === 0 && wave.dx >= 0 && wave.dx <= 3) return P.w4;
      return mix(P.w3, P.sand2, 0.3);
    }
    case 'cave': {
      const r = cellFeature(x, y, 7, 81, 0.5);
      if (r && r.dy === 0 && (r.dx === 0 || r.dx === 1)) return P.cave1;
      if (r && r.dy === -1 && r.dx === 0) return P.cave3;
      return P.cave2;
    }
    case 'dark': return n < 0.03 ? P.cave0 : P.dark;
    case 'cloud': {
      const puff = cellFeature(x, y, 10, 91, 0.6);
      if (puff && puff.dx * puff.dx + puff.dy * puff.dy * 3 < 6) return P.cloud1;
      return P.cloud2;
    }
    case 'void': {
      if (theme !== 2) return P.dark;
      const band = Math.floor((y + Math.sin(x * 0.05) * 6) / 24) % 2;
      return band ? P.sky0 : P.sky1;
    }
    case 'bridge': {
      if (y % 5 === 0) return P.wood0;
      return hash32(x >> 4, Math.floor(y / 5), 4) % 3 === 0 ? P.wood2 : P.wood3;
    }
    case 'floor': {
      const plank = y % 6 === 0 || (x + Math.floor(y / 6) * 5) % 16 === 0;
      return plank ? P.wood1 : hash32(Math.floor((x + Math.floor(y / 6) * 5) / 16), Math.floor(y / 6), 2) % 3 === 0 ? P.wood2 : P.wood3;
    }
    case 'rug': return (x + y) % 8 < 4 ? 0xd9604f : (x - y + 64) % 8 < 1 ? 0xffd8a8 : 0xe8806a;
    case 'stairs': return y % 4 < 1 ? P.r1 : y % 4 < 2 ? P.r3 : P.r2;
    // cliff tops are raised ground (the rock face is drawn on their lower edge): grass, or the
    // region's own rock (4 cave, 5 desert sandstone, 6 snow, 7 mountain)
    case 'cliff': {
      const n = hash32(x >> 2, y >> 2, 31) & 7;
      if (theme === 4) return n === 0 ? 0x3a3246 : n < 3 ? 0x2c2638 : 0x332c40;
      if (theme === 5) return n === 0 ? 0xc86a40 : n < 3 ? 0xe08a5a : 0xd9774b;
      if (theme === 6) return n === 0 ? P.snow1 : P.snow2;
      if (theme === 7) return n === 0 ? P.r1 : n < 3 ? P.r3 : P.r2;
      return terrainPixel('grass', x, y, 1);
    }
    case 'wall': {
      if (theme === 3) {
        // indoor wallpaper with a wood skirting board on the lowest row of the wall
        if (y % 16 >= 12) return y % 16 === 12 ? P.wood4 : P.wood2;
        return (x % 8 === 0) ? 0xf0d8b4 : (x + y) % 16 === 4 ? 0xffd8c8 : 0xfbe8c8;
      }
      return (y % 8 === 0 || (x + ((y >> 3) % 2) * 8) % 16 === 0) ? P.r1 : P.r2;
    }
  }
}

export interface GroundSource {
  w: number;
  h: number;
  at(x: number, y: number): Ter;
  /** 0 normal, 1 forest (darker grass), 2 sky (void is sky). */
  theme?: number;
}

/**
 * Paint a whole map's ground. Edges between terrains are soft: a pixel near a tile edge takes the
 * neighbour's texture when the neighbour is a higher layer and the noisy edge depth reaches it.
 */
export function bakeGround(src: GroundSource): PixelCanvas {
  const pc = new PixelCanvas(src.w * TILE, src.h * TILE);
  const theme = src.theme ?? 0;
  const at = (tx: number, ty: number): Ter => (tx < 0 || ty < 0 || tx >= src.w || ty >= src.h ? src.at(Math.max(0, Math.min(src.w - 1, tx)), Math.max(0, Math.min(src.h - 1, ty))) : src.at(tx, ty));
  for (let ty = 0; ty < src.h; ty++) for (let tx = 0; tx < src.w; tx++) {
    const t = at(tx, ty);
    const layer = TER[t].layer;
    const nb: Ter[] = [at(tx, ty - 1), at(tx + 1, ty), at(tx, ty + 1), at(tx - 1, ty)];
    const diag: Ter[] = [at(tx - 1, ty - 1), at(tx + 1, ty - 1), at(tx + 1, ty + 1), at(tx - 1, ty + 1)];
    for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
      const x = tx * TILE + px, y = ty * TILE + py;
      let use: Ter = t;
      // soft edges from higher neighbours (cliffs and walls keep crisp edges)
      if (t !== 'cliff' && t !== 'wall') {
        const depth = 2 + noise(x, y, 5) * 3;
        const dists = [py, TILE - 1 - px, TILE - 1 - py, px];
        let best = Infinity;
        for (let k = 0; k < 4; k++) {
          const n = nb[k]!;
          if (n === 'cliff' || n === 'wall' || n === 'bridge' || n === 'floor' || n === 'rug') continue;
          if (TER[n].layer > layer && dists[k]! < depth && dists[k]! < best) { best = dists[k]!; use = n; }
        }
        if (use === t) {
          const cd = [Math.hypot(px, py), Math.hypot(TILE - 1 - px, py), Math.hypot(TILE - 1 - px, TILE - 1 - py), Math.hypot(px, TILE - 1 - py)];
          for (let k = 0; k < 4; k++) {
            const n = diag[k]!;
            if (n === 'cliff' || n === 'wall' || n === 'bridge' || n === 'floor' || n === 'rug') continue;
            if (TER[n].layer > layer && cd[k]! < depth) use = n;
          }
        }
      }
      let c = terrainPixel(use, x, y, theme);
      // shoreline foam on water next to land
      if (t === 'water' && use === 'water') {
        const land = (k: number) => nb[k] !== 'water' && nb[k] !== 'void';
        const d = Math.min(land(0) ? py : 99, land(1) ? TILE - 1 - px : 99, land(2) ? TILE - 1 - py : 99, land(3) ? px : 99);
        if (d < 1.5 + noise(x, y, 9)) c = P.foam;
        else if (d < 3.5) c = mix(c, P.w4, 0.45);
      }
      pc.px[y * pc.w + x] = c;
    }
    // cliffs: a raised grassy top with a rock face where the cliff ends below, and dark rims on the sides
    if (t === 'cliff') {
      const below = nb[2]!, left = nb[3]!, right = nb[1]!;
      const rim = theme === 4 ? 0x1c1830 : theme === 5 ? 0x8a3f20 : theme === 6 ? 0x8fa8d0 : theme === 7 ? P.r0 : P.g0;
      const face: [number, number, number, number] = theme === 4 ? [0x1c1830, 0x2c2638, 0x3a3246, 0x4a4256] : theme === 5 ? [0x8a3f20, 0xa84f30, 0xc06040, 0xd9774b] : [P.r0, P.r1, P.r2, P.r3];
      const isCliff = (n: Ter) => n === 'cliff' || n === 'wall';
      for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
        const x = tx * TILE + px, y = ty * TILE + py;
        let c = pc.px[y * pc.w + x]!;
        if (!isCliff(left) && px === 0) c = rim;
        if (!isCliff(right) && px === TILE - 1) c = rim;
        if (!isCliff(below) && py >= 6) {
          const fy = py - 6;
          const crack = (px + (fy >> 2) * 5) % 7 === 0 && fy % 4 !== 0;
          c = fy === 0 ? rim : fy === 1 ? face[3] : fy >= 8 ? face[0] : crack ? face[0] : fy < 4 ? face[2] : face[1];
        }
        pc.px[y * pc.w + x] = c;
      }
    }
  }
  return pc;
}

/** Tall grass tuft overlay (drawn over the ground so creatures and the player wade through it). */
export function tallGrassTuft(frame: number): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const sway = frame === 1 ? 1 : 0;
  for (const [x0, h] of [[1, 9], [5, 11], [9, 10], [13, 9]] as const) {
    for (let y = 0; y < h; y++) {
      const x = x0 + (y < h / 2 ? sway : 0);
      c.set(x, 15 - y, y > h - 3 ? P.tall2 : y > 3 ? P.tall1 : P.tall0);
      c.set(x + 1, 15 - y, y > h - 3 ? lighten(P.tall2, 0.2) : P.tall1);
    }
  }
  return c;
}

/** Water sparkle (animated overlay, a few per screen). */
export function waterSparkle(frame: number): PixelCanvas {
  const c = new PixelCanvas(8, 8);
  if (frame === 0) c.set(3, 3, P.foam);
  else if (frame === 1) c.set(3, 3, P.foam).set(2, 3, P.w4).set(4, 3, P.w4).set(3, 2, P.w4).set(3, 4, P.w4);
  return c;
}

export { T, darken };
