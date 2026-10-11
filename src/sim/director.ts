import { DT, SPAWN } from '../config/balance';
import { ENEMIES, enemyIndex } from '../config/enemies';
import { WAVES, WAVE_EVENTS } from '../config/waves';
import type { WaveEvent } from '../config/types';
import { Ev } from '../core/events';
import { spawnBoss } from './bosses';
import { spawnEnemy } from './combat';
import type { World } from './world';

/** Pre-resolved spawn tables per wave segment. */
const MIX = WAVES.map((seg) => ({
  types: Int32Array.from(seg.mix.map(([id]) => enemyIndex(id))),
  weights: Float32Array.from(seg.mix.map(([, wgt]) => wgt)),
}));

const NON_BOSS_TYPES = Int32Array.from(ENEMIES.map((d, i) => (d.behavior === 'boss' || d.id === 'blobbit' ? -1 : i)).filter((i) => i >= 0));

const tmp = new Float32Array(2);

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
    if (x > -half && x < half && z > -half && z < half) {
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
  ringPoint(w, SPAWN.minDist, SPAWN.maxDist, 0, 0, tmp);
  return spawnEnemy(w, type, tmp[0], tmp[1], elite);
}

/** Recycle a straggler: move it back onto the ring, ahead of where the player is heading. */
export function placeOffscreen(w: World, i: number): void {
  const e = w.enemies;
  ringPoint(w, SPAWN.minDist, SPAWN.maxDist, w.player.vx * 3, w.player.vz * 3, tmp);
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
      ringPoint(w, SPAWN.minDist - 6, SPAWN.minDist, 0, 0, tmp);
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
  if (w.options.stress > 0) {
    let budget = 60;
    while (w.enemies.count < w.options.stress && budget-- > 0) {
      spawnOffscreen(w, NON_BOSS_TYPES[w.rng.int(NON_BOSS_TYPES.length)]);
    }
    return;
  }

  let segIdx = 0;
  for (let k = 0; k < WAVES.length; k++) if (WAVES[k].start <= w.time) segIdx = k;
  const seg = WAVES[segIdx];
  const mix = MIX[segIdx];
  d.lastSegment = segIdx;

  const alive = aliveRegular(w);
  if (alive < seg.maxAlive) {
    const rate = alive < seg.minAlive ? seg.rate * 3 : seg.rate;
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

  while (d.eventIndex < WAVE_EVENTS.length && WAVE_EVENTS[d.eventIndex].time <= w.time) {
    runEvent(w, WAVE_EVENTS[d.eventIndex]);
    d.eventIndex++;
  }
}
