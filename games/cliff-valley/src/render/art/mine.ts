/** Mine tiles (per layer), rocks, ores, gem nodes, critters, minerals & artifacts icons. */
import { Rng } from '../../core/rng';
import { ARTIFACTS, GEODES, MINERALS, ORES } from '../../data/minerals';
import { Ter } from '../../sim/terrain';
import type { Atlas } from '../atlas';
import { P } from '../palette';
import { PixelCanvas, darken, lighten } from '../pixelcanvas';
import { bar, gem, geode, icon16, lump } from './items';
import { caveFloor, caveWall, TER_VARIANTS } from './terrain';

/** Layer palettes: floor, floor speck, wall, accent. */
export const LAYERS = [
  { floor: 0x7a6450, speck: 0x5f4c3c, wall: 0x6a5a4a, accent: 0xb7844f, rock: [0x8a8aa0, 0x5f5e74, 0xb9b9ca] },
  { floor: 0x6f8aa8, speck: 0x8fb0cc, wall: 0x4f6a8c, accent: 0xd8f0ff, rock: [0x9ab8d8, 0x5f7a9c, 0xd8ecff] },
  { floor: 0x4a3a66, speck: 0x6a4f8c, wall: 0x3a2853, accent: 0x9873be, rock: [0x7a6a98, 0x4a3a66, 0xb8a0e0] },
  { floor: 0x2f5a62, speck: 0x3f7a80, wall: 0x1f3a48, accent: 0x7ee0e8, rock: [0x5f9aa8, 0x2f5a62, 0xa8f0f0] },
];

function rock(L: number, v: number, kind: 'rock' | 'geode' = 'rock'): PixelCanvas {
  const pal = LAYERS[L].rock;
  const rng = new Rng(L * 10 + v);
  const c = icon16();
  c.ellipse(8, 10, 6.5 - (v % 2) * 0.5, 5, pal[1]);
  c.ellipse(7, 9, 5, 4, pal[0]);
  c.ellipse(6, 7.5, 2, 1.3, pal[2]);
  c.speckle(rng, darken(pal[0], 0.2), 0.12, pal[0]);
  if (kind === 'geode') {
    c.circle(9, 10, 2.5, darken(pal[1], 0.3));
    c.set(9, 10, LAYERS[L].accent);
    c.set(8, 9, P.white);
  }
  c.outline(P.ink);
  return c;
}

function oreNode(L: number, col: number, seed: number): PixelCanvas {
  const c = rock(L, seed % 3);
  const rng = new Rng(seed);
  for (let k = 0; k < 5; k++) {
    const x = 4 + rng.int(8), y = 6 + rng.int(6);
    c.set(x, y, col);
    c.set(x + 1, y, lighten(col, 0.3));
  }
  return c;
}

function gemNode(L: number, col: number): PixelCanvas {
  const c = rock(L, 1);
  c.line(6, 11, 5, 5, col);
  c.line(7, 11, 7, 4, lighten(col, 0.4));
  c.line(9, 11, 10, 6, col);
  c.set(7, 4, P.white);
  return c;
}

function ice(): PixelCanvas {
  const c = icon16();
  c.rows(['...aaaaaa...', '..abbbbbba..', '.abccbbbbba.', '.abcbbbbbba.', 'abbbbbbbbbba', 'abbbbbbbbdba', 'abbbbbbbddba', '.abbbbbdddba', '.aaaaaaaaaa.'], { a: 0x5f7a9c, b: 0xbfe0f8, c: P.white, d: 0x8fb6d8 }, 2, 4);
  return c;
}

function box(): PixelCanvas {
  const c = icon16();
  c.rect(2, 4, 12, 11, P.b3);
  c.rect(2, 4, 12, 2, P.b4);
  c.hline(2, 13, 9, P.b2);
  c.vline(7, 4, 14, P.b2);
  c.set(4, 6, P.y1);
  c.outline(P.ink);
  return c;
}

function ladder(blocked: boolean): PixelCanvas {
  const c = icon16();
  c.ellipse(8, 9, 7, 5.5, P.ink);
  c.ellipse(8, 9, 5.5, 4, 0x0d0a14);
  if (blocked) {
    c.circle(6, 8, 2.5, P.s2);
    c.circle(10, 9, 2.5, P.s3);
    c.circle(8, 6, 2, P.s2);
  } else {
    c.vline(5, 3, 14, P.b3);
    c.vline(10, 3, 14, P.b3);
    for (let y = 4; y < 14; y += 3) c.hline(5, 10, y, P.b4);
  }
  return c;
}

function mineChest(): PixelCanvas {
  const c = icon16();
  c.rect(1, 6, 14, 9, P.p1);
  c.rect(1, 3, 14, 4, P.p2);
  c.hline(1, 14, 3, P.p3);
  c.rect(1, 6, 14, 2, P.y1);
  c.rect(7, 7, 2, 3, P.y2);
  c.vline(1, 3, 14, P.y1);
  c.vline(14, 3, 14, P.y1);
  c.outline(P.ink);
  return c;
}

function heartstone(frame: number): PixelCanvas {
  const c = new PixelCanvas(16, 32);
  c.rect(4, 22, 8, 9, P.s3);
  c.rect(3, 20, 10, 2, P.s4);
  c.rect(3, 30, 10, 2, P.s2);
  const glow = frame ? 0xffc6dc : 0xff9ac0;
  c.rows(['.aa..aa.', 'abbaabba', 'abcbbbba', 'abbbbbba', '.abbbba.', '..abba..', '...aa...'], { a: 0x96293a, b: glow, c: P.white }, 4, 11);
  if (frame) {
    c.set(2, 9, P.y3);
    c.set(13, 12, P.y3);
    c.set(8, 7, P.y3);
  }
  c.outline(P.ink);
  return c;
}

const CRITTER_COLORS = [
  { slime: [0x6ac24a, 0x3e8a2a, 0xc8f0a0], bat: [0x6a4a6a, 0x4a2a4a, 0xd8a8d8], crab: [0x8a8aa0, 0x5f5e74, 0xf07868] },
  { slime: [0x6fb3e6, 0x3479c0, 0xd8f0ff], bat: [0xb8d0f0, 0x6f8aa8, 0xffffff], crab: [0x9ab8d8, 0x5f7a9c, 0x8fb6f5] },
  { slime: [0xb070e0, 0x7a40a8, 0xf0c8ff], bat: [0x4a3a66, 0x2b2433, 0xf5d34a], crab: [0x7a6a98, 0x4a3a66, 0xf5d34a] },
  { slime: [0xee8ab6, 0xbf5688, 0xffe0f0], bat: [0x3f7a80, 0x1f3a48, 0x7ee0e8], crab: [0x5f9aa8, 0x2f5a62, 0x7ee0e8] },
];

function slime(cols: number[], f: number): PixelCanvas {
  const c = icon16();
  const squash = f === 1 ? 1 : f === 2 ? -1 : 0;
  c.ellipse(8, 11 + squash * 0.5, 6 + squash, 4.5 - squash, cols[0]);
  c.ellipse(8, 12.5, 5, 2, cols[1]);
  c.ellipse(6, 9 - squash * 0.5, 1.8, 1.2, cols[2]);
  c.set(6, 11, P.ink);
  c.set(10, 11, P.ink);
  c.set(8, 13, darken(cols[1], 0.3));
  c.outline(P.ink);
  return c;
}

function bat(cols: number[], f: number): PixelCanvas {
  const c = icon16();
  const up = f % 2 === 0;
  c.ellipse(8, 8, 3, 3, cols[0]);
  if (up) {
    c.line(5, 7, 1, 3, cols[1]); c.line(5, 8, 1, 4, cols[1]); c.line(1, 3, 3, 7, cols[1]);
    c.line(11, 7, 15, 3, cols[1]); c.line(11, 8, 15, 4, cols[1]); c.line(15, 3, 13, 7, cols[1]);
  } else {
    c.line(5, 8, 1, 11, cols[1]); c.line(5, 9, 2, 12, cols[1]);
    c.line(11, 8, 15, 11, cols[1]); c.line(11, 9, 14, 12, cols[1]);
  }
  c.set(6, 5, cols[0]); c.set(10, 5, cols[0]);
  c.set(7, 8, cols[2]); c.set(9, 8, cols[2]);
  c.outline(P.ink);
  return c;
}

function crab(cols: number[], f: number, hidden: boolean): PixelCanvas {
  if (hidden) {
    const c = icon16();
    c.ellipse(8, 10, 6.5, 5, cols[1]);
    c.ellipse(7, 9, 5, 4, cols[0]);
    c.ellipse(6, 7.5, 2, 1.3, lighten(cols[0], 0.3));
    c.outline(P.ink);
    return c;
  }
  const c = icon16();
  for (const [x, dx] of [[4, -1], [12, 1]] as [number, number][]) {
    c.line(x, 11, x + dx * 3, 14 - (f % 2), darken(cols[1], 0.2));
    c.line(x, 10, x + dx * 3, 12 + (f % 2), darken(cols[1], 0.2));
  }
  c.ellipse(8, 9, 6, 4, cols[0]);
  c.ellipse(7, 7.5, 3, 1.5, lighten(cols[0], 0.3));
  c.circle(2, 6, 1.6, cols[2]);
  c.circle(14, 6, 1.6, cols[2]);
  c.set(6, 6, P.ink);
  c.set(10, 6, P.ink);
  c.outline(P.ink);
  return c;
}

function artifactIcon(id: string, seed: number): PixelCanvas {
  const c = icon16();
  const r = new Rng(seed);
  switch (id) {
    case 'oldCoin': c.circle(8, 8, 5.5, P.o3); c.circle(8, 8, 4, P.y1); c.rect(7, 5, 2, 6, P.o2); break;
    case 'potShard': c.rows(['..aaaa..', '.abbbbaa', 'abbcbbba', 'abbbbbba', '.abbbba.', '..aabba.', '....aa..'], { a: P.o1, b: 0xc06a3a, c: P.y2 }, 4, 4); break;
    case 'fossilShell': case 'ammonite': for (let t = 0; t < 30; t++) { const a = t * 0.45, rr = 1 + t * 0.18; c.set(8 + Math.round(Math.cos(a) * rr), 8 + Math.round(Math.sin(a) * rr), id === 'ammonite' ? P.sa1 : P.s4); } c.circle(8, 8, 1, P.sa0); break;
    case 'dinoTooth': c.rows(['aaaaa', 'abbba', 'abbba', '.abba', '.abba', '..ab.', '..a..'], { a: P.sa0, b: P.cream }, 6, 4); break;
    case 'arrowhead': c.rows(['...a...', '..aba..', '.abbba.', 'abbbbba', '..aba..', '..aba..'], { a: P.s1, b: P.s3 }, 4, 4); break;
    case 'oldKey': c.circle(5, 6, 3, P.o1); c.circle(5, 6, 1.5, -1); c.rect(7, 6, 7, 2, P.o1); c.rect(12, 8, 2, 3, P.o1); break;
    case 'oldToyTrain': c.rect(2, 6, 9, 6, P.r2); c.rect(10, 4, 4, 8, P.r1); c.rect(4, 3, 2, 3, P.s1); c.circle(4, 13, 1.6, P.ink2); c.circle(9, 13, 1.6, P.ink2); c.circle(12, 13, 1.6, P.ink2); break;
    case 'foundersBadge': c.circle(8, 7, 5, P.y1); c.circle(8, 7, 3.5, P.bl2); c.set(8, 7, P.y2); c.line(5, 11, 4, 15, P.r2); c.line(11, 11, 12, 15, P.r2); break;
    case 'oldTicket': c.rect(2, 4, 12, 8, P.cream); c.vline(10, 4, 11, P.s3); c.hline(3, 8, 6, P.r2); c.hline(3, 7, 9, P.s2); break;
    case 'frogStatue': c.ellipse(8, 10, 6, 4.5, P.s3); c.circle(5, 6, 2, P.s3); c.circle(11, 6, 2, P.s3); c.set(5, 6, P.ink); c.set(11, 6, P.ink); c.line(6, 11, 10, 11, P.s1); break;
    case 'teacup': c.rect(3, 6, 8, 6, P.white); c.ellipse(7, 6, 4, 1, P.s4); c.rect(11, 7, 2, 3, P.white); c.set(5, 9, P.k2); c.set(8, 8, P.bl3); c.ellipse(7, 13, 6, 1.2, P.white); break;
    case 'musicBox': c.rect(2, 6, 12, 8, P.b3); c.rect(2, 4, 12, 3, P.b4); c.rect(6, 8, 4, 3, P.y1); c.line(13, 6, 15, 3, P.s3); break;
    case 'oldCompass': c.circle(8, 8, 6, P.o2); c.circle(8, 8, 4.5, P.cream); c.line(8, 4, 8, 8, P.r2); c.line(8, 8, 8, 12, P.s1); break;
    case 'leafFossil': c.ellipse(8, 8, 6, 5, P.s3); c.line(4, 11, 12, 5, P.s1); for (let k = 0; k < 3; k++) { c.line(6 + k * 2, 10 - k * 2, 5 + k * 2, 7 - k * 2, P.s1); } break;
    case 'ancientSeed': c.ellipse(8, 9, 4, 5.5, P.b2); c.ellipse(7, 7, 1.5, 2, P.b4); c.line(8, 3, 10, 1, P.g3); break;
    case 'heartstone': c.rows(['.aa..aa.', 'abbaabba', 'abcbbbba', 'abbbbbba', '.abbbba.', '..abba..', '...aa...'], { a: 0x96293a, b: 0xff9ac0, c: P.white }, 4, 4); break;
    default: c.circle(8, 8, 5, r.pick([P.s3, P.b3]));
  }
  if (id !== 'heartstone') c.outline(P.ink);
  return c;
}

export function bakeMine(atlas: Atlas): void {
  LAYERS.forEach((L, li) => {
    for (let v = 0; v < TER_VARIANTS; v++) {
      const rng = new Rng(500 + li * 31 + v);
      atlas.add(`ter.${Ter.CAVE}.${v}.m${li}`, caveFloor(rng, L.floor, L.speck));
      atlas.add(`ter.${Ter.CAVEWALL}.${v}.m${li}`, caveWall(rng, L.wall, false));
      atlas.add(`cavetop.${v}.m${li}`, caveWall(rng, L.wall, true));
    }
    for (let v = 0; v < 3; v++) atlas.add(`obj.rock${li}.${v}`, rock(li, v));
    atlas.add(`obj.geode${li}`, rock(li, 2, 'geode'));
    for (const [kind, cols] of Object.entries(CRITTER_COLORS[li]) as [string, number[]][]) {
      for (let f = 0; f < 3; f++) {
        const pc = kind === 'slime' ? slime(cols, f) : kind === 'bat' ? bat(cols, f) : crab(cols, f, false);
        atlas.add(`cr.${kind}.${li}.${f}`, pc);
      }
      if (kind === 'crab') atlas.add(`cr.crab.${li}.hidden`, crab(cols, 0, true));
    }
  });
  ORES.forEach((o, i) => {
    for (let li = 0; li < 4; li++) atlas.add(`obj.ore.${o.id}.${li}`, oreNode(li, o.color, i * 7 + li));
    atlas.add(`item.${o.id}`, lump(darken(LAYERS[Math.min(3, i)].rock[0], 0.1), i + 3, o.color), true);
    atlas.add(`item.${o.bar}`, bar(o.color), true);
  });
  for (let li = 0; li < 4; li++) atlas.add(`obj.ore.coal.${li}`, oreNode(li, P.ink, 99 + li));
  for (const m of MINERALS) {
    for (let li = 0; li < 4; li++) if (m.from.includes('node')) atlas.add(`obj.gem.${m.id}.${li}`, gemNode(li, m.color));
    const ic = m.cut === 'rock' ? lump(m.color, m.id.length, darken(m.color, 0.25)) : m.cut === 'crystal' ? gem(m.color, 'shard') : gem(m.color, m.cut);
    atlas.add(`item.${m.id}`, ic, true);
  }
  atlas.add('item.crystalite', gem(0x7ee0e8, 'shard'), true);
  const batt = icon16();
  batt.rect(5, 3, 6, 11, 0xd8f0ff);
  batt.rect(6, 6, 4, 7, P.y1);
  batt.rect(7, 1, 2, 2, P.s3);
  batt.line(8, 7, 7, 10, P.white);
  batt.outline(P.ink);
  atlas.add('item.battery', batt, true);
  GEODES.forEach((g, i) => atlas.add(`item.${g.id}`, geode(g.color, i + 20), true));
  ARTIFACTS.forEach((a, i) => atlas.add(`item.${a.id}`, artifactIcon(a.id, i), true));
  atlas.add('obj.ice', ice());
  atlas.add('obj.box', box());
  atlas.add('obj.ladder', ladder(false));
  atlas.add('obj.ladder.blocked', ladder(true));
  atlas.add('obj.mineChest', mineChest());
  atlas.add('obj.heartstone.0', heartstone(0));
  atlas.add('obj.heartstone.1', heartstone(1));
  const pebble = new PixelCanvas(4, 4).fill(P.s3);
  pebble.set(0, 0, -1); pebble.set(3, 0, -1); pebble.set(0, 3, -1); pebble.set(3, 3, -1);
  atlas.add('fx.pebble', pebble);
  const ring = new PixelCanvas(12, 12);
  for (let a = 0; a < 24; a++) ring.set(6 + Math.round(Math.cos((a / 24) * Math.PI * 2) * 5), 6 + Math.round(Math.sin((a / 24) * Math.PI * 2) * 5), P.white);
  atlas.add('fx.ring', ring);
}
