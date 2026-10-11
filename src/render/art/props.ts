/** Static map props: trees, furniture, town decorations. */
import { Rng } from '../../core/rng';
import type { Atlas } from '../atlas';
import { P, SEASON_LEAF } from '../palette';
import { PixelCanvas } from '../pixelcanvas';

export function foliage(c: PixelCanvas, cx: number, cy: number, rx: number, ry: number, leaf: readonly number[], rng: Rng): void {
  const [dark, mid, light] = leaf;
  c.ellipse(cx, cy, rx, ry, dark);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    c.circle(cx + Math.cos(a) * rx * 0.85, cy + Math.sin(a) * ry * 0.85, Math.max(2, rx * 0.28), dark);
  }
  c.ellipse(cx - 1, cy - 1.5, rx - 1.6, ry - 2, mid);
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * 1.05 + (k / 7) * Math.PI * 0.9;
    c.circle(cx - 1 + Math.cos(a) * rx * 0.55, cy - 1.5 + Math.sin(a) * ry * 0.55, Math.max(1.5, rx * 0.2), light);
  }
  c.speckle(rng, dark, 0.06, mid);
  c.speckle(rng, light, 0.04, mid);
}

export function drawOak(season: number, rng: Rng, small = false): PixelCanvas {
  const c = new PixelCanvas(32, 48);
  const leaf = SEASON_LEAF[season];
  // trunk
  const tx = 13, ty = small ? 32 : 28;
  c.rect(tx, ty, 6, 46 - ty, P.b2);
  c.vline(tx, ty, 45, P.b1);
  c.vline(tx + 4, ty, 45, P.b3);
  c.hline(tx - 2, tx + 7, 45, P.b2);
  c.set(tx - 2, 44, P.b2);
  c.set(tx + 7, 44, P.b2);
  if (season === 3) {
    // bare winter branches with snow
    c.line(16, 30, 8, 14, P.b2);
    c.line(16, 28, 24, 12, P.b2);
    c.line(16, 26, 16, 8, P.b2);
    c.line(11, 20, 6, 18, P.b2);
    c.line(21, 18, 27, 16, P.b2);
    c.line(17, 26, 17, 9, P.b3);
    for (const [x, y] of [[8, 13], [24, 11], [16, 7], [6, 17], [27, 15], [12, 19], [20, 15]]) {
      c.set(x, y, P.snow2);
      c.set(x + 1, y, P.snow1);
    }
    c.outline(P.ink);
    return c;
  }
  foliage(c, 16, small ? 22 : 18, small ? 11 : 14, small ? 11 : 14, leaf, rng);
  if (season === 1 && rng.chance(0.3)) {
    for (let k = 0; k < 5; k++) c.set(8 + rng.int(16), 8 + rng.int(16), P.r2);
  }
  c.outline(P.ink);
  return c;
}

export function drawPine(season: number, rng: Rng): PixelCanvas {
  const c = new PixelCanvas(32, 48);
  c.rect(14, 38, 4, 8, P.b2);
  c.vline(14, 38, 45, P.b1);
  const dark = 0x173426, mid = 0x245a3a, light = 0x3a7a48;
  const layers = [
    [3, 16, 7],
    [10, 27, 11],
    [18, 39, 14],
  ];
  for (const [top, bot, half] of layers) {
    for (let y = top; y <= bot; y++) {
      const t = (y - top) / (bot - top);
      const hw = Math.round(1 + t * half);
      c.hline(16 - hw, 15 + hw, y, mid);
      c.set(16 - hw, y, dark);
      c.set(15 + hw, y, dark);
      if (t > 0.25) c.hline(16 - hw + 1, 16 - Math.round(hw * 0.4), y, light);
    }
    c.hline(16 - half, 15 + half, bot, dark);
  }
  c.speckle(rng, dark, 0.05, mid);
  if (season === 3) {
    for (const [top, bot, half] of layers) {
      for (let y = top; y <= top + 3; y++) {
        const t = (y - top) / (bot - top);
        const hw = Math.round(1 + t * half);
        c.hline(16 - hw, 15 + hw, y, P.snow1);
      }
      for (let x = 16 - half + 2; x < 16 + half - 2; x += 3) c.set(x, bot - 1, P.snow2);
    }
  }
  c.outline(P.ink);
  return c;
}

export function drawBush(season: number, rng: Rng, berries = 0): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  foliage(c, 8, 9, 7, 6, SEASON_LEAF[season], rng);
  if (season === 0) for (let k = 0; k < 3; k++) c.set(3 + rng.int(10), 4 + rng.int(8), P.k3);
  if (berries) for (let k = 0; k < 5; k++) c.set(3 + rng.int(10), 5 + rng.int(7), berries);
  if (season === 3) for (let x = 2; x < 14; x++) c.set(x, 3 + ((x * 7) % 3), P.snow2);
  c.outline(P.ink);
  return c;
}

const box = (w: number, h: number) => new PixelCanvas(w, h);

function furniture(): Record<string, PixelCanvas> {
  const r = new Rng(42);
  const o: Record<string, PixelCanvas> = {};

  let c = box(16, 32); // lamp post
  c.rect(7, 10, 2, 21, P.s1);
  c.rect(5, 30, 6, 2, P.s1);
  c.rect(4, 3, 8, 7, P.y2);
  c.rect(5, 4, 6, 5, P.y3);
  c.hline(3, 12, 2, P.s1);
  c.hline(4, 11, 10, P.s1);
  c.outline(P.ink);
  o.lamp = c;

  c = box(32, 16); // bench
  c.rect(1, 4, 30, 3, P.b3);
  c.rect(1, 8, 30, 3, P.b4);
  c.hline(1, 30, 8, P.b5);
  c.rect(3, 11, 2, 4, P.s1);
  c.rect(27, 11, 2, 4, P.s1);
  c.outline(P.ink);
  o.bench = c;

  c = box(16, 16); // sign
  c.rect(7, 9, 2, 7, P.b2);
  c.rect(1, 2, 14, 8, P.b4);
  c.hline(1, 14, 2, P.b5);
  c.hline(3, 12, 5, P.b2);
  c.hline(3, 10, 7, P.b2);
  c.outline(P.ink);
  o.sign = c;

  c = box(16, 16); // mailbox
  c.rect(7, 9, 2, 7, P.b2);
  c.rect(2, 3, 12, 7, P.bl2);
  c.ellipse(8, 3.5, 6, 2, P.bl2);
  c.hline(3, 12, 3, P.bl3);
  c.rect(13, 1, 1, 5, P.r2);
  c.rect(12, 1, 2, 2, P.r2);
  c.outline(P.ink);
  o.mailbox = c;

  c = box(32, 16); // shipping bin
  c.rect(1, 3, 30, 12, P.b3);
  for (let x = 1; x < 31; x += 5) c.vline(x, 3, 14, P.b2);
  c.rect(0, 1, 32, 3, P.b4);
  c.hline(0, 31, 1, P.b5);
  c.rect(13, 6, 6, 5, P.y1);
  c.rect(14, 7, 4, 3, P.o2);
  c.outline(P.ink);
  o.bin = c;

  c = box(16, 16); // crate
  c.rect(1, 2, 14, 13, P.b4);
  c.line(1, 2, 14, 14, P.b2);
  c.line(14, 2, 1, 14, P.b2);
  c.hline(1, 14, 2, P.b5);
  c.outline(P.ink);
  o.crate = c;

  c = box(16, 16); // barrel
  c.ellipse(8, 8.5, 6.5, 7, P.b3);
  c.hline(2, 13, 4, P.s2);
  c.hline(2, 13, 12, P.s2);
  c.vline(6, 2, 14, P.b4);
  c.outline(P.ink);
  o.barrel = c;

  c = box(32, 32); // fountain
  c.ellipse(16, 22, 15, 8, P.s3);
  c.ellipse(16, 21, 12, 6, P.w2);
  c.ellipse(16, 20, 8, 3.5, P.w3);
  c.rect(14, 8, 4, 12, P.s3);
  c.ellipse(16, 8, 5, 2, P.s4);
  c.set(16, 3, P.w4); c.set(15, 5, P.w4); c.set(17, 4, P.w3); c.set(13, 6, P.w3); c.set(19, 6, P.w4);
  c.outline(P.ink);
  o.fountain = c;

  c = box(32, 32); // restoration board (big framed corkboard)
  c.rect(1, 2, 30, 22, P.b2);
  c.rect(3, 4, 26, 18, 0xc89a60);
  c.speckle(r, 0xb7844f, 0.15, 0xc89a60);
  c.rect(5, 6, 6, 5, P.white); c.rect(13, 7, 6, 5, P.y2); c.rect(21, 6, 6, 6, P.k3);
  c.rect(7, 13, 7, 6, P.bl3); c.rect(17, 14, 8, 5, P.g4);
  c.rect(4, 24, 2, 7, P.b2); c.rect(26, 24, 2, 7, P.b2);
  c.outline(P.ink);
  o.board = c;

  c = box(16, 32); // bed (two tiles tall)
  c.rect(1, 2, 14, 28, P.b3);
  c.rect(2, 3, 12, 6, P.white);
  c.rect(2, 10, 12, 18, P.bl2);
  c.hline(2, 13, 10, P.bl3);
  for (let y = 13; y < 28; y += 4) c.hline(2, 13, y, P.bl1);
  c.rect(1, 1, 14, 2, P.b4);
  c.outline(P.ink);
  o.bed = c;

  c = box(16, 16); // radio on a small table
  c.rect(2, 9, 12, 2, P.b4);
  c.rect(3, 11, 2, 5, P.b2); c.rect(11, 11, 2, 5, P.b2);
  c.rect(3, 2, 10, 7, P.r1);
  c.rect(4, 3, 5, 5, P.b1);
  c.speckle(r, P.s2, 0.4, P.b1);
  c.set(11, 4, P.y1); c.set(11, 6, P.y1);
  c.line(12, 2, 14, 0, P.s3);
  c.outline(P.ink);
  o.radio = c;

  c = box(16, 16); // stove
  c.rect(1, 3, 14, 13, P.s4);
  c.rect(1, 3, 14, 3, P.s2);
  c.ellipse(5, 4.5, 2, 1, P.ink2); c.ellipse(11, 4.5, 2, 1, P.ink2);
  c.rect(3, 8, 10, 6, P.s3);
  c.rect(4, 9, 8, 4, P.ink2);
  c.hline(4, 11, 9, P.o2);
  c.outline(P.ink);
  o.stove = c;

  c = box(16, 16); // table
  c.rect(1, 4, 14, 6, P.b4);
  c.hline(1, 14, 4, P.b5);
  c.rect(2, 10, 2, 6, P.b2); c.rect(12, 10, 2, 6, P.b2);
  c.rect(6, 2, 4, 3, P.w4);
  c.outline(P.ink);
  o.table = c;

  c = box(32, 16); // long table
  c.rect(1, 4, 30, 6, P.b4);
  c.hline(1, 30, 4, P.b5);
  c.rect(2, 10, 2, 6, P.b2); c.rect(28, 10, 2, 6, P.b2);
  c.outline(P.ink);
  o.table2 = c;

  c = box(16, 16); // chair
  c.rect(4, 1, 8, 8, P.b3);
  c.rect(4, 8, 8, 3, P.b4);
  c.rect(4, 11, 2, 5, P.b2); c.rect(10, 11, 2, 5, P.b2);
  c.outline(P.ink);
  o.chair = c;

  c = box(16, 32); // shelf
  c.rect(1, 4, 14, 27, P.b3);
  for (let y = 10; y < 31; y += 7) c.hline(1, 14, y, P.b1);
  for (let y = 5; y < 30; y += 7) for (let x = 2; x < 14; x += 3) c.rect(x, y, 2, 4, r.pick([P.r2, P.y1, P.bl2, P.g3, P.k2, P.o2]));
  c.outline(P.ink);
  o.shelf = c;

  c = box(16, 16); // counter
  c.rect(0, 3, 16, 13, P.b3);
  c.rect(0, 3, 16, 3, P.b5);
  c.hline(0, 15, 6, P.b2);
  c.vline(4, 7, 15, P.b2); c.vline(11, 7, 15, P.b2);
  o.counter = c;

  c = box(16, 32); // potted plant
  c.rect(4, 24, 8, 7, P.o1);
  c.hline(3, 12, 24, P.o2);
  foliage(c, 8, 16, 6, 8, SEASON_LEAF[0], r);
  c.outline(P.ink);
  o.plant = c;

  c = box(32, 16); // rug
  c.rect(1, 2, 30, 12, P.r2);
  c.rect(3, 4, 26, 8, P.y2);
  c.rect(5, 6, 22, 4, P.r1);
  o.rug = c;

  c = box(16, 32); // fireplace
  c.rect(0, 6, 16, 26, P.s3);
  c.speckle(r, P.s2, 0.25, P.s3);
  c.rect(3, 18, 10, 13, P.ink2);
  c.ellipse(8, 27, 4, 3, P.o2);
  c.ellipse(8, 28, 2.5, 2, P.y2);
  c.rect(0, 4, 16, 3, P.b3);
  c.outline(P.ink);
  o.fireplace = c;

  c = box(16, 16); // window (on the wall)
  c.rect(2, 2, 12, 11, P.b4);
  c.rect(3, 3, 10, 9, P.w3);
  c.vline(8, 3, 11, P.b4);
  c.hline(3, 12, 7, P.b4);
  c.set(4, 4, P.w4); c.set(5, 4, P.w4); c.set(4, 5, P.w4);
  c.outline(P.b1);
  o.window = c;

  c = box(16, 16); // painting
  c.rect(2, 2, 12, 10, P.y1);
  c.rect(3, 3, 10, 8, P.bl3);
  c.rect(3, 8, 10, 3, P.g3);
  c.circle(10, 5, 1.5, P.y2);
  c.outline(P.b1);
  o.painting = c;

  c = box(16, 16); // anvil
  c.rect(2, 4, 12, 4, P.s1);
  c.rect(0, 4, 3, 2, P.s1);
  c.rect(5, 8, 6, 4, P.s1);
  c.rect(3, 12, 10, 3, P.s1);
  c.hline(2, 13, 4, P.s3);
  c.outline(P.ink);
  o.anvil = c;

  c = box(16, 16); // display case
  c.rect(1, 6, 14, 10, P.b3);
  c.rect(1, 1, 14, 7, P.w4);
  c.rect(2, 2, 12, 5, 0xd8f0ff);
  c.set(5, 4, P.p2); c.set(9, 4, P.r2); c.set(12, 5, P.y1);
  c.outline(P.ink);
  o.case = c;

  c = box(16, 16); // pedestal
  c.rect(4, 6, 8, 9, P.s4);
  c.rect(3, 4, 10, 2, P.s5);
  c.rect(3, 14, 10, 2, P.s3);
  c.outline(P.ink);
  o.pedestal = c;

  c = box(16, 16); // hay pile
  c.ellipse(8, 10, 7.5, 5.5, P.y1);
  c.speckle(r, P.o3, 0.3, P.y1);
  c.speckle(r, P.y2, 0.2, P.y1);
  c.outline(P.ink);
  o.hay = c;

  c = box(16, 16); // feed trough
  c.rect(1, 6, 14, 8, P.b3);
  c.rect(2, 7, 12, 3, P.b1);
  c.hline(1, 14, 6, P.b4);
  o.trough = c;
  o.trough.outline(P.ink);

  c = box(16, 16); // lantern
  c.rect(5, 4, 6, 9, P.y2);
  c.rect(6, 5, 4, 7, P.y3);
  c.rect(4, 3, 8, 1, P.s1);
  c.rect(4, 13, 8, 2, P.s1);
  c.rect(7, 1, 2, 2, P.s1);
  c.outline(P.ink);
  o.lantern = c;

  c = box(16, 16); // glowing crystal cluster
  c.line(5, 15, 3, 6, P.t2); c.line(6, 15, 4, 6, P.t2);
  c.rect(6, 3, 4, 12, P.t2);
  c.vline(7, 3, 14, P.t3);
  c.rect(10, 7, 3, 8, P.t1);
  c.set(7, 2, P.white);
  c.outline(P.ink);
  o.crystal = c;

  c = box(16, 16); // stalagmite
  for (let y = 1; y < 16; y++) {
    const hw = Math.round((y / 15) * 6);
    c.hline(8 - hw, 7 + hw, y, P.s2);
    c.set(8 - hw, y, P.s3);
  }
  c.outline(P.ink);
  o.stalagmite = c;

  c = box(16, 32); // mine lift cage
  c.rect(1, 4, 14, 27, P.s1);
  c.rect(3, 8, 10, 20, P.ink2);
  for (let x = 3; x < 13; x += 3) c.vline(x, 8, 27, P.s3);
  c.rect(0, 2, 16, 3, P.y1);
  c.hline(0, 15, 2, P.o3);
  c.outline(P.ink);
  o.lift = c;

  c = box(16, 16); // ladder up
  c.vline(4, 0, 15, P.b3); c.vline(11, 0, 15, P.b3);
  for (let y = 2; y < 16; y += 4) c.hline(4, 11, y, P.b4);
  c.outline(P.ink);
  o.ladderUp = c;

  c = box(32, 16); // rowboat
  c.ellipse(16, 8, 15, 6, P.b3);
  c.ellipse(16, 7, 12, 4, P.b2);
  c.hline(4, 27, 8, P.b4);
  c.outline(P.ink);
  o.boat = c;

  c = box(16, 32); // piano
  c.rect(0, 6, 16, 22, P.ink2);
  c.rect(1, 18, 14, 3, P.white);
  for (let x = 2; x < 15; x += 2) c.set(x, 18, P.ink2);
  c.rect(1, 21, 14, 7, P.b1);
  c.rect(2, 28, 2, 3, P.b1); c.rect(12, 28, 2, 3, P.b1);
  c.outline(P.ink);
  o.piano = c;

  c = box(16, 32); // bookshelf
  c.rect(0, 2, 16, 29, P.b2);
  for (let y = 9; y < 31; y += 7) c.hline(1, 14, y, P.b1);
  for (let y = 3; y < 30; y += 7) for (let x = 1; x < 15; x += 2) c.rect(x, y + 1, 2, 5, r.pick([P.r1, P.bl1, P.g2, P.y1, P.p1, P.o1]));
  c.outline(P.ink);
  o.bookshelf = c;

  c = box(16, 32); // easel
  c.line(3, 31, 7, 8, P.b3); c.line(12, 31, 8, 8, P.b3);
  c.rect(2, 6, 12, 12, P.white);
  c.rect(3, 7, 10, 10, P.bl3);
  c.circle(6, 11, 2, P.y2); c.rect(3, 13, 10, 4, P.g3);
  c.outline(P.ink);
  o.easel = c;

  c = box(16, 16); // workbench
  c.rect(0, 4, 16, 5, P.b4);
  c.hline(0, 15, 4, P.b5);
  c.rect(1, 9, 2, 7, P.b2); c.rect(13, 9, 2, 7, P.b2);
  c.rect(3, 1, 4, 3, P.s3); c.rect(10, 2, 3, 2, P.r2);
  c.outline(P.ink);
  o.workbench = c;

  c = box(16, 16); // cooking pot
  c.ellipse(8, 10, 7, 5.5, P.s1);
  c.ellipse(8, 6, 6, 2, P.o3);
  c.rect(3, 14, 2, 2, P.s1); c.rect(11, 14, 2, 2, P.s1);
  c.outline(P.ink);
  o.cauldron = c;

  c = box(16, 32); // telescope
  c.line(4, 31, 8, 18, P.b2); c.line(12, 31, 8, 18, P.b2); c.vline(8, 18, 31, P.b2);
  c.line(3, 16, 13, 6, P.s3); c.line(3, 17, 13, 7, P.s2); c.line(4, 17, 14, 7, P.s2);
  c.outline(P.ink);
  o.telescope = c;

  c = box(16, 16); // rubble pile
  c.ellipse(8, 11, 7.5, 4.5, P.s2);
  c.circle(5, 9, 3, P.s3); c.circle(11, 8, 3.5, P.s3); c.circle(8, 6, 2.5, P.s4);
  c.rect(2, 4, 6, 2, P.b3);
  c.outline(P.ink);
  o.rubble = c;

  c = box(16, 16); // rail buffer
  c.rect(1, 6, 14, 8, P.r1);
  c.rect(3, 8, 10, 4, P.y1);
  c.outline(P.ink);
  o.railEnd = c;

  c = box(32, 32); // market stall
  c.rect(1, 2, 30, 8, P.r2);
  for (let x = 1; x < 31; x += 6) c.rect(x, 2, 3, 8, P.white);
  c.rect(2, 10, 2, 20, P.b2); c.rect(28, 10, 2, 20, P.b2);
  c.rect(1, 20, 30, 10, P.b4);
  c.hline(1, 30, 20, P.b5);
  c.circle(8, 18, 2, P.r2); c.circle(13, 18, 2, P.o2); c.circle(19, 18, 2, P.y1); c.circle(24, 18, 2, P.g3);
  c.outline(P.ink);
  o.stall = c;

  c = box(16, 32); // festival banner on a pole
  c.vline(2, 0, 31, P.b2);
  c.rect(3, 2, 11, 14, P.k2);
  c.rect(4, 3, 9, 12, P.y2);
  c.circle(8, 9, 2.5, P.r2);
  c.outline(P.ink);
  o.banner = c;

  c = box(16, 32); // paper-lantern post
  c.vline(7, 6, 31, P.b2); c.vline(8, 6, 31, P.b3);
  c.hline(2, 13, 6, P.b2);
  c.ellipse(3, 10, 2.5, 3, P.o3); c.ellipse(12, 10, 2.5, 3, P.k2);
  c.set(3, 10, P.y3); c.set(12, 10, P.y3);
  c.outline(P.ink);
  o.lanternPost = c;

  c = box(16, 16); // pumpkin decoration
  c.ellipse(8, 10, 7, 5.5, P.o2);
  c.vline(5, 6, 14, P.o1); c.vline(10, 6, 14, P.o1);
  c.rect(7, 2, 2, 4, P.g2);
  c.outline(P.ink);
  o.pumpkinDeco = c;

  c = box(16, 32); // snowman
  c.circle(8, 24, 6.5, P.snow2); c.circle(8, 14, 5, P.snow2); c.circle(8, 7, 3.5, P.snow2);
  c.set(7, 6, P.ink); c.set(9, 6, P.ink); c.set(10, 7, P.o2);
  c.set(8, 13, P.ink); c.set(8, 16, P.ink);
  c.rect(5, 2, 6, 2, P.r2);
  c.speckle(r, P.snow0, 0.08, P.snow2);
  c.outline(P.ink);
  o.snowman = c;

  c = box(32, 48); // starlight tree
  {
    const pine = drawPine(0, r);
    c.blit(pine, 0, 0);
    for (let k = 0; k < 14; k++) c.paint(6 + r.int(20), 8 + r.int(30), r.pick([P.y2, P.k2, P.bl3, P.r3, P.white]));
    c.rect(15, 0, 2, 4, P.y1); c.rect(14, 1, 4, 2, P.y1); c.set(16, 0, P.y3);
  }
  o.starTree = c;

  c = box(16, 16); // rock wall chunk
  c.rect(0, 0, 16, 16, P.s2);
  c.speckle(r, P.s1, 0.2);
  c.speckle(r, P.s3, 0.1);
  o.rockwall = c;

  c = box(16, 16); // flower patch (flat)
  for (let k = 0; k < 6; k++) {
    const x = 2 + r.int(12), y = 2 + r.int(12);
    const col = r.pick([P.k2, P.y2, P.bl3, P.white]);
    c.set(x, y, col); c.set(x + 1, y, col); c.set(x, y + 1, col); c.set(x + 1, y + 1, P.y1);
  }
  o.flowers = c;
  return o;
}

export function bakeProps(atlas: Atlas): void {
  for (let s = 0; s < 4; s++) {
    atlas.add(`prop.tree.s${s}`, drawOak(s, new Rng(10 + s)));
    atlas.add(`prop.pine.s${s}`, drawPine(s, new Rng(20 + s)));
    atlas.add(`prop.bush.s${s}`, drawBush(s, new Rng(30 + s)));
    const big = new PixelCanvas(48, 64);
    big.blit(drawOak(s, new Rng(40 + s)), 0, 16);
    big.blit(drawOak(s, new Rng(41 + s)), 16, 16);
    big.blit(drawOak(s, new Rng(42 + s)), 8, 0);
    atlas.add(`prop.bigtree.s${s}`, big);
    const fl = furniture().flowers;
    if (s === 3) fl.fill(-1);
    atlas.add(`prop.flowers.s${s}`, fl);
  }
  const f = furniture();
  for (const [k, pc] of Object.entries(f)) if (k !== 'flowers') atlas.add(`prop.${k}`, pc);
}

