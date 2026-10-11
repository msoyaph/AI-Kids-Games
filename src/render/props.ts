import * as THREE from 'three';
import { PROPS } from '../data/props/index';
import type { PropPlacement, PropScatter } from '../data/types';
import { Rng } from '../core/rng';
import { buildRecipe } from './lowpoly';
import { Materials } from './materials';
import { EDGE_DROP, F_GAP, type TrackModel } from '../sim/track/trackModel';

interface Instance {
  /** Hand-placed landmark (never removed by the quality density setting). */
  fixed?: boolean;
  x: number;
  y: number;
  z: number;
  rot: number;
  scale: number;
  color?: number;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
export function propGeometry(type: string): THREE.BufferGeometry | null {
  const recipe = PROPS[type];
  if (!recipe) return null;
  let g = geoCache.get(type);
  if (!g) {
    g = buildRecipe(recipe);
    geoCache.set(type, g);
  }
  return g;
}

/** Coarse spatial hash of main-track samples for "is this spot clear of the road?" checks. */
class SampleGrid {
  private cells = new Map<number, number[]>();
  constructor(
    private readonly track: TrackModel,
    private readonly cell = 16,
  ) {
    const rb = track.main;
    for (let i = 0; i < rb.n; i++) this.add(rb.px[i], rb.pz[i], i);
  }
  private key(cx: number, cz: number): number {
    return (cx + 4096) * 8192 + (cz + 4096);
  }
  private add(x: number, z: number, i: number): void {
    const k = this.key(Math.floor(x / this.cell), Math.floor(z / this.cell));
    let a = this.cells.get(k);
    if (!a) this.cells.set(k, (a = []));
    a.push(i);
  }
  /** Distance from (x,z) to the nearest road boundary minus clearance; negative = too close. */
  clearance(x: number, z: number): number {
    const rb = this.track.main;
    const cx = Math.floor(x / this.cell);
    const cz = Math.floor(z / this.cell);
    let best = Infinity;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++) {
        const a = this.cells.get(this.key(cx + dx, cz + dz));
        if (!a) continue;
        for (const i of a) {
          const d = Math.hypot(x - rb.px[i], z - rb.pz[i]) - (rb.hw[i] + Math.max(rb.shL[i], rb.shR[i]));
          if (d < best) best = d;
        }
      }
    for (const sc of this.track.shortcuts) {
      for (let i = 0; i < sc.n; i += 2) {
        const d = Math.hypot(x - sc.px[i], z - sc.pz[i]) - (sc.hw[i] + 3);
        if (d < best) best = d;
      }
    }
    return best;
  }
}

/**
 * Build instanced scenery for a track from its scatter rules and explicit placements.
 * Returns the group and a function to apply a density fraction (quality setting).
 */
export function buildTrackProps(track: TrackModel, seed: string): { group: THREE.Group; setDensity: (f: number) => void } {
  const rng = new Rng(seed);
  const byType = new Map<string, Instance[]>();
  const push = (type: string, inst: Instance): void => {
    let list = byType.get(type);
    if (!list) byType.set(type, (list = []));
    list.push(inst);
  };
  const grid = new SampleGrid(track);
  const rb = track.main;
  const groundY = track.data.sky.groundY ?? track.minY - 0.5;
  const hasGround = track.data.sky.ground !== null;
  const mirror = track.mirror ? -1 : 1;

  for (const sc of track.data.scatter ?? []) scatter(sc);
  function scatter(sc: PropScatter): void {
    const spacing = 100 / Math.max(0.1, sc.density);
    for (let s = rng.range(0, spacing); s < rb.length; s += spacing * rng.range(0.6, 1.4)) {
      for (const side of [-1, 1]) {
        const i = rb.indexAtS(s);
        if (rb.flags[i] & F_GAP) continue;
        const edge = side < 0 ? rb.edgeL[i] : rb.edgeR[i];
        const B = rb.hw[i] + (side < 0 ? rb.shL[i] : rb.shR[i]);
        const off = B + rng.range(sc.near, sc.far);
        const x = rb.px[i] + rb.rx[i] * off * side;
        const z = rb.pz[i] + rb.rz[i] * off * side;
        if (grid.clearance(x, z) < 1.5) continue;
        let y: number;
        const beyond = off - B;
        const roadY = rb.py[i] + rb.ry[i] * B * side;
        if (edge === EDGE_DROP || !hasGround || track.data.verge === false) {
          // floating tracks: only place props when there's real ground below, otherwise skip
          if (!hasGround) continue;
          y = groundY;
        } else {
          const t = Math.min(1, beyond / 22);
          y = roadY + (Math.min(groundY, rb.py[i] - 0.4) - roadY) * t;
        }
        const scaleR = sc.scale ?? [0.8, 1.3];
        push(rng.pick(sc.types), { x, y, z, rot: rng.range(0, Math.PI * 2), scale: rng.range(scaleR[0], scaleR[1]) });
      }
    }
  }
  for (const p of track.data.props ?? []) placement(p);
  function placement(p: PropPlacement): void {
    push(p.type, { fixed: true, x: p.x * mirror, y: p.y ?? groundY, z: p.z, rot: (p.rot ?? 0) * mirror, scale: p.scale ?? 1, color: p.color });
  }

  const group = new THREE.Group();
  const meshes: Array<{ mesh: THREE.InstancedMesh; total: number; fixed: number }> = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  for (const [type, list] of byType) {
    const geo = propGeometry(type);
    if (!geo || list.length === 0) continue;
    rng.shuffle(list);
    // landmarks first so density thinning (mesh.count) never drops them
    list.sort((a, b) => (b.fixed ? 1 : 0) - (a.fixed ? 1 : 0));
    const fixedCount = list.filter((i) => i.fixed).length;
    const mesh = new THREE.InstancedMesh(geo, Materials.flat, list.length);
    list.forEach((inst, idx) => {
      pos.set(inst.x, inst.y, inst.z);
      q.setFromAxisAngle(up, inst.rot);
      scl.setScalar(inst.scale);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(idx, m);
      if (inst.color !== undefined) col.setHex(inst.color);
      else col.setRGB(rng.range(0.88, 1.08), rng.range(0.88, 1.08), rng.range(0.88, 1.08));
      mesh.setColorAt(idx, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = false;
    mesh.name = `props:${type}`;
    group.add(mesh);
    meshes.push({ mesh, total: list.length, fixed: fixedCount });
  }
  return {
    group,
    setDensity(f: number): void {
      for (const e of meshes) e.mesh.count = Math.max(e.fixed, e.fixed + Math.round((e.total - e.fixed) * Math.min(1, Math.max(0, f))));
    },
  };
}
