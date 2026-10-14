/**
 * Low-poly nature, built in code: round trees, pines, bushes, rocks, reeds and little tufts of grass
 * and flowers. Each model sits on y = 0 with its base centred on x = z = 0, sized in tile units.
 */
import type * as THREE from 'three';
import { box, cone, cyl, dodec, ico, merge, part } from '../geo';
import type { SeasonPalette } from '../palette';

const TRUNK = 0x8a5a3b;

export function roundTree(pal: SeasonPalette, variant: 0 | 1 = 0): THREE.BufferGeometry {
  const leaf = variant ? pal.leafAlt : pal.leaf;
  return merge([
    part(cyl(0.09, 0.13, 0.7, 6), TRUNK, { pos: [0, 0.35, 0] }),
    part(ico(0.48, 0), leaf, { pos: [0, 0.95, 0], scale: [1, 0.9, 1] }),
    part(ico(0.32, 0), leaf, { pos: [0.22, 1.25, 0.08], rot: [0.3, 0.5, 0] }),
    part(ico(0.28, 0), leaf, { pos: [-0.2, 1.18, -0.1], rot: [0.2, 1.1, 0] }),
  ]);
}

export function pineTree(pal: SeasonPalette): THREE.BufferGeometry {
  return merge([
    part(cyl(0.07, 0.1, 0.4, 6), TRUNK, { pos: [0, 0.2, 0] }),
    part(cone(0.5, 0.7, 7), pal.pine, { pos: [0, 0.65, 0] }),
    part(cone(0.38, 0.6, 7), pal.pine, { pos: [0, 1.0, 0] }),
    part(cone(0.25, 0.5, 7), pal.pine, { pos: [0, 1.32, 0] }),
  ]);
}

export function bush(pal: SeasonPalette): THREE.BufferGeometry {
  return merge([
    part(ico(0.3, 0), pal.leaf, { pos: [0, 0.22, 0], scale: [1, 0.75, 1] }),
    part(ico(0.22, 0), pal.leaf, { pos: [0.2, 0.18, 0.08], rot: [0, 0.7, 0] }),
  ]);
}

export function rock(): THREE.BufferGeometry {
  return merge([
    part(dodec(0.22), 0x9a948a, { pos: [0, 0.12, 0], scale: [1.2, 0.7, 1] }),
    part(dodec(0.13), 0xaaa49a, { pos: [0.2, 0.07, 0.1], rot: [0.4, 0.3, 0] }),
  ]);
}

export function reeds(): THREE.BufferGeometry {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3, r = 0.12 + (i % 2) * 0.08;
    parts.push(part(box(0.035, 0.45 + (i % 3) * 0.1, 0.035), 0x6f9e48, { pos: [Math.cos(a) * r, 0.25, Math.sin(a) * r], rot: [Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15] }));
    if (i % 2 === 0) parts.push(part(cyl(0.035, 0.035, 0.12, 5), 0x7a4e2e, { pos: [Math.cos(a) * r, 0.5 + (i % 3) * 0.1, Math.sin(a) * r] }));
  }
  return merge(parts);
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
