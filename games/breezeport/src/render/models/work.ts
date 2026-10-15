/**
 * Workplaces, grown on work zones: a workshop with a big roll-up door (bikes and little boats get
 * fixed here), a two-storey studio with tall sunny windows, and a glass office building. The walls
 * take the instance colour.
 */
import type * as THREE from 'three';
import { bevelBox, box, cyl, merge, PAT, part, torus } from '../geo';
import { PAINT } from '../palette';
import { corners, doorPiece, FACE, flatRoof, gableRoof, hedge, moved, onFace, shrub, tinted, TRIM, WHITE, windowPiece, FLOWERS, METAL, type Parts } from './kit';

/** The workshop (level 1): boards and a roll-up door, a sign with a spanner, a bike on its stand, a dinghy on a trailer. */
export function workshop(): THREE.BufferGeometry {
  const w = 1.5, d = 1.1, cz = -0.25, h = 0.82;
  const parts: Parts = [
    part(bevelBox(w + 0.06, 0.07, d + 0.06, 0.02), 0xb9b2a4, { pos: [0, 0.035, cz], pattern: PAT.stone }),
    part(box(w, h, d), WHITE, { pos: [0, 0.07 + h / 2, cz], pattern: tinted(PAT.boards) }),
    ...corners(0, cz, w, d, 0.07, 0.07 + h),
    ...gableRoof(0, cz, w, d, 0.07 + h, 0x5a6470, { pitch: 0.4, gable: 0xf6f0e2 }),
  ];
  const [fx, fz] = onFace('s', 0, cz, w, d, -0.2);
  // the roll-up door, half open: slats above, the dark inside below
  parts.push(part(box(0.72, 0.62, 0.03), 0x2a3038, { pos: [fx, 0.07 + 0.31, fz + 0.01] }));
  parts.push(part(box(0.72, 0.3, 0.04), 0xc9ced2, { pos: [fx, 0.07 + 0.47, fz + 0.03], pattern: PAT.siding }));
  parts.push(part(bevelBox(0.82, 0.06, 0.06, 0.01), TRIM, { pos: [fx, 0.07 + 0.66, fz + 0.03] }));
  const [ddx, ddz] = onFaceXZ(0.5);
  parts.push(...moved(doorPiece(0x2f7f8a, 0.18, 0.42, { step: false }), ddx, 0.07, ddz));
  parts.push(part(bevelBox(0.5, 0.14, 0.04, 0.01), 0xf2a93b, { pos: [0.3, 0.07 + h + 0.1, cz + d / 2 + 0.04] }));
  parts.push(part(box(0.2, 0.03, 0.02), 0x3b3f46, { pos: [0.3, 0.07 + h + 0.1, cz + d / 2 + 0.07], rot: [0, 0, 0.5] }), part(torus(0.03, 0.012, 4, 8), 0x3b3f46, { pos: [0.39, 0.07 + h + 0.15, cz + d / 2 + 0.07] }));
  // a bike on its stand
  for (const s of [-1, 1]) parts.push(part(torus(0.07, 0.01, 4, 12), 0x2f3540, { pos: [-0.55 + s * 0.1, 0.08, 0.5], rot: [0, Math.PI / 2, 0] }));
  parts.push(part(box(0.02, 0.02, 0.2), 0xe25c4a, { pos: [-0.55, 0.13, 0.5] }), part(box(0.02, 0.1, 0.02), 0xe25c4a, { pos: [-0.55, 0.13, 0.46] }));
  // a dinghy on a trailer
  parts.push(part(bevelBox(0.26, 0.1, 0.56, 0.04), 0xef6a55, { pos: [0.55, 0.15, 0.48] }), part(box(0.22, 0.02, 0.5), 0xf6f0e2, { pos: [0.55, 0.2, 0.48] }));
  for (const s of [-1, 1]) parts.push(part(cyl(0.05, 0.05, 0.03, 8), 0x2f3540, { pos: [0.55 + s * 0.14, 0.05, 0.48], rot: [0, 0, Math.PI / 2] }));
  parts.push(...shrub(-0.85, 0.75, 0.09, FLOWERS[3]));
  return merge(parts);
}

function onFaceXZ(along: number): [number, number] {
  const [x, z] = onFace('s', 0, -0.25, 1.5, 1.1, along);
  return [x, z];
}

/** The studio (level 2): two storeys, a ground floor of glass, a rooftop deck with an umbrella and planters. */
export function studio(): THREE.BufferGeometry {
  const w = 1.5, d = 1.2, cz = -0.25, h = 1.5, base = 0.1;
  const parts: Parts = [
    part(bevelBox(w + 0.06, base, d + 0.06, 0.02), PAINT.stone, { pos: [0, base / 2, cz], pattern: PAT.stone }),
    part(box(w, h, d), WHITE, { pos: [0, base + h / 2, cz], pattern: tinted(PAT.none) }),
    part(box(w + 0.03, 0.06, d + 0.03), 0x3b3f46, { pos: [0, base + 0.72, cz] }),
    ...flatRoof(0, cz, w, d, base + h, 0x3b3f46, 0.1),
  ];
  const [fx, fz] = onFace('s', 0, cz, w, d, 0);
  parts.push(part(box(w - 0.1, 0.56, 0.03), PAINT.glass, { pos: [fx, base + 0.36, fz + 0.015], pattern: PAT.glass }));
  for (const x of [-0.6, -0.2, 0.2, 0.6]) parts.push(part(box(0.03, 0.58, 0.05), 0x3b3f46, { pos: [fx + x, base + 0.36, fz + 0.02] }));
  parts.push(...moved(doorPiece(0x3b3f46, 0.22, 0.5, { step: false }), fx + 0.4, base, fz + 0.03));
  for (const s of [-1, 0, 1]) {
    const [wx, wz] = onFace('s', 0, cz, w, d, s * 0.45);
    parts.push(part(box(0.36, 0.5, 0.03), PAINT.glass, { pos: [wx, base + 1.12, wz + 0.015], pattern: PAT.glass }), part(bevelBox(0.42, 0.04, 0.08, 0.01), 0x3b3f46, { pos: [wx, base + 0.85, wz + 0.03] }));
  }
  for (const f of ['e', 'w'] as const) for (const y of [0.4, 1.1]) {
    const [wx, wz] = onFace(f, 0, cz, w, d, 0);
    parts.push(...moved(windowPiece(0.3, 0.36), wx, base + y, wz, FACE[f]));
  }
  // the roof deck
  const ry = base + h + 0.07;
  parts.push(part(bevelBox(0.9, 0.04, 0.6, 0.01), 0xc79a68, { pos: [-0.2, ry, cz - 0.1], pattern: PAT.boards }));
  parts.push(part(cyl(0.01, 0.01, 0.4, 4), METAL, { pos: [-0.3, ry + 0.2, cz - 0.1] }), part(torus(0.001, 0.001, 3, 3), 0, { pos: [0, 0, 0] }));
  parts.push(part(cyl(0.26, 0.02, 0.1, 8), 0xef6a55, { pos: [-0.3, ry + 0.42, cz - 0.1], pattern: PAT.stripes }));
  for (const x of [0.25, 0.5]) parts.push(part(bevelBox(0.16, 0.12, 0.16, 0.02), 0x8a6a4a, { pos: [x, ry + 0.06, cz - 0.3] }), ...shrub(x, cz - 0.3, 0.07, FLOWERS[x > 0.3 ? 0 : 4]).map(g => g.translate(0, ry + 0.1, 0)));
  parts.push(...hedge(-0.95, -0.2, 0.88, 0.14), ...shrub(0.8, 0.7, 0.1, FLOWERS[2]));
  return merge(parts);
}

/** The offices (level 3): five floors of glass in bands, a lobby with a canopy, a garden on the roof. */
export function offices(): THREE.BufferGeometry {
  const w = 1.46, d = 1.3, cz = -0.2, floor = 0.52, n = 5, base = 0.12, h = floor * n;
  const parts: Parts = [
    part(bevelBox(w + 0.08, base, d + 0.08, 0.02), PAINT.stone, { pos: [0, base / 2, cz], pattern: PAT.stone }),
    part(box(w - 0.06, h, d - 0.06), PAINT.glass, { pos: [0, base + h / 2, cz], pattern: PAT.glass }),
    ...flatRoof(0, cz, w, d, base + h, WHITE, 0.12),
  ];
  // painted bands between floors and slim columns at the corners
  for (let f = 0; f <= n; f++) parts.push(part(box(w, 0.09, d), WHITE, { pos: [0, base + f * floor + 0.02, cz], pattern: tinted(PAT.none) }));
  parts.push(...corners(0, cz, w, d, base, base + h, WHITE));
  for (const s of [-1, 1]) parts.push(part(box(0.04, h, 0.04), WHITE, { pos: [s * 0.24, base + h / 2, cz + d / 2], pattern: tinted(PAT.none) }));
  const [ex, ez] = onFace('s', 0, cz, w, d, 0);
  parts.push(...moved(doorPiece(0x3b3f46, 0.36, 0.42, { step: false, glassTop: true }), ex, base, ez + 0.02));
  parts.push(part(bevelBox(0.8, 0.05, 0.36, 0.015), WHITE, { pos: [ex, base + 0.5, ez + 0.16], pattern: tinted(PAT.none) }));
  // the roof garden and an antenna
  parts.push(part(bevelBox(0.8, 0.08, 0.5, 0.02), 0x8a6a4a, { pos: [-0.2, base + h + 0.12, cz - 0.15], pattern: PAT.boards }));
  for (let i = 0; i < 3; i++) parts.push(...shrub(-0.45 + i * 0.25, cz - 0.15, 0.09, FLOWERS[i]).map(g => g.translate(0, base + h + 0.15, 0)));
  parts.push(part(cyl(0.012, 0.012, 0.5, 4), METAL, { pos: [0.5, base + h + 0.33, cz - 0.35] }), part(cyl(0.02, 0.02, 0.03, 6), 0xef6a55, { pos: [0.5, base + h + 0.58, cz - 0.35], pattern: PAT.glow }));
  parts.push(...hedge(-0.95, -0.3, 0.86, 0.14), ...hedge(0.3, 0.95, 0.86, 0.14));
  return merge(parts);
}
