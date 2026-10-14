// Small things drawn many times: compost piles (with the earthworm that made them), berries in
// flight, poof leaves, grass tufts, meadow flowers, and the lane umbrellas.
import * as THREE from 'three';
import { ball, build, capsule, cone, cyl, torus, type Piece } from '../geo';
import type { Model } from './types';

/** A crumbly compost pile with a pink earthworm peeking out. Brown, on the ground: never a sun. */
export function compost(): Model {
  const crumbs: Piece[] = [];
  const spots: [number, number, number, number][] = [[0, 0.05, 0, 0.11], [-0.08, 0.035, 0.05, 0.07], [0.09, 0.03, 0.03, 0.07], [0.03, 0.03, -0.08, 0.07], [-0.05, 0.1, -0.02, 0.06], [0.04, 0.11, 0.03, 0.05]];
  spots.forEach(([x, y, z, r], i) => crumbs.push({ geo: ball(r, 8, 6), color: [0x5e3d26, 0x6f4a2e, 0x4f3220][i % 3]!, at: [x, y, z], scale: [1, 0.75, 1] }));
  const g = build([
    ...crumbs,
    { geo: ball(0.025, 6, 4), color: 0x7bc35a, at: [-0.02, 0.17, 0.02] },
    { geo: ball(0.02, 6, 4), color: 0xa3d977, at: [0.05, 0.15, -0.01] },
    // the worm
    { geo: capsule(0.024, 0.11, 3, 8), color: 0xe79a9a, at: [0.11, 0.09, 0.07], rot: [0, 0, -0.35] },
    { geo: ball(0.028, 8, 6), color: 0xeea7a5, at: [0.135, 0.16, 0.075] },
    { geo: ball(0.007, 5, 4), color: 0x2a1d17, at: [0.125, 0.17, 0.1] },
    { geo: ball(0.007, 5, 4), color: 0x2a1d17, at: [0.15, 0.17, 0.1] },
  ]);
  return { id: 'compost', parts: [{ geo: g, pivot: [0, 0, 0] }], shadow: 0.18, height: 0.2 };
}

/** A rowan berry with its little leaf. */
export function berry(): THREE.BufferGeometry {
  return build([
    { geo: ball(0.055, 10, 8), color: 0xe2382c },
    { geo: ball(0.016, 6, 4), color: 0xffd1c4, at: [-0.02, 0.03, 0.04] },
    { geo: cone(0.022, 0.05, 5), color: 0x4f9a46, at: [0.04, 0.04, 0], rot: [0, 0, -0.9], scale: [1, 1, 0.4] },
  ]);
}

/** A poof leaf (critters shooed away turn into a little burst of these). */
export function leaf(): THREE.BufferGeometry {
  return build([{ geo: ball(0.05, 8, 4), color: 0xffffff, scale: [1.5, 0.12, 0.8] }]);
}

/** A grass tuft: three blades. */
export function tuft(): THREE.BufferGeometry {
  return build([
    { geo: cone(0.035, 0.2, 4), color: 0x5aa548, at: [0, 0.09, 0], rot: [0.1, 0, 0.15] },
    { geo: cone(0.03, 0.16, 4), color: 0x6cb956, at: [0.04, 0.07, 0.02], rot: [0, 0, -0.35] },
    { geo: cone(0.03, 0.15, 4), color: 0x4c9440, at: [-0.04, 0.07, -0.01], rot: [-0.2, 0, 0.4] },
  ]);
}

/** A meadow flower on a short stem (daisies and poppies; the instance colour tints the petals). */
export function flower(): THREE.BufferGeometry {
  const petals: Piece[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    petals.push({ geo: ball(0.035, 6, 4), color: 0xffffff, at: [Math.cos(a) * 0.04, 0.2, Math.sin(a) * 0.04], scale: [1.2, 0.35, 0.8], rot: [0, -a, 0] });
  }
  return build([
    { geo: cyl(0.007, 0.009, 0.2, 4), color: 0x5aa548, at: [0, 0.1, 0] },
    ...petals,
    { geo: ball(0.024, 8, 6), color: 0xf6c33a, at: [0, 0.215, 0] },
  ]);
}

/** A lane's picnic umbrella, closed, in its little stand. Opens once (fwump!) as the last line. */
export function umbrellaClosed(): THREE.BufferGeometry {
  const stripes: Piece[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    stripes.push({ geo: cone(0.055, 0.4, 3), color: i % 2 ? 0xf6f1e4 : 0xe9504a, at: [Math.cos(a) * 0.05, 0.44, Math.sin(a) * 0.05], rot: [0, -a, 0] });
  }
  return build([
    { geo: cyl(0.1, 0.13, 0.08, 12), color: 0x9a6a43, at: [0, 0.04, 0] },
    { geo: cyl(0.018, 0.018, 0.7, 6), color: 0xe7dccb, at: [0, 0.37, 0] },
    ...stripes,
    { geo: ball(0.035, 8, 6), color: 0xe9504a, at: [0, 0.76, 0] },
    { geo: torus(0.05, 0.012, 4, 10), color: 0xf6f1e4, at: [0, 0.3, 0], rot: [Math.PI / 2, 0, 0] },
  ]);
}
