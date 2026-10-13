/**
 * Props: things that stand on the ground and are drawn depth-sorted with characters. Each returns a
 * PixelCanvas anchored at its bottom-centre (trees and buildings overhang upward).
 */
import { hash32, Rng } from '../core/rng';
import { P } from './palette';
import { darken, lighten, mix, PixelCanvas } from './pixelcanvas';

export type TreeKind = 'round' | 'pine' | 'snowpine' | 'palm' | 'blossom' | 'autumn' | 'crystal';

export function tree(kind: TreeKind, seed = 0): PixelCanvas {
  const c = new PixelCanvas(24, 32);
  const rng = new Rng(hash32(seed, 77));
  if (kind === 'palm') {
    for (let y = 12; y < 31; y++) c.rect(11 + Math.round(Math.sin(y * 0.25) * 1.5), y, 3, 1, (y % 3 === 0) ? darken(P.trunk, 0.2) : P.trunk);
    for (const [dx, dy] of [[-9, 4], [9, 3], [-7, -2], [7, -3], [0, -5]] as const) c.poly([[12, 11], [12 + dx, 11 + dy], [12 + dx * 0.6, 13 + dy]], P.leaf);
    c.circle(11, 13, 2, 0x8a6a3a).circle(14, 13, 2, 0x8a6a3a);
  } else if (kind === 'pine' || kind === 'snowpine') {
    c.rect(10, 26, 4, 5, P.trunk);
    const g = kind === 'snowpine' ? 0x3f7a5a : P.leafDark;
    for (const [y, w] of [[3, 4], [8, 7], [13, 9], [18, 11]] as const) c.poly([[12, y - 4], [12 + w, y + 8], [12 - w, y + 8]], g);
    if (kind === 'snowpine') for (const [y, w] of [[3, 4], [8, 7], [13, 9], [18, 11]] as const) c.poly([[12, y - 4], [12 + w * 0.6, y + 2], [12 - w * 0.6, y + 2]], P.snow2);
    else c.poly([[12, -1], [15, 7], [9, 7]], P.leaf);
  } else {
    c.rect(10, 22, 4, 9, P.trunk).rect(9, 29, 6, 2, darken(P.trunk, 0.15));
    const leaf = kind === 'blossom' ? 0xffb0d0 : kind === 'autumn' ? 0xf08a4b : kind === 'crystal' ? 0xb8a0ff : P.leaf;
    const dark = kind === 'blossom' ? 0xe888b0 : kind === 'autumn' ? 0xc0582a : kind === 'crystal' ? 0x8f70e0 : P.leafDark;
    c.circle(12, 14, 10, dark);
    c.circle(8, 11, 6, leaf).circle(15, 9, 6.5, leaf).circle(12, 16, 7, leaf).circle(17, 15, 5, leaf).circle(6, 16, 4.5, leaf);
    for (let i = 0; i < 6; i++) c.set(5 + rng.int(14), 5 + rng.int(12), lighten(leaf, 0.35));
    if (kind === 'round' && rng.chance(0.4)) for (let i = 0; i < 3; i++) c.circle(6 + rng.int(12), 9 + rng.int(9), 1, P.flowerRed);
  }
  return c.outline(P.ink, true);
}

export function bush(seed = 0, berries = false): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.circle(5, 10, 4.5, P.leafDark).circle(11, 10, 4.5, P.leafDark).circle(8, 8, 5, P.leaf).circle(5, 10, 3.5, P.leaf).circle(11, 11, 3.5, P.leaf);
  c.set(6, 6, P.leafLight).set(10, 7, P.leafLight);
  if (berries) for (const [x, y] of [[5, 9], [10, 8], [8, 12]] as const) c.set(x, y, 0xe0405a).set(x + 1, y, 0xff6b8a);
  void seed;
  return c.outline(P.ink, true);
}

export function rock(seed = 0, snowy = false): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const rng = new Rng(hash32(seed, 5));
  c.ellipse(8, 10, 6.5 + rng.next(), 5, P.r2);
  c.ellipse(7, 8, 4, 3, P.r3);
  c.set(6, 7, P.r4).set(11, 12, P.r1);
  if (snowy) c.ellipse(7, 6, 4, 1.5, P.snow2);
  return c.outline(P.ink, true);
}

/** A big round boulder that a Stone friend can shove. */
export function boulder(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.circle(8, 8.5, 7, 0x9a8a7a).circle(7, 7, 5, 0xb4a490).circle(6, 5, 2, 0xd0c4b4);
  c.line(9, 9, 12, 12, 0x7a6a5a).line(4, 11, 6, 10, 0x7a6a5a);
  return c.outline(P.ink, true);
}

/** Thick vines a Leaf friend can snip. */
export function vines(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  for (const x of [2, 6, 10, 14]) for (let y = 0; y < 16; y++) c.set(x + Math.round(Math.sin(y * 0.6 + x) * 1.2), y, y % 5 === 0 ? P.leafLight : P.leafDark);
  for (const [x, y] of [[3, 3], [9, 6], [13, 11], [5, 12], [11, 1]] as const) c.ellipse(x, y, 1.8, 1.2, P.leaf);
  return c.outline(P.ink, true);
}

/** An ice wall a Flare friend can melt. */
export function iceWall(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.poly([[1, 15], [2, 3], [6, 0], [11, 1], [15, 4], [15, 15]], P.ice1);
  c.poly([[3, 13], [4, 4], [7, 2], [8, 13]], P.ice2).line(10, 3, 12, 12, P.ice3).set(5, 3, P.white);
  return c.outline(darken(P.ice0, 0.3));
}

/** An old machine (lift or door motor) a Volt friend can power up. */
export function machine(on: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(1, 3, 14, 12, 0x7a8090).rect(2, 4, 12, 4, 0x9aa0b0).rect(5, 9, 6, 4, 0x4a5060);
  c.circle(8, 11, 1.5, on ? 0xfff07a : 0x6a6050);
  c.rect(3, 5, 2, 2, on ? 0x7ff07a : 0x506050).rect(11, 5, 2, 2, on ? 0xfff07a : 0x605a40);
  return c.outline(P.ink, true);
}

export function sign(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(7, 9, 2, 6, P.wood1).rect(2, 2, 12, 8, P.wood3).hline(3, 12, 2, P.wood4);
  c.hline(4, 11, 5, P.wood1).hline(4, 9, 7, P.wood1);
  return c.outline(P.ink, true);
}

export function fence(kind: 'h' | 'v' | 'post'): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  if (kind !== 'v') c.rect(0, 6, 16, 2, P.wood3).rect(0, 10, 16, 2, P.wood2);
  if (kind === 'v') c.rect(6, 0, 2, 16, P.wood3).rect(9, 0, 2, 16, P.wood2);
  c.rect(1, 4, 3, 10, P.wood2).rect(1, 4, 3, 1, P.wood4);
  if (kind === 'h') c.rect(12, 4, 3, 10, P.wood2).rect(12, 4, 3, 1, P.wood4);
  return c.outline(P.ink, true);
}

export function lamp(): PixelCanvas {
  const c = new PixelCanvas(16, 32);
  c.rect(7, 8, 2, 23, 0x4a4a5a).rect(5, 29, 6, 2, 0x4a4a5a);
  c.rect(4, 2, 8, 7, 0x4a4a5a).rect(5, 3, 6, 5, P.beaconGlow).rect(6, 0, 4, 2, 0x4a4a5a);
  return c.outline(P.ink, true);
}

export interface HouseStyle { roof: number; wall: number; door?: number; trim?: number }

/**
 * A house `w` tiles wide and `h` tiles tall (the footprint), with a roof above. The door sits on
 * the bottom row at `doorX` (tile column within the house). `kind` adds a sign above the door.
 */
export function house(w: number, h: number, style: HouseStyle, doorX: number, kind: 'home' | 'rest' | 'shop' | 'academy' | 'club' = 'home'): PixelCanvas {
  const W = w * 16, H = h * 16 + 12;
  const c = new PixelCanvas(W, H);
  const wallTop = Math.floor(H * 0.42);
  const wall = style.wall, roof = style.roof, trim = style.trim ?? P.white;
  // walls
  c.rect(1, wallTop, W - 2, H - wallTop, wall);
  c.rect(1, H - 3, W - 2, 3, darken(wall, 0.12));
  // roof with shingle rows
  c.poly([[-1, wallTop + 2], [W / 2, 0], [W + 1, wallTop + 2]], roof);
  for (let y = 4; y < wallTop; y += 4) for (let x = 0; x < W; x += 6) c.paint(x + ((y / 4) % 2) * 3, y, darken(roof, 0.18));
  c.line(-1, wallTop + 2, W / 2, 0, lighten(roof, 0.25));
  c.rect(0, wallTop + 1, W, 2, darken(roof, 0.25));
  if (kind === 'home' && w >= 3) c.rect(W - 14, 2, 5, 9, darken(wall, 0.3)).rect(W - 15, 1, 7, 2, darken(wall, 0.4));
  // windows
  for (let i = 0; i < w; i++) {
    if (i === doorX) continue;
    const x = i * 16 + 4, y = wallTop + 6;
    c.rect(x, y, 8, 7, trim).rect(x + 1, y + 1, 6, 5, 0x8fc8f0).rect(x + 1, y + 1, 2, 2, 0xd8f0ff).vline(x + 4, y + 1, y + 5, trim);
  }
  // door
  const dx = doorX * 16 + 3;
  c.rect(dx, H - 15, 10, 15, style.door ?? P.wood1).rect(dx + 1, H - 14, 8, 1, lighten(style.door ?? P.wood1, 0.2)).set(dx + 7, H - 8, P.beacon);
  // signs
  const sx = doorX * 16 + 8;
  if (kind === 'rest') {
    // a heart-and-leaf sign: a Rest Stop (no hospital cross)
    c.circle(sx - 2, wallTop - 3, 2.5, 0xff6b8a).circle(sx + 2, wallTop - 3, 2.5, 0xff6b8a).poly([[sx - 4.5, wallTop - 2], [sx + 4.5, wallTop - 2], [sx, wallTop + 3]], 0xff6b8a);
    c.ellipse(sx + 5, wallTop - 6, 2.5, 1.2, P.leaf);
  } else if (kind === 'shop') {
    for (let x = 0; x < W; x += 4) c.rect(x, wallTop + 2, 4, 3, (x / 4) % 2 ? P.white : 0x4fa66a);
    c.circle(sx, wallTop - 4, 3, P.wood3).circle(sx, wallTop - 4, 1.5, 0xff8fc0);
  } else if (kind === 'academy') {
    c.rect(W / 2 - 1, -8, 2, 10, 0x6a6a7a).rect(W / 2 + 1, -8, 8, 5, P.beacon);
    c.circle(sx, wallTop - 5, 3.5, P.beacon).circle(sx, wallTop - 5, 2, P.beaconGlow);
  } else if (kind === 'club') {
    for (let x = 0; x < W; x += 4) c.rect(x, wallTop + 2, 4, 3, (x / 4) % 2 ? 0xffd2f0 : 0x9a5fb8);
    c.poly([[sx, wallTop - 9], [sx + 2, wallTop - 4], [sx + 7, wallTop - 4], [sx + 3, wallTop - 1], [sx + 4, wallTop + 3], [sx, wallTop + 1], [sx - 4, wallTop + 3], [sx - 3, wallTop - 1], [sx - 7, wallTop - 4], [sx - 2, wallTop - 4]], 0xffd84a);
  }
  return c.outline(P.ink, true);
}

export function lighthouse(lit: boolean): PixelCanvas {
  const c = new PixelCanvas(32, 64);
  c.poly([[8, 63], [11, 14], [21, 14], [24, 63]], P.white);
  for (const y of [22, 38, 54]) c.paintPoly([[0, y], [32, y], [32, y + 7], [0, y + 7]], 0xd9604f);
  c.rect(9, 10, 14, 5, 0x4a4a5a).rect(11, 4, 10, 7, lit ? P.beaconGlow : 0x8a8aa0).rect(10, 1, 12, 3, 0xd9604f);
  c.rect(13, 50, 6, 13, P.wood1);
  if (lit) c.circle(16, 7, 2.5, P.white);
  return c.outline(P.ink, true);
}

/** A Beacon: a stone pillar with a big crystal that glows when relit (dim and foggy when not). */
export function beacon(lit: boolean): PixelCanvas {
  const c = new PixelCanvas(32, 48);
  c.poly([[8, 47], [10, 20], [22, 20], [24, 47]], P.r3).rect(6, 44, 20, 4, P.r2).rect(8, 18, 16, 3, P.r2);
  for (const y of [26, 34, 41]) c.hline(10, 22, y, P.r2);
  const glass = lit ? P.beacon : P.fog;
  c.poly([[16, 0], [24, 9], [16, 19], [8, 9]], glass);
  c.poly([[16, 0], [16, 19], [8, 9]], lit ? P.beaconGlow : mix(P.fog, P.white, 0.25));
  if (lit) c.set(13, 6, P.white).set(14, 5, P.white);
  return c.outline(P.ink, true);
}

/** The Showcase Club's lure tower: a striped mast with a speaker dish (it makes the static fog). */
export function lureTower(on: boolean): PixelCanvas {
  const c = new PixelCanvas(24, 48);
  for (let y = 10; y < 46; y++) c.rect(10, y, 4, 1, (y >> 2) % 2 ? 0x9a5fb8 : 0xffd2f0);
  c.rect(6, 44, 12, 4, 0x6a6a7a);
  c.ellipse(12, 7, 9, 5, 0xc8c8d8).ellipse(12, 7, 6, 3, 0x9a9ab0).circle(12, 7, 1.5, on ? 0xff6bd0 : 0x6a6a7a);
  return c.outline(P.ink, true);
}

export function caveMouth(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.ellipse(16, 20, 15, 14, P.r2).ellipse(16, 22, 9, 11, P.dark).rect(7, 22, 18, 10, P.dark);
  c.set(9, 10, P.r4).set(20, 8, P.r4);
  return c.outline(P.ink, true);
}

export function stairsDown(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  for (let i = 0; i < 4; i++) c.rect(1 + i, 2 + i * 3, 14 - i * 2, 3, i % 2 ? P.r1 : P.r2);
  return c.outline(P.ink, true);
}

export function bench(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(1, 7, 14, 3, P.wood3).rect(1, 4, 14, 2, P.wood2).rect(2, 10, 2, 4, P.wood1).rect(12, 10, 2, 4, P.wood1);
  return c.outline(P.ink, true);
}

export function flowerPot(seed = 0): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const col = [P.flowerPink, P.flowerYellow, P.flowerRed, P.flowerBlue][hash32(seed) % 4]!;
  c.rect(4, 10, 8, 5, 0xc0704a).rect(3, 9, 10, 2, 0xd8885a);
  c.circle(6, 6, 2, col).circle(10, 5, 2, col).circle(8, 8, 1.5, P.leaf);
  return c.outline(P.ink, true);
}

export function crate(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(1, 3, 14, 12, P.wood3).rect(1, 3, 14, 2, P.wood4).line(2, 5, 13, 14, P.wood1).line(13, 5, 2, 14, P.wood1);
  return c.outline(P.ink, true);
}
