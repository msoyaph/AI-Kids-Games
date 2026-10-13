/**
 * The app: owns the renderer, the sprites, the current scene and the frame loop. Scenes are Pixi
 * containers plus DOM UI; only one runs at a time (with an optional overlay, like a menu).
 */
import { Container } from 'pixi.js';
import type { RenderHost } from '../render/renderer';
import { Sprites } from '../render/sprites';

export interface Scene {
  readonly name: string;
  readonly root: Container;
  enter?(app: App): void;
  exit?(app: App): void;
  /** dt in seconds (clamped). */
  update(dt: number, app: App): void;
  resize?(app: App): void;
  /** What tests and captures may read (copies only). */
  snapshot?(): Record<string, unknown>;
}

export class App {
  readonly sprites = new Sprites();
  readonly ui: HTMLElement;
  scene: Scene | null = null;
  private last = 0;
  private running = false;
  /** Frames rendered, and a rolling frame-time average (ms), for the hook and the perf check. */
  frames = 0;
  frameMs = 16.7;
  timeScale = 1;

  constructor(readonly host: RenderHost, ui: HTMLElement, readonly capture: boolean) {
    this.ui = ui;
    host.onResize.push(() => this.scene?.resize?.(this));
    host.onContextRestored.push(() => this.sprites.atlas.reupload());
  }

  get stage() { return this.host.app.stage; }

  go(scene: Scene): void {
    if (this.scene) {
      this.scene.exit?.(this);
      this.stage.removeChild(this.scene.root);
      this.scene.root.destroy({ children: true });
    }
    this.scene = scene;
    this.stage.addChild(scene.root);
    scene.enter?.(this);
    scene.resize?.(this);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      const raw = now - this.last;
      this.last = now;
      this.frameMs = this.frameMs * 0.95 + raw * 0.05;
      const dt = Math.min(0.1, raw / 1000) * this.timeScale;
      this.scene?.update(dt, this);
      this.sprites.flush();
      this.host.app.render();
      this.frames++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
