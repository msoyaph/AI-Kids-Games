/**
 * Crop models, built in code: one merged geometry per crop and growth stage (0 sprout, 1 young,
 * 2 grown, 3 ready). A field shows a small patch of plants. Ready crops always show their harvest
 * (heads of grain, fruit, flowers, a cabbage head…), so readiness never depends on colour alone.
 */
import type * as THREE from 'three';
import type { CropDef } from '../../data/crops';
import { bevelBox, box, cone, cyl, ico, merge, part, prism, sphere } from '../geo';
import { mixHex } from '../palette';

const SPROUT = 0x8fd06a;
/** The three ridges of a field run east–west; plants stand on them. */
const ROWS = [-0.28, 0, 0.28];
/** Where the plants of a patch stand inside a tile (centred on 0,0): three on each ridge. */
const SPOTS4: [number, number][] = ROWS.flatMap(z => [-0.27, 0, 0.27].map(x => [x + (z === 0 ? 0.04 : 0), z] as [number, number]));
/** The grains and flowers stand closer: five on each ridge. */
const SPOTS6: [number, number][] = ROWS.flatMap(z => [-0.32, -0.16, 0, 0.16, 0.32].map(x => [x + (z === 0 ? 0.05 : 0), z] as [number, number]));

type Parts = THREE.BufferGeometry[];

function sprout(parts: Parts, spots: [number, number][], s = 1) {
  for (const [x, z] of spots) {
    parts.push(part(cone(0.04 * s, 0.14 * s, 4), SPROUT, { pos: [x - 0.025, 0.07 * s, z], rot: [0, 0, 0.5] }));
    parts.push(part(cone(0.04 * s, 0.14 * s, 4), SPROUT, { pos: [x + 0.025, 0.07 * s, z], rot: [0, 0, -0.5] }));
  }
}

function grain(c: CropDef, stage: number, parts: Parts) {
  const h = [0, 0.3, 0.5, 0.62][stage]!;
  const ripe = stage === 3;
  const stalk = ripe ? mixHex(c.color.leaf, c.color.crop, 0.6) : c.color.leaf;
  for (const [i, [x, z]] of SPOTS6.entries()) for (const [k, [dx, dz]] of ([[-0.04, 0], [0.04, 0.03], [0, -0.04]] as const).entries()) {
    const hh = h * (0.88 + ((i + k) % 3) * 0.08);
    parts.push(part(box(0.022, hh, 0.022), stalk, { pos: [x + dx, hh / 2, z + dz], rot: [dz * 2, 0, -dx * 2] }));
    if (stage >= 2) parts.push(part(cone(0.034, 0.16, 5), ripe ? c.color.crop : mixHex(c.color.leaf, c.color.crop, 0.3), { pos: [x + dx * 1.6, hh + 0.06, z + dz * 1.6], rot: [ripe ? 0.3 : 0.05, 0, -dx * 3] }));
    if (k === 0) parts.push(part(cone(0.02, 0.18, 3), c.color.leaf, { pos: [x + 0.03, hh * 0.45, z], rot: [0, 0, -0.7] }));
  }
}

function bush(c: CropDef, stage: number, parts: Parts) {
  // a low rosette of leaves (not a ball), flowers while growing, fruit sitting on top when ripe
  const r = [0, 0.085, 0.115, 0.125][stage]!;
  for (const [i, [x, z]] of SPOTS4.entries()) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + i;
      parts.push(part(sphere(r * 0.62, 6, 3), mixHex(c.color.leaf, 0x2f6a2a, (k % 2) * 0.18), { pos: [x + Math.cos(a) * r * 0.55, r * 0.45, z + Math.sin(a) * r * 0.55], scale: [1.3, 0.5, 0.9], rot: [0.3, -a, 0] }));
    }
    parts.push(part(sphere(r * 0.5, 6, 4), c.color.leaf, { pos: [x, r * 0.75, z], scale: [1, 0.7, 1] }));
    if (stage === 3) {
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + x * 3;
        parts.push(part(sphere(0.045, 7, 5), c.color.crop, { pos: [x + Math.cos(a) * r * 0.7, r * 0.95, z + Math.sin(a) * r * 0.7], scale: [1, 1.15, 1] }));
      }
    } else if (stage === 2 && c.color.accent) for (let k = 0; k < 2; k++) parts.push(part(sphere(0.026, 5, 3), c.color.accent, { pos: [x + (k ? 0.05 : -0.04), r * 1.05, z + (k ? -0.03 : 0.04)] }));
  }
}

function leafy(c: CropDef, stage: number, parts: Parts) {
  const big = c.price >= 20; // cabbage: four big heads per field
  const spots: [number, number][] = big ? [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] : SPOTS4;
  const s = (big ? 1.45 : 0.95) * [0, 0.7, 1, 1.12][stage]!;
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
  const h = [0, 0.18, 0.3, 0.34][stage]!;
  for (const [x, z] of SPOTS4) {
    for (const t of [-0.25, 0, 0.25]) parts.push(part(cone(0.018, h, 4), c.color.leaf, { pos: [x + t * 0.08, h / 2 + 0.04, z], rot: [0, 0, t] }));
    if (stage >= 2) parts.push(part(sphere(stage === 3 ? 0.07 : 0.05, 7, 5), c.color.crop, { pos: [x, 0.04, z], scale: [1, 0.85, 1] }));
  }
}

function vine(c: CropDef, stage: number, parts: Parts) {
  const spread = [0, 0.18, 0.3, 0.34][stage]!;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.3, rr = spread * (i % 2 ? 0.75 : 1);
    parts.push(part(sphere(0.1, 7, 4), mixHex(c.color.leaf, 0x2f6a2a, (i % 3) * 0.12), { pos: [Math.cos(a) * rr, 0.07 + (i % 2) * 0.04, Math.sin(a) * rr], scale: [1.25, 0.42, 1.25], rot: [0.2 * Math.sin(a), a, 0.2 * Math.cos(a)] }));
  }
  if (stage >= 1) parts.push(part(sphere(0.1, 7, 4), c.color.leaf, { pos: [0, 0.12, 0], scale: [1.3, 0.55, 1.3] }));
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
  const h = [0, 0.2, 0.34, 0.42][stage]!;
  const leek = c.id === 'leek';
  for (const [x, z] of SPOTS4) {
    for (const t of [-0.3, 0, 0.3]) {
      parts.push(part(cyl(0.018, 0.022, h, 5), stage === 3 || leek ? c.color.crop : mixHex(c.color.leaf, c.color.crop, 0.4), { pos: [x + t * 0.1, h / 2, z], rot: [0, 0, t * 0.5] }));
      parts.push(part(sphere(leek ? 0.04 : 0.07, 6, 3), c.color.leaf, { pos: [x + t * 0.17, h + 0.02, z], scale: [1.2, 0.45, 1] }));
    }
  }
}

function flower(c: CropDef, stage: number, parts: Parts) {
  const h = [0, 0.2, 0.34, 0.4][stage]!;
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
  const h = [0, 0.26, 0.46, 0.56][stage]!;
  for (const [x, z] of SPOTS4) {
    parts.push(part(cyl(0.02, 0.025, h, 5), mixHex(c.color.leaf, 0x6b5a3a, 0.3), { pos: [x, h / 2, z] }));
    parts.push(part(ico(0.085, 1), c.color.leaf, { pos: [x, h * 0.62, z], scale: [1, 0.85, 1], round: true }));
    parts.push(part(ico(0.06, 0), mixHex(c.color.leaf, 0xffffff, 0.12), { pos: [x, h * 0.9, z], round: true }));
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

/** A field's soil: a tilled bed with three rounded ridges and a neat raised edge (darker and glossy-wet when watered). */
export function soilModel(wet: boolean): THREE.BufferGeometry {
  const base = wet ? 0x5a3e2a : 0x8f6745;
  const ridge = wet ? 0x6a4a32 : 0xa77b54;
  const edge = wet ? 0x664632 : 0x9c7350;
  const parts = [part(bevelBox(0.96, 0.06, 0.96, 0.025), base, { pos: [0, 0.03, 0] })];
  for (const z of ROWS) parts.push(part(prism(0.86, 0.22, 0.06), ridge, { pos: [0, 0.055, z] }));
  for (const [x, z, w, d] of [[0, -0.455, 0.96, 0.05], [0, 0.455, 0.96, 0.05], [-0.455, 0, 0.05, 0.86], [0.455, 0, 0.05, 0.86]] as const) {
    parts.push(part(box(w, 0.035, d), edge, { pos: [x, 0.075, z] }));
  }
  // a few clods (and little puddles when wet)
  for (const [x, z] of [[-0.3, -0.14], [0.22, 0.15], [0.05, -0.15], [-0.12, 0.42]] as const) parts.push(part(ico(0.026, 0), ridge, { pos: [x, 0.065, z] }));
  if (wet) for (const [x, z] of [[0.18, -0.14], [-0.24, 0.14]] as const) parts.push(part(cyl(0.05, 0.05, 0.004, 8), 0x7f9aa8, { pos: [x, 0.062, z], scale: [1.4, 1, 0.8] }));
  return merge(parts, { ao: false });
}

/** The readiness badge for "shape badges" (colour-blind) mode: a white disc with a tick. */
export function readyBadge(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.13, 0.13, 0.03, 12), 0xffffff, { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0] }),
    part(box(0.05, 0.13, 0.04), 0x3f8f4f, { pos: [0.03, 0, 0.02], rot: [0, 0, -0.6] }),
    part(box(0.04, 0.07, 0.04), 0x3f8f4f, { pos: [-0.04, -0.02, 0.02], rot: [0, 0, 0.8] }),
  ], { ao: false });
}

