/** Shared building blocks for the code-made models: cached shapes and soft, toy-like materials. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const geos = new Map<string, THREE.BufferGeometry>();
/** A geometry made once and shared by every mesh that asks for the same key. */
export function geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geos.get(key) as T | undefined;
  if (!g) {
    g = make();
    geos.set(key, g);
  }
  return g;
}

const mats = new Map<string, THREE.MeshStandardMaterial>();
/** A matte, slightly soft material: the vinyl-toy look. */
export function soft(color: string, rough = 0.72, metal = 0): THREE.MeshStandardMaterial {
  const key = `${color}:${rough}:${metal}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    mats.set(key, m);
  }
  return m;
}

/** A material that glows on its own (lamps, oven fire). */
export function lit(color: string, power = 1): THREE.MeshStandardMaterial {
  const key = `lit:${color}:${power}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: power, roughness: 0.6 });
    mats.set(key, m);
  }
  return m;
}

export function glass(color: string, opacity = 0.45): THREE.MeshStandardMaterial {
  const key = `glass:${color}:${opacity}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.15, transparent: true, opacity, depthWrite: false });
    mats.set(key, m);
  }
  return m;
}

/** Lighten (k > 0) or darken (k < 0) a color. */
export function shade(color: string, k: number): string {
  const c = new THREE.Color(color);
  c.lerp(new THREE.Color(k > 0 ? '#ffffff' : '#000000'), Math.abs(k));
  return `#${c.getHexString()}`;
}

/** Unit shapes (radius 1 or size 1); scale the mesh to size them. */
export const sphere = (seg = 20) => geo(`sph:${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(8, Math.round(seg * 0.7))));
/** Radius 0.5, total height 2. */
export const capsule = () => geo('cap', () => new THREE.CapsuleGeometry(0.5, 1, 6, 14));
/** Height 1, with a top and bottom radius. */
export const cyl = (top = 1, bottom = 1, seg = 20) => geo(`cyl:${top}:${bottom}:${seg}`, () => new THREE.CylinderGeometry(top, bottom, 1, seg));
export const box = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
export const dome = () => geo('dome', () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2));
export const cone = (seg = 16) => geo(`cone:${seg}`, () => new THREE.ConeGeometry(1, 1, seg));
export const rbox = (w: number, h: number, d: number, r: number) => geo(`rbox:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
export const torus = (tube: number, arc = Math.PI * 2) => geo(`tor:${tube}:${arc}`, () => new THREE.TorusGeometry(1, tube, 10, 28, arc));

export function mesh(g: THREE.BufferGeometry, m: THREE.Material, sx = 1, sy = sx, sz = sx): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.scale.set(sx, sy, sz);
  o.castShadow = true;
  return o;
}

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): T {
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  return o;
}

/** A texture painted with the 2D canvas. */
export function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
