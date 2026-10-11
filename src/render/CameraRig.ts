import * as THREE from 'three';
import { clamp, damp } from '../core/math';
import type { Terrain } from '../sim/terrain';

/** Third-person orbit camera with smoothing, terrain avoidance, speed FOV kick and shake. */
export class CameraRig {
  yaw = 0;
  pitch = 0.5;
  distance = 11.5;
  readonly target = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();
  private initialized = false;
  private trauma = 0;
  private shakeT = 0;
  shakeEnabled = true;
  private fov = 62;

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
    // follow tightly horizontally, a bit softer vertically (smooths jumps/steps)
    const kh = damp(18, dt);
    const kv = damp(8, dt);
    this.smoothTarget.x += (x - this.smoothTarget.x) * kh;
    this.smoothTarget.z += (z - this.smoothTarget.z) * kh;
    this.smoothTarget.y += (y - this.smoothTarget.y) * kv;

    const dist = this.distance + Math.min(4, speed * 0.12);
    const cp = Math.cos(this.pitch);
    let cx = this.smoothTarget.x + Math.sin(this.yaw) * cp * dist;
    let cy = this.smoothTarget.y + 1.4 + Math.sin(this.pitch) * dist;
    let cz = this.smoothTarget.z + Math.cos(this.yaw) * cp * dist;
    if (terrain) {
      const g = terrain.height(cx, cz) + 1.0;
      if (cy < g) cy = g;
    }
    // shake
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.shakeT += dt;
    if (this.shakeEnabled && this.trauma > 0) {
      const s = this.trauma * this.trauma * 0.6;
      cx += Math.sin(this.shakeT * 47.3) * s;
      cy += Math.sin(this.shakeT * 53.1 + 1.3) * s;
      cz += Math.sin(this.shakeT * 41.7 + 2.1) * s;
    }
    cam.position.set(cx, cy, cz);
    cam.lookAt(this.smoothTarget.x, this.smoothTarget.y + 1.6, this.smoothTarget.z);

    const wantFov = 62 + Math.min(14, Math.max(0, speed - 8) * 0.7);
    this.fov += (wantFov - this.fov) * damp(4, dt);
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
  }
}
