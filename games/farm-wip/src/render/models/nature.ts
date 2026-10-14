/**
 * Low-poly nature, built in code: layered round trees (darker inside, lighter on top), pines, cheap
 * far-off forest trees, bushes, mossy rocks, logs and stumps with toadstools, reeds and cattails,
 * and lily pads. Each model sits on y = 0 with its base centred on x = z = 0, sized in tile units.
 * Canopies have round normals, so they shade softly.
 */
import type * as THREE from 'three';
import * as T from 'three';
import { cone, cyl, dodec, ico, merge, PAT, part, sphere } from '../geo';
import type { SeasonPalette } from '../palette';
import { mixHex } from '../palette';
import { mushrooms } from './buildings';

const TRUNK = 0x8a5a3b;

/**
 * A round tree: a bark trunk with a little root flare, and a canopy of soft blobs in three shades.
 * `fine` (near the farm) uses rounder blobs; the woods further out use the lighter version.
 */
export function roundTree(pal: SeasonPalette, variant: 0 | 1 = 0, fine = true, neutral = false): THREE.BufferGeometry {
  const leaf = neutral ? NEUTRAL.mid : variant ? pal.leafAlt : pal.leaf;
  const dark = neutral ? NEUTRAL.dark : mixHex(leaf, 0x1f3a1a, 0.32), light = neutral ? NEUTRAL.light : mixHex(leaf, 0xfff6c8, 0.16);
  const tall = variant ? 1.12 : 1;
  const d = fine ? 1 : 0;
  return merge([
    part(cyl(0.085, 0.13, 0.8 * tall, fine ? 7 : 5), TRUNK, { pos: [0, 0.4 * tall, 0], pattern: PAT.bark }),
    ...(fine ? [part(cone(0.2, 0.14, 7), TRUNK, { pos: [0, 0.06, 0] })] : []),
    part(ico(0.5, d), dark, { pos: [0, 1.0 * tall, -0.04], scale: [1, 0.85, 1], round: true }),
    part(ico(0.38, d), leaf, { pos: [0.26, 1.12 * tall, 0.12], round: true }),
    part(ico(0.36, 0), leaf, { pos: [-0.25, 1.08 * tall, 0.1], round: true }),
    part(ico(0.34, 0), leaf, { pos: [0.02, 1.32 * tall, -0.14], round: true }),
    part(ico(0.28, d), light, { pos: [0.05, 1.46 * tall, 0.1], round: true }),
  ]);
}

export function pineTree(pal: SeasonPalette): THREE.BufferGeometry {
  const light = mixHex(pal.pine, 0xfff6c8, 0.14);
  return merge([
    part(cyl(0.07, 0.11, 0.45, 6), TRUNK, { pos: [0, 0.22, 0], pattern: PAT.bark }),
    part(cone(0.55, 0.75, 8), mixHex(pal.pine, 0x10241a, 0.2), { pos: [0, 0.7, 0] }),
    part(cone(0.43, 0.65, 8), pal.pine, { pos: [0, 1.08, 0], rot: [0, 0.3, 0] }),
    part(cone(0.3, 0.55, 8), light, { pos: [0, 1.44, 0], rot: [0, 0.6, 0] }),
  ]);
}

/** A cheap tree for the far woods: a trunk and two blobs. */
export function forestTree(pal: SeasonPalette, variant: 0 | 1, neutral = false): THREE.BufferGeometry {
  const leaf = variant ? pal.leafAlt : pal.leaf;
  return merge([
    part(cyl(0.08, 0.11, 0.6, 5), TRUNK, { pos: [0, 0.3, 0], pattern: PAT.keep }),
    part(ico(0.55, 0), neutral ? NEUTRAL.dark : mixHex(leaf, 0x1f3a1a, 0.22), { pos: [0, 0.95, 0], scale: [1, 0.9, 1], round: true }),
    part(ico(0.36, 0), neutral ? NEUTRAL.light : mixHex(leaf, 0xfff6c8, 0.1), { pos: [0.08, 1.35, 0.06], round: true }),
  ]);
}

/**
 * Canopy shades for trees whose colour comes from the instance (one layer, many looks): the colour is
 * the tint, these are the shades. `tintFor` turns a leaf colour into that tint.
 */
export const NEUTRAL = { dark: 0xc0c0c0, mid: 0xf0f0f0, light: 0xffffff };
export function tintFor(leaf: number): number {
  const c = new T.Color(leaf), m = new T.Color(NEUTRAL.mid);
  return new T.Color(Math.min(1, c.r / m.r), Math.min(1, c.g / m.g), Math.min(1, c.b / m.b)).getHex();
}

export function bush(pal: SeasonPalette, flowers = 0): THREE.BufferGeometry {
  const dark = mixHex(pal.leaf, 0x1f3a1a, 0.25);
  const parts = [
    part(ico(0.3, 1), dark, { pos: [0, 0.2, 0], scale: [1.1, 0.75, 1], round: true }),
    part(ico(0.22, 0), pal.leaf, { pos: [0.2, 0.22, 0.1], round: true }),
    part(ico(0.2, 0), mixHex(pal.leaf, 0xfff6c8, 0.12), { pos: [-0.1, 0.32, 0.12], round: true }),
  ];
  if (flowers) for (let i = 0; i < 6; i++) {
    const a = i * 2.4;
    parts.push(part(new T.OctahedronGeometry(0.035, 0), flowers, { pos: [Math.cos(a) * 0.24, 0.26 + (i % 3) * 0.06, Math.sin(a) * 0.2 + 0.05] }));
  }
  return merge(parts);
}

export function rock(): THREE.BufferGeometry {
  return merge([
    part(dodec(0.24), 0x9a948a, { pos: [0, 0.12, 0], scale: [1.25, 0.72, 1], pattern: PAT.moss }),
    part(dodec(0.14), 0xa9a399, { pos: [0.22, 0.07, 0.12], rot: [0.4, 0.3, 0], pattern: PAT.moss }),
    part(dodec(0.07), 0xa29c92, { pos: [-0.2, 0.04, 0.16], rot: [0.2, 0.9, 0] }),
  ]);
}

export function log(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.14, 0.15, 0.9, 9), TRUNK, { pos: [0, 0.14, 0], rot: [0, 0, Math.PI / 2], pattern: PAT.moss }),
    part(cyl(0.11, 0.11, 0.02, 9), 0xd2a26e, { pos: [0.455, 0.14, 0], rot: [0, 0, Math.PI / 2] }),
    part(cyl(0.11, 0.11, 0.02, 9), 0xd2a26e, { pos: [-0.455, 0.14, 0], rot: [0, 0, Math.PI / 2] }),
    ...mushrooms(0.2, 0.18, 0, 3),
  ]);
}

export function stump(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.16, 0.2, 0.2, 9), TRUNK, { pos: [0, 0.1, 0], pattern: PAT.bark }),
    part(cyl(0.15, 0.15, 0.02, 9), 0xd2a26e, { pos: [0, 0.205, 0] }),
    part(cyl(0.07, 0.07, 0.022, 9), 0xb8875a, { pos: [0, 0.207, 0] }),
    ...[0, 2.1, 4.2].map(a => part(cone(0.06, 0.18, 4), TRUNK, { pos: [Math.cos(a) * 0.18, 0.04, Math.sin(a) * 0.18], rot: [Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3] })),
    ...mushrooms(-0.2, 0.12, 0, 2),
  ]);
}

/** Reeds and cattails at the water's edge. */
export function reeds(): THREE.BufferGeometry {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const a = i * 1.3, r = 0.06 + (i % 3) * 0.06, h = 0.45 + (i % 4) * 0.12;
    parts.push(part(cone(0.025, h, 3), i % 2 ? 0x6f9e48 : 0x5f8f3e, { pos: [Math.cos(a) * r, h / 2, Math.sin(a) * r], rot: [Math.sin(a) * 0.18, 0, Math.cos(a) * 0.18] }));
    if (i % 3 === 0 && i < 6) {
      parts.push(part(cone(0.01, h + 0.15, 3), 0x6f9e48, { pos: [Math.cos(a) * r * 0.6, (h + 0.15) / 2, Math.sin(a) * r * 0.6] }));
      parts.push(part(cyl(0.028, 0.028, 0.14, 5), 0x7a4e2e, { pos: [Math.cos(a) * r * 0.6, h + 0.08, Math.sin(a) * r * 0.6] }));
    }
  }
  return merge(parts);
}

/** A lily pad (a disc with a notch), sometimes with a flower. */
export function lilyPad(flower: boolean): THREE.BufferGeometry {
  const pad = new T.CircleGeometry(0.16, 12, 0.35, Math.PI * 2 - 0.7).rotateX(-Math.PI / 2);
  const parts = [part(pad, 0x5f9e45, { pos: [0, 0.005, 0] }), part(new T.CircleGeometry(0.1, 10, 0.35, Math.PI * 2 - 0.7).rotateX(-Math.PI / 2), 0x74b452, { pos: [0, 0.008, 0] })];
  if (flower) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      parts.push(part(sphere(0.035, 5, 3), 0xffc2d8, { pos: [Math.cos(a) * 0.04 + 0.03, 0.035, Math.sin(a) * 0.04], scale: [1, 0.6, 1.6], rot: [0, -a, 0.5] }));
    }
    parts.push(part(sphere(0.025, 5, 3), 0xffe27a, { pos: [0.03, 0.05, 0] }));
  }
  return merge(parts, { ao: false });
}

export function grassTuft(pal: SeasonPalette): THREE.BufferGeometry {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6;
    parts.push(part(cone(0.05, 0.22, 4), pal.wildAlt, { pos: [Math.cos(a) * 0.07, 0.1, Math.sin(a) * 0.07], rot: [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3] }));
  }
  return merge(parts);
}

export function flowerTuft(pal: SeasonPalette, color: number): THREE.BufferGeometry {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1, r = 0.09;
    parts.push(part(cyl(0.012, 0.012, 0.18, 4), pal.wildAlt, { pos: [Math.cos(a) * r, 0.09, Math.sin(a) * r] }));
    parts.push(part(ico(0.05, 0), color, { pos: [Math.cos(a) * r, 0.19, Math.sin(a) * r] }));
  }
  return merge(parts);
}

