import * as THREE from 'three';
import { SHRINES } from '../config/meta';
import type { World } from '../sim/world';
import { lowPolyMaterial } from './geo';
import { commitInstances, makeInstanced, TRS, writeTRSFrom } from './instancing';
import { shrineCrystalGeometry, shrineGeometry } from './models';

const MAX = 32;

/** Breakable shrines: stone pedestal + floating coloured crystal + sky beam. */
export class ShrineRenderer {
  readonly group = new THREE.Group();
  private bases: THREE.InstancedMesh;
  private crystals: THREE.InstancedMesh;
  private beams: THREE.InstancedMesh;
  private colors = new Map<string, THREE.Color>(SHRINES.map((s) => [s.kind, new THREE.Color(s.color)]));

  constructor() {
    this.group.name = 'shrines';
    this.bases = makeInstanced(shrineGeometry(), lowPolyMaterial(), MAX, false);
    this.crystals = makeInstanced(shrineCrystalGeometry(), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX, true);
    const bg = new THREE.CylinderGeometry(0.35, 0.7, 40, 6, 1, true);
    bg.translate(0, 20, 0);
    this.beams = makeInstanced(bg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), MAX, true);
    this.group.add(this.bases, this.crystals, this.beams);
  }

  setShadows(on: boolean): void {
    this.bases.castShadow = on;
  }

  update(w: World, time: number): void {
    const ba = this.bases.instanceMatrix.array as Float32Array;
    const ca = this.crystals.instanceMatrix.array as Float32Array;
    const cc = this.crystals.instanceColor!.array as Float32Array;
    const ea = this.beams.instanceMatrix.array as Float32Array;
    const ec = this.beams.instanceColor!.array as Float32Array;
    let n = 0;
    for (const s of w.shrines) {
      if (!s.alive || n >= MAX) continue;
      const shake = s.shake > 0 ? Math.sin(time * 70) * s.shake * 0.6 : 0;
      TRS[0] = s.x + shake;
      TRS[1] = s.y - 0.05;
      TRS[2] = s.z;
      TRS[3] = 0.3;
      TRS[4] = shake * 0.3;
      TRS[5] = 1;
      TRS[6] = 1;
      TRS[7] = 1;
      writeTRSFrom(ba, n * 16);
      const bob = Math.sin(time * 2 + s.x) * 0.25;
      const crack = 1 - s.hp / 3;
      const sc = 1 + crack * 0.25 + (s.shake > 0 ? 0.2 : 0);
      TRS[0] = s.x + shake;
      TRS[1] = s.y + 2.7 + bob;
      TRS[2] = s.z;
      TRS[3] = time * 1.5;
      TRS[4] = 0;
      TRS[5] = sc;
      TRS[6] = sc;
      TRS[7] = sc;
      writeTRSFrom(ca, n * 16);
      const c = this.colors.get(s.kind)!;
      cc[n * 3] = c.r * (1 + crack);
      cc[n * 3 + 1] = c.g * (1 + crack);
      cc[n * 3 + 2] = c.b * (1 + crack);
      TRS[0] = s.x;
      TRS[1] = s.y + 2.7;
      TRS[2] = s.z;
      TRS[3] = 0;
      TRS[4] = 0;
      TRS[5] = 1;
      TRS[6] = 1;
      TRS[7] = 1;
      writeTRSFrom(ea, n * 16);
      const pulse = 0.14 + Math.sin(time * 3 + s.z) * 0.04;
      ec[n * 3] = c.r * pulse;
      ec[n * 3 + 1] = c.g * pulse;
      ec[n * 3 + 2] = c.b * pulse;
      n++;
    }
    commitInstances(this.bases, n);
    commitInstances(this.crystals, n);
    commitInstances(this.beams, n);
  }
}
