// The Meadow Picnic diorama: a lush grassy slab, five raised wooden garden beds (one per lane) whose
// rich soil alternates light and dark by column, so the grid reads at a glance (column bands inside
// framed beds: our own pattern, never a checkered lawn), the gingham picnic blanket and basket on the
// left, and flowering bushes with gaps on the right where critters come in. The sky, trees and
// woven fence behind the beds are the screen-space backdrop (backdrop.ts). Built once per world.
import * as THREE from 'three';
import { BOARD_D, BOARD_W, COLS, ENTRY_X, LANES, laneZ, TILE_D } from '../sim/board';
import { ball, box, buildOutlined, cyl, softBox, torus, type Piece } from './geo';
import { Materials } from './materials';
import { PALETTE } from './palette';
import { PROP_OUTLINE } from './models/props';

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
/** How far in from a lane's edges its bed starts (the grass path between beds is twice this). */
export const BED_INSET = 0.07;
export const BLANKET = { x0: -3.3, x1: -0.12, z0: -0.3, z1: BOARD_D + 0.3 } as const;
export const BASKET_AT = { x: -2.0, z: 2.6 } as const;
export const UMBRELLA_X = -0.42;

const mix = (a: number, b: number, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();

/** The slab: lush grass on top, rich soil down the sides. */
function slab(): THREE.BufferGeometry {
  const w = SLAB.x1 - SLAB.x0, d = SLAB.z1 - SLAB.z0, h = 1.2;
  return buildOutlined([{
    geo: new THREE.BoxGeometry(w, h, d, 1, 12, 1),
    at: [(SLAB.x0 + SLAB.x1) / 2, GROUND_Y - h / 2, (SLAB.z0 + SLAB.z1) / 2],
    color: (_x, y) => (y > GROUND_Y - 0.07 ? PALETTE.grass : y > GROUND_Y - 0.14 ? PALETTE.grassDark : y > GROUND_Y - 0.7 ? 0x8a5432 : 0x6e4024),
  }], 0).geo;
}

/** The grass top, with lighter and darker patches. */
function lawn(): THREE.BufferGeometry {
  const w = SLAB.x1 - SLAB.x0, d = SLAB.z1 - SLAB.z0;
  const g = new THREE.PlaneGeometry(w, d, 40, 24).rotateX(-Math.PI / 2);
  const noise = (x: number, z: number) => Math.sin(x * 0.9 + z * 0.4) * 0.5 + Math.sin(x * 0.31 - z * 1.3) * 0.35 + Math.sin(x * 2.1 + z * 1.7) * 0.15;
  return buildOutlined([{ geo: g, at: [(SLAB.x0 + SLAB.x1) / 2, GROUND_Y + 0.002, (SLAB.z0 + SLAB.z1) / 2], color: (x, _y, z) => mix(PALETTE.grass, PALETTE.grassLight, Math.max(0, noise(x, z)) * 0.8) }], 0).geo;
}

/** Five raised beds: honey-wood frames around soil that alternates light and dark by column. */
function beds(): { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null } {
  const pieces: Piece[] = [];
  const h = -GROUND_Y + 0.07, plank = 0.09;
  for (let lane = 0; lane < LANES; lane++) {
    const z0 = lane * TILE_D + BED_INSET, z1 = (lane + 1) * TILE_D - BED_INSET, zc = (z0 + z1) / 2, depth = z1 - z0;
    pieces.push(
      { geo: softBox(BOARD_W + 0.16, h, plank, 0.25, 6), color: PALETTE.wood, at: [BOARD_W / 2, GROUND_Y + h / 2, z1 + plank / 2 - 0.02] },
      { geo: softBox(BOARD_W + 0.16, h, plank, 0.25, 6), color: PALETTE.woodDark, at: [BOARD_W / 2, GROUND_Y + h / 2, z0 - plank / 2 + 0.02] },
      { geo: softBox(plank, h, depth + plank * 2, 0.25, 6), color: mix(PALETTE.wood, PALETTE.woodDark, 0.4), at: [-plank / 2 - 0.02, GROUND_Y + h / 2, zc] },
      { geo: softBox(plank, h, depth + plank * 2, 0.25, 6), color: mix(PALETTE.wood, PALETTE.woodDark, 0.4), at: [BOARD_W + plank / 2 + 0.02, GROUND_Y + h / 2, zc] },
    );
    for (let col = 0; col < COLS; col++) {
      const base = col % 2 ? PALETTE.soilDark : PALETTE.soilLight;
      pieces.push({ geo: box(1.0, -GROUND_Y, depth), color: (x: number, _y: number, z: number) => mix(base, 0x000000, (Math.sin(x * 9.3 + z * 7.1) + 1) * 0.03), at: [col + 0.5, GROUND_Y / 2 - 0.004, zc], outline: false });
      // a few soft crumbs on top, so the soil reads as soil
      for (let k = 0; k < 3; k++) pieces.push({ geo: ball(0.035, 6, 4), color: mix(base, 0xffffff, 0.12), at: [col + 0.2 + ((k * 0.37 + lane * 0.21) % 0.6), 0.005, zc - depth * 0.3 + ((k * 0.53 + col * 0.17) % 0.6) * depth], scale: [1, 0.4, 1], outline: false });
    }
  }
  return buildOutlined(pieces, PROP_OUTLINE);
}

/** The gingham blanket, gently rumpled: crisp checks as per-triangle colours (no textures). */
function blanket(): THREE.BufferGeometry {
  const w = BLANKET.x1 - BLANKET.x0, d = BLANKET.z1 - BLANKET.z0, cell = 0.34;
  const nx = Math.round(w / cell), nz = Math.round(d / cell);
  const g = new THREE.PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2).toNonIndexed();
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) pos.setY(i, Math.sin(pos.getX(i) * 2.3) * Math.sin(pos.getZ(i) * 1.7) * 0.015);
  g.computeVertexNormals();
  const colors = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let t = 0; t < pos.count; t += 3) {
    const cx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3 + w / 2, cz = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3 + d / 2;
    const a = Math.floor(cx / cell) % 2, b = Math.floor(cz / cell) % 2;
    c.setHex(a && b ? 0xf0384a : a || b ? 0xff98a4 : 0xfff6e6, THREE.SRGBColorSpace);
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (t + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  g.translate((BLANKET.x0 + BLANKET.x1) / 2, GROUND_Y + 0.035, (BLANKET.z0 + BLANKET.z1) / 2);
  return g;
}

/** The picnic basket with the three snacks peeking out: a sandwich, an apple and a cupcake. */
function basket(): { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null } {
  const { x, z } = BASKET_AT, y = GROUND_Y + 0.03;
  return buildOutlined([
    { geo: cyl(0.5, 0.44, 0.44, 18), color: (_px, py) => (Math.round((py - y) * 18) % 2 ? 0xdba65e : 0xc48b45), at: [x, y + 0.22, z], scale: [1.25, 1, 0.9] },
    { geo: torus(0.52, 0.04, 6, 22), color: 0xa8692f, at: [x, y + 0.44, z], rot: [Math.PI / 2, 0, 0], scale: [1.25, 0.9, 1] },
    { geo: torus(0.44, 0.04, 6, 18, Math.PI), color: 0xa8692f, at: [x, y + 0.44, z], scale: [1.2, 1, 1] },
    { geo: cyl(0.17, 0.17, 0.09, 3), color: 0xffe2a0, at: [x - 0.24, y + 0.5, z + 0.05], rot: [Math.PI / 2, 0.3, 0] },
    { geo: cyl(0.15, 0.15, 0.03, 3), color: 0x8fe05a, at: [x - 0.24, y + 0.5, z + 0.11], rot: [Math.PI / 2, 0.3, 0], outline: false },
    { geo: ball(0.12, 14, 10), color: 0xff4a4a, at: [x + 0.05, y + 0.52, z + 0.08] },
    { geo: cyl(0.012, 0.012, 0.07, 4), color: 0x6b3f22, at: [x + 0.05, y + 0.66, z + 0.08], outline: false },
    { geo: cyl(0.12, 0.09, 0.12, 12), color: 0xffb6d0, at: [x + 0.32, y + 0.48, z + 0.02] },
    { geo: ball(0.12, 12, 8), color: 0xfff6ef, at: [x + 0.32, y + 0.57, z + 0.02], scale: [1, 0.7, 1] },
    { geo: ball(0.035, 6, 4), color: 0xff4a4a, at: [x + 0.32, y + 0.67, z + 0.02] },
  ], PROP_OUTLINE);
}

/**
 * On the right, the path in: a worn dirt path for each lane from a gap in a row of round flowering
 * bushes to the end of its bed, so critters are seen coming before they reach the beds.
 */
function entrance(): { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null } {
  const pieces: Piece[] = [];
  const bloom = [0xff7eb6, 0xffd23a, 0xffffff, 0xb98cff];
  for (let lane = 0; lane <= LANES; lane++) {
    const z = lane * TILE_D;
    // a bush between every two lanes at the gate, and a smaller one halfway along the path
    pieces.push({ geo: ball(0.32, 14, 10), color: lane % 2 ? 0x46b034 : 0x58c240, at: [ENTRY_X + 0.2, GROUND_Y + 0.2, z], scale: [1, 0.85, 1] });
    pieces.push({ geo: ball(0.2, 12, 8), color: lane % 2 ? 0x58c240 : 0x46b034, at: [BOARD_W + 0.62, GROUND_Y + 0.12, z], scale: [1, 0.8, 1] });
    for (let k = 0; k < 4; k++) pieces.push({ geo: ball(0.05, 6, 4), color: bloom[(k + lane) % 4]!, at: [ENTRY_X + 0.02 + k * 0.12, GROUND_Y + 0.4 + (k % 2) * 0.05, z + 0.2 - (k % 2) * 0.1], outline: false });
  }
  for (let lane = 0; lane < LANES; lane++) {
    // the worn path: a strip of packed earth with a few flat stepping stones
    pieces.push({ geo: box(ENTRY_X - BOARD_W + 0.3, 0.02, TILE_D * 0.62), color: 0xb98a5a, at: [(BOARD_W + ENTRY_X) / 2 + 0.1, GROUND_Y + 0.008, laneZ(lane)], outline: false });
    for (let k = 0; k < 3; k++) pieces.push({ geo: ball(0.13, 10, 6), color: 0xe2d4b4, at: [BOARD_W + 0.35 + k * 0.48, GROUND_Y + 0.02, laneZ(lane) + (k % 2 ? 0.14 : -0.12)], scale: [1, 0.22, 0.8] });
  }
  return buildOutlined(pieces, PROP_OUTLINE);
}

/** Places for grass tufts and flowers: on the grass, away from the beds, blanket and paths in. */
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

/** The static part of the garden, as a few big meshes (outlined props get a hull mesh each). */
export function buildGarden(): THREE.Group {
  const group = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; group.add(m); return m; };
  const outlined = ({ geo, hull }: { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null }) => {
    const m = add(geo, Materials.toon);
    m.castShadow = true;
    if (hull) group.add(new THREE.Mesh(hull, Materials.outline));
  };
  add(slab(), Materials.ground);
  add(lawn(), Materials.ground);
  outlined(beds());
  add(blanket(), Materials.toon);
  outlined(basket());
  outlined(entrance());
  return group;
}

export const laneUmbrellaZ = (lane: number) => laneZ(lane) - 0.3;
