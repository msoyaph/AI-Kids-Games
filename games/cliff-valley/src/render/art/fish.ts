/** Fish, crab-pot catches, forage, junk, bait, crab pots, berry bushes, dig spots, bobber. */
import { Rng } from '../../core/rng';
import { FISH, FORAGE, type FishDef, type ForageDef } from '../../data/fish';
import type { Atlas } from '../atlas';
import { P, SEASON_LEAF } from '../palette';
import { PixelCanvas, darken, lighten } from '../pixelcanvas';
import { bottle, icon16, lump } from './items';
import { foliage } from './props';

export function fishIcon(f: FishDef): PixelCanvas {
  const [m, d, l] = f.color;
  const c = icon16();
  switch (f.shape) {
    case 'small':
      c.ellipse(7, 8, 4.5, 2.6, m);
      c.rows(['a.', 'aa', 'aa', 'a.'], { a: d }, 11, 6);
      c.hline(4, 9, 9, d);
      c.hline(4, 8, 7, l);
      c.set(4, 7, P.ink);
      break;
    case 'long':
      c.ellipse(7, 8, 6, 2.3, m);
      c.rows(['a..', 'aa.', 'aaa', 'aa.', 'a..'], { a: d }, 12, 6);
      c.hline(3, 11, 9, d);
      c.hline(3, 10, 7, l);
      c.set(2, 7, P.ink);
      c.line(6, 5, 9, 5, d);
      break;
    case 'round':
      c.ellipse(7, 8, 5, 4, m);
      c.rows(['a.', 'aa', 'aa', 'aa', 'a.'], { a: d }, 12, 6);
      c.ellipse(7, 10, 3.5, 1.5, d);
      c.ellipse(6, 6, 2.5, 1.2, l);
      c.set(4, 7, P.ink);
      break;
    case 'flat':
      c.ellipse(8, 8, 6, 4.5, m);
      c.speckle(new Rng(f.id.length), d, 0.2, m);
      c.rows(['a', 'a', 'a'], { a: d }, 14, 7);
      c.set(5, 6, P.ink);
      c.set(6, 6, P.ink);
      break;
    case 'big':
      c.ellipse(7, 8, 6.5, 4.5, m);
      c.rows(['a..', 'aa.', 'aaa', 'aaa', 'aa.', 'a..'], { a: d }, 12, 5);
      c.ellipse(7, 10.5, 5, 1.6, d);
      c.ellipse(6, 6, 3, 1.4, l);
      c.set(3, 7, P.ink);
      c.line(5, 3, 9, 4, d);
      break;
    case 'eel':
      for (let x = 1; x < 15; x++) {
        const y = 8 + Math.round(Math.sin(x * 0.7) * 2);
        c.vline(x, y - 1, y + 1, x < 3 ? d : m);
        c.set(x, y - 1, l);
      }
      c.set(2, 7, P.ink);
      break;
    case 'puffer':
      c.circle(8, 8, 5, m);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        c.set(8 + Math.round(Math.cos(a) * 6), 8 + Math.round(Math.sin(a) * 6), d);
      }
      c.circle(6, 6, 1.5, l);
      c.set(5, 8, P.ink);
      c.set(11, 8, P.ink);
      c.hline(7, 9, 10, d);
      break;
    case 'squid':
      c.ellipse(8, 5, 3.5, 4, m);
      for (let x = 5; x <= 11; x += 2) c.line(x, 9, x + (x % 4 === 1 ? -1 : 1), 14, d);
      c.set(7, 6, P.ink);
      c.set(9, 6, P.ink);
      c.set(7, 3, l);
      break;
    case 'octo':
      c.ellipse(8, 6, 5, 4.5, m);
      for (let x = 3; x <= 13; x += 2) {
        c.line(x, 9, x + (x < 8 ? -1 : 1), 13, m);
        c.set(x + (x < 8 ? -1 : 1), 14, d);
      }
      c.set(6, 6, P.ink);
      c.set(10, 6, P.ink);
      c.ellipse(7, 4, 2, 1, l);
      break;
    case 'ray':
      c.rows(['......aa......', '....aaaaaa....', '..aaaaaaaaaa..', 'aaaaaaaaaaaaaa', '..aaaaaaaaaa..', '.....aaaa.....', '......aa......', '.......a......', '........a.....'], { a: m }, 1, 3);
      c.speckle(new Rng(3), l, 0.1, m);
      c.set(6, 5, P.ink);
      c.set(9, 5, P.ink);
      break;
  }
  if (f.rare) {
    c.set(2, 2, P.white);
    c.set(13, 3, P.white);
    c.set(12, 13, P.white);
  }
  c.outline(P.ink);
  return c;
}

function forageIcon(fd: ForageDef): PixelCanvas {
  const [m, d, l] = fd.color;
  const c = icon16();
  const r = new Rng(fd.id.length);
  switch (fd.kind) {
    case 'flower':
      c.line(8, 15, 8, 8, P.g2);
      c.line(8, 12, 5, 10, P.g3);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        c.circle(8 + Math.cos(a) * 2.8, 6 + Math.sin(a) * 2.8, 1.8, m);
      }
      c.circle(8, 6, 1.4, fd.id === 'chamomile' || fd.id === 'snowdrop' ? P.y1 : d);
      break;
    case 'mushroom':
      c.rect(6, 9, 4, 6, P.cream);
      c.ellipse(8, 7.5, 6, 4, m);
      c.ellipse(6, 6, 2, 1.2, l);
      if (fd.id === 'morel') c.speckle(r, d, 0.35, m);
      c.hline(3, 13, 9, d);
      break;
    case 'berry':
      for (const [x, y] of [[6, 7], [10, 7], [8, 10], [5, 11], [11, 11]]) {
        c.circle(x, y, 2.2, m);
        c.set(x - 1, y - 1, l);
      }
      c.line(8, 4, 8, 1, P.g2);
      c.ellipse(10, 3, 2, 1, fd.id === 'hollyBerry' ? P.g1 : P.g3);
      if (fd.id === 'hollyBerry') c.ellipse(5, 3, 2.5, 1.2, P.g1);
      break;
    case 'nut':
      c.ellipse(8, 9, 5, 4.5, m);
      c.ellipse(8, 6, 4.5, 2, d);
      c.ellipse(6.5, 8.5, 1.5, 1.5, l);
      break;
    case 'shell':
      if (fd.id === 'coral') {
        c.line(8, 15, 8, 6, m); c.line(8, 10, 4, 4, m); c.line(8, 9, 12, 3, m); c.line(5, 6, 3, 2, l); c.line(11, 5, 13, 2, l);
        c.line(9, 15, 9, 7, d);
      } else if (fd.id === 'seaGlass') {
        c.rows(['..aaaa..', '.abbbba.', 'abbccbba', 'abbbbbba', '.abbbba.', '..aaaa..'], { a: d, b: m, c: l }, 4, 5);
      } else {
        for (let k = 0; k < 6; k++) c.line(8, 13, 2 + k * 2.4, 4, k % 2 ? m : l);
        c.ellipse(8, 13, 3, 1.5, d);
      }
      break;
    case 'leaf':
      if (fd.id === 'fiddlehead') {
        for (let t = 0; t < 22; t++) {
          const a = t * 0.5, rr = 1 + t * 0.18;
          c.set(8 + Math.round(Math.cos(a) * rr), 6 + Math.round(Math.sin(a) * rr), m);
        }
        c.line(10, 9, 9, 15, d);
      } else {
        c.ellipse(8, 8, 3.5, 6, m);
        c.line(8, 2, 8, 15, d);
        c.ellipse(6.5, 6, 1, 2, l);
      }
      break;
    case 'root':
      c.rect(6, 9, 4, 6, P.white);
      c.line(7, 9, 5, 1, m); c.line(8, 9, 8, 0, d); c.line(9, 9, 11, 2, m);
      c.hline(6, 9, 14, P.cream);
      break;
  }
  c.outline(P.ink);
  return c;
}

function crabIcon(id: string): PixelCanvas {
  const c = icon16();
  switch (id) {
    case 'crab':
      c.ellipse(8, 9, 5, 3.5, P.r2);
      c.circle(3, 6, 1.6, P.r2); c.circle(13, 6, 1.6, P.r2);
      for (const x of [4, 6, 10, 12]) c.line(x, 11, x + (x < 8 ? -1 : 1), 14, P.r1);
      c.set(7, 7, P.ink); c.set(9, 7, P.ink);
      break;
    case 'lobster':
      c.ellipse(8, 9, 2.5, 5, P.r1); c.ellipse(8, 9, 1.5, 4, P.r2);
      c.circle(4, 3, 2, P.r2); c.circle(12, 3, 2, P.r2);
      c.line(7, 5, 4, 4, P.r1); c.line(9, 5, 12, 4, P.r1);
      c.rows(['aaa', '.a.'], { a: P.r1 }, 7, 14);
      break;
    case 'shrimp':
      for (let t = 0; t < 12; t++) { const a = t * 0.3; c.circle(8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 1.6, t > 9 ? P.o2 : P.r3); }
      c.line(4, 6, 1, 3, P.o2);
      break;
    case 'clam':
      c.ellipse(8, 9, 6, 4.5, 0xd8c8b0); for (let x = 4; x < 13; x += 2) c.line(8, 13, x, 5, 0xb8a890); c.hline(2, 13, 12, 0x9a8a78);
      break;
    case 'mussel':
      c.ellipse(8, 8, 3.5, 6, 0x2a3a6a); c.ellipse(7, 6, 1, 3, 0x4a5a8a); c.line(8, 2, 8, 14, 0x1a2a4a);
      break;
    case 'crayfish':
      c.ellipse(8, 9, 2, 4.5, 0x8a3a2a); c.circle(4, 4, 1.8, 0x8a3a2a); c.circle(12, 4, 1.8, 0x8a3a2a); c.line(7, 6, 4, 5, 0x6a2a1a); c.line(9, 6, 12, 5, 0x6a2a1a);
      break;
    case 'snail':
      c.ellipse(6, 12, 5, 2, 0xb8a080);
      for (let t = 0; t < 18; t++) { const a = t * 0.5, rr = 1 + t * 0.22; c.set(9 + Math.round(Math.cos(a) * rr), 8 + Math.round(Math.sin(a) * rr), P.b2); }
      c.circle(9, 8, 4, 0xb7844f); c.circle(9, 8, 1.2, P.b2);
      c.line(2, 11, 1, 8, 0xb8a080);
      break;
    default:
      c.circle(8, 9, 4, 0x6a5a4a); c.circle(8, 9, 1.5, P.cream);
  }
  c.outline(P.ink);
  return c;
}

function junkIcon(id: string): PixelCanvas {
  if (id === 'oldBottle') return bottle(0x8ae0cf, P.b3);
  const c = icon16();
  if (id === 'driftwood') {
    c.line(2, 11, 14, 6, 0xb0a08a); c.line(2, 12, 14, 7, 0x8a7a68); c.line(3, 10, 13, 6, 0xd0c0a8); c.line(8, 9, 10, 4, 0xb0a08a);
  } else if (id === 'tinCan') {
    c.rect(4, 4, 8, 10, P.s3); c.hline(4, 11, 4, P.s4); c.rect(4, 7, 8, 4, P.r2); c.vline(5, 5, 13, P.s4);
  } else {
    c.rows(['.aaa', '.aaa', '.aba', '.aaa', 'aaaa', 'aaaa', 'aab.'], { a: P.k2, b: P.white }, 5, 4);
    c.hline(5, 8, 5, P.white);
  }
  c.outline(P.ink);
  return c;
}

function crabPot(ready: boolean, inWater: boolean): PixelCanvas {
  const c = icon16();
  if (inWater) c.ellipse(8, 13, 7, 2, 0x5fa6e0);
  c.rect(3, 6, 10, 7, P.b3);
  for (let x = 4; x < 13; x += 2) c.vline(x, 6, 12, P.b2);
  c.hline(3, 12, 6, P.b4);
  c.circle(13, 3, 1.8, P.r2);
  c.set(13, 2, P.white);
  c.line(12, 4, 10, 6, P.white);
  if (ready) {
    c.circle(8, 9, 2, P.r3);
    c.set(7, 8, P.white);
  }
  c.outline(P.ink);
  return c;
}

function bush(season: number, berry: number | null): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  foliage(c, 8, 9, 7, 6, SEASON_LEAF[season], new Rng(9 + season));
  if (berry !== null) {
    const r = new Rng(4);
    for (let k = 0; k < 7; k++) {
      const x = 3 + r.int(10), y = 5 + r.int(7);
      c.set(x, y, berry);
      c.set(x + 1, y, berry);
      c.set(x, y + 1, darken(berry, 0.3));
    }
  }
  if (season === 3) for (let x = 2; x < 14; x++) c.set(x, 3 + ((x * 7) % 3), P.snow2);
  c.outline(P.ink);
  return c;
}

function digSpot(): PixelCanvas {
  const c = icon16();
  c.ellipse(8, 11, 5, 2.5, P.soilD);
  c.ellipse(8, 10.5, 3.5, 1.5, P.soil);
  c.line(5, 9, 4, 6, P.b2);
  c.line(8, 9, 9, 5, P.b2);
  c.line(11, 10, 12, 7, P.b2);
  c.set(4, 5, P.k2);
  c.set(9, 4, P.k2);
  c.set(12, 6, P.k2);
  return c;
}

function bait(): PixelCanvas {
  const c = icon16();
  c.ellipse(8, 11, 6, 3, P.s2);
  c.rect(2, 7, 12, 4, P.s3);
  c.ellipse(8, 7, 6, 2.5, P.s4);
  c.ellipse(8, 7, 4.5, 1.6, P.soilD);
  c.line(6, 7, 9, 5, P.k2);
  c.line(9, 5, 10, 7, P.k2);
  c.outline(P.ink);
  return c;
}

export function bakeFish(atlas: Atlas): void {
  for (const f of FISH) atlas.add(`item.${f.id}`, fishIcon(f), true);
  for (const fd of FORAGE) atlas.add(`item.${fd.id}`, forageIcon(fd), true);
  for (const id of ['crab', 'lobster', 'shrimp', 'clam', 'mussel', 'crayfish', 'snail', 'periwinkle']) atlas.add(`item.${id}`, id === 'periwinkle' ? lump(0x6a5a8a, 8, 0x9a8ab8) : crabIcon(id), true);
  for (const id of ['driftwood', 'tinCan', 'lostSock', 'oldBottle']) atlas.add(`item.${id}`, junkIcon(id), true);
  atlas.add('item.bait', bait(), true);
  atlas.add('item.crabPot', crabPot(false, false), true);
  atlas.add('obj.crabpot.0', crabPot(false, true));
  atlas.add('obj.crabpot.1', crabPot(true, true));
  for (let s = 0; s < 4; s++) {
    atlas.add(`obj.bush.s${s}`, bush(s, null));
    atlas.add(`obj.bush.ras.s${s}`, bush(s, P.r2));
    atlas.add(`obj.bush.black.s${s}`, bush(s, P.p0));
  }
  atlas.add('obj.spot', digSpot());
  const bob = new PixelCanvas(8, 8);
  bob.ellipse(4, 4, 3, 3, P.white);
  bob.rect(1, 4, 7, 3, P.r2);
  bob.set(4, 0, P.ink2);
  bob.outline(P.ink);
  atlas.add('fx.bobber', bob);
  const splash = new PixelCanvas(12, 8);
  for (const [x, y] of [[1, 6], [3, 3], [6, 1], [9, 3], [11, 6]]) splash.set(x, y, P.w4);
  splash.hline(2, 9, 7, P.w3);
  atlas.add('fx.splash', splash);
  atlas.add('fx.alert', (() => {
    const c = new PixelCanvas(8, 12);
    c.rect(3, 0, 3, 7, P.y1);
    c.rect(3, 9, 3, 3, P.y1);
    c.outline(P.ink);
    return c;
  })());
  void lighten;
}
