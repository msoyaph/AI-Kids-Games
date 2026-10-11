import * as THREE from 'three';
import type { LessonSim } from '../sim/school';
import { buildRecipe } from './lowpoly';
import { Materials } from './materials';

/** Driving School props: flag gates (yellow → green when passed, red when missed), hoops to fly through, balloon targets. */
export class SchoolVisuals {
  readonly group = new THREE.Group();
  private readonly gates: Array<{ mesh: THREE.Mesh; state: number }> = [];
  private readonly rings: THREE.Mesh[] = [];
  private readonly targets: THREE.Mesh[] = [];
  private readonly mats = {
    wait: new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x6a5200 }),
    ok: new THREE.MeshLambertMaterial({ color: 0x8cff6b, emissive: 0x2a6a10 }),
    miss: new THREE.MeshLambertMaterial({ color: 0xff4d6d, emissive: 0x5a1020 }),
  };
  private time = 0;

  constructor(readonly sim: LessonSim) {
    this.group.name = 'school';
    for (const g of sim.gates) {
      const half = g.width / 2;
      const geo = buildRecipe([
        { shape: 'cyl', p: [half, 1.6, 0], s: [0.3, 3.2, 0.3], c: 0xffffff, seg: 6 },
        { shape: 'cyl', p: [-half, 1.6, 0], s: [0.3, 3.2, 0.3], c: 0xffffff, seg: 6 },
        { shape: 'box', p: [0, 3.3, 0], s: [g.width + 0.4, 0.7, 0.15], c: 0xffffff },
        { shape: 'cone', p: [half, 3.6, 0], s: [0.5, 0.6, 0.5], c: 0xffffff, seg: 6 },
        { shape: 'cone', p: [-half, 3.6, 0], s: [0.5, 0.6, 0.5], c: 0xffffff, seg: 6 },
      ]);
      // vertex colours are white; the material colour tints the gate by state
      const mesh = new THREE.Mesh(geo, this.mats.wait);
      mesh.position.set(g.x, g.y, g.z);
      mesh.rotation.y = g.yaw;
      this.group.add(mesh);
      this.gates.push({ mesh, state: 0 });
    }
    for (const r of sim.rings) {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(r.radius, 0.28, 8, 24), new THREE.MeshLambertMaterial({ color: 0x4ce0d2, emissive: 0x0f5a54 }));
      mesh.position.set(r.x, r.y, r.z);
      mesh.rotation.y = r.yaw;
      this.group.add(mesh);
      this.rings.push(mesh);
    }
    if (sim.targets.length) {
      const geo = buildRecipe([
        { shape: 'cyl', p: [0, 0.9, 0], s: [0.08, 1.8, 0.08], c: 0xffffff, seg: 4 },
        { shape: 'sphere', p: [0, 2.3, 0], s: [1.1, 1.3, 1.1], c: 0xff6fae, seg: 10 },
        { shape: 'cone', p: [0, 1.6, 0], s: [0.2, 0.2, 0.2], r: [180, 0, 0], c: 0xff6fae, seg: 5 },
        { shape: 'sphere', p: [0.2, 2.6, 0.3], s: [0.25, 0.35, 0.15], c: 0xffd6ec, seg: 6 },
      ]);
      geo.userData.shared = false;
      for (const t of sim.targets) {
        const mesh = new THREE.Mesh(geo, Materials.flat);
        mesh.position.set(t.x, t.y, t.z);
        this.group.add(mesh);
        this.targets.push(mesh);
      }
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.sim.gates.forEach((g, i) => {
      const v = this.gates[i];
      if (v.state !== g.state) {
        v.state = g.state;
        v.mesh.material = g.state === 1 ? this.mats.ok : g.state === 2 ? this.mats.miss : this.mats.wait;
      }
    });
    this.sim.rings.forEach((r, i) => {
      const m = this.rings[i];
      m.visible = !r.got;
      m.scale.setScalar(1 + Math.sin(this.time * 4 + i) * 0.04);
    });
    this.sim.targets.forEach((t, i) => {
      const m = this.targets[i];
      m.visible = !t.popped;
      m.rotation.z = Math.sin(this.time * 2 + i) * 0.08;
    });
  }

  dispose(): void {
    for (const m of Object.values(this.mats)) m.dispose();
  }
}
