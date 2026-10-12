import * as THREE from 'three';
import { clamp, damp, dampAngle, lerpAngle } from '../core/math';
import { Kart, RespawnState } from '../sim/kart';

/**
 * Third-person chase camera with smoothing, look-behind, FOV kick on boost and drift swing.
 * `distanceSetting` (0.8..1.3) comes from the settings screen.
 */
export class ChaseCamera {
  readonly camera: THREE.PerspectiveCamera;
  distanceSetting = 1;
  baseFov = 66;
  private yaw = 0;
  private x = 0;
  private y = 0;
  private z = 0;
  private fov = 66;
  private initialised = false;
  private lookBackBlend = 0;
  private shake = 0;
  private time = 0;
  private distMul = 1;
  /** Camera kick (hits): pushes the camera back/down for a moment. */
  private kickAmt = 0;
  /** Settings: allow shake, and the calmer "reduce effects" mode (smaller FOV changes, no kick/shake). */
  shakeEnabled = true;
  reduceMotion = false;

  constructor(far = 600) {
    this.camera = new THREE.PerspectiveCamera(66, 16 / 9, 0.2, far);
  }

  snap(): void {
    this.initialised = false;
  }

  addShake(amount: number): void {
    if (!this.shakeEnabled || this.reduceMotion) return;
    this.shake = Math.min(1, this.shake + amount);
  }

  /** A short punch of the camera (being hit, big landings). */
  kick(amount: number): void {
    if (this.reduceMotion) return;
    this.kickAmt = Math.min(1, this.kickAmt + amount);
  }

  update(k: Kart, alpha: number, dt: number, lookBack: boolean): void {
    this.time += dt;
    const kx = k.px + (k.x - k.px) * alpha;
    const ky = k.py + (k.y - k.py) * alpha;
    const kz = k.pz + (k.z - k.pz) * alpha;
    const kyaw = lerpAngle(k.pyaw, k.yaw, alpha);
    // Follow a blend of heading and travel direction so drifts swing the camera a little.
    let targetYaw = kyaw;
    const sp = Math.hypot(k.vx, k.vz);
    if (sp > 4 && k.speed > 0) {
      const travel = Math.atan2(k.vx, k.vz);
      targetYaw = lerpAngle(kyaw, travel, 0.35);
    }
    if (k.respawnState === RespawnState.Falling) targetYaw = this.yaw;
    // pull back a little at high speed / boosting so speed reads on screen
    const sf = clamp(k.speed / Math.max(1, k.params.topSpeed), 0, 1.4);
    const pull = this.reduceMotion ? 1 : 1 + 0.1 * clamp((sf - 0.55) / 0.45, 0, 1) + (k.boosting ? 0.07 : 0);
    this.distMul = damp(this.distMul, pull, k.boosting ? 5 : 2.5, dt);
    const dist = 6.4 * this.distanceSetting * (k.gliding ? 1.25 : 1) * this.distMul;
    const height = 2.6 * this.distanceSetting + (k.gliding ? 0.8 : 0);
    if (!this.initialised) {
      this.yaw = targetYaw;
      this.x = kx - Math.sin(targetYaw) * dist;
      this.z = kz - Math.cos(targetYaw) * dist;
      this.y = ky + height;
      this.fov = this.baseFov;
      this.initialised = true;
    }
    this.yaw = dampAngle(this.yaw, targetYaw, k.drifting ? 4.5 : 7, dt);
    this.lookBackBlend = damp(this.lookBackBlend, lookBack ? 1 : 0, 20, dt);
    const back = this.lookBackBlend > 0.5;
    const yaw = back ? this.yaw + Math.PI : this.yaw;
    const d = back ? dist * 0.9 : dist;
    const tx = kx - Math.sin(yaw) * d;
    const tz = kz - Math.cos(yaw) * d;
    const ty = ky + height;
    if (back) {
      this.x = tx;
      this.z = tz;
    } else {
      // Horizontal follow is tight (no lag sickness); vertical is softer for jumps.
      this.x = damp(this.x, tx, 18, dt);
      this.z = damp(this.z, tz, 18, dt);
    }
    if (k.respawnState === RespawnState.Falling) {
      // hold position, look down at the falling kart
    } else {
      this.y = damp(this.y, Math.max(ty, ky + 1.2), k.grounded ? 9 : 4, dt);
    }
    // FOV kick when boosting, gentle widening with speed
    const speedFrac = sf;
    let fovTarget = this.baseFov + speedFrac * (this.reduceMotion ? 2.5 : 7);
    if (k.boosting) fovTarget += this.reduceMotion ? 3 : 10;
    this.fov = damp(this.fov, fovTarget, k.boosting ? 8 : 3, dt);
    if (Math.abs(this.camera.fov - this.fov) > 0.05) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const sh = this.shake * this.shake * 0.35;
    const sx = sh ? Math.sin(this.time * 61) * sh : 0;
    const sy = sh ? Math.sin(this.time * 47 + 1) * sh : 0;
    // kick: quick back-and-down punch that springs back
    this.kickAmt = Math.max(0, this.kickAmt - dt * 4);
    const kb = this.kickAmt * this.kickAmt * 0.9;
    this.camera.position.set(this.x + sx - Math.sin(this.yaw) * kb, this.y + sy - kb * 0.35, this.z - Math.cos(this.yaw) * kb);
    const look = back ? -1 : 1;
    this.camera.lookAt(kx + Math.sin(this.yaw) * 3 * look, ky + 1.0, kz + Math.cos(this.yaw) * 3 * look);
  }

  /** Simple orbit/flyover used for intros and podium. */
  orbit(cx: number, cy: number, cz: number, radius: number, height: number, angle: number): void {
    this.camera.position.set(cx + Math.sin(angle) * radius, cy + height, cz + Math.cos(angle) * radius);
    this.camera.lookAt(cx, cy + 1, cz);
    this.initialised = false;
  }
}
