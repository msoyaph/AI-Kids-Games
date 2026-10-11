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

/** Segment count for a lower level of detail (LOD1 ≈ half the segments, never below the shape's minimum). */
function lodSeg(shape: Shape, seg: number | undefined, lod: number): number | undefined {
  if (lod <= 0) return seg;
  switch (shape) {
    case 'sphere':
      return Math.max(5, Math.round((seg ?? 10) * 0.5));
    case 'cyl':
      return Math.max(4, Math.round((seg ?? 10) * 0.5));
    case 'cone':
      return Math.max(4, Math.round((seg ?? 8) * 0.5));
    case 'torus':
      return Math.max(5, Math.round((seg ?? 12) * 0.5));
    case 'capsule':
      return Math.max(4, Math.round((seg ?? 8) * 0.5));
    case 'ico':
      return 0;
    default:
      return seg;
  }
}

function partGeometry(part: ModelPart, tokens: ColorTokens, mirrorX: boolean, lod = 0): THREE.BufferGeometry {
  const g = unitGeometry(part.shape, lodSeg(part.shape, part.seg, lod)).clone();
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

/** Rough size of a recipe (largest extent of any part from the origin), used to spot tiny details. */
function recipeSize(parts: readonly ModelPart[]): number {
  let size = 0;
  for (const p of parts) {
    const s = p.s ?? [1, 1, 1];
    const c = p.p ?? [0, 0, 0];
    size = Math.max(size, Math.hypot(c[0], c[1], c[2]) + Math.max(s[0], s[1], s[2]) * 0.5);
  }
  return Math.max(0.001, size);
}

/**
 * Build one merged, vertex-coloured geometry from a list of primitive parts.
 * `lod` 1 = fewer segments per part and tiny details (< 7 % of the model's size) dropped — for far scenery.
 */
export function buildRecipe(parts: readonly ModelPart[], tokens: ColorTokens = {}, extra: THREE.BufferGeometry[] = [], lod = 0): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = [];
  const minPart = lod > 0 ? recipeSize(parts) * 0.07 : 0;
  for (const part of parts) {
    if (minPart > 0) {
      const s = part.s ?? [1, 1, 1];
      if (Math.max(s[0], s[1], s[2]) < minPart) continue;
    }
    geos.push(partGeometry(part, tokens, false, lod));
    if (part.mirror) geos.push(partGeometry(part, tokens, true, lod));
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
