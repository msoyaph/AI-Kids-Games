import { sfxId } from '../../config/sfx';
import { DT } from '../../config/balance';
import { Ev } from '../../core/events';
import { damageArea } from '../combat';
import type { WeaponInstance, World } from '../world';

/** Melee aura: pulses damage + knockback on everything within `area` of the player. */
export function aura(w: World, wi: WeaponInstance): void {
  const s = wi.stats;
  wi.pulse -= DT;
  if (wi.pulse > 0) return;
  wi.pulse += s.hitInterval;
  const p = w.player;
  const hits = damageArea(w, p.x, p.z, s.area, s.damage, s.crit, wi.slot, s.knockback, s.slow);
  if (hits > 0) w.events.push(Ev.Sfx, p.x, p.y, p.z, Math.min(1, hits / 6), 0, 0, sfxId(wi.def.sfx));
  w.events.push(Ev.Ring, p.x, p.y, p.z, s.area, 0, 0, wi.def.visual.color);
}
