import * as THREE from 'three';
import type { CoinRushRules } from '../sim/coinRush';
import { buildRecipe } from './lowpoly';
import { Materials } from './materials';

let coinGeo: THREE.BufferGeometry | null = null;

/** Spinning gold coins for Coin Rush (one instanced draw call). */
export class CoinVisuals {
  readonly mesh: THREE.InstancedMesh;
  private time = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3(1, 1, 1);

  constructor(readonly rules: CoinRushRules) {
    if (!coinGeo) {
      coinGeo = buildRecipe([
        { shape: 'cyl', s: [1.0, 0.16, 1.0], r: [90, 0, 0], c: 0xffd23f, seg: 14 },
        { shape: 'cyl', s: [0.66, 0.2, 0.66], r: [90, 0, 0], c: 0xffe98a, seg: 10 },
        { shape: 'torus', s: [1.05, 1.05, 0.5], c: 0xc98a00, seg: 14 },
      ]);
      coinGeo.userData.shared = true;
    }
    this.mesh = new THREE.InstancedMesh(coinGeo, Materials.basic, rules.coins.length);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.name = 'coins';
  }

  update(dt: number): void {
    this.time += dt;
    let n = 0;
    for (let i = 0; i < this.rules.coins.length; i++) {
      const c = this.rules.coins[i];
      if (!c.active) continue;
      const bob = c.dropped && c.vy !== 0 ? 0 : Math.sin(this.time * 3 + i) * 0.15;
      this.p.set(c.x, c.y + bob, c.z);
      this.e.set(0, this.time * 3 + i * 0.7, 0);
      this.q.setFromEuler(this.e);
      // blink while the dropper can't grab it back yet
      const sc = c.ownerTime > 0 && Math.floor(this.time * 12) % 2 === 0 ? 0.75 : 1;
      this.s.setScalar(sc);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(n++, this.m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
