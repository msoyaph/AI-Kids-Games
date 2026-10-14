// Generic instanced layer: one InstancedMesh with a growable capacity.

/**
 * Things that don't need ambient occlusion (grass, water, particles, the far woods) live on this layer
 * instead of layer 0: the camera and the sun see it, High's normal pass (for SSAO) doesn't, which
 * halves that pass's cost.
 */
export const NO_AO = 2;
// Adapted from Light Crossing (games/light-crossing/src/render/instanced.ts). Added here: optional
// culling of single instances. A layer made with `cull: true` keeps every pushed instance in its own
// list, and `cull(frustum)` copies only those near the view into the mesh. Off-screen trees, clutter
// and crops then cost nothing, with no extra draw calls.
import * as THREE from 'three';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpE = new THREE.Euler();
const tmpC = new THREE.Color();
const sphere = new THREE.Sphere();

export class InstancedLayer {
  mesh: THREE.InstancedMesh;
  private n = 0;
  /** Every instance (culling layers): 16 floats of matrix each, and 3 of colour. */
  private src: Float32Array | null = null;
  private srcColor: Float32Array | null = null;
  private hasColor = false;
  /** Goes up whenever the instances change, so a cull knows to run again. */
  version = 0;
  constructor(
    private geo: THREE.BufferGeometry,
    private mat: THREE.Material,
    private capacity = 64,
    /** `cull`: draw only the instances near the view (call `cull` when the camera moves). */
    /** `layer`: a three.js layer besides 0 (NO_AO keeps it out of High's ambient-occlusion pass). */
    private opts: { shadow?: boolean; receive?: boolean; cull?: boolean; layer?: number } = {},
  ) {
    this.mesh = this.make(capacity);
    if (opts.cull) {
      this.src = new Float32Array(capacity * 16);
      this.srcColor = new Float32Array(capacity * 3);
      geo.computeBoundingSphere();
    }
  }

  private make(cap: number): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(this.geo, this.mat, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.count = 0;
    m.castShadow = this.opts.shadow ?? true;
    m.receiveShadow = this.opts.receive ?? true;
    m.frustumCulled = false;
    return m;
  }

  get count() { return this.n; }

  begin(): void { this.n = 0; this.hasColor = false; }

  push(x: number, y: number, z: number, rotY = 0, scale = 1, color?: number, sy?: number): void {
    tmpE.set(0, rotY, 0);
    tmpQ.setFromEuler(tmpE);
    tmpS.set(scale, sy ?? scale, scale);
    tmpP.set(x, y, z);
    tmpM.compose(tmpP, tmpQ, tmpS);
    this.pushMatrix(tmpM, color);
  }

  pushMatrix(m: THREE.Matrix4, color?: number): void {
    if (this.n >= this.capacity) this.grow();
    if (this.src) {
      m.toArray(this.src, this.n * 16);
      if (color !== undefined) { tmpC.setHex(color); tmpC.toArray(this.srcColor!, this.n * 3); this.hasColor = true; }
      else this.srcColor!.fill(1, this.n * 3, this.n * 3 + 3);
    } else {
      this.mesh.setMatrixAt(this.n, m);
      if (color !== undefined) {
        tmpC.setHex(color);
        this.mesh.setColorAt(this.n, tmpC);
      }
    }
    this.n++;
  }

  end(): void {
    this.version++;
    if (this.src) {
      // until the first cull, draw everything
      this.copy(() => true);
      return;
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.visible = this.n > 0;
  }

  /** Is this a culling layer? */
  get culls() { return !!this.src; }

  /** Draw only the instances whose bounding sphere (grown by `margin`) touches the frustum. */
  cull(frustum: THREE.Frustum, margin: number): void {
    if (!this.src) return;
    const bs = this.geo.boundingSphere!;
    this.copy(i => {
      tmpM.fromArray(this.src!, i * 16);
      sphere.center.copy(bs.center).applyMatrix4(tmpM);
      sphere.radius = bs.radius * tmpM.getMaxScaleOnAxis() + margin;
      return frustum.intersectsSphere(sphere);
    });
  }

  private copy(keep: (i: number) => boolean) {
    const src = this.src!, out = this.mesh.instanceMatrix.array as Float32Array;
    let k = 0;
    if (this.hasColor && !this.mesh.instanceColor) this.mesh.setColorAt(0, tmpC.setRGB(1, 1, 1));
    const colors = this.mesh.instanceColor?.array as Float32Array | undefined;
    for (let i = 0; i < this.n; i++) {
      if (!keep(i)) continue;
      out.set(src.subarray(i * 16, i * 16 + 16), k * 16);
      if (colors) colors.set(this.srcColor!.subarray(i * 3, i * 3 + 3), k * 3);
      k++;
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.visible = k > 0;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.dispose();
  }

  private grow(): void {
    const old = this.mesh;
    const cap = this.capacity * 2;
    const m = this.make(cap);
    if (this.src) {
      const s = new Float32Array(cap * 16); s.set(this.src); this.src = s;
      const c = new Float32Array(cap * 3); c.set(this.srcColor!); this.srcColor = c;
    } else {
      for (let i = 0; i < this.n; i++) {
        old.getMatrixAt(i, tmpM);
        m.setMatrixAt(i, tmpM);
        if (old.instanceColor) {
          old.getColorAt(i, tmpC);
          m.setColorAt(i, tmpC);
        }
      }
    }
    const parent = old.parent;
    if (parent) {
      parent.remove(old);
      parent.add(m);
    }
    old.dispose();
    this.mesh = m;
    this.capacity = cap;
  }
}

/**
 * Decides when culling layers need culling again: when the camera has moved, turned or zoomed more
 * than a little since the last cull (a margin around the view hides the edges meanwhile), or when a
 * layer's instances changed.
 */
export class Culler {
  private versions = new WeakMap<InstancedLayer, number>();
  private last = { x: NaN, z: NaN, zoom: 0, yaw: NaN, w: 0, h: 0 };
  /** The view's frustum at the last cull. */
  readonly frustum = new THREE.Frustum();
  private pm = new THREE.Matrix4();

  /** `across`: tiles across the view; the margin grows with it. Returns true when anything was culled again. */
  update(cam: THREE.Camera, v: { x: number; z: number; zoom: number; yaw: number }, w: number, h: number, across: number, layers: Iterable<InstancedLayer>): boolean {
    const margin = 1 + across * 0.12;
    const L = this.last;
    const moved = !(L.zoom > 0) || Math.hypot(v.x - L.x, v.z - L.z) > margin * 0.45 || Math.abs(v.zoom / L.zoom - 1) > 0.06 || Math.abs(v.yaw - L.yaw) > 0.02 || w !== L.w || h !== L.h;
    const todo = moved ? [...layers] : [...layers].filter(l => this.versions.get(l) !== l.version);
    if (!todo.length) return false;
    this.pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    for (const l of todo) { l.cull(this.frustum, margin); this.versions.set(l, l.version); }
    if (moved) Object.assign(L, { x: v.x, z: v.z, zoom: v.zoom, yaw: v.yaw, w, h });
    return true;
  }
}
