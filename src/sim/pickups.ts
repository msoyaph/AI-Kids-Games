import { DT, PLAYER_RADIUS } from '../config/balance';
import { Ev } from '../core/events';
import { healPlayer } from './combat';
import { gainXp } from './leveling';
import { PickupKind } from './pools';
import type { World } from './world';

const GRAVITY = 22;
const COLLECT_R = 0.9;

/** Pull every gem on the map toward the player. */
export function vacuumGems(w: World): void {
  const g = w.gems;
  for (let i = 0; i < g.count; i++) if (g.alive[i]) g.magnet[i] = 1;
  const pk = w.pickups;
  for (let i = 0; i < pk.count; i++) if (pk.alive[i] && pk.kind[i] === PickupKind.Coin) pk.magnet[i] = 1;
}

export function updateGems(w: World): void {
  const g = w.gems;
  const p = w.player;
  const t = w.terrain;
  const magnet = p.stats.magnet;
  const m2 = magnet * magnet;
  const tx = p.x;
  const ty = p.y + 0.8;
  const tz = p.z;
  const pspeed = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
  for (let i = 0; i < g.count; i++) {
    if (!g.alive[i]) continue;
    let x = g.x[i];
    let y = g.y[i];
    let z = g.z[i];
    const dx = tx - x;
    const dz = tz - z;
    const d2 = dx * dx + dz * dz;
    if (!g.magnet[i] && d2 < m2) g.magnet[i] = 1;
    if (g.magnet[i]) {
      g.pull[i] += DT;
      const dy = ty - y;
      const d = Math.sqrt(d2 + dy * dy) || 0.001;
      const sp = Math.min(60, 9 + g.pull[i] * 45 + pspeed);
      const stepLen = Math.min(d, sp * DT);
      x += (dx / d) * stepLen;
      y += (dy / d) * stepLen;
      z += (dz / d) * stepLen;
      if (d < COLLECT_R) {
        g.alive[i] = 0;
        gainXp(w, g.value[i]);
        w.events.push(Ev.Gem, x, y, z, g.value[i]);
        continue;
      }
    } else if (!g.grounded[i]) {
      g.vy[i] -= GRAVITY * DT;
      y += g.vy[i] * DT;
      const gy = t.heightAt(x, z) + 0.45;
      if (y <= gy) {
        y = gy;
        g.grounded[i] = 1;
      }
    }
    g.x[i] = x;
    g.y[i] = y;
    g.z[i] = z;
  }
}

export function updatePickups(w: World): void {
  const pk = w.pickups;
  const p = w.player;
  const t = w.terrain;
  const magnet = p.stats.magnet;
  const pspeed = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
  for (let i = 0; i < pk.count; i++) {
    if (!pk.alive[i]) continue;
    pk.age[i] += DT;
    let x = pk.x[i];
    let y = pk.y[i];
    let z = pk.z[i];
    const kind = pk.kind[i];
    const dx = p.x - x;
    const dz = p.z - z;
    const dy = p.y + 0.8 - y;
    const d = Math.sqrt(dx * dx + dz * dz + dy * dy) || 0.001;
    // coins are magnetic; hearts / magnets / chests must be walked to (short pull)
    const reach = kind === PickupKind.Coin ? magnet : 1.6;
    if (!pk.magnet[i] && d < reach) pk.magnet[i] = 1;
    if (pk.magnet[i]) {
      pk.pull[i] += DT;
      const sp = Math.min(50, 8 + pk.pull[i] * 40 + pspeed);
      const s = Math.min(d, sp * DT);
      x += (dx / d) * s;
      y += (dy / d) * s;
      z += (dz / d) * s;
    } else {
      pk.vy[i] -= GRAVITY * DT;
      y += pk.vy[i] * DT;
      const gy = t.heightAt(x, z) + 0.5;
      if (y < gy) {
        y = gy;
        pk.vy[i] = 0;
      }
    }
    pk.x[i] = x;
    pk.y[i] = y;
    pk.z[i] = z;
    if (d < COLLECT_R + PLAYER_RADIUS * 0.5) {
      collect(w, i);
    }
  }
}

function collect(w: World, i: number): void {
  const pk = w.pickups;
  const kind = pk.kind[i];
  pk.alive[i] = 0;
  w.events.push(Ev.Pickup, pk.x[i], pk.y[i], pk.z[i], 0, 0, 0, kind);
  switch (kind) {
    case PickupKind.Coin:
      w.stats.coins += pk.value[i];
      w.events.push(Ev.Coin, pk.x[i], pk.y[i], pk.z[i], pk.value[i]);
      break;
    case PickupKind.Heart:
      healPlayer(w, pk.value[i]);
      break;
    case PickupKind.Magnet:
      vacuumGems(w);
      break;
    case PickupKind.Chest:
      w.pendingChests++;
      w.stats.chestsOpened++;
      w.events.push(Ev.Chest, pk.x[i], pk.y[i], pk.z[i]);
      break;
  }
}
