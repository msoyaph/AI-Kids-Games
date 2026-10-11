import { Ev } from '../core/events';
import { spawnEnemy, setBossKilledHandler } from './combat';
import type { World } from './world';

export function spawnBoss(w: World, type: number): void {
  const p = w.player;
  const a = w.rng.next() * Math.PI * 2;
  const i = spawnEnemy(w, type, p.x + Math.sin(a) * 30, p.z + Math.cos(a) * 30);
  if (i < 0) return;
  w.director.bossUid = w.enemies.uid[i];
  w.director.bossType = type;
  w.director.bossMaxHp = w.enemies.maxHp[i];
  w.events.push(Ev.BossSpawn, 0, 0, 0, 0, 0, 0, type);
}

/** Boss behaviour: writes desired velocity into out. */
export function updateBoss(w: World, i: number, _dist: number, dx: number, dz: number, out: Float32Array): void {
  const s = w.enemies.speed[i];
  out[0] = dx * s;
  out[1] = dz * s;
}

setBossKilledHandler((w, i) => {
  const e = w.enemies;
  w.director.bossUid = 0;
  w.events.push(Ev.BossDie, e.x[i], e.y[i], e.z[i], 0, 0, 0, e.type[i]);
});
