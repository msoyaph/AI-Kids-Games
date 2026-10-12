// Parametric low-poly fish, bugs and fossils (used in the world, the catch fanfare and the museum).
import * as THREE from 'three';
import type { BugDef, FishDef, FossilDef } from '../../data/types';
import { curved, vcolMat } from '../curve';
import { box, cone, cyl, ico, merge, part, sphere, torus } from './geo';

const mat = vcolMat();
const glowMat = curved(new THREE.MeshLambertMaterial({ color: 0xfff4a0, emissive: 0xfff08a, emissiveIntensity: 1.6 }));
const wingMat = curved(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));

function meshOf(parts: THREE.BufferGeometry[], m: THREE.Material = mat): THREE.Mesh {
  const me = new THREE.Mesh(merge(parts), m);
  me.castShadow = true;
  return me;
}

/** Fish oriented along +z (head toward +z), ~1 unit long. */
export function buildFish(def: FishDef): THREE.Group {
  const [c, c2, c3] = def.colors;
  const g = new THREE.Group();
  switch (def.shape) {
    case 'eel': {
      const parts: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 6; k++)
        parts.push(part(sphere(0.09 - k * 0.006, 7, 5), k % 2 ? c : c3, { pos: [Math.sin(k * 0.9) * 0.05, 0, 0.45 - k * 0.17], scale: [1, 1, 1.5] }));
      parts.push(part(sphere(0.03, 5, 4), 0x2c2433, { pos: [0.06, 0.04, 0.5] }), part(sphere(0.03, 5, 4), 0x2c2433, { pos: [-0.06, 0.04, 0.5] }));
      parts.push(part(box(0.02, 0.1, 0.7), c2, { pos: [0, 0.09, 0] }));
      g.add(meshOf(parts));
      break;
    }
    case 'ray':
      g.add(
        meshOf([
          part(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 4), c, { rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.75] }),
          part(cyl(0.015, 0.02, 0.6, 4), c2, { pos: [0, 0, -0.55], rot: [Math.PI / 2, 0, 0] }),
          part(sphere(0.03, 5, 4), 0x2c2433, { pos: [0.08, 0.05, 0.2] }),
          part(sphere(0.03, 5, 4), 0x2c2433, { pos: [-0.08, 0.05, 0.2] }),
          part(ico(0.06, 0), c3, { pos: [0.15, 0.04, 0], scale: [1, 0.3, 1] }),
        ]),
      );
      break;
    case 'puffer': {
      const parts = [part(ico(0.32, 1), c), part(cone(0.12, 0.18, 4), c2, { pos: [0, 0, -0.36], rot: [-Math.PI / 2, 0, 0], scale: [0.4, 1, 1] })];
      for (let k = 0; k < 14; k++) {
        const a = k * 2.4, b = (k / 14) * Math.PI;
        const n = new THREE.Vector3(Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b));
        parts.push(part(cone(0.03, 0.1, 4), c3, { pos: [n.x * 0.32, n.y * 0.32, n.z * 0.32], rot: [Math.acos(n.y), 0, -Math.atan2(n.x, n.z)] }));
      }
      parts.push(part(sphere(0.05, 6, 4), 0x2c2433, { pos: [0.14, 0.08, 0.26] }), part(sphere(0.05, 6, 4), 0x2c2433, { pos: [-0.14, 0.08, 0.26] }));
      g.add(meshOf(parts));
      break;
    }
    case 'jelly': {
      const parts = [part(new THREE.SphereGeometry(0.3, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), c)];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        parts.push(part(cyl(0.015, 0.008, 0.45, 3), c2, { pos: [Math.cos(a) * 0.18, -0.22, Math.sin(a) * 0.18] }));
      }
      const m = new THREE.Mesh(merge(parts), curved(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.8, emissive: c3, emissiveIntensity: 0.25 })));
      g.add(m);
      break;
    }
    case 'crab': {
      const parts = [part(ico(0.26, 1), c, { scale: [1.3, 0.55, 1] })];
      for (const s of [-1, 1]) {
        parts.push(part(ico(0.1, 0), c2, { pos: [s * 0.32, 0.05, 0.22], scale: [1, 0.7, 1.3] }));
        for (let k = 0; k < 3; k++) parts.push(part(cyl(0.02, 0.015, 0.3, 4), c3, { pos: [s * 0.38, -0.05, -0.1 + k * 0.12], rot: [0, 0, s * 1.1] }));
        parts.push(part(cyl(0.012, 0.012, 0.14, 4), c3, { pos: [s * 0.08, 0.16, 0.18] }), part(sphere(0.04, 6, 4), 0x2c2433, { pos: [s * 0.08, 0.24, 0.18] }));
      }
      g.add(meshOf(parts));
      break;
    }
    default: {
      g.add(
        meshOf([
          part(sphere(0.5, 10, 7), c, { scale: [0.48, 0.85, 1] }),
          part(sphere(0.38, 8, 6), c3, { pos: [0, -0.1, 0.05], scale: [0.4, 0.5, 0.9] }),
          part(cone(0.22, 0.32, 4), c2, { pos: [0, 0, -0.6], rot: [-Math.PI / 2, 0, 0], scale: [0.25, 1, 1] }),
          part(cone(0.14, 0.26, 4), c2, { pos: [0, 0.42, -0.05], rot: [-0.4, 0, 0], scale: [0.2, 1, 1] }),
          part(sphere(0.05, 6, 4), 0xffffff, { pos: [0.2, 0.12, 0.32] }),
          part(sphere(0.05, 6, 4), 0xffffff, { pos: [-0.2, 0.12, 0.32] }),
          part(sphere(0.032, 6, 4), 0x2c2433, { pos: [0.23, 0.13, 0.34] }),
          part(sphere(0.032, 6, 4), 0x2c2433, { pos: [-0.23, 0.13, 0.34] }),
        ]),
      );
    }
  }
  g.scale.setScalar(0.35 + def.size * 0.12);
  return g;
}

export interface BugModel {
  group: THREE.Group;
  wings: THREE.Object3D[];
}

/** Bug ~0.3 units, head toward +z. */
export function buildBug(def: BugDef): BugModel {
  const [c, c2, c3] = def.colors;
  const g = new THREE.Group();
  const wings: THREE.Object3D[] = [];
  const legs = (n: number, spread = 0.12, len = 0.12) => {
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < n; k++)
      for (const s of [-1, 1]) parts.push(part(cyl(0.008, 0.006, len, 3), 0x4a4058, { pos: [s * spread, -0.03, -0.05 + k * (0.15 / n)], rot: [0, 0, s * 1.0] }));
    return parts;
  };
  const wing = (w: number, l: number, color: number, x: number, z: number, rotZ = 0) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.04, z);
    const m = new THREE.Mesh(merge([part(new THREE.CircleGeometry(1, 7), color, { rot: [-Math.PI / 2, 0, 0], scale: [w, l, 1] })]), wingMat);
    m.position.set(x, 0, 0);
    pivot.rotation.z = rotZ;
    pivot.add(m);
    g.add(pivot);
    wings.push(pivot);
    return pivot;
  };
  switch (def.shape) {
    case 'butterfly':
    case 'moth': {
      g.add(meshOf([part(sphere(0.03, 6, 4), c3, { scale: [1, 1, 5] }), part(cyl(0.004, 0.004, 0.1, 3), 0x3a3046, { pos: [0.03, 0.05, 0.16], rot: [0.6, 0, -0.3] }), part(cyl(0.004, 0.004, 0.1, 3), 0x3a3046, { pos: [-0.03, 0.05, 0.16], rot: [0.6, 0, 0.3] })]));
      for (const s of [-1, 1]) {
        const p = wing(0.13, 0.1, c, s * 0.13, 0.04);
        p.userData.side = s;
        const p2 = wing(0.09, 0.08, c2, s * 0.1, -0.08);
        p2.userData.side = s;
      }
      break;
    }
    case 'dragonfly':
      g.add(meshOf([part(cyl(0.02, 0.012, 0.5, 5), c, { pos: [0, 0, -0.1], rot: [Math.PI / 2, 0, 0] }), part(sphere(0.05, 6, 4), c2, { pos: [0, 0, 0.17] })]));
      for (const s of [-1, 1]) {
        wing(0.2, 0.035, 0xeaf6ff, s * 0.2, 0.06).userData.side = s;
        wing(0.18, 0.03, 0xeaf6ff, s * 0.18, -0.02).userData.side = s;
      }
      break;
    case 'bee':
      g.add(meshOf([part(sphere(0.08, 7, 5), c, { scale: [1, 0.9, 1.3] }), part(box(0.15, 0.04, 0.04), c2, { pos: [0, 0.02, -0.02] }), part(box(0.14, 0.04, 0.04), c2, { pos: [0, 0.02, 0.05] }), part(sphere(0.05, 6, 4), c3, { pos: [0, 0.01, 0.13] })]));
      for (const s of [-1, 1]) wing(0.07, 0.05, 0xf4fbff, s * 0.07, 0).userData.side = s;
      break;
    case 'firefly': {
      g.add(meshOf([part(sphere(0.035, 6, 4), c, { scale: [1, 0.8, 1.6] }), ...legs(2, 0.04, 0.06)]));
      const glow = new THREE.Mesh(sphere(0.05, 6, 4), glowMat);
      glow.position.set(0, 0, -0.07);
      g.add(glow);
      for (const s of [-1, 1]) wing(0.06, 0.04, 0xf4fbff, s * 0.05, 0.02).userData.side = s;
      break;
    }
    case 'snail': {
      const parts = [part(cyl(0.04, 0.05, 0.28, 6), c2, { pos: [0, -0.03, 0.02], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.6] })];
      parts.push(part(torus(0.07, 0.04, 6, 10), c, { pos: [0, 0.07, -0.02], rot: [0, Math.PI / 2, 0] }), part(sphere(0.05, 7, 5), c3, { pos: [0, 0.07, -0.02] }));
      parts.push(part(cyl(0.008, 0.008, 0.08, 3), c2, { pos: [0.03, 0.03, 0.16], rot: [0.4, 0, 0] }), part(cyl(0.008, 0.008, 0.08, 3), c2, { pos: [-0.03, 0.03, 0.16], rot: [0.4, 0, 0] }));
      g.add(meshOf(parts));
      break;
    }
    case 'spider':
      g.add(meshOf([part(sphere(0.07, 7, 5), c, { pos: [0, 0, -0.06] }), part(sphere(0.045, 6, 4), c2, { pos: [0, 0, 0.05] }), ...legs(4, 0.11, 0.18), part(sphere(0.012, 4, 3), c3, { pos: [0.02, 0.03, 0.09] }), part(sphere(0.012, 4, 3), c3, { pos: [-0.02, 0.03, 0.09] })]));
      break;
    case 'ant':
      g.add(meshOf([part(sphere(0.04, 6, 4), c, { pos: [0, 0, -0.08], scale: [1, 0.9, 1.3] }), part(sphere(0.025, 6, 4), c, { pos: [0, 0, 0] }), part(sphere(0.032, 6, 4), c2, { pos: [0, 0.01, 0.07] }), ...legs(3, 0.06, 0.08)]));
      break;
    case 'hopper':
      g.add(meshOf([part(sphere(0.06, 7, 5), c, { scale: [0.9, 0.8, 2.2] }), part(sphere(0.04, 6, 4), c2, { pos: [0, 0.02, 0.13] }), part(cyl(0.01, 0.01, 0.2, 3), c3, { pos: [0.06, 0.05, -0.05], rot: [0.9, 0, 0] }), part(cyl(0.01, 0.01, 0.2, 3), c3, { pos: [-0.06, 0.05, -0.05], rot: [0.9, 0, 0] })]));
      break;
    case 'beetle':
    default:
      g.add(
        meshOf([
          part(sphere(0.09, 8, 6), c, { pos: [0, 0.02, -0.02], scale: [0.95, 0.65, 1.25] }),
          part(sphere(0.05, 6, 4), c2, { pos: [0, 0.01, 0.11] }),
          part(box(0.006, 0.04, 0.2), c3, { pos: [0, 0.07, -0.02] }),
          part(cone(0.015, 0.09, 4), c2, { pos: [0, 0.04, 0.17], rot: [0.9, 0, 0] }),
          ...legs(3, 0.1, 0.12),
        ]),
      );
  }
  return { group: g, wings };
}

export function flapWings(m: BugModel, t: number, speed = 24): void {
  for (const w of m.wings) {
    const s = (w.userData.side as number) ?? 1;
    w.rotation.z = s * Math.sin(t * speed) * 0.7;
  }
}

export function buildFossil(def: FossilDef): THREE.Group {
  const [c, c2] = def.colors;
  const g = new THREE.Group();
  switch (def.shape) {
    case 'skull':
      g.add(
        meshOf([
          part(ico(0.35, 1), c, { pos: [0, 0.3, 0], scale: [1, 0.8, 1.2] }),
          part(box(0.4, 0.15, 0.45), c, { pos: [0, 0.12, 0.35] }),
          part(sphere(0.08, 6, 4), c2, { pos: [0.16, 0.35, 0.2] }),
          part(sphere(0.08, 6, 4), c2, { pos: [-0.16, 0.35, 0.2] }),
          ...[0, 1, 2, 3].map((k) => part(cone(0.03, 0.1, 4), 0xfff8ea, { pos: [-0.12 + k * 0.08, 0.02, 0.5], rot: [Math.PI, 0, 0] })),
        ]),
      );
      break;
    case 'shellFossil':
      g.add(meshOf([part(torus(0.22, 0.12, 6, 12), c, { pos: [0, 0.32, 0], rot: [0, 0, 0] }), part(sphere(0.12, 6, 5), c2, { pos: [0, 0.32, 0] }), part(box(0.6, 0.1, 0.3), c2, { pos: [0, 0.05, 0] })]));
      break;
    case 'rock':
      g.add(meshOf([part(ico(0.35, 0), c, { pos: [0, 0.3, 0], scale: [1.2, 0.9, 0.8] }), part(torus(0.12, 0.03, 4, 10), c2, { pos: [0, 0.32, 0.25] })]));
      break;
    case 'bone':
    default:
      g.add(
        meshOf([
          part(cyl(0.07, 0.07, 0.7, 6), c, { pos: [0, 0.2, 0], rot: [0, 0, Math.PI / 2] }),
          part(ico(0.13, 0), c, { pos: [0.38, 0.2, 0.06] }),
          part(ico(0.13, 0), c, { pos: [0.38, 0.2, -0.06] }),
          part(ico(0.13, 0), c, { pos: [-0.38, 0.2, 0.06] }),
          part(ico(0.13, 0), c, { pos: [-0.38, 0.2, -0.06] }),
          part(box(0.9, 0.06, 0.4), c2, { pos: [0, 0.03, 0] }),
        ]),
      );
  }
  return g;
}
