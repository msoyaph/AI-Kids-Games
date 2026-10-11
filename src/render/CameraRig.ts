import * as THREE from 'three';
import { cloneTuning, type Tuning } from '../config/tuning';
import { clamp, damp } from '../core/math';
import type { Terrain } from '../sim/terrain';

/** Third-person orbit camera with smoothing, terrain avoidance, speed FOV kick and shake. */
export class CameraRig {
  /** Render-side tuning copy (edited live by the ?tune=1 panel). */
  readonly tuning: Tuning['camera'] = cloneTuning().camera;
  yaw = 0;
  pitch = this.tuning.pitch;
  /** Mouse-wheel zoom offset added to tuning.distance. */
  zoom = 0;
  readonly target = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();
  private initialized = false;
  private trauma = 0;
  private shakeT = 0;
  shakeEnabled = true;
  /** Reduced motion: no shake, no speed FOV kick, no speed pull-back. */
  reducedMotion = false;
  private fov = this.tuning.fov;
  private lift = 0;

  /** Cinematic orbit (evolution moment): seconds left and yaw speed. */
  private orbitT = 0;
  private orbitSpeed = 0;

  /** Swing slowly around the player for `seconds` (skipped with reduced motion). */
  orbit(seconds: number, radians: number): void {
    if (this.reducedMotion) return;
    this.orbitT = seconds;
    this.orbitSpeed = radians / seconds;
  }

  get orbiting(): boolean {
    return this.orbitT > 0;
  }

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** World-space forward (away from camera, flattened). */
  forward(out: { x: number; z: number }): void {
    out.x = -Math.sin(this.yaw);
    out.z = -Math.cos(this.yaw);
  }

  look(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = clamp(this.pitch + dy, 0.08, 1.25);
  }

  snap(x: number, y: number, z: number): void {
    this.smoothTarget.set(x, y, z);
    this.initialized = true;
  }

  update(cam: THREE.PerspectiveCamera, x: number, y: number, z: number, speed: number, dt: number, terrain: Terrain | null): void {
    this.target.set(x, y, z);
    if (!this.initialized) this.snap(x, y, z);
    if (this.orbitT > 0) {
      // ease in / out across the swing
      const k = Math.min(1, this.orbitT * 2, 1);
      this.yaw += this.orbitSpeed * dt * k;
      this.orbitT -= dt;
    }
    // follow tightly horizontally, a bit softer vertically (smooths jumps/steps)
    const T = this.tuning;
    const kh = damp(T.followSharpness, dt);
    const kv = damp(8, dt);
    this.smoothTarget.x += (x - this.smoothTarget.x) * kh;
    this.smoothTarget.z += (z - this.smoothTarget.z) * kh;
    this.smoothTarget.y += (y - this.smoothTarget.y) * kv;

    const dist = Math.max(3, T.distance + this.zoom) + (this.reducedMotion ? 0 : Math.min(4, speed * T.speedPullback));
    const cp = Math.cos(this.pitch);
    const ox = Math.sin(this.yaw) * cp;
    const oy = Math.sin(this.pitch);
    const oz = Math.cos(this.yaw) * cp;
    const tx = this.smoothTarget.x;
    const ty = this.smoothTarget.y + 1.6;
    const tz = this.smoothTarget.z;
    let cx = tx + ox * dist;
    let cy = ty - 1.6 + T.height + oy * dist;
    let cz = tz + oz * dist;
    if (terrain) {
      // lift the camera so the line of sight clears hills and mesas between it and the player
      let need = cy;
      for (let k = 2; k <= 12; k++) {
        const d = (k / 12) * dist;
        if (d < 1.6) continue;
        const hgt = terrain.height(tx + ox * d, tz + oz * d) + 0.6;
        const req = ty + (hgt - ty) * (dist / d);
        if (req > need) need = req;
      }
      need = Math.min(need, ty + dist * 1.15);
      const lift = need - cy;
      this.lift += (lift - this.lift) * damp(lift > this.lift ? 14 : 3, dt);
      cy += Math.max(0, this.lift);
      const g = terrain.height(cx, cz) + 1.0;
      if (cy < g) cy = g;
    }
    // shake
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.shakeT += dt;
    if (this.shakeEnabled && !this.reducedMotion && this.trauma > 0) {
      const s = this.trauma * this.trauma * 0.6;
      cx += Math.sin(this.shakeT * 47.3) * s;
      cy += Math.sin(this.shakeT * 53.1 + 1.3) * s;
      cz += Math.sin(this.shakeT * 41.7 + 2.1) * s;
    }
    cam.position.set(cx, cy, cz);
    cam.lookAt(this.smoothTarget.x, this.smoothTarget.y + 1.6, this.smoothTarget.z);

    const wantFov = this.reducedMotion ? T.fov : T.fov + Math.min(T.fovKickMax, Math.max(0, speed - T.fovKickStart) * T.fovKickPerSpeed);
    this.fov += (wantFov - this.fov) * damp(4, dt);
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
  }
}
