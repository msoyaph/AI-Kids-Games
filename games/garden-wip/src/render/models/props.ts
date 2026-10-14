// Small things drawn many times, all outlined: compost pickups (a leafy ball of compost floating in
// a soft green-gold glow; round, with no rays), berries in flight with their trails, poof leaves
// and sparkles, grass tufts, meadow flowers, and the lane umbrellas.
import * as THREE from 'three';
import { ball, build, buildOutlined, capsule, cone, cyl, torus, type Piece } from '../geo';
import type { Model } from './types';

/** Outline thickness for props (thinner than characters'). */
export const PROP_OUTLINE = 0.018;

/** A compost pickup: a round ball of rich compost hugged by two bright leaves, with a sprout on top. */
export function compost(): Model {
  const crumbs: Piece[] = [];
  for (const [x, y, z, r] of [[-0.1, 0.06, 0.13, 0.04], [0.11, -0.05, 0.12, 0.035], [0.02, -0.12, 0.1, 0.03]] as const) crumbs.push({ geo: ball(r, 6, 4), color: 0x8a5a35, at: [x, y, z], outline: false });
  const g = buildOutlined([
    { geo: ball(0.17, 16, 12), color: 0x5e3a22 },
    ...crumbs,
    { geo: ball(0.15, 12, 8), color: 0x8fe05a, at: [-0.14, 0.02, 0.06], rot: [0, 0.4, 0.9], scale: [1.4, 0.32, 0.8] },
    { geo: ball(0.15, 12, 8), color: 0x7ad24c, at: [0.14, 0.02, 0.05], rot: [0, -0.4, -0.9], scale: [1.4, 0.32, 0.8] },
    { geo: cyl(0.016, 0.02, 0.12, 6), color: 0x5fb33a, at: [0, 0.2, 0] },
    { geo: ball(0.06, 10, 6), color: 0xa6ec6c, at: [-0.05, 0.27, 0], rot: [0, 0, 0.6], scale: [1.4, 0.4, 0.8] },
    { geo: ball(0.06, 10, 6), color: 0xa6ec6c, at: [0.05, 0.27, 0], rot: [0, 0, -0.6], scale: [1.4, 0.4, 0.8] },
  ], PROP_OUTLINE);
  return { id: 'compost', parts: [{ ...g, pivot: [0, 0, 0] }], shadow: 0.24, height: 0.45, fill: 0x8fe05a };
}

/** The soft glow behind a compost pickup: a round halo, brightest in the middle. */
export function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(250,255,214,1)');
  grad.addColorStop(0.35, 'rgba(226,255,160,0.75)');
  grad.addColorStop(1, 'rgba(190,255,140,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A rowan berry with a glint and a leaf, outlined. */
export function berry(): { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null } {
  return buildOutlined([
    { geo: ball(0.09, 12, 10), color: 0xff5a4c },
    { geo: ball(0.028, 6, 4), color: 0xffe0d8, at: [-0.035, 0.04, 0.06], outline: false },
    { geo: cone(0.035, 0.08, 5), color: 0x5fb33a, at: [0.07, 0.06, 0], rot: [0, 0, -0.9], scale: [1, 1, 0.45] },
  ], PROP_OUTLINE);
}

/** One puff of a berry's trail (drawn a few times, smaller and paler behind it). */
export function trail(): THREE.BufferGeometry {
  return build([{ geo: ball(0.06, 8, 6), color: 0xffffff }]);
}

/** A poof leaf. */
export function leaf(): THREE.BufferGeometry {
  return build([{ geo: ball(0.07, 8, 4), color: 0xffffff, scale: [1.5, 0.14, 0.85] }]);
}

/** A sparkle: a little four-pointed star. */
export function sparkle(): THREE.BufferGeometry {
  return build([
    { geo: cone(0.03, 0.12, 4), color: 0xffffff, at: [0, 0.06, 0] },
    { geo: cone(0.03, 0.12, 4), color: 0xffffff, at: [0, -0.06, 0], rot: [Math.PI, 0, 0] },
    { geo: cone(0.03, 0.12, 4), color: 0xffffff, at: [0.06, 0, 0], rot: [0, 0, -Math.PI / 2] },
    { geo: cone(0.03, 0.12, 4), color: 0xffffff, at: [-0.06, 0, 0], rot: [0, 0, Math.PI / 2] },
  ]);
}

/** A grass tuft: four lush blades. */
export function tuft(): THREE.BufferGeometry {
  return build([
    { geo: cone(0.045, 0.26, 4), color: 0x5cbc3c, at: [0, 0.12, 0], rot: [0.1, 0, 0.15] },
    { geo: cone(0.04, 0.2, 4), color: 0x86dc58, at: [0.05, 0.09, 0.02], rot: [0, 0, -0.4] },
    { geo: cone(0.04, 0.2, 4), color: 0x3d9a2a, at: [-0.05, 0.09, -0.01], rot: [-0.2, 0, 0.45] },
    { geo: cone(0.035, 0.18, 4), color: 0x86dc58, at: [0.0, 0.08, 0.05], rot: [0.5, 0, 0] },
  ]);
}

/** A meadow flower on a short stem (the instance colour tints the petals). */
export function flower(): { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null } {
  const petals: Piece[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    petals.push({ geo: ball(0.05, 8, 6), color: 0xffffff, at: [Math.cos(a) * 0.06, 0.26, Math.sin(a) * 0.06], scale: [1.25, 0.4, 0.85], rot: [0, -a, 0] });
  }
  return buildOutlined([
    { geo: cyl(0.01, 0.012, 0.26, 4), color: 0x4f9e2c, at: [0, 0.13, 0], outline: false },
    ...petals,
    { geo: ball(0.035, 8, 6), color: 0xffd23a, at: [0, 0.28, 0], outline: false },
  ], PROP_OUTLINE);
}

/** A lane's picnic umbrella, closed, in its little stand. Opens once (fwump!) as the last line. */
export function umbrellaClosed(): { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null } {
  const stripes: Piece[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    stripes.push({ geo: cone(0.075, 0.5, 3), color: i % 2 ? 0xfff6e6 : 0xff4f5e, at: [Math.cos(a) * 0.06, 0.6, Math.sin(a) * 0.06], rot: [0, -a, 0], outline: false });
  }
  return buildOutlined([
    { geo: cyl(0.13, 0.17, 0.1, 12), color: 0x9a5f34, at: [0, 0.05, 0] },
    { geo: cyl(0.024, 0.024, 0.95, 6), color: 0xfff6e6, at: [0, 0.5, 0] },
    { geo: cone(0.13, 0.52, 10), color: 0xff4f5e, at: [0, 0.6, 0] },
    ...stripes,
    { geo: ball(0.05, 8, 6), color: 0xffd23a, at: [0, 0.9, 0] },
    { geo: torus(0.07, 0.016, 4, 10), color: 0xfff6e6, at: [0, 0.4, 0], rot: [Math.PI / 2, 0, 0], outline: false },
    { geo: capsule(0.02, 0.1, 2, 6), color: 0x9a5f34, at: [0, 0.05, 0.14], rot: [Math.PI / 2, 0, 0], outline: false },
  ], PROP_OUTLINE);
}
