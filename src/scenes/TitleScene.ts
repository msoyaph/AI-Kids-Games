import { DirectionalLight, Group, HemisphereLight, Vector3, type Mesh, type ShaderMaterial } from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { simplePlanet, simpleRings, simpleRocket } from '../r3/models/placeholders';
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
  private earth: Group;
  private moon: Group;
  private saturn = new Group();
  private t = 0;
  private readonly tmp = new Vector3();
  private readonly prev = new Vector3();
  private readonly dir = new Vector3();
  private still = comfortOn();

  constructor() {
    super('title');
    this.music = 'title';
    const sun = SKIES.title.sun!.dir;
    const sunArr: [number, number, number] = [sun.x, sun.y, sun.z];
    this.sky = addSpaceSky(this.world, SKIES.title);
    const key = new DirectionalLight('#fff4e0', 3.2);
    key.position.copy(sun).multiplyScalar(50);
    this.world.add(key, new HemisphereLight('#7f8fff', '#1d0f3a', 0.35));
    const seg = S.game.r3.profile.sphereSegments;
    this.earth = simplePlanet(9, '#3f7bd8', '#6fb8ff', seg, sunArr);
    this.earth.position.set(-12, -10, -24);
    this.moon = simplePlanet(1.3, '#b9b4c4', null, 32, sunArr);
    this.moon.position.set(-3.8, -2.6, -15);
    const saturnBody = simplePlanet(3.2, '#e8cf94', '#ffe7b0', seg, sunArr);
    const rings = simpleRings(4.3, 7.4, '#d9c08a');
    this.saturn.add(saturnBody, rings);
    this.saturn.position.set(14, 6.5, -32);
    this.saturn.rotation.set(0.62, 0, -0.38);
    const r = simpleRocket();
    this.rocket = r.group;
    this.flame = r.flame;
    this.rocket.scale.setScalar(0.85);
    this.world.add(this.earth, this.moon, this.saturn, this.rocket);
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
    return out.set(Math.cos(a) * 6.2, -0.8 + Math.sin(a * 2) * 2.0, -12 + Math.sin(a) * 2.2);
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
    this.earth.rotation.y = time * 0.03;
    this.moon.rotation.y = -time * 0.05;
    this.saturn.rotation.y = time * 0.02;
    if (!this.still) {
      this.camera.position.set(Math.sin(time * 0.13) * 0.35, Math.sin(time * 0.17) * 0.2, 0);
      this.camera.lookAt(0, -0.3, -10);
    }
  }
}

const UP = new Vector3(0, 1, 0);
