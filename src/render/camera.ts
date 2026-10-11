// Tilted top-down follow camera.
import * as THREE from 'three';
import { damp } from '../core/math';

export interface CameraSettings {
  /** distance multiplier 0.7 .. 1.4 */
  zoom: number;
  /** pitch in degrees 35 .. 70 */
  tilt: number;
  /** follow smoothing 2 .. 14 */
  smoothing: number;
}

export const DEFAULT_CAMERA: CameraSettings = { zoom: 1, tilt: 36, smoothing: 7 };

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly target = new THREE.Vector3();
  private goal = new THREE.Vector3();
  settings: CameraSettings = { ...DEFAULT_CAMERA };
  baseDistance = 22;
  /** extra zoom for cutscenes / interiors (multiplier) */
  zoomOverride = 1;
  pitchOverride: number | null = null;
  shake = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(32, aspect, 0.5, 220);
  }

  snap(x: number, y: number, z: number): void {
    this.goal.set(x, y, z);
    this.target.copy(this.goal);
    this.apply();
  }

  follow(x: number, y: number, z: number, dt: number): void {
    this.goal.set(x, y, z);
    const l = this.settings.smoothing;
    this.target.x = damp(this.target.x, this.goal.x, l, dt);
    this.target.y = damp(this.target.y, this.goal.y, l * 0.6, dt);
    this.target.z = damp(this.target.z, this.goal.z, l, dt);
    this.shake = Math.max(0, this.shake - dt * 3);
    this.apply();
  }

  private apply(): void {
    const pitch = THREE.MathUtils.degToRad(this.pitchOverride ?? this.settings.tilt);
    const dist = this.baseDistance * this.settings.zoom * this.zoomOverride;
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.3 : 0;
    this.camera.position.set(this.target.x + sx, this.target.y + Math.sin(pitch) * dist, this.target.z + Math.cos(pitch) * dist);
    this.camera.lookAt(this.target.x + sx, this.target.y + 0.6, this.target.z);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    // keep the view comfortably wide on portrait phones
    this.camera.fov = aspect < 0.8 ? 46 : aspect < 1.2 ? 38 : 32;
    this.camera.updateProjectionMatrix();
  }
}
