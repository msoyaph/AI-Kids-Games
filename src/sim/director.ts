import { DT } from '../config/balance';
import { ENEMIES, enemyIndex } from '../config/enemies';
import type { MapDef } from '../config/maps';
import type { WaveEvent } from '../config/types';
import { Ev } from '../core/events';
import { spawnBoss } from './bosses';
import { spawnEnemy } from './combat';
import { Motion } from './pools';
import { spawnProjectile } from './weapons/common';
import type { World } from './world';

interface MapTables {
  /** Pre-resolved spawn tables per wave segment. */
  mix: Array<{ types: Int32Array; weights: Float32Array }>;
  /** Stress-test roster: every regular enemy the map's waves use (in ENEMIES order). */
  stress: Int32Array;
}

const TABLES = new Map<string, MapTables>();

function tablesFor(map: MapDef): MapTables {
  let t = TABLES.get(map.id);
  if (!t) {
    const used = new Set(map.waves.flatMap((seg) => seg.mix.map(([id]) => id)));
    t = {
      mix: map.waves.map((seg) => ({
        types: Int32Array.from(seg.mix.map(([id]) => enemyIndex(id))),
        weights: Float32Array.from(seg.mix.map(([, wgt]) => wgt)),
      })),
      stress: Int32Array.from(ENEMIES.map((d, i) => (used.has(d.id) && d.behavior !== 'boss' ? i : -1)).filter((i) => i >= 0)),
    };
    TABLES.set(map.id, t);
  }
  return t;
}

const tmp = new Float32Array(2);

/** Stress-test projectile: slow, piercing, long-lived. */
const STRESS_SHOT = { damage: 1, cooldown: 1, area: 1, speed: 9, amount: 1, pierce: 9999, duration: 5, knockback: 0, hitInterval: 0.5, range: 30, chain: 0, slow: 0, explode: 0, crit: 0 };

/** Pick a point on the spawn ring around the player, inside the map. */
function ringPoint(w: World, minD: number, maxD: number, biasX: number, biasZ: number, out: Float32Array): void {
  const p = w.player;
  const half = w.terrain.half - 6;
  const biasA = Math.atan2(biasX, biasZ);
  const hasBias = biasX * biasX + biasZ * biasZ > 4;
  for (let tries = 0; tries < 8; tries++) {
    const a = hasBias ? biasA + (w.rng.next() - 0.5) * 2.2 : w.rng.next() * Math.PI * 2;
    const d = minD + w.rng.next() * (maxD - minD);
    const x = p.x + Math.sin(a) * d;
    const z = p.z + Math.cos(a) * d;
    if (x > -half && x < half && z > -half && z < half && w.flow.reachable(x, z)) {
      out[0] = x;
      out[1] = z;
      return;
    }
  }
  // fall back: clamp toward the map centre
  const a = Math.atan2(-p.x, -p.z) + (w.rng.next() - 0.5) * 1.5;
  out[0] = Math.max(-half, Math.min(half, p.x + Math.sin(a) * minD));
  out[1] = Math.max(-half, Math.min(half, p.z + Math.cos(a) * minD));
}

export function spawnOffscreen(w: World, type: number, elite = false): number {
  const sp = w.tuning.spawns;
  ringPoint(w, sp.minDist, sp.maxDist, 0, 0, tmp);
  return spawnEnemy(w, type, tmp[0], tmp[1], elite);
}

/** Recycle a straggler: move it back onto the ring, ahead of where the player is heading. */
export function placeOffscreen(w: World, i: number): void {
  const e = w.enemies;
  const sp = w.tuning.spawns;
  ringPoint(w, sp.minDist, sp.maxDist, w.player.vx * 3, w.player.vz * 3, tmp);
  const y = w.terrain.height(tmp[0], tmp[1]);
  e.x[i] = e.px[i] = tmp[0];
  e.z[i] = e.pz[i] = tmp[1];
  e.y[i] = e.py[i] = y;
  e.kx[i] = e.kz[i] = 0;
  e.state[i] = 0;
}

function aliveRegular(w: World): number {
  return w.director.bossUid ? w.enemies.count - 1 : w.enemies.count;
}

function runEvent(w: World, ev: WaveEvent): void {
  const type = enemyIndex(ev.enemy);
  const p = w.player;
  if (ev.banner !== undefined) w.events.push(Ev.Banner, 0, 0, 0, 0, 0, 0, ev.banner);
  switch (ev.kind) {
    case 'ring': {
      const r = 24;
      for (let k = 0; k < ev.count; k++) {
        const a = (k / ev.count) * Math.PI * 2;
        spawnEnemy(w, type, p.x + Math.sin(a) * r, p.z + Math.cos(a) * r);
      }
      break;
    }
    case 'swarm': {
      ringPoint(w, w.tuning.spawns.minDist - 6, w.tuning.spawns.minDist, 0, 0, tmp);
      for (let k = 0; k < ev.count; k++) {
        spawnEnemy(w, type, tmp[0] + (w.rng.next() - 0.5) * 8, tmp[1] + (w.rng.next() - 0.5) * 8);
      }
      break;
    }
    case 'horde':
      for (let k = 0; k < ev.count; k++) spawnOffscreen(w, type);
      break;
    case 'elite':
      for (let k = 0; k < ev.count; k++) {
        ringPoint(w, 34, 42, 0, 0, tmp);
        spawnEnemy(w, type, tmp[0], tmp[1], true);
      }
      break;
    case 'boss':
      spawnBoss(w, type);
      break;
  }
}

export function updateDirector(w: World): void {
  const d = w.director;
  const tables = tablesFor(w.map);
  if (w.options.stress > 0) {
    let budget = 60;
    const roster = tables.stress;
    while (w.enemies.count < w.options.stress && budget-- > 0) {
      spawnOffscreen(w, roster[w.rng.int(roster.length)]);
    }
    // keep a large projectile population alive too (piercing, long-lived)
    const wi = w.weapons[0];
    const want = Math.floor(w.options.stress * 0.4);
    budget = 40;
    while (wi && w.projectiles.count < want && budget-- > 0) {
      const a = w.rng.next() * Math.PI * 2;
      const p = w.player;
      const i = spawnProjectile(w, wi, STRESS_SHOT, p.x, p.y + 1, p.z, Math.sin(a), Math.cos(a), Motion.Linear);
      if (i >= 0) w.projectiles.visual[i] = 1;
    }
    return;
  }

  const waves = w.map.waves;
  const events = w.map.events;
  let segIdx = 0;
  for (let k = 0; k < waves.length; k++) if (waves[k].start <= w.time) segIdx = k;
  const seg = waves[segIdx];
  const mix = tables.mix[segIdx];
  d.lastSegment = segIdx;

  const alive = aliveRegular(w);
  const sp = w.tuning.spawns;
  if (alive < seg.maxAlive * sp.maxAliveMult) {
    const base = seg.rate * sp.rateMult;
    const rate = alive < seg.minAlive * sp.minAliveMult ? base * 3 : base;
    d.spawnAcc += rate * DT;
    let budget = 20;
    while (d.spawnAcc >= 1 && budget-- > 0) {
      d.spawnAcc -= 1;
      const k = w.rng.weightedIndex(mix.weights);
      if (k >= 0) spawnOffscreen(w, mix.types[k]);
    }
  } else {
    d.spawnAcc = 0;
  }

  while (d.eventIndex < events.length && events[d.eventIndex].time <= w.time) {
    runEvent(w, events[d.eventIndex]);
    d.eventIndex++;
  }
}
