import type { Tuning } from '../config/tuning';

/**
 * Touch auto camera: how far to turn the camera yaw this frame so it swings in behind the
 * way Thea is moving. Full rate when she's heading roughly away from the camera, fading to
 * a third for sideways movement, and nothing when she's retreating towards the camera (so
 * kiting never flips the view). Eases toward the target, capped at `autoCamRate`.
 *
 * Yaw convention (CameraRig): camera forward = (−sin yaw, −cos yaw).
 * `gain` (0..1) fades it in after a camera drag and slows it for reduced motion.
 */
export function autoCameraTurn(yaw: number, vx: number, vz: number, dt: number, t: Tuning['camera'], gain = 1): number {
  const speed = Math.hypot(vx, vz);
  if (gain <= 0 || speed < t.autoCamMinSpeed || speed === 0) return 0;
  let d = Math.atan2(-vx, -vz) - yaw;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const ad = Math.abs(d);
  const max = (t.autoCamMaxAngle * Math.PI) / 180;
  if (ad > max) return 0;
  const fwd = Math.PI / 3;
  const side = ad <= fwd ? 1 : 1 - ((ad - fwd) / Math.max(1e-6, max - fwd)) * (2 / 3);
  const speedK = Math.min(1, speed / Math.max(1e-6, t.autoCamMinSpeed * 3));
  const want = d * Math.min(1, 2.2 * dt);
  const cap = t.autoCamRate * side * speedK * gain * dt;
  return Math.max(-cap, Math.min(cap, want));
}
