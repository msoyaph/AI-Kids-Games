import type * as THREE from 'three';
import type { Vec3 } from '../geo';

/** One separately animated piece of a model (a crown, a wing), drawn as one instanced mesh. */
export interface Part {
  geo: THREE.BufferGeometry;
  /** Its outline hull (drawn back-faces only, in the outline colour), if it has one. */
  hull?: THREE.BufferGeometry | null;
  /** The point it turns and squashes around, in model space. */
  pivot: Vec3;
  /** Thin pieces seen from both sides (wings, leaves in the air). */
  twoSided?: boolean;
}

export interface Model {
  id: string;
  parts: Part[];
  /** Radius of the soft blob shadow on Low. */
  shadow: number;
  /** Rough height, for framing card thumbnails. */
  height: number;
  /** Its signature colour (the main fill the squint test checks against the soil). */
  fill: number;
}

/**
 * A part's pose this frame, relative to its pivot: offset (dx, dy, dz), turn (rx, ry, rz) and scale
 * (sx, sy, sz). Written into a reused array, so animating allocates nothing.
 */
export type Pose = Float32Array;
export const POSE_SIZE = 9;
export const newPoses = (parts: number): Pose => {
  const p = new Float32Array(parts * POSE_SIZE);
  for (let i = 0; i < parts; i++) p[i * POSE_SIZE + 6] = p[i * POSE_SIZE + 7] = p[i * POSE_SIZE + 8] = 1;
  return p;
};
/** Resets every part to rest. */
export function rest(p: Pose) {
  for (let i = 0; i < p.length; i += POSE_SIZE) {
    p[i] = p[i + 1] = p[i + 2] = p[i + 3] = p[i + 4] = p[i + 5] = 0;
    p[i + 6] = p[i + 7] = p[i + 8] = 1;
  }
}

/** The same model, uniformly bigger or smaller (pivots, shadow and height follow). */
export function scaled(model: Model, k: number): Model {
  return {
    ...model,
    parts: model.parts.map(part => ({ ...part, geo: part.geo.scale(k, k, k), hull: part.hull?.scale(k, k, k) ?? null, pivot: [part.pivot[0] * k, part.pivot[1] * k, part.pivot[2] * k] as const })),
    shadow: model.shadow * k,
    height: model.height * k,
  };
}
