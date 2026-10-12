import * as THREE from 'three';
import type { KartConfig } from '../data/types';
import { Kart } from '../sim/kart';
import { KartVisual, buildSharedKartGeometry } from './kartModel';
import { GF_BOOST, GF_DRIFT, GF_DRIFT_LEFT, GF_GLIDE, type GhostData, type GhostFrame } from '../sim/ghost';
import { deriveParams, WEIGHT_BASE } from '../sim/tuning';

let ghostMat: THREE.MeshLambertMaterial | null = null;

/** A see-through kart that replays a recorded Time Trial run. */
export class GhostVisual {
  readonly kart: Kart;
  readonly visual: KartVisual;
  private readonly frame: GhostFrame = { x: 0, y: 0, z: 0, yaw: 0, flags: 0 };

  constructor(
    readonly ghost: GhostData,
    racerId: string,
    cfg: KartConfig,
    tint: number,
  ) {
    this.kart = new Kart(-1, racerId, cfg, WEIGHT_BASE.medium, deriveParams(WEIGHT_BASE.medium, 1), -1, 'Ghost');
    this.visual = new KartVisual(this.kart, buildSharedKartGeometry());
    if (!ghostMat) ghostMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false });
    const mat = ghostMat.clone();
    mat.color.setHex(tint);
    this.visual.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.material = mat;
        m.castShadow = false;
        m.renderOrder = 4;
      }
    });
  }

  update(t: number, dt: number, time: number): void {
    const f = this.ghost.sample(t, this.frame);
    const k = this.kart;
    k.px = k.x;
    k.py = k.y;
    k.pz = k.z;
    k.pyaw = k.yaw;
    k.x = f.x;
    k.y = f.y;
    k.z = f.z;
    k.yaw = f.yaw;
    k.drifting = (f.flags & GF_DRIFT) !== 0;
    k.driftDir = f.flags & GF_DRIFT_LEFT ? -1 : 1;
    k.gliding = (f.flags & GF_GLIDE) !== 0;
    k.boostTime = f.flags & GF_BOOST ? 0.5 : 0;
    k.speed = 20;
    this.visual.update(1, dt, time);
    this.visual.root.visible = t <= this.ghost.duration + 0.5;
  }
}
