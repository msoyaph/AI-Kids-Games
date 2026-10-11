import { h } from '../ui/dom';

/**
 * A screen of the game: a DOM element (menus/HUD) plus whatever the renderer draws.
 * Scenes are created fresh on every visit and destroyed on exit.
 * `Scene3D` (Three.js) is the normal kind; `Scene` (Pixi) remains only for screens
 * that have not been moved to 3D yet.
 */
export abstract class BaseScene {
  abstract readonly kind: '2d' | '3d';
  readonly ui: HTMLElement;
  /** Music track to play while this scene is active. */
  music: string | null = null;
  /** Whether the pause button / Esc opens the pause menu here. */
  pausable = false;
  /** True while a modal (dialogue, pause...) should freeze gameplay. */
  frozen = false;

  constructor(readonly name: string) {
    this.ui = h('div', { class: `screen screen-${name}` });
  }

  /** Called after the scene is added to the stage. */
  enter(): void | Promise<void> {}
  /** Called before the scene is removed. */
  exit(): void {}
  /** Fixed-timestep logic update (dt in seconds). */
  update(_dt: number): void {}
  /** Interpolated render (alpha in [0, 1)). */
  render(_alpha: number): void {}
  /** Logical screen size changed. */
  resize(_w: number, _h: number): void {}
  /** Back / Escape pressed. Return true if handled. */
  back(): boolean {
    return false;
  }

  destroy(): void {
    this.ui.remove();
  }
}
