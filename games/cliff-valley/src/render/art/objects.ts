/** World object sprites: farm clutter, choppable trees and their growth stages. */
import { Rng } from '../../core/rng';
import type { Atlas } from '../atlas';
import { P, SEASON_LEAF } from '../palette';
import { PixelCanvas } from '../pixelcanvas';
import { drawOak, drawPine, foliage } from './props';

function weed(season: number, v: number): PixelCanvas {
  const rng = new Rng(50 + v);
  const c = new PixelCanvas(16, 16);
  const leaf = SEASON_LEAF[season === 3 ? 2 : season];
  for (let k = 0; k < 6; k++) {
    const x = 3 + rng.int(10);
    const h = 4 + rng.int(6);
    c.line(x, 15, x + rng.range(-2, 2), 15 - h, k % 2 ? leaf[1] : leaf[2]);
  }
  c.ellipse(8, 13, 5, 2.5, leaf[0]);
  if (season === 0 && v % 2) c.set(5 + rng.int(6), 6, P.y2);
  if (season === 3) for (let x = 3; x < 13; x += 2) c.set(x, 9 + (x % 3), P.snow2);
  c.outline(P.ink);
  return c;
}

function stone(v: number): PixelCanvas {
  const rng = new Rng(60 + v);
  const c = new PixelCanvas(16, 16);
  c.ellipse(8, 10, 6 + (v % 2), 4.5, P.s2);
  c.ellipse(7, 9, 4.5, 3, P.s3);
  c.ellipse(6, 8, 2, 1.2, P.s4);
  c.speckle(rng, P.s1, 0.08, P.s3);
  c.outline(P.ink);
  return c;
}

function twig(v: number): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const off = v % 2;
  c.line(2, 12 - off, 13, 9 + off, P.b2);
  c.line(2, 13 - off, 13, 10 + off, P.b3);
  c.line(8, 11, 10, 7, P.b3);
  c.set(10, 6, P.g3);
  c.outline(P.ink);
  return c;
}

function stump(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(3, 6, 10, 9, P.b2);
  c.vline(3, 6, 14, P.b1);
  c.vline(11, 6, 14, P.b3);
  c.ellipse(8, 6, 5, 2.5, P.b4);
  c.ellipse(8, 6, 3, 1.4, P.b3);
  c.set(8, 6, P.b2);
  c.hline(1, 14, 14, P.b2);
  c.outline(P.ink);
  return c;
}

function log(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.rect(2, 12, 26, 14, P.b2);
  c.hline(2, 27, 12, P.b3);
  c.hline(2, 27, 15, P.b3);
  c.hline(2, 27, 25, P.b1);
  for (let x = 5; x < 26; x += 6) c.vline(x, 17, 23, P.b1);
  c.ellipse(28, 19, 3.5, 7, P.b4);
  c.ellipse(28, 19, 2, 4.5, P.b3);
  c.set(10, 11, P.g3); c.set(11, 10, P.g4); c.set(20, 11, P.g3);
  c.outline(P.ink);
  return c;
}

function boulder(): PixelCanvas {
  const rng = new Rng(77);
  const c = new PixelCanvas(32, 32);
  c.ellipse(16, 19, 15, 12, P.s1);
  c.ellipse(15, 17, 13, 10, P.s2);
  c.ellipse(12, 13, 6, 4, P.s3);
  c.ellipse(10, 11, 2.5, 1.5, P.s4);
  c.speckle(rng, P.s1, 0.06, P.s2);
  c.line(20, 10, 24, 20, P.s1);
  c.outline(P.ink);
  return c;
}

/** Tree growth stages: 0 seed, 1 sprout, 2 sapling, 3 young, 4 grown. */
function treeStage(kind: string, stage: number, season: number): PixelCanvas {
  const rng = new Rng(stage * 13 + season * 7 + kind.length);
  if (stage >= 4) {
    if (kind === 'pine') return drawPine(season, rng);
    const t = drawOak(season, rng);
    if (kind === 'maple' && season !== 3) {
      const m = new Map<number, number>();
      const src = SEASON_LEAF[season];
      const dst = season === 2 ? [0x6a1a1a, 0xc0302a, 0xf05a3a] : [0x2a5a2a, 0x4a8a3a, 0x7ab84a];
      for (let i = 0; i < 3; i++) m.set(src[i], dst[i]);
      t.remap(m);
    }
    return t;
  }
  if (stage === 3) {
    if (kind === 'pine') {
      const p = drawPine(season, rng);
      const small = new PixelCanvas(32, 48);
      // squash: copy every other row of the top part to make it smaller
      for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
        const sy = 48 - (48 - y) * 1.4;
        if (sy >= 0) small.set(x, y, p.get(Math.round(16 + (x - 16) * 1.3), Math.round(sy)));
      }
      return small;
    }
    return drawOak(season, rng, true);
  }
  const c = new PixelCanvas(16, 16);
  const leaf = SEASON_LEAF[season === 3 ? 0 : season];
  if (stage === 0) {
    c.ellipse(8, 12, 3, 2, P.b3);
    c.set(8, 11, P.b5);
  } else if (stage === 1) {
    c.vline(8, 8, 14, P.g2);
    c.ellipse(6, 8, 2, 1.2, leaf[1]);
    c.ellipse(10, 7, 2, 1.2, leaf[2]);
  } else {
    c.vline(8, 6, 15, P.b2);
    foliage(c, 8, 6, 5, 4.5, leaf, rng);
  }
  c.outline(P.ink);
  return c;
}

export function bakeObjects(atlas: Atlas): void {
  for (let s = 0; s < 4; s++) {
    for (let v = 0; v < 3; v++) atlas.add(`obj.weed.${v}.s${s}`, weed(s, v));
    for (const kind of ['oak', 'maple', 'pine'])
      for (let st = 0; st <= 4; st++) atlas.add(`tree.${kind}.${st}.s${s}`, treeStage(kind, st, s));
  }
  for (let v = 0; v < 3; v++) atlas.add(`obj.stone.${v}`, stone(v));
  for (let v = 0; v < 2; v++) atlas.add(`obj.twig.${v}`, twig(v));
  atlas.add('obj.stump', stump());
  atlas.add('obj.log', log());
  atlas.add('obj.boulder', boulder());
  // tree stump left after chopping
  const ts = stump();
  atlas.add('obj.treestump', ts);
  // highlight / cursor sprites
  const cur = new PixelCanvas(16, 16);
  const ccol = P.y2;
  for (let i = 0; i < 4; i++) {
    cur.set(i, 0, ccol); cur.set(0, i, ccol);
    cur.set(15 - i, 0, ccol); cur.set(15, i, ccol);
    cur.set(i, 15, ccol); cur.set(0, 15 - i, ccol);
    cur.set(15 - i, 15, ccol); cur.set(15, 15 - i, ccol);
  }
  atlas.add('ui.cursor', cur);
  const fillTile = new PixelCanvas(16, 16).fill(P.white);
  atlas.add('ui.white', fillTile);
  const dot = new PixelCanvas(4, 4).fill(P.white);
  atlas.add('fx.dot', dot);
  const spark = new PixelCanvas(7, 7);
  spark.vline(3, 0, 6, P.y3); spark.hline(0, 6, 3, P.y3); spark.set(3, 3, P.white);
  atlas.add('fx.spark', spark);
}
