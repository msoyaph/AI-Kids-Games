/**
 * Around the town: woods and hedgerow trees on the countryside's hills, a striped lighthouse on its
 * rocky islet out in the bay, and little sailboats bobbing on the water. Rebuilt when the season or
 * the tier changes; Low thins the far trees (the town itself looks the same on every tier).
 * Two town projects show here: the lighthouse stays dark until it's relit, then sweeps its beams
 * over the bay every evening; and once the pier is mended, Captain Noor's ferry comes and goes.
 */
import * as THREE from 'three';
import { noise } from '../core/rng';
import type { Season } from '../sim/clock';
import { BEACH, inland, WATER_Y } from '../sim/map';
import { bevelBox, box, cone, cyl, dodec, merge, PAT, part, sphere, torus } from './geo';
import { InstancedLayer } from './instanced';
import { groundY, outside, SPAN, WORLD0 } from './land';
import { Materials } from './materials';
import { farTree, pineTree, roundTree } from './models/props';
import { tinted, WHITE } from './models/kit';
import { mixHex, SEASON_PALETTES } from './palette';

/** The lighthouse; its lamp glows at night only once the town has relit it. */
function lighthouse(lit: boolean): THREE.BufferGeometry {
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
    lit ? part(cyl(0.26, 0.26, 0.42, 10), 0xfff1c8, { pos: [0, 2.98, 0], pattern: PAT.glow }) : part(cyl(0.26, 0.26, 0.42, 10), 0x7d8794, { pos: [0, 2.98, 0], pattern: PAT.glass }),
    part(cone(0.34, 0.34, 10), RED, { pos: [0, 3.36, 0] }),
    part(sphere(0.06, 6, 4), 0xf2c84b, { pos: [0, 3.56, 0] }),
  ];
  return merge(parts);
}

/** Captain Noor's ferry (0.7 × 2): a white hull with a teal band, a cabin of windows and a coral funnel. Points south (+z). */
function ferryBoat(): THREE.BufferGeometry {
  return merge([
    part(bevelBox(0.7, 0.22, 1.8, 0.1), WHITE, { pos: [0, 0.06, 0] }),
    part(cone(0.35, 0.35, 4), WHITE, { pos: [0, 0.06, 1.06], rot: [Math.PI / 2, Math.PI / 4, 0], scale: [1, 1, 0.45] }),
    part(box(0.72, 0.06, 1.7), 0x2f7f8a, { pos: [0, 0.05, -0.02] }),
    part(box(0.62, 0.03, 1.64), 0xd9b98a, { pos: [0, 0.18, 0], pattern: PAT.boards }),
    part(bevelBox(0.5, 0.26, 0.9, 0.04), 0xf6f0e2, { pos: [0, 0.33, -0.12] }),
    part(box(0.52, 0.1, 0.84), 0x8fc6dc, { pos: [0, 0.36, -0.12], pattern: PAT.glass }),
    part(bevelBox(0.56, 0.04, 0.98, 0.02), 0x2f7f8a, { pos: [0, 0.47, -0.12] }),
    part(cyl(0.07, 0.08, 0.24, 10), 0xef6a55, { pos: [0, 0.6, -0.36] }),
    part(cyl(0.075, 0.075, 0.04, 10), 0x3b3f46, { pos: [0, 0.73, -0.36] }),
    ...[-1, 1].map(s => part(torus(0.05, 0.016, 5, 10), 0xef6a55, { pos: [s * 0.28, 0.32, 0.36], rot: [0, Math.PI / 2, 0] })),
    part(sphere(0.025, 6, 4), 0xfff4c8, { pos: [0, 0.52, 0.34], pattern: PAT.glow }),
  ], { ao: false });
}

/** Where the ferry docks (beside the pier's sea end) and where it sails to, out of sight across the bay. */
const DOCK = { x: 49.15, z: -0.6 }, AWAY = { x: 66, z: -30 };
/** One ferry trip: seconds docked, sailing out, away, and sailing back in. */
const FERRY = { docked: 14, out: 22, away: 10, back: 22 };

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
  private lit = false;
  /** Two long soft beams from the lamp, turning slowly at dusk and night. */
  private beams: THREE.Group;
  private beamMat: THREE.MeshBasicMaterial;
  private ferry: THREE.Mesh;
  private ferryOn = false;
  private ferryT = 0;
  private boats: InstancedLayer;
  private t = 0;

  constructor() {
    this.group.name = 'scenery';
    this.lighthouse = new THREE.Mesh(lighthouse(false), Materials.flat);
    this.lighthouse.position.set(29, WATER_Y, -9);
    this.lighthouse.castShadow = true;
    this.lighthouse.receiveShadow = true;
    this.beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    // a beam: a long open cone lying on its side, its tip at the lamp
    const beam = new THREE.ConeGeometry(1.1, 9, 16, 1, true).translate(0, -4.5, 0).rotateZ(Math.PI / 2);
    this.beams = new THREE.Group();
    for (const a of [0, Math.PI]) { const m = new THREE.Mesh(beam, this.beamMat); m.rotation.y = a; m.renderOrder = 3; this.beams.add(m); }
    this.beams.position.set(29, WATER_Y + 2.98, -9);
    this.beams.visible = false;
    this.ferry = new THREE.Mesh(ferryBoat(), Materials.flat);
    this.ferry.visible = false;
    this.ferry.castShadow = true;
    this.boats = new InstancedLayer(sailboat(), Materials.flatTintInst, 8, { shadow: false });
    this.group.add(this.lighthouse, this.beams, this.ferry, this.boats.mesh);
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

  /** The town's projects: is the lighthouse relit, and is the pier mended (so the ferry runs)? */
  setProjects(lit: boolean, ferry: boolean) {
    if (lit !== this.lit) {
      this.lit = lit;
      this.lighthouse.geometry.dispose();
      this.lighthouse.geometry = lighthouse(lit);
    }
    if (ferry !== this.ferryOn) { this.ferryOn = ferry; this.ferry.visible = ferry; this.ferryT = 0; this.placeFerry(); }
  }

  private placeFerry() {
    const F = FERRY, loop = F.docked + F.out + F.away + F.back;
    const t = this.ferryT % loop;
    const ease = (u: number) => u * u * (3 - 2 * u);
    let u = 0, dir = 1;
    if (t < F.docked) u = 0;
    else if (t < F.docked + F.out) u = ease((t - F.docked) / F.out);
    else if (t < F.docked + F.out + F.away) u = 1;
    else { u = 1 - ease((t - F.docked - F.out - F.away) / F.back); dir = -1; }
    // a gentle curve out round the pier's end
    const x = DOCK.x + (AWAY.x - DOCK.x) * u + Math.sin(u * Math.PI) * 2.5;
    const z = DOCK.z + (AWAY.z - DOCK.z) * u;
    const dx = (AWAY.x - DOCK.x) + Math.cos(u * Math.PI) * Math.PI * 2.5, dz = AWAY.z - DOCK.z;
    this.ferry.position.set(x, WATER_Y + 0.02 + Math.sin(this.t * 1.2) * 0.02, z);
    this.ferry.rotation.y = t < F.docked ? Math.PI : Math.atan2(dx * dir, dz * dir);
    this.ferry.visible = this.ferryOn && u < 0.98;
  }

  update(dt: number, reducedMotion: boolean, night: number) {
    // the lighthouse's beams show from dusk, when it has been relit
    const beam = this.lit ? night * 0.22 : 0;
    this.beamMat.opacity = beam;
    this.beams.visible = beam > 0.01;
    if (reducedMotion) return;
    this.t += dt;
    this.beams.rotation.y += dt * 0.6;
    if (this.ferryOn) { this.ferryT += dt; this.placeFerry(); }
    this.placeBoats();
  }
}
