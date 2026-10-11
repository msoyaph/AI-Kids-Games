import { DirectionalLight, HemisphereLight, Vector3, type Group, type Mesh, type ShaderMaterial } from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { simpleRocket } from '../r3/models/placeholders';
import { createPlanet, type PlanetView } from '../r3/space/planets';
import { addSpaceSky } from '../r3/space/backdrop';
import { SKIES, type SpaceSky } from '../r3/space/sky';
import { h } from '../ui/dom';
import { button } from '../ui/widgets';
import { fullscreenAvailable, openSettings, toggleFullscreen } from '../ui/settings';

/** The title screen: a rocket looping past Earth, the Moon and Saturn. */
export class TitleScene extends Scene3D {
  private sky: SpaceSky;
  private rocket: Group;
  private flame: Mesh;
  private earth: PlanetView;
  private moon: PlanetView;
  private saturn: PlanetView;
  private readonly sunDir: Vector3;
  private t = 0;
  private readonly tmp = new Vector3();
  private readonly prev = new Vector3();
  private readonly dir = new Vector3();
  private still = comfortOn();

  constructor() {
    super('title');
    this.music = 'title';
    const sun = SKIES.title.sun!.dir;
    this.sunDir = sun.clone().normalize();
    this.sky = addSpaceSky(this.world, SKIES.title);
    const key = new DirectionalLight('#fff4e0', 3.0);
    key.position.copy(sun).multiplyScalar(50);
    this.world.add(key, new HemisphereLight('#7f8fff', '#1d0f3a', 0.35));
    const r3 = S.game.r3;
    const opts = { renderer: r3.renderer, profile: r3.profile };
    this.earth = createPlanet('earth', 9, { ...opts, detail: 'hero' });
    this.earth.group.position.set(-12, -10, -24);
    this.moon = createPlanet('moon', 1.3, { ...opts, detail: 'normal' });
    this.moon.group.position.set(-9.5, 4.2, -22);
    this.saturn = createPlanet('saturn', 3.0, { ...opts, detail: 'normal' });
    this.saturn.group.position.set(14, 6.5, -32);
    this.saturn.group.rotation.set(0.5, 0, -0.25);
    const r = simpleRocket();
    this.rocket = r.group;
    this.flame = r.flame;
    this.rocket.scale.setScalar(0.85);
    this.world.add(this.earth.group, this.moon.group, this.saturn.group, this.rocket);
    this.camera.fov = 45;
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(0, -0.3, -10);
    this.camera.updateProjectionMatrix();
    this.pathPoint(0, this.prev);

    const logo = h('div', { class: 'title-logo' }, h('div', { class: 'logo-main' }, 'Space Sky'), h('div', { class: 'logo-sub' }, 'Academy Adventures'));
    const play = button('Play', 'play', () => void S.game.go('slots'), { color: 'green', size: 'big', id: 'btn-play' });
    const menu = h('div', { class: 'title-menu' }, play);
    const corner = h('div', { class: 'title-corner' }, button('Settings', 'gear', () => openSettings(), { round: true, color: 'white', id: 'btn-settings' }));
    if (fullscreenAvailable()) corner.prepend(button('Full screen', 'fullscreen', () => toggleFullscreen(), { round: true, color: 'white', id: 'btn-fullscreen' }));
    this.ui.append(logo, menu, corner);
  }

  /** A lazy figure-eight in front of the camera. */
  private pathPoint(t: number, out: Vector3): Vector3 {
    const a = t * 0.32;
    return out.set(1.2 + Math.cos(a) * 6.5, -2.9 + Math.sin(a * 2) * 1.1, -12 + Math.sin(a) * 2.2);
  }

  override update(dt: number): void {
    this.t += dt;
  }

  override render(): void {
    const time = this.time;
    this.sky.update(time);
    const p = this.pathPoint(this.t, this.tmp);
    this.rocket.position.copy(p);
    // Point the nose along the path (the model's nose is +Y).
    const dir = this.dir.copy(p).sub(this.prev);
    if (dir.lengthSq() > 1e-6) {
      dir.normalize();
      this.rocket.quaternion.setFromUnitVectors(UP, dir);
      this.rocket.rotateY(this.t * 0.6);
    }
    this.prev.copy(p);
    const fm = this.flame.material as ShaderMaterial;
    fm.uniforms.uTime.value = time;
    this.flame.scale.set(1, 0.85 + Math.sin(time * 31) * 0.1, 1);
    this.earth.update(time, this.sunDir);
    this.moon.update(time, this.sunDir);
    this.saturn.update(time, this.sunDir);
    if (!this.still) {
      this.camera.position.set(Math.sin(time * 0.13) * 0.35, Math.sin(time * 0.17) * 0.2, 0);
      this.camera.lookAt(0, -0.3, -10);
    }
  }
}

const UP = new Vector3(0, 1, 0);
