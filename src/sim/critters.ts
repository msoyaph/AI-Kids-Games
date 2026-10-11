/**
 * Mild cave-critter combat. Critters (slimes, bats, rock crabs) bounce away when bonked
 * and poof into sparkles. Bumping into one costs a little health; at 0 the player faints
 * and wakes up at home with nothing lost.
 */
import { TILE } from '../core/math';
import { ORES } from '../data/minerals';
import { TOOL_TIERS } from '../tuning';
import { remove, count } from './inventory';
import { layerOf } from './mine';
import { gainXp } from './skills';
import { simInitHooks, type Sim } from './sim';
import type { Loc } from './world';

export type CritterKind = 'slime' | 'bat' | 'crab';

export interface Critter {
  id: number;
  kind: CritterKind;
  layer: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  max: number;
  hidden: boolean;
  t: number;
  hopT: number;
  flash: number;
  dead: boolean;
  /** seconds since death (for poof effect) */
  poof: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  active: boolean;
}

export interface Combat {
  critters: Critter[];
  shots: Shot[];
  invuln: number;
  nextId: number;
  /** recent hit events for the client (sounds / sparkles), drained each frame */
  events: { kind: 'hit' | 'poof' | 'hurt' | 'shoot' | 'reveal'; x: number; y: number }[];
}

export function combat(sim: Sim): Combat {
  let c = sim.ext.combat as Combat | undefined;
  if (!c) {
    c = { critters: [], shots: [], invuln: 0, nextId: 1, events: [] };
    sim.ext.combat = c;
  }
  return c;
}

const STATS: Record<CritterKind, { hp: number; speed: number; dmg: number }> = {
  slime: { hp: 3, speed: 34, dmg: 4 },
  bat: { hp: 2, speed: 28, dmg: 3 },
  crab: { hp: 5, speed: 22, dmg: 5 },
};

export function critterDamage(c: Critter): number {
  return STATS[c.kind].dmg + c.layer * 3;
}

export function spawnCritters(sim: Sim, loc: Loc, floor: number): void {
  const cb = combat(sim);
  cb.critters = [];
  cb.shots = [];
  if (floor >= 40) return;
  const rng = sim.rng(0xc417, floor);
  const L = layerOf(floor);
  const n = Math.min(9, 2 + Math.floor(floor / 4));
  const start = loc.def.points.start;
  let tries = 0;
  while (cb.critters.length < n && tries++ < 400) {
    const x = rng.range(2, loc.w - 3), y = rng.range(2, loc.h - 3);
    if (loc.blocked(x, y) || Math.abs(x - start.x) + Math.abs(y - start.y) < 8) continue;
    const r = rng.next();
    const kind: CritterKind = floor >= 6 && r < 0.2 ? 'crab' : floor >= 3 && r < 0.5 ? 'bat' : 'slime';
    const s = STATS[kind];
    const hp = s.hp + L * 3;
    cb.critters.push({ id: cb.nextId++, kind, layer: L, x: x * TILE + 8, y: y * TILE + 12, vx: 0, vy: 0, hp, max: hp, hidden: kind === 'crab', t: rng.next() * 2, hopT: 0, flash: 0, dead: false, poof: 0 });
  }
}

function blockedAt(loc: Loc, x: number, y: number, flying: boolean): boolean {
  const tx = Math.floor(x / TILE), ty = Math.floor((y - 2) / TILE);
  return flying ? loc.staticBlocked(tx, ty) : loc.blocked(tx, ty);
}

function moveCritter(loc: Loc, c: Critter, dx: number, dy: number): void {
  const fly = c.kind === 'bat';
  if (!blockedAt(loc, c.x + dx, c.y, fly)) c.x += dx;
  else c.vx = -c.vx * 0.5;
  if (!blockedAt(loc, c.x, c.y + dy, fly)) c.y += dy;
  else c.vy = -c.vy * 0.5;
}

export function updateCombat(sim: Sim, dt: number): void {
  if (sim.p.loc !== 'mine') return;
  const cb = combat(sim);
  const loc = sim.here;
  const p = sim.p;
  if (cb.invuln > 0) cb.invuln -= dt;
  for (const c of cb.critters) {
    if (c.dead) {
      c.poof += dt;
      continue;
    }
    if (c.flash > 0) c.flash -= dt;
    const dx = p.x - c.x, dy = p.y - c.y;
    const dist = Math.hypot(dx, dy) || 1;
    const st = STATS[c.kind];
    // knockback velocity decays
    if (c.vx || c.vy) {
      moveCritter(loc, c, c.vx * dt, c.vy * dt);
      c.vx *= Math.pow(0.02, dt);
      c.vy *= Math.pow(0.02, dt);
      if (Math.abs(c.vx) < 2) c.vx = 0;
      if (Math.abs(c.vy) < 2) c.vy = 0;
    }
    if (c.hidden) {
      if (dist < 26) {
        c.hidden = false;
        cb.events.push({ kind: 'reveal', x: c.x, y: c.y });
      }
      continue;
    }
    c.t -= dt;
    const chase = dist < 7 * TILE;
    if (c.kind === 'slime') {
      if (c.hopT > 0) {
        c.hopT -= dt;
        const sp = st.speed * 1.6 * dt;
        moveCritter(loc, c, chase ? (dx / dist) * sp : Math.cos(c.id + c.t) * sp * 0.5, chase ? (dy / dist) * sp : Math.sin(c.id + c.t) * sp * 0.5);
      } else if (c.t <= 0) {
        c.t = 0.9 + Math.random() * 0.8;
        c.hopT = 0.35;
      }
    } else if (c.kind === 'bat') {
      const sp = st.speed * dt;
      const wob = Math.sin(sim.state.playSec * 5.5 + c.id) * 0.8;
      if (chase) moveCritter(loc, c, (dx / dist) * sp + wob * sp, (dy / dist) * sp - wob * sp * 0.5);
      else moveCritter(loc, c, Math.cos(c.id + sim.state.playSec * 1.1) * sp, Math.sin(c.id * 2 + sim.state.playSec * 1.4) * sp);
    } else {
      const sp = st.speed * dt * (chase ? 1 : 0.3);
      moveCritter(loc, c, (dx / dist) * sp, (dy / dist) * sp);
    }
    // bump the player
    if (dist < 11 && cb.invuln <= 0) {
      const dmg = critterDamage(c);
      p.hp = Math.max(0, p.hp - dmg);
      cb.invuln = 1.1;
      cb.events.push({ kind: 'hurt', x: p.x, y: p.y });
      sim.ev.emit('hurt', { dmg });
      // both bounce apart
      c.vx = (-dx / dist) * 90;
      c.vy = (-dy / dist) * 90;
      const kx = (dx / dist) * 10, ky = (dy / dist) * 10;
      if (!loc.blocked(Math.floor((p.x + kx) / TILE), Math.floor((p.y - 1) / TILE))) p.x += kx;
      if (!loc.blocked(Math.floor(p.x / TILE), Math.floor((p.y + ky - 1) / TILE))) p.y += ky;
      if (p.hp <= 0) sim.ev.emit('faint', { where: 'mine' });
    }
  }
  // remove long-gone critters
  if (cb.critters.some((c) => c.dead && c.poof > 1)) cb.critters = cb.critters.filter((c) => !(c.dead && c.poof > 1));
  // slingshot pebbles
  for (const s of cb.shots) {
    if (!s.active) continue;
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.life <= 0 || loc.staticBlocked(Math.floor(s.x / TILE), Math.floor(s.y / TILE))) {
      s.active = false;
      continue;
    }
    for (const c of cb.critters) {
      if (c.dead) continue;
      if (Math.hypot(c.x - s.x, c.y - 6 - s.y) < 9) {
        hitCritter(sim, c, 2 + Math.max(0, sim.p.tools.sling ?? 0) * 2, s.vx, s.vy);
        s.active = false;
        break;
      }
    }
  }
}

export function hitCritter(sim: Sim, c: Critter, dmg: number, fx: number, fy: number): void {
  const cb = combat(sim);
  c.hidden = false;
  c.hp -= dmg;
  c.flash = 0.2;
  const len = Math.hypot(fx, fy) || 1;
  c.vx = (fx / len) * 140;
  c.vy = (fy / len) * 140;
  cb.events.push({ kind: 'hit', x: c.x, y: c.y });
  if (c.hp <= 0) {
    c.dead = true;
    c.poof = 0;
    cb.events.push({ kind: 'poof', x: c.x, y: c.y });
    sim.state.stats.critters++;
    gainXp(sim, 'mining', 5 + c.layer * 3);
    const rng = sim.rng(0xd70, c.id);
    const r = rng.next();
    if (r < 0.3) sim.give('coal', 1);
    else if (r < 0.55) sim.give(ORES[Math.min(3, c.layer)].id, rng.range(1, 2));
    else if (r < 0.7) sim.give('stone', 2);
    else if (r < 0.75) sim.give('quartz', 1);
    else if (r < 0.78) sim.give(['geode', 'frostGeode', 'glowGeode', 'crystalGeode'][c.layer], 1);
  }
}

/** Swing the bonk stick: hits critters in front of the player. */
export function bonk(sim: Sim, dirX: number, dirY: number): number {
  const cb = combat(sim);
  const p = sim.p;
  const tier = Math.max(0, p.tools.bonk ?? 0);
  const dmg = TOOL_TIERS.damage[tier];
  const hx = p.x + dirX * 12, hy = p.y - 6 + dirY * 12;
  let hits = 0;
  for (const c of cb.critters) {
    if (c.dead) continue;
    if (Math.hypot(c.x - hx, c.y - 6 - hy) < 20) {
      hitCritter(sim, c, dmg, c.x - p.x, c.y - p.y);
      hits++;
    }
  }
  return hits;
}

/** Fire a pebble from the slingshot (uses 1 stone). */
export function shoot(sim: Sim, dirX: number, dirY: number): { ok: boolean; msg?: string } {
  if (count(sim.p.inv, 'stone') <= 0) return { ok: false, msg: 'Your slingshot needs stones! Break some rocks.' };
  const cb = combat(sim);
  const len = Math.hypot(dirX, dirY) || 1;
  let s = cb.shots.find((x) => !x.active);
  if (!s) {
    s = { x: 0, y: 0, vx: 0, vy: 0, life: 0, active: false };
    cb.shots.push(s);
  }
  s.x = sim.p.x;
  s.y = sim.p.y - 10;
  s.vx = (dirX / len) * 190;
  s.vy = (dirY / len) * 190;
  s.life = 0.9;
  s.active = true;
  remove(sim.p.inv, 'stone', 1);
  cb.events.push({ kind: 'shoot', x: s.x, y: s.y });
  return { ok: true };
}

simInitHooks.push((sim) => {
  sim.frameHooks.push(updateCombat);
  sim.ev.on('mineFloor', ({ floor }) => spawnCritters(sim, sim.loc('mine'), floor));
});
