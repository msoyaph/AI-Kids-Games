import { HemisphereLight, type Scene, type PerspectiveCamera } from 'three';
import { S } from '../../app/services';
import { SKIES, SpaceSky, type SkyStyle } from './sky';

/** Adds the shared deep-space sky (nebula cube, stars, sun) to a scene. */
export function addSpaceSky(world: Scene, style: SkyStyle = SKIES.space): SpaceSky {
  const r3 = S.game.r3;
  const p = r3.profile;
  const sky = new SpaceSky(r3.renderer, style, { skySize: p.skySize, octaves: p.octaves, stars: p.stars, pixelRatio: r3.pixelRatio });
  world.background = sky.background;
  world.add(sky.group);
  return sky;
}

/**
 * The simple animated space backdrop behind menu screens (save slots, creator, credits...):
 * a slowly turning view of the nebula sky.
 */
export class MenuBackdrop {
  readonly sky: SpaceSky;
  private yaw = 0;

  constructor(world: Scene, private readonly camera: PerspectiveCamera, style: SkyStyle = SKIES.menu) {
    this.sky = addSpaceSky(world, style);
    world.add(new HemisphereLight('#bfc8ff', '#2a1850', 0.8));
    camera.fov = 55;
    camera.position.set(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  update(time: number, dt: number, still = false): void {
    if (!still) this.yaw += dt * 0.012;
    this.camera.rotation.set(Math.sin(time * 0.05) * 0.04, this.yaw, 0, 'YXZ');
    this.sky.update(time);
  }
}
