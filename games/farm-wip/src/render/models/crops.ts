/**
 * Crop models, built in code: one merged geometry per crop and growth stage (0 sprout, 1 young,
 * 2 grown, 3 ready). A field shows a small patch of plants. Ready crops always show their harvest
 * (heads of grain, fruit, flowers, a cabbage head…), so readiness never depends on colour alone.
 */
import type * as THREE from 'three';
import type { CropDef } from '../../data/crops';
import { box, cone, cyl, ico, merge, part, sphere } from '../geo';
import { mixHex } from '../palette';

const SPROUT = 0x8fd06a;
/** Where the plants of a patch stand inside a tile (centred on 0,0). */
const SPOTS4: [number, number][] = [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]];
const SPOTS6: [number, number][] = [[-0.25, -0.22], [0, -0.22], [0.25, -0.22], [-0.25, 0.18], [0, 0.18], [0.25, 0.18]];

type Parts = THREE.BufferGeometry[];

function sprout(parts: Parts, spots: [number, number][], s = 1) {
  for (const [x, z] of spots) {
    parts.push(part(cone(0.04 * s, 0.14 * s, 4), SPROUT, { pos: [x - 0.025, 0.07 * s, z], rot: [0, 0, 0.5] }));
    parts.push(part(cone(0.04 * s, 0.14 * s, 4), SPROUT, { pos: [x + 0.025, 0.07 * s, z], rot: [0, 0, -0.5] }));
  }
}

function grain(c: CropDef, stage: number, parts: Parts) {
  const h = [0, 0.32, 0.48, 0.56][stage]!;
  const ripe = stage === 3;
  const stalk = ripe ? mixHex(c.color.leaf, c.color.crop, 0.6) : c.color.leaf;
  for (const [x, z] of SPOTS6) for (const [dx, dz] of [[-0.05, 0], [0.05, 0.03], [0, -0.05]] as const) {
    parts.push(part(box(0.025, h, 0.025), stalk, { pos: [x + dx, h / 2, z + dz] }));
    if (stage >= 2) parts.push(part(cone(0.035, 0.14, 5), ripe ? c.color.crop : mixHex(c.color.leaf, c.color.crop, 0.3), { pos: [x + dx, h + 0.06, z + dz], rot: [ripe ? 0.25 : 0, 0, 0] }));
  }
}

function bush(c: CropDef, stage: number, parts: Parts) {
  const r = [0, 0.11, 0.15, 0.16][stage]!;
  for (const [x, z] of SPOTS4) {
    parts.push(part(ico(r, 0), c.color.leaf, { pos: [x, r * 0.8, z], scale: [1, 0.75, 1] }));
    if (stage === 3) {
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + x * 3;
        parts.push(part(sphere(0.045, 6, 4), c.color.crop, { pos: [x + Math.cos(a) * r * 0.85, r * 0.75, z + Math.sin(a) * r * 0.85] }));
      }
    } else if (stage === 2 && c.color.accent) parts.push(part(sphere(0.03, 5, 3), c.color.accent, { pos: [x, r * 1.4, z] }));
  }
}

function leafy(c: CropDef, stage: number, parts: Parts) {
  const big = c.price >= 20; // cabbage: one big head per field
  const spots: [number, number][] = big ? [[0, 0]] : SPOTS4;
  const s = (big ? 2.1 : 1) * [0, 0.7, 1, 1.1][stage]!;
  for (const [x, z] of spots) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + x;
      parts.push(part(sphere(0.07 * s, 6, 3), c.color.leaf, { pos: [x + Math.cos(a) * 0.07 * s, 0.05 * s, z + Math.sin(a) * 0.07 * s], scale: [1.3, 0.45, 0.8], rot: [0, -a, 0.35] }));
    }
    if (stage === 3) parts.push(part(sphere(0.075 * s, 7, 5), c.color.crop, { pos: [x, 0.08 * s, z] }));
    if (stage === 3 && c.color.accent) parts.push(part(sphere(0.05 * s, 6, 4), c.color.accent, { pos: [x, 0.03 * s, z] }));
  }
}

function bulb(c: CropDef, stage: number, parts: Parts) {
  const h = [0, 0.16, 0.26, 0.3][stage]!;
  for (const [x, z] of SPOTS4) {
    for (const t of [-0.25, 0, 0.25]) parts.push(part(cone(0.018, h, 4), c.color.leaf, { pos: [x + t * 0.08, h / 2 + 0.04, z], rot: [0, 0, t] }));
    if (stage >= 2) parts.push(part(sphere(stage === 3 ? 0.07 : 0.05, 7, 5), c.color.crop, { pos: [x, 0.04, z], scale: [1, 0.85, 1] }));
  }
}

function vine(c: CropDef, stage: number, parts: Parts) {
  const spread = [0, 0.18, 0.3, 0.34][stage]!;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push(part(sphere(0.09, 6, 3), c.color.leaf, { pos: [Math.cos(a) * spread, 0.05, Math.sin(a) * spread], scale: [1.2, 0.4, 1.2] }));
  }
  if (stage >= 2 && c.color.accent) parts.push(part(sphere(0.04, 5, 3), c.color.accent, { pos: [0.1, 0.12, -0.12] }));
  if (stage === 3) {
    const big = c.price >= 40; // watermelon, pumpkin: one big fruit
    if (c.shape === 'vine' && c.id === 'pumpkin') {
      for (let i = 0; i < 6; i++) parts.push(part(sphere(0.2, 8, 6), c.color.crop, { pos: [Math.cos(i) * 0.05, 0.17, Math.sin(i) * 0.05], scale: [0.55, 1, 1], rot: [0, (i / 6) * Math.PI, 0] }));
      parts.push(part(cyl(0.025, 0.03, 0.1, 5), 0x6b8a3a, { pos: [0, 0.38, 0] }));
    } else if (big) parts.push(part(sphere(0.22, 9, 6), c.color.crop, { pos: [0, 0.16, 0], scale: [1.35, 0.8, 0.95] }));
    else {
      for (const [x, z] of [[-0.15, 0.08], [0.14, -0.1], [0.05, 0.18]] as const) parts.push(part(sphere(0.07, 7, 4), c.color.crop, { pos: [x, 0.07, z], scale: [c.id === 'squash' ? 1 : 1.8, 1, c.id === 'squash' ? 1.4 : 0.9] }));
    }
  }
}

function stalk(c: CropDef, stage: number, parts: Parts) {
  const h = [0, 0.18, 0.3, 0.36][stage]!;
  const leek = c.id === 'leek';
  for (const [x, z] of SPOTS4) {
    for (const t of [-0.3, 0, 0.3]) {
      parts.push(part(cyl(0.018, 0.022, h, 5), stage === 3 || leek ? c.color.crop : mixHex(c.color.leaf, c.color.crop, 0.4), { pos: [x + t * 0.1, h / 2, z], rot: [0, 0, t * 0.5] }));
      parts.push(part(sphere(leek ? 0.04 : 0.07, 6, 3), c.color.leaf, { pos: [x + t * 0.17, h + 0.02, z], scale: [1.2, 0.45, 1] }));
    }
  }
}

function flower(c: CropDef, stage: number, parts: Parts) {
  const h = [0, 0.18, 0.3, 0.34][stage]!;
  const lavender = c.id === 'lavender';
  for (const [x, z] of SPOTS6) {
    parts.push(part(box(0.02, h, 0.02), c.color.leaf, { pos: [x, h / 2, z] }));
    if (lavender) parts.push(part(sphere(0.07, 6, 3), c.color.leaf, { pos: [x, 0.06, z], scale: [1, 0.6, 1] }));
    if (stage >= 2) {
      if (lavender) parts.push(part(cyl(0.028, 0.02, 0.12, 5), stage === 3 ? c.color.crop : mixHex(c.color.leaf, c.color.crop, 0.4), { pos: [x, h + 0.04, z] }));
      else {
        const petal = stage === 3 ? c.color.crop : mixHex(c.color.leaf, c.color.crop, 0.5);
        parts.push(part(cyl(0.05, 0.05, 0.02, 7), petal, { pos: [x, h, z] }));
        if (c.color.accent) parts.push(part(sphere(0.022, 5, 3), c.color.accent, { pos: [x, h + 0.015, z] }));
      }
    }
  }
}

function tall(c: CropDef, stage: number, parts: Parts) {
  const h = [0, 0.22, 0.4, 0.46][stage]!;
  for (const [x, z] of SPOTS4) {
    parts.push(part(cyl(0.02, 0.025, h, 5), mixHex(c.color.leaf, 0x6b5a3a, 0.3), { pos: [x, h / 2, z] }));
    parts.push(part(ico(0.09, 0), c.color.leaf, { pos: [x, h * 0.65, z], scale: [1, 0.8, 1] }));
    if (stage === 3) {
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1;
        if (c.id === 'cotton') parts.push(part(ico(0.05, 1), c.color.crop, { pos: [x + Math.cos(a) * 0.07, h * 0.75 + i * 0.05, z + Math.sin(a) * 0.07] }));
        else parts.push(part(cone(0.025, 0.12, 5), c.color.crop, { pos: [x + Math.cos(a) * 0.07, h * 0.6, z + Math.sin(a) * 0.07], rot: [Math.PI, 0, 0] }));
      }
    } else if (stage === 2 && c.color.accent) parts.push(part(sphere(0.035, 5, 3), c.color.accent, { pos: [x, h, z] }));
  }
}

function paddy(c: CropDef, stage: number, parts: Parts) {
  const h = [0, 0.18, 0.3, 0.34][stage]!;
  parts.push(part(box(0.86, 0.02, 0.86), 0x7fc4d9, { pos: [0, 0.035, 0] }));
  for (const [x, z] of SPOTS6) for (const t of [-0.35, 0, 0.35]) {
    parts.push(part(box(0.016, h, 0.016), c.color.leaf, { pos: [x + t * 0.08, h / 2, z], rot: [0, 0, t * 0.6] }));
    if (stage === 3) parts.push(part(cone(0.025, 0.1, 4), c.color.crop, { pos: [x + t * 0.12, h - 0.02, z], rot: [0, 0, t + 0.6] }));
  }
}

function clover(c: CropDef, stage: number, parts: Parts) {
  const n = [0, 4, 7, 7][stage]!;
  for (let i = 0; i < n; i++) {
    const x = ((i * 0.37) % 0.7) - 0.33, z = ((i * 0.53) % 0.7) - 0.33;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + i;
      parts.push(part(sphere(0.045, 5, 3), c.color.leaf, { pos: [x + Math.cos(a) * 0.04, 0.06, z + Math.sin(a) * 0.04], scale: [1, 0.35, 1] }));
    }
    if (stage === 3) parts.push(part(sphere(0.04, 6, 4), c.color.crop, { pos: [x, 0.11, z] }));
  }
}

const SHAPES = { grain, bush, leafy, bulb, vine, stalk, flower, tall, paddy, clover };

/** The model for a crop at a stage (0 sprout … 3 ready). */
export function cropModel(c: CropDef, stage: 0 | 1 | 2 | 3): THREE.BufferGeometry {
  const parts: Parts = [];
  if (stage === 0) sprout(parts, c.shape === 'grain' || c.shape === 'flower' || c.shape === 'paddy' ? SPOTS6 : SPOTS4);
  else SHAPES[c.shape](c, stage, parts);
  return merge(parts);
}

/** A field's soil: a raised patch with furrows (darker when watered). */
export function soilModel(wet: boolean): THREE.BufferGeometry {
  const base = wet ? 0x6f4e33 : 0x9a7150;
  const ridge = wet ? 0x7d5a3d : 0xab8360;
  const parts = [part(box(0.9, 0.05, 0.9), base, { pos: [0, 0.025, 0] })];
  for (const z of [-0.3, -0.1, 0.1, 0.3]) parts.push(part(box(0.84, 0.03, 0.08), ridge, { pos: [0, 0.06, z] }));
  return merge(parts);
}

/** The readiness badge for "shape badges" (colour-blind) mode: a white disc with a tick. */
export function readyBadge(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.13, 0.13, 0.03, 12), 0xffffff, { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0] }),
    part(box(0.05, 0.13, 0.04), 0x3f8f4f, { pos: [0.03, 0, 0.02], rot: [0, 0, -0.6] }),
    part(box(0.04, 0.07, 0.04), 0x3f8f4f, { pos: [-0.04, -0.02, 0.02], rot: [0, 0, 0.8] }),
  ]);
}

