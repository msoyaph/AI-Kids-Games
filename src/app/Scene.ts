import { Container } from 'pixi.js';
import { h } from '../ui/dom';

/**
 * A screen of the game. Each scene owns a Pixi container (world drawing) and a DOM
 * element (menus/HUD). Scenes are created fresh on every visit and destroyed on exit.
 */
export abstract class Scene {
  readonly root = new Container();
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
    this.root.destroy({ children: true });
    this.ui.remove();
  }
}
