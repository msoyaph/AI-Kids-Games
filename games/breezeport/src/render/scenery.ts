/**
 * Around the town: woods and hedgerow trees on the countryside's hills, a striped lighthouse on its
 * rocky islet out in the bay, and little sailboats bobbing on the water. Rebuilt when the season or
 * the tier changes; Low thins the far trees (the town itself looks the same on every tier).
 */
import * as THREE from 'three';
import { noise } from '../core/rng';
import type { Season } from '../sim/clock';
import { BEACH, inland, WATER_Y } from '../sim/map';
import { bevelBox, box, cone, cyl, dodec, merge, PAT, part, sphere } from './geo';
import { InstancedLayer } from './instanced';
import { groundY, outside, SPAN, WORLD0 } from './land';
import { Materials } from './materials';
import { farTree, pineTree, roundTree } from './models/props';
import { tinted, WHITE } from './models/kit';
import { mixHex, SEASON_PALETTES } from './palette';

function lighthouse(): THREE.BufferGeometry {
  const RED = 0xe25c4a;
  const parts = [
    part(dodec(1.3), 0x8f8a80, { pos: [0, -0.3, 0], scale: [1.4, 0.55, 1.1], pattern: PAT.stone }),
    part(dodec(0.8), 0xa29d92, { pos: [0.9, -0.25, 0.5], scale: [1, 0.5, 1], pattern: PAT.stone }),
    part(dodec(0.6), 0x7f7a70, { pos: [-1.0, -0.3, 0.4], scale: [1, 0.5, 1], pattern: PAT.stone }),
    part(bevelBox(1.1, 0.5, 0.9, 0.06), 0xf6f0e2, { pos: [0.75, 0.45, 0.2], pattern: PAT.siding }),
    part(cone(0.75, 0.42, 4), 0x4f6f8f, { pos: [0.75, 0.9, 0.2], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.8], pattern: PAT.tiles }),
    part(cyl(0.34, 0.46, 2.6, 14), WHITE, { pos: [0, 1.4, 0] }),
    ...[0.6, 1.4, 2.2].map(y => part(cyl(0.44 - y * 0.045, 0.46 - y * 0.045, 0.32, 14), RED, { pos: [0, y, 0] })),
    part(cyl(0.48, 0.48, 0.08, 14), 0x3b3f46, { pos: [0, 2.74, 0] }),
    part(cyl(0.26, 0.26, 0.42, 10), 0xfff1c8, { pos: [0, 2.98, 0], pattern: PAT.glow }),
    part(cone(0.34, 0.34, 10), RED, { pos: [0, 3.36, 0] }),
    part(sphere(0.06, 6, 4), 0xf2c84b, { pos: [0, 3.56, 0] }),
  ];
  return merge(parts);
}

function sailboat(): THREE.BufferGeometry {
  return merge([
    part(bevelBox(0.3, 0.12, 0.9, 0.05), WHITE, { pos: [0, 0.04, 0], pattern: tinted(PAT.none) }),
    part(cone(0.15, 0.25, 4), WHITE, { pos: [0, 0.04, 0.55], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.5], pattern: tinted(PAT.none) }),
    part(box(0.26, 0.03, 0.8), 0xd9b98a, { pos: [0, 0.11, 0], pattern: PAT.boards }),
    part(cyl(0.015, 0.015, 1.0, 5), 0x8a5a3b, { pos: [0, 0.6, 0.05] }),
    part(sail([0, 0.15, 0.08], [0, 1.05, 0.08], [0, 0.18, -0.42]), 0xfdfbf5, {}),
    part(sail([0, 0.15, 0.12], [0, 0.85, 0.12], [0, 0.18, 0.5]), 0xf6b6a4, {}),
  ], { ao: false });
}

/** A triangle of sail, both sides. */
function sail(a: number[], b: number[], c: number[]): THREE.BufferGeometry {
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...b], 3));
}

const BOATS: { x: number; z: number; color: number; heading: number }[] = [
  { x: 9, z: -4.5, color: 0x3f8fd0, heading: 1.2 },
  { x: 19, z: -9, color: 0xe25c4a, heading: -0.6 },
  { x: -2, z: -11, color: 0xffc23d, heading: 2.2 },
  { x: 33, z: -3.5, color: 0x5fbf7a, heading: 0.4 },
];

export class Scenery {
  readonly group = new THREE.Group();
  layers: InstancedLayer[] = [];
  private lighthouse: THREE.Mesh;
  private boats: InstancedLayer;
  private t = 0;

  constructor() {
    this.group.name = 'scenery';
    this.lighthouse = new THREE.Mesh(lighthouse(), Materials.flat);
    this.lighthouse.position.set(29, WATER_Y, -9);
    this.lighthouse.castShadow = true;
    this.lighthouse.receiveShadow = true;
    this.boats = new InstancedLayer(sailboat(), Materials.flatTintInst, 8, { shadow: false });
    this.group.add(this.lighthouse, this.boats.mesh);
  }

  build(season: Season, decor: number) {
    for (const l of this.layers) l.dispose();
    const pal = SEASON_PALETTES[season];
    const near = new InstancedLayer(roundTree(), Materials.treeTintInst, 256, { cull: true });
    const pines = new InstancedLayer(pineTree(), Materials.treeTintInst, 128, { cull: true });
    const far = new InstancedLayer(farTree(), Materials.treeTintInst, 512, { cull: true });
    this.layers = [near, pines, far];
    for (const l of this.layers) { l.begin(); this.group.add(l.mesh); }
    for (let z = WORLD0; z < WORLD0 + SPAN; z++) for (let x = WORLD0; x < WORLD0 + SPAN; x++) {
      const d = outside(x + 0.5, z + 0.5);
      if (d < 1.2 || inland(x + 0.5, z + 0.5) < BEACH + 1) continue;
      // woods in patches, thicker further out; Low keeps fewer of the far ones
      const patch = noise(Math.floor(x / 5), Math.floor(z / 5), 41);
      const p = (d < 4 ? 0.16 : 0.08 + patch * 0.42) * (d < 3 ? 1 : decor);
      if (noise(x, z, 42) > p) continue;
      const jx = x + 0.2 + noise(x, z, 43) * 0.6, jz = z + 0.2 + noise(x, z, 44) * 0.6;
      const y = groundY(jx, jz);
      const s = 0.85 + noise(x, z, 45) * 0.5;
      const tint = mixHex(pal.leaf, noise(x, z, 46) < 0.3 ? pal.leafAlt : pal.pine, noise(x, z, 47) * 0.5);
      if (d < 3) near.push(jx, y, jz, noise(x, z, 48) * 6, s, tint);
      else if (noise(x, z, 49) < 0.3) pines.push(jx, y, jz, 0, s * 1.15, pal.pine);
      else far.push(jx, y, jz, noise(x, z, 48) * 6, s * 1.2, tint);
    }
    for (const l of this.layers) l.end();
    // the boats keep their colours
    this.placeBoats();
  }

  private placeBoats() {
    this.boats.begin();
    for (const b of BOATS) {
      const bob = Math.sin(this.t * 1.3 + b.x) * 0.03;
      this.boats.push(b.x + Math.sin(this.t * 0.05 + b.z) * 0.6, WATER_Y + 0.02 + bob, b.z, b.heading + Math.sin(this.t * 0.4 + b.x) * 0.05, 1, b.color);
    }
    this.boats.end();
  }

  update(dt: number, reducedMotion: boolean) {
    if (reducedMotion) return;
    this.t += dt;
    this.placeBoats();
  }
}
