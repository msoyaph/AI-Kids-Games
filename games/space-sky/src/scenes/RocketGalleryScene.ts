import { DirectionalLight, HemisphereLight } from 'three';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { Rng } from '../core/rng';
import { PARTS, STARTER_LOADOUT } from '../data/parts';
import type { PartSlot, RocketLoadout } from '../data/types';
import { RocketModel } from '../r3/models/rocket';
import { addSpaceSky } from '../r3/space/backdrop';
import { SKIES, type SpaceSky } from '../r3/space/sky';

const SLOTS: PartSlot[] = ['nose', 'body', 'engine', 'fins', 'tank', 'cargo', 'lights', 'paint'];

/** Visual review page (?rockets): a seeded contact sheet of random part combinations. */
export class RocketGalleryScene extends Scene3D {
  private rockets: RocketModel[] = [];
  private sky: SpaceSky;

  constructor() {
    super('rockets');
    this.sky = addSpaceSky(this.world, SKIES.menu);
    this.world.environmentIntensity = 1;
    const key = new DirectionalLight('#fff4e0', 2.6);
    key.position.set(4, 6, 8);
    const rim = new DirectionalLight('#9fb4ff', 1.6);
    rim.position.set(-6, 3, -6);
    this.world.add(key, rim, new HemisphereLight('#c9d2ff', '#2a1850', 0.6));
    const params = new URLSearchParams(location.search);
    const rng = new Rng(params.get('seed') ?? 'rockets');
    const stickers = ['st_rocket', 'st_earth', 'st_moon'];
    const n = Number(params.get('n') ?? 24);
    const cols = Math.min(8, n);
    for (let i = 0; i < n; i++) {
      const l: RocketLoadout = { ...STARTER_LOADOUT, stickers: [] };
      if (i > 0) {
        for (const s of SLOTS) {
          const opts = PARTS.filter((p) => p.slot === s);
          (l as unknown as Record<string, string>)[s] = opts[rng.int(0, opts.length - 1)].id;
        }
        if (rng.next() < 0.4) l.stickers = [stickers[rng.int(0, 2)]];
      }
      const r = new RocketModel(l, { glossy: S.game.r3.profile.tier === 'high' && params.get('gloss') !== '0' });
      const col = i % cols;
      const row = Math.floor(i / cols);
      r.group.position.set((col - (cols - 1) / 2) * 2.3, (1 - row) * 4.1, 0);
      r.group.scale.setScalar(n <= 4 ? 1.9 : 0.72);
      if (n <= 4) r.group.position.set((col - (cols - 1) / 2) * 5.2, 0, 0);
      this.world.add(r.group);
      this.rockets.push(r);
    }
    this.camera.fov = 35;
    this.camera.position.set(0, 0.3, 26);
    this.camera.lookAt(0, 0.3, 0);
  }

  override render(): void {
    const t = this.time;
    this.sky.update(t);
    this.rockets.forEach((r, i) => {
      r.group.rotation.y = Math.sin(t * 0.6 + i) * 0.7;
      r.update(1 / 60, 0.7, 0);
    });
  }
}
