/** Crop growth stages, giant crops, produce & seed icons, fruit trees and tappers. */
import { Rng } from '../../core/rng';
import { CROPS, FRUIT_TREES, type CropDef, type ProduceShape } from '../../data/crops';
import type { Atlas } from '../atlas';
import { P, SEASON_LEAF } from '../palette';
import { PixelCanvas, lighten } from '../pixelcanvas';
import { drawOak, foliage } from './props';

const LEAF = [P.g2, P.g3, P.g4];

/** Produce icon (16×16) drawn from shape + colors. */
export function produceIcon(shape: ProduceShape, col: [number, number, number], seed = 1): PixelCanvas {
  const [m, d, l] = col;
  const c = new PixelCanvas(16, 16);
  const rng = new Rng(seed);
  switch (shape) {
    case 'round':
      c.circle(8, 9.5, 5.5, m);
      c.ellipse(9.5, 11.5, 3, 2.5, d);
      c.circle(8, 9, 4, m);
      c.rect(5, 6, 2, 2, l);
      c.line(8, 4, 6, 1, LEAF[1]);
      c.line(8, 4, 11, 2, LEAF[2]);
      c.set(8, 4, LEAF[0]);
      break;
    case 'long':
      for (let t = 0; t <= 10; t++) {
        const x = 4 + t * 0.8, y = 4 + t, r = Math.max(0.6, 2.6 - t * 0.2);
        c.circle(x, y, r, t > 7 ? d : m);
      }
      c.set(5, 5, l); c.set(6, 6, l);
      c.line(4, 4, 2, 1, LEAF[1]); c.line(4, 4, 5, 0, LEAF[2]); c.line(4, 4, 1, 3, LEAF[2]);
      break;
    case 'leafy':
      c.ellipse(8, 10, 6.5, 5, d);
      c.ellipse(6, 8, 4, 4, m);
      c.ellipse(10, 8, 4, 4, m);
      c.ellipse(8, 6, 3.5, 3.5, l);
      c.line(8, 13, 8, 6, d);
      c.line(8, 10, 5, 8, d); c.line(8, 10, 11, 8, d);
      break;
    case 'berry':
      for (const [x, y] of [[6, 9], [10, 9], [8, 12], [5, 12], [11, 12], [8, 7]]) {
        c.circle(x, y, 2.2, m);
        c.set(x - 1, y - 1, l);
        c.set(x + 1, y + 1, d);
      }
      c.line(8, 5, 8, 2, LEAF[0]); c.line(8, 3, 11, 2, LEAF[2]);
      break;
    case 'cluster':
      for (const [x, y] of [[5, 6], [8, 6], [11, 6], [6, 9], [9, 9], [12, 9], [7, 12], [10, 12], [8, 14]]) {
        c.circle(x, y, 1.9, m);
        c.set(x - 1, y - 1, l);
      }
      c.line(8, 4, 8, 1, P.b2); c.line(9, 3, 12, 1, LEAF[2]);
      break;
    case 'pod':
      c.line(3, 12, 12, 3, m);
      c.line(3, 13, 13, 3, m);
      c.line(4, 13, 13, 4, d);
      c.line(4, 11, 11, 4, l);
      for (const t of [0.3, 0.55, 0.8]) c.set(Math.round(3 + 9 * t), Math.round(12 - 9 * t), lighten(m, 0.3));
      c.line(12, 3, 14, 1, LEAF[0]);
      break;
    case 'corn':
      c.ellipse(8, 8, 3.5, 6.5, m);
      for (let y = 3; y < 14; y += 2) for (let x = 6; x <= 10; x += 2) c.set(x, y, l);
      c.line(3, 15, 6, 4, LEAF[1]); c.line(13, 15, 10, 4, LEAF[1]); c.line(4, 15, 7, 6, LEAF[2]);
      break;
    case 'grain':
      for (const [x0, x1] of [[5, 3], [8, 8], [11, 13]]) {
        c.line(8, 15, x1, 3, P.b4);
        for (let k = 0; k < 4; k++) {
          c.set(x1 + (x0 > 8 ? -1 : 1) * 0, 3 + k * 2, m);
          c.set(x1 - 1, 4 + k * 2, l);
          c.set(x1 + 1, 4 + k * 2, d);
        }
      }
      c.hline(6, 10, 11, P.b2);
      break;
    case 'flower':
      c.line(8, 15, 8, 8, LEAF[0]);
      c.line(8, 12, 11, 10, LEAF[2]);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        c.circle(8 + Math.cos(a) * 3, 6 + Math.sin(a) * 3, 2, k % 2 ? m : l);
      }
      c.circle(8, 6, 1.6, shape === 'flower' && m === P.y1 ? P.b2 : P.y1);
      break;
    case 'melon':
      c.ellipse(8, 9, 7, 6, m);
      for (let x = 3; x < 14; x += 3) c.line(x, 4, x + 1, 14, d);
      c.ellipse(6, 7, 2, 1.5, l);
      c.line(8, 3, 9, 1, P.b2);
      break;
    case 'pumpkin':
      c.ellipse(8, 10, 7, 5.5, m);
      c.vline(5, 6, 14, d); c.vline(11, 6, 14, d); c.vline(8, 5, 15, d);
      c.ellipse(5, 8, 1.2, 2, l);
      c.rect(7, 2, 2, 3, P.g2);
      c.line(9, 3, 12, 2, LEAF[2]);
      break;
    case 'sprouts':
      c.vline(8, 2, 15, LEAF[0]);
      for (const [x, y] of [[5, 4], [11, 5], [5, 8], [11, 9], [6, 12], [10, 13]]) {
        c.circle(x, y, 2, m);
        c.set(x - 1, y - 1, l);
      }
      break;
    case 'strawberry':
      c.rows(['..aaaaaaa..', '.aaaaaaaaa.', 'aaaaaaaaaaa', 'aaaaaaaaaaa', '.aaaaaaaaa.', '.aaaaaaaaa.', '..aaaaaaa..', '...aaaaa...', '....aaa....'], { a: m }, 2, 5);
      for (let k = 0; k < 9; k++) c.paint(3 + rng.int(10), 6 + rng.int(7), P.y2);
      c.rect(4, 6, 2, 2, l);
      c.hline(4, 11, 4, LEAF[1]); c.hline(5, 10, 5, LEAF[2]); c.set(7, 2, LEAF[0]); c.set(8, 3, LEAF[0]);
      break;
    case 'cauli':
      c.ellipse(8, 10, 7, 5, LEAF[1]);
      for (const [x, y] of [[6, 8], [10, 8], [8, 7], [5, 10], [11, 10], [8, 10]]) c.circle(x, y, 2.4, m);
      for (const [x, y] of [[6, 8], [10, 8], [8, 7]]) c.set(x - 1, y - 1, l);
      c.speckle(rng, d, 0.1, m);
      break;
  }
  c.outline(P.ink);
  return c;
}

export function seedPacket(col: [number, number, number], shape?: ProduceShape): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(3, 2, 10, 13, 0xf4e2b4);
  c.hline(3, 12, 2, 0xe6c98f);
  c.rect(3, 5, 10, 7, col[0]);
  c.rect(4, 6, 3, 2, col[2]);
  if (shape === 'flower') c.circle(10, 9, 1.5, P.y1);
  for (const [x, y] of [[5, 13], [8, 13], [11, 13]]) c.set(x, y, P.b2);
  c.vline(12, 2, 14, 0xd8bc80);
  c.outline(P.ink);
  return c;
}

// ── Plants in the ground (16×32, base at y≈30) ─────────────
function sproutBase(c: PixelCanvas, stage: number): void {
  if (stage === 0) {
    for (const [x, y] of [[5, 29], [8, 30], [11, 29]]) {
      c.set(x, y, P.b1);
      c.set(x + 1, y, P.b2);
    }
    return;
  }
  if (stage === 1) {
    c.vline(8, 26, 30, LEAF[0]);
    c.ellipse(6, 26, 2, 1.2, LEAF[1]);
    c.ellipse(10, 25, 2, 1.2, LEAF[2]);
    return;
  }
  c.vline(8, 21, 30, LEAF[0]);
  c.ellipse(5, 25, 3, 1.5, LEAF[1]);
  c.ellipse(11, 23, 3, 1.5, LEAF[1]);
  c.ellipse(6, 21, 2.5, 1.3, LEAF[2]);
  c.ellipse(10, 27, 2.5, 1.3, LEAF[2]);
}

function trellis(c: PixelCanvas): void {
  c.vline(3, 6, 30, P.b3);
  c.vline(12, 6, 30, P.b3);
  for (let y = 9; y < 30; y += 7) c.hline(3, 12, y, P.b4);
  c.hline(2, 13, 6, P.b2);
}

export function cropSprite(cd: CropDef, stage: number, dead = false): PixelCanvas {
  const c = new PixelCanvas(16, 32);
  const rng = new Rng(cd.id.length * 31 + stage);
  const [m, d, l] = cd.color;
  if (cd.trellis) trellis(c);
  if (dead) {
    c.vline(8, 22, 30, P.b3);
    c.line(8, 24, 4, 28, P.b2);
    c.line(8, 23, 12, 27, P.b2);
    c.line(8, 26, 5, 30, P.b3);
    c.outline(P.ink);
    return c;
  }
  if (stage <= 2 && !cd.trellis) {
    sproutBase(c, stage);
    c.outline(P.ink);
    return c;
  }
  if (cd.trellis) {
    if (stage === 0) sproutBase(c, 0);
    else {
      const top = [28, 24, 16, 8, 8][stage];
      for (let y = 30; y > top; y--) {
        const x = 7 + Math.round(Math.sin(y * 0.6) * 3);
        c.set(x, y, LEAF[0]);
        c.set(x + 1, y, LEAF[1]);
        if (y % 3 === 0) c.ellipse(x + (y % 2 ? 2 : -1), y, 2, 1.3, LEAF[2]);
      }
      if (stage === 4) {
        for (let k = 0; k < 5; k++) {
          const x = 4 + rng.int(8), y = 10 + rng.int(17);
          if (cd.produce === 'cluster') {
            for (const [ox, oy] of [[0, 0], [2, 0], [1, 2], [-1, 2], [1, 4]]) c.circle(x + ox, y + oy, 1.1, m);
            c.set(x, y, l);
          } else {
            c.vline(x, y, y + 4, m);
            c.vline(x + 1, y + 1, y + 4, d);
            c.set(x, y + 1, l);
          }
        }
      }
    }
    c.outline(P.ink);
    return c;
  }
  // stage 3/4 by plant type
  switch (cd.plant) {
    case 'root':
      for (let k = 0; k < 5; k++) c.line(8, 29, 3 + k * 2.5, 17 + (k % 2) * 3, k % 2 ? LEAF[1] : LEAF[2]);
      if (stage === 4) {
        c.ellipse(8, 29, 3.5, 2.5, m);
        c.set(7, 28, l);
        c.hline(6, 10, 30, d);
      }
      break;
    case 'leafy':
      c.ellipse(8, 26, 7, 4.5, stage === 4 ? d : LEAF[0]);
      c.ellipse(6, 24, 4, 3.5, stage === 4 ? m : LEAF[1]);
      c.ellipse(10, 24, 4, 3.5, stage === 4 ? m : LEAF[1]);
      c.ellipse(8, 22, 3.5, 3, stage === 4 ? l : LEAF[2]);
      if (cd.id === 'broccoli' && stage === 4) for (const [x, y] of [[6, 20], [9, 19], [11, 21], [8, 22]]) c.circle(x, y, 2, P.g1);
      break;
    case 'bush':
      foliage(c, 8, 24, 6.5, 6, [P.g1, P.g3, P.g4], rng);
      c.vline(8, 28, 30, P.b2);
      if (stage === 4) {
        const shape = cd.produce;
        for (let k = 0; k < 6; k++) {
          const x = 3 + rng.int(10), y = 19 + rng.int(9);
          if (shape === 'long') {
            c.vline(x, y, y + 3, m);
            c.set(x + 1, y + 2, d);
            c.set(x, y, LEAF[0]);
          } else if (shape === 'sprouts') {
            c.circle(x, y, 1.3, m);
          } else {
            c.circle(x, y, 1.5, m);
            c.set(x - 1, y - 1, l);
          }
        }
      }
      break;
    case 'tall': {
      const top = stage === 4 ? 6 : 10;
      c.vline(8, top, 30, cd.id === 'corn' ? P.g3 : LEAF[0]);
      c.vline(7, top + 4, 30, LEAF[1]);
      for (let y = top + 4; y < 29; y += 5) {
        c.line(8, y, 3, y - 3, LEAF[2]);
        c.line(8, y + 2, 13, y - 1, LEAF[1]);
      }
      if (stage === 4) {
        if (cd.id === 'corn') {
          c.ellipse(10.5, 16, 1.6, 3.5, m);
          c.ellipse(5.5, 22, 1.6, 3.5, m);
          c.set(10, 14, l);
          c.set(5, 20, l);
          c.line(8, 6, 6, 3, P.y2);
          c.line(8, 6, 10, 3, P.y2);
        } else if (cd.id === 'sunflower') {
          for (let k = 0; k < 10; k++) {
            const a = (k / 10) * Math.PI * 2;
            c.circle(8 + Math.cos(a) * 4, 7 + Math.sin(a) * 4, 2, m);
          }
          c.circle(8, 7, 3, P.b2);
          c.speckle(rng, P.b1, 0.4, P.b2);
        } else if (cd.id === 'brussels') {
          for (let y = 12; y < 28; y += 3) {
            c.circle(6, y, 1.4, m);
            c.circle(10, y + 1, 1.4, m);
          }
        }
      }
      break;
    }
    case 'grain':
      for (const x of [4, 6, 8, 10, 12]) {
        const h = stage === 4 ? 14 : 10;
        c.vline(x, 30 - h, 30, stage === 4 ? cd.color[1] : LEAF[1]);
        if (stage === 4) {
          c.vline(x, 30 - h - 4, 30 - h, m);
          c.set(x - 1, 30 - h - 2, l);
        }
      }
      break;
    case 'ground':
      c.ellipse(8, 27, 7.5, 3.5, LEAF[0]);
      c.ellipse(4, 25, 3, 2, LEAF[1]);
      c.ellipse(12, 25, 3, 2, LEAF[2]);
      if (stage === 4) {
        const icon = produceIcon(cd.produce, cd.color, 3);
        c.blit(icon, 0, 15);
      }
      break;
    case 'flower':
      c.vline(8, 16, 30, LEAF[0]);
      c.ellipse(5, 26, 3, 1.5, LEAF[1]);
      c.ellipse(11, 23, 3, 1.5, LEAF[2]);
      if (stage === 4) {
        c.ellipse(8, 14, 3.5, 4, m);
        c.rect(5, 10, 2, 3, m);
        c.rect(10, 10, 2, 3, m);
        c.rect(7, 9, 2, 3, l);
        c.set(9, 13, d);
      } else c.ellipse(8, 15, 1.6, 2.5, LEAF[2]);
      break;
    default:
      sproutBase(c, 2);
  }
  c.outline(P.ink);
  return c;
}

function giant(cd: CropDef): PixelCanvas {
  const c = new PixelCanvas(48, 48);
  const [m, d, l] = cd.color;
  const rng = new Rng(9);
  c.ellipse(24, 40, 22, 7, P.g2);
  if (cd.produce === 'pumpkin') {
    c.ellipse(24, 28, 22, 17, m);
    for (const x of [10, 17, 24, 31, 38]) for (let y = 13; y < 45; y++) {
      const t = (y - 28) / 17;
      if (Math.abs(t) < 1) c.set(Math.round(24 + (x - 24) * Math.sqrt(1 - t * t)), y, d);
    }
    c.ellipse(14, 20, 3, 6, l);
    c.rect(22, 6, 5, 8, P.g2);
    c.line(27, 8, 36, 4, P.g3);
  } else if (cd.produce === 'melon') {
    c.ellipse(24, 28, 22, 17, m);
    for (let x = 6; x < 44; x += 6) c.line(x, 13, x + 3, 44, d);
    c.ellipse(15, 21, 5, 4, l);
    c.line(24, 11, 27, 5, P.b2);
  } else {
    c.ellipse(24, 32, 22, 12, P.g3);
    for (let k = 0; k < 16; k++) {
      const a = rng.next() * Math.PI, r = rng.next() * 14;
      c.circle(24 + Math.cos(a) * r * 1.2, 26 - Math.sin(a) * r * 0.8, 5, m);
    }
    c.speckle(rng, d, 0.08, m);
    for (let k = 0; k < 8; k++) c.circle(12 + rng.int(24), 16 + rng.int(14), 2, l);
  }
  c.outline(P.ink);
  return c;
}

// ── Fruit trees ─────────────────────────────────────────────
function fruitTree(stage: number, season: number, fruit: [number, number, number] | null, seed: number): PixelCanvas {
  const rng = new Rng(seed);
  if (stage === 0) {
    const c = new PixelCanvas(16, 32);
    c.vline(8, 20, 31, P.b2);
    foliage(c, 8, 19, 4, 4, SEASON_LEAF[season === 3 ? 0 : season], rng);
    c.outline(P.ink);
    return c;
  }
  if (stage === 1) {
    const c = new PixelCanvas(32, 48);
    c.rect(15, 32, 3, 15, P.b2);
    if (season !== 3) foliage(c, 16, 28, 8, 7, SEASON_LEAF[season], rng);
    else c.line(16, 32, 10, 24, P.b2), c.line(16, 32, 22, 24, P.b2);
    c.outline(P.ink);
    return c;
  }
  const t = drawOak(season, rng, stage < 3);
  if (fruit) for (let k = 0; k < 9; k++) {
    const x = 6 + rng.int(20), y = 8 + rng.int(20);
    if (t.get(x, y) === -1 || t.get(x, y) === P.ink) continue;
    t.circle(x, y, 1.6, fruit[0]);
    t.set(x - 1, y - 1, fruit[2]);
  }
  return t;
}

function tapper(ready: boolean): PixelCanvas {
  const c = new PixelCanvas(32, 48);
  c.rect(13, 36, 7, 7, P.s3);
  c.hline(13, 19, 36, P.s4);
  c.rect(15, 33, 2, 3, P.s2);
  if (ready) {
    c.rect(14, 37, 5, 2, P.o3);
    c.set(16, 34, P.o3);
  }
  c.outline(P.ink);
  return c;
}

export function bakeCrops(atlas: Atlas): void {
  for (const cd of CROPS) {
    for (let st = 0; st <= 4; st++) atlas.add(`crop.${cd.id}.${st}`, cropSprite(cd, st));
    atlas.add(`crop.${cd.id}.dead`, cropSprite(cd, 2, true));
    atlas.add(`item.${cd.id}`, produceIcon(cd.produce, cd.color, cd.id.length), true);
    atlas.add(`item.seed.${cd.id}`, seedPacket(cd.color, cd.produce), true);
    if (cd.giant) atlas.add(`giant.${cd.id}`, giant(cd));
  }
  for (const ft of FRUIT_TREES) {
    for (let s = 0; s < 4; s++) {
      for (let st = 0; st <= 3; st++) atlas.add(`ftree.${ft.id}.${st}.s${s}`, fruitTree(st, s, null, ft.id.length * 7 + st));
      atlas.add(`ftree.${ft.id}.fruit.s${s}`, fruitTree(3, s, ft.color, ft.id.length * 7 + 3));
    }
    const icon = new PixelCanvas(16, 16);
    icon.circle(8, 9, 5, ft.color[0]);
    icon.ellipse(9.5, 11, 3, 2.5, ft.color[1]);
    icon.circle(8, 9, 3.5, ft.color[0]);
    icon.rect(5, 6, 2, 2, ft.color[2]);
    icon.line(8, 4, 8, 2, P.b2);
    icon.ellipse(10.5, 3, 2, 1, P.g3);
    if (ft.id === 'cherry') {
      icon.px.fill(-1);
      icon.circle(5, 11, 3, ft.color[0]); icon.circle(11, 12, 3, ft.color[0]);
      icon.set(4, 10, ft.color[2]); icon.set(10, 11, ft.color[2]);
      icon.line(5, 8, 9, 2, P.g2); icon.line(11, 9, 9, 2, P.g2); icon.ellipse(11, 2, 2, 1, P.g3);
    }
    if (ft.id === 'pear') {
      icon.px.fill(-1);
      icon.circle(8, 11, 4.5, ft.color[0]); icon.circle(8, 6.5, 2.8, ft.color[0]);
      icon.set(6, 6, ft.color[2]); icon.set(6, 10, ft.color[2]); icon.line(8, 4, 9, 1, P.b2);
    }
    icon.outline(P.ink);
    atlas.add(`item.${ft.id}`, icon, true);
    const sap = new PixelCanvas(16, 16);
    sap.rect(5, 11, 6, 4, P.o1);
    sap.hline(4, 11, 11, P.o2);
    sap.vline(8, 4, 11, P.b2);
    foliage(sap, 8, 5, 3.5, 3, SEASON_LEAF[0], new Rng(2));
    sap.circle(10, 5, 1, ft.color[0]);
    sap.outline(P.ink);
    atlas.add(`item.sapling.${ft.id}`, sap, true);
  }
  atlas.add('obj.tapper', tapper(false));
  atlas.add('obj.tapper.ready', tapper(true));
}
