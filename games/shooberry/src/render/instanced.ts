// Instanced drawing: every species is one InstancedMesh per part, however many are on the board, and
// so are berries, poof leaves, compost piles and blob shadows. Matrices are written straight into
// the instance buffers from reused scratch objects (no allocation per frame), and only the used
// prefix is uploaded (TheaBonk's uploadPrefix, games/theabonk/src/render/instancing.ts).
import * as THREE from 'three';
import { Materials } from './materials';
import { POSE_SIZE, type Model, type Pose } from './models/types';

type Range = { start: number; count: number };
const ranges = new WeakMap<THREE.BufferAttribute, Range>();

/** Upload only [0, count) of an attribute, reusing one range object per attribute. */
export function uploadPrefix(attr: THREE.BufferAttribute, count: number): void {
  let r = ranges.get(attr);
  if (!r) { r = { start: 0, count: 0 }; ranges.set(attr, r); }
  r.count = count * attr.itemSize;
  attr.clearUpdateRanges();
  attr.updateRanges.push(r);
  attr.needsUpdate = true;
}

export function makeInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, cap: number, withColor = false): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (withColor) {
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

/** Marks only the used part of the instance buffers for upload; empty meshes cost no draw call. */
export function commit(mesh: THREE.InstancedMesh, count: number): void {
  mesh.count = count;
  mesh.visible = count > 0;
  if (count === 0) return;
  uploadPrefix(mesh.instanceMatrix, count);
  if (mesh.instanceColor) uploadPrefix(mesh.instanceColor, count);
}

const base = new THREE.Matrix4(), local = new THREE.Matrix4(), out = new THREE.Matrix4(), tmp = new THREE.Matrix4(), leanM = new THREE.Matrix4();
const q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
const color = new THREE.Color();

/** An outline twin for an instanced mesh: same matrices (shared buffer), hull geometry, outline colour. */
function outlineTwin(main: THREE.InstancedMesh, hull: THREE.BufferGeometry, cap: number): THREE.InstancedMesh {
  const twin = new THREE.InstancedMesh(hull, Materials.outlineInst, cap);
  twin.instanceMatrix = main.instanceMatrix;
  twin.count = 0;
  twin.frustumCulled = false;
  return twin;
}

/**
 * A model drawn many times: one InstancedMesh per part (plus its outline twin), sharing each
 * instance's base transform. Characters lean back toward the camera by `lean` (radians), around
 * the point where they stand, so they face the player at a gentle angle whatever the tilt.
 */
export class ModelLayer {
  readonly meshes: THREE.InstancedMesh[];
  readonly hulls: THREE.InstancedMesh[];
  private n = 0;
  lean = 0;

  constructor(readonly model: Model, readonly capacity: number) {
    this.meshes = model.parts.map(part => {
      const mesh = makeInstanced(part.geo, part.twoSided ? Materials.toonInstTwo : Materials.toonInst, capacity);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      return mesh;
    });
    this.hulls = model.parts.flatMap((part, i) => (part.hull ? [outlineTwin(this.meshes[i]!, part.hull, capacity)] : []));
  }

  /** Every mesh to add to the scene (fills and outlines). */
  get all() { return [...this.hulls, ...this.meshes]; }
  get count() { return this.n; }
  begin() { this.n = 0; }

  /** One instance standing at (x, y, z), turned by `yaw`, scaled (sx, sy, sz), its parts posed by `pose`. */
  push(x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number, pose: Pose) {
    if (this.n >= this.capacity) return;
    e.set(0, yaw, 0);
    q.setFromEuler(e);
    base.compose(p.set(0, 0, 0), q, s.set(sx, sy, sz));
    // lean back toward the camera, then stand at (x, y, z)
    base.premultiply(leanM.makeRotationX(-this.lean));
    base.premultiply(tmp.makeTranslation(x, y, z));
    const parts = this.model.parts;
    for (let i = 0; i < parts.length; i++) {
      const o = i * POSE_SIZE, [px, py, pz] = parts[i]!.pivot;
      e.set(pose[o + 3]!, pose[o + 4]!, pose[o + 5]!);
      q.setFromEuler(e);
      local.compose(p.set(px + pose[o]!, py + pose[o + 1]!, pz + pose[o + 2]!), q, s.set(pose[o + 6]!, pose[o + 7]!, pose[o + 8]!));
      local.multiply(tmp.makeTranslation(-px, -py, -pz));
      out.multiplyMatrices(base, local);
      this.meshes[i]!.setMatrixAt(this.n, out);
    }
    this.n++;
  }

  end() {
    for (const mesh of this.meshes) commit(mesh, this.n);
    for (const hull of this.hulls) { hull.count = this.n; hull.visible = this.n > 0; }
  }
}

/** A simple instanced thing with no parts (berries, leaves, tufts, shadows), optionally coloured and outlined. */
export class SimpleLayer {
  readonly mesh: THREE.InstancedMesh;
  readonly hull: THREE.InstancedMesh | null;
  private n = 0;

  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, readonly capacity: number, withColor = false, hull: THREE.BufferGeometry | null = null) {
    this.mesh = makeInstanced(geo, mat, capacity, withColor);
    this.hull = hull ? outlineTwin(this.mesh, hull, capacity) : null;
  }

  get all() { return this.hull ? [this.hull, this.mesh] : [this.mesh]; }
  get count() { return this.n; }
  begin() { this.n = 0; }

  push(x: number, y: number, z: number, yaw: number, roll: number, sx: number, sy: number, sz: number, hex?: number, pitch = 0) {
    if (this.n >= this.capacity) return;
    e.set(pitch, yaw, roll, 'YXZ');
    q.setFromEuler(e);
    out.compose(p.set(x, y, z), q, s.set(sx, sy, sz));
    this.mesh.setMatrixAt(this.n, out);
    if (hex !== undefined && this.mesh.instanceColor) this.mesh.setColorAt(this.n, color.setHex(hex, THREE.SRGBColorSpace));
    this.n++;
  }

  end() {
    commit(this.mesh, this.n);
    if (this.hull) { this.hull.count = this.n; this.hull.visible = this.n > 0; }
  }

  set visible(on: boolean) { this.mesh.visible = on && this.n > 0; if (this.hull) this.hull.visible = on && this.n > 0; }
}
