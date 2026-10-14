/**
 * Street life for the style frame: cars, vans and the bus driving on the right through the town's
 * roads, and citizens walking the sidewalks round each block and the park's path. It is only a
 * picture (the real game drives it from the traffic and citizen sims): seeded, so a capture replays
 * the same way, and it never changes the town.
 *
 * Cars follow lanes a third of a tile from the road's middle and turn on smooth curves (a quadratic
 * through the corner of the two lanes). They keep their distance from the car ahead, wait before a
 * junction someone else is crossing, and stop at the bus stop if they are the bus. Cars that drive
 * out of town come back on another road into town.
 */
import * as THREE from 'three';
import { Rng } from '../core/rng';
import { FINISH, type City } from '../sim/city';
import { H, inMap, W } from '../sim/map';
import { roadAnywhere } from './ground';
import { InstancedLayer } from './instanced';
import { Materials } from './materials';
import { bus, car, hatchback, van } from './models/vehicles';
import { LOOKS } from './models/people';
import type { Walker } from './walkers';

const DIRS: readonly [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W
const LANE = 0.17;
type VehicleKind = 'car' | 'hatch' | 'van' | 'bus';
const LENGTH: Record<VehicleKind, number> = { car: 0.54, hatch: 0.5, van: 0.64, bus: 1.28 };
const CAR_COLORS = [0xe25c4a, 0x3f8fd0, 0xffc23d, 0x5fbf7a, 0xf6f0e2, 0x8a6ad0, 0x2fa3b0, 0xff8a5a, 0x4a5a6a, 0xf29ab0];

interface Vehicle {
  kind: VehicleKind;
  color: number;
  /** The tile it is crossing, the way it came in and the way it leaves. */
  x: number;
  z: number;
  din: number;
  dout: number;
  s: number;
  v: number;
  cruise: number;
  wait: number;
  /** Seconds left standing at the bus stop. */
  dwell: number;
  stopped: boolean;
  pos: THREE.Vector3;
  heading: number;
}

interface Loop { pts: [number, number][]; len: number; cum: number[] }
interface Ped { loop: number; u: number; dir: 1 | -1; speed: number; side: number; look: [number, number, number, number]; phase: number; pause: number; still: boolean; heading?: number; at?: [number, number] }

const right = (d: number): [number, number] => { const [dx, dz] = DIRS[d]!; return [-dz, dx]; };

export class StreetLife {
  readonly group = new THREE.Group();
  private rng: Rng;
  private vehicles: Vehicle[] = [];
  private peds: Ped[] = [];
  private loops: Loop[] = [];
  private layers: Record<VehicleKind, InstancedLayer>;
  private blobs: THREE.InstancedMesh;
  private busStops = new Set<string>();
  private t = 0;
  private entries: { x: number; z: number; d: number }[] = [];
  /** Junctions a car has claimed for its crossing (key "x,z"): others wait until it has left. */
  private claims = new Map<string, Vehicle>();

  constructor(private city: City, seed: number, counts: { cars: number; buses: number; walkers: number }, extraLoops: [number, number][][] = []) {
    this.rng = new Rng(seed);
    this.group.name = 'street life';
    this.layers = {
      car: new InstancedLayer(car(), Materials.flatTintInst, 32, { shadow: false }),
      hatch: new InstancedLayer(hatchback(), Materials.flatTintInst, 32, { shadow: false }),
      van: new InstancedLayer(van(), Materials.flatTintInst, 16, { shadow: false }),
      bus: new InstancedLayer(bus(), Materials.flatTintInst, 4, { shadow: false }),
    };
    for (const l of Object.values(this.layers)) this.group.add(l.mesh);
    // soft round shadows under everything that moves (the shadow map stays still, so it can be reused)
    const disc = new THREE.CircleGeometry(0.5, 14).rotateX(-Math.PI / 2);
    this.blobs = new THREE.InstancedMesh(disc, Materials.blob, 512);
    this.blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.blobs.frustumCulled = false;
    this.blobs.count = 0;
    this.blobs.renderOrder = 2;
    this.group.add(this.blobs);
    for (const t of city.things) if (t.def === 'busstop') this.busStops.add(`${Math.round(t.x)},${Math.round(t.z)}`);
    this.findEntries();
    this.buildLoops(extraLoops);
    for (let i = 0; i < counts.buses; i++) this.spawnVehicle('bus', true);
    for (let i = 0; i < counts.cars; i++) this.spawnVehicle(this.rng.pick(['car', 'car', 'hatch', 'van'] as const), true);
    for (let i = 0; i < counts.walkers; i++) this.spawnPed();
  }

  // --- roads ---
  private road(x: number, z: number) { return roadAnywhere(this.city, x, z); }
  private links(x: number, z: number): number[] {
    const out: number[] = [];
    for (let d = 0; d < 4; d++) if (this.road(x + DIRS[d]![0], z + DIRS[d]![1])) out.push(d);
    return out;
  }

  /** Roads into town from its edges: where cars come back in. */
  private findEntries() {
    for (let z = 0; z < H; z++) {
      if (this.road(-1, z) && this.road(0, z)) this.entries.push({ x: -1, z, d: 1 });
      if (this.road(W, z) && this.road(W - 1, z)) this.entries.push({ x: W, z, d: 3 });
    }
    for (let x = 0; x < W; x++) if (this.road(x, H) && this.road(x, H - 1)) this.entries.push({ x, z: H, d: 0 });
  }

  private pickExit(x: number, z: number, din: number, kind: VehicleKind): number {
    const ways = this.links(x, z).filter(d => d !== (din + 2) % 4);
    if (!ways.length) return (din + 2) % 4;
    // mostly straight on; the bus keeps to the town's middle
    if (ways.includes(din) && this.rng.chance(kind === 'bus' ? 0.5 : 0.55)) return din;
    return this.rng.pick(ways);
  }

  private spawnVehicle(kind: VehicleKind, anywhere: boolean) {
    const rng = this.rng;
    let x = 0, z = 0, din = 0;
    if (anywhere) {
      // a random road tile in town, heading along it
      for (let tries = 0; tries < 400; tries++) {
        x = rng.int(0, W - 1); z = rng.int(0, H - 1);
        if (!inMap(x, z) || !this.road(x, z)) continue;
        const L = this.links(x, z);
        if (L.length !== 2 || (L[0]! + 2) % 4 !== L[1]) continue;
        din = rng.pick(L);
        if (this.vehicles.some(o => Math.abs(o.x - x) + Math.abs(o.z - z) < 2)) continue;
        break;
      }
    } else {
      const e = rng.pick(this.entries);
      x = e.x; z = e.z; din = e.d;
    }
    const v: Vehicle = {
      kind, color: kind === 'bus' ? 0x2fa3b0 : rng.pick(CAR_COLORS), x, z, din, dout: din, s: anywhere ? rng.float() * 0.8 : 0,
      v: 0, cruise: kind === 'bus' ? 0.85 : 1.05 + rng.float() * 0.3, wait: 0, dwell: 0, stopped: false, pos: new THREE.Vector3(), heading: 0,
    };
    v.dout = this.pickExit(x, z, din, kind);
    this.place(v);
    this.vehicles.push(v);
  }

  /** The car's path across its tile: entry, corner, exit (world x, z). */
  private path(v: Vehicle) {
    const cx = v.x + 0.5, cz = v.z + 0.5;
    const [ix, iz] = DIRS[v.din]!, [ox, oz] = DIRS[v.dout]!;
    const [irx, irz] = right(v.din), [orx, orz] = right(v.dout);
    const p0x = cx - ix * 0.5 + irx * LANE, p0z = cz - iz * 0.5 + irz * LANE;
    const p1x = cx + ox * 0.5 + orx * LANE, p1z = cz + oz * 0.5 + orz * LANE;
    let kx: number, kz: number;
    if (v.din === v.dout) { kx = (p0x + p1x) / 2; kz = (p0z + p1z) / 2; }
    else if (v.din === (v.dout + 2) % 4) { kx = cx + ix * 0.45; kz = cz + iz * 0.45; }
    else { const t = (p1x - p0x) * ix + (p1z - p0z) * iz; kx = p0x + ix * t; kz = p0z + iz * t; }
    return { p0x, p0z, kx, kz, p1x, p1z, len: Math.hypot(kx - p0x, kz - p0z) + Math.hypot(p1x - kx, p1z - kz) };
  }

  private place(v: Vehicle) {
    const p = this.path(v), s = v.s, a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, c = s * s;
    v.pos.set(a * p.p0x + b * p.kx + c * p.p1x, 0, a * p.p0z + b * p.kz + c * p.p1z);
    const dx = 2 * (1 - s) * (p.kx - p.p0x) + 2 * s * (p.p1x - p.kx), dz = 2 * (1 - s) * (p.kz - p.p0z) + 2 * s * (p.p1z - p.kz);
    if (Math.hypot(dx, dz) > 1e-5) v.heading = Math.atan2(dx, dz);
  }

  private blocked(v: Vehicle): boolean {
    const hx = Math.sin(v.heading), hz = Math.cos(v.heading);
    for (const o of this.vehicles) {
      if (o === v) continue;
      const dx = o.pos.x - v.pos.x, dz = o.pos.z - v.pos.z;
      const ahead = dx * hx + dz * hz, side = Math.abs(-dx * hz + dz * hx);
      if (ahead > 0 && ahead < (LENGTH[v.kind] + LENGTH[o.kind]) / 2 + 0.16 && side < 0.22) return true;
    }
    // about to enter a junction: claim it, or wait while another car crosses it
    if (v.s > 0.8) {
      const nx = v.x + DIRS[v.dout]![0], nz = v.z + DIRS[v.dout]![1];
      if (this.links(nx, nz).length >= 3) {
        const key = `${nx},${nz}`, owner = this.claims.get(key);
        if (owner && owner !== v) return true;
        this.claims.set(key, v);
      }
    }
    return false;
  }

  // --- sidewalks ---
  /** A loop round every block, on the middle of its sidewalk; and the extra loops (park paths). */
  private buildLoops(extra: [number, number][][]) {
    const seen = new Uint8Array(W * H);
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      if (seen[z * W + x] || this.city.roads[z * W + x] || this.city.finish[z * W + x] === FINISH.sand) continue;
      // flood the block and take its box
      let x0 = x, x1 = x, z0 = z, z1 = z;
      const stack = [[x, z]];
      seen[z * W + x] = 1;
      let land = 0;
      while (stack.length) {
        const [a, b] = stack.pop()!;
        land++;
        x0 = Math.min(x0, a!); x1 = Math.max(x1, a!); z0 = Math.min(z0, b!); z1 = Math.max(z1, b!);
        for (const [dx, dz] of DIRS) {
          const nx = a! + dx, nz = b! + dz;
          if (!inMap(nx, nz) || seen[nz * W + nx] || this.city.roads[nz * W + nx]) continue;
          seen[nz * W + nx] = 1;
          stack.push([nx, nz]);
        }
      }
      // only blocks with roads all round get a sidewalk loop
      const roadAll = this.road(x0 - 1, z0) && this.road(x1 + 1, z0) && this.road(x0, z0 - 1) && this.road(x0, z1 + 1);
      if (!roadAll || land < 4) continue;
      const o = 0.075;
      this.addLoop([[x0 - o, z0 - o], [x1 + 1 + o, z0 - o], [x1 + 1 + o, z1 + 1 + o], [x0 - o, z1 + 1 + o]]);
    }
    for (const pts of extra) this.addLoop(pts);
  }

  private addLoop(pts: [number, number][]) {
    const cum = [0];
    let len = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
      len += Math.hypot(b[0] - a[0], b[1] - a[1]);
      cum.push(len);
    }
    this.loops.push({ pts, len, cum });
  }

  private at(loop: Loop, u: number): [number, number, number] {
    u = ((u % loop.len) + loop.len) % loop.len;
    let i = 0;
    while (i < loop.pts.length - 1 && loop.cum[i + 1]! < u) i++;
    const a = loop.pts[i]!, b = loop.pts[(i + 1) % loop.pts.length]!;
    const seg = loop.cum[i + 1]! - loop.cum[i]!, t = seg > 0 ? (u - loop.cum[i]!) / seg : 0;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], b[1] - a[1])];
  }

  private spawnPed() {
    const rng = this.rng;
    if (!this.loops.length) return;
    const loop = rng.int(0, this.loops.length - 1);
    this.peds.push({
      loop, u: rng.float() * this.loops[loop]!.len, dir: rng.chance(0.5) ? 1 : -1, speed: 0.3 + rng.float() * 0.18,
      side: (rng.float() - 0.5) * 0.06, look: [rng.int(0, LOOKS.shirt.length - 1), rng.int(0, LOOKS.pants.length - 1), rng.int(0, LOOKS.hair.length - 1), rng.int(0, LOOKS.skin.length - 1)],
      phase: rng.float() * 6.28, pause: 0, still: false,
    });
  }

  /** Citizens standing still somewhere (chatting, waiting at the bus stop, looking at the fountain). */
  addStanding(x: number, z: number, heading: number) {
    const rng = this.rng;
    this.peds.push({ loop: -1, u: 0, dir: 1, speed: 0, side: 0, look: [rng.int(0, LOOKS.shirt.length - 1), rng.int(0, LOOKS.pants.length - 1), rng.int(0, LOOKS.hair.length - 1), rng.int(0, LOOKS.skin.length - 1)], phase: 0, pause: 0, still: true, heading, at: [x, z] });
  }

  // --- each frame ---
  update(dt: number) {
    this.t += dt;
    for (const v of this.vehicles) {
      if (v.dwell > 0) { v.dwell -= dt; v.v = 0; continue; }
      const stop = this.blocked(v);
      v.wait = stop ? v.wait + dt : 0;
      const target = stop && v.wait < 5 ? 0 : v.din !== v.dout ? v.cruise * 0.7 : v.cruise;
      v.v += (target - v.v) * Math.min(1, dt * (target < v.v ? 6 : 2.2));
      const p = this.path(v);
      v.s += (v.v * dt) / Math.max(0.3, p.len);
      // the bus stops beside its shelter
      if (v.kind === 'bus' && !v.stopped && v.s > 0.5 && this.nearStop(v.x, v.z)) { v.stopped = true; v.dwell = 3.5; }
      while (v.s >= 1) {
        v.s -= 1;
        // leaving a junction frees it for the next car
        const here = `${v.x},${v.z}`;
        if (this.claims.get(here) === v) this.claims.delete(here);
        v.x += DIRS[v.dout]![0];
        v.z += DIRS[v.dout]![1];
        v.din = v.dout;
        v.stopped = false;
        if (v.x < -2 || v.z < -2 || v.x > W + 1 || v.z > H + 1 || !this.road(v.x, v.z)) {
          // drove out of town: come back in on another road, where the way in is clear
          const free = this.entries.filter(e => !this.vehicles.some(o => o !== v && Math.abs(o.x - e.x) + Math.abs(o.z - e.z) <= 1));
          const e = this.rng.pick(free.length ? free : this.entries);
          Object.assign(v, { x: e.x, z: e.z, din: e.d, s: 0, v: v.cruise * 0.6 });
        }
        v.dout = this.pickExit(v.x, v.z, v.din, v.kind);
      }
      this.place(v);
    }
    for (const p of this.peds) {
      if (p.still) continue;
      if (p.pause > 0) { p.pause -= dt; continue; }
      p.u += p.dir * p.speed * dt;
      // now and then someone stops to look at something
      if (this.rng.chance(dt * 0.02)) p.pause = 1.5 + this.rng.float() * 3;
    }
  }

  private nearStop(x: number, z: number) {
    for (const [dx, dz] of [[0, 0], ...DIRS]) if (this.busStops.has(`${x + dx!},${z + dz!}`)) return true;
    return false;
  }

  /** Fill the vehicle layers, the citizens and their shadows for this frame (only what the view can see). */
  draw(frustum: THREE.Frustum | null, walkersOut: Walker[]) {
    const sphere = new THREE.Sphere();
    const visible = (x: number, z: number, r: number) => { if (!frustum) return true; sphere.center.set(x, 0.2, z); sphere.radius = r; return frustum.intersectsSphere(sphere); };
    for (const l of Object.values(this.layers)) l.begin();
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3();
    let nb = 0;
    const blob = (x: number, z: number, heading: number, w: number, l: number) => {
      if (nb >= 512) return;
      q.setFromAxisAngle(up, heading);
      m.compose(new THREE.Vector3(x, 0.012, z), q, sc.set(w, 1, l));
      this.blobs.setMatrixAt(nb++, m);
    };
    for (const v of this.vehicles) {
      if (!visible(v.pos.x, v.pos.z, LENGTH[v.kind])) continue;
      this.layers[v.kind].push(v.pos.x, 0, v.pos.z, v.heading, 1, v.color);
      blob(v.pos.x, v.pos.z, v.heading, 0.38, LENGTH[v.kind] + 0.1);
    }
    for (const l of Object.values(this.layers)) l.end();
    walkersOut.length = 0;
    for (const p of this.peds) {
      let x: number, z: number, heading: number;
      if (p.still) { [x, z] = p.at!; heading = p.heading!; }
      else {
        const loop = this.loops[p.loop]!;
        const a = this.at(loop, p.u);
        heading = p.dir > 0 ? a[2] : a[2] + Math.PI;
        // walk on your own side of the sidewalk
        x = a[0] + Math.cos(heading) * p.side; z = a[1] - Math.sin(heading) * p.side;
      }
      if (!visible(x, z, 0.5)) continue;
      const moving = !p.still && p.pause <= 0;
      walkersOut.push({ x, y: 0, z, heading, phase: p.phase, rate: moving ? p.speed * 2.6 : 0, look: p.look });
      blob(x, z, heading, 0.16, 0.16);
    }
    this.blobs.count = nb;
    this.blobs.instanceMatrix.needsUpdate = true;
  }
}
