/**
 * Public buildings: the library (4 × 3), a stone building with a columned porch, wide steps, tall
 * arched windows, a clock in the pediment, a little cupola with a weather vane, and book-banners by
 * the door. The town's own design (not any real library).
 */
import type * as THREE from 'three';
import { bevelBox, box, cone, cyl, merge, PAT, part, prism, sphere } from '../geo';
import { PAINT } from '../palette';
import { doorPiece, FACE, gableRoof, moved, onFace, shrub, TRIM, windowPiece, FLOWERS, METAL, type Parts } from './kit';

export function library(): THREE.BufferGeometry {
  const w = 3.3, d = 1.7, cz = -0.45, h = 1.25, base = 0.16;
  const stone = PAINT.stone, roof = PAINT.roofs[2]!;
  const parts: Parts = [
    part(bevelBox(w + 0.12, base, d + 0.12, 0.03), 0xc9c1b1, { pos: [0, base / 2, cz], pattern: PAT.stone }),
    part(box(w, h, d), stone, { pos: [0, base + h / 2, cz], pattern: PAT.stone }),
    part(bevelBox(w + 0.1, 0.1, d + 0.1, 0.02), TRIM, { pos: [0, base + h + 0.05, cz] }),
    ...gableRoof(0, cz, w, d, base + h + 0.1, roof, { pitch: 0.42, gable: stone, overhang: 0.08 }),
  ];
  // the porch: a pediment on four columns over wide steps
  const pw = 1.5, pz = cz + d / 2 + 0.32, ph = h + 0.02;
  parts.push(part(bevelBox(pw + 0.3, 0.06, 0.62, 0.02), 0xd6cebe, { pos: [0, base + 0.03, pz - 0.05], pattern: PAT.stone }));
  for (let i = 0; i < 3; i++) parts.push(part(bevelBox(pw + 0.5 - i * 0.1, 0.06, 0.18, 0.01), 0xd6cebe, { pos: [0, 0.03 + i * 0.055, pz + 0.38 - i * 0.12], pattern: PAT.stone }));
  for (const x of [-0.66, -0.22, 0.22, 0.66]) {
    parts.push(part(cyl(0.07, 0.08, ph - 0.08, 10), TRIM, { pos: [x, base + 0.06 + (ph - 0.08) / 2, pz + 0.12] }));
    parts.push(part(bevelBox(0.2, 0.06, 0.2, 0.01), TRIM, { pos: [x, base + 0.06 + ph - 0.06, pz + 0.12] }));
    parts.push(part(bevelBox(0.19, 0.05, 0.19, 0.01), TRIM, { pos: [x, base + 0.085, pz + 0.12] }));
  }
  parts.push(part(bevelBox(pw + 0.24, 0.12, 0.66, 0.02), TRIM, { pos: [0, base + ph + 0.04, pz - 0.05] }));
  parts.push(part(prism(pw + 0.24, 0.66, 0.38), stone, { pos: [0, base + ph + 0.1, pz - 0.05], pattern: PAT.stone }));
  parts.push(part(prism(pw + 0.34, 0.7, 0.42), roof, { pos: [0, base + ph + 0.1, pz - 0.05], scale: [1, 1.04, 1.02], pattern: PAT.tiles }));
  // the clock in the pediment
  const cy = base + ph + 0.24, ck = pz + 0.29;
  parts.push(part(cyl(0.13, 0.13, 0.03, 16), TRIM, { pos: [0, cy, ck], rot: [Math.PI / 2, 0, 0] }), part(cyl(0.105, 0.105, 0.03, 16), 0xfffbe8, { pos: [0, cy, ck + 0.01], rot: [Math.PI / 2, 0, 0], pattern: PAT.glow }));
  parts.push(part(box(0.012, 0.075, 0.01), 0x2f3540, { pos: [0, cy + 0.03, ck + 0.03] }), part(box(0.055, 0.012, 0.01), 0x2f3540, { pos: [0.025, cy, ck + 0.03] }));
  // the doors and tall arched windows
  parts.push(...moved(doorPiece(0x2f4f8a, 0.36, 0.62, { step: false, glassTop: true }), 0, base, cz + d / 2));
  for (const s of [-1, 1]) for (const x of [1.0, 1.42]) {
    const [wx, wz] = onFace('s', 0, cz, w, d, s * x);
    parts.push(...moved(windowPiece(0.26, 0.56, { arch: true }), wx, base + 0.55, wz));
  }
  for (const f of ['e', 'w'] as const) for (const s of [-1, 1]) {
    const [wx, wz] = onFace(f, 0, cz, w, d, s * 0.4);
    parts.push(...moved(windowPiece(0.26, 0.56, { arch: true }), wx, base + 0.55, wz, FACE[f]));
  }
  // the cupola, with a weather vane shaped like a book
  const ry = base + h + 0.1 + Math.tan(0.42) * (d / 2);
  parts.push(part(bevelBox(0.36, 0.3, 0.36, 0.02), TRIM, { pos: [0, ry + 0.08, cz] }));
  parts.push(part(box(0.24, 0.2, 0.37), 0x9fd4e6, { pos: [0, ry + 0.1, cz], pattern: PAT.glass }), part(box(0.37, 0.2, 0.24), 0x9fd4e6, { pos: [0, ry + 0.1, cz], pattern: PAT.glass }));
  parts.push(part(cone(0.27, 0.3, 4), roof, { pos: [0, ry + 0.38, cz], rot: [0, Math.PI / 4, 0], pattern: PAT.tiles }));
  parts.push(part(cyl(0.01, 0.01, 0.22, 4), METAL, { pos: [0, ry + 0.62, cz] }), part(box(0.12, 0.08, 0.015), 0xf2c84b, { pos: [0.05, ry + 0.68, cz], rot: [0, 0, 0.1] }), part(sphere(0.025, 6, 4), 0xf2c84b, { pos: [0, ry + 0.54, cz] }));
  // banners with books on them, lamps, a bike rack, flower beds
  for (const s of [-1, 1]) {
    const bx = s * 1.06, bz = cz + d / 2 + 0.05;
    parts.push(part(box(0.18, 0.4, 0.02), s < 0 ? 0xe25c4a : 0x3f8c8a, { pos: [bx, base + 0.82, bz] }));
    parts.push(part(box(0.1, 0.07, 0.025), TRIM, { pos: [bx, base + 0.86, bz + 0.005] }), part(box(0.006, 0.07, 0.03), 0x2f3540, { pos: [bx, base + 0.86, bz + 0.005] }));
    parts.push(part(cyl(0.02, 0.025, 0.62, 6), 0x2f3540, { pos: [s * 1.2, 0.31, 0.5] }), part(box(0.1, 0.12, 0.1), 0xfff1c8, { pos: [s * 1.2, 0.66, 0.5], pattern: PAT.glow }), part(cone(0.09, 0.07, 4), 0x2f3540, { pos: [s * 1.2, 0.76, 0.5], rot: [0, Math.PI / 4, 0] }));
    parts.push(part(bevelBox(0.62, 0.1, 0.28, 0.02), 0xd6cebe, { pos: [s * 1.25, 0.05, 0.3], pattern: PAT.stone }));
    for (let i = 0; i < 4; i++) parts.push(...shrub(s * 1.25 - 0.22 + i * 0.15, 0.3, 0.07, FLOWERS[(i + (s > 0 ? 2 : 0)) % FLOWERS.length]).map(g => g.translate(0, 0.08, 0)));
  }
  for (let i = 0; i < 4; i++) parts.push(part(cyl(0.006, 0.006, 0.16, 4, ), METAL, { pos: [1.55, 0.1, -0.2 + i * 0.12], rot: [0, 0, Math.PI / 2], scale: [1, 1, 1] }));
  parts.push(...[-0.2, 0.16].map(z => part(box(0.02, 0.12, 0.02), METAL, { pos: [1.55, 0.06, z] })));
  return merge(parts);
}
