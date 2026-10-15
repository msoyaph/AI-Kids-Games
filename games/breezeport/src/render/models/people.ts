/**
 * The townsfolk: one small rounded figure (about 0.4 tiles tall) for everyone, built facing south.
 * Every vertex says which colour it takes (shirt, trousers, hair, skin, shoes: the `pattern`
 * attribute) and which limb it belongs to (`limb`: 1–2 legs, 3–4 arms), so the shader can dress each
 * citizen from a palette and swing their arms and legs as they walk. One draw call for the whole town.
 */
import * as THREE from 'three';
import { box, cyl, merge, part, sphere } from '../geo';

/** Colour channels (in `pattern`). */
export const CH = { shirt: 1, pants: 2, hair: 3, skin: 4, shoes: 5 } as const;
/** Limbs (in `limb`) and the heights they swing from. */
export const HIP_Y = 0.19, SHOULDER_Y = 0.315;

const W = 0xffffff;

function withLimb(g: THREE.BufferGeometry, limb: number): THREE.BufferGeometry {
  g.setAttribute('limb', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(limb), 1));
  return g;
}

/** `low`: fewer facets for the Low tier (the same shape). */
export function citizen(low = false): THREE.BufferGeometry {
  const s = low ? 0.6 : 1;
  const n = (k: number) => Math.max(4, Math.round(k * s));
  const leg = (x: number, limb: number) => withLimb(merge([
    part(cyl(0.027, 0.024, 0.15, n(5)), W, { pos: [x, HIP_Y - 0.075, 0], pattern: CH.pants }),
    part(box(0.05, 0.035, 0.075), W, { pos: [x, 0.018, 0.012], pattern: CH.shoes }),
  ], { ao: false }), limb);
  const arm = (x: number, limb: number) => withLimb(merge([
    part(cyl(0.02, 0.018, 0.1, n(5)), W, { pos: [x, SHOULDER_Y - 0.05, 0], pattern: CH.shirt }),
    part(sphere(0.02, n(5), n(3)), W, { pos: [x, SHOULDER_Y - 0.12, 0.004], pattern: CH.skin }),
  ], { ao: false }), limb);
  const body = withLimb(merge([
    part(cyl(0.054, 0.06, 0.14, n(8)), W, { pos: [0, HIP_Y + 0.06, 0], scale: [1, 1, 0.75], pattern: CH.shirt }),
    part(sphere(0.054, n(8), n(3)), W, { pos: [0, HIP_Y + 0.13, 0], scale: [1, 0.45, 0.75], pattern: CH.shirt }),
    part(cyl(0.058, 0.058, 0.04, n(8)), W, { pos: [0, HIP_Y - 0.005, 0], scale: [1, 1, 0.78], pattern: CH.pants }),
    // the head: a round face with dot eyes and rosy cheeks, and a cap of hair
    part(sphere(0.06, n(9), n(6)), W, { pos: [0, 0.39, 0.004], round: true, pattern: CH.skin }),
    ...[-1, 1].map(k => part(sphere(0.009, 4, 2), 0x2e2a28, { pos: [k * 0.022, 0.398, 0.058] })),
    ...[-1, 1].map(k => part(sphere(0.011, 4, 2), 0xf29a9a, { pos: [k * 0.036, 0.378, 0.05], scale: [1, 0.6, 0.4] })),
    part(sphere(0.064, n(9), n(5)), W, { pos: [0, 0.405, -0.008], scale: [1.02, 0.92, 1], round: true, pattern: CH.hair }),
    part(sphere(0.035, n(6), n(3)), W, { pos: [0.012, 0.44, 0.035], scale: [1.6, 0.5, 0.9], rot: [0.3, 0, -0.2], pattern: CH.hair }),
  ], { ao: false }), 0);
  return mergeWithLimbs([body, leg(-0.03, 1), leg(0.03, 2), arm(-0.072, 3), arm(0.072, 4)]);
}

/** merge() drops extra attributes, so the limbs are merged here with theirs kept. */
function mergeWithLimbs(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const names = ['position', 'normal', 'color', 'pattern', 'limb'] as const;
  const sizes = { position: 3, normal: 3, color: 3, pattern: 1, limb: 1 };
  let total = 0;
  for (const p of parts) total += p.getAttribute('position').count;
  const g = new THREE.BufferGeometry();
  for (const name of names) {
    const out = new Float32Array(total * sizes[name]);
    let off = 0;
    for (const p of parts) { out.set(p.getAttribute(name).array as Float32Array, off); off += p.getAttribute('position').count * sizes[name]; }
    g.setAttribute(name, new THREE.BufferAttribute(out, sizes[name]));
  }
  g.computeBoundingSphere();
  return g;
}

/** Clothes, hair and skin: each citizen picks one of each (seeded), so a crowd looks varied. */
export const LOOKS = {
  shirt: [0xe25c4a, 0x3f8fd0, 0xffc23d, 0x5fbf7a, 0xb08ae0, 0xff9fb8, 0x2fa3b0, 0xf6f0e2, 0xf28a3a, 0x4a5a8a],
  pants: [0x3b4a6b, 0x5a4636, 0x2f3540, 0x6f8fb0, 0x8a6a4a, 0x4a6a5a],
  hair: [0x2e2420, 0x5a3a24, 0x8a5a30, 0xd9a85a, 0xb0482e, 0x1e1e26],
  skin: [0xffd9b8, 0xf2c39b, 0xd9a07a, 0xb07a52, 0x8a5a3a, 0x6a4430],
  shoes: [0x2f3540, 0xf6f0e2, 0xe25c4a, 0x5a4636],
};
