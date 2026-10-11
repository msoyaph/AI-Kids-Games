import * as THREE from 'three';
import type { BodyData, DecalPattern, DecalPanel } from '../data/types';
import { findDecal } from '../data/parts';
import { resolveColor, type ColorTokens } from './lowpoly';

// Decals are thin procedural shapes laid onto a body's decal panels (no textures needed).
// Pattern coordinates: u across the panel, v along it, both in [-0.5, 0.5].

type Poly = Array<[number, number]>;

function rect(u0: number, v0: number, u1: number, v1: number): Poly {
  return [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
  ];
}

function circle(cu: number, cv: number, r: number, n = 10): Poly {
  const out: Poly = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r]);
  }
  return out;
}

function star(cu: number, cv: number, r: number): Poly {
  const out: Poly = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    out.push([cu + Math.cos(a) * rr, cv + Math.sin(a) * rr]);
  }
  return out;
}

function heart(cu: number, cv: number, r: number): Poly {
  const out: Poly = [];
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    out.push([cu + (x / 17) * r, cv + (y / 17) * r]);
  }
  return out;
}

function band(fn: (t: number) => number, half: number, n = 16): Poly {
  const top: Poly = [];
  const bot: Poly = [];
  for (let i = 0; i <= n; i++) {
    const v = -0.48 + (i / n) * 0.96;
    const u = fn(v);
    top.push([u + half, v]);
    bot.push([u - half, v]);
  }
  return [...top, ...bot.reverse()];
}

function patternPolys(p: DecalPattern): Poly[] {
  switch (p) {
    case 'none':
      return [];
    case 'stripes':
      return [rect(-0.2, -0.5, -0.08, 0.5), rect(0.08, -0.5, 0.2, 0.5)];
    case 'stars':
      return [star(-0.25, 0.1, 0.17), star(0.25, -0.12, 0.17), star(0.02, 0.32, 0.1), star(0.05, -0.33, 0.1)];
    case 'dots':
      return [circle(-0.28, -0.25, 0.1), circle(0.0, 0.05, 0.13), circle(0.3, -0.18, 0.08), circle(-0.2, 0.3, 0.08), circle(0.27, 0.3, 0.11)];
    case 'bolt':
      return [
        [
          [0.08, 0.5],
          [-0.22, 0.02],
          [-0.02, 0.02],
          [-0.12, -0.5],
          [0.24, 0.06],
          [0.03, 0.06],
        ],
      ];
    case 'hearts':
      return [heart(-0.22, 0, 0.2), heart(0.22, 0.05, 0.16)];
    case 'checker': {
      const out: Poly[] = [];
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) out.push(rect(-0.5 + i * 0.25, -0.5 + j * 0.25, -0.25 + i * 0.25, -0.25 + j * 0.25));
      return out;
    }
    case 'flame':
      return [
        [
          [-0.4, -0.5],
          [0.4, -0.5],
          [0.3, -0.1],
          [0.42, 0.2],
          [0.18, 0.05],
          [0.12, 0.45],
          [-0.02, 0.1],
          [-0.18, 0.35],
          [-0.2, 0.0],
          [-0.42, 0.22],
        ],
      ];
    case 'waves':
      return [band((v) => Math.sin(v * 12) * 0.12 - 0.15, 0.06), band((v) => Math.sin(v * 12 + 1.5) * 0.12 + 0.18, 0.06)];
    case 'number':
      return [circle(0, 0, 0.42, 16)];
    case 'zigzag':
      return [band((v) => (Math.abs(((v * 4 + 10) % 1) - 0.5) - 0.25) * 0.8, 0.07, 32)];
    case 'swirl': {
      const out: Poly = [];
      const inner: Poly = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const a = t * Math.PI * 3;
        const r = 0.05 + t * 0.38;
        out.push([Math.cos(a) * (r + 0.05), Math.sin(a) * (r + 0.05)]);
        inner.push([Math.cos(a) * (r - 0.03), Math.sin(a) * (r - 0.03)]);
      }
      return [[...out, ...inner.reverse()]];
    }
  }
}

const tmpC = new THREE.Color();

function panelGeometry(polys: Poly[], panel: DecalPanel, hex: number, mirror: boolean, inset?: Poly[], insetHex?: number): THREE.BufferGeometry | null {
  const positions: number[] = [];
  const colors: number[] = [];
  const addPolys = (list: Poly[], color: number, lift: number): void => {
    tmpC.setHex(color);
    for (const poly of list) {
      const shape = new THREE.Shape(poly.map(([u, v]) => new THREE.Vector2(u, v)));
      const g = new THREE.ShapeGeometry(shape, 2);
      const pos = g.getAttribute('position');
      const idx = g.index;
      const tri = idx ? idx.count : pos.count;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < tri; i++) {
        const vi = idx ? idx.getX(i) : i;
        const u = pos.getX(vi);
        const v = pos.getY(vi);
        const [px, py, pz] = panel.p;
        let x: number;
        let y: number;
        let z: number;
        if (panel.face === 'top') {
          x = px + u * panel.w;
          y = py + lift;
          z = pz + v * panel.l;
        } else {
          x = (px + lift) * (mirror ? -1 : 1);
          y = py + v * panel.l;
          z = pz + u * panel.w;
        }
        pts.push(new THREE.Vector3(x, y, z));
      }
      // Ensure each triangle faces outward (up for top panels, ±X for side panels).
      const want = panel.face === 'top' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(mirror ? -1 : 1, 0, 0);
      for (let i = 0; i < pts.length; i += 3) {
        const a = pts[i];
        let b = pts[i + 1];
        let c = pts[i + 2];
        const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
        if (n.dot(want) < 0) {
          const t = b;
          b = c;
          c = t;
        }
        for (const q of [a, b, c]) {
          positions.push(q.x, q.y, q.z);
          colors.push(tmpC.r, tmpC.g, tmpC.b);
        }
      }
      g.dispose();
    }
  };
  addPolys(polys, hex, 0.012);
  if (inset && insetHex !== undefined) addPolys(inset, insetHex, 0.02);
  if (positions.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Decal geometries for a body (already coloured, ready to merge into the chassis). */
export function buildDecalGeometry(decalId: string, body: BodyData, tokens: ColorTokens): THREE.BufferGeometry[] {
  const decal = findDecal(decalId);
  const polys = patternPolys(decal.pattern);
  if (polys.length === 0) return [];
  // The 'number' roundel gets a bold "1" bar inset.
  const inset = decal.pattern === 'number' ? [rect(-0.06, -0.28, 0.06, 0.28), rect(-0.16, 0.14, 0.0, 0.26)] : undefined;
  const out: THREE.BufferGeometry[] = [];
  for (const panel of body.decals) {
    const hex = resolveColor(panel.color ?? 'paint2', tokens);
    const insetHex = 0x1d1d2b;
    const g = panelGeometry(polys, panel, hex, false, inset, insetHex);
    if (g) out.push(g);
    if (panel.mirror) {
      const g2 = panelGeometry(polys, panel, hex, true, inset, insetHex);
      if (g2) out.push(g2);
    }
  }
  return out;
}
