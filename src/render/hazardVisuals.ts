import * as THREE from 'three';
import { propGeometry } from './props';
import { Materials } from './materials';
import type { HazardSystem } from '../sim/hazards';

const DEFAULT_MODEL = { roller: 'hz_roller', bumper: 'hz_bumper', geyser: 'hz_geyser', crab: 'hz_crab', swinger: 'hz_swinger' } as const;

/** Meshes for track hazards, synced from the (deterministic) hazard system each frame. */
export class HazardVisuals {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.Object3D[] = [];
  private readonly plumes: Array<THREE.Mesh | null> = [];

  constructor(readonly system: HazardSystem) {
    for (const h of system.list) {
      const name = h.data.model ?? DEFAULT_MODEL[h.data.kind];
      const geo = propGeometry(name) ?? propGeometry(DEFAULT_MODEL[h.data.kind])!;
      const holder = new THREE.Group();
      const m = new THREE.Mesh(geo, Materials.flat);
      if (h.data.kind === 'swinger') {
        // pendulum: pivot high above the road, head swings across
        m.position.y = -6;
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 5).translate(0, -3, 0), Materials.basic);
        holder.add(rope);
      }
      holder.add(m);
      this.group.add(holder);
      this.meshes.push(holder);
      if (h.data.kind === 'geyser') {
        const plume = new THREE.Mesh(propGeometry('hz_plume')!, Materials.basic);
        plume.visible = false;
        holder.add(plume);
        this.plumes.push(plume);
      } else this.plumes.push(null);
    }
  }

  update(): void {
    const list = this.system.list;
    for (let i = 0; i < list.length; i++) {
      const h = list[i];
      const o = this.meshes[i];
      switch (h.data.kind) {
        case 'swinger':
          o.position.set(h.baseX, h.y + 7.5, h.baseZ);
          o.rotation.set(0, h.yaw + Math.PI / 2, 0);
          o.rotation.x = h.angle;
          o.rotation.order = 'YXZ';
          break;
        case 'roller':
          o.position.set(h.x, h.y, h.z);
          o.rotation.set(0, h.yaw, 0);
          (o.children[0] as THREE.Mesh).rotation.z = -h.angle;
          break;
        case 'crab':
          o.position.set(h.x, h.y, h.z);
          o.rotation.set(0, h.yaw + Math.PI, h.angle * 0.3);
          break;
        case 'bumper':
          o.position.set(h.x, h.y, h.z);
          o.rotation.y = h.angle;
          break;
        case 'geyser': {
          o.position.set(h.x, h.y, h.z);
          const plume = this.plumes[i]!;
          plume.visible = h.active > 0 || h.warn > 0;
          const s = h.active > 0 ? 1 : h.warn * 0.25;
          plume.scale.set(1 + Math.sin(performance.now() * 0.02) * 0.05, Math.max(0.05, s), 1);
          break;
        }
      }
    }
  }
}
