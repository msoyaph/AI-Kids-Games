/**
 * Tiny timeline helpers for cutscenes (pure: plain numbers, no Three.js).
 *
 * A camera path is a list of keys (time, position, look-at point, field of view). Sampling moves
 * smoothly through them: Catmull-Rom curves through the points and an ease-in/out in time on the first
 * and last segment, so shots start and land gently (kid- and comfort-friendly). Cues are named moments
 * that fire once when time passes them.
 */

export type V3 = [number, number, number];

export interface CamKey {
  t: number;
  pos: V3;
  look: V3;
  fov?: number;
}

export interface CamSample {
  pos: V3;
  look: V3;
  fov: number;
}

export function makeSample(): CamSample {
  return { pos: [0, 0, 0], look: [0, 0, 0], fov: 45 };
}

function cr(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}

const smooth = (u: number) => u * u * (3 - 2 * u);

/** Total duration of a path (time of its last key). */
export function pathDuration(keys: CamKey[]): number {
  return keys.length ? keys[keys.length - 1].t : 0;
}

/** Sample a camera path at time t into `out` (no allocation). Times outside the path clamp to its ends. */
export function samplePath(keys: CamKey[], t: number, out: CamSample, defaultFov = 45): CamSample {
  const n = keys.length;
  if (!n) return out;
  if (n === 1 || t <= keys[0].t) return copyKey(keys[0], out, defaultFov);
  if (t >= keys[n - 1].t) return copyKey(keys[n - 1], out, defaultFov);
  let i = 0;
  while (i < n - 2 && t > keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  let u = (t - a.t) / Math.max(1e-6, b.t - a.t);
  // Ease into the first key's motion and out of the last one.
  if (i === 0 && i === n - 2) u = smooth(u);
  else if (i === 0) u = u * u * (2 - u);
  else if (i === n - 2) u = 1 - (1 - u) * (1 - u) * (1 + u);
  const k0 = keys[Math.max(0, i - 1)];
  const k3 = keys[Math.min(n - 1, i + 2)];
  for (let j = 0; j < 3; j++) {
    out.pos[j] = cr(k0.pos[j], a.pos[j], b.pos[j], k3.pos[j], u);
    out.look[j] = cr(k0.look[j], a.look[j], b.look[j], k3.look[j], u);
  }
  const fa = a.fov ?? defaultFov;
  const fb = b.fov ?? defaultFov;
  out.fov = fa + (fb - fa) * u;
  return out;
}

function copyKey(k: CamKey, out: CamSample, defaultFov: number): CamSample {
  for (let j = 0; j < 3; j++) {
    out.pos[j] = k.pos[j];
    out.look[j] = k.look[j];
  }
  out.fov = k.fov ?? defaultFov;
  return out;
}

/** A path that starts from wherever the camera is now and moves through `keys` (times relative to now). */
export function fromHere(here: CamSample, keys: CamKey[], lead = 0): CamKey[] {
  return [{ t: 0, pos: [...here.pos] as V3, look: [...here.look] as V3, fov: here.fov }, ...keys.map((k) => ({ ...k, t: k.t + lead }))];
}

export interface Cue {
  t: number;
  id: string;
}

/** Cues whose time is in (prev, now]. */
export function dueCues(cues: Cue[], prev: number, now: number, out: string[] = []): string[] {
  out.length = 0;
  for (const c of cues) if (c.t > prev && c.t <= now) out.push(c.id);
  return out;
}
