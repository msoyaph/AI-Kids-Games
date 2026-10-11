import * as THREE from 'three';
import { CAPS, GEM_TIERS } from '../config/balance';
import { PickupKind } from '../sim/pools';
import type { World } from '../sim/world';
import { lowPolyMaterial } from './geo';
import { commitInstances, makeInstanced, TRS, writeTRSFrom } from './instancing';
import { chestGeometry, coinGeometry, gemGeometry, heartGeometry, magnetGeometry, projectileGeometry, shardGeometry } from './models';

/** Gems, coins, hearts, magnets, chests and hostile projectiles. */
export class PickupRenderer {
  readonly group = new THREE.Group();
  private gems: THREE.InstancedMesh[];
  private kinds: THREE.InstancedMesh[];
  private shots: THREE.InstancedMesh[];
  private beams: THREE.InstancedMesh;
  private tierColors: THREE.Color[];
  private kindCounts = new Int32Array(4);
  private shotCounts = new Int32Array(3);

  private gemCounts = new Int32Array(GEM_TIERS.length);

  /** Colour-blind mode: Okabe-Ito tier colours and a distinct shape per tier. */
  setColorblind(on: boolean): void {
    const cb = [0x56b4e9, 0x009e73, 0xcc79a7, 0xe69f00];
    this.gems.forEach((m, k) => {
      m.geometry.dispose();
      m.geometry = gemGeometry(on ? k : 0);
      this.tierColors[k].setHex(on ? cb[k] : GEM_TIERS[k].color);
    });
  }

  constructor() {
    this.group.name = 'pickups';
    const gemMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a2a2a, flatShading: true });
    this.gems = GEM_TIERS.map((_, k) => {
      const m = makeInstanced(gemGeometry(), gemMat, CAPS.gems, true);
      m.name = `gems:${k}`;
      this.group.add(m);
      return m;
    });
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

    // indexed by ShotVisual: orb, spore, ice shard
    this.shots = [projectileGeometry('enemyOrb'), projectileGeometry('enemySpore'), shardGeometry()].map((g) => {
      const m = makeInstanced(g, new THREE.MeshBasicMaterial({ vertexColors: true }), CAPS.enemyProjectiles, false);
      this.group.add(m);
      return m;
    });
  }

  update(w: World, alpha: number, time: number): void {
    // gems (one mesh per tier: colour-blind mode gives each tier its own shape)
    const g = w.gems;
    const gn = this.gemCounts;
    gn.fill(0);
    for (let i = 0; i < g.count; i++) {
      if (!g.alive[i]) continue;
      const x = g.px[i] + (g.x[i] - g.px[i]) * alpha;
      const y = g.py[i] + (g.y[i] - g.py[i]) * alpha;
      const z = g.pz[i] + (g.z[i] - g.pz[i]) * alpha;
      const tier = g.tier[i];
      const mesh = this.gems[tier];
      const n = gn[tier]++;
      const ga = mesh.instanceMatrix.array as Float32Array;
      const gc = mesh.instanceColor!.array as Float32Array;
      const s = GEM_TIERS[tier].scale;
      const bob = g.grounded[i] && !g.magnet[i] ? Math.sin(time * 3 + i) * 0.08 : 0;
      TRS[0] = x;
      TRS[1] = y + bob;
      TRS[2] = z;
      TRS[3] = time * 2 + i;
      TRS[4] = 0;
      TRS[5] = s;
      TRS[6] = s;
      TRS[7] = s;
      writeTRSFrom(ga, n * 16);
      const c = this.tierColors[tier];
      gc[n * 3] = c.r;
      gc[n * 3 + 1] = c.g;
      gc[n * 3 + 2] = c.b;
    }
    for (let k = 0; k < this.gems.length; k++) commitInstances(this.gems[k], gn[k]);

    // pickups
    const pk = w.pickups;
    const counts = this.kindCounts;
    counts.fill(0);
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
      TRS[0] = x;
      TRS[1] = y + bob - (kind === PickupKind.Chest ? 0.5 : 0);
      TRS[2] = z;
      TRS[3] = spin;
      TRS[4] = 0;
      TRS[5] = s;
      TRS[6] = s;
      TRS[7] = s;
      writeTRSFrom(mesh.instanceMatrix.array as Float32Array, k * 16);
      if (kind === PickupKind.Chest && nb < 32) {
        TRS[0] = x;
        TRS[1] = y - 0.5;
        TRS[2] = z;
        TRS[3] = time * 0.5;
        TRS[4] = 0;
        TRS[5] = 1;
        TRS[6] = 1;
        TRS[7] = 1;
        writeTRSFrom(ba, nb * 16);
        nb++;
      }
    }
    for (let k = 0; k < this.kinds.length; k++) commitInstances(this.kinds[k], counts[k]);
    commitInstances(this.beams, nb);

    // hostile projectiles
    const s = w.enemyShots;
    const sc = this.shotCounts;
    sc.fill(0);
    for (let i = 0; i < s.count; i++) {
      if (!s.alive[i]) continue;
      const v = s.visual[i] < 3 ? s.visual[i] : 0;
      const mesh = this.shots[v];
      const k = sc[v]++;
      const x = s.px[i] + (s.x[i] - s.px[i]) * alpha;
      const y = s.py[i] + (s.y[i] - s.py[i]) * alpha;
      const z = s.pz[i] + (s.z[i] - s.pz[i]) * alpha;
      const pulse = 1 + Math.sin(time * 18 + i) * 0.15;
      TRS[0] = x;
      TRS[1] = y;
      TRS[2] = z;
      // shards point where they fly; orbs and spores tumble
      TRS[3] = v === 2 ? Math.atan2(s.vx[i], s.vz[i]) : time * 5;
      TRS[4] = 0;
      TRS[5] = pulse;
      TRS[6] = pulse;
      TRS[7] = pulse;
      writeTRSFrom(mesh.instanceMatrix.array as Float32Array, k * 16);
    }
    for (let v = 0; v < this.shots.length; v++) commitInstances(this.shots[v], sc[v]);
  }
}
