/** Terrain tiles (16×16) for all seasons, plus tilled-soil and water edge masks. */
import { Rng } from '../../core/rng';
import { Ter } from '../../sim/terrain';
import type { Atlas } from '../atlas';
import { P, SEASON_GRASS } from '../palette';
import { PixelCanvas, darken, lighten, mix } from '../pixelcanvas';

export const TER_VARIANTS = 4;

/** Palette swap from spring grass ramp to a season's ramp. */
export function seasonMap(season: number): Map<number, number> {
  const m = new Map<number, number>();
  const src = SEASON_GRASS[0];
  const dst = SEASON_GRASS[season];
  for (let i = 0; i < src.length; i++) m.set(src[i], dst[i]);
  return m;
}

function grass(rng: Rng, flowers: boolean, season: number): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(P.g3);
  c.speckle(rng, P.g2, 0.1);
  c.speckle(rng, P.g4, 0.07);
  for (let k = 0; k < 3; k++) {
    const x = rng.int(14) + 1, y = rng.int(13) + 2;
    c.set(x, y, P.g2);
    c.set(x - 1, y - 1, P.g4);
    c.set(x + 1, y - 1, P.g4);
  }
  if (flowers && season !== 3) {
    const cols = [
      [P.k2, P.y2, P.white],
      [P.o3, P.bl3, P.y1],
      [P.r2, P.o3, P.y1],
    ][Math.min(2, season)];
    for (let k = 0; k < 4; k++) {
      const x = rng.int(13) + 1, y = rng.int(13) + 1;
      const fc = rng.pick(cols);
      c.set(x, y, fc);
      c.set(x + 1, y, fc);
      c.set(x, y + 1, fc);
      c.set(x + 1, y + 1, P.y1);
    }
  }
  return c;
}

function dirt(rng: Rng, base: number = P.b3): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(base);
  c.speckle(rng, darken(base, 0.25), 0.12);
  c.speckle(rng, lighten(base, 0.2), 0.05);
  for (let k = 0; k < 2; k++) {
    const x = rng.int(14) + 1, y = rng.int(14) + 1;
    c.set(x, y, P.s3);
    c.set(x + 1, y, P.s4);
  }
  return c;
}

function cobbles(rng: Rng, a: number, b: number, gap: number): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(gap);
  const stones = [
    [0, 0, 7, 5], [8, 0, 8, 4], [0, 6, 5, 5], [6, 5, 6, 6], [13, 5, 3, 6], [0, 12, 8, 4], [9, 12, 7, 4],
  ];
  for (const [x, y, w, h] of stones) {
    const col = rng.chance(0.5) ? a : b;
    c.rect(x + 0, y + 0, w - 1, h - 1, col);
    c.hline(x, x + w - 2, y, lighten(col, 0.25));
    c.set(x, y, gap);
    c.set(x + w - 2, y + h - 2, darken(col, 0.2));
  }
  return c;
}

function sand(rng: Rng): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(P.sa2);
  c.speckle(rng, P.sa1, 0.12);
  c.speckle(rng, P.sa3, 0.08);
  return c;
}

function water(rng: Rng, deep: boolean): PixelCanvas {
  const base = deep ? P.w1 : P.w2;
  const wave = deep ? P.w2 : P.w3;
  const c = new PixelCanvas(16, 16).fill(base);
  for (let k = 0; k < 3; k++) {
    const x = rng.int(12), y = rng.int(14) + 1;
    c.hline(x, x + 2, y, wave);
    c.set(x + 3, y - 1, wave);
  }
  if (rng.chance(0.5)) c.set(rng.int(16), rng.int(16), P.w4);
  return c;
}

/** Water shore edges for a mask: bit0 N land, 1 E, 2 S, 3 W. */
function waterEdge(mask: number, deep: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const foam = deep ? P.w2 : P.w4, mid = deep ? P.w2 : P.w3;
  if (mask & 1) { c.hline(0, 15, 0, foam); c.hline(0, 15, 1, mid); }
  if (mask & 4) { c.hline(0, 15, 15, mid); }
  if (mask & 8) { c.vline(0, 0, 15, foam); c.vline(1, 0, 15, mid); }
  if (mask & 2) { c.vline(15, 0, 15, foam); c.vline(14, 0, 15, mid); }
  return c;
}

function cliff(rng: Rng, top: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(P.s2);
  for (let k = 0; k < 4; k++) {
    const x = rng.int(15), y = rng.int(10) + 3;
    c.vline(x, y, Math.min(15, y + 3), P.s1);
    c.set(x + 1, y, P.s3);
  }
  c.hline(0, 15, 15, P.s1);
  c.speckle(rng, P.s3, 0.05);
  if (top) {
    c.rect(0, 0, 16, 4, P.g3);
    c.speckle(rng, P.g4, 0.2, P.g3, 0, 0, 16, 3);
    for (let x = 0; x < 16; x++) if (rng.chance(0.5)) c.set(x, 4, P.g2);
    c.hline(0, 15, 5, P.s1);
  } else {
    c.hline(0, 15, 0, P.s3);
  }
  return c;
}

function planks(rng: Rng, base: number, vertical: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(base);
  const line = darken(base, 0.3), hi = lighten(base, 0.18);
  for (let k = 0; k < 4; k++) {
    if (vertical) {
      c.vline(k * 4, 0, 15, line);
      c.vline(k * 4 + 1, 0, 15, hi);
      const s = rng.int(16);
      c.set(k * 4 + 2, s, line);
    } else {
      c.hline(0, 15, k * 4 + 3, line);
      c.hline(0, 15, k * 4, hi);
      const s = (rng.int(3) * 5 + k * 3) % 16;
      c.vline(s, k * 4, k * 4 + 2, line);
    }
  }
  c.speckle(rng, darken(base, 0.12), 0.04);
  return c;
}

function wall(rng: Rng): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(0xd9c4a0);
  for (let x = 0; x < 16; x += 4) c.vline(x, 0, 11, 0xc9ae88);
  c.speckle(rng, 0xe6d6b8, 0.03, 0xd9c4a0, 0, 0, 16, 11);
  c.rect(0, 11, 16, 5, P.b3);
  c.hline(0, 15, 11, P.b4);
  c.hline(0, 15, 15, P.b1);
  c.hline(0, 15, 0, P.b2);
  return c;
}

function wallTop(): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(P.ink2);
  c.hline(0, 15, 15, P.b1);
  return c;
}

function tileFloor(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) c.set(x, y, ((x >> 3) + (y >> 3)) % 2 ? P.s4 : P.s5);
  c.hline(0, 15, 0, P.s3);
  c.vline(0, 0, 15, P.s3);
  return c;
}

function carpet(rng: Rng): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(P.r1);
  c.speckle(rng, P.r2, 0.08);
  for (let i = 2; i < 16; i += 6) c.set(i, i, P.y1);
  return c;
}

function stoneFloor(rng: Rng): PixelCanvas {
  const c = cobbles(rng, P.s3, P.s4, P.s2);
  return c;
}

function rail(rng: Rng): PixelCanvas {
  const c = dirt(rng, P.b2);
  for (let y = 1; y < 16; y += 5) c.rect(1, y, 14, 2, P.b3);
  c.vline(4, 0, 15, P.s4);
  c.vline(11, 0, 15, P.s4);
  c.vline(5, 0, 15, P.s2);
  c.vline(12, 0, 15, P.s2);
  return c;
}

function brokenBridge(rng: Rng): PixelCanvas {
  const c = water(rng, false);
  c.rect(2, 3, 5, 2, P.b2);
  c.rect(9, 10, 4, 2, P.b2);
  c.hline(2, 6, 3, P.b3);
  return c;
}

/** Tilled soil overlay; mask bits = neighbours that are also tilled (N,E,S,W). */
function soil(mask: number, wet: boolean): PixelCanvas {
  const base = wet ? P.soilW : P.soil;
  const dark = wet ? P.soilWD : P.soilD;
  const light = wet ? mix(P.soilW, P.soil, 0.5) : mix(P.soil, P.b4, 0.35);
  const c = new PixelCanvas(16, 16).fill(base);
  for (let y = 2; y < 16; y += 4) c.hline(1, 14, y, dark);
  for (let y = 3; y < 16; y += 4) for (let x = 2; x < 14; x += 3) c.set(x, y, light);
  if (!(mask & 1)) { c.hline(0, 15, 0, dark); c.set(0, 0, -1); c.set(15, 0, -1); }
  if (!(mask & 4)) { c.hline(0, 15, 15, dark); c.set(0, 15, -1); c.set(15, 15, -1); }
  if (!(mask & 8)) { c.vline(0, 1, 14, dark); }
  if (!(mask & 2)) { c.vline(15, 1, 14, dark); }
  return c;
}

/** Fertilizer marker overlay (tiny dots). */
function fert(kind: number): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const col = [0, P.y2, P.bl3, P.k3][kind];
  const pts = [[3, 4], [11, 3], [7, 9], [2, 12], [12, 12], [8, 1]];
  for (const [x, y] of pts) c.set(x, y, col);
  return c;
}

export function caveFloor(rng: Rng, base: number, speck: number): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(base);
  c.speckle(rng, speck, 0.1);
  c.speckle(rng, darken(base, 0.2), 0.08);
  for (let k = 0; k < 2; k++) {
    const x = rng.int(14) + 1, y = rng.int(14) + 1;
    c.set(x, y, lighten(base, 0.3));
    c.set(x + 1, y, darken(base, 0.3));
  }
  return c;
}

export function caveWall(rng: Rng, base: number, top: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16).fill(darken(base, 0.45));
  if (top) {
    c.rect(0, 6, 16, 10, base);
    c.hline(0, 15, 6, lighten(base, 0.3));
    for (let k = 0; k < 3; k++) {
      const x = rng.int(15), y = 8 + rng.int(6);
      c.vline(x, y, Math.min(15, y + 2), darken(base, 0.25));
    }
    c.hline(0, 15, 15, darken(base, 0.35));
  } else {
    c.speckle(rng, darken(base, 0.3), 0.1);
  }
  return c;
}

/** Register all terrain sprites. Names: ter.{id}.{variant}.s{season} */
export function bakeTerrain(atlas: Atlas): void {
  for (let s = 0; s < 4; s++) {
    const sm = seasonMap(s);
    for (let v = 0; v < TER_VARIANTS; v++) {
      const rng = new Rng(1000 + v * 17);
      const add = (id: number, pc: PixelCanvas, seasonal: boolean) => {
        if (seasonal) pc.remap(sm);
        atlas.add(`ter.${id}.${v}.s${s}`, pc);
      };
      add(Ter.GRASS, grass(rng, false, s), true);
      add(Ter.FLOWERS, grass(rng, true, s), true);
      const d = dirt(rng);
      if (s === 3) d.speckle(new Rng(v), P.snow1, 0.25);
      add(Ter.DIRT, d, false);
      add(Ter.PATH, cobbles(rng, P.s3, P.s4, P.s2), false);
      add(Ter.COBBLE, cobbles(rng, 0xb0a49a, 0xc8bcae, 0x7a7068), false);
      const sd = sand(rng);
      add(Ter.SAND, sd, false);
      add(Ter.WATER, water(rng, false), false);
      add(Ter.DEEPWATER, water(rng, true), false);
      add(Ter.BROKENBRIDGE, brokenBridge(rng), false);
      add(Ter.CLIFF, cliff(rng, false), false);
      add(Ter.FLOOR, planks(rng, P.b4, false), false);
      add(Ter.BRIDGE, planks(rng, P.b3, true), false);
      add(Ter.DOCK, planks(rng, 0xa07040, true), false);
      add(Ter.WALL, wall(rng), false);
      add(Ter.WALLTOP, wallTop(), false);
      add(Ter.TILEFLOOR, tileFloor(), false);
      add(Ter.CARPET, carpet(rng), false);
      add(Ter.STONEFLOOR, stoneFloor(rng), false);
      add(Ter.RAIL, rail(rng), false);
      add(Ter.MUD, dirt(rng, P.soilD), false);
      add(Ter.CAVE, caveFloor(rng, 0x7a6450, 0x5f4c3c), false);
      add(Ter.CAVEWALL, caveWall(rng, 0x6a5a4a, false), false);
      add(Ter.VOID, new PixelCanvas(16, 16).fill(0x101018), false);
      // cliff with grassy top lip (used when the tile above isn't cliff)
      const ct = cliff(rng, true);
      ct.remap(sm);
      atlas.add(`ter.cliftop.${v}.s${s}`, ct);
    }
  }
  for (let m = 0; m < 16; m++) {
    atlas.add(`soil.${m}.0`, soil(m, false));
    atlas.add(`soil.${m}.1`, soil(m, true));
    atlas.add(`shore.${m}`, waterEdge(m, false));
    atlas.add(`shoreDeep.${m}`, waterEdge(m, true));
  }
  for (let f = 1; f <= 3; f++) atlas.add(`fert.${f}`, fert(f));
  // snow overlay for winter soil
  const snow = new PixelCanvas(16, 16);
  const r = new Rng(5);
  for (let i = 0; i < 30; i++) snow.set(r.int(16), r.int(16), P.snow1);
  atlas.add('snowdust', snow);
}
