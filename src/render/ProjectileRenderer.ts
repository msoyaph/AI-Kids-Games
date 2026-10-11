import * as THREE from 'three';
import { CAPS } from '../config/balance';
import { HazardKind } from '../sim/pools';
import { VISUALS } from '../sim/weapons/common';
import type { World } from '../sim/world';
import { addAlphaAttribute, alphaBasic, commitInstances, makeInstanced, TRS, writeTRSFrom } from './instancing';
import { lowPolyMaterial } from './geo';
import { iceSpikeGeometry, icicleGeometry, projectileGeometry } from './models';
import type { Particles } from './Particles';

const tmpC = new THREE.Color();

/** Player projectiles (per visual kind), ground hazards, enemy shockwave walls and auras. */
export class ProjectileRenderer {
  readonly group = new THREE.Group();
  private meshes: (THREE.InstancedMesh | null)[] = [];
  private counts: Int32Array;
  private discs: THREE.InstancedMesh;
  private walls: THREE.InstancedMesh;
  private auraRing: THREE.InstancedMesh;
  private auraHeads: THREE.InstancedMesh;
  /** Rimewood: icicles falling onto their telegraphs, ice spikes bursting from the ground. */
  private icicles: THREE.InstancedMesh;
  private spikes: THREE.InstancedMesh;
  private discAlpha: THREE.InstancedBufferAttribute;
  private wallAlpha: THREE.InstancedBufferAttribute;
  /** Solid (see-through) telegraphs instead of additive glow — for bright ground like snow. */
  private solid = false;

  constructor(private particles: Particles) {
    this.group.name = 'projectiles';
    VISUALS.forEach((v, k) => {
      if (v === 'none' || v === 'enemyOrb' || v === 'enemySpore') {
        this.meshes.push(null);
        return;
      }
      const m = makeInstanced(projectileGeometry(v), new THREE.MeshBasicMaterial({ vertexColors: true }), CAPS.projectiles, false);
      m.name = `proj:${v}:${k}`;
      this.meshes.push(m);
      this.group.add(m);
    });
    this.counts = new Int32Array(VISUALS.length);

    const dg = new THREE.CircleGeometry(1, 20);
    dg.rotateX(-Math.PI / 2);
    this.discs = makeInstanced(dg, alphaBasic({ color: 0xffffff, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }), CAPS.hazards, true);
    this.discAlpha = addAlphaAttribute(this.discs, CAPS.hazards);
    this.discs.renderOrder = 2;
    this.group.add(this.discs);

    const wg = new THREE.CylinderGeometry(1, 1, 1.1, 40, 1, true);
    wg.translate(0, 0.55, 0);
    this.walls = makeInstanced(wg, alphaBasic({ color: 0xffffff, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 32, true);
    this.wallAlpha = addAlphaAttribute(this.walls, 32);
    this.walls.renderOrder = 2;
    this.group.add(this.walls);

    const rg = new THREE.RingGeometry(0.9, 1, 48, 1);
    rg.rotateX(-Math.PI / 2);
    this.auraRing = makeInstanced(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 8, true);
    this.auraRing.renderOrder = 2;
    this.group.add(this.auraRing);
    const hg = new THREE.BoxGeometry(0.42, 0.26, 0.26);
    this.auraHeads = makeInstanced(hg, new THREE.MeshLambertMaterial({ color: 0xffffff }), 64, true);
    this.group.add(this.auraHeads);
    this.icicles = makeInstanced(icicleGeometry(), lowPolyMaterial(), 64, false);
    this.spikes = makeInstanced(iceSpikeGeometry(), lowPolyMaterial(), 128, false);
    this.group.add(this.icicles, this.spikes);
  }

  /** Glow (dark maps) or solid (bright, snowy maps) warning circles and shockwaves. */
  setTelegraphStyle(solid: boolean): void {
    if (solid === this.solid) return;
    this.solid = solid;
    for (const m of [this.discs, this.walls]) {
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.blending = solid ? THREE.NormalBlending : THREE.AdditiveBlending;
      mat.needsUpdate = true;
    }
  }

  update(w: World, alpha: number, time: number, px: number, py: number, pz: number): void {
    // ── projectiles ──
    const pr = w.projectiles;
    const counts = this.counts;
    counts.fill(0);
    for (let i = 0; i < pr.count; i++) {
      if (!pr.alive[i]) continue;
      const v = pr.visual[i];
      const mesh = this.meshes[v];
      if (!mesh) continue;
      const k = counts[v]++;
      const x = pr.px[i] + (pr.x[i] - pr.px[i]) * alpha;
      const y = pr.py[i] + (pr.y[i] - pr.py[i]) * alpha;
      const z = pr.pz[i] + (pr.z[i] - pr.pz[i]) * alpha;
      const s = pr.radius[i] / (pr.motion[i] === 1 || pr.motion[i] === 2 ? 0.6 : 0.4);
      let yaw = Math.atan2(pr.vx[i], pr.vz[i]);
      let roll = 0;
      switch (VISUALS[v]) {
        case 'disc':
          yaw = time * 18 + i;
          roll = Math.sin(time * 9 + i) * 0.25;
          break;
        case 'lantern':
          yaw = time * 2 + i;
          break;
        case 'seed':
          yaw = time * 10;
          roll = time * 7;
          break;
        case 'bee':
          roll = Math.sin(time * 30 + i) * 0.3;
          break;
      }
      TRS[0] = x;
      TRS[1] = y;
      TRS[2] = z;
      TRS[3] = yaw;
      TRS[4] = roll;
      TRS[5] = s;
      TRS[6] = s;
      TRS[7] = s;
      writeTRSFrom(mesh.instanceMatrix.array as Float32Array, k * 16);
    }
    for (let v = 0; v < this.meshes.length; v++) {
      const m = this.meshes[v];
      if (m) commitInstances(m, counts[v]);
    }

    // ── hazards ──
    const hz = w.hazards;
    const da = this.discs.instanceMatrix.array as Float32Array;
    const dc = this.discs.instanceColor!.array as Float32Array;
    const wa = this.walls.instanceMatrix.array as Float32Array;
    const wc = this.walls.instanceColor!.array as Float32Array;
    const daa = this.discAlpha.array as Float32Array;
    const waa = this.wallAlpha.array as Float32Array;
    const solid = this.solid;
    const ia = this.icicles.instanceMatrix.array as Float32Array;
    const sa = this.spikes.instanceMatrix.array as Float32Array;
    let ni = 0;
    let nsp = 0;
    let nd = 0;
    let nw = 0;
    for (let i = 0; i < hz.count; i++) {
      if (!hz.alive[i]) continue;
      const kind = hz.kind[i];
      const fade = Math.min(1, hz.life[i] * 3, (hz.maxLife[i] - hz.life[i]) * 8);
      tmpC.setHex(hz.color[i]);
      let intensity = 0.5;
      let r = hz.radius[i];
      if (kind === HazardKind.Fire) {
        intensity = (0.16 + Math.sin(time * 14 + i * 3) * 0.04) * fade;
        if (Math.random() < 0.5 * this.particles.density) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.sqrt(Math.random()) * r;
          this.particles.emit(hz.x[i] + Math.cos(a) * d, hz.y[i] + 0.2, hz.z[i] + Math.sin(a) * d, 0, 2 + Math.random() * 2, 0, 0.5, 0.25, Math.random() < 0.5 ? 0xffb347 : 0xff5a2a, -2);
        }
      } else if (kind === HazardKind.Burst) {
        intensity = 0.12 + (1 - hz.a0[i] / 0.28) * 0.25;
        r *= 0.5 + (1 - hz.a0[i] / 0.28) * 0.5;
      } else if (kind === HazardKind.EnemySlam) {
        const fuse = Math.max(0.01, hz.maxLife[i] - 0.05);
        const left = Math.max(0, hz.a0[i]);
        const f = 1 - left / Math.max(0.01, hz.maxLife[i]);
        intensity = 0.12 + f * 0.3 + (Math.sin(time * 30) > 0 ? 0.08 : 0);
        const look = hz.a1[i];
        if (look === 1 && ni < 64) {
          // icicle: drops from high above, accelerating, onto the warning circle
          const t = left / fuse;
          TRS[0] = hz.x[i];
          TRS[1] = hz.y[i] + 0.9 + 16 * t * t;
          TRS[2] = hz.z[i];
          TRS[3] = i;
          TRS[4] = 0;
          TRS[5] = TRS[6] = TRS[7] = 0.6 + hz.radius[i] * 0.35;
          writeTRSFrom(ia, ni++ * 16);
        } else if (look === 2 && nsp < 128 && left < 0.3) {
          // ice spike: breaks the surface just before it strikes
          const g = 1 - left / 0.3;
          TRS[0] = hz.x[i];
          TRS[1] = hz.y[i] - 0.3;
          TRS[2] = hz.z[i];
          TRS[3] = i * 1.7;
          TRS[4] = 0;
          TRS[5] = TRS[7] = hz.radius[i] * 0.8;
          TRS[6] = hz.radius[i] * 0.9 * g;
          writeTRSFrom(sa, nsp++ * 16);
        }
        if (look === 0) tmpC.setHex(0xff3b4f);
        else if (solid) tmpC.setHex(0x1f62d8); // deep ice blue reads on snow
      } else if (kind === HazardKind.EnemyPuddle) {
        intensity = 0.2 * fade;
      } else if (kind === HazardKind.EnemyRing) {
        const rr = hz.a0[i];
        if (rr <= 0.05) continue;
        TRS[0] = hz.x[i];
        TRS[1] = hz.y[i] - 0.1;
        TRS[2] = hz.z[i];
        TRS[3] = 0;
        TRS[4] = 0;
        TRS[5] = rr;
        TRS[6] = 1;
        TRS[7] = rr;
        writeTRSFrom(wa, nw * 16);
        const f = 0.9 * Math.min(1, (hz.radius[i] - rr) / 4);
        if (solid) {
          wc[nw * 3] = tmpC.r * 0.85;
          wc[nw * 3 + 1] = tmpC.g * 0.85;
          wc[nw * 3 + 2] = tmpC.b * 0.85;
          waa[nw] = 0.75 * f;
        } else {
          wc[nw * 3] = tmpC.r * f;
          wc[nw * 3 + 1] = tmpC.g * f;
          wc[nw * 3 + 2] = tmpC.b * f;
          waa[nw] = 1;
        }
        nw++;
        continue;
      }
      TRS[0] = hz.x[i];
      TRS[1] = hz.y[i] + 0.08;
      TRS[2] = hz.z[i];
      TRS[3] = i;
      TRS[4] = 0;
      TRS[5] = r;
      TRS[6] = 1;
      TRS[7] = r;
      writeTRSFrom(da, nd * 16);
      if (solid) {
        dc[nd * 3] = tmpC.r;
        dc[nd * 3 + 1] = tmpC.g;
        dc[nd * 3 + 2] = tmpC.b;
        daa[nd] = Math.min(0.8, 0.12 + intensity * 1.6);
      } else {
        dc[nd * 3] = tmpC.r * intensity;
        dc[nd * 3 + 1] = tmpC.g * intensity;
        dc[nd * 3 + 2] = tmpC.b * intensity;
        daa[nd] = 1;
      }
      nd++;
    }
    commitInstances(this.discs, nd, [this.discAlpha]);
    commitInstances(this.walls, nw, [this.wallAlpha]);
    commitInstances(this.icicles, ni);
    commitInstances(this.spikes, nsp);

    // ── auras (melee rings around the player) ──
    const ra = this.auraRing.instanceMatrix.array as Float32Array;
    const rc = this.auraRing.instanceColor!.array as Float32Array;
    const ha = this.auraHeads.instanceMatrix.array as Float32Array;
    const hc = this.auraHeads.instanceColor!.array as Float32Array;
    let nr = 0;
    let nh = 0;
    const gy = w.terrain.height(px, pz);
    for (const wi of w.weapons) {
      if (wi.def.behavior !== 'aura') continue;
      const r = wi.stats.area;
      tmpC.setHex(wi.def.visual.color);
      const pulse = 1 - Math.min(1, Math.max(0, wi.pulse) / Math.max(0.1, wi.stats.hitInterval));
      TRS[0] = px;
      TRS[1] = Math.max(gy, py) + 0.12;
      TRS[2] = pz;
      TRS[3] = 0;
      TRS[4] = 0;
      TRS[5] = r;
      TRS[6] = 1;
      TRS[7] = r;
      writeTRSFrom(ra, nr * 16);
      const ri = 0.25 + pulse * 0.25;
      rc[nr * 3] = tmpC.r * ri;
      rc[nr * 3 + 1] = tmpC.g * ri;
      rc[nr * 3 + 2] = tmpC.b * ri;
      nr++;
      const heads = wi.def.evolved ? 8 : 5;
      for (let k = 0; k < heads && nh < 64; k++) {
        const a = time * 2.2 + (k / heads) * Math.PI * 2;
        const hy = py + 0.9 + Math.sin(time * 6 + k) * 0.15 - pulse * pulse * 0.5;
        TRS[0] = px + Math.sin(a) * r * 0.92;
        TRS[1] = hy;
        TRS[2] = pz + Math.cos(a) * r * 0.92;
        TRS[3] = a;
        TRS[4] = 0.4;
        TRS[5] = 1.4;
        TRS[6] = 1.4;
        TRS[7] = 1.4;
        writeTRSFrom(ha, nh * 16);
        hc[nh * 3] = tmpC.r;
        hc[nh * 3 + 1] = tmpC.g;
        hc[nh * 3 + 2] = tmpC.b;
        nh++;
      }
    }
    commitInstances(this.auraRing, nr);
    commitInstances(this.auraHeads, nh);
  }
}
