import * as THREE from 'three';
import { CAPS } from '../config/balance';
import { ENEMIES } from '../config/enemies';
import type { World } from '../sim/world';
import { addFlashAttribute, commitInstances, flashLambert, makeInstanced, TRS, writeTRSFrom } from './instancing';
import { enemyGeometry } from './models';

const BEHAVIOR_CHARGER = 'charger';
const BEHAVIOR_EXPLODER = 'exploder';

/** One InstancedMesh per enemy type + one for all blob shadows. */
export class EnemyRenderer {
  readonly group = new THREE.Group();
  private meshes: THREE.InstancedMesh[] = [];
  private flash: THREE.InstancedBufferAttribute[] = [];
  private counts: Int32Array;
  private shadows: THREE.InstancedMesh;
  private isCharger: Uint8Array;
  private isExploder: Uint8Array;
  private isBoss: Uint8Array;
  private bobAmp: Float32Array;
  shadowsEnabled = true;

  constructor(cap = CAPS.enemies + 400) {
    this.group.name = 'enemies';
    this.counts = new Int32Array(ENEMIES.length);
    this.isCharger = new Uint8Array(ENEMIES.map((d) => (d.behavior === BEHAVIOR_CHARGER ? 1 : 0)));
    this.isExploder = new Uint8Array(ENEMIES.map((d) => (d.behavior === BEHAVIOR_EXPLODER ? 1 : 0)));
    this.isBoss = new Uint8Array(ENEMIES.map((d) => (d.behavior === 'boss' ? 1 : 0)));
    this.bobAmp = Float32Array.from(ENEMIES.map((d) => (d.id === 'gnatlet' ? 0.25 : d.id === 'gloamRegent' ? 0.6 : 0)));
    ENEMIES.forEach((def) => {
      const c = Math.min(cap, def.maxCount ?? cap);
      const mesh = makeInstanced(enemyGeometry(def.id, def.color), flashLambert(), c, true);
      mesh.name = `enemy:${def.id}`;
      this.flash.push(addFlashAttribute(mesh, c));
      this.meshes.push(mesh);
      this.group.add(mesh);
    });
    const sg = new THREE.CircleGeometry(1, 10);
    sg.rotateX(-Math.PI / 2);
    const sm = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.shadows = makeInstanced(sg, sm, cap, false);
    this.shadows.renderOrder = 1;
    this.group.add(this.shadows);
  }

  setCastShadows(on: boolean): void {
    for (let t = 0; t < this.meshes.length; t++) this.meshes[t].castShadow = on && this.isBoss[t] === 1;
  }

  update(w: World, alpha: number, time: number): void {
    const e = w.enemies;
    const counts = this.counts;
    counts.fill(0);
    const shadowArr = this.shadows.instanceMatrix.array as Float32Array;
    let ns = 0;
    const doShadows = this.shadowsEnabled;
    for (let i = 0; i < e.count; i++) {
      if (!e.alive[i]) continue;
      const t = e.type[i];
      const mesh = this.meshes[t];
      const k = counts[t];
      if (k >= mesh.instanceMatrix.count) continue;
      counts[t] = k + 1;
      const x = e.px[i] + (e.x[i] - e.px[i]) * alpha;
      const y = e.py[i] + (e.y[i] - e.py[i]) * alpha;
      const z = e.pz[i] + (e.z[i] - e.pz[i]) * alpha;
      const age = e.age[i];
      const spawnK = age < 0.35 ? Math.max(0.05, age / 0.35) : 1;
      let s = e.scale[i] * spawnK;
      const phase = age * 9 + e.uid[i];
      let roll = this.isBoss[t] ? Math.sin(phase * 0.4) * 0.04 : Math.sin(phase) * 0.1;
      let sy = s * (1 + Math.sin(phase * 2) * 0.05);
      let flash = e.flash[i] > 0 ? 1 : 0;
      let cr = 1;
      let cg = 1;
      let cb = 1;
      if (e.elite[i]) {
        cr = 1.55;
        cg = 1.25;
        cb = 0.5;
        flash = Math.max(flash, 0.12 + Math.sin(time * 6) * 0.08);
      }
      if (this.isCharger[t]) {
        const st = e.state[i];
        if (st === 1) {
          // wind-up: shake + glow red
          roll = Math.sin(time * 60) * 0.12;
          cr = 1.8;
          cg = 0.55;
          cb = 0.5;
        } else if (st === 2) {
          roll = 0;
          sy *= 0.9;
        }
      } else if (this.isExploder[t] && e.state[i] === 1) {
        flash = Math.max(flash, Math.sin(time * 40) > 0 ? 0.8 : 0);
        s *= 1 + (1 - e.stT[i]) * 0.3;
        sy = s;
      }
      if (e.slowT[i] > 0) {
        cr *= 0.75;
        cg *= 0.95;
        cb *= 1.5;
      }
      const bob = this.bobAmp[t] > 0 ? Math.sin(time * 6 + e.uid[i]) * this.bobAmp[t] : 0;
      TRS[0] = x;
      TRS[1] = y + bob;
      TRS[2] = z;
      TRS[3] = e.yaw[i];
      TRS[4] = roll;
      TRS[5] = s;
      TRS[6] = sy;
      TRS[7] = s;
      writeTRSFrom(mesh.instanceMatrix.array as Float32Array, k * 16);
      const col = mesh.instanceColor!.array as Float32Array;
      col[k * 3] = cr;
      col[k * 3 + 1] = cg;
      col[k * 3 + 2] = cb;
      (this.flash[t].array as Float32Array)[k] = flash;
      if (doShadows) {
        const r = e.radius[i] * 1.25 * spawnK;
        TRS[0] = x;
        TRS[1] = y + 0.06;
        TRS[2] = z;
        TRS[3] = 0;
        TRS[4] = 0;
        TRS[5] = r;
        TRS[6] = 1;
        TRS[7] = r;
        writeTRSFrom(shadowArr, ns * 16);
        ns++;
      }
    }
    for (let t = 0; t < this.meshes.length; t++) commitInstances(this.meshes[t], counts[t], [this.flash[t]]);
    commitInstances(this.shadows, ns);
  }
}
