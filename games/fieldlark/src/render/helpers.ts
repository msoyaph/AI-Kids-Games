/**
 * The farmhands: friendly volunteers from Larkford who help out on the community farm. They are not
 * the player (there is no avatar). Once a farmhand is welcomed as a helper with a job
 * (src/sim/helpers.ts), their figure follows the sim: it walks to each task and acts it out. Until
 * then, and for anyone without a job, they potter about doing the work you'd expect: raking by the
 * fields, carrying buckets to the troughs, brushing the animals, carrying crates to the dock, resting
 * by the cottage, and coming over to help when you harvest, water or plant. They are only a picture:
 * the drawing never changes the farm, and taps go through them.
 *
 * Each body part is one instanced mesh for everyone (head, torso, arm, leg, and the things they
 * carry), so a few farmhands cost a handful of draw calls. Clothes, hair and skin colours come from a
 * small palette in the shader, chosen per person by the instance colour.
 */
import * as THREE from 'three';
import { DECOR_BY_ID } from '../data/decor';
import { animalForHome } from '../data/animals';
import { HELPER_LOOK } from '../data/cast';
import { H, tileAt, W } from '../sim/map';
import type { Obj } from '../sim/objects';
import type { Helper as SimHelper } from '../sim/helpers';
import { objAt as objAtTile } from '../sim/world';
import type { Farm } from '../sim/state';
import { sizeOf } from '../sim/world';
import { patchMaterial } from './fx';
import { bevelBox, box, cyl, merge, PAT, part, sphere, torus } from './geo';
import { groundY } from './land';

// tint channels (carried in the geometry's `pattern` attribute)
const SHIRT = 1, PANTS = 2, HAIR = 3, SKIN = 4, HAT = 5;
const PEOPLE = HELPER_LOOK.length;
/** Shirt, trousers, hair, skin and hat band for each farmhand (src/data/cast.ts). */
const PALETTE = HELPER_LOOK;

const palUniform = { value: PALETTE.flat().map(h => new THREE.Color(h)) };
const bodyMat = patchMaterial(new THREE.MeshLambertMaterial({ vertexColors: true }), {
  key: 'farmhand',
  rim: true,
  vertexDeclarations: `attribute float pattern;\nuniform vec3 hPal[${PEOPLE * 5}];`,
  uniforms: { hPal: palUniform },
});
{
  const inner = bodyMat.onBeforeCompile;
  bodyMat.onBeforeCompile = (sh, r) => {
    inner.call(bodyMat, sh, r);
    sh.uniforms.hPal = palUniform;
    sh.vertexShader = sh.vertexShader.replace('#include <color_vertex>', /* glsl */ `
      vColor = vec4(1.0);
      vColor.rgb *= color.rgb;
      #ifdef USE_INSTANCING_COLOR
      {
        int who = int(instanceColor.r * ${PEOPLE.toFixed(1)} + 0.01);
        int ch = int(pattern + 0.5);
        if (ch > 0) vColor.rgb *= hPal[who * 5 + ch - 1];
      }
      #endif`);
  };
}
const itemMat = patchMaterial(new THREE.MeshLambertMaterial({ vertexColors: true }), { key: 'item', rim: true, patterns: true });

const WHITE = 0xffffff;
// --- body parts: each built around its joint ---
function torso(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.1, 0.118, 0.24, 10), WHITE, { pos: [0, 0.12, 0], scale: [1, 1, 0.78], pattern: SHIRT }),
    part(sphere(0.1, 10, 6), WHITE, { pos: [0, 0.24, 0], scale: [1, 0.35, 0.78], pattern: SHIRT }),
    // overalls: the bib, the straps and the pocket
    part(box(0.14, 0.13, 0.03), WHITE, { pos: [0, 0.075, 0.085], pattern: PANTS }),
    part(cyl(0.121, 0.121, 0.07, 10), WHITE, { pos: [0, 0.03, 0], scale: [1, 1, 0.8], pattern: PANTS }),
    ...[-1, 1].map(s => part(box(0.025, 0.14, 0.02), WHITE, { pos: [s * 0.05, 0.17, 0.08], rot: [0.1, 0, 0], pattern: PANTS })),
    ...[-1, 1].map(s => part(sphere(0.012, 5, 3), 0xf2d38c, { pos: [s * 0.05, 0.13, 0.1] })),
    part(box(0.06, 0.04, 0.01), 0x3d3a35, { pos: [0.02, 0.06, 0.102] }),
  ], { ao: false });
}

/** Everyone wears a straw hat (one head for all: one draw call); the band is their own colour. */
function head(hat = true): THREE.BufferGeometry {
  const parts = [
    part(cyl(0.035, 0.04, 0.05, 6), WHITE, { pos: [0, 0.02, 0], pattern: SKIN }),
    part(sphere(0.105, 12, 9), WHITE, { pos: [0, 0.115, 0.005], round: true, pattern: SKIN }),
    part(sphere(0.022, 6, 4), WHITE, { pos: [0, 0.1, 0.105], pattern: SKIN }),
    ...[-1, 1].map(s => part(sphere(0.016, 6, 4), 0x2e2a28, { pos: [s * 0.042, 0.13, 0.092], scale: [0.85, 1.2, 0.6] })),
    ...[-1, 1].map(s => part(sphere(0.006, 4, 3), 0xffffff, { pos: [s * 0.042 + 0.005, 0.138, 0.1] })),
    ...[-1, 1].map(s => part(sphere(0.02, 6, 4), 0xf29a9a, { pos: [s * 0.062, 0.088, 0.083], scale: [1, 0.6, 0.4] })),
    part(torus(0.026, 0.006, 3, 8, Math.PI), 0x8a4a3a, { pos: [0, 0.075, 0.098], rot: [0, 0, Math.PI] }),
    ...[-1, 1].map(s => part(sphere(0.022, 6, 4), WHITE, { pos: [s * 0.104, 0.11, 0], scale: [0.5, 1, 0.8], pattern: SKIN })),
    // hair: a cap at the back and top, a fringe
    part(sphere(0.112, 12, 8), WHITE, { pos: [0, 0.13, -0.012], scale: [1.02, 0.95, 1.0], round: true, pattern: HAIR }),
    part(sphere(0.06, 8, 5), WHITE, { pos: [0.02, 0.19, 0.06], scale: [1.6, 0.5, 0.9], rot: [0.3, 0, -0.2], pattern: HAIR }),
  ];
  if (hat) {
    parts.push(part(cyl(0.2, 0.2, 0.018, 16), 0xe8cf7a, { pos: [0, 0.2, 0], rot: [-0.08, 0, 0], pattern: 0 }));
    parts.push(part(cyl(0.09, 0.11, 0.08, 12), 0xe8cf7a, { pos: [0, 0.245, -0.004] }));
    parts.push(part(cyl(0.112, 0.112, 0.022, 12), WHITE, { pos: [0, 0.215, -0.004], pattern: HAT }));
  } else {
    parts.push(part(sphere(0.055, 8, 6), WHITE, { pos: [0, 0.2, -0.085], round: true, pattern: HAIR }));
  }
  return merge(parts, { ao: false });
}

function arm(): THREE.BufferGeometry {
  return merge([
    part(sphere(0.042, 8, 5), WHITE, { pos: [0, -0.005, 0], pattern: SHIRT }),
    part(cyl(0.036, 0.032, 0.12, 7), WHITE, { pos: [0, -0.06, 0], pattern: SHIRT }),
    part(cyl(0.026, 0.024, 0.08, 6), WHITE, { pos: [0, -0.15, 0], pattern: SKIN }),
    part(sphere(0.032, 7, 5), WHITE, { pos: [0, -0.205, 0.005], round: true, pattern: SKIN }),
  ], { ao: false });
}

function leg(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.044, 0.04, 0.14, 7), WHITE, { pos: [0, -0.07, 0], pattern: PANTS }),
    part(bevelBox(0.07, 0.06, 0.11, 0.02), 0x5a3a28, { pos: [0, -0.17, 0.02] }),
  ], { ao: false });
}

// --- things they carry (held at the right hand; origin at the grip) ---
type Item = 'bucket' | 'rake' | 'crate' | 'brush' | 'basket' | 'can';
const ITEMS: Record<Item, () => THREE.BufferGeometry> = {
  bucket: () => merge([
    part(cyl(0.06, 0.05, 0.1, 9), 0x9aa4ae, { pos: [0, -0.1, 0] }),
    part(cyl(0.056, 0.056, 0.008, 9), 0x6fc3e6, { pos: [0, -0.06, 0] }),
    part(torus(0.058, 0.006, 3, 10, Math.PI), 0x5a5f6b, { pos: [0, -0.05, 0], rot: [0, Math.PI / 2, 0] }),
  ], { ao: false }),
  rake: () => merge([
    part(cyl(0.012, 0.012, 0.62, 5), 0xd2a26e, { pos: [0, -0.05, 0.05], rot: [1.15, 0, 0] }),
    part(box(0.18, 0.025, 0.025), 0x6a6f7a, { pos: [0, -0.18, 0.33] }),
    ...[-0.075, -0.025, 0.025, 0.075].map(x => part(box(0.012, 0.05, 0.012), 0x6a6f7a, { pos: [x, -0.21, 0.34] })),
  ], { ao: false }),
  crate: () => merge([
    part(bevelBox(0.26, 0.18, 0.2, 0.015), 0xd2a26e, { pos: [-0.1, -0.02, 0.12], pattern: PAT.planks }),
    ...[0xf08a24, 0xe2453a, 0xffd34d, 0x8fd06a].map((c, i) => part(sphere(0.042, 6, 4), c, { pos: [-0.16 + (i % 2) * 0.12, 0.08, 0.08 + Math.floor(i / 2) * 0.08] })),
  ], { ao: false }),
  brush: () => merge([
    part(bevelBox(0.1, 0.035, 0.05, 0.01), 0xb07a4f, { pos: [0, -0.03, 0.03] }),
    part(box(0.09, 0.025, 0.04), 0x3d3a35, { pos: [0, -0.06, 0.03] }),
  ], { ao: false }),
  basket: () => merge([
    part(cyl(0.08, 0.06, 0.08, 10), 0xc9a25a, { pos: [0, -0.1, 0], pattern: PAT.straw }),
    part(torus(0.075, 0.008, 3, 10, Math.PI), 0x9a7a4a, { pos: [0, -0.06, 0], rot: [0, Math.PI / 2, 0] }),
    ...[0xe2453a, 0x8fd06a, 0xffd34d].map((c, i) => part(sphere(0.03, 6, 4), c, { pos: [(i - 1) * 0.035, -0.05, 0.01] })),
  ], { ao: false }),
  can: () => merge([
    part(cyl(0.05, 0.055, 0.1, 9), 0x6fae8a, { pos: [0, -0.09, 0.02] }),
    part(cyl(0.008, 0.012, 0.12, 5), 0x6fae8a, { pos: [0, -0.07, 0.11], rot: [1.0, 0, 0] }),
    part(torus(0.04, 0.007, 3, 8, Math.PI), 0x4f8a6a, { pos: [0, -0.03, 0.0], rot: [0, Math.PI / 2, 0] }),
  ], { ao: false }),
};

type Action = 'idle' | 'rake' | 'brush' | 'pour' | 'pick' | 'lift' | 'look';
interface Step { to?: [number, number]; act?: Action; dur?: number; item?: Item | null; face?: [number, number] }

interface Hand {
  who: number;
  /** The sim task this figure is acting out (hired helpers only). */
  simKey: string;
  x: number; z: number; facing: number;
  steps: Step[];
  path: [number, number][];
  act: Action;
  timer: number;
  item: Item | null;
  phase: number;
  busyUntil: number;
}

class Layer {
  readonly mesh: THREE.InstancedMesh;
  private n = 0;
  /** `people`: the instance colour picks the person's palette (carried things keep their own colours). */
  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, cap: number, private people = true) {
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.count = 0;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  begin() { this.n = 0; }
  push(m: THREE.Matrix4, who = 0) {
    if (this.n >= this.mesh.instanceMatrix.count) return;
    this.mesh.setMatrixAt(this.n, m);
    if (this.people) this.mesh.setColorAt(this.n, new THREE.Color((who + 0.5) / PEOPLE, 0, 0));
    this.n++;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.visible = this.n > 0;
  }
}

const M = () => new THREE.Matrix4();
const root = M(), body = M(), tmp = M(), out = M(), rot = M();

/** A walkable tile: open farm land with nothing standing on it (fields are walkable but costly). */
type Grid = Uint8Array; // 0 blocked, 1 grass, 2 path, 3 field

export class Helpers {
  readonly group = new THREE.Group();
  private torso = new Layer(torso(), bodyMat, PEOPLE);
  private heads = [new Layer(head(), bodyMat, PEOPLE)];
  private arms = new Layer(arm(), bodyMat, PEOPLE * 2);
  private legs = new Layer(leg(), bodyMat, PEOPLE * 2);
  private items = new Map<Item, Layer>();
  private shadows: THREE.InstancedMesh;
  private hands: Hand[] = [];
  private grid: Grid = new Uint8Array(W * H);
  private farm: Farm | null = null;
  private t = 0;

  constructor() {
    for (const l of [this.torso, ...this.heads, this.arms, this.legs]) this.group.add(l.mesh);
    for (const k of Object.keys(ITEMS) as Item[]) { const l = new Layer(ITEMS[k](), itemMat, PEOPLE, false); this.items.set(k, l); this.group.add(l.mesh); }
    const blob = new THREE.CircleGeometry(0.16, 14).rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(blob, new THREE.MeshBasicMaterial({ color: 0x1d2a12, transparent: true, opacity: 0.2, depthWrite: false }), PEOPLE);
    this.shadows.frustumCulled = false;
    this.shadows.count = 0;
    this.shadows.renderOrder = 2;
    this.group.add(this.shadows);
  }

  /** The farm changed: walkable ground, and how many farmhands there are. */
  setFarm(farm: Farm) {
    this.farm = farm;
    const g = new Uint8Array(W * H);
    const open = new Set(farm.unlocked);
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const t = tileAt(x, z);
      const a = t.zone;
      g[z * W + x] = !t.water && open.has(a as never) ? 1 : 0;
    }
    for (let i = 0; i < farm.paths.length; i++) if (farm.paths.charCodeAt(i) - 48 > 0 && g[i]) g[i] = 2;
    for (const o of farm.objects) {
      const s = sizeOf(o);
      const w = o.rot % 2 ? s.d : s.w, d = o.rot % 2 ? s.w : s.d;
      const v = o.kind === 'field' ? 3 : 0;
      for (let z = o.z; z < o.z + d; z++) for (let x = o.x; x < o.x + w; x++) if (x >= 0 && z >= 0 && x < W && z < H) g[z * W + x] = v;
    }
    this.grid = g;
    const homes = farm.objects.filter(o => !!animalForHome(o.def) && o.def !== 'kennel').length;
    const want = Math.min(PEOPLE, Math.max(farm.helpers.length, 2 + (homes >= 2 ? 1 : 0) + (homes >= 4 ? 1 : 0)));
    const door = this.cottageDoor(farm);
    while (this.hands.length < want) {
      const i = this.hands.length;
      const [x, z] = door ?? [40, 42];
      this.hands.push({ who: i, simKey: '', x: x + 0.3 * i, z: z + 0.4, facing: 0, steps: [], path: [], act: 'idle', timer: 1 + i, item: null, phase: i, busyUntil: 0 });
    }
    this.hands.length = want;
    // drop paths that now cross something new
    for (const h of this.hands) if (h.path.some(([x, z]) => !this.walkable(Math.floor(x), Math.floor(z)))) { h.path = []; h.steps = []; }
  }

  private walkable(x: number, z: number) { return x >= 0 && z >= 0 && x < W && z < H && this.grid[z * W + x]! > 0; }

  private cottageDoor(farm: Farm): [number, number] | null {
    const c = farm.objects.find(o => o.def === 'cottage');
    return c ? this.front(c) : null;
  }

  /** The middle of the tile in front of a thing (its door or gate), or the nearest walkable one. */
  private front(o: Obj): [number, number] {
    const s = sizeOf(o);
    const w = o.rot % 2 ? s.d : s.w, d = o.rot % 2 ? s.w : s.d;
    const dir = [[0, 1], [-1, 0], [0, -1], [1, 0]][o.rot]!;
    const cx = o.x + w / 2, cz = o.z + d / 2;
    const fx = Math.floor(cx + dir[0]! * (w / 2 + 0.5)), fz = Math.floor(cz + dir[1]! * (d / 2 + 0.5));
    return this.nearestWalkable(fx, fz) ?? [cx, cz];
  }

  private nearestWalkable(x: number, z: number): [number, number] | null {
    for (let r = 0; r < 6; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      if (this.walkable(x + dx, z + dz) && this.grid[(z + dz) * W + x + dx] !== 3) return [x + dx + 0.5, z + dz + 0.5];
    }
    return null;
  }

  /** A* over the tiles (8 ways; fields cost more, paths less), then straightened where the way is clear. */
  private route(fx: number, fz: number, tx: number, tz: number): [number, number][] {
    const sx = Math.floor(fx), sz = Math.floor(fz), gx = Math.floor(tx), gz = Math.floor(tz);
    if (sx === gx && sz === gz) return [[tx, tz]];
    const N = W * H, cost = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1);
    const open: number[] = [];
    const hfn = (i: number) => Math.hypot((i % W) - gx, Math.floor(i / W) - gz);
    const start = sz * W + sx, goal = gz * W + gx;
    cost[start] = 0; open.push(start);
    const fscore = new Float32Array(N).fill(Infinity); fscore[start] = hfn(start);
    let found = false;
    for (let guard = 0; open.length && guard < 6000; guard++) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (fscore[open[i]!]! < fscore[open[bi]!]!) bi = i;
      const c = open.splice(bi, 1)[0]!;
      if (c === goal) { found = true; break; }
      const cx = c % W, cz = Math.floor(c / W);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz;
        if (!this.walkable(nx, nz) && !(nx === gx && nz === gz)) continue;
        if (dx && dz && (!this.walkable(cx + dx, cz) || !this.walkable(cx, cz + dz))) continue;
        const n = nz * W + nx, kind = this.grid[n]!;
        const step = (dx && dz ? 1.414 : 1) * (kind === 3 ? 4 : kind === 2 ? 0.7 : 1);
        const nc = cost[c]! + step;
        if (nc < cost[n]!) { cost[n] = nc; from[n] = c; fscore[n] = nc + hfn(n); if (!open.includes(n)) open.push(n); }
      }
    }
    if (!found) return [[tx, tz]];
    const tiles: [number, number][] = [];
    for (let c = goal; c !== start && c >= 0; c = from[c]!) tiles.unshift([(c % W) + 0.5, Math.floor(c / W) + 0.5]);
    tiles[tiles.length - 1] = [tx, tz];
    // straighten: skip corners where the straight line stays on clear ground
    const out: [number, number][] = [];
    let ax = fx, az = fz;
    for (let i = 0; i < tiles.length; i++) {
      const next = tiles[i + 1];
      if (next && this.clear(ax, az, next[0], next[1])) continue;
      out.push(tiles[i]!);
      [ax, az] = tiles[i]!;
    }
    return out;
  }

  private clear(x0: number, z0: number, x1: number, z1: number) {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25);
    for (let i = 1; i < n; i++) {
      const x = Math.floor(x0 + ((x1 - x0) * i) / n), z = Math.floor(z0 + ((z1 - z0) * i) / n);
      if (!this.walkable(x, z) || this.grid[z * W + x] === 3) return false;
    }
    return true;
  }

  /** Something to do next: chores around the farm, picked by a gentle roll. */
  private plan(h: Hand) {
    const farm = this.farm;
    if (!farm) return;
    const r = (k: number) => Math.abs(Math.sin(this.t * 12.9898 + h.who * 78.233 + k * 37.719)) % 1;
    const objs = farm.objects;
    const fields = objs.filter(o => o.kind === 'field');
    const homes = objs.filter(o => { const a = animalForHome(o.def); return !!a && a.id !== 'dog' && a.id !== 'bee'; });
    const cottage = objs.find(o => o.def === 'cottage');
    const dock = objs.find(o => o.def === 'dock');
    const bench = objs.find(o => o.kind === 'decor' && DECOR_BY_ID[o.def]?.id === 'bench');
    const roll = r(1);
    const near = (o: Obj): [number, number] => {
      const s = sizeOf(o);
      return this.nearestWalkable(o.x + Math.floor(r(2) * s.w), o.z + s.d) ?? [o.x + 0.5, o.z + s.d + 0.5];
    };
    if (fields.length && roll < 0.3) {
      const f = fields[Math.floor(r(3) * fields.length)]!;
      const at = near(f);
      h.steps = [{ to: at, item: 'rake' }, { act: 'rake', dur: 4 + r(4) * 3, face: [f.x + 0.5, f.z + 0.5], item: 'rake' }, { item: null }];
    } else if (homes.length && roll < 0.55 && cottage) {
      const home = homes[Math.floor(r(5) * homes.length)]!;
      const gate = this.front(home);
      const butt = this.front(cottage);
      h.steps = [{ to: [butt[0] + 0.6, butt[1] - 0.2], item: null }, { act: 'lift', dur: 0.9, item: 'bucket' }, { to: gate, item: 'bucket' }, { act: 'pour', dur: 2.2, face: [home.x + sizeOf(home).w / 2, home.z + 0.8], item: 'bucket' }, { item: null }];
    } else if (homes.length && roll < 0.72) {
      const home = homes[Math.floor(r(6) * homes.length)]!;
      const gate = this.front(home);
      h.steps = [{ to: gate, item: 'brush' }, { act: 'brush', dur: 4 + r(7) * 2, face: [home.x + sizeOf(home).w / 2, home.z + 1], item: 'brush' }, { item: null }];
    } else if (dock && cottage && roll < 0.86) {
      const from = this.front(cottage), to = this.front(dock);
      h.steps = [{ to: from, item: null }, { act: 'lift', dur: 0.8, item: 'crate' }, { to, item: 'crate' }, { act: 'lift', dur: 0.8, item: null }];
    } else {
      const spot = bench ? this.nearestWalkable(bench.x, bench.z + 1) : cottage ? this.front(cottage) : null;
      if (spot) h.steps = [{ to: [spot[0] + (r(8) - 0.5) * 0.8, spot[1] + (r(9) - 0.5) * 0.6], item: null }, { act: 'look', dur: 3 + r(10) * 3 }];
      else h.steps = [{ act: 'look', dur: 3 }];
    }
  }

  /** A hired helper's figure: act out their current sim task (or rest by the cottage). */
  private follow(h: Hand, sim: SimHelper) {
    const t = sim.job === 'rest' ? null : sim.task;
    const key = t ? `${t.action.type}:${t.x},${t.z}` : 'rest';
    if (key === h.simKey) return;
    h.simKey = key;
    h.path = []; h.timer = 0; h.act = 'idle';
    const farm = this.farm;
    if (!t || !farm) {
      const c = farm?.objects.find(o => o.def === 'cottage');
      const spot = c ? this.front(c) : null;
      h.steps = spot ? [{ to: [spot[0] + (h.who % 3 - 1) * 0.5, spot[1] + 0.3], item: null }, { act: 'look', dur: 600 }] : [{ act: 'look', dur: 600 }];
      return;
    }
    const target = objAtTile(farm, t.x, t.z);
    const at = (target ? this.front(target) : null) ?? this.nearestWalkable(t.x, t.z + 1) ?? [t.x + 0.5, t.z + 1.5];
    const face: [number, number] = [t.x + 0.5, t.z + 0.5];
    const long = 600; // until the sim moves them on
    switch (t.action.type) {
      case 'water': h.steps = [{ to: at, item: 'can' }, { act: 'pour', dur: long, face, item: 'can' }]; break;
      case 'harvest': case 'pickTree': case 'collect': h.steps = [{ to: at, item: 'basket' }, { act: 'pick', dur: long, face, item: 'basket' }]; break;
      case 'feed': h.steps = [{ to: at, item: 'bucket' }, { act: 'pour', dur: long, face, item: 'bucket' }]; break;
      case 'brush': h.steps = [{ to: at, item: 'brush' }, { act: 'brush', dur: long, face, item: 'brush' }]; break;
      default: h.steps = [{ to: at, item: 'crate' }, { act: 'lift', dur: long, face, item: 'crate' }]; break;
    }
  }

  /** Come and help with something the player just did at a tile. */
  react(kind: 'harvest' | 'water' | 'plant', x: number, z: number, now: number) {
    if (!this.hands.length) return;
    // volunteers without a job (or resting helpers) come over; working helpers keep at their job
    const sims = this.farm?.helpers ?? [];
    const idle = this.hands.filter(h => !sims[h.who] || sims[h.who]!.job === 'rest');
    if (!idle.length) return;
    const free = idle.filter(h => h.item !== 'crate' && h.item !== 'bucket');
    const pool = free.length ? free : idle;
    const h = pool.reduce((a, b) => (Math.hypot(a.x - x, a.z - z) < Math.hypot(b.x - x, b.z - z) ? a : b));
    if (now < h.busyUntil) return;
    h.busyUntil = now + 4;
    const at = this.nearestWalkable(x, z + 1) ?? this.nearestWalkable(x, z);
    if (!at) return;
    const face: [number, number] = [x + 0.5, z + 0.5];
    const dock = this.farm?.objects.find(o => o.def === 'dock');
    if (kind === 'harvest') {
      h.steps = [{ to: at, item: 'basket' }, { act: 'pick', dur: 2.6, face, item: 'basket' }];
      if (dock) h.steps.push({ act: 'lift', dur: 0.6, item: 'crate' }, { to: this.front(dock), item: 'crate' }, { act: 'lift', dur: 0.7, item: null });
    } else if (kind === 'water') h.steps = [{ to: at, item: 'can' }, { act: 'pour', dur: 2, face, item: 'can' }, { item: null }];
    else h.steps = [{ to: at, item: null }, { act: 'pick', dur: 2, face }];
    h.path = []; h.timer = 0; h.act = 'idle';
  }

  update(dt: number, reduced: boolean) {
    this.t += dt;
    const sims = this.farm?.helpers ?? [];
    // someone new was welcomed: they join the figures on the farm
    if (this.farm && sims.length > this.hands.length) this.setFarm(this.farm);
    for (const h of this.hands) {
      const sim = sims[h.who];
      if (sim && sim.job !== 'rest') this.follow(h, sim);
      else if (h.simKey && h.simKey !== 'rest') { h.simKey = ''; h.steps = []; h.timer = 0; h.path = []; h.item = null; }
      this.step(h, dt);
    }
    this.draw(reduced);
  }

  private step(h: Hand, dt: number) {
    if (h.path.length) {
      const [tx, tz] = h.path[0]!;
      const dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz);
      const speed = h.item === 'crate' || h.item === 'bucket' ? 0.95 : 1.15;
      if (d < 0.05) { h.path.shift(); return; }
      const s = Math.min(d, speed * dt);
      h.x += (dx / d) * s; h.z += (dz / d) * s;
      const want = Math.atan2(dx, dz);
      let dy = want - h.facing; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      h.facing += dy * Math.min(1, dt * 10);
      h.phase += dt * speed * 9;
      h.act = 'idle';
      return;
    }
    if (h.timer > 0) { h.timer -= dt; return; }
    const next = h.steps.shift();
    if (!next) { h.act = 'idle'; this.plan(h); if (!h.steps.length) h.timer = 2; return; }
    if (next.item !== undefined) h.item = next.item;
    if (next.to) { h.path = this.route(h.x, h.z, next.to[0], next.to[1]); }
    if (next.face) h.facing = Math.atan2(next.face[0] - h.x, next.face[1] - h.z);
    if (next.act) { h.act = next.act; h.timer = next.dur ?? 1; }
  }

  private draw(reduced: boolean) {
    this.torso.begin(); this.heads.forEach(l => l.begin()); this.arms.begin(); this.legs.begin();
    for (const l of this.items.values()) l.begin();
    this.shadows.count = 0;
    const t = this.t;
    for (const h of this.hands) {
      const walking = h.path.length > 0;
      const swing = walking ? Math.sin(h.phase) : 0;
      const y = groundY(h.x, h.z);
      const bob = walking ? Math.abs(Math.cos(h.phase)) * 0.018 : Math.sin(t * 2 + h.who) * 0.004;
      let lean = 0, headYaw = 0, headPitch = 0;
      let aL = { p: -swing * 0.55, r: 0.08 }, aR = { p: swing * 0.55, r: -0.08 };
      let legL = swing * 0.5, legR = -swing * 0.5, crouch = 0;
      const k = reduced ? 0 : 1;
      switch (h.act) {
        case 'rake': lean = 0.2; aL = { p: -0.9 + Math.sin(t * 3) * 0.3 * k, r: 0.25 }; aR = { p: -0.7 + Math.sin(t * 3) * 0.3 * k, r: -0.25 }; break;
        case 'brush': lean = 0.12; aR = { p: -1.25, r: -0.2 + Math.sin(t * 6) * 0.35 * k }; break;
        case 'pour': aR = { p: -1.15, r: -0.1 }; lean = 0.08; break;
        case 'pick': lean = 0.55 + Math.sin(t * 2.5) * 0.08 * k; crouch = 0.05; aL = { p: -0.5 + Math.sin(t * 4) * 0.35 * k, r: 0.15 }; aR = { p: -0.5 - Math.sin(t * 4) * 0.35 * k, r: -0.15 }; legL = -0.3; legR = 0.25; break;
        case 'lift': lean = 0.35; aL = { p: -0.7, r: 0.3 }; aR = { p: -0.7, r: -0.3 }; crouch = 0.03; break;
        case 'look': headYaw = Math.sin(t * 0.7 + h.who) * 0.7 * k; headPitch = -0.05; break;
        default: break;
      }
      if (h.item === 'crate') { aL = { p: -1.0, r: 0.35 }; aR = { p: -1.0, r: -0.35 }; }
      if (h.item === 'bucket' && walking) aR = { p: 0.05, r: -0.12 };
      if (h.item === 'rake' && walking) aR = { p: -0.5, r: -0.1 };
      // root: on the ground, facing; the body rises from the hips
      root.makeRotationY(h.facing).setPosition(h.x, y, h.z);
      body.copy(root).multiply(tmp.makeTranslation(0, 0.2 + bob - crouch, 0)).multiply(rot.makeRotationX(lean));
      this.torso.push(body, h.who);
      out.copy(body).multiply(tmp.makeTranslation(0, 0.25, 0.005)).multiply(rot.makeRotationFromEuler(new THREE.Euler(headPitch, headYaw, 0, 'YXZ')));
      this.heads[0]!.push(out, h.who);
      let handR: THREE.Matrix4 | null = null;
      for (const [side, a] of [[-1, aL], [1, aR]] as const) {
        out.copy(body).multiply(tmp.makeTranslation(side * 0.128, 0.215, 0)).multiply(rot.makeRotationFromEuler(new THREE.Euler(a.p, 0, a.r * side, 'XYZ')));
        this.arms.push(out, h.who);
        if (side === 1) handR = out.clone().multiply(tmp.makeTranslation(0, -0.21, 0));
      }
      for (const [side, a] of [[-1, legL], [1, legR]] as const) {
        out.copy(root).multiply(tmp.makeTranslation(side * 0.055, 0.2 + bob - crouch, 0)).multiply(rot.makeRotationX(a));
        this.legs.push(out, h.who);
      }
      if (h.item && handR) {
        if (h.item === 'crate') {
          // held in front with both hands
          out.copy(body).multiply(tmp.makeTranslation(0.1, 0.08, 0.2));
          this.items.get('crate')!.push(out, h.who);
        } else if (h.item === 'rake' || h.item === 'brush' || h.item === 'can' || h.item === 'bucket' || h.item === 'basket') {
          const level = h.item === 'bucket' || h.item === 'basket' ? rot.makeRotationFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(root)) : null;
          if (level) {
            // hanging things stay upright under the hand
            const p = new THREE.Vector3().setFromMatrixPosition(handR);
            out.copy(level).setPosition(p);
            if (h.act === 'pour') out.multiply(tmp.makeRotationX(0.9));
          } else out.copy(handR);
          this.items.get(h.item)!.push(out, h.who);
        }
      }
      tmp.makeTranslation(h.x, y + 0.012, h.z);
      this.shadows.setMatrixAt(this.shadows.count++, tmp);
    }
    this.torso.end(); this.heads.forEach(l => l.end()); this.arms.end(); this.legs.end();
    for (const l of this.items.values()) l.end();
    this.shadows.instanceMatrix.needsUpdate = true;
  }
}
