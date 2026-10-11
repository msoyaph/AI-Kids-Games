import type { SystemId } from '../data/bodies';

/**
 * Layout and picking for the 3D Star Map. Pure math so it can be unit tested.
 *
 * Distances and sizes are NOT to scale (the map says so): orbits are squeezed so every planet
 * fits on one screen, and planet sizes are boosted so small worlds are easy to tap.
 */
export interface MapSlot {
  /** Orbit radius around the Sun (map units). */
  orbit: number;
  /** Angle along the orbit (radians). */
  angle: number;
  /** Displayed radius of the main body. */
  size: number;
  /** Height above the orbital plane (Pluto's tilted orbit, the far-away Zephyra system). */
  y?: number;
}

export const SUN_SIZE = 3.2;

export const MAP_SLOTS: Record<SystemId, MapSlot> = {
  mercury: { orbit: 8.5, angle: 2.2, size: 0.55 },
  venus: { orbit: 12, angle: 2.95, size: 0.95 },
  earth: { orbit: 16, angle: 3.7, size: 1.0 },
  mars: { orbit: 20.5, angle: 4.45, size: 0.72 },
  belt: { orbit: 26, angle: 5.15, size: 0.42 },
  jupiter: { orbit: 33, angle: 5.85, size: 2.3 },
  saturn: { orbit: 41.5, angle: 6.6, size: 1.9 },
  uranus: { orbit: 49, angle: 7.3, size: 1.4 },
  neptune: { orbit: 56, angle: 7.95, size: 1.35 },
  pluto: { orbit: 63, angle: 8.6, size: 0.4, y: 3.2 },
  wormhole: { orbit: 72, angle: 9.2, size: 1.7, y: 1.5 },
  zephyra: { orbit: 96, angle: 9.75, size: 1.4, y: 9 },
};

/** Orbit radius of the asteroid belt ring (the belt "system" sits on it). */
export const BELT = { orbit: 26, width: 2.2 };

export function slotPosition(id: SystemId, out: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }): { x: number; y: number; z: number } {
  const s = MAP_SLOTS[id];
  out.x = Math.cos(s.angle) * s.orbit;
  out.y = s.y ?? 0;
  out.z = Math.sin(s.angle) * s.orbit;
  return out;
}

export interface ScreenTarget {
  id: string;
  /** Screen position (any consistent units, e.g. logical pixels). */
  x: number;
  y: number;
  /** On-screen radius of the object in the same units. */
  r: number;
  /** In front of the camera. */
  visible: boolean;
}

/**
 * Picks what a tap hit. Small fingers and small planets: anything within `minRadius` of its
 * center counts, and when several are close the nearest edge wins.
 */
export function pickTarget(targets: ScreenTarget[], x: number, y: number, minRadius = 44): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const t of targets) {
    if (!t.visible) continue;
    const d = Math.hypot(t.x - x, t.y - y);
    const reach = Math.max(minRadius, t.r + 18);
    if (d > reach) continue;
    const score = Math.max(0, d - t.r);
    if (score < bestScore || (score === bestScore && t.r < (targets.find((o) => o.id === best)?.r ?? Infinity))) {
      bestScore = score;
      best = t.id;
    }
  }
  return best;
}

/** Orbit camera: position from target, yaw, pitch (radians, 0 = level) and distance. */
export function orbitCameraPosition(tx: number, ty: number, tz: number, yaw: number, pitch: number, dist: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const cp = Math.cos(pitch);
  out.x = tx + Math.sin(yaw) * cp * dist;
  out.y = ty + Math.sin(pitch) * dist;
  out.z = tz + Math.cos(yaw) * cp * dist;
  return out;
}

export const PITCH_MIN = 0.25;
export const PITCH_MAX = 1.35;
export const DIST_MIN = 5;
export const DIST_MAX = 190;

/** A comfortable viewing distance for a body of displayed radius `size`. */
export function focusDistance(size: number): number {
  return Math.min(60, 14 + size * 8);
}
