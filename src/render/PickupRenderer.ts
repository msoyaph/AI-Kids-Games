import * as THREE from 'three';
import { CAPS, GEM_TIERS } from '../config/balance';
import { PickupKind } from '../sim/pools';
import type { World } from '../sim/world';
import { lowPolyMaterial } from './geo';
import { commitInstances, makeInstanced, writeTRS } from './instancing';
import { chestGeometry, coinGeometry, gemGeometry, heartGeometry, magnetGeometry, projectileGeometry } from './models';

/** Gems, coins, hearts, magnets, chests and hostile projectiles. */
export class PickupRenderer {
  readonly group = new THREE.Group();
  private gems: THREE.InstancedMesh;
  private kinds: THREE.InstancedMesh[];
  private shots: THREE.InstancedMesh[];
  private beams: THREE.InstancedMesh;
  private tierColors: THREE.Color[];

  constructor() {
    this.group.name = 'pickups';
    this.gems = makeInstanced(gemGeometry(), new THREE.MeshBasicMaterial({ color: 0xffffff }), CAPS.gems, true);
    this.gems.name = 'gems';
    this.group.add(this.gems);
    this.tierColors = GEM_TIERS.map((t) => new THREE.Color(t.color));

    const geos = [coinGeometry(), heartGeometry(), magnetGeometry(), chestGeometry()];
    this.kinds = geos.map((g, k) => {
      const mat = k === PickupKind.Coin ? new THREE.MeshBasicMaterial({ vertexColors: true }) : lowPolyMaterial({ emissive: 0x221100, emissiveIntensity: 0.6 });
      const m = makeInstanced(g, mat, CAPS.pickups, false);
      m.name = `pickup:${k}`;
      this.group.add(m);
      return m;
    });

    // chest light beams so treasure is visible from afar
    const bg = new THREE.CylinderGeometry(0.5, 0.9, 30, 6, 1, true);
    bg.translate(0, 15, 0);
    this.beams = makeInstanced(bg, new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 32, false);
    this.group.add(this.beams);

    this.shots = [projectileGeometry('enemyOrb'), projectileGeometry('enemySpore')].map((g) => {
      const m = makeInstanced(g, new THREE.MeshBasicMaterial({ vertexColors: true }), CAPS.enemyProjectiles, false);
      this.group.add(m);
      return m;
    });
  }

  update(w: World, alpha: number, time: number): void {
    // gems
    const g = w.gems;
    const ga = this.gems.instanceMatrix.array as Float32Array;
    const gc = this.gems.instanceColor!.array as Float32Array;
    let n = 0;
    for (let i = 0; i < g.count; i++) {
      if (!g.alive[i]) continue;
      const x = g.px[i] + (g.x[i] - g.px[i]) * alpha;
      const y = g.py[i] + (g.y[i] - g.py[i]) * alpha;
      const z = g.pz[i] + (g.z[i] - g.pz[i]) * alpha;
      const tier = g.tier[i];
      const s = GEM_TIERS[tier].scale;
      const bob = g.grounded[i] && !g.magnet[i] ? Math.sin(time * 3 + i) * 0.08 : 0;
      writeTRS(ga, n * 16, x, y + bob, z, time * 2 + i, 0, s, s, s);
      const c = this.tierColors[tier];
      gc[n * 3] = c.r;
      gc[n * 3 + 1] = c.g;
      gc[n * 3 + 2] = c.b;
      n++;
    }
    commitInstances(this.gems, n);

    // pickups
    const pk = w.pickups;
    const counts = [0, 0, 0, 0];
    let nb = 0;
    const ba = this.beams.instanceMatrix.array as Float32Array;
    for (let i = 0; i < pk.count; i++) {
      if (!pk.alive[i]) continue;
      const kind = pk.kind[i];
      const mesh = this.kinds[kind];
      const k = counts[kind]++;
      const x = pk.px[i] + (pk.x[i] - pk.px[i]) * alpha;
      const y = pk.py[i] + (pk.y[i] - pk.py[i]) * alpha;
      const z = pk.pz[i] + (pk.z[i] - pk.pz[i]) * alpha;
      const spin = kind === PickupKind.Chest ? Math.sin(time * 2 + i) * 0.3 : time * 3 + i;
      const s = kind === PickupKind.Chest ? 1.1 : kind === PickupKind.Coin ? 1 : 1.25;
      const bob = kind === PickupKind.Chest ? 0 : Math.sin(time * 4 + i) * 0.12;
      writeTRS(mesh.instanceMatrix.array as Float32Array, k * 16, x, y + bob - (kind === PickupKind.Chest ? 0.5 : 0), z, spin, 0, s, s, s);
      if (kind === PickupKind.Chest && nb < 32) {
        writeTRS(ba, nb * 16, x, y - 0.5, z, time * 0.5, 0, 1, 1, 1);
        nb++;
      }
    }
    for (let k = 0; k < this.kinds.length; k++) commitInstances(this.kinds[k], counts[k]);
    commitInstances(this.beams, nb);

    // hostile projectiles
    const s = w.enemyShots;
    const sc = [0, 0];
    for (let i = 0; i < s.count; i++) {
      if (!s.alive[i]) continue;
      const v = s.visual[i] > 0 ? 1 : 0;
      const mesh = this.shots[v];
      const k = sc[v]++;
      const x = s.px[i] + (s.x[i] - s.px[i]) * alpha;
      const y = s.py[i] + (s.y[i] - s.py[i]) * alpha;
      const z = s.pz[i] + (s.z[i] - s.pz[i]) * alpha;
      const pulse = 1 + Math.sin(time * 18 + i) * 0.15;
      writeTRS(mesh.instanceMatrix.array as Float32Array, k * 16, x, y, z, time * 5, 0, pulse, pulse, pulse);
    }
    commitInstances(this.shots[0], sc[0]);
    commitInstances(this.shots[1], sc[1]);
  }
}
