// The diorama for a world: the ground slab around the beds, five raised wooden garden beds (one per
// lane) whose rich soil alternates light and dark by column so the grid reads at a glance (column
// bands inside framed beds: our own pattern, never a checkered lawn), the gingham picnic blanket and
// basket on the left, the path in on the right through a gap in the world's bushes, decorations,
// and the level's special tiles. The sky, trees and fence behind are the backdrop (backdrop.ts).
import * as THREE from 'three';
import { BOARD_D, BOARD_W, COLS, ENTRY_X, LANES, laneZ, TILE_D } from '../sim/board';
import type { Special } from '../sim/types';
import { ball, box, build, buildOutlined, cone, cyl, softBox, torus, type Piece } from './geo';
import { Materials } from './materials';
import { PROP_OUTLINE } from './models/props';
import type { Theme } from './worlds';

/** Seeded random numbers, so the scenery is the same every time. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GROUND_Y = -0.2;
/** The slab's extent (world units): it ends just behind the back bed, where the backdrop begins. */
export const SLAB = { x0: -3.6, x1: 12.6, z0: -0.4, z1: BOARD_D + 3.2 } as const;
/** How far in from a lane's edges its bed starts (the path between beds is twice this). */
export const BED_INSET = 0.07;
export const BLANKET = { x0: -3.3, x1: -0.12, z0: -0.3, z1: BOARD_D + 0.3 } as const;
export const BASKET_AT = { x: -2.0, z: 2.6 } as const;
export const UMBRELLA_X = -0.42;

type Outlined = { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null };
const mix = (a: number, b: number, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();

function slab(t: Theme): THREE.BufferGeometry {
  const w = SLAB.x1 - SLAB.x0, d = SLAB.z1 - SLAB.z0, h = 1.2;
  return build([{
    geo: new THREE.BoxGeometry(w, h, d, 1, 12, 1),
    at: [(SLAB.x0 + SLAB.x1) / 2, GROUND_Y - h / 2, (SLAB.z0 + SLAB.z1) / 2],
    color: (_x, y) => (y > GROUND_Y - 0.07 ? t.ground : y > GROUND_Y - 0.14 ? t.groundEdge : y > GROUND_Y - 0.7 ? t.side[0] : t.side[1]),
  }]);
}

/** The ground around the beds: grass, a stone floor, sand or cloud, with soft patches. */
function ground(t: Theme): THREE.BufferGeometry {
  const w = SLAB.x1 - SLAB.x0, d = SLAB.z1 - SLAB.z0;
  const g = new THREE.PlaneGeometry(w, d, 48, 28).rotateX(-Math.PI / 2);
  const noise = (x: number, z: number) => Math.sin(x * 0.9 + z * 0.4) * 0.5 + Math.sin(x * 0.31 - z * 1.3) * 0.35 + Math.sin(x * 2.1 + z * 1.7) * 0.15;
  // the greenhouse floor is laid in square stone tiles
  const tiles = (x: number, z: number) => ((Math.floor(x * 1.25) + Math.floor(z * 1.25)) % 2 ? 0 : 0.5);
  return build([{ geo: g, at: [(SLAB.x0 + SLAB.x1) / 2, GROUND_Y + 0.002, (SLAB.z0 + SLAB.z1) / 2], color: (x, _y, z) => mix(t.ground, t.groundLight, t.decor === 'greenhouse' ? tiles(x, z) : Math.max(0, noise(x, z)) * 0.8) }]);
}

/** Five raised beds: wooden frames around soil that alternates light and dark by column. */
function beds(t: Theme): Outlined {
  const pieces: Piece[] = [];
  const h = -GROUND_Y + 0.07, plank = 0.09;
  for (let lane = 0; lane < LANES; lane++) {
    const z0 = lane * TILE_D + BED_INSET, z1 = (lane + 1) * TILE_D - BED_INSET, zc = (z0 + z1) / 2, depth = z1 - z0;
    pieces.push(
      { geo: softBox(BOARD_W + 0.16, h, plank, 0.25, 6), color: t.wood, at: [BOARD_W / 2, GROUND_Y + h / 2, z1 + plank / 2 - 0.02] },
      { geo: softBox(BOARD_W + 0.16, h, plank, 0.25, 6), color: t.woodDark, at: [BOARD_W / 2, GROUND_Y + h / 2, z0 - plank / 2 + 0.02] },
      { geo: softBox(plank, h, depth + plank * 2, 0.25, 6), color: mix(t.wood, t.woodDark, 0.4), at: [-plank / 2 - 0.02, GROUND_Y + h / 2, zc] },
      { geo: softBox(plank, h, depth + plank * 2, 0.25, 6), color: mix(t.wood, t.woodDark, 0.4), at: [BOARD_W + plank / 2 + 0.02, GROUND_Y + h / 2, zc] },
    );
    for (let col = 0; col < COLS; col++) {
      const base = col % 2 ? t.soilDark : t.soilLight;
      pieces.push({ geo: box(1.0, -GROUND_Y, depth), color: (x: number, _y: number, z: number) => mix(base, 0x000000, (Math.sin(x * 9.3 + z * 7.1) + 1) * 0.03), at: [col + 0.5, GROUND_Y / 2 - 0.004, zc], outline: false });
      for (let k = 0; k < 3; k++) pieces.push({ geo: ball(0.035, 6, 4), color: mix(base, 0xffffff, 0.12), at: [col + 0.2 + ((k * 0.37 + lane * 0.21) % 0.6), 0.005, zc - depth * 0.3 + ((k * 0.53 + col * 0.17) % 0.6) * depth], scale: [1, 0.4, 1], outline: false });
    }
  }
  return buildOutlined(pieces, PROP_OUTLINE);
}

/** The gingham blanket, gently rumpled: crisp checks as per-triangle colours (no textures). */
function blanket(): THREE.BufferGeometry {
  const w = BLANKET.x1 - BLANKET.x0, d = BLANKET.z1 - BLANKET.z0, cell = 0.34;
  const g = new THREE.PlaneGeometry(w, d, Math.round(w / cell), Math.round(d / cell)).rotateX(-Math.PI / 2).toNonIndexed();
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) pos.setY(i, Math.sin(pos.getX(i) * 2.3) * Math.sin(pos.getZ(i) * 1.7) * 0.015);
  g.computeVertexNormals();
  const colors = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3 + w / 2, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3 + d / 2;
    const a = Math.floor(cx / cell) % 2, b = Math.floor(cz / cell) % 2;
    c.setHex(a && b ? 0xf0384a : a || b ? 0xff98a4 : 0xfff6e6, THREE.SRGBColorSpace);
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  g.translate((BLANKET.x0 + BLANKET.x1) / 2, GROUND_Y + 0.035, (BLANKET.z0 + BLANKET.z1) / 2);
  return g;
}

/** The picnic basket (the snacks inside are separate: they go one by one). */
function basket(): Outlined {
  const { x, z } = BASKET_AT, y = GROUND_Y + 0.03;
  return buildOutlined([
    { geo: cyl(0.5, 0.44, 0.44, 18), color: (_px, py) => (Math.round((py - y) * 18) % 2 ? 0xdba65e : 0xc48b45), at: [x, y + 0.22, z], scale: [1.25, 1, 0.9] },
    { geo: torus(0.52, 0.04, 6, 22), color: 0xa8692f, at: [x, y + 0.44, z], rot: [Math.PI / 2, 0, 0], scale: [1.25, 0.9, 1] },
    { geo: torus(0.44, 0.04, 6, 18, Math.PI), color: 0xa8692f, at: [x, y + 0.44, z], scale: [1.2, 1, 1] },
  ], PROP_OUTLINE);
}

/** The three snacks in the basket: a sandwich, an apple and a cupcake. */
export function snacks(): Outlined[] {
  const { x, z } = BASKET_AT, y = GROUND_Y + 0.03;
  return [
    buildOutlined([{ geo: cyl(0.17, 0.17, 0.09, 3), color: 0xffe2a0, at: [x - 0.24, y + 0.5, z + 0.05], rot: [Math.PI / 2, 0.3, 0] }, { geo: cyl(0.15, 0.15, 0.03, 3), color: 0x8fe05a, at: [x - 0.24, y + 0.5, z + 0.11], rot: [Math.PI / 2, 0.3, 0], outline: false }], PROP_OUTLINE),
    buildOutlined([{ geo: ball(0.12, 14, 10), color: 0xff4a4a, at: [x + 0.05, y + 0.52, z + 0.08] }, { geo: cyl(0.012, 0.012, 0.07, 4), color: 0x6b3f22, at: [x + 0.05, y + 0.66, z + 0.08], outline: false }], PROP_OUTLINE),
    buildOutlined([{ geo: cyl(0.12, 0.09, 0.12, 12), color: 0xffb6d0, at: [x + 0.32, y + 0.48, z + 0.02] }, { geo: ball(0.12, 12, 8), color: 0xfff6ef, at: [x + 0.32, y + 0.57, z + 0.02], scale: [1, 0.7, 1] }, { geo: ball(0.035, 6, 4), color: 0xff4a4a, at: [x + 0.32, y + 0.67, z + 0.02] }], PROP_OUTLINE),
  ];
}

/** Where critters come in: a worn path per lane through a gap in the world's bushes (or pots, bales, rocks, clouds). */
function entrance(t: Theme): Outlined {
  const pieces: Piece[] = [];
  const bloom = [0xff7eb6, 0xffd23a, 0xffffff, 0xb98cff];
  const bush = (x: number, z: number, r: number, i: number): Piece[] => {
    switch (t.decor) {
      case 'greenhouse': return [{ geo: cyl(r * 0.8, r * 0.6, r * 1.2, 12), color: 0xd9733f, at: [x, GROUND_Y + r * 0.6, z] }, { geo: ball(r * 0.9, 12, 8), color: i % 2 ? 0x46b034 : 0x58c240, at: [x, GROUND_Y + r * 1.5, z] }];
      case 'dusk': return [{ geo: softBox(r * 2.2, r * 1.3, r * 1.6, 0.4), color: 0xe8c460, at: [x, GROUND_Y + r * 0.65, z] }];
      case 'desert': return [{ geo: ball(r, 10, 8), color: i % 2 ? 0xc9a07a : 0xb88a64, at: [x, GROUND_Y + r * 0.5, z], scale: [1.2, 0.8, 1] }];
      case 'cloud': return [{ geo: ball(r, 12, 10), color: 0xffffff, at: [x, GROUND_Y + r * 0.6, z] }, { geo: ball(r * 0.7, 12, 10), color: 0xf4f8ff, at: [x + r * 0.6, GROUND_Y + r * 0.5, z + 0.1] }];
      default: return [{ geo: ball(r, 14, 10), color: i % 2 ? 0x46b034 : 0x58c240, at: [x, GROUND_Y + r * 0.65, z], scale: [1, 0.85, 1] }, ...[0, 1, 2, 3].map((k): Piece => ({ geo: ball(0.05, 6, 4), color: bloom[(k + i) % 4]!, at: [x - 0.18 + k * 0.12, GROUND_Y + r * 1.25 + (k % 2) * 0.05, z + 0.2 - (k % 2) * 0.1], outline: false }))];
    }
  };
  for (let lane = 0; lane <= LANES; lane++) {
    const z = lane * TILE_D;
    pieces.push(...bush(ENTRY_X + 0.2, z, 0.32, lane), ...bush(BOARD_W + 0.62, z, 0.2, lane + 1));
  }
  const path = t.decor === 'greenhouse' ? 0xbfb6a4 : t.decor === 'cloud' ? 0xe8eefa : t.decor === 'desert' ? 0xd9b47a : 0xb98a5a;
  for (let lane = 0; lane < LANES; lane++) {
    pieces.push({ geo: box(ENTRY_X - BOARD_W + 0.3, 0.02, TILE_D * 0.62), color: path, at: [(BOARD_W + ENTRY_X) / 2 + 0.1, GROUND_Y + 0.008, laneZ(lane)], outline: false });
    for (let k = 0; k < 3; k++) pieces.push({ geo: ball(0.13, 10, 6), color: 0xe2d4b4, at: [BOARD_W + 0.35 + k * 0.48, GROUND_Y + 0.02, laneZ(lane) + (k % 2 ? 0.14 : -0.12)], scale: [1, 0.22, 0.8] });
  }
  return buildOutlined(pieces, PROP_OUTLINE);
}

/** Places for decorations: on the ground, away from the beds, blanket and paths in. */
export function decorSpots(count: number, seed: number): { x: number; z: number; r: number; s: number }[] {
  const rand = rng(seed), out: { x: number; z: number; r: number; s: number }[] = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const x = SLAB.x0 + 0.2 + rand() * (SLAB.x1 - SLAB.x0 - 0.4), z = SLAB.z0 + 0.1 + rand() * (SLAB.z1 - SLAB.z0 - 0.2);
    const onBeds = x > -0.25 && x < BOARD_W + 0.25 && z > -0.1 && z < BOARD_D + 0.1;
    const onBlanket = x > BLANKET.x0 - 0.1 && x < BLANKET.x1 + 0.1 && z > BLANKET.z0 - 0.1 && z < BLANKET.z1 + 0.1;
    const onPath = x > BOARD_W + 0.2 && x < ENTRY_X + 0.6 && z > -0.2 && z < BOARD_D + 0.2;
    if (onBeds || onBlanket || onPath) continue;
    out.push({ x, z, r: rand() * Math.PI * 2, s: 0.8 + rand() * 0.6 });
  }
  return out;
}

/** The static part of a world's garden: a few big meshes (outlined props get a hull mesh each). */
export function buildGarden(t: Theme): THREE.Group {
  const group = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; group.add(m); return m; };
  const outlined = ({ geo, hull }: Outlined) => {
    const m = add(geo, Materials.toon);
    m.castShadow = true;
    if (hull) group.add(new THREE.Mesh(hull, Materials.outline));
  };
  add(slab(t), Materials.ground);
  add(ground(t), Materials.ground);
  outlined(beds(t));
  add(blanket(), Materials.toon);
  outlined(basket());
  outlined(entrance(t));
  return group;
}

/** The level's special tiles, drawn over the soil. */
export function buildSpecials(specials: Record<string, Special> | undefined): THREE.Group {
  const group = new THREE.Group();
  const pieces: Piece[] = [], soft: Piece[] = [];
  for (const [key, sp] of Object.entries(specials ?? {})) {
    const [lane, col] = key.split(',').map(Number) as [number, number];
    const x = col + 0.5, z = laneZ(lane), d = TILE_D - BED_INSET * 2;
    switch (sp) {
      case 'water':
        soft.push({ geo: box(1.0, 0.03, d - 0.02), color: (px: number, _y: number, pz: number) => mix(0x4fb8e8, 0x8fdcff, (Math.sin(px * 11 + pz * 7) + 1) / 2), at: [x, 0.005, z] });
        pieces.push({ geo: torus(0.18, 0.015, 4, 16), color: 0xd8f4ff, at: [x - 0.2, 0.025, z + 0.1], rot: [Math.PI / 2, 0, 0] }, { geo: torus(0.12, 0.012, 4, 14), color: 0xd8f4ff, at: [x + 0.25, 0.025, z - 0.15], rot: [Math.PI / 2, 0, 0] });
        break;
      case 'sprinkler':
        pieces.push({ geo: cyl(0.05, 0.06, 0.12, 8), color: 0xd8a84a, at: [x + 0.32, 0.06, z - 0.32] }, { geo: ball(0.05, 8, 6), color: 0xe8c060, at: [x + 0.32, 0.14, z - 0.32] });
        for (let k = 0; k < 5; k++) soft.push({ geo: ball(0.03, 6, 4), color: 0x8fdcff, at: [x + 0.32 + Math.cos(k * 1.3) * 0.16, 0.18 + (k % 2) * 0.05, z - 0.32 + Math.sin(k * 1.3) * 0.16] });
        break;
      case 'hot':
        soft.push({ geo: box(0.96, 0.012, d - 0.04), color: (px: number, _y: number, pz: number) => mix(0xd8603a, 0xf09050, (Math.sin(px * 13) * Math.sin(pz * 11) + 1) / 2), at: [x, 0.002, z] });
        for (let k = 0; k < 3; k++) pieces.push({ geo: torus(0.08, 0.012, 4, 10, Math.PI), color: 0xffd0a0, at: [x - 0.25 + k * 0.25, 0.12 + (k % 2) * 0.05, z], rot: [0, 0, k % 2 ? 0 : Math.PI] });
        break;
      case 'gap':
        soft.push({ geo: box(0.98, 0.03, d - 0.02), color: (px: number, _y: number, pz: number) => mix(0x8fc8ff, 0xd8ecff, (Math.sin(px * 5 + pz * 3) + 1) / 2), at: [x, 0.006, z] });
        pieces.push({ geo: ball(0.16, 10, 8), color: 0xffffff, at: [x - 0.18, 0.03, z + 0.1], scale: [1.4, 0.3, 1] }, { geo: ball(0.12, 10, 8), color: 0xffffff, at: [x + 0.22, 0.03, z - 0.12], scale: [1.4, 0.3, 1] });
        break;
      case 'updraft':
        for (let k = 0; k < 3; k++) pieces.push({ geo: torus(0.26 - k * 0.06, 0.018, 4, 18), color: 0xc8ecff, at: [x, 0.05 + k * 0.18, z], rot: [Math.PI / 2, 0, 0] });
        break;
      case 'lantern':
        pieces.push({ geo: cyl(0.025, 0.03, 0.9, 6), color: 0x5a3a22, at: [x - 0.34, 0.45, z - 0.3] }, { geo: cyl(0.16, 0.025, 0.025, 6), color: 0x5a3a22, at: [x - 0.26, 0.9, z - 0.3], rot: [0, 0, Math.PI / 2] });
        soft.push({ geo: ball(0.11, 12, 10), color: 0xffe08a, at: [x - 0.18, 0.78, z - 0.3] });
        break;
    }
  }
  if (pieces.length) { const o = buildOutlined(pieces, PROP_OUTLINE); group.add(new THREE.Mesh(o.geo, Materials.toon)); if (o.hull) group.add(new THREE.Mesh(o.hull, Materials.outline)); }
  if (soft.length) group.add(new THREE.Mesh(build(soft), Materials.basic));
  return group;
}

/** A decoration for each world (drawn many times around the garden). */
export function decorGeometry(t: Theme): { a: Outlined; b: Outlined; aCount: number; bCount: number } {
  const flower = (petal: number) => buildOutlined([
    { geo: cyl(0.01, 0.012, 0.26, 4), color: 0x4f9e2c, at: [0, 0.13, 0], outline: false },
    ...Array.from({ length: 6 }, (_, i): Piece => { const a = (i / 6) * Math.PI * 2; return { geo: ball(0.05, 8, 6), color: petal, at: [Math.cos(a) * 0.06, 0.26, Math.sin(a) * 0.06], scale: [1.25, 0.4, 0.85], rot: [0, -a, 0] }; }),
    { geo: ball(0.035, 8, 6), color: 0xffd23a, at: [0, 0.28, 0], outline: false },
  ], PROP_OUTLINE);
  const tuft = buildOutlined([
    { geo: cone(0.045, 0.26, 4), color: t.ground, at: [0, 0.12, 0], rot: [0.1, 0, 0.15] },
    { geo: cone(0.04, 0.2, 4), color: t.groundLight, at: [0.05, 0.09, 0.02], rot: [0, 0, -0.4] },
    { geo: cone(0.04, 0.2, 4), color: t.groundEdge, at: [-0.05, 0.09, -0.01], rot: [-0.2, 0, 0.45] },
  ], 0);
  switch (t.decor) {
    case 'greenhouse': return { a: buildOutlined([{ geo: cyl(0.14, 0.1, 0.2, 10), color: 0xd9733f, at: [0, 0.1, 0] }, { geo: ball(0.14, 10, 8), color: 0x58c240, at: [0, 0.28, 0] }], PROP_OUTLINE), b: flower(0xffffff), aCount: 40, bCount: 30 };
    case 'dusk': return { a: buildOutlined([{ geo: ball(0.2, 14, 10), color: 0xff9a3a, at: [0, 0.14, 0], scale: [1.2, 0.8, 1.1] }, { geo: cyl(0.02, 0.025, 0.08, 5), color: 0x5fb33a, at: [0, 0.3, 0] }], PROP_OUTLINE), b: tuft, aCount: 40, bCount: 120 };
    case 'desert': return { a: buildOutlined([{ geo: capsule2(0.08, 0.3), color: 0x5fb87a, at: [0, 0.22, 0] }, { geo: capsule2(0.05, 0.14), color: 0x5fb87a, at: [0.1, 0.26, 0], rot: [0, 0, -0.9] }], PROP_OUTLINE), b: buildOutlined([{ geo: ball(0.1, 8, 6), color: 0xc9a07a, at: [0, 0.04, 0], scale: [1.3, 0.6, 1] }], PROP_OUTLINE), aCount: 30, bCount: 60 };
    case 'cloud': return { a: buildOutlined([{ geo: ball(0.2, 12, 10), color: 0xffffff, at: [0, 0.08, 0], scale: [1.4, 0.6, 1] }], PROP_OUTLINE), b: flower(0xffb6d0), aCount: 40, bCount: 50 };
    default: return { a: tuft, b: flower(0xffffff), aCount: 150, bCount: 60 };
  }
}
const capsule2 = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 3, 8);

export const laneUmbrellaZ = (lane: number) => laneZ(lane) - 0.3;
