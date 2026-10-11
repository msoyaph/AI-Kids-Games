/** Farm animals, pets, tall grass and building-site art. Side views (left = mirror). */
import { Rng } from '../../core/rng';
import { ANIMALS } from '../../data/animals';
import type { Atlas } from '../atlas';
import { P, SEASON_LEAF } from '../palette';
import { PixelCanvas, darken, lighten } from '../pixelcanvas';

type Frame = 0 | 1 | 2 | 3; // stand, walkA, walkB, sleep

function legs(c: PixelCanvas, xs: number[], y: number, h: number, col: number, f: Frame): void {
  xs.forEach((x, i) => {
    const lift = f === 1 ? (i % 2 ? 1 : 0) : f === 2 ? (i % 2 ? 0 : 1) : 0;
    c.vline(x, y, y + h - 1 - lift, col);
  });
}

function chicken(f: Frame, [body, shade, comb]: [number, number, number], duck = false): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const by = f === 3 ? 2 : 0;
  if (f !== 3) legs(c, [7, 9], 12, 3, P.o2, f);
  c.ellipse(8, 9 + by, 5, 3.6, body);
  c.ellipse(7, 10.5 + by, 3.5, 1.8, shade);
  c.ellipse(4, 7 + by, 2, 2.4, body); // tail
  c.circle(11, 5 + by, 2.6, body);
  if (!duck) {
    c.rect(10, 2 + by, 3, 1, comb);
    c.set(11, 1 + by, comb);
    c.set(13, 6 + by, comb);
  }
  c.rect(13, 5 + by, duck ? 3 : 2, duck ? 2 : 1, P.o3);
  c.set(12, 4 + by, P.ink);
  c.outline(P.ink);
  return c;
}

function rabbit(f: Frame, [body, shade, nose]: [number, number, number]): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const hop = f === 1 ? -1 : 0;
  c.ellipse(7, 11 + hop, 4.6, 3.4, body);
  c.ellipse(6, 12 + hop, 3, 1.6, shade);
  c.circle(11, 8 + hop, 2.6, body);
  if (f === 3) c.rect(10, 7, 4, 1, shade);
  else {
    c.rect(10, 2 + hop, 1, 4, body);
    c.rect(12, 3 + hop, 1, 4, body);
    c.set(10, 3 + hop, nose);
  }
  c.circle(3, 10 + hop, 1.4, P.white);
  c.set(13, 8 + hop, nose);
  c.set(12, 7 + hop, P.ink);
  c.outline(P.ink);
  return c;
}

function quad(f: Frame, kind: string, [body, spot, accent]: [number, number, number]): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const sheep = kind === 'sheep', goat = kind === 'goat';
  const lie = f === 3;
  const by = lie ? 5 : 0;
  if (!lie) legs(c, [8, 11, 20, 23], 22, 7, darken(body, sheep ? 0.6 : 0.35), f);
  // body
  if (sheep) {
    for (const [x, y, r] of [[10, 17, 6], [16, 15, 6], [21, 17, 6], [15, 20, 6], [9, 21, 4], [22, 21, 4]]) c.circle(x, y + by, r, body);
    c.speckle(new Rng(4), darken(body, 0.08), 0.1, body);
  } else {
    c.ellipse(15.5, 18 + by, 10, 5.6, body);
    if (kind === 'cow') {
      c.ellipse(12, 16 + by, 3.5, 2.5, spot);
      c.ellipse(20, 20 + by, 3, 2, spot);
      c.ellipse(16, 23 + by, 2.5, 1.2, accent); // udder
    } else c.ellipse(15, 21 + by, 8, 2, darken(body, 0.1));
  }
  // head
  const hx = 26, hy = 13 + by;
  c.ellipse(hx, hy, sheep ? 3.5 : 4, sheep ? 3.5 : 3.6, sheep ? spot : body);
  c.ellipse(hx + 2, hy + 2, 2.5, 2, sheep ? lighten(spot, 0.2) : kind === 'cow' ? accent : lighten(body, 0.1));
  c.set(hx + 1, hy - 1, P.ink);
  c.set(hx + 3, hy + 2, P.ink2);
  c.rect(hx - 4, hy - 3, 2, 2, sheep ? spot : body); // ear
  if (kind === 'cow') { c.set(hx - 1, hy - 4, P.cream); c.set(hx + 1, hy - 4, P.cream); }
  if (goat) {
    c.line(hx - 1, hy - 3, hx - 3, hy - 7, accent);
    c.line(hx + 1, hy - 3, hx, hy - 7, accent);
    c.vline(hx + 2, hy + 4, hy + 6, darken(body, 0.2)); // beard
  }
  // tail
  c.line(5, 15 + by, 4, 20 + by, darken(body, 0.2));
  if (lie) {
    c.hline(hx, hx + 1, hy - 1, P.ink);
  }
  c.outline(P.ink);
  return c;
}

const PET_COLORS = [
  [0xb7844f, 0x8f603d, 0xf3efe6],
  [0x3d3c4e, 0x24232f, 0xe6e7ef],
  [0xf0d070, 0xd0a040, 0xfffaf0],
] as const;

function dog(f: Frame | 4, [m, d, l]: readonly number[]): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  if (f === 3) {
    c.ellipse(8, 12, 6, 3, m);
    c.circle(12, 11, 2.6, m);
    c.rect(10, 9, 2, 2, d);
    c.hline(11, 13, 11, P.ink);
    c.outline(P.ink);
    return c;
  }
  if (f === 4) {
    // sitting
    c.ellipse(7, 11, 3.5, 4, m);
    c.rect(5, 13, 2, 2, d);
    c.rect(8, 12, 2, 3, m);
    c.circle(9, 5.5, 3, m);
    c.rect(6, 3, 2, 4, d);
    c.ellipse(11.5, 6.5, 2, 1.5, l);
    c.set(12, 6, P.ink);
    c.set(10, 5, P.ink);
    c.line(3, 11, 2, 8, m);
    c.outline(P.ink);
    return c;
  }
  legs(c, [4, 6, 10, 12], 11, 4, d, f as Frame);
  c.ellipse(8, 9, 5.5, 3, m);
  c.ellipse(7, 10.5, 3.5, 1.2, l);
  c.circle(12.5, 6, 2.8, m);
  c.ellipse(14.5, 7, 1.6, 1.2, l);
  c.set(15, 6, P.ink);
  c.set(12, 5, P.ink);
  c.rect(10, 4, 2, 4, d);
  c.line(2, 8, 1, 5, m);
  c.outline(P.ink);
  return c;
}

function cat(f: Frame | 4, [m, d, l]: readonly number[]): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  if (f === 3) {
    c.ellipse(8, 12, 5.5, 3, m);
    c.circle(12, 11, 2.4, m);
    c.set(11, 8, m); c.set(13, 8, m);
    c.line(3, 12, 6, 14, d);
    c.hline(11, 13, 11, P.ink);
    c.outline(P.ink);
    return c;
  }
  if (f === 4) {
    c.ellipse(7, 11, 3.2, 4, m);
    c.circle(9, 5.5, 2.8, m);
    c.set(7, 2, m); c.set(7, 3, m); c.set(11, 2, m); c.set(11, 3, m);
    c.set(8, 5, P.g3); c.set(10, 5, P.g3);
    c.set(9, 7, P.k2);
    c.line(3, 13, 2, 9, d);
    c.ellipse(7, 12, 2, 2, l);
    c.outline(P.ink);
    return c;
  }
  legs(c, [4, 6, 10, 12], 11, 4, d, f as Frame);
  c.ellipse(8, 9, 5, 2.8, m);
  c.ellipse(8, 10.5, 3, 1, l);
  c.circle(12.5, 6.5, 2.5, m);
  c.set(11, 3, m); c.set(11, 4, m); c.set(14, 3, m); c.set(14, 4, m);
  c.set(13, 6, P.g3);
  c.set(15, 7, P.k2);
  c.line(3, 8, 1, 3, m);
  for (let x = 5; x < 11; x += 2) c.set(x, 8, d);
  c.outline(P.ink);
  return c;
}

function tallGrass(season: number, v: number): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const rng = new Rng(80 + v);
  const leaf = SEASON_LEAF[season];
  for (let k = 0; k < 9; k++) {
    const x = 2 + rng.int(12), h = 6 + rng.int(7);
    c.line(x, 15, x + rng.range(-2, 2), 15 - h, k % 3 === 0 ? leaf[0] : k % 3 === 1 ? leaf[1] : leaf[2]);
  }
  if (season === 3) for (let x = 2; x < 14; x += 3) c.set(x, 6 + (x % 4), P.snow2);
  c.outline(darken(leaf[0], 0.4));
  return c;
}

function scaffold(w: number, h: number): PixelCanvas {
  const c = new PixelCanvas(w * 16, h * 16 + 16);
  const H = c.h;
  for (let x = 2; x < c.w - 2; x += 14) c.rect(x, 4, 3, H - 6, P.b3);
  for (let y = 8; y < H; y += 12) c.rect(0, y, c.w, 3, P.b4);
  c.line(2, H - 4, c.w - 3, 8, P.b2);
  c.rect(Math.floor(c.w / 2) - 10, H - 18, 20, 12, P.y1);
  c.rect(Math.floor(c.w / 2) - 9, H - 17, 18, 10, P.ink2);
  c.hline(Math.floor(c.w / 2) - 7, Math.floor(c.w / 2) + 6, H - 13, P.y1);
  c.outline(P.ink);
  return c;
}

function bowl(full: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.ellipse(8, 11, 5.5, 3, P.r2);
  c.ellipse(8, 10, 4, 1.8, full ? P.w3 : P.r1);
  if (full) c.set(6, 10, P.w4);
  c.outline(P.ink);
  return c;
}

export function bakeAnimals(atlas: Atlas): void {
  for (const a of ANIMALS) {
    for (let f = 0 as Frame; f <= 3; f = (f + 1) as Frame) {
      let pc: PixelCanvas;
      if (a.id === 'chicken' || a.id === 'duck') pc = chicken(f, a.colors, a.id === 'duck');
      else if (a.id === 'rabbit') pc = rabbit(f, a.colors);
      else pc = quad(f, a.id, a.colors);
      atlas.add(`an.${a.id}.${f}`, pc);
      if (f === 0) {
        const icon = new PixelCanvas(16, 16);
        if (pc.w === 16) icon.blit(pc, 0, 0);
        else for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) icon.set(x, y, pc.get(x * 2, y * 2));
        atlas.add(`item.animal.${a.id}`, icon, true);
      }
    }
  }
  PET_COLORS.forEach((cols, i) => {
    for (const kind of ['dog', 'cat'] as const)
      for (let f = 0; f <= 4; f++) {
        const pc = kind === 'dog' ? dog(f as Frame, cols) : cat(f as Frame, cols);
        atlas.add(`pet.${kind}.${i}.${f}`, pc, f === 4);
      }
  });
  for (let s = 0; s < 4; s++) for (let v = 0; v < 2; v++) atlas.add(`obj.grass.${v}.s${s}`, tallGrass(s, v));
  atlas.add('bld.scaffold.coop', scaffold(5, 3));
  atlas.add('bld.scaffold.barn', scaffold(7, 4));
  atlas.add('bld.scaffold.silo', scaffold(3, 3));
  atlas.add('bld.scaffold.well', scaffold(2, 2));
  atlas.add('bld.scaffold.shed', scaffold(4, 3));
  atlas.add('prop.bowl.0', bowl(false));
  atlas.add('prop.bowl.1', bowl(true));
  atlas.add('item.hay', (() => {
    const c = new PixelCanvas(16, 16);
    c.ellipse(8, 10, 6, 4, P.y1);
    c.speckle(new Rng(2), P.o3, 0.3, P.y1);
    c.hline(3, 12, 9, P.b3);
    c.outline(P.ink);
    return c;
  })(), true);
}
