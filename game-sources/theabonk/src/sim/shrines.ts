import { DT } from '../config/balance';
import { SHRINES, SHRINE_COUNT, SHRINE_HP } from '../config/meta';
import type { ShrineKind } from '../config/types';
import { sfxId } from '../config/sfx';
import { Ev } from '../core/events';
import { healPlayer, spawnPickup } from './combat';
import { vacuumGems } from './pickups';
import { PickupKind } from './pools';
import { goldMult, recomputePlayerStats } from './stats';
import type { World } from './world';

const SHRINE_RADIUS = 1.7;
const RESPAWN_DELAY = 75;

export const SHRINE_KIND_INDEX: Record<ShrineKind, number> = { might: 0, haste: 1, ward: 2, magnet: 3, fortune: 4, gold: 5 };

function rollKind(w: World): ShrineKind {
  const k = w.rng.weightedIndex(SHRINES.map((s) => s.weight));
  return SHRINES[Math.max(0, k)].kind;
}

/** Scatter shrines over the precomputed spots (some sit on mesa tops). */
export function placeShrines(w: World): void {
  const spots = w.terrain.shrineSpots.slice();
  // deterministic shuffle, but keep the mesa-top spots (first entries) in the set
  for (let i = spots.length - 1; i > 4; i--) {
    const j = 4 + w.rng.int(i - 3);
    const t = spots[i];
    spots[i] = spots[j];
    spots[j] = t;
  }
  for (let i = 0; i < Math.min(SHRINE_COUNT, spots.length); i++) {
    const s = spots[i];
    w.shrines.push({ x: s.x, y: w.terrain.height(s.x, s.z), z: s.z, kind: rollKind(w), hp: SHRINE_HP, alive: true, hitCd: 0, shake: 0 });
  }
}

function applyShrine(w: World, kind: ShrineKind): void {
  const p = w.player;
  const def = SHRINES.find((s) => s.kind === kind)!;
  switch (kind) {
    case 'might':
      p.buffs.might = def.duration;
      break;
    case 'haste':
      p.buffs.haste = def.duration;
      break;
    case 'ward':
      p.buffs.ward = def.duration;
      healPlayer(w, p.stats.maxHp * 0.3);
      break;
    case 'fortune':
      p.buffs.fortune = def.duration;
      break;
    case 'magnet':
      vacuumGems(w);
      break;
    case 'gold': {
      const n = 12;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const i = spawnPickup(w, PickupKind.Coin, p.x + Math.sin(a) * 2.5, p.y, p.z + Math.cos(a) * 2.5, Math.max(1, Math.round(2 * goldMult(p.stats))));
        if (i >= 0) w.pickups.vy[i] = 7;
      }
      break;
    }
  }
  recomputePlayerStats(w);
  w.events.push(Ev.Buff, 0, 0, 0, 0, 0, 0, SHRINE_KIND_INDEX[kind]);
}

export function updateShrines(w: World): void {
  const p = w.player;
  for (const s of w.shrines) {
    if (s.shake > 0) s.shake = Math.max(0, s.shake - DT);
    if (!s.alive) {
      // respawn later somewhere away from the player
      s.hitCd -= DT;
      if (s.hitCd <= 0) {
        const spots = w.terrain.shrineSpots;
        for (let tries = 0; tries < 10; tries++) {
          const spot = spots[w.rng.int(spots.length)];
          if (Math.hypot(spot.x - p.x, spot.z - p.z) < 40) continue;
          if (w.shrines.some((o) => o.alive && Math.hypot(o.x - spot.x, o.z - spot.z) < 5)) continue;
          s.x = spot.x;
          s.z = spot.z;
          s.y = w.terrain.height(spot.x, spot.z);
          s.kind = rollKind(w);
          s.hp = SHRINE_HP;
          s.alive = true;
          s.hitCd = 0;
          break;
        }
        if (!s.alive) s.hitCd = 5;
      }
      continue;
    }
    const dx = p.x - s.x;
    const dz = p.z - s.z;
    if (dx * dx + dz * dz > SHRINE_RADIUS * SHRINE_RADIUS || Math.abs(p.y - s.y) > 2.2) {
      s.hitCd = Math.max(0, s.hitCd - DT);
      continue;
    }
    // landing on top of a shrine smashes it instantly; otherwise bonk it a few times
    const slam = p.landT === 0;
    s.hitCd -= DT;
    if (slam || s.hitCd <= 0) {
      s.hp = slam ? 0 : s.hp - 1;
      s.hitCd = 0.3;
      s.shake = 0.25;
      w.events.push(Ev.ShrineHit, s.x, s.y, s.z);
      w.events.push(Ev.Sfx, s.x, s.y, s.z, 0.8, 0, 0, sfxId('shrine'));
      if (s.hp <= 0) {
        s.alive = false;
        s.hitCd = RESPAWN_DELAY;
        w.stats.shrinesBroken++;
        const def = SHRINES.find((d) => d.kind === s.kind)!;
        w.events.push(Ev.ShrineBreak, s.x, s.y, s.z, 0, 0, 0, def.color);
        applyShrine(w, s.kind);
      }
    }
  }
}

/** Nearest alive shrine within `range` (for the HUD hint), or null. */
export function nearbyShrine(w: World, range: number): World['shrines'][number] | null {
  const p = w.player;
  let best: World['shrines'][number] | null = null;
  let bd = range * range;
  for (const s of w.shrines) {
    if (!s.alive) continue;
    const d2 = (s.x - p.x) ** 2 + (s.z - p.z) ** 2;
    if (d2 < bd) {
      bd = d2;
      best = s;
    }
  }
  return best;
}
