import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ColorRef, ModelPart, Shape } from '../data/types';
import { DEG } from '../core/math';

/** Colour tokens resolved when building a recipe. */
export type ColorTokens = Partial<Record<Exclude<ColorRef, number>, number>>;

const DEFAULT_TOKENS: Required<ColorTokens> = {
  paint: 0xff4d6d,
  paint2: 0xffd23f,
  accent: 0x3fa7ff,
  trim: 0x2b2b3a,
  tire: 0x26262e,
  metal: 0xb8c0cc,
  glass: 0x9fe3ff,
};

const unitCache = new Map<string, THREE.BufferGeometry>();

function wedgeGeometry(): THREE.BufferGeometry {
  // Triangular prism: bottom 1×1 at y=-0.5; rises from the front (+Z, height 0) to the back (-Z, height 1).
  const v = [
    // bottom
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5,
    // back
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    // slope
    -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5,
    // left side
    -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5,
    // right side
    0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  // fix winding of bottom/back/slope so normals face outward
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const centre = new THREE.Vector3(0, -0.17, 0);
  const n = new THREE.Vector3();
  const mid = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    mid.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(centre);
    if (n.dot(mid) < 0) {
      pos.setXYZ(i + 1, c.x, c.y, c.z);
      pos.setXYZ(i + 2, b.x, b.y, b.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

export function unitGeometry(shape: Shape, seg?: number): THREE.BufferGeometry {
  const key = `${shape}:${seg ?? ''}`;
  let g = unitCache.get(key);
  if (g) return g;
  switch (shape) {
    case 'box':
      g = new THREE.BoxGeometry(1, 1, 1);
      break;
    case 'sphere':
      g = new THREE.SphereGeometry(0.5, seg ?? 10, Math.max(4, Math.round((seg ?? 10) * 0.7)));
      break;
    case 'ico':
      g = new THREE.IcosahedronGeometry(0.5, seg ?? 0);
      break;
    case 'cyl':
      g = new THREE.CylinderGeometry(0.5, 0.5, 1, seg ?? 10);
      break;
    case 'cone':
      g = new THREE.ConeGeometry(0.5, 1, seg ?? 8);
      break;
    case 'torus':
      g = new THREE.TorusGeometry(0.4, 0.1, 6, seg ?? 12);
      break;
    case 'capsule':
      g = new THREE.CapsuleGeometry(0.3, 0.4, 3, seg ?? 8);
      break;
    case 'wedge':
      g = wedgeGeometry();
      break;
  }
  const ni = g.index ? g.toNonIndexed() : g;
  ni.deleteAttribute('uv');
  if (!ni.getAttribute('normal')) ni.computeVertexNormals();
  unitCache.set(key, ni);
  return ni;
}

const tmpColor = new THREE.Color();
const tmpMat = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();

export function resolveColor(c: ColorRef, tokens: ColorTokens): number {
  if (typeof c === 'number') return c;
  return tokens[c] ?? DEFAULT_TOKENS[c];
}

function colored(g: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  tmpColor.setHex(hex);
  const count = g.getAttribute('position').count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = tmpColor.r;
    arr[i * 3 + 1] = tmpColor.g;
    arr[i * 3 + 2] = tmpColor.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function partGeometry(part: ModelPart, tokens: ColorTokens, mirrorX: boolean): THREE.BufferGeometry {
  const g = unitGeometry(part.shape, part.seg).clone();
  const p = part.p ?? [0, 0, 0];
  const s = part.s ?? [1, 1, 1];
  const r = part.r ?? [0, 0, 0];
  tmpPos.set(mirrorX ? -p[0] : p[0], p[1], p[2]);
  tmpEuler.set(r[0] * DEG, (mirrorX ? -r[1] : r[1]) * DEG, (mirrorX ? -r[2] : r[2]) * DEG);
  tmpQuat.setFromEuler(tmpEuler);
  tmpScale.set(s[0], s[1], s[2]);
  tmpMat.compose(tmpPos, tmpQuat, tmpScale);
  g.applyMatrix4(tmpMat);
  return colored(g, resolveColor(part.c, tokens));
}

/** Build one merged, vertex-coloured geometry from a list of primitive parts. */
export function buildRecipe(parts: readonly ModelPart[], tokens: ColorTokens = {}, extra: THREE.BufferGeometry[] = []): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = [];
  for (const part of parts) {
    geos.push(partGeometry(part, tokens, false));
    if (part.mirror) geos.push(partGeometry(part, tokens, true));
  }
  for (const e of extra) geos.push(e);
  if (geos.length === 0) return new THREE.BufferGeometry();
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (!merged) throw new Error('mergeGeometries failed');
  merged.computeBoundingSphere();
  return merged;
}

/** Convenience: geometry for a single coloured primitive with a transform. */
export function prim(shape: Shape, color: number, p: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1], r: [number, number, number] = [0, 0, 0], seg?: number): THREE.BufferGeometry {
  return partGeometry({ shape, c: color, p, s, r, seg }, {}, false);
}

/** Merge already-coloured geometries. */
export function mergeColored(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (!merged) throw new Error('mergeGeometries failed');
  merged.computeBoundingSphere();
  return merged;
}
