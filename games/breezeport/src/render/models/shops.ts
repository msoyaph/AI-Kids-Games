/**
 * Shops and workplaces: a corner café with a striped awning and tables outside, a corner store with
 * fruit crates under its awning, and a three-storey apartment block with balconies (homes, drawn
 * here because it shares the shops' flat roofs and brick). The awning stripes and the walls take
 * the instance colour.
 */
import * as THREE from 'three';
import { bevelBox, box, cone, cyl, ico, merge, PAT, part, sphere } from '../geo';
import { PAINT } from '../palette';
import { doorPiece, FACE, flatRoof, moved, onFace, shrub, tinted, TRIM, WHITE, windowPiece, FLOWERS, METAL, type Parts } from './kit';


/** A shop front facing south at the origin: a glass window wall, a door, a striped awning, a sign board. */
function shopFront(w: number, h: number, sign: number, o: { door?: number } = {}): Parts {
  const parts: Parts = [
    part(bevelBox(w, 0.08, 0.06, 0.015), TRIM, { pos: [0, h + 0.02, 0.03] }),
    part(box(w - 0.08, h - 0.1, 0.03), PAINT.glass, { pos: [0, h / 2 + 0.02, 0.025], pattern: PAT.glass }),
    part(box(w - 0.04, 0.1, 0.05), TRIM, { pos: [0, 0.05, 0.03] }),
  ];
  for (const x of [-w / 2 + 0.03, w / 2 - 0.03, -w / 6, w / 6]) parts.push(part(box(0.035, h, 0.05), TRIM, { pos: [x, h / 2, 0.035] }));
  const dx = o.door ?? w / 2 - 0.2;
  parts.push(...moved(doorPiece(0x2f5f6a, 0.2, h - 0.08, { step: true, glassTop: true }), dx, 0, 0.03));
  // the awning: striped cloth sloping out, with a scalloped edge
  parts.push(part(box(w + 0.06, 0.03, 0.34), WHITE, { pos: [0, h + 0.12, 0.18], rot: [0.42, 0, 0], pattern: tinted(PAT.stripes) }));
  for (let i = 0; i < Math.round(w / 0.11); i++) parts.push(part(cyl(0.05, 0.05, 0.02, 6, ), WHITE, { pos: [-w / 2 + 0.05 + i * 0.11, h - 0.02, 0.34], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1], pattern: tinted(PAT.stripes) }));
  // the sign board above the awning
  parts.push(part(bevelBox(w * 0.62, 0.16, 0.05, 0.02), sign, { pos: [0, h + 0.33, 0.04] }));
  return parts;
}

/** The café: a corner café (2 × 2) with tables and umbrellas on the sidewalk side, a cup on its sign. */
export function cafe(): THREE.BufferGeometry {
  const w = 1.5, d = 1.2, cz = -0.25, h = 1.3;
  const parts: Parts = [
    part(bevelBox(w + 0.06, 0.08, d + 0.06, 0.02), PAINT.stone, { pos: [0, 0.04, cz], pattern: PAT.stone }),
    part(box(w, h, d), 0xf9efe0, { pos: [0, 0.08 + h / 2, cz], pattern: PAT.siding }),
    part(box(w + 0.03, 0.05, d + 0.03), TRIM, { pos: [0, 0.74, cz] }),
    ...flatRoof(0, cz, w, d, 0.08 + h, TRIM, 0.08),
  ];
  const [fx, fz] = onFace('s', 0, cz, w, d, 0);
  parts.push(...moved(shopFront(w - 0.1, 0.56, 0x2f6f7a), fx, 0.08, fz));
  // the cup on the sign
  parts.push(part(cyl(0.05, 0.04, 0.07, 8), WHITE, { pos: [fx - 0.18, 0.08 + 0.89, fz + 0.08] }), part(cyl(0.05, 0.05, 0.012, 8), 0x8a5a3b, { pos: [fx - 0.18, 0.08 + 0.925, fz + 0.08] }));
  parts.push(part(bevelBox(0.3, 0.04, 0.01, 0.01), 0xffe7a8, { pos: [fx + 0.1, 0.08 + 0.89, fz + 0.07] }));
  // upstairs windows, and side windows on the café's other street
  for (const s of [-1, 0, 1]) {
    const [wx, wz] = onFace('s', 0, cz, w, d, s * 0.45);
    parts.push(...moved(windowPiece(0.24, 0.3, { flowers: s !== 0 }), wx, 1.06, wz));
  }
  for (const y of [0.42, 1.06]) {
    const [wx, wz] = onFace('e', 0, cz, w, d, 0.1);
    parts.push(...moved(windowPiece(0.28, 0.3), wx, y, wz, FACE.e));
  }
  // tables with umbrellas out front
  for (const tx of [-0.5, 0.42]) {
    const tz = 0.62;
    parts.push(part(cyl(0.14, 0.14, 0.02, 10), WHITE, { pos: [tx, 0.2, tz] }), part(cyl(0.015, 0.015, 0.2, 5), METAL, { pos: [tx, 0.1, tz] }));
    parts.push(part(cyl(0.012, 0.012, 0.52, 5), TRIM, { pos: [tx, 0.36, tz] }));
    parts.push(part(cone(0.3, 0.13, 8), WHITE, { pos: [tx, 0.6, tz], pattern: tinted(PAT.stripes) }));
    for (const s of [-1, 1]) parts.push(part(bevelBox(0.09, 0.1, 0.09, 0.015), 0x2f6f7a, { pos: [tx + s * 0.2, 0.05, tz] }), part(box(0.09, 0.1, 0.015), 0x2f6f7a, { pos: [tx + s * 0.24, 0.13, tz] , rot: [0, Math.PI / 2, 0] }));
  }
  parts.push(...shrub(0.85, 0.5, 0.09, FLOWERS[0]), ...shrub(-0.88, 0.48, 0.09, FLOWERS[1]));
  // a chalkboard on the sidewalk
  parts.push(part(box(0.12, 0.18, 0.02), 0x2d3b36, { pos: [0.02, 0.1, 0.74], rot: [-0.2, 0, 0] }), part(box(0.13, 0.19, 0.012), WOOD_FRAME, { pos: [0.02, 0.1, 0.728], rot: [-0.2, 0, 0] }));
  return merge(parts);
}
const WOOD_FRAME = 0xb07a4f;

/** The corner store: brick, a big window, fruit crates under the awning and a bench. */
export function cornerStore(): THREE.BufferGeometry {
  const w = 1.4, d = 1.14, cz = -0.25, h = 0.98;
  const parts: Parts = [
    part(bevelBox(w + 0.06, 0.08, d + 0.06, 0.02), PAINT.stone, { pos: [0, 0.04, cz], pattern: PAT.stone }),
    part(box(w, h, d), PAINT.brick, { pos: [0, 0.08 + h / 2, cz], pattern: PAT.brick }),
    ...flatRoof(0, cz, w, d, 0.08 + h, PAINT.stone, 0.1),
  ];
  const [fx, fz] = onFace('s', 0, cz, w, d, 0);
  parts.push(...moved(shopFront(w - 0.12, 0.56, 0xf2a93b, { door: -0.42 }), fx, 0.08, fz));
  for (const s of [-1, 1]) {
    const [wx, wz] = onFace('w', 0, cz, w, d, s * 0.25);
    parts.push(...moved(windowPiece(0.24, 0.3), wx, 0.48, wz, FACE.w));
  }
  // crates of fruit on a stand under the awning
  const fruit = [0xe2453a, 0xffb33d, 0x8fd06a, 0xffe14d];
  for (let i = 0; i < 4; i++) {
    const cx = 0.02 + (i % 2) * 0.2, czz = fz + 0.2 + Math.floor(i / 2) * 0.0, cy = 0.12 + Math.floor(i / 2) * 0.12;
    parts.push(part(bevelBox(0.18, 0.08, 0.14, 0.01), 0xd2a26e, { pos: [cx + Math.floor(i / 2) * 0.0, cy, czz - Math.floor(i / 2) * 0.1], pattern: PAT.boards }));
    for (let k = 0; k < 4; k++) parts.push(part(sphere(0.03, 6, 4), fruit[i]!, { pos: [cx - 0.05 + (k % 2) * 0.1, cy + 0.06, czz - Math.floor(i / 2) * 0.1 - 0.03 + Math.floor(k / 2) * 0.06] }));
  }
  parts.push(part(box(0.44, 0.05, 0.14), 0x8a5a3b, { pos: [0.12, 0.08, fz + 0.18] }));
  // a bench and a bin by the door
  parts.push(part(bevelBox(0.36, 0.035, 0.12, 0.01), 0x2f6f7a, { pos: [-0.5, 0.14, 0.66], pattern: PAT.boards }), ...[-1, 1].map(s => part(box(0.03, 0.14, 0.1), METAL, { pos: [-0.5 + s * 0.15, 0.07, 0.66] })));
  parts.push(part(cyl(0.07, 0.06, 0.18, 8), 0x3f7f5a, { pos: [0.68, 0.09, 0.68] }));
  return merge(parts);
}

/** The apartments (3 × 3): three storeys of painted brick, balconies with plants, a rooftop garden. */
export function apartments(): THREE.BufferGeometry {
  const w = 2.5, d = 2.0, cz = -0.25, floor = 0.62, n = 3;
  const h = floor * n;
  const parts: Parts = [
    part(bevelBox(w + 0.08, 0.12, d + 0.08, 0.02), PAINT.stone, { pos: [0, 0.06, cz], pattern: PAT.stone }),
    part(box(w, h, d), WHITE, { pos: [0, 0.12 + h / 2, cz], pattern: tinted(PAT.brick) }),
    ...flatRoof(0, cz, w, d, 0.12 + h, TRIM, 0.12),
  ];
  for (let f = 1; f < n; f++) parts.push(part(box(w + 0.03, 0.05, d + 0.03), TRIM, { pos: [0, 0.12 + f * floor, cz] }));
  const [ex, ez] = onFace('s', 0, cz, w, d, 0);
  parts.push(...moved(doorPiece(0x2f5f6a, 0.36, 0.46, { glassTop: true, lamp: true }), ex, 0.12, ez));
  parts.push(part(bevelBox(0.62, 0.05, 0.3, 0.015), PAINT.roofs[2]!, { pos: [ex, 0.66, ez + 0.13] }));
  for (let f = 0; f < n; f++) for (const s of [-1, -0.5, 0.5, 1]) {
    if (f === 0 && Math.abs(s) < 0.6) continue;
    const [wx, wz] = onFace('s', 0, cz, w, d, s * 0.88);
    const y = 0.12 + f * floor + floor * 0.5;
    parts.push(...moved(windowPiece(0.28, 0.32), wx, y, wz));
    if (f > 0) {
      // a balcony with a railing and a pot plant
      parts.push(part(bevelBox(0.42, 0.04, 0.2, 0.01), PAINT.stone, { pos: [wx, y - 0.22, wz + 0.1] }));
      parts.push(part(box(0.42, 0.12, 0.015), 0x3b3f46, { pos: [wx, y - 0.14, wz + 0.2] }));
      parts.push(part(cyl(0.035, 0.03, 0.06, 6), 0xc8735a, { pos: [wx + 0.13, y - 0.17, wz + 0.11] }), part(ico(0.05, 0), 0x5fae5a, { pos: [wx + 0.13, y - 0.11, wz + 0.11], round: true }));
    }
  }
  for (const f of ['e', 'w'] as const) for (let k = 0; k < n; k++) for (const s of [-0.5, 0.5]) {
    const [wx, wz] = onFace(f, 0, cz, w, d, s * 0.9);
    parts.push(...moved(windowPiece(0.24, 0.3), wx, 0.12 + k * floor + floor * 0.5, wz, FACE[f]));
  }
  // the rooftop garden and a water tank
  parts.push(part(bevelBox(1.0, 0.1, 0.6, 0.02), 0x8a6a4a, { pos: [-0.4, 0.12 + h + 0.12, cz - 0.3], pattern: PAT.boards }));
  for (let i = 0; i < 4; i++) parts.push(...shrub(-0.75 + i * 0.23, cz - 0.3, 0.09, FLOWERS[i]).map(g => g.translate(0, 0.12 + h + 0.15, 0)));
  parts.push(part(cyl(0.18, 0.18, 0.32, 10), 0xb9b2a4, { pos: [0.7, 0.12 + h + 0.3, cz - 0.4], pattern: PAT.boards }), part(cone(0.2, 0.12, 10), 0x8c847a, { pos: [0.7, 0.12 + h + 0.52, cz - 0.4] }));
  return merge(parts);
}

/** The bakery (level 1): a cream-painted shop with a striped awning, a bun on its sign, a bread rack and a bench. */
export function bakery(): THREE.BufferGeometry {
  const w = 1.4, d = 1.14, cz = -0.25, h = 1.0;
  const parts: Parts = [
    part(bevelBox(w + 0.06, 0.08, d + 0.06, 0.02), PAINT.stone, { pos: [0, 0.04, cz], pattern: PAT.stone }),
    part(box(w, h, d), 0xfbe9cf, { pos: [0, 0.08 + h / 2, cz], pattern: PAT.siding }),
    ...gableRoofBakery(w, d, cz, 0.08 + h),
  ];
  const [fx, fz] = onFace('s', 0, cz, w, d, 0);
  parts.push(...moved(shopFront(w - 0.12, 0.56, 0x8a5a3b, { door: 0.42 }), fx, 0.08, fz));
  // the bun on the sign: a round golden loaf with a cross
  parts.push(part(sphere(0.07, 10, 6), 0xd9963d, { pos: [fx - 0.1, 0.08 + 0.89, fz + 0.09], scale: [1.4, 0.8, 0.6] }), part(box(0.12, 0.012, 0.02), 0xf6e2b8, { pos: [fx - 0.1, 0.08 + 0.92, fz + 0.13] }));
  // a rack of loaves under the awning
  parts.push(part(bevelBox(0.42, 0.04, 0.16, 0.01), 0x8a5a3b, { pos: [-0.2, 0.22, fz + 0.2], pattern: PAT.boards }));
  for (let i = 0; i < 4; i++) parts.push(part(sphere(0.045, 7, 4), i % 2 ? 0xc98a3d : 0xe0a85a, { pos: [-0.35 + i * 0.1, 0.27, fz + 0.2], scale: [1.4, 0.8, 0.9] }));
  parts.push(part(box(0.03, 0.2, 0.14), 0x8a5a3b, { pos: [-0.4, 0.1, fz + 0.2] }), part(box(0.03, 0.2, 0.14), 0x8a5a3b, { pos: [0.0, 0.1, fz + 0.2] }));
  parts.push(part(bevelBox(0.36, 0.035, 0.12, 0.01), 0x2f6f7a, { pos: [0.55, 0.14, 0.66], pattern: PAT.boards }), ...[-1, 1].map(s => part(box(0.03, 0.14, 0.1), METAL, { pos: [0.55 + s * 0.15, 0.07, 0.66] })));
  for (const s of [-1, 1]) {
    const [wx, wz] = onFace('e', 0, cz, w, d, s * 0.25);
    parts.push(...moved(windowPiece(0.24, 0.28), wx, 0.48, wz, FACE.e));
  }
  parts.push(...shrub(-0.82, 0.55, 0.09, FLOWERS[1]));
  return merge(parts);
}

function gableRoofBakery(w: number, d: number, cz: number, y: number): Parts {
  // a low hipped roof in warm terracotta with a little chimney for the ovens
  const parts: Parts = [part(bevelBox(w + 0.12, 0.06, d + 0.12, 0.02), TRIM, { pos: [0, y + 0.03, cz] })];
  const g = new THREE.CylinderGeometry(0.04, Math.SQRT1_2, 1, 4, 1);
  g.rotateY(Math.PI / 4);
  parts.push(part(g, PAINT.roofs[1]!, { pos: [0, y + 0.06 + 0.18, cz], scale: [w + 0.16, 0.36, d + 0.16], pattern: PAT.tiles }));
  parts.push(part(box(0.18, 0.4, 0.18), PAINT.brick, { pos: [0.4, y + 0.3, cz - 0.2], pattern: PAT.brick }), part(cyl(0.03, 0.03, 0.06, 6), 0x5a5f66, { pos: [0.4, y + 0.53, cz - 0.2] }));
  return parts;
}

/** The bookshop (level 2): a deep green wooden front, two windows of stacked books, a reading bench, a book on its sign. */
export function bookshop(): THREE.BufferGeometry {
  const w = 1.42, d = 1.16, cz = -0.25, h = 1.34;
  const parts: Parts = [
    part(bevelBox(w + 0.06, 0.08, d + 0.06, 0.02), PAINT.stone, { pos: [0, 0.04, cz], pattern: PAT.stone }),
    part(box(w, h, d), PAINT.brick, { pos: [0, 0.08 + h / 2, cz], pattern: PAT.brick }),
    ...flatRoof(0, cz, w, d, 0.08 + h, PAINT.stone, 0.1),
  ];
  const [fx, fz] = onFace('s', 0, cz, w, d, 0);
  parts.push(part(box(w - 0.06, 0.66, 0.05), 0x2f5a4a, { pos: [fx, 0.08 + 0.33, fz + 0.025], pattern: PAT.boards }));
  for (const s of [-1, 1]) {
    parts.push(part(box(0.42, 0.36, 0.03), PAINT.glass, { pos: [fx + s * 0.38, 0.44, fz + 0.055], pattern: PAT.glass }));
    // stacks of books in the window
    for (let i = 0; i < 4; i++) parts.push(part(box(0.07, 0.14 + (i % 3) * 0.04, 0.05), [0xe25c4a, 0x3f8fd0, 0xffc23d, 0x5fbf7a][i]!, { pos: [fx + s * 0.38 - 0.13 + i * 0.085, 0.32 + (i % 3) * 0.02, fz + 0.03] }));
  }
  parts.push(...moved(doorPiece(0xe9d6a8, 0.2, 0.5, { step: true, glassTop: true }), fx, 0.08, fz + 0.03));
  parts.push(part(box(w + 0.02, 0.14, 0.08), 0x2f5a4a, { pos: [fx, 0.08 + 0.74, fz + 0.04] }));
  parts.push(part(box(0.22, 0.08, 0.02), 0xf6efe0, { pos: [fx - 0.08, 0.08 + 0.74, fz + 0.09] }), part(box(0.005, 0.08, 0.025), 0x2f5a4a, { pos: [fx - 0.08, 0.08 + 0.74, fz + 0.09] }));
  parts.push(part(box(0.3, 0.06, 0.02), WHITE, { pos: [fx + 0.25, 0.08 + 0.74, fz + 0.09], pattern: tinted(PAT.none) }));
  for (const s of [-1, 0, 1]) {
    const [wx, wz] = onFace('s', 0, cz, w, d, s * 0.45);
    parts.push(...moved(windowPiece(0.24, 0.3, { flowers: s !== 0 }), wx, 1.1, wz));
  }
  parts.push(part(bevelBox(0.4, 0.035, 0.12, 0.01), WOOD_FRAME, { pos: [-0.45, 0.14, 0.62], pattern: PAT.boards }), ...[-1, 1].map(s => part(box(0.03, 0.14, 0.1), METAL, { pos: [-0.45 + s * 0.17, 0.07, 0.62] })));
  parts.push(part(box(0.14, 0.1, 0.1), 0xe25c4a, { pos: [-0.5, 0.21, 0.62] }));
  return merge(parts);
}

/** The market hall (level 3): two storeys, three arched stalls with striped awnings, flats above, a clock. */
export function market(): THREE.BufferGeometry {
  const w = 1.6, d = 1.3, cz = -0.2, h = 2.0, base = 0.1;
  const parts: Parts = [
    part(bevelBox(w + 0.06, base, d + 0.06, 0.02), PAINT.stone, { pos: [0, base / 2, cz], pattern: PAT.stone }),
    part(box(w, h, d), PAINT.stone, { pos: [0, base + h / 2, cz], pattern: PAT.stone }),
    part(box(w + 0.03, 0.06, d + 0.03), TRIM, { pos: [0, base + 0.86, cz] }),
    ...flatRoof(0, cz, w, d, base + h, TRIM, 0.12),
  ];
  const [fx, fz] = onFace('s', 0, cz, w, d, 0);
  for (const s of [-1, 0, 1]) {
    const x = fx + s * 0.5;
    parts.push(part(box(0.4, 0.5, 0.04), 0x5a4636, { pos: [x, base + 0.3, fz + 0.02] }));
    parts.push(part(cyl(0.2, 0.2, 0.045, 12, ), 0x5a4636, { pos: [x, base + 0.55, fz + 0.02], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.8] }));
    parts.push(part(box(0.44, 0.03, 0.26), WHITE, { pos: [x, base + 0.62, fz + 0.13], rot: [0.38, 0, 0], pattern: tinted(PAT.stripes) }));
    // a stall's goods: fruit, flowers or fish (no fish: rolls of cloth)
    const goods = [[0xe2453a, 0xffb33d, 0x8fd06a], [0xff7a8a, 0xffd34d, 0xb59cff], [0x3f8fd0, 0xf6f0e2, 0x5fbf7a]][s + 1]!;
    for (let i = 0; i < 3; i++) parts.push(part(sphere(0.045, 6, 4), goods[i]!, { pos: [x - 0.1 + i * 0.1, base + 0.2, fz + 0.12] }));
    parts.push(part(bevelBox(0.36, 0.06, 0.14, 0.01), 0xd2a26e, { pos: [x, base + 0.14, fz + 0.12], pattern: PAT.boards }));
  }
  for (let f = 0; f < 2; f++) for (const s of [-1, -0.33, 0.33, 1]) {
    const [wx, wz] = onFace('s', 0, cz, w, d, s * 0.6);
    parts.push(...moved(windowPiece(0.22, 0.32, { flowers: f === 0 }), wx, base + 1.18 + f * 0.5, wz));
  }
  for (const f of ['e', 'w'] as const) for (const y of [0.5, 1.2, 1.7]) {
    const [wx, wz] = onFace(f, 0, cz, w, d, 0);
    parts.push(...moved(windowPiece(0.26, 0.3), wx, base + y, wz, FACE[f]));
  }
  // the clock on the parapet
  parts.push(part(bevelBox(0.4, 0.4, 0.08, 0.02), TRIM, { pos: [0, base + h + 0.3, cz + d / 2 - 0.02] }), part(cyl(0.14, 0.14, 0.03, 16), 0xfffbe8, { pos: [0, base + h + 0.3, cz + d / 2 + 0.03], rot: [Math.PI / 2, 0, 0], pattern: PAT.glow }));
  parts.push(part(box(0.012, 0.1, 0.01), 0x2f3540, { pos: [0, base + h + 0.33, cz + d / 2 + 0.05] }), part(box(0.07, 0.012, 0.01), 0x2f3540, { pos: [0.03, base + h + 0.3, cz + d / 2 + 0.05] }));
  return merge(parts);
}
