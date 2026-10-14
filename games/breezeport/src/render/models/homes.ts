/**
 * Homes on a 2 × 2 lot, facing the street (south, +z): a clapboard cottage with a gable roof, a
 * two-storey brick townhouse with a stoop and a bay window, and a bungalow with a hipped roof and a
 * deep porch. The walls take the instance colour (pastel seaside paint), so each model is one draw
 * call however many colours a street has.
 */
import type * as THREE from 'three';
import { bevelBox, box, cyl, merge, PAT, part } from '../geo';
import { PAINT } from '../palette';
import {
  chimney, corners, doorPiece, FACE, flatRoof, gableRoof, hedge, hipRoof, moved, onFace, picketFence, shrub, steppingStones,
  tinted, TRIM, WHITE, windowPiece, FLOWERS, type Parts,
} from './kit';

/** A lot's front edge is at z = +1 (the sidewalk); the house sits back from it. */
const FRONT = 1;

/** The cottage: one storey and a steep roof, a front door between two windows, a picket fence. */
export function cottage(): THREE.BufferGeometry {
  const w = 1.34, d = 1.0, cz = -0.2, h = 0.66;
  const roofColor = PAINT.roofs[0]!;
  const parts: Parts = [
    part(bevelBox(w + 0.06, 0.08, d + 0.06, 0.02), PAINT.stone, { pos: [0, 0.04, cz], pattern: PAT.stone }),
    part(box(w, h, d), WHITE, { pos: [0, 0.08 + h / 2, cz], pattern: tinted(PAT.siding) }),
    ...corners(0, cz, w, d, 0.08, 0.08 + h),
    ...gableRoof(0, cz, w, d, 0.08 + h, roofColor, { pitch: 0.66 }),
    ...chimney(0.38, cz - 0.18, 0.7, 0.62),
  ];
  const [dx, dz] = onFace('s', 0, cz, w, d, 0);
  parts.push(...moved(doorPiece(PAINT.door[0]!, 0.22, 0.4, { lamp: true }), dx, 0.08, dz));
  for (const s of [-1, 1]) {
    const [wx, wz] = onFace('s', 0, cz, w, d, s * 0.4);
    parts.push(...moved(windowPiece(0.26, 0.24, { shutters: 0x3f6f7f, flowers: true }), wx, 0.44, wz));
  }
  for (const f of ['e', 'w'] as const) {
    const [wx, wz] = onFace(f, 0, cz, w, d, 0);
    parts.push(...moved(windowPiece(0.24, 0.24), wx, 0.44, wz, FACE[f]));
  }
  // a round attic window in the gable
  parts.push(part(cyl(0.085, 0.085, 0.04, 10), TRIM, { pos: [0, 0.98, cz + d / 2 + 0.01], rot: [Math.PI / 2, 0, 0] }), part(cyl(0.06, 0.06, 0.04, 10), PAINT.glass, { pos: [0, 0.98, cz + d / 2 + 0.025], rot: [Math.PI / 2, 0, 0], pattern: PAT.glass }));
  // the front yard: a path, a fence with a gate gap, shrubs
  parts.push(...steppingStones(0, cz + d / 2 + 0.16, FRONT - 0.08));
  parts.push(...picketFence(-0.96, 0.96, FRONT - 0.05, [-0.14, 0.14]));
  parts.push(...shrub(-0.62, 0.55, 0.11, FLOWERS[0]), ...shrub(0.66, 0.6, 0.1, FLOWERS[1]), ...shrub(-0.82, -0.85, 0.12));
  return merge(parts);
}

/** The townhouse: two storeys of brick (the brick takes the paint), a stoop with railings, a bay window. */
export function townhouse(): THREE.BufferGeometry {
  const w = 1.3, d = 1.12, cz = -0.22, h = 1.36;
  const parts: Parts = [
    part(bevelBox(w + 0.06, 0.1, d + 0.06, 0.02), PAINT.stone, { pos: [0, 0.05, cz], pattern: PAT.stone }),
    part(box(w, h, d), WHITE, { pos: [0, 0.1 + h / 2, cz], pattern: tinted(PAT.brick) }),
    // a white band between the floors and stone lintels
    part(box(w + 0.03, 0.05, d + 0.03), TRIM, { pos: [0, 0.78, cz] }),
    ...flatRoof(0, cz, w, d, 0.1 + h, TRIM, 0.1),
    ...chimney(-0.42, cz - 0.3, 1.5, 0.3),
    // a rooftop planter
    part(bevelBox(0.4, 0.1, 0.22, 0.02), 0x8a6a4a, { pos: [0.3, 1.55, cz - 0.25], pattern: PAT.boards }),
    ...shrub(0.22, cz - 0.25, 0.07, FLOWERS[3]).map(g => g.translate(0, 1.55, 0)),
    ...shrub(0.38, cz - 0.25, 0.07, FLOWERS[1]).map(g => g.translate(0, 1.55, 0)),
  ];
  // the stoop: steps up to a door on the left, with railings
  const [dx, dz] = onFace('s', 0, cz, w, d, -0.36);
  parts.push(...moved(doorPiece(PAINT.door[1]!, 0.22, 0.42, { step: false, glassTop: true, lamp: true }), dx, 0.22, dz));
  for (let i = 0; i < 3; i++) parts.push(part(bevelBox(0.34, 0.07, 0.12, 0.01), PAINT.stone, { pos: [dx, 0.035 + i * 0.07, dz + 0.32 - i * 0.1], scale: [1, 1 + i * 0.0, 1], pattern: PAT.stone }));
  for (const s of [-1, 1]) {
    parts.push(part(box(0.025, 0.2, 0.025), 0x3b3f46, { pos: [dx + s * 0.17, 0.32, dz + 0.32] }));
    parts.push(part(box(0.025, 0.025, 0.36), 0x3b3f46, { pos: [dx + s * 0.17, 0.33, dz + 0.16], rot: [0.55, 0, 0] }));
  }
  // a bay window on the right, ground floor
  const [bx, bz] = onFace('s', 0, cz, w, d, 0.3, 0.1);
  parts.push(part(bevelBox(0.5, 0.48, 0.2, 0.02), TRIM, { pos: [bx, 0.42, bz - 0.04] }));
  parts.push(part(box(0.44, 0.34, 0.03), PAINT.glass, { pos: [bx, 0.44, bz + 0.07], pattern: PAT.glass }));
  parts.push(part(bevelBox(0.56, 0.06, 0.26, 0.02), PAINT.roofs[0]!, { pos: [bx, 0.69, bz - 0.03] }));
  // upstairs windows with flower boxes
  for (const s of [-1, 1]) {
    const [wx, wz] = onFace('s', 0, cz, w, d, s * 0.33);
    parts.push(...moved(windowPiece(0.26, 0.32, { flowers: true }), wx, 1.1, wz));
  }
  for (const f of ['e', 'w'] as const) for (const y of [0.45, 1.1]) {
    const [wx, wz] = onFace(f, 0, cz, w, d, 0.1);
    parts.push(...moved(windowPiece(0.22, 0.3), wx, y, wz, FACE[f]));
  }
  // the small front garden: a hedge and a tree-like shrub
  parts.push(...hedge(-0.95, -0.6, FRONT - 0.12, 0.16), ...hedge(0.0, 0.95, FRONT - 0.12, 0.16), ...shrub(0.72, 0.52, 0.12, FLOWERS[0]));
  return merge(parts);
}

/** The bungalow: a wide, low house under a hipped roof, a porch on posts with a swing, a garden fence. */
export function bungalow(): THREE.BufferGeometry {
  const w = 1.46, d = 0.98, cz = -0.26, h = 0.6;
  const parts: Parts = [
    part(bevelBox(w + 0.06, 0.09, d + 0.06, 0.02), PAINT.stone, { pos: [0, 0.045, cz], pattern: PAT.stone }),
    part(box(w, h, d), WHITE, { pos: [0, 0.09 + h / 2, cz], pattern: tinted(PAT.siding) }),
    ...corners(0, cz, w, d, 0.09, 0.09 + h),
    ...hipRoof(0, cz + 0.1, w, d + 0.2, 0.09 + h, 0.46, PAINT.roofs[1]!, 0.14),
  ];
  // the porch: a deck in front, posts holding the roof's front edge, a railing and a swing
  const pz = cz + d / 2 + 0.17;
  parts.push(part(bevelBox(w - 0.1, 0.07, 0.36, 0.015), 0xe9dcc4, { pos: [0, 0.06, pz], pattern: PAT.boards }));
  for (const s of [-1, -0.33, 0.33, 1]) parts.push(part(box(0.05, h - 0.02, 0.05), TRIM, { pos: [s * (w / 2 - 0.08), 0.09 + h / 2, pz + 0.14] }));
  for (const s of [-1, 1]) parts.push(part(box(w / 2 - 0.28, 0.03, 0.03), TRIM, { pos: [s * (w / 4 + 0.07), 0.26, pz + 0.15] }));
  parts.push(part(bevelBox(0.3, 0.05, 0.1, 0.01), 0xf2a93b, { pos: [-0.42, 0.26, pz - 0.08] }));
  parts.push(...[-1, 1].map(s => part(box(0.01, 0.38, 0.01), 0x6a6f7a, { pos: [-0.42 + s * 0.13, 0.46, pz - 0.08] })));
  const [dx, dz] = onFace('s', 0, cz, w, d, 0.12);
  parts.push(...moved(doorPiece(PAINT.door[2]!, 0.22, 0.4, { step: false, glassTop: true }), dx, 0.09, dz));
  {
    const [wx, wz] = onFace('s', 0, cz, w, d, -0.36);
    parts.push(...moved(windowPiece(0.32, 0.26, { shutters: 0xf6f0e2 }), wx, 0.42, wz));
  }
  for (const f of ['e', 'w'] as const) {
    const [wx, wz] = onFace(f, 0, cz, w, d, 0);
    parts.push(...moved(windowPiece(0.26, 0.24), wx, 0.4, wz, FACE[f]));
  }
  {
    const [wx, wz] = onFace('s', 0, cz, w, d, 0.5);
    parts.push(...moved(windowPiece(0.24, 0.24), wx, 0.4, wz));
  }
  // garden: path, shrubs, a low fence
  parts.push(...steppingStones(0.12, pz + 0.2, FRONT - 0.08));
  parts.push(...picketFence(-0.96, 0.96, FRONT - 0.05, [-0.02, 0.26], 0xf6efe0));
  parts.push(...shrub(-0.55, 0.62, 0.12, FLOWERS[4]), ...shrub(0.62, 0.66, 0.1, FLOWERS[2]), ...shrub(0.84, -0.86, 0.13));
  return merge(parts);
}
