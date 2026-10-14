// Generic instanced layer: one InstancedMesh with a growable capacity.
// Adapted from Light Crossing (games/light-crossing/src/render/instanced.ts).
import * as THREE from 'three';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpE = new THREE.Euler();
const tmpC = new THREE.Color();

export class InstancedLayer {
  mesh: THREE.InstancedMesh;
  private n = 0;
  constructor(
    private geo: THREE.BufferGeometry,
    private mat: THREE.Material,
    private capacity = 64,
    private opts: { shadow?: boolean; receive?: boolean } = {},
  ) {
    this.mesh = this.make(capacity);
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

  begin(): void { this.n = 0; }

  push(x: number, y: number, z: number, rotY = 0, scale = 1, color?: number, sy?: number): void {
    if (this.n >= this.capacity) this.grow();
    tmpE.set(0, rotY, 0);
    tmpQ.setFromEuler(tmpE);
    tmpS.set(scale, sy ?? scale, scale);
    tmpP.set(x, y, z);
    tmpM.compose(tmpP, tmpQ, tmpS);
    this.mesh.setMatrixAt(this.n, tmpM);
    if (color !== undefined) {
      tmpC.setHex(color);
      this.mesh.setColorAt(this.n, tmpC);
    }
    this.n++;
  }

  pushMatrix(m: THREE.Matrix4, color?: number): void {
    if (this.n >= this.capacity) this.grow();
    this.mesh.setMatrixAt(this.n, m);
    if (color !== undefined) {
      tmpC.setHex(color);
      this.mesh.setColorAt(this.n, tmpC);
    }
    this.n++;
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.visible = this.n > 0;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.dispose();
  }

  private grow(): void {
    const old = this.mesh;
    const cap = this.capacity * 2;
    const m = this.make(cap);
    for (let i = 0; i < this.n; i++) {
      old.getMatrixAt(i, tmpM);
      m.setMatrixAt(i, tmpM);
      if (old.instanceColor) {
        old.getColorAt(i, tmpC);
        m.setColorAt(i, tmpC);
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
