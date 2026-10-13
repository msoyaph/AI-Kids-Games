import { DT, RUN_LENGTH } from '../config/balance';
import { enemyDamageScaleWith } from '../config/tuning';
import { BANNER } from '../config/waves';
import { Ev } from '../core/events';
import { spawnEnemyHazard } from './hazards';
import { HazardKind } from './pools';
import { HAZARD_ICICLE, src, SrcKind } from './sources';
import type { World } from './world';

/**
 * Map weather: Rimewood's falling icicles and blizzard gusts. Everything random here comes
 * from `w.hazardRng`, so maps without hazards consume exactly the same main-stream numbers
 * as before hazards existed.
 */

const ICICLE_SRC = src(SrcKind.Hazard, HAZARD_ICICLE);
/** Seconds for a gust to ramp in / out. */
const GUST_RAMP = 0.6;

export function updateWeather(w: World): void {
  const hz = w.map.hazards;
  if (!hz.icicles && !hz.gusts && w.weather.blizzardT <= 0) return;
  const wt = w.weather;
  const hr = w.hazardRng;
  const k = Math.min(1, w.time / RUN_LENGTH);

  const ic = hz.icicles;
  if (ic && w.time >= wt.nextIcicle && w.director.victoryT <= 0) {
    wt.nextIcicle = w.time + (ic.interval[0] + (ic.interval[1] - ic.interval[0]) * k) * (0.8 + hr.next() * 0.4);
    const n = Math.round(ic.count[0] + (ic.count[1] - ic.count[0]) * k);
    const p = w.player;
    const dmg = ic.damage * enemyDamageScaleWith(w.time / 60, w.tuning.combat);
    for (let j = 0; j < n; j++) {
      // the first one drops where she's heading; the rest scatter around her
      const lead = j === 0 ? ic.fuse * 0.7 : 0;
      const a = hr.next() * Math.PI * 2;
      const r = j === 0 ? hr.next() * 1.5 : 3 + hr.next() * 5;
      const x = w.terrain.clampToMap(p.x + p.vx * lead + Math.sin(a) * r);
      const z = w.terrain.clampToMap(p.z + p.vz * lead + Math.cos(a) * r);
      spawnEnemyHazard(w, HazardKind.EnemySlam, x, z, ic.radius, dmg, ic.fuse + 0.05, ic.fuse, 1, 0x9fe8ff, ICICLE_SRC, 0);
    }
  }

  const gs = hz.gusts;
  if (gs) {
    if (wt.warnT > 0) {
      wt.warnT -= DT;
      if (wt.warnT <= 0) {
        wt.warnT = 0;
        wt.gustT = gs.duration;
      }
    } else if (wt.gustT > 0) {
      wt.gustT -= DT;
      if (wt.gustT <= 0) wt.gustT = 0;
    } else if (w.time >= wt.nextGust && wt.blizzardT <= 0 && w.director.victoryT <= 0) {
      const a = hr.next() * Math.PI * 2;
      wt.dirX = Math.sin(a);
      wt.dirZ = Math.cos(a);
      wt.push = gs.push;
      wt.enemyPush = gs.enemyPush;
      wt.warnT = gs.warn;
      wt.nextGust = w.time + gs.warn + gs.duration + gs.interval[0] + hr.next() * (gs.interval[1] - gs.interval[0]);
      w.events.push(Ev.Banner, 0, 0, 0, 0, 0, 0, BANNER.gust);
      w.events.push(Ev.Gust, wt.dirX, wt.dirZ, gs.warn, gs.duration);
    }
  }

  if (wt.blizzardT > 0) wt.blizzardT = Math.max(0, wt.blizzardT - DT);
}

/** 0..1 strength of the current gust (ramps in and out). */
export function gustStrength(w: World): number {
  const wt = w.weather;
  const gs = w.map.hazards.gusts;
  if (wt.gustT <= 0 || !gs) return 0;
  return Math.min(1, (gs.duration - wt.gustT) / GUST_RAMP, wt.gustT / GUST_RAMP);
}

/**
 * Wind pushing the player at (x, z), in units / s, written to out[0..1]: the gust plus
 * Old Rime's blizzard, which swirls around where it was called.
 */
export function playerWind(w: World, x: number, z: number, out: Float32Array): void {
  const wt = w.weather;
  const g = gustStrength(w) * wt.push;
  out[0] = wt.dirX * g;
  out[1] = wt.dirZ * g;
  if (wt.blizzardT > 0) {
    const dx = x - wt.blizzardX;
    const dz = z - wt.blizzardZ;
    const d = Math.hypot(dx, dz) || 1;
    const ramp = Math.min(1, wt.blizzardT / GUST_RAMP, (5.5 - wt.blizzardT) / GUST_RAMP);
    const s = 4.2 * ramp * Math.min(1, d / 6);
    // counter-clockwise swirl
    out[0] += (-dz / d) * s;
    out[1] += (dx / d) * s;
  }
}
