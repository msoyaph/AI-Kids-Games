import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Builds a single merged, non-indexed, vertex-coloured low-poly geometry out of primitive
 * parts. One geometry → one draw call (or one InstancedMesh).
 */
export class GeoBuilder {
  private parts: THREE.BufferGeometry[] = [];
  private static tmpM = new THREE.Matrix4();
  private static tmpQ = new THREE.Quaternion();
  private static tmpE = new THREE.Euler();
  private static tmpV = new THREE.Vector3();
  private static tmpS = new THREE.Vector3();
  private static tmpC = new THREE.Color();

  add(
    geo: THREE.BufferGeometry,
    color: number,
    pos: [number, number, number] = [0, 0, 0],
    rot: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] | number = 1,
    jitter = 0,
  ): this {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
    GeoBuilder.tmpE.set(rot[0], rot[1], rot[2]);
    GeoBuilder.tmpQ.setFromEuler(GeoBuilder.tmpE);
    GeoBuilder.tmpM.compose(GeoBuilder.tmpV.set(pos[0], pos[1], pos[2]), GeoBuilder.tmpQ, GeoBuilder.tmpS.set(s[0], s[1], s[2]));
    g.applyMatrix4(GeoBuilder.tmpM);
    const n = g.getAttribute('position').count;
    const colors = new Float32Array(n * 3);
    const c = GeoBuilder.tmpC.setHex(color);
    // per-face colour jitter gives the faceted low-poly look
    for (let f = 0; f < n; f += 3) {
      const j = jitter > 0 ? 1 + (Math.random() * 2 - 1) * jitter : 1;
      for (let k = 0; k < 3 && f + k < n; k++) {
        colors[(f + k) * 3] = Math.min(1, c.r * j);
        colors[(f + k) * 3 + 1] = Math.min(1, c.g * j);
        colors[(f + k) * 3 + 2] = Math.min(1, c.b * j);
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.parts.push(g);
    return this;
  }

  build(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts, false);
    if (!merged) throw new Error('GeoBuilder: merge failed');
    for (const p of this.parts) p.dispose();
    this.parts = [];
    merged.computeVertexNormals();
    merged.computeBoundingSphere();
    return merged;
  }
}

/** Shared flat-shaded vertex-colour material. */
export function lowPolyMaterial(opts: { emissive?: number; emissiveIntensity?: number; transparent?: boolean; opacity?: number } = {}): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
}

export const P = {
  box: (w = 1, h = 1, d = 1) => new THREE.BoxGeometry(w, h, d),
  ico: (r = 1, detail = 0) => new THREE.IcosahedronGeometry(r, detail),
  dodeca: (r = 1) => new THREE.DodecahedronGeometry(r, 0),
  octa: (r = 1) => new THREE.OctahedronGeometry(r, 0),
  tetra: (r = 1) => new THREE.TetrahedronGeometry(r, 0),
  cone: (r = 1, h = 1, seg = 6) => new THREE.ConeGeometry(r, h, seg, 1),
  cyl: (rt = 1, rb = 1, h = 1, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg, 1),
  sphere: (r = 1, w = 6, h = 4) => new THREE.SphereGeometry(r, w, h),
  torus: (r = 1, t = 0.2, rs = 4, ts = 8) => new THREE.TorusGeometry(r, t, rs, ts),
};
