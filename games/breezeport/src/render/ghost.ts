/**
 * The placing ghost: a see-through copy of the thing being placed, standing where it would go, with
 * a soft ring showing a service's reach. (The idea follows games/fieldlark/src/render/ghost.ts; the
 * ring is new.)
 */
import * as THREE from 'three';
import { THING } from '../data/things';
import { TUNING } from '../data/tuning';
import type { Rot } from '../sim/state';
import { sizeOf } from '../sim/world';
import { modelFor } from './objects';

const ghostMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false });
const ringMat = new THREE.MeshBasicMaterial({ color: 0x2fa3b0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
const ringEdge = new THREE.MeshBasicMaterial({ color: 0x2fa3b0, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });

export class Ghost {
  readonly group = new THREE.Group();
  private mesh: THREE.Mesh | null = null;
  private def = '';
  private ring: THREE.Mesh;
  private edge: THREE.Mesh;

  constructor() {
    this.ring = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), ringMat);
    this.edge = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64).rotateX(-Math.PI / 2), ringEdge);
    this.ring.renderOrder = this.edge.renderOrder = 6;
    this.group.add(this.ring, this.edge);
    this.group.visible = false;
  }

  show(def: string, x: number, z: number, rot: Rot, fits: boolean) {
    const d = THING[def];
    if (!d) return this.hide();
    if (def !== this.def) {
      if (this.mesh) this.group.remove(this.mesh);
      this.mesh = new THREE.Mesh(modelFor(def, false), ghostMat);
      this.mesh.renderOrder = 7;
      this.group.add(this.mesh);
      this.def = def;
    }
    const s = sizeOf(d, rot);
    this.mesh!.position.set(x + s.w / 2, 0.02, z + s.d / 2);
    this.mesh!.rotation.y = (-rot * Math.PI) / 2;
    ghostMat.color.setHex(fits ? 0xffffff : 0xffb0a0);
    const r = d.service ? TUNING.services.radius[d.service] : 0;
    this.ring.visible = this.edge.visible = r > 0;
    if (r) {
      for (const m of [this.ring, this.edge]) { m.position.set(x + s.w / 2, 0.04, z + s.d / 2); m.scale.setScalar(r); }
    }
    this.group.visible = true;
  }

  hide() { this.group.visible = false; }
}
