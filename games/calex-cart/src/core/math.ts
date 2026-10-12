// Allocation-free math helpers shared by sim and render. The sim never imports three.js.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function invLerp(a: number, b: number, v: number): number {
  return a === b ? 0 : (v - a) / (b - a);
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Framerate-independent exponential approach. `lambda` ~ 1/time-constant. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Move `current` toward `target` by at most `maxDelta`. */
export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

/** Wrap an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}

export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  return lerpAngle(current, target, 1 - Math.exp(-lambda * dt));
}

export function sign(v: number): number {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

export function copy3(out: Vec3, a: Vec3): Vec3 {
  out.x = a.x;
  out.y = a.y;
  out.z = a.z;
  return out;
}

export function set3(out: Vec3, x: number, y: number, z: number): Vec3 {
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}

export function len3(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function dist2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function distSq2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function distSq3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

export function normalize3(out: Vec3): Vec3 {
  const l = len3(out);
  if (l > 1e-9) {
    out.x /= l;
    out.y /= l;
    out.z /= l;
  }
  return out;
}

export function cross3(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  const x = a.y * b.z - a.z * b.y;
  const y = a.z * b.x - a.x * b.z;
  const z = a.x * b.y - a.y * b.x;
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}

export function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Heading (yaw) convention: yaw 0 faces +Z, positive yaw turns toward +X. */
export function forwardX(yaw: number): number {
  return Math.sin(yaw);
}

export function forwardZ(yaw: number): number {
  return Math.cos(yaw);
}

export function yawFromDir(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

/** Format milliseconds-ish seconds as m:ss.cc */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '-:--.--';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  const whole = Math.floor(s);
  const cs = Math.floor((s - whole) * 100);
  return `${m}:${whole < 10 ? '0' : ''}${whole}.${cs < 10 ? '0' : ''}${cs}`;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
