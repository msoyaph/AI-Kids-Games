/**
 * Drawing the townsfolk: every citizen on screen in one instanced mesh. Each instance carries its
 * look (shirt, trousers, hair and skin from LOOKS) and its walk (phase and stride rate; 0 stands
 * still); the vertex shader dresses it and swings its arms and legs, so walking costs the CPU only
 * a position and a heading per citizen. Low uses a figure with fewer facets.
 */
import * as THREE from 'three';
import { patchMaterial } from './fx';
import { citizen, HIP_Y, LOOKS, SHOULDER_Y } from './models/people';

const pal = (list: number[]) => ({ value: list.map(c => new THREE.Color(c)) });
const uniforms = {
  uShirt: pal(LOOKS.shirt), uPants: pal(LOOKS.pants), uHair: pal(LOOKS.hair), uSkin: pal(LOOKS.skin), uShoes: pal(LOOKS.shoes),
};

const material = patchMaterial(new THREE.MeshLambertMaterial({ vertexColors: true }), {
  key: 'citizen',
  rim: true,
  uniforms,
  vertexDeclarations: /* glsl */ `
    attribute float pattern;
    attribute float limb;
    attribute vec4 aLook;
    attribute vec2 aWalk;
    uniform vec3 uShirt[${LOOKS.shirt.length}];
    uniform vec3 uPants[${LOOKS.pants.length}];
    uniform vec3 uHair[${LOOKS.hair.length}];
    uniform vec3 uSkin[${LOOKS.skin.length}];
    uniform vec3 uShoes[${LOOKS.shoes.length}];
    mat3 limbRot(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
    float walkPhase() { return fxTime * aWalk.y * 6.2832 + aWalk.x; }
    float limbAngle() {
      if (limb < 0.5 || aWalk.y <= 0.0) return 0.0;
      float sw = sin(walkPhase());
      if (limb < 1.5) return sw * 0.6;
      if (limb < 2.5) return -sw * 0.6;
      if (limb < 3.5) return -sw * 0.5;
      return sw * 0.5;
    }`,
});
{
  const inner = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    inner.call(material, sh, r);
    sh.vertexShader = sh.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float fxLimbA = limbAngle();
        if (limb > 0.5) objectNormal = limbRot(fxLimbA) * objectNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (limb > 0.5) {
          float py = limb < 2.5 ? ${HIP_Y.toFixed(3)} : ${SHOULDER_Y.toFixed(3)};
          transformed.y -= py;
          transformed = limbRot(fxLimbA) * transformed;
          transformed.y += py;
        }
        if (aWalk.y > 0.0) transformed.y += abs(sin(walkPhase())) * 0.012;`)
      .replace('#include <color_vertex>', /* glsl */ `
        vColor = vec4(1.0);
        vColor.rgb *= color.rgb;
        {
          int ch = int(pattern + 0.5);
          if (ch == 1) vColor.rgb *= uShirt[int(aLook.x + 0.5)];
          else if (ch == 2) vColor.rgb *= uPants[int(aLook.y + 0.5)];
          else if (ch == 3) vColor.rgb *= uHair[int(aLook.z + 0.5)];
          else if (ch == 4) vColor.rgb *= uSkin[int(aLook.w + 0.5)];
          else if (ch == 5) vColor.rgb *= uShoes[int(mod(aLook.x + aLook.y, ${LOOKS.shoes.length}.0))];
        }`);
  };
}

export interface Walker {
  x: number;
  y: number;
  z: number;
  /** Heading in radians (0 faces south, +z). */
  heading: number;
  /** Walk phase offset and stride rate (cycles a second; 0 stands still). */
  phase: number;
  rate: number;
  /** Indices into LOOKS: shirt, trousers, hair, skin. */
  look: [number, number, number, number];
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
const one = new THREE.Vector3(1, 1, 1);
const p = new THREE.Vector3();

export class WalkerView {
  readonly group = new THREE.Group();
  private mesh: THREE.InstancedMesh | null = null;
  private look!: THREE.InstancedBufferAttribute;
  private walk!: THREE.InstancedBufferAttribute;
  private capacity = 0;
  private low = false;

  constructor() { this.group.name = 'citizens'; }

  /** Low builds the lighter figure. */
  setLow(low: boolean) {
    if (low === this.low && this.mesh) return;
    this.low = low;
    this.build(Math.max(64, this.capacity));
  }

  private build(capacity: number) {
    if (this.mesh) { this.group.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.dispose(); }
    const g = citizen(this.low);
    this.look = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.walk = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2);
    this.look.setUsage(THREE.DynamicDrawUsage);
    this.walk.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aLook', this.look);
    g.setAttribute('aWalk', this.walk);
    const mesh = new THREE.InstancedMesh(g, material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.mesh = mesh;
    this.capacity = capacity;
    this.group.add(mesh);
  }

  /** Draw these citizens (already culled to the view by the caller). */
  draw(list: readonly Walker[]) {
    if (!this.mesh || list.length > this.capacity) this.build(Math.max(64, 2 ** Math.ceil(Math.log2(list.length))));
    const mesh = this.mesh!;
    const la = this.look.array as Float32Array, wa = this.walk.array as Float32Array;
    for (let i = 0; i < list.length; i++) {
      const w = list[i]!;
      q.setFromAxisAngle(up, w.heading);
      m4.compose(p.set(w.x, w.y, w.z), q, one);
      mesh.setMatrixAt(i, m4);
      la.set(w.look, i * 4);
      wa[i * 2] = w.phase;
      wa[i * 2 + 1] = w.rate;
    }
    mesh.count = list.length;
    mesh.visible = list.length > 0;
    mesh.instanceMatrix.needsUpdate = true;
    this.look.needsUpdate = true;
    this.walk.needsUpdate = true;
  }
}
