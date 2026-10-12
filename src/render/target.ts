// A soft ring on the tile the action button will affect (green: something happens there; white: a
// tool is in hand but nothing is there). Bends with the curved world like everything else.
import * as THREE from 'three';
import type { Game } from '../sim/game';
import { actionTarget } from '../sim/target';
import { curved } from './curve';
import { WATER_Y } from './terrain';

const OK = new THREE.Color(0x7fffb0);
const IDLE = new THREE.Color(0xfff6e0);

export class TargetMarker {
  readonly group = new THREE.Group();
  private ringMat = curved(new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0.95, depthWrite: false }));
  private fillMat = curved(new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0.22, depthWrite: false }));
  private t = 0;

  constructor() {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.47, 40), this.ringMat);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(0.36, 40), this.fillMat);
    for (const m of [ring, fill]) {
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 3;
      this.group.add(m);
    }
    this.group.visible = false;
  }

  frame(dt: number, g: Game): void {
    const t = actionTarget(g);
    this.group.visible = !!t;
    if (!t) return;
    this.t += dt;
    const w = g.world;
    const water = w.isWater(t.tile);
    const y = water ? WATER_Y + 0.04 : w.surfaceY(t.x, t.z) + 0.06;
    this.group.position.set(t.x, y, t.z);
    const c = t.ok ? OK : IDLE;
    this.ringMat.color.copy(c);
    this.fillMat.color.copy(c);
    this.fillMat.opacity = t.ok ? 0.22 : 0.1;
    this.group.scale.setScalar(t.ok ? 1 + Math.sin(this.t * 5) * 0.06 : 0.92);
  }
}
