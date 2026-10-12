import type { World } from './world';

/**
 * FNV-1a fingerprint of the gameplay-relevant world state. Used by the golden determinism
 * test: pure refactors must leave it unchanged; intentional sim changes update it on purpose.
 */
export function fingerprintWorld(w: World): string {
  let h = 0x811c9dc5;
  const f32 = new Float32Array(1);
  const u32 = new Uint32Array(f32.buffer);
  const mixU = (v: number): void => {
    h ^= v >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  };
  const mixF = (v: number): void => {
    f32[0] = v;
    mixU(u32[0]);
  };
  const p = w.player;
  mixU(w.tick);
  mixF(p.x);
  mixF(p.y);
  mixF(p.z);
  mixF(p.hp);
  mixU(p.level);
  mixF(p.xp);
  for (const s of w.rng.getState()) mixU(s);
  mixU(w.stats.kills);
  const e = w.enemies;
  mixU(e.count);
  for (let i = 0; i < e.count; i++) {
    mixU(e.type[i]);
    mixF(e.x[i]);
    mixF(e.z[i]);
    mixF(e.hp[i]);
  }
  mixU(w.projectiles.count);
  mixU(w.gems.count);
  mixU(w.pickups.count);
  for (const wi of w.weapons) {
    mixU(wi.index);
    mixU(wi.level);
  }
  for (const pi of w.passives) {
    mixU(pi.index);
    mixU(pi.level);
  }
  return h.toString(16).padStart(8, '0');
}
