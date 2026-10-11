import type { ItemId } from '../../data/types';
import { ITEM_BY_ID, type ItemSet } from '../../data/items';
import { clamp, wrapAngle } from '../../core/math';
import { Rng } from '../../core/rng';
import { makeGroundHit, type GroundHint, type GroundHit, type GroundModel } from '../ground';
import { Kart, RespawnState } from '../kart';
import type { TrackModel } from '../track/trackModel';
import { TUNING } from '../tuning';
import type { World } from '../world';
import { rollItem } from './rolls';
import type { HazardInfo } from '../ai/aiDriver';

export type HitEffect = 'spin' | 'tumble' | 'goo' | 'cloud' | 'bounce';

/** Entity behaviour states. */
export enum ItemState {
  Rolling = 0,
  Lobbed = 1,
  Static = 2,
  Cruise = 3,
  Dive = 4,
  Trailing = 5,
  Windup = 6,
  Active = 7,
  Homing = 8,
}

export interface ItemEntity {
  active: boolean;
  /** Unique serial so the renderer can tell entities apart. */
  serial: number;
  type: ItemId;
  state: ItemState;
  owner: number;
  target: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  age: number;
  life: number;
  /** Track progress along the main line (planes). */
  s: number;
  hits: number;
  radius: number;
  hint: GroundHint;
  ground: GroundHit;
  /** Predicted landing point (poppers), for the telegraph ring. */
  lx: number;
  lz: number;
  ly: number;
}

export interface ItemBox {
  x: number;
  y: number;
  z: number;
  /** Seconds until it re-appears (0 = available). */
  respawn: number;
}

export interface ItemOptions {
  set: ItemSet;
  battle?: boolean;
  /** Box positions (defaults to the track's item rows). */
  boxes?: Array<{ x: number; y: number; z: number }>;
}

const POOL = 72;
const BOX_RESPAWN = 2.2;
const ROULETTE = 1.0;

/**
 * All item logic: boxes, rolls, using/throwing/trailing, entity motion, hits, shields and dodges.
 * Lives entirely in the sim (deterministic, headless).
 */
export class ItemSystem {
  readonly entities: ItemEntity[] = [];
  readonly boxes: ItemBox[] = [];
  readonly rng: Rng;
  private serial = 1;
  /** Kart index → trailing entity index (or -1). */
  private readonly trailing: Int32Array;
  /** Hazards for AI avoidance (reused objects). */
  readonly hazards: HazardInfo[] = [];
  /** Called when an item lands a hit (battle mode pops balloons here). */
  onHit?: (victim: Kart, attacker: number, item: ItemId, effect: HitEffect) => void;
  /** Prevent AI paper planes on humans near the finish (no unfair sniping). */
  finishProtect = true;

  constructor(
    readonly world: World,
    readonly ground: GroundModel,
    readonly track: TrackModel | null,
    readonly opts: ItemOptions,
  ) {
    this.rng = new Rng(world.rng.nextU32());
    for (let i = 0; i < POOL; i++) {
      this.entities.push({
        active: false,
        serial: 0,
        type: 'bumperBall',
        state: ItemState.Rolling,
        owner: -1,
        target: -1,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: 0,
        age: 0,
        life: 0,
        s: 0,
        hits: 0,
        radius: 1,
        hint: { ribbon: 0, sample: 0 },
        ground: makeGroundHit(),
        lx: 0,
        lz: 0,
        ly: 0,
      });
    }
    for (let i = 0; i < 24; i++) this.hazards.push({ x: 0, z: 0, radius: 1, active: false });
    const spots = opts.boxes ?? track?.itemBoxes ?? [];
    for (const b of spots) this.boxes.push({ x: b.x, y: b.y, z: b.z, respawn: 0 });
    this.trailing = new Int32Array(world.karts.length).fill(-1);
    world.preStep.push((dt) => this.preStep(dt));
    world.postStep.push((dt) => this.update(dt));
    const prevContact = world.onKartContact;
    world.onKartContact = (a, b, v) => {
      prevContact?.(a, b, v);
      this.onContact(a, b);
    };
  }

  // ---------------------------------------------------------------------------
  // Steering overrides (rocket autopilot, magnet pull) — before physics
  // ---------------------------------------------------------------------------
  private preStep(_dt: number): void {
    const w = this.world;
    for (const k of w.karts) {
      if (k.rocketTime > 0 && this.track) {
        const rb = this.track.main;
        const j = rb.idx(k.hint.sample + Math.round((14 + Math.max(0, k.speed) * 0.5) / rb.ds));
        const tx = rb.px[j] + rb.rx[j] * this.track.line[j] * 0.5;
        const tz = rb.pz[j] + rb.rz[j] * this.track.line[j] * 0.5;
        const err = wrapAngle(Math.atan2(tx - k.x, tz - k.z) - k.yaw);
        k.input.steer = clamp(-err * 2.4, -1, 1);
        k.input.throttle = 1;
        k.input.drift = false;
        if (k.drifting) k.cancelDrift();
        // physics treats rocketTime as uncontrollable; steer directly here
        k.yaw -= k.input.steer * k.params.turnRate * 1.1 * (1 / 60);
      }
      if (k.magnetTime > 0) {
        const t = k.magnetTarget >= 0 ? w.karts[k.magnetTarget] : null;
        if (!t || t.respawnState !== RespawnState.None || t.finished) {
          k.magnetTime = 0;
          continue;
        }
        const dx = t.x - k.x;
        const dz = t.z - k.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 3.5) {
          k.magnetTime = 0;
          continue;
        }
        const err = wrapAngle(Math.atan2(dx, dz) - k.yaw);
        if (k.controllable) k.input.steer = clamp(k.input.steer * 0.3 - err * 2.0, -1, 1);
        if (k.boostTime < 0.15) k.startBoost(0.15);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Main update — after physics
  // ---------------------------------------------------------------------------
  private update(dt: number): void {
    const w = this.world;
    if (w.phase === 'intro' || w.phase === 'countdown') return;
    // boxes respawn + pickups
    for (const b of this.boxes) {
      if (b.respawn > 0) {
        b.respawn -= dt;
        continue;
      }
      for (const k of w.karts) {
        if (k.respawnState !== RespawnState.None) continue;
        const dx = k.x - b.x;
        const dz = k.z - b.z;
        const dy = k.y + 0.6 - b.y;
        if (dx * dx + dz * dz < 2.3 * 2.3 && dy * dy < 2.4 * 2.4) {
          b.respawn = BOX_RESPAWN;
          w.events.push({ type: 'boxBreak', x: b.x, y: b.y, z: b.z });
          if (k.item === null && k.rouletteTime <= 0 && !k.finished) {
            k.pendingItem = rollItem(this.rng, k.rank, w.karts.length, this.opts.set, this.opts.battle);
            k.rouletteTime = ROULETTE;
            w.events.push({ type: 'itemRoll', kart: k.index });
          }
          break;
        }
      }
    }
    // roulette + item use
    for (const k of w.karts) {
      if (k.rouletteTime > 0) {
        k.rouletteTime -= dt;
        if (k.rouletteTime <= 0 && k.pendingItem) {
          k.item = k.pendingItem;
          k.itemUses = ITEM_BY_ID[k.item].uses;
          k.pendingItem = null;
          w.events.push({ type: 'itemGet', kart: k.index, item: k.item });
        }
      }
      this.handleUse(k);
      k.threat = 0;
      k.threatItem = null;
    }
    // entities
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (!e.active) continue;
      e.age += dt;
      this.stepEntity(e, i, dt);
    }
    this.collideEntities();
    this.updateHazards();
  }

  private handleUse(k: Kart): void {
    const pressed = k.input.item && !k.prevItem;
    const released = !k.input.item && k.prevItem;
    k.prevItem = k.input.item;
    if (!k.item || k.respawnState !== RespawnState.None || !k.controllable) {
      if (this.trailing[k.index] >= 0 && (k.spinTime > 0 || k.tumbleTime > 0)) this.dropTrail(k, true);
      return;
    }
    const data = ITEM_BY_ID[k.item];
    const trailIdx = this.trailing[k.index];
    if (trailIdx >= 0) {
      if (released) this.releaseTrail(k);
      return;
    }
    if (!pressed) return;
    if (data.canTrail) {
      this.startTrail(k);
      return;
    }
    this.useItem(k, k.item, k.input.aimBack);
  }

  private consume(k: Kart): void {
    k.itemUses--;
    k.raceStats.itemsUsed++;
    if (k.itemUses <= 0) {
      k.item = null;
      k.itemUses = 0;
    }
  }

  private useItem(k: Kart, id: ItemId, back: boolean): void {
    const w = this.world;
    w.events.push({ type: 'itemUse', kart: k.index, item: id, back });
    const fx = Math.sin(k.yaw);
    const fz = Math.cos(k.yaw);
    switch (id) {
      case 'turbo':
      case 'turbo3':
        k.startBoost(TUNING.turboCanisterTime);
        break;
      case 'shield':
        k.shieldTime = 6;
        break;
      case 'magnet': {
        const t = this.kartAhead(k);
        if (t) {
          k.magnetTarget = t.index;
          k.magnetTime = 2.6;
        } else k.startBoost(TUNING.turboCanisterTime);
        break;
      }
      case 'rocketDash':
        k.rocketTime = 3.6;
        k.cancelDrift();
        k.spinTime = 0;
        k.tumbleTime = 0;
        k.gooTime = 0;
        break;
      case 'paperPlane': {
        const e = this.spawn('paperPlane', k, k.x + fx * 2, k.y + 1.8, k.z + fz * 2);
        if (!e) break;
        e.target = this.kartAhead(k)?.index ?? -1;
        e.state = this.track && !this.opts.battle ? ItemState.Cruise : ItemState.Homing;
        if (this.opts.battle) e.target = this.nearestOpponent(k)?.index ?? -1;
        e.s = k.ground.s;
        e.life = 12;
        e.radius = 1.3;
        e.vx = fx * 40;
        e.vz = fz * 40;
        break;
      }
      case 'cloud': {
        let n = 0;
        for (const o of w.karts) {
          if (o === k || o.rank >= k.rank || o.finished || n >= 7) continue;
          const e = this.spawn('cloud', k, k.x, k.y + 2.5, k.z);
          if (!e) break;
          e.target = o.index;
          e.state = ItemState.Homing;
          e.life = 6;
          e.radius = 2;
          n++;
        }
        if (n === 0) {
          // nobody ahead: a harmless puff
          const e = this.spawn('cloud', k, k.x + fx * 3, k.y + 2.5, k.z + fz * 3);
          if (e) {
            e.state = ItemState.Static;
            e.life = 1.2;
            e.radius = 0;
          }
        }
        break;
      }
      case 'tornado': {
        const e = this.spawn('tornado', k, k.x + fx * 1.5, k.y, k.z + fz * 1.5);
        if (!e) break;
        e.state = ItemState.Windup;
        e.life = 4.2;
        e.radius = 6.5;
        e.vx = fx * 9;
        e.vz = fz * 9;
        break;
      }
      case 'popper':
        this.throwLob(k, 'popper', back);
        break;
      case 'bumperBall':
      case 'gooPuddle':
      case 'springTrap':
        this.throwTrailable(k, id, back);
        break;
    }
    this.consume(k);
  }

  private throwLob(k: Kart, id: ItemId, back: boolean): ItemEntity | null {
    const fx = Math.sin(k.yaw);
    const fz = Math.cos(k.yaw);
    const sp = Math.max(0, k.speed);
    const e = this.spawn(id, k, k.x + fx * (back ? -2 : 2), k.y + 1.2, k.z + fz * (back ? -2 : 2));
    if (!e) return null;
    e.state = ItemState.Lobbed;
    if (back) {
      e.vx = -fx * 7 + k.vx * 0.4;
      e.vz = -fz * 7 + k.vz * 0.4;
      e.vy = 6;
    } else {
      e.vx = fx * (sp + 15);
      e.vz = fz * (sp + 15);
      e.vy = 9;
    }
    e.life = 30;
    e.radius = id === 'popper' ? 5.5 : id === 'gooPuddle' ? 1.7 : 1.4;
    // predicted landing (flat-ground estimate) for the telegraph ring
    const g = TUNING.gravity * this.ground.gravityScale;
    const t = (e.vy + Math.sqrt(e.vy * e.vy + 2 * g * 1.2)) / g;
    e.lx = e.x + e.vx * t;
    e.lz = e.z + e.vz * t;
    e.ly = k.y;
    return e;
  }

  private throwTrailable(k: Kart, id: ItemId, back: boolean): void {
    const fx = Math.sin(k.yaw);
    const fz = Math.cos(k.yaw);
    if (id === 'bumperBall') {
      const dir = back ? -1 : 1;
      const e = this.spawn(id, k, k.x + fx * 2.4 * dir, k.y + 0.6, k.z + fz * 2.4 * dir);
      if (!e) return;
      const speed = (back ? 16 : 38) * this.world.speedScale;
      e.vx = fx * speed * dir + (back ? 0 : k.vx * 0.1);
      e.vz = fz * speed * dir + (back ? 0 : k.vz * 0.1);
      e.state = ItemState.Rolling;
      e.life = 7;
      e.radius = 0.9;
      this.ground.resetHint(e.x, e.y, e.z, e.hint);
      e.hint.sample = k.hint.sample;
      return;
    }
    if (back) {
      const e = this.spawn(id, k, k.x - fx * 2.6, k.y, k.z - fz * 2.6);
      if (!e) return;
      e.state = ItemState.Lobbed;
      e.vx = k.vx * 0.2;
      e.vz = k.vz * 0.2;
      e.vy = 2;
      e.life = 25;
      e.radius = id === 'gooPuddle' ? 1.8 : 1.4;
      e.hint.sample = k.hint.sample;
    } else {
      const e = this.throwLob(k, id, false);
      if (e) e.hint.sample = k.hint.sample;
    }
  }

  private startTrail(k: Kart): void {
    const e = this.spawn(k.item!, k, k.x, k.y, k.z);
    if (!e) return;
    e.state = ItemState.Trailing;
    e.life = 999;
    e.radius = 1.0;
    this.trailing[k.index] = this.entities.indexOf(e);
    k.trailing = true;
  }

  private releaseTrail(k: Kart): void {
    const idx = this.trailing[k.index];
    if (idx >= 0) this.entities[idx].active = false;
    this.trailing[k.index] = -1;
    k.trailing = false;
    if (k.item) {
      const id = k.item;
      this.world.events.push({ type: 'itemUse', kart: k.index, item: id, back: k.input.aimBack });
      // Balls roll forward unless aimed back; puddles and springs drop behind.
      this.throwTrailable(k, id, id === 'bumperBall' ? k.input.aimBack : true);
      this.consume(k);
    }
  }

  /** The trailing item is lost when hit. */
  private dropTrail(k: Kart, destroy: boolean): void {
    const idx = this.trailing[k.index];
    if (idx < 0) return;
    this.entities[idx].active = false;
    this.trailing[k.index] = -1;
    k.trailing = false;
    if (destroy && k.item) this.consume(k);
  }

  /** Driving School: drop a static hazard (e.g. a goo puddle) on the track, owned by nobody. */
  placeHazard(type: ItemId, x: number, y: number, z: number): ItemEntity | null {
    const e = this.spawn(type, this.world.karts[0], x, y, z);
    if (!e) return null;
    e.owner = -1;
    e.state = ItemState.Static;
    e.life = 1e9;
    e.ground.hit = true;
    e.ground.height = y;
    return e;
  }

  private spawn(type: ItemId, owner: Kart, x: number, y: number, z: number): ItemEntity | null {
    for (const e of this.entities) {
      if (e.active) continue;
      e.active = true;
      e.serial = this.serial++;
      e.type = type;
      e.owner = owner.index;
      e.target = -1;
      e.x = x;
      e.y = y;
      e.z = z;
      e.vx = e.vy = e.vz = 0;
      e.yaw = owner.yaw;
      e.age = 0;
      e.life = 10;
      e.hits = 0;
      e.radius = 1;
      e.s = owner.ground.s;
      e.hint.sample = owner.hint.sample;
      e.hint.ribbon = 0;
      e.lx = e.lz = e.ly = 0;
      return e;
    }
    return null;
  }

  private kartAhead(k: Kart): Kart | null {
    let best: Kart | null = null;
    for (const o of this.world.karts) {
      if (o === k || o.finished || o.respawnState !== RespawnState.None) continue;
      if (o.rank === k.rank - 1) return o;
      if (o.rank < k.rank && (!best || o.rank > best.rank)) best = o;
    }
    return best;
  }

  private nearestOpponent(k: Kart): Kart | null {
    let best: Kart | null = null;
    let bd = Infinity;
    for (const o of this.world.karts) {
      if (o === k || o.respawnState !== RespawnState.None) continue;
      const d = (o.x - k.x) ** 2 + (o.z - k.z) ** 2;
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------------------
  // Entity behaviour
  // ---------------------------------------------------------------------------
  private stepEntity(e: ItemEntity, idx: number, dt: number): void {
    const w = this.world;
    if (e.age > e.life) {
      e.active = false;
      return;
    }
    switch (e.state) {
      case ItemState.Trailing: {
        const k = w.karts[e.owner];
        const fx = Math.sin(k.yaw);
        const fz = Math.cos(k.yaw);
        e.x = k.x - fx * 2.0;
        e.z = k.z - fz * 2.0;
        e.y = k.y + 0.35;
        e.yaw = k.yaw;
        if (this.trailing[k.index] !== idx || !k.item) e.active = false;
        break;
      }
      case ItemState.Rolling: {
        e.x += e.vx * dt;
        e.z += e.vz * dt;
        const g = this.ground.query(e.x, e.y, e.z, e.hint, e.ground);
        if (g.hit && g.height > e.y - 1.6) {
          e.y = g.height + 0.6;
          e.vy = 0;
        } else {
          e.vy -= TUNING.gravity * dt;
          e.y += e.vy * dt;
          if (e.y < this.ground.killY) e.active = false;
        }
        if (g.wallHit) {
          e.x += g.wallNx * g.wallDepth;
          e.z += g.wallNz * g.wallDepth;
          const vn = e.vx * g.wallNx + e.vz * g.wallNz;
          if (vn < 0) {
            e.vx -= 2 * vn * g.wallNx;
            e.vz -= 2 * vn * g.wallNz;
            e.hits++;
            if (e.hits > 6) e.active = false;
          }
        }
        e.yaw += dt * 10;
        break;
      }
      case ItemState.Lobbed: {
        e.vy -= TUNING.gravity * this.ground.gravityScale * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        const g = this.ground.query(e.x, e.y, e.z, e.hint, e.ground);
        if (g.hit && e.y <= g.height + 0.2 && e.vy < 0) {
          e.y = g.height;
          if (e.type === 'popper') this.explodePopper(e);
          else {
            e.state = ItemState.Static;
            e.vx = e.vy = e.vz = 0;
            e.age = 0;
            e.life = 25;
          }
        } else if (e.y < this.ground.killY) e.active = false;
        break;
      }
      case ItemState.Static:
        break;
      case ItemState.Cruise: {
        // Glide along the racing line toward the target, then dive.
        const t = e.target >= 0 ? w.karts[e.target] : null;
        if (!t || t.finished || t.respawnState !== RespawnState.None) {
          const nt = this.kartAhead(w.karts[e.owner]);
          if (nt && nt !== t) e.target = nt.index;
          else if (!t || t.finished) {
            e.life = Math.min(e.life, e.age + 1.5);
          }
        }
        const track = this.track!;
        const L = track.length;
        e.s = (e.s + 44 * w.speedScale * dt) % L;
        const i = track.main.indexAtS(e.s);
        const rb = track.main;
        const d = track.line[i];
        const tx = rb.px[i] + rb.rx[i] * d;
        const tz = rb.pz[i] + rb.rz[i] * d;
        const ty = rb.py[i] + 2.4;
        e.vx = (tx - e.x) / dt;
        e.vz = (tz - e.z) / dt;
        e.x = tx;
        e.z = tz;
        e.y += (ty - e.y) * Math.min(1, dt * 6);
        e.yaw = Math.atan2(rb.tx[i], rb.tz[i]);
        if (t) {
          const dist = Math.hypot(t.x - e.x, t.z - e.z);
          if (dist < 22) {
            e.state = ItemState.Dive;
            e.age = Math.min(e.age, e.life - 2);
          }
          if (dist < 90) this.threaten(t, 1 - dist / 90, 'paperPlane');
        }
        break;
      }
      case ItemState.Dive:
      case ItemState.Homing: {
        const t = e.target >= 0 ? w.karts[e.target] : null;
        const speed = (e.type === 'cloud' ? 55 : 40) * w.speedScale;
        if (!t || t.respawnState !== RespawnState.None) {
          e.x += e.vx * dt;
          e.z += e.vz * dt;
          if (e.age > 2) e.active = false;
          break;
        }
        const dx = t.x - e.x;
        const dy = t.y + (e.type === 'cloud' ? 2.2 : 0.7) - e.y;
        const dz = t.z - e.z;
        const dist = Math.hypot(dx, dy, dz) || 1e-4;
        e.vx = (dx / dist) * speed;
        e.vy = (dy / dist) * speed;
        e.vz = (dz / dist) * speed;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        e.yaw = Math.atan2(e.vx, e.vz);
        this.threaten(t, e.type === 'cloud' ? 0.6 : 1, e.type);
        if (dist < 1.9) this.resolveHoming(e, t);
        break;
      }
      case ItemState.Windup:
        if (e.age > 0.65) {
          e.state = ItemState.Active;
        }
        for (const k of w.karts) {
          if (k.index === e.owner) continue;
          if ((k.x - e.x) ** 2 + (k.z - e.z) ** 2 < 14 * 14) this.threaten(k, 0.7, 'tornado');
        }
        break;
      case ItemState.Active: {
        // tornado drifts forward, spinning karts that come close
        e.x += e.vx * dt;
        e.z += e.vz * dt;
        const g = this.ground.query(e.x, e.y + 1, e.z, e.hint, e.ground);
        if (g.hit) e.y = g.height;
        if (g.wallHit) {
          e.x += g.wallNx * g.wallDepth;
          e.z += g.wallNz * g.wallDepth;
        }
        for (const k of w.karts) {
          if (k.index === e.owner && e.age < 2.5) continue;
          const d2 = (k.x - e.x) ** 2 + (k.z - e.z) ** 2;
          if (d2 < e.radius * e.radius && k.y - e.y < 3 && k.grounded) this.hit(k, e.owner, 'tornado', 'spin');
        }
        break;
      }
    }
    // Popper telegraph threatens karts near the landing point.
    if (e.type === 'popper' && e.state === ItemState.Lobbed) {
      for (const k of w.karts) {
        const d2 = (k.x - e.lx) ** 2 + (k.z - e.lz) ** 2;
        if (d2 < 12 * 12) this.threaten(k, 0.8, 'popper');
      }
    }
    // Balls rolling toward a kart from behind
    if (e.type === 'bumperBall' && e.state === ItemState.Rolling) {
      for (const k of w.karts) {
        if (k.index === e.owner && e.age < 0.6) continue;
        const dx = k.x - e.x;
        const dz = k.z - e.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 20 * 20 && dx * e.vx + dz * e.vz > 0) this.threaten(k, 0.5 * (1 - Math.sqrt(d2) / 20), 'bumperBall');
      }
    }
  }

  private threaten(k: Kart, amount: number, item: ItemId): void {
    if (amount > k.threat) {
      k.threat = amount;
      k.threatItem = item;
    }
  }

  private resolveHoming(e: ItemEntity, t: Kart): void {
    const w = this.world;
    e.active = false;
    if (e.type === 'cloud') {
      this.hit(t, e.owner, 'cloud', 'cloud');
      return;
    }
    // Paper plane: a well-timed hop/trick/boost dodges the swoop.
    if (!t.grounded || t.boosting) {
      t.raceStats.dodges++;
      w.events.push({ type: 'dodge', kart: t.index, item: 'paperPlane' });
      w.events.push({ type: 'explode', x: e.x, y: e.y, z: e.z, item: 'paperPlane' });
      return;
    }
    // A trailing item blocks the plane coming from behind.
    if (this.trailing[t.index] >= 0) {
      this.dropTrail(t, true);
      w.events.push({ type: 'blocked', kart: t.index, by: e.owner, item: 'paperPlane' });
      w.events.push({ type: 'explode', x: e.x, y: e.y, z: e.z, item: 'paperPlane' });
      return;
    }
    this.hit(t, e.owner, 'paperPlane', 'tumble');
    w.events.push({ type: 'explode', x: e.x, y: e.y, z: e.z, item: 'paperPlane' });
  }

  private explodePopper(e: ItemEntity): void {
    const w = this.world;
    e.active = false;
    w.events.push({ type: 'explode', x: e.x, y: e.y, z: e.z, item: 'popper' });
    for (const k of w.karts) {
      const d2 = (k.x - e.x) ** 2 + (k.z - e.z) ** 2;
      if (d2 < e.radius * e.radius && Math.abs(k.y - e.y) < 3.5) this.hit(k, e.owner, 'popper', 'tumble');
    }
  }

  // ---------------------------------------------------------------------------
  // Collisions
  // ---------------------------------------------------------------------------
  private collideEntities(): void {
    const w = this.world;
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (!e.active) continue;
      // vs karts (rolling balls, static puddles/springs)
      if (e.state === ItemState.Rolling || e.state === ItemState.Static) {
        if (e.type === 'cloud') continue;
        for (const k of w.karts) {
          if (!e.active) break;
          if (k.index === e.owner && e.age < (e.state === ItemState.Static ? 1.2 : 0.6)) continue;
          if (k.respawnState !== RespawnState.None) continue;
          const dx = k.x - e.x;
          const dy = k.y + 0.5 - e.y;
          const dz = k.z - e.z;
          const r = e.radius + 0.9;
          if (dx * dx + dz * dz < r * r && dy * dy < 4) {
            if (e.type === 'bumperBall') {
              this.hit(k, e.owner, 'bumperBall', 'spin');
              e.active = false;
              w.events.push({ type: 'explode', x: e.x, y: e.y, z: e.z, item: 'bumperBall' });
            } else if (e.type === 'gooPuddle') {
              if (!k.grounded) continue;
              if (k.gooTime <= 0) {
                this.hit(k, e.owner, 'gooPuddle', 'goo');
                e.hits++;
                if (e.hits >= 2) e.active = false;
              }
            } else if (e.type === 'springTrap') {
              if (!k.grounded) continue;
              this.hit(k, e.owner, 'springTrap', 'bounce');
              e.active = false;
              w.events.push({ type: 'explode', x: e.x, y: e.y, z: e.z, item: 'springTrap' });
            }
          }
        }
      }
      // projectiles vs trailing/static items
      if (e.active && (e.state === ItemState.Rolling || e.state === ItemState.Lobbed)) {
        for (let j = 0; j < this.entities.length; j++) {
          if (j === i) continue;
          const o = this.entities[j];
          if (!o.active || (o.state !== ItemState.Trailing && o.state !== ItemState.Static && o.state !== ItemState.Rolling)) continue;
          if (o.type === 'cloud' || o.type === 'tornado') continue;
          const r = e.radius * (e.type === 'popper' ? 0.2 : 1) + o.radius;
          const dx = o.x - e.x;
          const dy = o.y - e.y;
          const dz = o.z - e.z;
          if (dx * dx + dy * dy + dz * dz < r * r) {
            e.active = false;
            if (o.state === ItemState.Trailing) {
              const owner = w.karts[o.owner];
              this.dropTrail(owner, true);
              w.events.push({ type: 'blocked', kart: owner.index, by: e.owner, item: e.type });
            } else o.active = false;
            w.events.push({ type: 'explode', x: (e.x + o.x) / 2, y: (e.y + o.y) / 2, z: (e.z + o.z) / 2, item: e.type });
            break;
          }
        }
      }
    }
  }

  private onContact(a: Kart, b: Kart): void {
    if (a.rocketTime > 0 && b.rocketTime <= 0) this.hit(b, a.index, 'rocketDash', 'spin');
    else if (b.rocketTime > 0 && a.rocketTime <= 0) this.hit(a, b.index, 'rocketDash', 'spin');
  }

  /** Apply an item effect to a kart, honouring shields and invulnerability. */
  hit(k: Kart, attacker: number, item: ItemId, effect: HitEffect): boolean {
    const w = this.world;
    if (k.respawnState !== RespawnState.None || k.rocketTime > 0) return false;
    if (k.shieldTime > 0) {
      k.shieldTime = 0;
      w.events.push({ type: 'blocked', kart: k.index, by: attacker, item });
      w.events.push({ type: 'shieldPop', kart: k.index });
      return false;
    }
    if ((effect === 'spin' || effect === 'tumble') && k.invulnTime > 0) return false;
    switch (effect) {
      case 'spin':
        k.spinTime = TUNING.spinTime;
        k.invulnTime = TUNING.hitInvulnTime;
        k.vx *= 0.45;
        k.vz *= 0.45;
        k.cancelDrift();
        this.dropTrail(k, true);
        break;
      case 'tumble':
        k.tumbleTime = TUNING.tumbleTime;
        k.invulnTime = TUNING.hitInvulnTime;
        k.vx *= 0.35;
        k.vz *= 0.35;
        k.vy = 7;
        k.grounded = false;
        k.cancelDrift();
        this.dropTrail(k, true);
        break;
      case 'goo':
        k.gooTime = TUNING.gooTime;
        break;
      case 'bounce':
        k.vy = 11;
        k.grounded = false;
        k.vx *= 0.6;
        k.vz *= 0.6;
        k.wobble = 0.5;
        k.cancelDrift();
        break;
      case 'cloud':
        k.cloudTime = 3;
        break;
    }
    k.raceStats.timesHit++;
    k.raceStats.hitsTakenBy[item] = (k.raceStats.hitsTakenBy[item] ?? 0) + 1;
    if (attacker >= 0 && attacker !== k.index) {
      const a = w.karts[attacker];
      a.raceStats.itemHits++;
      a.raceStats.itemHitsByItem[item] = (a.raceStats.itemHitsByItem[item] ?? 0) + 1;
    }
    w.events.push({ type: 'itemHit', kart: k.index, by: attacker, item, effect: effect === 'bounce' ? 'bounce' : effect });
    this.onHit?.(k, attacker, item, effect);
    return true;
  }

  private updateHazards(): void {
    let h = 0;
    for (const e of this.entities) {
      if (!e.active || h >= this.hazards.length) continue;
      if (e.state === ItemState.Static || e.state === ItemState.Rolling || (e.type === 'tornado' && e.state !== ItemState.Lobbed)) {
        const hz = this.hazards[h++];
        hz.x = e.x;
        hz.z = e.z;
        hz.radius = e.type === 'tornado' ? e.radius : e.radius + 0.4;
        hz.active = true;
      } else if (e.type === 'popper' && e.state === ItemState.Lobbed) {
        const hz = this.hazards[h++];
        hz.x = e.lx;
        hz.z = e.lz;
        hz.radius = e.radius;
        hz.active = true;
      }
    }
    for (; h < this.hazards.length; h++) this.hazards[h].active = false;
  }

  /** Give a kart an item directly (time trial turbos, tests). */
  give(k: Kart, id: ItemId): void {
    k.item = id;
    k.itemUses = ITEM_BY_ID[id].uses;
  }

  /** Index of the entity trailing behind kart k (or -1). */
  trailOf(k: number): number {
    return this.trailing[k];
  }
}
