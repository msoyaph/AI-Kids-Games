import { Vector3 } from 'three';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { BODIES, BODY_BY_ID } from '../data/bodies';
import { createPlanet, type PlanetView } from '../r3/space/planets';
import { addSpaceSky } from '../r3/space/backdrop';
import { SKIES, type SpaceSky } from '../r3/space/sky';
import { h } from '../ui/dom';

/** Visual review page (?gallery): every body lit from the same side, with names. */
export class GalleryScene extends Scene3D {
  private views: PlanetView[] = [];
  private labels: HTMLElement[] = [];
  private sky: SpaceSky;
  private readonly sun = new Vector3(-0.85, 0.35, 0.55).normalize();
  private readonly tmp = new Vector3();

  constructor() {
    super('gallery');
    this.sky = addSpaceSky(this.world, SKIES.space);
    const focus = new URLSearchParams(location.search).get('focus');
    const ids = focus ? focus.split(',') : BODIES.filter((b) => b.id !== 'wormhole').map((b) => b.id);
    const cols = focus ? ids.length : 7;
    const r3 = S.game.r3;
    ids.forEach((id, i) => {
      const v = createPlanet(id, focus ? 3 : 1, { renderer: r3.renderer, profile: r3.profile, detail: focus ? 'hero' : 'normal' });
      const col = i % cols;
      const row = Math.floor(i / cols);
      if (focus) v.group.position.set((col - (cols - 1) / 2) * 9, 0.6, 0);
      else v.group.position.set((col - (cols - 1) / 2) * 3.4, -(row - 1.5) * 3.3, 0);
      this.world.add(v.group);
      this.views.push(v);
      const label = h('div', { class: 'gallery-label' }, BODY_BY_ID[id].name);
      this.labels.push(label);
      this.ui.append(label);
    });
    this.camera.fov = 40;
    this.camera.position.set(0, 0, 22);
    this.camera.lookAt(0, 0, 0);
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    const aspect = w / hh;
    this.camera.position.z = Math.max(21, 26 / aspect * 1.5);
  }

  override render(): void {
    const t = this.time;
    this.sky.update(t);
    const m = S.game.metrics;
    for (let i = 0; i < this.views.length; i++) {
      const v = this.views[i];
      v.update(t, this.sun);
      this.tmp.copy(v.group.position);
      this.tmp.y -= v.radius * 1.35;
      this.tmp.project(this.camera);
      const el = this.labels[i];
      el.style.transform = `translate(${((this.tmp.x + 1) / 2) * m.width}px, ${((1 - this.tmp.y) / 2) * m.height}px) translate(-50%, 0)`;
    }
  }
}
