import { Container } from 'pixi.js';
import { BaseScene } from './BaseScene';

/** A not-yet-ported 2D scene drawn with Pixi (removed once every screen is 3D). */
export abstract class Scene extends BaseScene {
  readonly kind = '2d' as const;
  readonly root = new Container();

  override destroy(): void {
    this.root.destroy({ children: true });
    super.destroy();
  }
}
