import * as THREE from 'three';
import { BAYER_GLSL } from './occlusion';

/**
 * Writes a column-major matrix = T(x,y,z) · Ry(yaw) · Rz(roll) · S(sx,sy,sz)
 * straight into an instanceMatrix array (no Object3D / Matrix4 allocation).
 */
export function writeTRS(a: Float32Array, o: number, x: number, y: number, z: number, yaw: number, roll: number, sx: number, sy: number, sz: number): void {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  if (roll === 0) {
    a[o] = c * sx;
    a[o + 1] = 0;
    a[o + 2] = -s * sx;
    a[o + 3] = 0;
    a[o + 4] = 0;
    a[o + 5] = sy;
    a[o + 6] = 0;
    a[o + 7] = 0;
    a[o + 8] = s * sz;
    a[o + 9] = 0;
    a[o + 10] = c * sz;
    a[o + 11] = 0;
  } else {
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    a[o] = c * cr * sx;
    a[o + 1] = sr * sx;
    a[o + 2] = -s * cr * sx;
    a[o + 3] = 0;
    a[o + 4] = -c * sr * sy;
    a[o + 5] = cr * sy;
    a[o + 6] = s * sr * sy;
    a[o + 7] = 0;
    a[o + 8] = s * sz;
    a[o + 9] = 0;
    a[o + 10] = c * sz;
    a[o + 11] = 0;
  }
  a[o + 12] = x;
  a[o + 13] = y;
  a[o + 14] = z;
  a[o + 15] = 1;
}

/**
 * Transform scratch: hot loops write x, y, z, yaw, roll, sx, sy, sz into TRS[0..7] and call
 * writeTRSFrom(array, offset). Only an object and an integer cross the call boundary, so V8
 * never has to box doubles (writeTRS with 10 double args is too big to always inline).
 */
export const TRS = new Float64Array(8);

export function writeTRSFrom(a: Float32Array, o: number): void {
  writeTRS(a, o, TRS[0], TRS[1], TRS[2], TRS[3], TRS[4], TRS[5], TRS[6], TRS[7]);
}

/** writeTRSPitch from the TRS scratch (TRS[4] holds the pitch). */
export function writeTRSPitchFrom(a: Float32Array, o: number): void {
  writeTRSPitch(a, o, TRS[0], TRS[1], TRS[2], TRS[3], TRS[4], TRS[5], TRS[6], TRS[7]);
}

/** T · Ry(yaw) · Rx(pitch) · S — for projectiles pointing along a 3D direction. */
export function writeTRSPitch(a: Float32Array, o: number, x: number, y: number, z: number, yaw: number, pitch: number, sx: number, sy: number, sz: number): void {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  // Ry * Rx: col0 = (c,0,-s); col1 = (s*sp, cp, c*sp); col2 = (s*cp, -sp, c*cp)
  a[o] = c * sx;
  a[o + 1] = 0;
  a[o + 2] = -s * sx;
  a[o + 3] = 0;
  a[o + 4] = s * sp * sy;
  a[o + 5] = cp * sy;
  a[o + 6] = c * sp * sy;
  a[o + 7] = 0;
  a[o + 8] = s * cp * sz;
  a[o + 9] = -sp * sz;
  a[o + 10] = c * cp * sz;
  a[o + 11] = 0;
  a[o + 12] = x;
  a[o + 13] = y;
  a[o + 14] = z;
  a[o + 15] = 1;
}

type Range = { start: number; count: number };
const ranges = new WeakMap<THREE.BufferAttribute, Range>();

/**
 * Upload only [0, count) of an attribute, reusing one range object per attribute
 * (three's addUpdateRange would allocate a new object every frame).
 */
export function uploadPrefix(attr: THREE.BufferAttribute, count: number): void {
  let r = ranges.get(attr);
  if (!r) {
    r = { start: 0, count: 0 };
    ranges.set(attr, r);
  }
  r.count = count * attr.itemSize;
  attr.updateRanges.length = 0;
  attr.updateRanges.push(r);
  attr.needsUpdate = true;
}

/** Marks only the used part of instanced attributes for upload. */
export function commitInstances(mesh: THREE.InstancedMesh, count: number, extra?: THREE.InstancedBufferAttribute[]): void {
  mesh.count = count;
  if (count === 0) return;
  uploadPrefix(mesh.instanceMatrix, count);
  if (mesh.instanceColor) uploadPrefix(mesh.instanceColor, count);
  if (extra) for (let k = 0; k < extra.length; k++) uploadPrefix(extra[k], count);
}

export function makeInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, cap: number, withColor: boolean): THREE.InstancedMesh {
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

/**
 * Unlit material with a per-instance `aAlpha` attribute (telegraph discs / shockwave walls):
 * additive glow on dark maps, solid see-through colour on bright ones (snow), where an
 * additive white-on-white warning would vanish.
 */
export function alphaBasic(params: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ ...params, transparent: true, depthWrite: false });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a *= vAlpha;');
  };
  return mat;
}

/** Adds the per-instance `aAlpha` attribute alphaBasic() reads. */
export function addAlphaAttribute(mesh: THREE.InstancedMesh, cap: number): THREE.InstancedBufferAttribute {
  const a = new THREE.InstancedBufferAttribute(new Float32Array(cap).fill(1), 1);
  a.setUsage(THREE.DynamicDrawUsage);
  mesh.geometry.setAttribute('aAlpha', a);
  return a;
}

/**
 * Lambert material with a per-instance `aFlash` attribute (0..1) that blends the final
 * colour toward white — the hit flash.
 */
export function flashLambert(): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aFlash;\nvarying float vFlash;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlash = aFlash;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vFlash;\n${BAYER_GLSL}`)
      // creatures right in front of the lens dissolve so they never hide the player
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  float camD = length(vViewPosition);\n  if (camD < 4.5 && bonkBayer4(gl_FragCoord.xy) < 1.0 - camD / 4.5) discard;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), clamp(vFlash, 0.0, 1.0));');
  };
  mat.customProgramCacheKey = () => 'flashLambert';
  return mat;
}

export function addFlashAttribute(mesh: THREE.InstancedMesh, cap: number): THREE.InstancedBufferAttribute {
  const attr = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
  attr.setUsage(THREE.DynamicDrawUsage);
  mesh.geometry.setAttribute('aFlash', attr);
  return attr;
}
