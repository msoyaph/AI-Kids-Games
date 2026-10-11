// The Lantern Crossing festival cutscene: lanterns rise from the plaza and drift out to sea
// while the restored lighthouse sweeps its beam.
import * as THREE from 'three';
import type { Game } from '../sim/game';
import { agents } from '../sim/agents';
import { LEVEL_HEIGHT } from '../world/types';

export interface Cinematic {
  target: THREE.Vector3;
  dist: number;
  pitch: number;
}

const LANTERNS = 140;

export class FestivalScene {
  readonly group = new THREE.Group();
  private lanterns: THREE.InstancedMesh;
  private data: { x: number; y: number; z: number; vx: number; vz: number; delay: number; wob: number }[] = [];
  private beam: THREE.Mesh;
  private beamPivot = new THREE.Group();
  private dummy = new THREE.Object3D();
  t = 0;
  active = false;
  readonly duration = 26;
  cam: Cinematic = { target: new THREE.Vector3(), dist: 18, pitch: 30 };

  constructor() {
    const geo = new THREE.SphereGeometry(0.22, 8, 6);
    geo.scale(1, 1.25, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffc27a, fog: false });
    this.lanterns = new THREE.InstancedMesh(geo, mat, LANTERNS);
    this.lanterns.frustumCulled = false;
    this.lanterns.count = 0;
    const c = new THREE.Color();
    for (let i = 0; i < LANTERNS; i++) this.lanterns.setColorAt(i, c.setHSL(0.06 + (i % 5) * 0.02, 1, 0.68));
    this.beam = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 26, 16, 1, true).translate(0, -13, 0).rotateZ(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfff2b8, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: THREE.AdditiveBlending }),
    );
    this.beamPivot.add(this.beam);
    this.group.add(this.lanterns, this.beamPivot);
    this.group.visible = false;
  }

  start(g: Game): void {
    this.active = true;
    this.t = 0;
    this.group.visible = true;
    const plaza = g.world.gen.lots.plaza;
    const cx = plaza.x + plaza.w / 2, cz = plaza.z + plaza.d / 2;
    this.data = [];
    for (let i = 0; i < LANTERNS; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 4;
      this.data.push({ x: cx + Math.cos(a) * r, y: 0.8, z: cz + Math.sin(a) * r, vx: (Math.random() - 0.5) * 0.4, vz: 0.6 + Math.random() * 0.8, delay: 2 + Math.random() * 9, wob: Math.random() * 10 });
    }
    // gather everyone in the plaza
    let k = 0;
    const all = [...agents(g).values()];
    for (const a of all) {
      const ang = (k / Math.max(1, all.length)) * Math.PI * 1.4 + Math.PI * 0.3;
      a.x = cx + Math.cos(ang) * 3.2;
      a.z = cz + 1 + Math.sin(ang) * 2.2;
      a.facing = 0;
      a.path = [];
      a.visible = true;
      a.talking = true;
      k++;
    }
    const p = g.state.player;
    p.x = cx;
    p.z = cz + 1.5;
    p.facing = 0;
    const lh = g.world.gen.lots.lighthouse;
    this.beamPivot.position.set(lh.x + 1, 2 * LEVEL_HEIGHT + 4.5, lh.z + 1);
    this.cam.target.set(cx, 0.5, cz);
  }

  /** Returns false once finished. */
  frame(dt: number, g: Game): boolean {
    if (!this.active) return false;
    this.t += dt;
    const t = this.t;
    const plaza = g.world.gen.lots.plaza;
    const cx = plaza.x + plaza.w / 2, cz = plaza.z + plaza.d / 2;
    const lh = g.world.gen.lots.lighthouse;
    // camera path: crowd -> lanterns over the sea -> lighthouse
    const ease = (a: number, b: number, s: number) => {
      const k = Math.min(1, Math.max(0, s));
      const e = k * k * (3 - 2 * k);
      return a + (b - a) * e;
    };
    if (t < 8) {
      this.cam.target.set(cx, 0.6, cz + 1);
      this.cam.dist = ease(9, 14, t / 8);
      this.cam.pitch = ease(22, 26, t / 8);
    } else if (t < 17) {
      const s = (t - 8) / 9;
      this.cam.target.set(cx, ease(1, 6, s), ease(cz + 1, cz + 16, s));
      this.cam.dist = ease(14, 22, s);
      this.cam.pitch = ease(26, 14, s);
    } else {
      const s = (t - 17) / 7;
      this.cam.target.set(ease(cx, lh.x + 1, s), ease(6, 7, s), ease(cz + 16, lh.z + 8, s));
      this.cam.dist = ease(22, 34, s);
      this.cam.pitch = ease(14, 22, s);
    }
    // lanterns
    let n = 0;
    for (const L of this.data) {
      const lt = t - L.delay;
      if (lt < 0) continue;
      const y = L.y + lt * 0.75;
      const x = L.x + L.vx * lt + Math.sin(lt * 0.8 + L.wob) * 0.3;
      const z = L.z + L.vz * lt * 1.6;
      this.dummy.position.set(x, y, z);
      this.dummy.scale.setScalar(1 + Math.sin(t * 6 + L.wob) * 0.05);
      this.dummy.updateMatrix();
      this.lanterns.setMatrixAt(n++, this.dummy.matrix);
    }
    this.lanterns.count = n;
    this.lanterns.instanceMatrix.needsUpdate = true;
    // the lighthouse lights up a few seconds in
    this.beamPivot.visible = t > 5;
    this.beamPivot.rotation.y = t * 0.9;
    if (t > 5 && !g.state.flags.lighthouseLit) {
      g.state.flags.lighthouseLit = 1;
      g.emit('structuresChanged', {});
    }
    if (t >= this.duration) {
      this.active = false;
      return false;
    }
    return true;
  }

  stop(): void {
    this.active = false;
    this.group.visible = false;
    this.lanterns.count = 0;
  }
}

/** Persistent lighthouse beam after the finale (free play). */
export class LighthouseBeam {
  readonly pivot = new THREE.Group();
  constructor() {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 22, 14, 1, true).translate(0, -11, 0).rotateZ(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfff2b8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: THREE.AdditiveBlending }),
    );
    this.pivot.add(beam);
    this.pivot.visible = false;
  }
  frame(g: Game, t: number, night: number): void {
    const lit = !!g.state.flags.lighthouseLit && night > 0.3;
    this.pivot.visible = lit;
    if (!lit) return;
    const lh = g.world.gen.lots.lighthouse;
    this.pivot.position.set(lh.x + 1, 2 * LEVEL_HEIGHT + 4.5, lh.z + 1);
    this.pivot.rotation.y = t * 0.6;
  }
}
