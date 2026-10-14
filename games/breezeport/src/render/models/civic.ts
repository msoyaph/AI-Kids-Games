/**
 * Public buildings: the library (4 × 3), a stone building with a columned porch, wide steps, tall
 * arched windows, a clock in the pediment, a little cupola with a weather vane, and book-banners by
 * the door. The town's own design (not any real library).
 */
import type * as THREE from 'three';
import { bevelBox, box, cone, cyl, merge, PAT, part, prism, sphere, torus } from '../geo';
import { PAINT } from '../palette';
import { doorPiece, FACE, flatRoof, gableRoof, hipRoof, moved, onFace, shrub, TRIM, WHITE, windowPiece, FLOWERS, METAL, type Parts } from './kit';

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

/**
 * City Hall (4 × 3): a white two-storey hall with sea-blue trim, a columned porch and a balcony over
 * it, low wings either side, a belfry with a flag on the roof, and flower boxes. (Chapter 3 adds a
 * clock to the belfry.)
 */
export function cityHall(clock = false): THREE.BufferGeometry {
  const w = 2.4, d = 1.7, cz = -0.35, h = 1.42, base = 0.14;
  const wall = 0xfbf6ea, trim = 0x2f7f8a, roof = 0x3f6f8f;
  const parts: Parts = [
    part(bevelBox(3.7, base, d + 0.12, 0.03), 0xd6cebe, { pos: [0, base / 2, cz], pattern: PAT.stone }),
    part(box(w, h, d), wall, { pos: [0, base + h / 2, cz], pattern: PAT.siding }),
    part(box(w + 0.04, 0.06, d + 0.04), trim, { pos: [0, base + 0.72, cz] }),
    ...gableRoof(0, cz, w, d, base + h, roof, { pitch: 0.5, gable: wall, overhang: 0.1 }),
  ];
  // the wings
  for (const s of [-1, 1]) {
    const wx = s * (w / 2 + 0.4);
    parts.push(part(box(0.8, 0.82, d - 0.3), wall, { pos: [wx, base + 0.41, cz - 0.05], pattern: PAT.siding }));
    parts.push(...hipRoof(wx, cz - 0.05, 0.8, d - 0.3, base + 0.82, 0.32, roof, 0.08));
    const [wx2, wz2] = onFace('s', wx, cz - 0.05, 0.8, d - 0.3, 0);
    parts.push(...moved(windowPiece(0.3, 0.34, { shutters: trim, flowers: true }), wx2, base + 0.42, wz2));
  }
  // the porch: four columns, steps, a balcony with a railing on top
  const pz = cz + d / 2 + 0.24;
  for (let i = 0; i < 3; i++) parts.push(part(bevelBox(1.5 - i * 0.12, 0.05, 0.16, 0.01), 0xd6cebe, { pos: [0, 0.025 + i * 0.05, pz + 0.3 - i * 0.1], pattern: PAT.stone }));
  for (const x of [-0.5, -0.17, 0.17, 0.5]) parts.push(part(cyl(0.055, 0.065, 0.62, 10), TRIM, { pos: [x, base + 0.31, pz] }));
  parts.push(part(bevelBox(1.32, 0.07, 0.5, 0.02), wall, { pos: [0, base + 0.66, pz - 0.05] }));
  parts.push(part(box(1.3, 0.12, 0.02), trim, { pos: [0, base + 0.77, pz + 0.19] }));
  for (let i = 0; i < 11; i++) parts.push(part(box(0.02, 0.12, 0.02), TRIM, { pos: [-0.62 + i * 0.124, base + 0.77, pz + 0.19] }));
  parts.push(...moved(doorPiece(trim, 0.3, 0.5, { step: false, glassTop: true }), 0, base, cz + d / 2));
  parts.push(...moved(doorPiece(trim, 0.22, 0.46, { step: false }), 0, base + 0.72, cz + d / 2));
  for (const s of [-1, 1]) for (const x of [0.62, 0.95]) {
    const [wx, wz] = onFace('s', 0, cz, w, d, s * x);
    parts.push(...moved(windowPiece(0.24, 0.32, { shutters: trim }), wx, base + 0.4, wz));
    parts.push(...moved(windowPiece(0.24, 0.3, { flowers: true }), wx, base + 1.08, wz));
  }
  // the belfry, a bell and the flag
  const ry = base + h + Math.tan(0.5) * (d / 2);
  parts.push(part(bevelBox(0.42, 0.36, 0.42, 0.02), wall, { pos: [0, ry + 0.1, cz] }));
  parts.push(part(box(0.3, 0.22, 0.44), 0x2a3440, { pos: [0, ry + 0.14, cz] }), part(box(0.44, 0.22, 0.3), 0x2a3440, { pos: [0, ry + 0.14, cz] }));
  parts.push(part(cone(0.08, 0.1, 8), 0xf2c84b, { pos: [0, ry + 0.12, cz] }));
  parts.push(part(cone(0.34, 0.34, 4), roof, { pos: [0, ry + 0.45, cz], rot: [0, Math.PI / 4, 0], pattern: PAT.tiles }));
  parts.push(part(cyl(0.012, 0.012, 0.5, 4), METAL, { pos: [0, ry + 0.85, cz] }), part(box(0.24, 0.14, 0.012), 0xef6a55, { pos: [0.12, ry + 1.02, cz] }), part(box(0.24, 0.035, 0.014), 0xffffff, { pos: [0.12, ry + 1.0, cz] }));
  // the town clock (a project funded at City Hall): a face on each side of the belfry, lit at night
  if (clock) for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, fx = Math.sin(a) * 0.222, fz = Math.cos(a) * 0.222;
    const face = (g: THREE.BufferGeometry) => g.rotateY(a).translate(fx, ry + 0.12, cz + fz);
    parts.push(face(part(cyl(0.15, 0.15, 0.02, 18), 0x2f7f8a, { rot: [Math.PI / 2, 0, 0] })));
    parts.push(face(part(cyl(0.125, 0.125, 0.024, 18), 0xfff8e6, { rot: [Math.PI / 2, 0, 0], pattern: PAT.glow })));
    parts.push(face(part(box(0.016, 0.085, 0.01), 0x2a3440, { pos: [0, 0.035, 0.014] })));
    parts.push(face(part(box(0.06, 0.016, 0.01), 0x2a3440, { pos: [0.025, 0, 0.016] })));
  }
  // flower beds by the steps
  for (const s of [-1, 1]) {
    parts.push(part(bevelBox(0.4, 0.1, 0.24, 0.02), 0xd6cebe, { pos: [s * 1.0, 0.05, pz + 0.3], pattern: PAT.stone }));
    for (let i = 0; i < 3; i++) parts.push(...shrub(s * 1.0 - 0.12 + i * 0.12, pz + 0.3, 0.06, FLOWERS[(i + (s > 0 ? 1 : 3)) % FLOWERS.length]).map(g => g.translate(0, 0.08, 0)));
  }
  return merge(parts);
}

/** The school (3 × 3): butter-yellow walls, a teal roof with a bell cupola, big windows, a fenced playground with a slide and a hoop. */
export function school(): THREE.BufferGeometry {
  const w = 2.5, d = 1.3, cz = -0.75, h = 1.18, base = 0.12;
  const wall = 0xffe3a0, roof = 0x3f8c8a;
  const parts: Parts = [
    part(bevelBox(w + 0.1, base, d + 0.1, 0.03), 0xd6cebe, { pos: [0, base / 2, cz], pattern: PAT.stone }),
    part(box(w, h, d), wall, { pos: [0, base + h / 2, cz], pattern: PAT.siding }),
    part(box(w + 0.03, 0.05, d + 0.03), TRIM, { pos: [0, base + 0.62, cz] }),
    ...gableRoof(0, cz, w, d, base + h, roof, { pitch: 0.5, gable: wall, overhang: 0.1 }),
  ];
  parts.push(...moved(doorPiece(0xef6a55, 0.32, 0.46, { glassTop: true, lamp: true }), 0, base, cz + d / 2));
  parts.push(part(bevelBox(0.7, 0.05, 0.3, 0.015), roof, { pos: [0, base + 0.58, cz + d / 2 + 0.13] }));
  for (const s of [-1, 1]) for (const x of [0.45, 0.85]) {
    const [wx, wz] = onFace('s', 0, cz, w, d, s * x);
    parts.push(...moved(windowPiece(0.3, 0.32), wx, base + 0.32, wz));
    parts.push(...moved(windowPiece(0.3, 0.3), wx, base + 0.92, wz));
  }
  const ry = base + h + Math.tan(0.5) * (d / 2);
  parts.push(part(bevelBox(0.3, 0.3, 0.3, 0.02), TRIM, { pos: [0, ry + 0.06, cz] }), part(cone(0.08, 0.1, 8), 0xf2c84b, { pos: [0, ry + 0.08, cz] }));
  parts.push(part(box(0.22, 0.18, 0.32), 0x2a3440, { pos: [0, ry + 0.1, cz] }));
  parts.push(part(cone(0.26, 0.28, 4), roof, { pos: [0, ry + 0.35, cz], rot: [0, Math.PI / 4, 0], pattern: PAT.tiles }));
  // the playground in front: soft ground, a slide, a hoop, a fence
  parts.push(part(box(2.6, 0.02, 1.0), 0xd8775f, { pos: [0, 0.01, 0.82] }));
  parts.push(part(box(0.14, 0.02, 0.5), 0xffc23d, { pos: [-0.8, 0.16, 0.8], rot: [-0.5, 0, 0] }), ...[-1, 1].map(s => part(box(0.03, 0.34, 0.03), 0x3f8fd0, { pos: [-0.8 + s * 0.08, 0.17, 0.55] })), part(bevelBox(0.2, 0.03, 0.14, 0.01), 0x3f8fd0, { pos: [-0.8, 0.34, 0.55] }));
  parts.push(part(cyl(0.02, 0.02, 0.6, 5), METAL, { pos: [0.85, 0.3, 0.6] }), part(box(0.18, 0.12, 0.02), WHITE, { pos: [0.85, 0.6, 0.62] }), part(torus(0.06, 0.008, 3, 10), 0xef6a55, { pos: [0.85, 0.53, 0.68], rot: [Math.PI / 2, 0, 0] }));
  for (let i = 0; i <= 12; i++) parts.push(part(box(0.025, 0.14, 0.025), TRIM, { pos: [-1.3 + i * (2.6 / 12), 0.07, 1.33] }));
  parts.push(part(box(2.62, 0.02, 0.02), TRIM, { pos: [0, 0.12, 1.33] }));
  // hopscotch squares
  for (let i = 0; i < 4; i++) parts.push(part(box(0.12, 0.022, 0.12), WHITE, { pos: [0.1 + (i % 2) * 0.13, 0.012, 0.95 - i * 0.14] }));
  return merge(parts);
}

/** The clinic (3 × 2): white walls with a sea-blue band, a canopy over the doors, a heart-with-a-plus sign, benches. */
export function clinic(): THREE.BufferGeometry {
  const w = 2.5, d = 1.1, cz = -0.25, h = 1.05, base = 0.1;
  const blue = 0x3f8fd0;
  const parts: Parts = [
    part(bevelBox(w + 0.08, base, d + 0.08, 0.02), PAINT.stone, { pos: [0, base / 2, cz], pattern: PAT.stone }),
    part(box(w, h, d), 0xf9fbfd, { pos: [0, base + h / 2, cz], pattern: PAT.siding }),
    part(box(w + 0.02, 0.12, d + 0.02), blue, { pos: [0, base + 0.62, cz] }),
    ...flatRoof(0, cz, w, d, base + h, TRIM, 0.1),
  ];
  const [fx, fz] = onFace('s', 0, cz, w, d, 0);
  parts.push(part(box(0.7, 0.5, 0.03), PAINT.glass, { pos: [fx, base + 0.3, fz + 0.015], pattern: PAT.glass }), part(box(0.03, 0.5, 0.04), TRIM, { pos: [fx, base + 0.3, fz + 0.03] }));
  parts.push(part(bevelBox(1.0, 0.05, 0.42, 0.015), TRIM, { pos: [fx, base + 0.6, fz + 0.2] }), ...[-1, 1].map(s => part(cyl(0.025, 0.025, 0.58, 6), TRIM, { pos: [fx + s * 0.44, base + 0.3, fz + 0.38] })));
  // the sign: a heart with a plus in it (the town's own clinic sign)
  const sy = base + h - 0.1, sz = fz + 0.06;
  parts.push(part(sphere(0.075, 10, 6), 0xef6a55, { pos: [fx - 0.055, sy + 0.02, sz], scale: [1, 1, 0.4] }), part(sphere(0.075, 10, 6), 0xef6a55, { pos: [fx + 0.055, sy + 0.02, sz], scale: [1, 1, 0.4] }));
  parts.push(part(cone(0.12, 0.14, 4), 0xef6a55, { pos: [fx, sy - 0.07, sz], rot: [Math.PI, Math.PI / 4, 0], scale: [1, 1, 0.35] }));
  parts.push(part(box(0.09, 0.025, 0.04), WHITE, { pos: [fx, sy, sz + 0.03] }), part(box(0.025, 0.09, 0.04), WHITE, { pos: [fx, sy, sz + 0.03] }));
  for (const s of [-1, 1]) for (const x of [0.62, 0.98]) {
    const [wx, wz] = onFace('s', 0, cz, w, d, s * x);
    parts.push(...moved(windowPiece(0.28, 0.3), wx, base + 0.32, wz));
    parts.push(...moved(windowPiece(0.28, 0.2), wx, base + 0.86, wz));
  }
  for (const s of [-1, 1]) parts.push(part(bevelBox(0.36, 0.035, 0.12, 0.01), 0x2f6f7a, { pos: [s * 0.85, 0.14, 0.62], pattern: PAT.boards }), ...[-1, 1].map(k => part(box(0.03, 0.14, 0.1), METAL, { pos: [s * 0.85 + k * 0.15, 0.07, 0.62] })));
  parts.push(...shrub(-1.1, 0.6, 0.1, FLOWERS[0]), ...shrub(1.1, 0.6, 0.1, FLOWERS[2]));
  return merge(parts);
}

/** The safety station (3 × 2): a coral-red garage with two big doors, a lookout tower, and its ladder truck out front. */
export function safety(): THREE.BufferGeometry {
  const w = 2.0, d = 1.1, cz = -0.25, h = 1.0, base = 0.08;
  const red = 0xe25c4a;
  const parts: Parts = [
    part(bevelBox(2.6, base, d + 0.08, 0.02), 0xb9b2a4, { pos: [0, base / 2, cz], pattern: PAT.stone }),
    part(box(w, h, d), PAINT.brick, { pos: [-0.25, base + h / 2, cz], pattern: PAT.brick }),
    ...flatRoof(-0.25, cz, w, d, base + h, PAINT.stone, 0.08),
    // the lookout tower
    part(box(0.5, 1.7, 0.5), PAINT.brick, { pos: [0.98, base + 0.85, cz - 0.2], pattern: PAT.brick }),
    part(bevelBox(0.62, 0.08, 0.62, 0.02), PAINT.stone, { pos: [0.98, base + 1.72, cz - 0.2] }),
    part(cone(0.42, 0.3, 4), red, { pos: [0.98, base + 1.92, cz - 0.2], rot: [0, Math.PI / 4, 0], pattern: PAT.tiles }),
  ];
  const [fx, fz] = onFace('s', -0.25, cz, w, d, 0);
  for (const s of [-1, 1]) {
    parts.push(part(box(0.7, 0.7, 0.03), red, { pos: [fx + s * 0.45, base + 0.36, fz + 0.015], pattern: PAT.siding }));
    parts.push(part(box(0.5, 0.18, 0.035), PAINT.glass, { pos: [fx + s * 0.45, base + 0.56, fz + 0.025], pattern: PAT.glass }));
    parts.push(part(bevelBox(0.8, 0.06, 0.06, 0.01), TRIM, { pos: [fx + s * 0.45, base + 0.74, fz + 0.03] }));
  }
  parts.push(part(bevelBox(0.9, 0.14, 0.04, 0.02), TRIM, { pos: [fx, base + 0.86, fz + 0.03] }), part(box(0.5, 0.06, 0.02), red, { pos: [fx, base + 0.86, fz + 0.06] }));
  // the ladder truck
  parts.push(part(bevelBox(0.34, 0.2, 0.9, 0.04), red, { pos: [0.92, 0.18, 0.6], rot: [0, 0.1, 0] }));
  parts.push(part(bevelBox(0.32, 0.16, 0.26, 0.04), red, { pos: [0.94, 0.34, 0.92], rot: [0, 0.1, 0] }), part(box(0.3, 0.08, 0.02), PAINT.glass, { pos: [0.95, 0.38, 1.05], rot: [0, 0.1, 0], pattern: PAT.glass }));
  parts.push(part(box(0.08, 0.04, 0.74), 0xd6dbe0, { pos: [0.9, 0.34, 0.5], rot: [0.12, 0.1, 0] }));
  for (const z of [0.3, 0.86]) for (const s of [-1, 1]) parts.push(part(cyl(0.06, 0.06, 0.04, 8), 0x2b2d33, { pos: [0.92 + s * 0.17 + (z - 0.6) * 0.1, 0.06, z], rot: [0, 0, Math.PI / 2] }));
  parts.push(part(sphere(0.03, 6, 4), 0x5fc7ff, { pos: [0.94, 0.45, 0.92], pattern: PAT.glow }));
  return merge(parts);
}

/** The community center (3 × 3): a big round-ended hall with tall windows, bunting along the front, a garden and benches. */
export function community(): THREE.BufferGeometry {
  const base = 0.1, h = 1.0, cz = -0.5;
  const wall = 0xf6d6a4;
  const parts: Parts = [
    part(bevelBox(2.4, base, 1.6, 0.03), PAINT.stone, { pos: [0, base / 2, cz], pattern: PAT.stone }),
    part(box(1.6, h, 1.4), wall, { pos: [0, base + h / 2, cz], pattern: PAT.siding }),
    part(cyl(0.7, 0.7, h, 16, ), wall, { pos: [0.8, base + h / 2, cz], scale: [0.6, 1, 1], pattern: PAT.siding }),
    part(cyl(0.7, 0.7, h, 16, ), wall, { pos: [-0.8, base + h / 2, cz], scale: [0.6, 1, 1], pattern: PAT.siding }),
    part(cyl(0.78, 0.7, 0.36, 16), PAINT.roofs[3]!, { pos: [0.8, base + h + 0.18, cz], scale: [0.62, 1, 1.04], pattern: PAT.tiles }),
    part(cyl(0.78, 0.7, 0.36, 16), PAINT.roofs[3]!, { pos: [-0.8, base + h + 0.18, cz], scale: [0.62, 1, 1.04], pattern: PAT.tiles }),
    ...gableRoof(0, cz, 1.6, 1.4, base + h, PAINT.roofs[3]!, { pitch: 0.42, gable: wall, overhang: 0.06 }),
  ];
  parts.push(...moved(doorPiece(0x2f7f8a, 0.36, 0.5, { glassTop: true, lamp: true }), 0, base, cz + 0.7));
  for (const s of [-1, 1]) for (const x of [0.42, 0.95]) {
    const [wx, wz] = [s * x, cz + 0.7 - (x > 0.9 ? 0.08 : 0)];
    parts.push(...moved(windowPiece(0.22, 0.56, { arch: true }), wx, base + 0.45, wz));
  }
  // bunting along the front
  for (let i = 0; i < 12; i++) {
    const x = -1.1 + i * 0.2, sag = Math.sin((i / 11) * Math.PI) * 0.08;
    parts.push(part(cone(0.05, 0.08, 3), [0xef6a55, 0xffc23d, 0x2fa3b0, 0x5fbf7a][i % 4]!, { pos: [x, base + 1.05 - sag, cz + 0.76], rot: [Math.PI, 0, 0] }));
  }
  parts.push(part(box(2.3, 0.01, 0.01), 0x6a6f7a, { pos: [0, base + 1.1, cz + 0.76] }));
  // the garden in front: beds, benches
  for (const s of [-1, 1]) {
    parts.push(part(bevelBox(0.6, 0.1, 0.3, 0.02), 0xd6cebe, { pos: [s * 0.75, 0.05, 0.72], pattern: PAT.stone }));
    for (let i = 0; i < 4; i++) parts.push(...shrub(s * 0.75 - 0.2 + i * 0.13, 0.72, 0.06, FLOWERS[(i + (s > 0 ? 2 : 0)) % FLOWERS.length]).map(g => g.translate(0, 0.08, 0)));
    parts.push(part(bevelBox(0.4, 0.035, 0.12, 0.01), 0xb07a4f, { pos: [s * 0.75, 0.14, 1.12], pattern: PAT.boards }), ...[-1, 1].map(k => part(box(0.03, 0.14, 0.1), 0x2f6f5a, { pos: [s * 0.75 + k * 0.17, 0.07, 1.12] })));
  }
  return merge(parts);
}

/** The recycling center (3 × 3): a green shed with solar panels, three bins (paper, glass, cans), a sorting belt and a sign. */
export function recycling(): THREE.BufferGeometry {
  const w = 2.2, d = 1.2, cz = -0.65, h = 0.95, base = 0.08;
  const green = 0x5fae7a;
  const parts: Parts = [
    part(bevelBox(2.6, base, 2.6, 0.03), 0xb9b2a4, { pos: [0, base / 2, 0], pattern: PAT.stone }),
    part(box(w, h, d), green, { pos: [0, base + h / 2, cz], pattern: PAT.boards }),
    ...gableRoof(0, cz, w, d, base + h, 0x3b4a52, { pitch: 0.35, gable: green }),
  ];
  // solar panels on the south slope
  for (let i = 0; i < 4; i++) parts.push(part(box(0.42, 0.02, 0.36), 0x2c4a7a, { pos: [-0.72 + i * 0.48, base + h + 0.17, cz + 0.32], rot: [0.35, 0, 0], pattern: PAT.glass }));
  const [fx, fz] = onFace('s', 0, cz, w, d, 0);
  parts.push(part(box(0.8, 0.6, 0.03), 0x2a3038, { pos: [fx, base + 0.31, fz + 0.01] }), part(bevelBox(0.9, 0.06, 0.06, 0.01), TRIM, { pos: [fx, base + 0.64, fz + 0.03] }));
  // the sign: three arrows chasing round
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push(part(cone(0.05, 0.09, 3), 0xffffff, { pos: [fx + Math.cos(a) * 0.08, base + 0.82 + Math.sin(a) * 0.08, fz + 0.04], rot: [0, 0, a + Math.PI], scale: [1, 1, 0.3] }));
  }
  parts.push(part(cyl(0.14, 0.14, 0.02, 12), green, { pos: [fx, base + 0.82, fz + 0.025], rot: [Math.PI / 2, 0, 0] }));
  // three big bins in their colours
  [0x3f8fd0, 0x5fbf7a, 0xffc23d].forEach((c, i) => {
    const x = -0.8 + i * 0.5;
    parts.push(part(bevelBox(0.38, 0.42, 0.36, 0.03), c, { pos: [x, 0.29, 0.55] }), part(bevelBox(0.4, 0.04, 0.38, 0.01), 0x3b3f46, { pos: [x, 0.52, 0.55] }));
    parts.push(part(box(0.18, 0.05, 0.01), WHITE, { pos: [x, 0.38, 0.74] }));
  });
  // the sorting belt
  parts.push(part(box(0.3, 0.06, 0.8), 0x3b3f46, { pos: [0.85, 0.3, 0.45] }), ...[0.15, 0.75].map(z => part(box(0.04, 0.3, 0.04), METAL, { pos: [0.85, 0.15, z] })));
  for (let i = 0; i < 4; i++) parts.push(part(box(0.08, 0.06, 0.08), [0xe2453a, 0x3f8fd0, 0xffffff, 0x5fbf7a][i]!, { pos: [0.85, 0.36, 0.2 + i * 0.18] }));
  return merge(parts);
}
