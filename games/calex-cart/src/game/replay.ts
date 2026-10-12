// Instant replay: every race is recorded in memory (never saved) — each kart's motion at 30 Hz, the items in flight
// and the event timeline — and can be watched again from the results screen with cinematic cameras.
// Playback re-drives the finished race's own scene (no second scene is built).
import * as THREE from 'three';
import type { World } from '../sim/world';
import type { ItemSystem } from '../sim/items/itemSystem';
import { ItemState } from '../sim/items/itemSystem';
import { ITEMS } from '../data/items';
import type { ItemId } from '../data/types';
import type { SimEvent } from '../sim/events';
import { RespawnState } from '../sim/kart';
import type { TrackModel } from '../sim/track/trackModel';
import { damp } from '../core/math';

export const REPLAY_HZ = 30;
/** Hard cap so a very long battle can't eat memory (7 minutes ≈ 1.6 MB for 8 karts). */
const MAX_FRAMES = REPLAY_HZ * 420;

const F_DRIFT = 1;
const F_DRIFT_LEFT = 2;
const F_GLIDE = 4;
const F_BOOST = 8;
const F_SPIN = 16;
const F_TUMBLE = 32;
const F_SHIELD = 64;
const F_GOO = 128;
const F_AIR = 256;
const F_FINISHED = 512;
const F_HIDDEN = 1024;
const F_ROCKET = 2048;

/** Event types worth replaying (bursts and sounds). */
const REPLAY_EVENTS = new Set<SimEvent['type']>(['miniTurbo', 'boostPad', 'itemHit', 'itemUse', 'explode', 'boxBreak', 'balloonPop', 'coinPickup', 'coinDrop', 'startBoost', 'land', 'trick', 'launch', 'finish', 'wall', 'respawn', 'shieldPop', 'blocked', 'dodge', 'driftTier', 'bump', 'hazard', 'shortcut']);

const ITEM_INDEX = new Map<ItemId, number>(ITEMS.map((it, i) => [it.id, i]));

export class ReplayRecorder {
  frames = 0;
  readonly n: number;
  private readonly pos: Float32Array; // x y z yaw per kart per frame
  private readonly flags: Uint16Array;
  private readonly tier: Uint8Array;
  private readonly rank: Uint8Array;
  private readonly speed: Uint8Array;
  /** Items: per frame [start, count] into `items` (type, state, x, y, z, yaw, age). */
  private readonly itemIndex: Uint32Array;
  private readonly items: number[] = [];
  readonly events: Array<{ t: number; e: SimEvent }> = [];
  private next = 0;
  private started = false;

  constructor(
    readonly world: World,
    readonly itemSystem: ItemSystem | null,
  ) {
    this.n = world.karts.length;
    this.pos = new Float32Array(MAX_FRAMES * this.n * 4);
    this.flags = new Uint16Array(MAX_FRAMES * this.n);
    this.tier = new Uint8Array(MAX_FRAMES * this.n);
    this.rank = new Uint8Array(MAX_FRAMES * this.n);
    this.speed = new Uint8Array(MAX_FRAMES * this.n);
    this.itemIndex = new Uint32Array(MAX_FRAMES * 2);
  }

  /** Call after every sim step. */
  step(): void {
    const w = this.world;
    if (w.phase !== 'race' && w.phase !== 'done') return;
    const t = w.raceTime;
    if (!this.started) {
      this.started = true;
      this.next = t;
    }
    if (t + 1e-6 < this.next || this.frames >= MAX_FRAMES) return;
    this.next += 1 / REPLAY_HZ;
    const f = this.frames++;
    for (let i = 0; i < this.n; i++) {
      const k = w.karts[i];
      const o = (f * this.n + i) * 4;
      this.pos[o] = k.x;
      this.pos[o + 1] = k.y;
      this.pos[o + 2] = k.z;
      this.pos[o + 3] = k.yaw;
      let fl = 0;
      if (k.drifting) fl |= F_DRIFT | (k.driftDir < 0 ? F_DRIFT_LEFT : 0);
      if (k.gliding) fl |= F_GLIDE;
      if (k.boosting) fl |= F_BOOST;
      if (k.rocketTime > 0) fl |= F_ROCKET;
      if (k.spinTime > 0) fl |= F_SPIN;
      if (k.tumbleTime > 0) fl |= F_TUMBLE;
      if (k.shieldTime > 0) fl |= F_SHIELD;
      if (k.gooTime > 0) fl |= F_GOO;
      if (!k.grounded) fl |= F_AIR;
      if (k.finished) fl |= F_FINISHED;
      if (k.respawnState !== RespawnState.None) fl |= F_HIDDEN;
      this.flags[f * this.n + i] = fl;
      this.tier[f * this.n + i] = k.drifting ? k.driftTier : 0;
      this.rank[f * this.n + i] = k.rank;
      this.speed[f * this.n + i] = Math.max(0, Math.min(255, Math.round(Math.abs(k.speed) * 4)));
    }
    this.itemIndex[f * 2] = this.items.length;
    let c = 0;
    if (this.itemSystem) {
      for (const e of this.itemSystem.entities) {
        if (!e.active) continue;
        this.items.push(ITEM_INDEX.get(e.type) ?? 0, e.state, e.x, e.y, e.z, e.yaw, e.age);
        c++;
      }
    }
    this.itemIndex[f * 2 + 1] = c;
  }

  event(e: SimEvent): void {
    if (!this.started || !REPLAY_EVENTS.has(e.type) || this.frames >= MAX_FRAMES) return;
    this.events.push({ t: this.world.raceTime, e: { ...e } as SimEvent });
  }

  get duration(): number {
    return Math.max(0, (this.frames - 1) / REPLAY_HZ);
  }

  /** Write the recorded state at time t into the world's karts and item entities (for display only). */
  apply(t: number, world: World, items: ItemSystem | null): void {
    if (this.frames < 2) return;
    const ft = Math.max(0, Math.min(this.frames - 1.001, t * REPLAY_HZ));
    const f0 = Math.floor(ft);
    const f1 = Math.min(this.frames - 1, f0 + 1);
    const a = ft - f0;
    const near = a < 0.5 ? f0 : f1;
    for (let i = 0; i < this.n; i++) {
      const k = world.karts[i];
      const o0 = (f0 * this.n + i) * 4;
      const o1 = (f1 * this.n + i) * 4;
      let dy = this.pos[o1 + 3] - this.pos[o0 + 3];
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      k.x = k.px = this.pos[o0] + (this.pos[o1] - this.pos[o0]) * a;
      k.y = k.py = this.pos[o0 + 1] + (this.pos[o1 + 1] - this.pos[o0 + 1]) * a;
      k.z = k.pz = this.pos[o0 + 2] + (this.pos[o1 + 2] - this.pos[o0 + 2]) * a;
      k.yaw = k.pyaw = this.pos[o0 + 3] + dy * a;
      const fl = this.flags[near * this.n + i];
      k.drifting = (fl & F_DRIFT) !== 0;
      k.driftDir = fl & F_DRIFT_LEFT ? -1 : 1;
      k.driftTier = this.tier[near * this.n + i];
      k.gliding = (fl & F_GLIDE) !== 0;
      k.boostTime = fl & F_BOOST ? 0.3 : 0;
      k.rocketTime = fl & F_ROCKET ? 0.3 : 0;
      k.spinTime = fl & F_SPIN ? 0.5 : 0;
      k.tumbleTime = fl & F_TUMBLE ? 0.5 : 0;
      k.shieldTime = fl & F_SHIELD ? 2 : 0;
      k.gooTime = fl & F_GOO ? 0.5 : 0;
      k.grounded = (fl & F_AIR) === 0;
      k.finished = (fl & F_FINISHED) !== 0;
      k.respawnState = fl & F_HIDDEN ? RespawnState.Carried : RespawnState.None;
      k.invulnTime = 0;
      k.rank = this.rank[near * this.n + i];
      k.speed = this.speed[near * this.n + i] / 4;
      // velocity for camera swing / effects
      const dt = 1 / REPLAY_HZ;
      k.vx = (this.pos[o1] - this.pos[o0]) / dt;
      k.vz = (this.pos[o1 + 2] - this.pos[o0 + 2]) / dt;
      k.input.steer = 0;
      k.input.lookBack = false;
    }
    if (items) {
      for (const e of items.entities) e.active = false;
      const start = this.itemIndex[near * 2];
      const count = this.itemIndex[near * 2 + 1];
      for (let j = 0; j < count && j < items.entities.length; j++) {
        const e = items.entities[j];
        const o = start + j * 7;
        e.active = true;
        e.type = ITEMS[this.items[o]].id;
        e.state = this.items[o + 1] as ItemState;
        e.x = this.items[o + 2];
        e.y = this.items[o + 3];
        e.z = this.items[o + 4];
        e.yaw = this.items[o + 5];
        e.age = this.items[o + 6];
        e.serial = j;
        e.radius = 1;
      }
    }
  }

  /** Index of the first event at or after time t. */
  eventIndexAt(t: number): number {
    let lo = 0;
    let hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid].t < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}

export type ReplayCamera = 'auto' | 'chase' | 'trackside' | 'overhead';
export const REPLAY_CAMERAS: ReplayCamera[] = ['auto', 'chase', 'trackside', 'overhead'];

/** Playback state + cinematic cameras for one replay. */
export class ReplayPlayer {
  t = 0;
  playing = true;
  speed = 1;
  follow: number;
  camera: ReplayCamera = 'auto';
  private autoMode: Exclude<ReplayCamera, 'auto'> = 'chase';
  private autoTimer = 0;
  private eventCursor = 0;
  private readonly spots: THREE.Vector3[] = [];
  private spot = -1;
  private readonly camPos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private camInit = false;

  constructor(
    readonly rec: ReplayRecorder,
    readonly track: TrackModel | null,
    follow: number,
  ) {
    this.follow = follow;
    if (track) {
      // trackside camera spots every ~65 m, alternating sides, a little above the road
      const rb = track.main;
      let side = 1;
      for (let s = 20; s < track.length; s += 65) {
        const i = rb.indexAtS(s);
        const off = rb.hw[i] + Math.max(rb.shL[i], rb.shR[i]) + 5;
        this.spots.push(new THREE.Vector3(rb.px[i] + rb.rx[i] * off * side, rb.py[i] + 3.5, rb.pz[i] + rb.rz[i] * off * side));
        side = -side;
      }
    }
  }

  get duration(): number {
    return this.rec.duration;
  }

  seek(t: number): void {
    this.t = Math.max(0, Math.min(this.duration, t));
    this.eventCursor = this.rec.eventIndexAt(this.t);
    this.spot = -1;
    this.camInit = false;
  }

  /** Advance time; returns the events crossed this frame (forward playback only). */
  advance(dt: number, out: SimEvent[]): void {
    out.length = 0;
    if (!this.playing) return;
    const next = Math.min(this.duration, this.t + dt * this.speed);
    while (this.eventCursor < this.rec.events.length && this.rec.events[this.eventCursor].t <= next) out.push(this.rec.events[this.eventCursor++].e);
    this.t = next;
    if (this.t >= this.duration) this.playing = false;
    if (this.camera === 'auto') {
      this.autoTimer -= dt;
      if (this.autoTimer <= 0) {
        this.autoTimer = 4.5;
        const order: Array<Exclude<ReplayCamera, 'auto'>> = this.spots.length ? ['chase', 'trackside', 'overhead', 'trackside'] : ['chase', 'overhead'];
        this.autoMode = order[(order.indexOf(this.autoMode) + 1) % order.length];
        this.spot = -1;
        this.camInit = false;
      }
    }
  }

  /** Mode actually in use (auto cycles through the others). */
  get activeCamera(): Exclude<ReplayCamera, 'auto'> {
    return this.camera === 'auto' ? this.autoMode : this.camera;
  }

  /** Place a camera for the non-chase modes. Returns false when the chase camera should be used. */
  placeCamera(cam: THREE.PerspectiveCamera, world: World, dt: number): boolean {
    const mode = this.activeCamera;
    if (mode === 'chase') return false;
    const k = world.karts[this.follow];
    this.look.set(k.x, k.y + 1, k.z);
    if (mode === 'trackside' && this.spots.length) {
      // a fixed camera ahead of the kart; switch to the next one once the kart passes it
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < this.spots.length; i++) {
        const sp = this.spots[i];
        const dx = sp.x - k.x;
        const dz = sp.z - k.z;
        const ahead = dx * Math.sin(k.yaw) + dz * Math.cos(k.yaw);
        const d = Math.hypot(dx, dz);
        if (ahead > -6 && d < 85 && d < bestD) {
          bestD = d;
          best = i;
        }
      }
      const cur = this.spot >= 0 ? this.spots[this.spot] : null;
      const curD = cur ? Math.hypot(cur.x - k.x, cur.z - k.z) : Infinity;
      const curAhead = cur ? (cur.x - k.x) * Math.sin(k.yaw) + (cur.z - k.z) * Math.cos(k.yaw) : -1;
      if (this.spot < 0 || curD > 70 || (curAhead < -14 && best >= 0)) this.spot = best;
      if (this.spot < 0) return false;
      this.camPos.copy(this.spots[this.spot]);
      cam.position.copy(this.camPos);
      cam.lookAt(this.look);
      return true;
    }
    // overhead: high and behind, smoothly following
    const tx = k.x - Math.sin(k.yaw) * 10;
    const tz = k.z - Math.cos(k.yaw) * 10;
    const ty = k.y + 22;
    if (!this.camInit) {
      this.camPos.set(tx, ty, tz);
      this.camInit = true;
    }
    this.camPos.set(damp(this.camPos.x, tx, 3, dt), damp(this.camPos.y, ty, 3, dt), damp(this.camPos.z, tz, 3, dt));
    cam.position.copy(this.camPos);
    cam.lookAt(this.look);
    return true;
  }
}
