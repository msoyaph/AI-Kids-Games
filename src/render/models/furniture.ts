// Furniture models, centered on their footprint (w x d tiles), front facing +z.
import * as THREE from 'three';
import type { FurnitureInfo } from '../../data/types';
import { darken } from './character';
import { box, cone, cyl, ico, merge, part, sphere, torus } from './geo';

type G = THREE.BufferGeometry;
const geoCache = new Map<string, G>();

function lighten(c: number, t: number): number {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return (Math.round(r + (255 - r) * t) << 16) | (Math.round(g + (255 - g) * t) << 8) | Math.round(b + (255 - b) * t);
}

const WOOD = 0xc9945f;
const DARK = 0x6f6a8a;
const GLOW = 0xffe6a0;

/** Returns [solid geometry, optional glowing geometry]. */
export function furnitureGeo(id: string, f: FurnitureInfo): [G, G | null] {
  const key = id;
  const hit = geoCache.get(key);
  if (hit) return [hit, geoCache.get(key + ':glow') ?? null];
  const W = f.w * 0.92, D = f.d * 0.92;
  const c = f.color, c2 = f.color2;
  const P: G[] = [];
  const L: G[] = [];
  const legs = (h: number, inset = 0.08, col = darken(c, 0.2), r = 0.035) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(part(cyl(r, r, h, 5), col, { pos: [sx * (W / 2 - inset), h / 2, sz * (D / 2 - inset)] }));
  };
  switch (f.model) {
    case 'table':
    case 'desk':
      P.push(part(box(W, 0.08, D), c, { pos: [0, 0.68, 0] }));
      legs(0.64);
      if (f.model === 'desk') P.push(part(box(W * 0.4, 0.22, D * 0.8), c2, { pos: [W * 0.22, 0.5, 0] }), part(box(0.2, 0.25, 0.15), lighten(c2, 0.4), { pos: [-W * 0.25, 0.85, 0] }));
      else P.push(part(cyl(0.08, 0.06, 0.12, 6), c2, { pos: [0, 0.78, 0] }));
      break;
    case 'chair':
      P.push(part(box(0.55, 0.08, 0.55), c, { pos: [0, 0.42, 0.02] }), part(box(0.55, 0.55, 0.08), c2, { pos: [0, 0.72, -0.24] }));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(part(cyl(0.03, 0.03, 0.42, 4), darken(c, 0.2), { pos: [sx * 0.22, 0.21, sz * 0.22] }));
      break;
    case 'stool':
      P.push(part(cyl(0.26, 0.26, 0.08, 9), c, { pos: [0, 0.42, 0] }), part(cyl(0.2, 0.24, 0.38, 7), c2, { pos: [0, 0.2, 0] }));
      break;
    case 'bed':
      P.push(part(box(W, 0.3, D), c, { pos: [0, 0.2, 0] }), part(box(W * 0.94, 0.12, D * 0.62), c2, { pos: [0, 0.4, D * 0.16] }));
      P.push(part(box(W * 0.6, 0.12, 0.3), 0xffffff, { pos: [0, 0.42, -D / 2 + 0.25] }), part(box(W, 0.6, 0.1), darken(c, 0.15), { pos: [0, 0.45, -D / 2] }));
      break;
    case 'lamp':
      P.push(part(cyl(0.16, 0.2, 0.06, 8), c2, { pos: [0, 0.03, 0] }), part(cyl(0.025, 0.025, 1.0, 5), DARK, { pos: [0, 0.53, 0] }));
      P.push(part(cone(0.25, 0.3, 8), c, { pos: [0, 1.1, 0] }));
      L.push(part(sphere(0.09, 6, 4), GLOW, { pos: [0, 0.95, 0] }));
      break;
    case 'rug':
      P.push(part(box(W, 0.03, D), c, { pos: [0, 0.015, 0] }), part(box(W * 0.75, 0.035, D * 0.7), c2, { pos: [0, 0.02, 0] }));
      break;
    case 'shelf':
    case 'bookcase':
      P.push(part(box(W, 1.3, 0.4), c, { pos: [0, 0.65, -D / 2 + 0.22] }));
      for (let k = 0; k < 3; k++) {
        P.push(part(box(W * 0.9, 0.04, 0.34), darken(c, 0.15), { pos: [0, 0.3 + k * 0.38, -D / 2 + 0.25] }));
        for (let b = 0; b < (f.model === 'bookcase' ? 5 : 2); b++)
          P.push(part(box(0.1, 0.26, 0.24), [c2, lighten(c2, 0.4), darken(c2, 0.3), 0xf6a5a5, 0x9fd3f0][b % 5]!, { pos: [-W * 0.35 + b * (W * 0.16), 0.45 + k * 0.38, -D / 2 + 0.26] }));
      }
      break;
    case 'plant':
    case 'vase':
      P.push(part(cyl(0.18, 0.13, 0.3, 8), c2, { pos: [0, 0.15, 0] }));
      if (f.model === 'plant') P.push(part(ico(0.28, 0), c, { pos: [0, 0.55, 0] }), part(ico(0.2, 0), lighten(c, 0.2), { pos: [0.12, 0.72, 0.05] }));
      else P.push(part(cyl(0.012, 0.012, 0.3, 3), 0x6fb56a, { pos: [0, 0.45, 0] }), part(ico(0.1, 0), c, { pos: [0, 0.62, 0] }), part(ico(0.08, 0), lighten(c, 0.3), { pos: [0.08, 0.55, 0] }));
      break;
    case 'sofa':
    case 'cushion':
      if (f.model === 'cushion') {
        P.push(part(cyl(0.3, 0.32, 0.18, 8), c, { pos: [0, 0.09, 0] }), part(sphere(0.06, 6, 4), c2, { pos: [0, 0.19, 0] }));
        break;
      }
      P.push(part(box(W, 0.32, D * 0.8), c, { pos: [0, 0.26, 0.05] }), part(box(W, 0.45, 0.2), c, { pos: [0, 0.5, -D / 2 + 0.12] }));
      P.push(part(box(0.18, 0.32, D * 0.8), darken(c, 0.08), { pos: [-W / 2 + 0.09, 0.42, 0.05] }), part(box(0.18, 0.32, D * 0.8), darken(c, 0.08), { pos: [W / 2 - 0.09, 0.42, 0.05] }));
      P.push(part(box(W * 0.4, 0.1, D * 0.55), c2, { pos: [-W * 0.2, 0.47, 0.08] }), part(box(W * 0.4, 0.1, D * 0.55), c2, { pos: [W * 0.2, 0.47, 0.08] }));
      break;
    case 'lantern':
      P.push(part(box(0.3, 0.06, 0.3), DARK, { pos: [0, 0.03, 0] }), part(box(0.3, 0.06, 0.3), DARK, { pos: [0, 0.62, 0] }), part(cone(0.2, 0.2, 4), c2, { pos: [0, 0.75, 0], rot: [0, Math.PI / 4, 0] }));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(part(box(0.03, 0.56, 0.03), DARK, { pos: [sx * 0.13, 0.33, sz * 0.13] }));
      L.push(part(box(0.22, 0.46, 0.22), lighten(c, 0.5), { pos: [0, 0.33, 0] }));
      break;
    case 'streetlamp':
      P.push(part(cyl(0.12, 0.16, 0.12, 8), DARK, { pos: [0, 0.06, 0] }), part(cyl(0.04, 0.05, 1.9, 6), c2, { pos: [0, 1.0, 0] }), part(cone(0.26, 0.24, 6), c, { pos: [0, 2.25, 0] }));
      L.push(part(sphere(0.16, 8, 6), GLOW, { pos: [0, 2.0, 0] }));
      break;
    case 'bench':
      P.push(part(box(W, 0.07, 0.4), c, { pos: [0, 0.42, 0.05] }), part(box(W, 0.3, 0.06), c, { pos: [0, 0.68, -0.17] }));
      for (const sx of [-1, 1]) P.push(part(box(0.06, 0.42, 0.4), c2, { pos: [sx * (W / 2 - 0.08), 0.21, 0.05] }));
      break;
    case 'fence':
      P.push(part(box(W, 0.06, 0.05), c, { pos: [0, 0.45, 0] }), part(box(W, 0.06, 0.05), c, { pos: [0, 0.22, 0] }));
      for (let k = 0; k < 3; k++) P.push(part(box(0.08, 0.6, 0.06), c2, { pos: [-W / 2 + 0.08 + k * (W - 0.16) / 2, 0.3, 0] }), part(cone(0.06, 0.08, 4), c2, { pos: [-W / 2 + 0.08 + k * (W - 0.16) / 2, 0.64, 0], rot: [0, Math.PI / 4, 0] }));
      break;
    case 'clock':
      P.push(part(box(0.38, 1.5, 0.28), c, { pos: [0, 0.75, -0.2] }), part(cyl(0.15, 0.15, 0.04, 12), 0xfffaf0, { pos: [0, 1.2, -0.05], rot: [Math.PI / 2, 0, 0] }), part(box(0.02, 0.1, 0.02), DARK, { pos: [0, 1.24, -0.02] }), part(sphere(0.06, 6, 4), c2, { pos: [0, 0.6, -0.04] }));
      break;
    case 'dresser':
    case 'wardrobe': {
      const hgt = f.model === 'wardrobe' ? 1.6 : 0.9;
      P.push(part(box(W, hgt, 0.5), c, { pos: [0, hgt / 2, -D / 2 + 0.28] }));
      const rows = f.model === 'wardrobe' ? 1 : 3;
      for (let k = 0; k < rows; k++) P.push(part(box(W * 0.85, hgt / rows - 0.08, 0.04), c2, { pos: [0, 0.05 + (k + 0.5) * (hgt / rows), -D / 2 + 0.54] }), part(sphere(0.03, 5, 4), 0xf5d36b, { pos: [0, 0.05 + (k + 0.5) * (hgt / rows), -D / 2 + 0.57] }));
      break;
    }
    case 'box':
    case 'barrel':
      if (f.model === 'barrel') P.push(part(cyl(0.3, 0.3, 0.7, 10), c, { pos: [0, 0.35, 0] }), part(torus(0.3, 0.025, 4, 12), c2, { pos: [0, 0.2, 0], rot: [Math.PI / 2, 0, 0] }), part(torus(0.3, 0.025, 4, 12), c2, { pos: [0, 0.5, 0], rot: [Math.PI / 2, 0, 0] }));
      else P.push(part(box(0.6, 0.5, 0.6), c, { pos: [0, 0.25, 0] }), part(box(0.64, 0.06, 0.64), c2, { pos: [0, 0.52, 0] }));
      break;
    case 'fountain':
    case 'well':
      if (f.model === 'well') {
        P.push(part(cyl(0.6, 0.65, 0.6, 10), c, { pos: [0, 0.3, 0] }), part(cyl(0.48, 0.48, 0.05, 10), 0x7fc4e0, { pos: [0, 0.52, 0] }));
        for (const sx of [-1, 1]) P.push(part(box(0.08, 1.2, 0.08), WOOD, { pos: [sx * 0.55, 0.9, 0] }));
        P.push(part(cone(0.85, 0.4, 4), c2, { pos: [0, 1.65, 0], rot: [0, Math.PI / 4, 0] }));
      } else {
        P.push(part(cyl(W * 0.48, W * 0.52, 0.35, 12), c, { pos: [0, 0.17, 0] }), part(cyl(W * 0.42, W * 0.42, 0.05, 12), 0x8fd3ea, { pos: [0, 0.33, 0] }));
        P.push(part(cyl(0.12, 0.18, 0.9, 8), c, { pos: [0, 0.6, 0] }), part(cyl(0.38, 0.2, 0.15, 10), c2, { pos: [0, 1.05, 0] }), part(sphere(0.12, 6, 5), 0xbfe8f5, { pos: [0, 1.22, 0] }));
      }
      break;
    case 'statue':
    case 'trophy':
      if (f.model === 'trophy') {
        P.push(part(box(0.4, 0.2, 0.4), DARK, { pos: [0, 0.1, 0] }), part(cyl(0.05, 0.08, 0.3, 6), c, { pos: [0, 0.35, 0] }), part(cyl(0.22, 0.08, 0.3, 10), c, { pos: [0, 0.65, 0] }));
        P.push(part(torus(0.1, 0.025, 4, 10, Math.PI), c, { pos: [0.22, 0.68, 0], rot: [0, 0, -Math.PI / 2] }), part(torus(0.1, 0.025, 4, 10, Math.PI), c, { pos: [-0.22, 0.68, 0], rot: [0, 0, Math.PI / 2] }));
      } else {
        P.push(part(box(W * 0.8, 0.35, D * 0.8), c2, { pos: [0, 0.17, 0] }), part(ico(0.35, 1), c, { pos: [0, 0.75, 0], scale: [1, 1.15, 0.9] }), part(ico(0.22, 1), c, { pos: [0, 1.25, 0.05] }), part(cone(0.08, 0.2, 4), c, { pos: [0.12, 1.45, 0] }), part(cone(0.08, 0.2, 4), c, { pos: [-0.12, 1.45, 0] }));
      }
      break;
    case 'sign':
      P.push(part(box(0.08, 1.0, 0.08), WOOD, { pos: [0, 0.5, 0] }), part(box(0.7, 0.32, 0.06), c, { pos: [0.1, 0.85, 0.05], rot: [0, 0, -0.05] }), part(box(0.6, 0.28, 0.06), c2, { pos: [-0.08, 0.5, 0.05], rot: [0, 0, 0.06] }));
      break;
    case 'arch':
      for (const sx of [-1, 1]) P.push(part(box(0.1, 1.6, 0.1), c, { pos: [sx * (W / 2 - 0.1), 0.8, 0] }));
      P.push(part(torus(W / 2 - 0.1, 0.06, 4, 14, Math.PI), c, { pos: [0, 1.6, 0] }));
      for (let k = 0; k < 9; k++) {
        const a = (k / 8) * Math.PI;
        P.push(part(ico(0.1, 0), [c2, lighten(c2, 0.4), 0x8fd18a][k % 3]!, { pos: [Math.cos(a) * (W / 2 - 0.1), 1.6 + Math.sin(a) * (W / 2 - 0.1), 0.05] }));
      }
      break;
    case 'planter':
      P.push(part(box(W * 0.9, 0.35, D * 0.7), c2, { pos: [0, 0.17, 0] }));
      for (let k = 0; k < 4; k++) P.push(part(ico(0.1, 0), [c, lighten(c, 0.4), 0xffe066, 0xf6a5b5][k]!, { pos: [-W * 0.3 + k * W * 0.2, 0.45, 0] }), part(cyl(0.012, 0.012, 0.15, 3), 0x6fb56a, { pos: [-W * 0.3 + k * W * 0.2, 0.37, 0] }));
      break;
    case 'bonfire':
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        P.push(part(ico(0.1, 0), c, { pos: [Math.cos(a) * 0.3, 0.06, Math.sin(a) * 0.3] }));
      }
      P.push(part(cyl(0.04, 0.04, 0.5, 4), WOOD, { pos: [0, 0.1, 0], rot: [0, 0, Math.PI / 2.4] }), part(cyl(0.04, 0.04, 0.5, 4), WOOD, { pos: [0, 0.1, 0], rot: [Math.PI / 2.4, 0, 0] }));
      L.push(part(cone(0.16, 0.42, 6), c2, { pos: [0, 0.32, 0] }), part(cone(0.09, 0.3, 5), 0xffe27a, { pos: [0.05, 0.3, 0.04] }));
      break;
    case 'tank':
      P.push(part(box(W * 0.9, 0.45, 0.5), DARK, { pos: [0, 0.22, -D / 2 + 0.3] }));
      P.push(part(box(W * 0.85, 0.5, 0.45), 0xa8e3f0, { pos: [0, 0.72, -D / 2 + 0.3] }), part(ico(0.06, 0), c2, { pos: [-0.1, 0.72, -D / 2 + 0.3] }), part(ico(0.05, 0), c, { pos: [0.15, 0.62, -D / 2 + 0.3] }));
      break;
    case 'easel':
      P.push(part(cyl(0.025, 0.025, 1.3, 4), WOOD, { pos: [-0.2, 0.62, 0], rot: [0, 0, 0.15] }), part(cyl(0.025, 0.025, 1.3, 4), WOOD, { pos: [0.2, 0.62, 0], rot: [0, 0, -0.15] }), part(box(0.6, 0.5, 0.04), 0xfffaf0, { pos: [0, 0.9, 0.04], rot: [-0.12, 0, 0] }), part(ico(0.12, 0), c, { pos: [-0.08, 0.92, 0.08], scale: [1, 1, 0.2] }), part(ico(0.1, 0), c2, { pos: [0.12, 0.8, 0.08], scale: [1, 1, 0.2] }));
      break;
    case 'piano':
      P.push(part(box(W, 0.9, 0.55), c, { pos: [0, 0.6, -D / 2 + 0.3] }), part(box(W, 0.06, 0.22), 0xffffff, { pos: [0, 0.75, -D / 2 + 0.65] }), part(box(W, 0.12, 0.25), c, { pos: [0, 0.7, -D / 2 + 0.66] }));
      for (let k = 0; k < 6; k++) P.push(part(box(0.05, 0.04, 0.12), 0x2c2433, { pos: [-W / 2 + 0.2 + k * (W - 0.4) / 5, 0.8, -D / 2 + 0.6] }));
      legs(0.3);
      break;
    case 'tv':
      P.push(part(box(0.7, 0.4, 0.4), c2, { pos: [0, 0.2, 0] }), part(box(0.8, 0.55, 0.3), c, { pos: [0, 0.68, -0.05] }));
      L.push(part(box(0.62, 0.42, 0.02), 0x9fe3f0, { pos: [0, 0.68, 0.11] }));
      break;
    case 'kettle':
    case 'stove':
      if (f.model === 'stove') P.push(part(box(0.8, 0.85, 0.7), c, { pos: [0, 0.42, 0] }), part(box(0.6, 0.3, 0.04), DARK, { pos: [0, 0.4, 0.36] }), part(cyl(0.12, 0.12, 0.03, 8), DARK, { pos: [-0.18, 0.86, 0] }), part(cyl(0.12, 0.12, 0.03, 8), DARK, { pos: [0.18, 0.86, 0] }));
      else P.push(part(box(0.5, 0.6, 0.5), WOOD, { pos: [0, 0.3, 0] }), part(sphere(0.16, 8, 6), c, { pos: [0, 0.75, 0] }), part(cyl(0.02, 0.03, 0.15, 4), c, { pos: [0.18, 0.8, 0], rot: [0, 0, -0.8] }), part(torus(0.09, 0.015, 4, 8, Math.PI), c2, { pos: [0, 0.88, 0] }));
      break;
    case 'sundial':
      P.push(part(cyl(0.12, 0.18, 0.7, 8), c2, { pos: [0, 0.35, 0] }), part(cyl(0.32, 0.32, 0.06, 12), c, { pos: [0, 0.72, 0] }), part(cone(0.15, 0.2, 3), DARK, { pos: [0, 0.82, 0], rot: [0, 0, 0], scale: [0.2, 1, 1] }));
      break;
    case 'windchime':
      P.push(part(cyl(0.025, 0.025, 1.5, 4), WOOD, { pos: [0, 0.75, -0.2] }), part(box(0.04, 0.04, 0.4), WOOD, { pos: [0, 1.5, -0.02] }), part(cyl(0.15, 0.15, 0.04, 8), c2, { pos: [0, 1.38, 0.12] }));
      for (let k = 0; k < 4; k++) P.push(part(cyl(0.015, 0.015, 0.3 - k * 0.04, 4), c, { pos: [-0.08 + k * 0.055, 1.2, 0.12] }));
      break;
    case 'mushroom':
      P.push(part(cyl(0.08, 0.12, 0.45, 6), 0xfff4e6, { pos: [0, 0.22, 0] }));
      L.push(part(new THREE.SphereGeometry(0.32, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), c, { pos: [0, 0.42, 0] }));
      P.push(part(sphere(0.05, 5, 4), c2, { pos: [0.12, 0.62, 0.12] }));
      break;
    case 'picnic':
      P.push(part(box(W, 0.03, D), c, { pos: [0, 0.015, 0] }));
      for (let k = 0; k < 4; k++) P.push(part(box(W / 4 - 0.02, 0.035, D * 0.95), k % 2 ? c2 : c, { pos: [-W / 2 + (k + 0.5) * (W / 4), 0.018, 0] }));
      P.push(part(box(0.4, 0.25, 0.3), WOOD, { pos: [0.2, 0.15, -0.1] }), part(ico(0.08, 0), 0xf27c7c, { pos: [-0.3, 0.08, 0.2] }), part(cyl(0.12, 0.12, 0.04, 8), 0xffffff, { pos: [-0.2, 0.05, -0.2] }));
      break;
    case 'globe':
    case 'telescope':
      if (f.model === 'globe') P.push(part(cyl(0.12, 0.18, 0.5, 6), WOOD, { pos: [0, 0.25, 0] }), part(ico(0.26, 1), c, { pos: [0, 0.75, 0] }), part(torus(0.3, 0.02, 4, 12), c2, { pos: [0, 0.75, 0], rot: [0.4, 0, 0] }));
      else P.push(part(cyl(0.02, 0.02, 1.0, 4), DARK, { pos: [-0.15, 0.48, 0], rot: [0, 0, 0.3] }), part(cyl(0.02, 0.02, 1.0, 4), DARK, { pos: [0.15, 0.48, 0], rot: [0, 0, -0.3] }), part(cyl(0.02, 0.02, 1.0, 4), DARK, { pos: [0, 0.48, -0.15], rot: [0.3, 0, 0] }), part(cyl(0.07, 0.1, 0.8, 8), c, { pos: [0, 1.05, 0.1], rot: [-1.0, 0, 0] }), part(torus(0.1, 0.02, 4, 8), c2, { pos: [0, 1.25, 0.38], rot: [-1.0, 0, 0] }));
      break;
    case 'hammock':
      for (const sx of [-1, 1]) P.push(part(cyl(0.05, 0.06, 1.3, 5), WOOD, { pos: [sx * (W / 2 - 0.1), 0.65, 0] }));
      P.push(part(new THREE.CylinderGeometry(0.4, 0.4, W - 0.3, 10, 1, true, Math.PI, Math.PI), c, { pos: [0, 0.75, 0], rot: [0, 0, Math.PI / 2] }));
      P.push(part(box(0.2, 0.08, 0.3), c2, { pos: [-W / 2 + 0.6, 0.5, 0] }));
      break;
    case 'flag':
      P.push(part(cyl(0.03, 0.04, 2.0, 5), DARK, { pos: [0, 1.0, 0] }), part(box(0.6, 0.35, 0.02), c, { pos: [0.31, 1.75, 0] }), part(box(0.3, 0.35, 0.025), c2, { pos: [0.16, 1.75, 0] }), part(sphere(0.05, 5, 4), 0xffd166, { pos: [0, 2.02, 0] }));
      break;
    case 'birdhouse':
      P.push(part(cyl(0.035, 0.04, 1.2, 4), WOOD, { pos: [0, 0.6, 0] }), part(box(0.3, 0.32, 0.3), c, { pos: [0, 1.32, 0] }), part(cone(0.28, 0.2, 4), c2, { pos: [0, 1.58, 0], rot: [0, Math.PI / 4, 0] }), part(cyl(0.05, 0.05, 0.02, 8), 0x3a2a2a, { pos: [0, 1.35, 0.16], rot: [Math.PI / 2, 0, 0] }));
      break;
    case 'frame':
      P.push(part(box(0.7, 0.55, 0.06), c, { pos: [0, 1.0, -D / 2 + 0.05] }), part(box(0.58, 0.43, 0.065), c2, { pos: [0, 1.0, -D / 2 + 0.06] }), part(box(0.04, 1.0, 0.04), WOOD, { pos: [0, 0.5, -D / 2 + 0.02] }));
      break;
    // ---- wall pieces: back against the wall at z = -D/2, centred around 1.45 high ----
    case 'painting': {
      const bz = -D / 2 + 0.04, fw = W * 0.94;
      P.push(part(box(fw, 0.86, 0.06), 0x9b6a4a, { pos: [0, 1.5, bz] }));
      P.push(part(box(fw - 0.14, 0.4, 0.065), lighten(c, 0.25), { pos: [0, 1.66, bz + 0.005] }), part(box(fw - 0.14, 0.34, 0.065), c2, { pos: [0, 1.29, bz + 0.005] }));
      P.push(part(cyl(0.1, 0.1, 0.07, 10), 0xffe27a, { pos: [fw * 0.25, 1.68, bz + 0.01], rot: [Math.PI / 2, 0, 0] }));
      if (id.includes('sunset')) P.push(part(box(0.24, 0.06, 0.07), 0x5b4a68, { pos: [-fw * 0.15, 1.44, bz + 0.012] }), part(cone(0.1, 0.22, 3), 0xfff6e6, { pos: [-fw * 0.15, 1.58, bz + 0.012] }));
      else P.push(part(sphere(0.18, 8, 6), darken(c, 0.15), { pos: [-fw * 0.2, 1.3, bz + 0.01], scale: [1.6, 0.6, 0.2] }));
      break;
    }
    case 'poster': {
      const bz = -D / 2 + 0.03;
      P.push(part(box(0.62, 0.84, 0.03), c, { pos: [0, 1.5, bz] }));
      for (let k = 0; k < 5; k++) P.push(part(sphere(0.05 + (k % 2) * 0.02, 6, 4), c2, { pos: [-0.18 + (k * 0.37) % 0.36, 1.25 + k * 0.11, bz + 0.02], scale: [1, 1, 0.3] }));
      for (const sx of [-1, 1]) P.push(part(box(0.1, 0.04, 0.035), 0xfff6e6, { pos: [sx * 0.27, 1.9, bz + 0.005], rot: [0, 0, sx * 0.6] }));
      break;
    }
    case 'wallclock': {
      const bz = -D / 2 + 0.05;
      const cuckoo = id.includes('cuckoo');
      if (cuckoo) {
        P.push(part(box(0.5, 0.55, 0.14), c, { pos: [0, 1.45, bz + 0.03] }), part(cone(0.42, 0.26, 4), darken(c, 0.25), { pos: [0, 1.85, bz + 0.03], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.4] }));
        P.push(part(cyl(0.15, 0.15, 0.03, 12), c2, { pos: [0, 1.42, bz + 0.11], rot: [Math.PI / 2, 0, 0] }), part(sphere(0.06, 6, 4), 0xffd166, { pos: [0, 1.68, bz + 0.12] }));
        for (const sx of [-1, 1]) P.push(part(cyl(0.012, 0.012, 0.4, 3), DARK, { pos: [sx * 0.1, 1.0, bz + 0.05] }), part(cone(0.04, 0.12, 5), 0xc9945f, { pos: [sx * 0.1, 0.76, bz + 0.05], rot: [Math.PI, 0, 0] }));
      } else {
        P.push(part(cyl(0.3, 0.3, 0.06, 16), c, { pos: [0, 1.5, bz], rot: [Math.PI / 2, 0, 0] }), part(cyl(0.24, 0.24, 0.065, 16), c2, { pos: [0, 1.5, bz + 0.01], rot: [Math.PI / 2, 0, 0] }));
        for (let k = 0; k < 8; k++) P.push(part(cone(0.06, 0.1, 3), c, { pos: [Math.cos((k / 8) * Math.PI * 2) * 0.38, 1.5 + Math.sin((k / 8) * Math.PI * 2) * 0.38, bz], rot: [0, 0, (k / 8) * Math.PI * 2 - Math.PI / 2] }));
      }
      const fz = cuckoo ? bz + 0.13 : bz + 0.05;
      const cy = cuckoo ? 1.42 : 1.5;
      P.push(part(box(0.025, 0.14, 0.02), DARK, { pos: [0, cy + 0.06, fz] }), part(box(0.1, 0.022, 0.02), DARK, { pos: [0.04, cy, fz] }));
      break;
    }
    case 'wallshelf': {
      const bz = -D / 2 + 0.16;
      P.push(part(box(W * 0.9, 0.06, 0.3), c, { pos: [0, 1.25, bz] }));
      for (const sx of [-1, 1]) P.push(part(box(0.05, 0.22, 0.22), darken(c, 0.2), { pos: [sx * W * 0.33, 1.12, bz - 0.03] }));
      const n = Math.max(2, Math.round(W * 2));
      for (let k = 0; k < n; k++) {
        const x = -W * 0.36 + (k * W * 0.72) / Math.max(1, n - 1);
        if (k % 2) P.push(part(cone(0.07, 0.1, 6), c2, { pos: [x, 1.33, bz], rot: [-1.3, 0, 0], scale: [1, 1, 0.6] }));
        else P.push(part(cyl(0.06, 0.06, 0.16, 7), lighten(c2, 0.3), { pos: [x, 1.36, bz] }), part(cyl(0.065, 0.065, 0.03, 7), darken(c, 0.3), { pos: [x, 1.45, bz] }));
      }
      break;
    }
    case 'wreath': {
      const bz = -D / 2 + 0.06;
      P.push(part(torus(0.24, 0.08, 6, 14), c, { pos: [0, 1.5, bz] }));
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        P.push(part(sphere(0.045, 5, 4), id.includes('berry') ? c2 : lighten(c, 0.3), { pos: [Math.cos(a) * 0.26, 1.5 + Math.sin(a) * 0.26, bz + 0.07] }));
      }
      P.push(part(cone(0.08, 0.14, 3), c2, { pos: [-0.07, 1.24, bz + 0.08], rot: [0, 0, Math.PI / 2] }), part(cone(0.08, 0.14, 3), c2, { pos: [0.07, 1.24, bz + 0.08], rot: [0, 0, -Math.PI / 2] }));
      break;
    }
    case 'sconce': {
      const bz = -D / 2 + 0.05;
      P.push(part(box(0.18, 0.3, 0.05), c2, { pos: [0, 1.5, bz] }), part(box(0.05, 0.05, 0.28), c2, { pos: [0, 1.62, bz + 0.15] }));
      P.push(part(box(0.24, 0.05, 0.24), c2, { pos: [0, 1.3, bz + 0.3] }), part(cone(0.18, 0.14, 4), c2, { pos: [0, 1.66, bz + 0.3], rot: [0, Math.PI / 4, 0] }));
      L.push(part(box(0.18, 0.28, 0.18), lighten(c, 0.4), { pos: [0, 1.46, bz + 0.3] }));
      break;
    }
    case 'kite': {
      const bz = -D / 2 + 0.04;
      P.push(part(box(0.5, 0.5, 0.03), c, { pos: [0, 1.6, bz], rot: [0, 0, Math.PI / 4], scale: [0.85, 1.2, 1] }));
      P.push(part(box(0.03, 0.78, 0.035), c2, { pos: [0, 1.6, bz + 0.01] }), part(box(0.56, 0.03, 0.035), c2, { pos: [0, 1.66, bz + 0.01] }));
      for (let k = 0; k < 3; k++) P.push(part(cone(0.05, 0.09, 3), [0xffd166, 0x7fb2ff, 0x8fd18a][k]!, { pos: [0.05 * (k % 2 ? 1 : -1), 1.08 - k * 0.14, bz + 0.02], rot: [0, 0, Math.PI / 2] }));
      break;
    }
    default:
      P.push(part(box(W * 0.8, 0.6, D * 0.8), c, { pos: [0, 0.3, 0] }));
  }
  const solid = merge(P);
  geoCache.set(key, solid);
  let glow: G | null = null;
  if (L.length) {
    glow = merge(L);
    geoCache.set(key + ':glow', glow);
  }
  return [solid, glow];
}
