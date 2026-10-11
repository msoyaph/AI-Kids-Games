/** Generic item icon makers (reused by every content category) + basic resource icons. */
import { Rng } from '../../core/rng';
import type { Atlas } from '../atlas';
import { P } from '../palette';
import { PixelCanvas, darken, lighten } from '../pixelcanvas';

export const icon16 = () => new PixelCanvas(16, 16);

export function jar(col: number, lid: number = P.r2): PixelCanvas {
  const c = icon16();
  c.rect(4, 5, 8, 10, 0xd8f0ff);
  c.rect(5, 7, 6, 7, col);
  c.rect(5, 7, 2, 3, lighten(col, 0.35));
  c.rect(4, 3, 8, 2, lid);
  c.hline(4, 11, 3, lighten(lid, 0.3));
  c.rect(6, 10, 4, 2, P.cream);
  c.outline(P.ink);
  return c;
}

export function bottle(col: number, cork: number = P.b3): PixelCanvas {
  const c = icon16();
  c.rect(5, 7, 6, 8, col);
  c.rect(6, 4, 4, 3, col);
  c.rect(7, 1, 2, 3, cork);
  c.vline(6, 8, 13, lighten(col, 0.35));
  c.rect(6, 10, 4, 3, P.cream);
  c.outline(P.ink);
  return c;
}

export function sack(col: number, mark: number): PixelCanvas {
  const c = icon16();
  c.ellipse(8, 10, 6, 5, col);
  c.rect(5, 3, 6, 4, col);
  c.hline(5, 10, 6, darken(col, 0.3));
  c.circle(8, 10, 2, mark);
  c.vline(5, 7, 13, lighten(col, 0.2));
  c.outline(P.ink);
  return c;
}

export function lump(col: number, seed: number, specks?: number): PixelCanvas {
  const c = icon16();
  const rng = new Rng(seed);
  c.ellipse(8, 9, 6, 5, darken(col, 0.2));
  c.ellipse(7, 8, 5, 4, col);
  c.ellipse(6, 6.5, 2, 1.4, lighten(col, 0.3));
  if (specks !== undefined) for (let k = 0; k < 6; k++) c.paint(3 + rng.int(10), 5 + rng.int(8), specks);
  c.outline(P.ink);
  return c;
}

export function bar(col: number): PixelCanvas {
  const c = icon16();
  c.rows(['....aaaaaaa.', '...abbbbbba.', '..abbbbbbca.', '.abbbbbbcca.', 'adddddddcca.', 'addddddddca.', 'addddddddda.', 'aaaaaaaaaa..'], { a: P.ink, b: lighten(col, 0.4), c: darken(col, 0.25), d: col }, 2, 4);
  return c;
}

export type GemCut = 'round' | 'tall' | 'square' | 'shard' | 'heart';
export function gem(col: number, cut: GemCut = 'round'): PixelCanvas {
  const c = icon16();
  const l = lighten(col, 0.45), d = darken(col, 0.3);
  switch (cut) {
    case 'round':
      c.rows(['...aaaa...', '..abbbba..', '.abbccbba.', 'abbcccbbba', 'addcccbbba', '.adddbbba.', '..adddba..', '...aaaa...'], { a: P.ink, b: col, c: l, d }, 3, 4);
      break;
    case 'tall':
      c.rows(['...aa...', '..abba..', '.abcbba.', '.abcbba.', 'abccbbba', 'abcbbbda', 'abbbbdda', '.abbdda.', '..adda..', '...aa...'], { a: P.ink, b: col, c: l, d }, 4, 3);
      break;
    case 'square':
      c.rows(['aaaaaaaa', 'acccbbba', 'acbbbbda', 'acbbbbda', 'abbbbbda', 'abbbbdda', 'adddddda', 'aaaaaaaa'], { a: P.ink, b: col, c: l, d }, 4, 4);
      break;
    case 'shard':
      c.rows(['.....aa', '....aca', '...acba', '..acbba', '.acbbda', 'acbbda.', 'abbda..', 'adda...', 'aaa....'], { a: P.ink, b: col, c: l, d }, 4, 3);
      break;
    case 'heart':
      c.rows(['.aa..aa.', 'acba.cba', 'acbbbbba', 'abbbbbda', '.abbbda.', '..abda..', '...aa...'], { a: P.ink, b: col, c: l, d }, 4, 4);
      break;
  }
  return c;
}

export function geode(col: number, seed: number): PixelCanvas {
  const c = lump(col, seed, darken(col, 0.3));
  c.set(10, 5, P.white);
  return c;
}

export function egg(col: number, big = false): PixelCanvas {
  const c = icon16();
  c.ellipse(8, 9, big ? 5 : 4, big ? 6 : 5, col);
  c.ellipse(9.5, 11, 2, 2.5, darken(col, 0.12));
  c.ellipse(6.5, 6.5, 1.3, 1.6, lighten(col, 0.5));
  c.outline(P.ink);
  return c;
}

export function puff(col: number): PixelCanvas {
  const c = icon16();
  for (const [x, y, r] of [[5, 9, 3.5], [10, 8, 3.8], [8, 11, 3.5], [8, 6, 3]]) c.circle(x, y, r, col);
  c.speckle(new Rng(3), darken(col, 0.12), 0.15, col);
  c.circle(6, 6, 1.4, lighten(col, 0.4));
  c.outline(P.ink);
  return c;
}

/** A plate or bowl of food in two colors. */
export function dish(kind: 'plate' | 'bowl' | 'cup' | 'slice' | 'bread' | 'skewer' | 'pie', a: number, b: number, seed = 1): PixelCanvas {
  const c = icon16();
  const rng = new Rng(seed);
  switch (kind) {
    case 'plate':
      c.ellipse(8, 11, 7, 3.5, P.white);
      c.ellipse(8, 11, 5, 2.2, P.s5);
      c.ellipse(8, 9, 4.5, 3, a);
      for (let k = 0; k < 5; k++) c.paint(5 + rng.int(7), 7 + rng.int(4), b);
      c.ellipse(7, 8, 1.4, 0.8, lighten(a, 0.4));
      break;
    case 'bowl':
      c.ellipse(8, 8, 6.5, 2.2, a);
      for (let k = 0; k < 4; k++) c.paint(4 + rng.int(9), 7 + rng.int(2), b);
      for (let y = 9; y < 14; y++) {
        const hw = Math.round(6.5 - (y - 9) * 0.8);
        c.hline(8 - hw, 7 + hw, y, P.white);
      }
      c.hline(4, 11, 10, P.s4);
      break;
    case 'cup':
      c.rect(4, 5, 7, 9, P.white);
      c.ellipse(7.5, 5, 3.5, 1.2, a);
      c.rect(11, 7, 2, 4, P.white);
      c.set(12, 8, -1);
      c.set(12, 9, -1);
      c.hline(5, 9, 9, b);
      break;
    case 'slice':
      c.rows(['.........aa', '.......aabb', '.....aabbbb', '...aabbbbbb', '.aabbbbbbbb', 'acccccccccc', 'acccccccccc'], { a: lighten(b, 0.2), b, c: a }, 2, 5);
      break;
    case 'bread':
      c.ellipse(8, 10, 6.5, 4, a);
      c.ellipse(8, 8.5, 6, 3, lighten(a, 0.15));
      for (const x of [5, 8, 11]) c.line(x - 1, 7, x + 1, 9, darken(a, 0.25));
      if (b !== a) c.ellipse(8, 7, 3, 1, b);
      break;
    case 'skewer':
      c.line(2, 14, 14, 2, P.b4);
      for (const [x, y, col] of [[5, 11, a], [8, 8, b], [11, 5, a]] as [number, number, number][]) c.circle(x, y, 2.2, col);
      break;
    case 'pie':
      c.ellipse(8, 10, 7, 4, a);
      c.ellipse(8, 9, 6, 3, b);
      for (let x = 3; x < 14; x += 3) c.line(x, 7, x + 2, 11, lighten(a, 0.25));
      c.hline(2, 13, 12, darken(a, 0.25));
      break;
  }
  c.outline(P.ink);
  return c;
}

export function bakeResourceIcons(atlas: Atlas): void {
  const add = (n: string, c: PixelCanvas) => atlas.add(`item.${n}`, c, true);
  // wood: log section
  let c = icon16();
  c.rect(2, 6, 10, 6, P.b3);
  c.hline(2, 11, 6, P.b4);
  c.hline(2, 11, 11, P.b2);
  c.ellipse(12, 9, 2.5, 3.5, P.b5);
  c.ellipse(12, 9, 1.2, 2, P.b4);
  c.rect(4, 3, 9, 4, P.b2);
  c.hline(4, 12, 3, P.b3);
  c.ellipse(13, 5, 1.8, 2.2, P.b4);
  c.outline(P.ink);
  add('wood', c);
  add('stone', lump(P.s3, 1));
  c = icon16();
  for (let k = 0; k < 5; k++) c.line(3 + k, 14, 10 + k, 2, k % 2 ? P.g3 : P.g4);
  c.hline(4, 12, 9, P.b4);
  c.outline(P.ink);
  add('fiber', c);
  c = icon16();
  c.ellipse(8, 10, 4.5, 5, P.o3);
  c.line(8, 3, 8, 6, P.o3);
  c.set(6, 8, P.y3);
  c.outline(P.ink);
  add('sap', c);
  c = icon16();
  c.rect(2, 5, 11, 7, P.b1);
  c.hline(2, 12, 5, P.b2);
  c.ellipse(13, 8.5, 2.5, 3.5, P.b3);
  c.ellipse(13, 8.5, 1, 2, P.b2);
  c.outline(P.ink);
  add('hardwood', c);
  add('coal', lump(P.ink2, 2, P.s1));
  add('clay', lump(0xb07850, 3, 0x9a6040));
  c = seedMix();
  add('mixedSeeds', c);
  c = icon16();
  c.ellipse(8, 10, 4, 4.5, P.b3);
  c.ellipse(8, 6, 4.5, 2.5, P.b2);
  c.speckle(new Rng(1), P.b1, 0.3, P.b2);
  c.vline(8, 2, 4, P.b2);
  c.set(7, 9, P.b4);
  c.outline(P.ink);
  add('acorn', c);
  c = icon16();
  c.ellipse(5, 11, 2.5, 2, P.b3);
  c.line(6, 10, 13, 3, P.o2);
  c.line(7, 11, 14, 5, P.o3);
  c.line(6, 11, 13, 4, P.o3);
  c.outline(P.ink);
  add('mapleSeed', c);
  c = icon16();
  c.ellipse(8, 9, 4.5, 6, P.b2);
  for (let y = 4; y < 15; y += 2) c.hline(5, 11, y, P.b3);
  c.speckle(new Rng(2), P.b4, 0.15, P.b3);
  c.outline(P.ink);
  add('pineCone', c);
  add('oakResin', jar(P.o3, P.b2));
  add('mapleSyrup', bottle(0xa0501e));
  add('pineTar', jar(0x3a2a20, P.s2));
  add('basicFertilizer', sack(P.b4, P.b2));
  add('deluxeFertilizer', sack(P.bl3, P.bl1));
  add('speedyGrow', sack(P.g4, P.g2));
}

function seedMix(): PixelCanvas {
  const c = icon16();
  c.rect(3, 2, 10, 13, 0xf4e2b4);
  for (const [x, y, col] of [[5, 6, P.r2], [9, 5, P.y1], [7, 9, P.g3], [10, 10, P.bl2], [5, 12, P.k2]] as [number, number, number][]) c.circle(x, y, 1.5, col);
  c.outline(P.ink);
  return c;
}
