import type { SurfaceKind } from '../data/types';

/** Per-kart memory that keeps ground queries local and cheap. */
export interface GroundHint {
  ribbon: number;
  sample: number;
}

export const RAMP_NONE = 0;
export const RAMP_TRICK = 1;
export const RAMP_GLIDER = 2;

/** Result of a ground query. Reused per kart (never allocate per step). */
export interface GroundHit {
  /** True when there is drivable ground under the point. */
  hit: boolean;
  height: number;
  nx: number;
  ny: number;
  nz: number;
  surface: SurfaceKind;
  /** Main-track distance along the lap (0..length). Arenas: 0. Valid even when hit=false. */
  s: number;
  /** Lateral offset from the ribbon centre (metres, + = right). */
  d: number;
  halfWidth: number;
  /** Track direction at the nearest sample (unit XZ). */
  dirX: number;
  dirZ: number;
  /** Wall contact: unit XZ normal pointing back into the drivable area, plus penetration depth. */
  wallHit: boolean;
  wallNx: number;
  wallNz: number;
  wallDepth: number;
  water: boolean;
  lowGrav: boolean;
  /** RAMP_* id when standing on a ramp. */
  ramp: number;
  ribbon: number;
  sample: number;
}

export function makeGroundHit(): GroundHit {
  return {
    hit: false,
    height: 0,
    nx: 0,
    ny: 1,
    nz: 0,
    surface: 'road',
    s: 0,
    d: 0,
    halfWidth: 6,
    dirX: 0,
    dirZ: 1,
    wallHit: false,
    wallNx: 0,
    wallNz: 0,
    wallDepth: 0,
    water: false,
    lowGrav: false,
    ramp: RAMP_NONE,
    ribbon: 0,
    sample: 0,
  };
}

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface GroundModel {
  /** Gravity multiplier for the whole course (moon = 0.5). */
  readonly gravityScale: number;
  /** Anything below this height is lost and respawns. */
  readonly killY: number;
  /** Lap length in metres (0 for arenas). */
  readonly length: number;
  query(x: number, y: number, z: number, hint: GroundHint, out: GroundHit): GroundHit;
  /** Safe respawn transform for a lap distance `s` (arenas ignore s). */
  respawnAt(s: number, lateral: number, out: SpawnPoint): SpawnPoint;
  /** Reset a hint to the best guess for a world position (after teleports). */
  resetHint(x: number, y: number, z: number, hint: GroundHint): void;
}
