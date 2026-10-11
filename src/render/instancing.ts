import * as THREE from 'three';

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

/** Marks only the used part of instanced attributes for upload. */
export function commitInstances(mesh: THREE.InstancedMesh, count: number, extra?: THREE.InstancedBufferAttribute[]): void {
  mesh.count = count;
  if (count === 0) return;
  const m = mesh.instanceMatrix;
  m.clearUpdateRanges();
  m.addUpdateRange(0, count * 16);
  m.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.clearUpdateRanges();
    mesh.instanceColor.addUpdateRange(0, count * 3);
    mesh.instanceColor.needsUpdate = true;
  }
  if (extra) {
    for (const a of extra) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, count * a.itemSize);
      a.needsUpdate = true;
    }
  }
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
      .replace('#include <common>', '#include <common>\nvarying float vFlash;')
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
