import { PerspectiveCamera, Scene } from 'three';
import { disposeObject } from '../r3/dispose';
import { BaseScene } from './BaseScene';
import { S } from './services';

/**
 * A scene drawn with Three.js. It owns `world` (its scene graph) and `camera`; everything in
 * `world` that is not flagged shared is freed when the scene is destroyed.
 */
export abstract class Scene3D extends BaseScene {
  readonly kind = '3d' as const;
  readonly world = new Scene();
  camera = new PerspectiveCamera(50, 16 / 9, 0.1, 4000);
  /** Real seconds since the scene started (for render-time animation). */
  time = 0;

  constructor(name: string) {
    super(name);
    this.world.environment = S.game?.r3?.env ?? null;
    // Space is dark: reflections only, very little ambient bounce. Rooms (hub) raise this.
    this.world.environmentIntensity = 0.45;
  }

  override resize(w: number, h: number): void {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  override destroy(): void {
    disposeObject(this.world);
    this.world.clear();
    super.destroy();
  }
}
