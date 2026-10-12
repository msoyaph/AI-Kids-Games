/** Machines, dishes, artisan goods, decor and special crafted item sprites. */
import { Rng } from '../../core/rng';
import { tryItem } from '../../data/items';
import { DECOR, MACHINES } from '../../data/machines';
import { ARTISAN, DISHES } from '../../data/recipes';
import type { Atlas } from '../atlas';
import { P } from '../palette';
import { PixelCanvas, darken, lighten } from '../pixelcanvas';
import { bottle, dish, icon16, jar, puff, sack } from './items';
import { foliage } from './props';

/** Squash a 16×32 sprite into a 16×16 icon. */
export function iconFrom(pc: PixelCanvas): PixelCanvas {
  if (pc.w === 16 && pc.h === 16) return pc.clone();
  const c = icon16();
  const sx = pc.w / 16, sy = pc.h / 16;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) c.set(x, y, pc.get(Math.floor(x * sx), Math.floor(y * sy + sy / 2)));
  return c;
}

function machine(id: string, col: number): PixelCanvas {
  const c = new PixelCanvas(16, 32);
  const r = new Rng(id.length);
  const d = darken(col, 0.3), l = lighten(col, 0.3);
  switch (id) {
    case 'preservesJar':
      c.rect(2, 12, 12, 18, P.b3);
      c.hline(2, 13, 12, P.b5);
      c.rect(3, 16, 10, 13, 0xd8f0ff);
      c.rect(4, 19, 8, 9, col);
      c.rect(4, 19, 2, 4, l);
      c.rect(4, 13, 8, 3, P.s3);
      break;
    case 'juicer':
      c.rect(3, 14, 10, 16, P.s4);
      c.rect(4, 9, 8, 6, 0xd8f0ff);
      c.rect(5, 11, 6, 3, col);
      c.ellipse(8, 8, 5, 2, P.s3);
      c.rect(12, 20, 3, 2, P.s2);
      c.rect(5, 24, 6, 4, P.s2);
      break;
    case 'cheesePress':
      c.rect(2, 20, 12, 10, P.b3);
      c.vline(3, 6, 20, P.b2);
      c.vline(12, 6, 20, P.b2);
      c.rect(2, 5, 12, 3, P.b4);
      c.rect(7, 8, 2, 8, P.s2);
      c.rect(4, 15, 8, 5, P.y2);
      break;
    case 'loom':
      c.rect(1, 12, 14, 3, P.b4);
      c.vline(2, 6, 30, P.b2);
      c.vline(13, 6, 30, P.b2);
      for (let x = 4; x < 12; x += 2) c.vline(x, 15, 26, x % 4 ? P.k2 : P.bl3);
      c.rect(3, 26, 10, 3, P.b3);
      break;
    case 'furnace':
      c.ellipse(8, 20, 7, 10, P.s2);
      c.speckle(r, P.s1, 0.25, P.s2);
      c.ellipse(8, 22, 3.5, 4, P.ink2);
      c.ellipse(8, 23, 2.5, 2.5, P.o2);
      c.rect(6, 4, 4, 7, P.s1);
      break;
    case 'beeHouse':
      c.rect(2, 12, 12, 16, P.b4);
      for (let y = 15; y < 28; y += 4) c.hline(2, 13, y, P.b2);
      c.rows(['....aaaa....', '..aaaaaaaa..', 'aaaaaaaaaaaa'], { a: P.r1 }, 2, 9);
      c.rect(6, 24, 4, 2, P.ink2);
      c.vline(4, 28, 31, P.b2);
      c.vline(11, 28, 31, P.b2);
      c.set(13, 8, P.y1);
      c.set(14, 7, P.ink);
      break;
    case 'oilPress':
      c.rect(3, 14, 10, 16, P.b3);
      c.rect(2, 10, 12, 4, P.s3);
      c.rect(7, 2, 2, 8, P.s2);
      c.rect(4, 2, 8, 2, P.s2);
      c.rect(5, 20, 6, 6, P.o3);
      break;
    case 'recycler':
      c.rect(2, 12, 12, 18, col);
      c.hline(2, 13, 12, l);
      c.rect(4, 15, 8, 6, d);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        c.line(8, 18, 8 + Math.round(Math.cos(a) * 3), 18 + Math.round(Math.sin(a) * 3), P.white);
      }
      c.rect(5, 24, 6, 3, P.s2);
      break;
    case 'seedMaker':
      c.rect(2, 14, 12, 16, P.b3);
      c.ellipse(8, 11, 6, 4, col);
      c.ellipse(8, 10, 4, 2, l);
      c.rect(6, 22, 4, 4, P.b1);
      for (const [x, y] of [[5, 18], [8, 17], [11, 19]]) c.set(x, y, P.b5);
      break;
  }
  c.outline(P.ink);
  return c;
}

function bubble(kind: 'ready' | 'busy'): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.ellipse(8, 6.5, 6.5, 5.5, P.white);
  c.line(7, 11, 6, 14, P.white);
  if (kind === 'ready') {
    c.line(5, 7, 7, 9, P.g2);
    c.line(7, 9, 11, 4, P.g2);
    c.line(5, 6, 7, 8, P.g3);
    c.line(7, 8, 11, 3, P.g3);
  } else {
    for (const x of [5, 8, 11]) c.rect(x - 1, 6, 2, 2, P.s2);
  }
  c.outline(P.ink);
  return c;
}

function deco(id: string): PixelCanvas {
  const c = new PixelCanvas(16, 32);
  const r = new Rng(id.length * 3);
  switch (id) {
    case 'birdhouse':
      c.vline(7, 14, 31, P.b2); c.vline(8, 14, 31, P.b3);
      c.rect(3, 6, 10, 9, P.r2);
      c.rows(['...aaaaaa...', '.aaaaaaaaaa.', 'aaaaaaaaaaaa'], { a: P.b2 }, 2, 3);
      c.circle(8, 10, 1.6, P.ink2);
      break;
    case 'gardenGnome':
      c.rect(5, 22, 6, 8, P.bl2);
      c.circle(8, 19, 3, P.sk1);
      c.rect(5, 20, 6, 4, P.white);
      c.rows(['...a...', '..aaa..', '..aaa..', '.aaaaa.', 'aaaaaaa'], { a: P.r2 }, 5, 11);
      c.rect(5, 30, 6, 2, P.b2);
      break;
    case 'windChime':
      c.hline(3, 12, 6, P.b3);
      c.vline(7, 2, 6, P.s3);
      for (const [x, h] of [[4, 10], [6, 13], [9, 11], [11, 14]]) c.vline(x, 7, 7 + h, P.y1);
      c.circle(7.5, 24, 1.5, P.t3);
      break;
    case 'snowGlobe':
      c.circle(8, 24, 6, 0xd8f0ff);
      c.rect(3, 28, 10, 4, P.b3);
      c.rect(6, 22, 4, 4, P.g2);
      c.speckle(r, P.white, 0.2, 0xd8f0ff);
      break;
    case 'fishTank':
      c.rect(1, 18, 14, 12, 0x8fd0f0);
      c.rect(1, 18, 14, 2, P.s3);
      c.rect(1, 29, 14, 2, P.b2);
      c.ellipse(6, 23, 2.5, 1.5, P.o2);
      c.vline(11, 22, 28, P.g3);
      c.set(9, 21, P.white);
      break;
    case 'planterBox':
      c.rect(1, 22, 14, 9, P.b3);
      c.hline(1, 14, 22, P.b4);
      foliage(c, 8, 18, 6, 5, [P.g2, P.g3, P.g4], r);
      for (let k = 0; k < 4; k++) c.set(3 + r.int(10), 14 + r.int(6), r.pick([P.k2, P.y1, P.r3]));
      break;
    case 'stoneStatue':
      c.rect(3, 26, 10, 5, P.s2);
      c.ellipse(8, 20, 5, 5, P.s3);
      c.circle(5, 15, 2, P.s3); c.circle(11, 15, 2, P.s3);
      c.set(5, 15, P.ink); c.set(11, 15, P.ink);
      c.hline(6, 10, 21, P.s1);
      break;
    case 'glowTorch':
      c.rect(7, 18, 2, 13, P.s2);
      c.ellipse(8, 15, 3, 3.5, P.p3);
      c.ellipse(8, 15, 1.6, 2, P.white);
      break;
    case 'heartLantern':
      c.vline(8, 4, 31, P.b2);
      c.rows(['.aa.aa.', 'abbabba', 'abbbbba', '.abbba.', '..aba..', '...a...'], { a: P.r1, b: P.r3 }, 5, 10);
      break;
    case 'teaSet':
      c.rect(1, 24, 14, 2, P.b4);
      c.rect(2, 26, 2, 5, P.b2); c.rect(12, 26, 2, 5, P.b2);
      c.ellipse(6, 21, 3, 2.5, P.white); c.rect(9, 21, 2, 2, P.white);
      c.ellipse(12, 22, 1.5, 1, P.k3);
      break;
    case 'cuttingBoard':
      c.rect(2, 22, 12, 6, P.b4);
      c.rect(13, 23, 2, 3, P.b3);
      c.circle(6, 24, 1.5, P.r2); c.circle(9, 25, 1.5, P.o2);
      break;
    case 'jamShelf':
      c.rect(1, 6, 14, 25, P.b2);
      for (const y of [12, 20, 28]) c.hline(1, 14, y, P.b1);
      for (const y of [8, 16, 24]) for (let x = 2; x < 14; x += 4) c.rect(x, y, 3, 4, r.pick([P.r2, P.p2, P.o2, P.k2]));
      break;
    case 'flowerArch':
      for (let a = 0; a <= 16; a++) {
        const t = (a / 16) * Math.PI;
        c.circle(8 + Math.cos(t) * 6, 20 - Math.sin(t) * 14, 2, P.g3);
      }
      for (let k = 0; k < 10; k++) {
        const t = r.next() * Math.PI;
        c.set(Math.round(8 + Math.cos(t) * 6), Math.round(20 - Math.sin(t) * 14), r.pick([P.k2, P.y2, P.white]));
      }
      c.vline(2, 20, 31, P.g2); c.vline(14, 20, 31, P.g2);
      break;
    case 'starLight':
      c.vline(8, 14, 31, P.s2);
      c.rows(['..a..', 'aaaaa', '.aaa.', 'a...a'], { a: P.y2 }, 6, 9);
      c.set(8, 10, P.white);
      break;
    case 'foundersStatue':
      c.rect(2, 26, 12, 5, P.s2);
      c.rect(5, 12, 6, 14, P.s3);
      c.circle(8, 9, 3, P.s3);
      c.rect(4, 15, 2, 6, P.s3); c.rect(10, 13, 2, 3, P.s3);
      c.set(11, 12, P.y1);
      break;
    case 'flowerPot':
      c.rect(4, 24, 8, 7, P.o1);
      c.hline(3, 12, 24, P.o2);
      for (const [x, y, col] of [[6, 20, P.k2], [9, 19, P.y1], [8, 22, P.r3]] as [number, number, number][]) {
        c.vline(x, y + 1, 24, P.g2);
        c.circle(x, y, 1.6, col);
      }
      break;
    case 'woodSign':
      c.rect(7, 22, 2, 10, P.b2);
      c.rect(1, 14, 14, 9, P.b4);
      c.hline(1, 14, 14, P.b5);
      c.hline(3, 12, 17, P.b2); c.hline(3, 9, 19, P.b2);
      break;
    default:
      c.rect(3, 20, 10, 11, P.b4);
  }
  c.outline(P.ink);
  return c;
}

/** Decor ids that reuse an existing prop sprite. */
export const DECO_PROP: Record<string, string> = {
  bench: 'prop.bench',
  lantern: 'prop.lantern',
  lampPost: 'prop.lamp',
  pumpkinLantern: 'prop.pumpkinDeco',
  bookshelf: 'prop.bookshelf',
  table: 'prop.table',
  chair: 'prop.chair',
  barrelDeco: 'prop.barrel',
  crystalLamp: 'prop.crystal',
  rug: 'prop.rug',
};

function special(id: string): PixelCanvas {
  const c = icon16();
  switch (id) {
    case 'homeWhistle':
      c.rect(2, 7, 10, 4, P.y1); c.circle(12, 9, 3, P.y1); c.circle(12, 9, 1.4, P.o1); c.hline(2, 9, 7, P.y3);
      c.line(4, 6, 2, 3, P.bl3);
      break;
    case 'ropeLadder':
      c.vline(4, 1, 15, P.b4); c.vline(11, 1, 15, P.b4);
      for (let y = 3; y < 15; y += 3) c.hline(4, 11, y, P.b3);
      break;
    case 'popBomb':
      c.circle(7, 10, 5, P.ink2); c.circle(5, 8, 1.5, P.s2); c.line(10, 5, 13, 2, P.b3); c.set(13, 1, P.o3); c.set(14, 2, P.y2);
      break;
    case 'rainCharm':
      c.ellipse(8, 6, 5, 3, P.s4); c.circle(5, 5, 2.5, P.s4); c.circle(10, 4, 2.5, P.s4);
      for (const x of [5, 8, 11]) c.line(x, 10, x - 1, 13, P.bl2);
      c.vline(8, 13, 15, P.r2);
      break;
    case 'tapper':
      c.rect(4, 6, 8, 8, P.s3); c.hline(4, 11, 6, P.s4); c.rect(7, 2, 2, 4, P.s2); c.rect(5, 9, 6, 2, P.o3);
      break;
    case 'flour':
      return sack(0xf3efe6, P.b4);
    case 'sugar':
      return sack(0xe0e8ff, P.k2);
    case 'rice':
      return sack(0xe8dcc0, P.g3);
  }
  c.outline(P.ink);
  return c;
}

export function bakeCrafted(atlas: Atlas): void {
  for (const m of MACHINES) {
    const pc = machine(m.id, m.color);
    atlas.add(`obj.mach.${m.id}`, pc);
    atlas.add(`item.${m.id}`, iconFrom(pc), true);
  }
  atlas.add('obj.bubble.ready', bubble('ready'));
  atlas.add('obj.bubble.busy', bubble('busy'));
  DISHES.forEach((d, i) => atlas.add(`item.${d.id}`, dish(d.look[0], d.look[1], d.look[2], i + 1), true));
  for (const a of ARTISAN) {
    const base = tryItem(a.from);
    void base;
    const col = artisanColor(a.from);
    atlas.add(`item.${a.id}`, a.kind === 'juice' ? bottle(col, P.s3) : jar(col, a.kind === 'jam' ? P.r2 : P.g2), true);
  }
  atlas.add('item.cheese', (() => {
    const c = icon16();
    c.rows(['......aa', '....aabb', '..aabbbb', 'aabbbbbb', 'acccccca', 'acdcccca', 'acccdcca', 'aaaaaaaa'], { a: P.o1, b: P.y2, c: P.y1, d: P.o3 }, 3, 4);
    return c;
  })(), true);
  atlas.add('item.goatCheese', (() => {
    const c = icon16();
    c.ellipse(8, 9, 6, 4, 0xfffaf0);
    c.ellipse(8, 8, 6, 2.5, 0xf8f4ea);
    c.set(6, 9, P.s4); c.set(10, 10, P.s4);
    c.outline(P.ink);
    return c;
  })(), true);
  atlas.add('item.cloth', (() => {
    const c = icon16();
    c.rect(2, 4, 12, 9, P.bl3);
    c.rect(2, 9, 12, 4, P.bl2);
    for (let x = 3; x < 14; x += 3) c.vline(x, 4, 12, lighten(P.bl3, 0.3));
    c.outline(P.ink);
    return c;
  })(), true);
  atlas.add('item.honey', jar(P.o3, P.y1), true);
  atlas.add('item.oil', bottle(0xf5d34a, P.g2), true);
  atlas.add('item.fieldSnack', puff(0xb7844f), true);
  atlas.add('item.healingTea', dish('cup', 0xb8e07c, 0xf5d34a, 3), true);
  for (const [id] of DECOR) {
    const prop = DECO_PROP[id];
    if (prop) continue;
    const pc = deco(id);
    atlas.add(`obj.deco.${id}`, pc);
    atlas.add(`item.${id}`, iconFrom(pc), true);
  }
  for (const id of ['homeWhistle', 'ropeLadder', 'popBomb', 'rainCharm', 'tapper', 'flour', 'sugar', 'rice']) atlas.add(`item.${id}`, special(id), true);
  // deluxe scarecrow: gold-hatted scarecrow
  const ds = new PixelCanvas(16, 32);
  ds.vline(8, 10, 31, P.b2);
  ds.hline(2, 13, 15, P.b2);
  ds.rect(5, 14, 6, 9, P.p2);
  ds.circle(8, 9, 3.8, 0xe6c98f);
  ds.set(7, 9, P.ink); ds.set(9, 9, P.ink);
  ds.rect(4, 3, 8, 3, P.y1); ds.rect(2, 6, 12, 1, P.y1);
  ds.outline(P.ink);
  atlas.add('obj.deluxeScarecrow', ds);
  atlas.add('item.deluxeScarecrow', iconFrom(ds), true);
}

function artisanColor(id: string): number {
  const COL: Record<string, number> = {
    strawberry: P.r2, blueberry: P.bl2, melon: P.g4, cranberry: P.r1, grape: P.p1, cherry: P.r1, peach: 0xf6a070, orange: P.o2, apple: P.r3, pear: 0xb8d050,
    wildRaspberry: P.r2, blackberry: P.p0, wildPlum: P.p1, tomato: P.r2, carrot: P.o2, pumpkin: P.o2, beet: P.r0, corn: P.y1, kale: P.g1,
  };
  return COL[id] ?? P.g3;
}
