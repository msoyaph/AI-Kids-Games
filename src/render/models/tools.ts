// Held-tool meshes (attached to the character's right hand).
import * as THREE from 'three';
import type { ToolKind } from '../../data/types';
import { vcolMat } from '../curve';
import { box, cone, cyl, ico, merge, part, torus } from './geo';

const mat = vcolMat();
const cache = new Map<string, THREE.BufferGeometry>();

function geoFor(kind: ToolKind, sturdy: boolean): THREE.BufferGeometry {
  const key = kind + (sturdy ? 's' : 'f');
  const hit = cache.get(key);
  if (hit) return hit;
  const handle = sturdy ? 0xc4a26a : 0xa47a52;
  const metal = sturdy ? 0x9fb4c8 : 0xb8b2c4;
  let g: THREE.BufferGeometry;
  switch (kind) {
    case 'net':
      g = merge([
        part(cyl(0.025, 0.025, 1.0, 5), handle, { pos: [0, 0.5, 0] }),
        part(torus(0.2, 0.02, 4, 12), sturdy ? 0xe0b04a : 0xa47a52, { pos: [0, 1.15, 0], rot: [0, Math.PI / 2, 0] }),
        part(cone(0.19, 0.3, 8), 0xf4f1ea, { pos: [0.12, 1.15, 0], rot: [0, 0, -Math.PI / 2] }),
      ]);
      break;
    case 'rod':
      g = merge([
        part(cyl(0.02, 0.03, 1.4, 5), handle, { pos: [0, 0.7, 0] }),
        part(cyl(0.06, 0.06, 0.08, 8), metal, { pos: [0, 0.25, 0.05], rot: [Math.PI / 2, 0, 0] }),
      ]);
      break;
    case 'shovel':
      g = merge([part(cyl(0.025, 0.025, 0.9, 5), handle, { pos: [0, 0.45, 0] }), part(box(0.22, 0.28, 0.04), metal, { pos: [0, 0.98, 0] })]);
      break;
    case 'axe':
      g = merge([part(cyl(0.025, 0.03, 0.8, 5), handle, { pos: [0, 0.4, 0] }), part(box(0.24, 0.16, 0.05), metal, { pos: [0.1, 0.74, 0] })]);
      break;
    case 'can':
      g = merge([
        part(cyl(0.12, 0.14, 0.22, 8), sturdy ? 0xd9905a : 0xd9c39a, { pos: [0, 0.0, 0.1] }),
        part(cyl(0.025, 0.035, 0.28, 5), sturdy ? 0xd9905a : 0xd9c39a, { pos: [0, 0.08, 0.32], rot: [1.1, 0, 0] }),
        part(torus(0.08, 0.015, 4, 8, Math.PI), handle, { pos: [0, 0.12, 0.02], rot: [0, Math.PI / 2, 0] }),
      ]);
      break;
    case 'ladder':
    default:
      g = merge([
        part(box(0.04, 1.0, 0.04), handle, { pos: [-0.14, 0.5, -0.1] }),
        part(box(0.04, 1.0, 0.04), handle, { pos: [0.14, 0.5, -0.1] }),
        ...[0.2, 0.45, 0.7, 0.95].map((y) => part(box(0.3, 0.03, 0.03), 0xe6d3b0, { pos: [0, y, -0.1] })),
      ]);
      break;
  }
  cache.set(key, g);
  return g;
}

export function toolMesh(kind: ToolKind, sturdy: boolean): THREE.Mesh {
  const m = new THREE.Mesh(geoFor(kind, sturdy), mat);
  m.castShadow = true;
  // hand space: tools point forward/up
  m.rotation.x = kind === 'can' ? 0 : Math.PI / 2.2;
  m.position.set(0, 0, kind === 'can' ? 0.05 : 0);
  if (kind === 'ladder') {
    m.rotation.x = 0;
    m.position.set(0, -0.3, -0.25);
  }
  return m;
}

/** Fish/bug held up for the catch fanfare. */
export function heldSphere(color: number): THREE.Mesh {
  return new THREE.Mesh(merge([part(ico(0.15, 1), color)]), mat);
}
