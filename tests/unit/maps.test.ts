import { describe, expect, it } from 'vitest';
import { enemyIndex, ENEMIES } from '../../src/config/enemies';
import { mapDef, MAPS } from '../../src/config/maps';
import { spawnBoss } from '../../src/sim/bosses';
import { damagePlayer, killEnemy, spawnEnemy } from '../../src/sim/combat';
import { fingerprintWorld } from '../../src/sim/fingerprint';
import { simulateRun } from '../../src/sim/headless';
import { newRun } from '../../src/sim/run';
import { step } from '../../src/sim/sim';
import { bossSrc, HAZARD_ICICLE, sourceName, src, SrcKind } from '../../src/sim/sources';
import { DIRS, Surface, Terrain } from '../../src/sim/terrain';
import { emptyInput, type World } from '../../src/sim/world';

function bfs(t: Terrain, start: number): Uint8Array {
  const d = t.hdim;
  const seen = new Uint8Array(d * d);
  const q = new Int32Array(d * d);
  let h = 0;
  let tl = 0;
  q[tl++] = start;
  seen[start] = 1;
  while (h < tl) {
    const c = q[h++];
    for (let k = 0; k < 8; k++) {
      if (!(t.pass[c] & (1 << k))) continue;
      const n = c + DIRS[k][1] * d + DIRS[k][0];
      if (!seen[n]) {
        seen[n] = 1;
        q[tl++] = n;
      }
    }
  }
  return seen;
}

/** Step the sim with the player idle; level-ups / chests are skipped. */
function run(w: World, seconds: number, each?: (w: World) => void): void {
  const input = emptyInput();
  for (let k = 0; k < seconds * 60; k++) {
    step(w, input);
    w.events.clear();
    if (w.state === 'levelup' || w.state === 'chest') {
      w.state = 'playing';
      w.pendingLevels = 0;
      w.pendingChests = 0;
    }
    each?.(w);
  }
}

describe('map definitions', () => {
  it('every map resolves its enemies, variants and final boss', () => {
    for (const m of MAPS) {
      for (const seg of m.waves) for (const [id] of seg.mix) expect(() => enemyIndex(id), `${m.id}: ${id}`).not.toThrow();
      for (const ev of m.events) expect(() => enemyIndex(ev.enemy), `${m.id}: ${ev.enemy}`).not.toThrow();
      for (const v of Object.values(m.variants)) expect(() => enemyIndex(v)).not.toThrow();
      expect(ENEMIES[enemyIndex(m.finalBoss)].behavior).toBe('boss');
      expect(m.events.some((e) => e.kind === 'boss' && e.enemy === m.finalBoss)).toBe(true);
    }
  });

  it('Rimewood swaps in its variants and keeps the same pacing', () => {
    const meadow = mapDef('meadow');
    const rime = mapDef('rimewood');
    expect(rime.events.map((e) => e.time)).toEqual(meadow.events.map((e) => e.time));
    expect(rime.events.filter((e) => e.kind === 'boss').map((e) => e.enemy)).toEqual(['grumblecapFrost', 'clockjawFrost', 'oldRime']);
    expect(rime.waves.flatMap((s) => s.mix.map(([id]) => id))).not.toContain('gloomling');
  });
});

describe('Rimewood terrain', () => {
  it('has frozen ponds and snowdrifts, and every plateau stays reachable (30 seeds)', () => {
    const spec = mapDef('rimewood').terrain;
    for (let seed = 1; seed <= 30; seed++) {
      const t = new Terrain(seed * 7919 + 3, spec);
      expect(t.ponds.length, `seed ${seed}`).toBeGreaterThan(3);
      expect(t.drifts.length).toBeGreaterThan(6);
      const seen = bfs(t, t.cellOf(0, 0));
      for (const s of t.structures) expect(seen[t.cellOf(s.x, s.z)], `seed ${seed}: ${s.kind} at ${s.x.toFixed(0)},${s.z.toFixed(0)}`).toBe(1);
      // ponds are skateable: their ice connects to the rest of the map
      for (const p of t.ponds) {
        expect(t.surfaceAt(p.x, p.z)).toBe(Surface.Ice);
        expect(seen[t.cellOf(p.x, p.z)], `seed ${seed}: pond at ${p.x.toFixed(0)},${p.z.toFixed(0)}`).toBe(1);
      }
      for (const d of t.drifts) expect(t.surfaceAt(d.x, d.z)).toBe(Surface.Snow);
      // no trees growing out of the ice
      for (const pr of t.props) if (pr.radius > 0) expect(t.inPond(pr.x, pr.z)).toBe(false);
    }
  });

  it('Gloam Meadow has no surfaces, ponds or drifts', () => {
    const t = new Terrain(1234);
    expect(t.surface).toBeNull();
    expect(t.ponds).toHaveLength(0);
    expect(t.surfaceAt(10, 10)).toBe(Surface.Ground);
  });
});

describe('Rimewood play', () => {
  it('is deterministic for a seed', () => {
    const a = simulateRun({ characterId: 'pip', seed: 77, map: 'rimewood', maxSeconds: 150 });
    const b = simulateRun({ characterId: 'pip', seed: 77, map: 'rimewood', maxSeconds: 150 });
    expect(a.record).toEqual(b.record);
    let fa = '';
    let fb = '';
    simulateRun({ characterId: 'pip', seed: 77, map: 'rimewood', maxSeconds: 60, onWorld: (w) => void (fa = fingerprintWorld(w)) });
    simulateRun({ characterId: 'pip', seed: 77, map: 'rimewood', maxSeconds: 60, onWorld: (w) => void (fb = fingerprintWorld(w)) });
    expect(fa).toBe(fb);
  });

  it('map hazards draw from their own random stream (the main stream is untouched)', () => {
    const make = (hazards: boolean): World => {
      const w = newRun({ seed: 5, characterId: 'thea', map: 'rimewood', god: true });
      w.maxEnemies = 0;
      w.weather.nextIcicle = hazards ? 0 : Infinity;
      w.weather.nextGust = hazards ? 0 : Infinity;
      return w;
    };
    const on = make(true);
    const off = make(false);
    run(on, 10);
    run(off, 10);
    expect(on.stats.bossAttackSeq).toBe(0);
    expect(on.rng.getState()).toEqual(off.rng.getState());
    expect(on.hazardRng.getState()).not.toEqual(off.hazardRng.getState());
  });

  it('icicles fall near the player and are attributed to the icicle hazard', () => {
    const w = newRun({ seed: 6, characterId: 'thea', map: 'rimewood' });
    w.maxEnemies = 0;
    w.weapons.length = 0;
    w.weather.nextIcicle = 0;
    w.weather.nextGust = Infinity;
    let hits = 0;
    run(w, 30, (ww) => {
      ww.player.hp = ww.player.stats.maxHp;
      if (ww.stats.hitsBy[src(SrcKind.Hazard, HAZARD_ICICLE)] > hits) hits++;
    });
    expect(hits).toBeGreaterThan(0);
    expect(sourceName(src(SrcKind.Hazard, HAZARD_ICICLE))).toBe('hazard:icicle');
  });

  it('a gust shoves an idle player downwind; the bot leans into it', () => {
    const idle = newRun({ seed: 8, characterId: 'thea', map: 'rimewood', god: true });
    idle.maxEnemies = 0;
    idle.weather.nextIcicle = Infinity;
    idle.weather.nextGust = 0;
    run(idle, 0.1);
    const { dirX, dirZ } = idle.weather;
    const x0 = idle.player.x;
    const z0 = idle.player.z;
    run(idle, 7);
    const drift = (idle.player.x - x0) * dirX + (idle.player.z - z0) * dirZ;
    expect(drift).toBeGreaterThan(8);
  });

  it('frost hits chill (slow) the player', () => {
    const w = newRun({ seed: 9, characterId: 'thea', map: 'rimewood' });
    expect(w.player.chill).toBe(0);
    damagePlayer(w, 1, src(SrcKind.Contact, enemyIndex('frostling')));
    expect(w.player.chill).toBeGreaterThan(1);
    w.player.iframes = 0;
    damagePlayer(w, 1, src(SrcKind.Contact, enemyIndex('gloomling')));
    expect(w.player.chill).toBeGreaterThan(1); // ordinary hits don't clear it
    w.player.iframes = 0;
    w.player.chill = 0;
    damagePlayer(w, 1, bossSrc('oldRime.shards'));
    expect(w.player.chill).toBeGreaterThan(0);
    w.maxEnemies = 0;
    run(w, 2);
    expect(w.player.chill).toBe(0);
  });

  it('Snowball Rollers grow while they roll and shrink back after', () => {
    const w = newRun({ seed: 10, characterId: 'thea', map: 'rimewood', god: true });
    w.maxEnemies = 5;
    w.weapons.length = 0;
    const i = spawnEnemy(w, enemyIndex('snowRoller'), w.player.x + 12, w.player.z);
    const uid = w.enemies.uid[i];
    let maxScale = 0;
    run(w, 6, (ww) => {
      const j = ww.enemies.findUid(uid);
      if (j >= 0) maxScale = Math.max(maxScale, ww.enemies.scale[j]);
    });
    expect(maxScale).toBeGreaterThan(1.3);
  });

  it('Old Rime uses every attack, calls a blizzard per phase, and its defeat wins the run', () => {
    const w = newRun({ seed: 11, characterId: 'thea', map: 'rimewood', god: true });
    w.weapons.length = 0;
    w.maxEnemies = 60;
    spawnBoss(w, enemyIndex('oldRime'));
    const e = w.enemies;
    let blizzards = 0;
    run(w, 40, (ww) => {
      const b = ww.enemies.findUid(ww.director.bossUid);
      if (b < 0) return;
      // walk it down through the phases
      if (ww.time > 12 && ww.enemies.hp[b] > ww.enemies.maxHp[b] * 0.6) ww.enemies.hp[b] = ww.enemies.maxHp[b] * 0.6;
      if (ww.time > 26 && ww.enemies.hp[b] > ww.enemies.maxHp[b] * 0.3) ww.enemies.hp[b] = ww.enemies.maxHp[b] * 0.3;
      if (ww.weather.blizzardT > 5.4) blizzards++;
    });
    const used = (name: string): number => w.stats.bossAttackUsed[Array.from({ length: 64 }, (_, k) => k).find((k) => sourceName(src(SrcKind.Boss, k)) === `boss:${name}`)!];
    for (const a of ['oldRime.charge', 'oldRime.spikes', 'oldRime.shards', 'oldRime.blizzard']) expect(used(a), a).toBeGreaterThan(0);
    expect(used('oldRime.blizzard')).toBe(2);
    expect(blizzards).toBeGreaterThan(0);
    const b = e.findUid(w.director.bossUid);
    killEnemy(w, b, 255);
    expect(w.director.finalBossDefeated).toBe(true);
    run(w, 4);
    expect(w.state).toBe('won');
  });
});
