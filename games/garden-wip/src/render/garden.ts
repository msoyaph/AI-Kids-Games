// The Meadow Picnic diorama: a grassy slab with soil sides, five raised wooden garden beds (one per
// lane, nine planting spots each), the gingham picnic blanket and basket on the left, a low fence with
// gaps on the right where critters come in, and hedges, trees and flowers around. Built once per
// world. The board is raised beds of soil, never a checkered lawn (IP log).
import * as THREE from 'three';
import { BOARD_W, COLS, LANES, laneZ, TILE_D } from '../sim/board';
import { ball, box, build, cone, cyl, softBox, torus, type Piece } from './geo';
import { Materials } from './materials';

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

export const GROUND_Y = -0.18;
/** The slab's extent (world units). */
export const SLAB = { x0: -3.6, x1: 12.4, z0: -2.8, z1: 8.9 } as const;
/** How far in from a lane's edges its bed starts (the grass path between beds is twice this). */
export const BED_INSET = 0.09;
export const BLANKET = { x0: -3.3, x1: -0.12, z0: -0.5, z1: LANES * TILE_D + 0.4 } as const;
export const BASKET_AT = { x: -2.0, z: 2.9 } as const;
export const UMBRELLA_X = -0.5;

const mix = (a: number, b: number, t: number) => {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return ca.lerp(cb, t).getHex();
};

/** The slab: grass on top, soil layers down the sides. */
function slab(): THREE.BufferGeometry {
  const w = SLAB.x1 - SLAB.x0, d = SLAB.z1 - SLAB.z0, h = 1.0;
  const g = new THREE.BoxGeometry(w, h, d, 1, 10, 1);
  return build([{
    geo: g,
    at: [(SLAB.x0 + SLAB.x1) / 2, GROUND_Y - h / 2, (SLAB.z0 + SLAB.z1) / 2],
    color: (_x, y) => (y > GROUND_Y - 0.06 ? 0x6fb556 : y > GROUND_Y - 0.12 ? 0x4f8c3c : y > GROUND_Y - 0.55 ? 0x8a6142 : y > GROUND_Y - 0.62 ? 0x7a5338 : 0x6a4730),
  }]);
}

/** The grass top, softly patchy. */
function lawn(): THREE.BufferGeometry {
  const w = SLAB.x1 - SLAB.x0, d = SLAB.z1 - SLAB.z0;
  const g = new THREE.PlaneGeometry(w, d, 32, 24).rotateX(-Math.PI / 2);
  const noise = (x: number, z: number) => Math.sin(x * 0.9 + z * 0.4) * 0.5 + Math.sin(x * 0.31 - z * 1.3) * 0.35 + Math.sin(x * 2.1 + z * 1.7) * 0.15;
  return build([{ geo: g, at: [(SLAB.x0 + SLAB.x1) / 2, GROUND_Y + 0.002, (SLAB.z0 + SLAB.z1) / 2], color: (x, _y, z) => mix(0x6cb453, 0x86c662, (noise(x, z) + 1) / 2) }]);
}

/** Five raised beds: soil inside wooden frames, with faint lines between the nine planting spots. */
function beds(): THREE.BufferGeometry {
  const pieces: Piece[] = [];
  const h = -GROUND_Y + 0.05, plank = 0.07;
  for (let lane = 0; lane < LANES; lane++) {
    const z0 = lane * TILE_D + BED_INSET, z1 = (lane + 1) * TILE_D - BED_INSET, zc = (z0 + z1) / 2, depth = z1 - z0;
    const wood = lane % 2 ? 0xc8915c : 0xd09a63;
    pieces.push(
      { geo: box(BOARD_W + 0.1, h, plank), color: wood, at: [BOARD_W / 2, GROUND_Y + h / 2, z1 + plank / 2 - 0.01] },
      { geo: box(BOARD_W + 0.1, h, plank), color: mix(wood, 0x8f6440, 0.3), at: [BOARD_W / 2, GROUND_Y + h / 2, z0 - plank / 2 + 0.01] },
      { geo: box(plank, h, depth + plank * 2 - 0.02), color: mix(wood, 0x8f6440, 0.15), at: [-plank / 2 - 0.02, GROUND_Y + h / 2, zc] },
      { geo: box(plank, h, depth + plank * 2 - 0.02), color: mix(wood, 0x8f6440, 0.15), at: [BOARD_W + plank / 2 + 0.02, GROUND_Y + h / 2, zc] },
      { geo: box(BOARD_W + 0.02, -GROUND_Y, depth), color: (x: number, _y: number, z: number) => mix(0x7a5235, 0x8a5f3c, (Math.sin(x * 5.3 + z * 3.1) + 1) / 2), at: [BOARD_W / 2, GROUND_Y / 2 - 0.004, zc] },
    );
    for (let col = 1; col < COLS; col++) pieces.push({ geo: box(0.025, 0.012, depth - 0.12), color: 0x5f3f29, at: [col, 0.0, zc] });
    // a planting spot in every tile: a darker hollow of soil with a light rim
    for (let col = 0; col < COLS; col++) {
      pieces.push({ geo: cyl(0.3, 0.3, 0.01, 18), color: 0x9b6d47, at: [col + 0.5, -0.001, zc], scale: [1, 1, 1.18] });
      pieces.push({ geo: cyl(0.25, 0.25, 0.012, 18), color: 0x664328, at: [col + 0.5, 0.0, zc], scale: [1, 1, 1.18] });
    }
  }
  return build(pieces);
}

/** The gingham blanket, gently rumpled: crisp checks as per-triangle colours (no textures). */
function blanket(): THREE.BufferGeometry {
  const w = BLANKET.x1 - BLANKET.x0, d = BLANKET.z1 - BLANKET.z0, cell = 0.32;
  const nx = Math.round(w / cell), nz = Math.round(d / cell);
  const g = new THREE.PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2).toNonIndexed();
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) pos.setY(i, Math.sin(pos.getX(i) * 2.3) * Math.sin(pos.getZ(i) * 1.7) * 0.015);
  g.computeVertexNormals();
  const colors = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let t = 0; t < pos.count; t += 3) {
    const cx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3 + w / 2, cz = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3 + d / 2;
    const a = Math.floor(cx / cell) % 2, b = Math.floor(cz / cell) % 2;
    c.setHex(a && b ? 0xd8423c : a || b ? 0xf09a8f : 0xfdf6ea, THREE.SRGBColorSpace);
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (t + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  // high enough that its dips never reach the lawn underneath
  g.translate((BLANKET.x0 + BLANKET.x1) / 2, GROUND_Y + 0.035, (BLANKET.z0 + BLANKET.z1) / 2);
  return g;
}

/** The picnic basket with the three snacks peeking out: a sandwich, an apple and a cupcake. */
function basket(): THREE.BufferGeometry {
  const { x, z } = BASKET_AT, y = GROUND_Y + 0.02;
  return build([
    { geo: cyl(0.48, 0.42, 0.42, 16), color: (_px, py) => (Math.round((py - y) * 18) % 2 ? 0xc79a5a : 0xb4844a), at: [x, y + 0.21, z], scale: [1.25, 1, 0.9] },
    { geo: torus(0.5, 0.035, 6, 20), color: 0xa57440, at: [x, y + 0.42, z], rot: [Math.PI / 2, 0, 0], scale: [1.25, 0.9, 1] },
    { geo: torus(0.42, 0.035, 6, 16, Math.PI), color: 0xa57440, at: [x, y + 0.42, z], rot: [0, 0, 0], scale: [1.2, 1, 1] },
    // sandwich (a soft wedge), apple, cupcake
    { geo: cyl(0.16, 0.16, 0.08, 3), color: 0xf3d79a, at: [x - 0.22, y + 0.47, z + 0.05], rot: [Math.PI / 2, 0.3, 0] },
    { geo: cyl(0.14, 0.14, 0.03, 3), color: 0x7ec46a, at: [x - 0.22, y + 0.47, z + 0.1], rot: [Math.PI / 2, 0.3, 0] },
    { geo: ball(0.11, 12, 10), color: 0xe0443a, at: [x + 0.05, y + 0.48, z + 0.08] },
    { geo: cyl(0.01, 0.01, 0.06, 4), color: 0x5b3f2a, at: [x + 0.05, y + 0.6, z + 0.08] },
    { geo: cyl(0.11, 0.08, 0.11, 10), color: 0xf2b8cf, at: [x + 0.3, y + 0.45, z + 0.02] },
    { geo: ball(0.11, 12, 8), color: 0xfff1e8, at: [x + 0.3, y + 0.53, z + 0.02], scale: [1, 0.7, 1] },
    { geo: ball(0.03, 6, 4), color: 0xe0443a, at: [x + 0.3, y + 0.62, z + 0.02] },
  ]);
}

/** The low fence on the right, with a gap in the middle of every lane for critters to come through. */
function fence(): THREE.BufferGeometry {
  const pieces: Piece[] = [];
  const x = BOARD_W + 0.75;
  for (let lane = 0; lane <= LANES; lane++) {
    const z = lane * TILE_D;
    pieces.push({ geo: box(0.09, 0.42, 0.09), color: 0xf4efe2, at: [x, GROUND_Y + 0.21, z] });
    pieces.push({ geo: cone(0.065, 0.08, 4), color: 0xf4efe2, at: [x, GROUND_Y + 0.46, z], rot: [0, Math.PI / 4, 0] });
    if (lane < LANES) for (const side of [-1, 1]) {
      const zz = z + TILE_D / 2 + side * 0.42;
      pieces.push({ geo: box(0.05, 0.05, 0.36), color: 0xe9e2d2, at: [x, GROUND_Y + 0.28, zz - side * 0.1] });
    }
  }
  return build(pieces);
}

/** Behind the beds: a hedge row with two round trees and a little white fence. */
function backdrop(): THREE.BufferGeometry {
  const pieces: Piece[] = [];
  for (let i = 0; i < 9; i++) {
    const x = SLAB.x0 + 0.9 + i * 1.75;
    pieces.push({ geo: softBox(1.7, 0.7, 0.8, 0.6), color: i % 2 ? 0x3f8d47 : 0x46984d, at: [x, GROUND_Y + 0.35, SLAB.z0 + 0.6] });
  }
  for (const [x, s] of [[-1.6, 1], [10.6, 0.85]] as const) {
    pieces.push({ geo: cyl(0.11 * s, 0.16 * s, 1.1 * s, 8), color: 0x8a5a3b, at: [x, GROUND_Y + 0.55 * s, SLAB.z0 + 1.1] });
    pieces.push({ geo: ball(0.75 * s, 14, 10), color: 0x4c9a4a, at: [x, GROUND_Y + 1.45 * s, SLAB.z0 + 1.05] });
    pieces.push({ geo: ball(0.5 * s, 12, 8), color: 0x5bab55, at: [x - 0.45 * s, GROUND_Y + 1.25 * s, SLAB.z0 + 1.35] });
    pieces.push({ geo: ball(0.45 * s, 12, 8), color: 0x45904a, at: [x + 0.5 * s, GROUND_Y + 1.3 * s, SLAB.z0 + 1.2] });
  }
  for (let i = 0; i < 26; i++) {
    const x = SLAB.x0 + 0.3 + i * 0.6;
    pieces.push({ geo: box(0.07, 0.36, 0.05), color: 0xf6f2e8, at: [x, GROUND_Y + 0.18, SLAB.z0 + 1.5] });
  }
  pieces.push({ geo: box(SLAB.x1 - SLAB.x0 - 0.4, 0.05, 0.04), color: 0xece6d8, at: [(SLAB.x0 + SLAB.x1) / 2, GROUND_Y + 0.26, SLAB.z0 + 1.5] });
  return build(pieces);
}

/** Places for grass tufts and flowers: on the grass, away from the beds, blanket and paths in. */
export function decorSpots(count: number, seed: number): { x: number; z: number; r: number; s: number }[] {
  const rand = rng(seed), out: { x: number; z: number; r: number; s: number }[] = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const x = SLAB.x0 + 0.2 + rand() * (SLAB.x1 - SLAB.x0 - 0.4), z = SLAB.z0 + 1.7 + rand() * (SLAB.z1 - SLAB.z0 - 1.9);
    const onBeds = x > -0.2 && x < BOARD_W + 0.2 && z > -0.05 && z < LANES * TILE_D + 0.05;
    const onBlanket = x > BLANKET.x0 - 0.1 && x < BLANKET.x1 + 0.1 && z > BLANKET.z0 - 0.1 && z < BLANKET.z1 + 0.1;
    const onPath = x > BOARD_W + 0.2 && Math.abs(((z % TILE_D) + TILE_D) % TILE_D - TILE_D / 2) < 0.4 && z < LANES * TILE_D;
    if (onBeds || onBlanket || onPath) continue;
    out.push({ x, z, r: rand() * Math.PI * 2, s: 0.75 + rand() * 0.6 });
  }
  return out;
}

/** The static part of the garden, as a few big meshes. */
export function buildGarden(): THREE.Group {
  const group = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, shadows: { cast?: boolean; receive?: boolean } = { receive: true }) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !!shadows.cast;
    mesh.receiveShadow = !!shadows.receive;
    group.add(mesh);
    return mesh;
  };
  add(slab(), Materials.ground);
  add(lawn(), Materials.ground);
  add(beds(), Materials.toon, { cast: true, receive: true });
  add(blanket(), Materials.toon);
  add(basket(), Materials.toon, { cast: true, receive: true });
  add(fence(), Materials.toon, { cast: true, receive: true });
  add(backdrop(), Materials.toon, { cast: true, receive: true });
  return group;
}

export const laneUmbrellaZ = (lane: number) => laneZ(lane) - 0.28;
