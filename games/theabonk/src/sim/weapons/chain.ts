import { DT } from '../../config/balance';
import { sfxId } from '../../config/sfx';
import { ENEMIES } from '../../config/enemies';
import { Ev } from '../../core/events';
import { hitEnemy } from '../combat';
import type { WeaponInstance, World } from '../world';
import { nearestEnemy } from './common';

const hitList = new Int32Array(32);

/** Chain lightning: strikes the nearest enemy, then leaps to the nearest un-struck one. */
export function chain(w: World, wi: WeaponInstance): void {
  const s = wi.stats;
  wi.timer -= DT;
  if (wi.timer > 0) return;
  const p = w.player;
  const first = nearestEnemy(w, p.x, p.z, s.range);
  if (first < 0) {
    wi.timer = 0.12;
    return;
  }
  wi.timer += s.cooldown;
  const e = w.enemies;
  const buf = w.scratch;
  for (let b = 0; b < s.amount; b++) {
    let hits = 0;
    let fx = p.x;
    let fy = p.y + 1.4;
    let fz = p.z;
    // successive bolts start at a different nearby target
    let cur = b === 0 ? first : pickOther(w, p.x, p.z, s.range, first);
    if (cur < 0) break;
    const jumps = Math.min(31, Math.round(s.chain) + 1);
    for (let j = 0; j < jumps && cur >= 0; j++) {
      const def = ENEMIES[e.type[cur]];
      const tx = e.x[cur];
      const ty = e.y[cur] + def.height * e.scale[cur] * 0.6;
      const tz = e.z[cur];
      w.events.push(Ev.Lightning, fx, fy, fz, tx, ty, tz);
      hitList[hits++] = e.uid[cur];
      hitEnemy(w, cur, s.damage * (j === 0 ? 1 : 0.85), s.crit, wi.slot, tx - fx, tz - fz, 1.5, s.slow);
      fx = tx;
      fy = ty;
      fz = tz;
      // next: nearest enemy within chain range not yet struck
      const n = w.grid.query(tx, tz, s.area, buf);
      let best = -1;
      let bestD = s.area * s.area;
      for (let k = 0; k < n; k++) {
        const i = buf[k];
        if (!e.alive[i]) continue;
        const uid = e.uid[i];
        let seen = false;
        for (let h = 0; h < hits; h++) if (hitList[h] === uid) {
          seen = true;
          break;
        }
        if (seen) continue;
        const dx = e.x[i] - tx;
        const dz = e.z[i] - tz;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD) {
          bestD = d2;
          best = i;
        }
      }
      cur = best;
    }
  }
  w.events.push(Ev.Sfx, p.x, p.y, p.z, 1, 0, 0, sfxId(wi.def.sfx));
}

function pickOther(w: World, x: number, z: number, range: number, avoid: number): number {
  const buf = w.scratch2;
  const n = w.grid.query(x, z, range, buf);
  const e = w.enemies;
  for (let tries = 0; tries < 6 && n > 0; tries++) {
    const i = buf[w.rng.int(n)];
    if (i !== avoid && e.alive[i]) return i;
  }
  return avoid >= 0 && e.alive[avoid] ? avoid : -1;
}
