import { describe, expect, it } from 'vitest';
import { enemyIndex } from '../../src/config/enemies';
import { spawnEnemy } from '../../src/sim/combat';
import { UNREACHABLE } from '../../src/sim/flowField';
import { newRun } from '../../src/sim/run';
import { step } from '../../src/sim/sim';
import { DIRS, Terrain, type Structure } from '../../src/sim/terrain';
import { emptyInput, type World } from '../../src/sim/world';

/** Unbounded BFS over the walkability lattice from a cell. */
function reachableFrom(t: Terrain, start: number): Uint8Array {
  const d = t.hdim;
  const seen = new Uint8Array(d * d);
  const queue = new Int32Array(d * d);
  let h = 0;
  let tl = 0;
  queue[tl++] = start;
  seen[start] = 1;
  while (h < tl) {
    const c = queue[h++];
    const m = t.pass[c];
    for (let k = 0; k < 8; k++) {
      if (!(m & (1 << k))) continue;
      const n = c + DIRS[k][1] * d + DIRS[k][0];
      if (!seen[n]) {
        seen[n] = 1;
        queue[tl++] = n;
      }
    }
  }
  return seen;
}

/** Lattice cells inside a structure's footprint (shrunk a little to stay off the rim). */
function cellsIn(t: Terrain, s: Structure, inset = 0.6): number[] {
  const out: number[] = [];
  const r = Math.ceil(Math.hypot(s.hu, s.hv)) + 1;
  for (let z = Math.floor(s.z) - r; z <= s.z + r; z++) {
    for (let x = Math.floor(s.x) - r; x <= s.x + r; x++) {
      const dx = x - s.x;
      const dz = z - s.z;
      const u = dx * s.cos + dz * s.sin;
      const v = -dx * s.sin + dz * s.cos;
      if (Math.abs(u) <= s.hu - inset && Math.abs(v) <= s.hv - inset) out.push(t.cellOf(x, z));
    }
  }
  return out;
}

describe('walkability lattice', () => {
  it('every plateau top and every ramp is reachable from the meadow (50 seeds)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const t = new Terrain(seed * 104729 + 17);
      const seen = reachableFrom(t, t.cellOf(0, 0));
      for (const s of t.structures) {
        const cells = cellsIn(t, s);
        expect(cells.length, `seed ${seed} ${s.kind} at ${s.x.toFixed(0)},${s.z.toFixed(0)}`).toBeGreaterThan(0);
        const ok = cells.some((c) => seen[c]);
        expect(ok, `seed ${seed}: ${s.kind} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) unreachable`).toBe(true);
      }
    }
  });

  it('plateau walls block: leaving a plateau top means walking to a ramp', () => {
    const w = newRun({ seed: 77, characterId: 'thea' });
    const t = w.terrain;
    const mesa = t.structures.find((s) => s.kind === 'mesa' && s.y0 - s.baseY > 4)!;
    // a ground point just outside the middle of a long side
    const gx = mesa.x - mesa.sin * (mesa.hv + 2);
    const gz = mesa.z + mesa.cos * (mesa.hv + 2);
    w.flow.compute(t.cellOf(gx, gz));
    const cost = w.flow.costAt(mesa.x, mesa.z);
    expect(cost).not.toBe(UNREACHABLE);
    // the straight line is ~hv+2 units (cost 2/unit); the ramp detour is much longer
    expect(cost).toBeGreaterThan((mesa.hv + 2) * 2 * 1.6);
  });
});

/** Run the sim with the player parked; returns per-walker cell transitions. */
function trackWalkers(w: World, seconds: number, onTick?: (w: World) => void): Array<[number, number]> {
  const crossings: Array<[number, number]> = [];
  const last = new Map<number, number>();
  const input = emptyInput();
  const flyers = new Set(['gnatlet', 'gloamRegent', 'grumblecap', 'clockjaw']);
  for (let t = 0; t < seconds * 60; t++) {
    step(w, input);
    w.events.clear();
    w.state = 'playing';
    w.pendingLevels = 0;
    w.pendingChests = 0;
    onTick?.(w);
    const e = w.enemies;
    const seen = new Set<number>();
    for (let i = 0; i < e.count; i++) {
      if (!e.alive[i] || flyers.has(['gloomling', 'gnatlet', 'boulderback', 'spitcap', 'ramhorn', 'blobbin', 'blobbit', 'fusewick', 'grumblecap', 'clockjaw', 'gloamRegent'][e.type[i]])) continue;
      const uid = e.uid[i];
      seen.add(uid);
      const c = w.terrain.cellOf(e.x[i], e.z[i]);
      const prev = last.get(uid);
      if (prev !== undefined && prev !== c) crossings.push([prev, c]);
      last.set(uid, c);
    }
    for (const uid of last.keys()) if (!seen.has(uid)) last.delete(uid);
  }
  return crossings;
}

describe('enemy pathing', () => {
  it('walkers never step across a wall (player on a plateau, crowd below)', () => {
    const w = newRun({ seed: 91, characterId: 'thea', god: true });
    w.weapons.length = 0;
    const t = w.terrain;
    const mesa = t.structures.find((s) => s.kind === 'mesa' && s.y0 - s.baseY > 4)!;
    w.player.x = mesa.x;
    w.player.z = mesa.z;
    w.player.y = t.height(mesa.x, mesa.z);
    // a crowd all around the plateau
    for (let k = 0; k < 160; k++) {
      const a = (k / 160) * Math.PI * 2;
      const r = Math.max(mesa.hu, mesa.hv) + 4 + (k % 5);
      spawnEnemy(w, enemyIndex(k % 3 === 0 ? 'ramhorn' : 'gloomling'), mesa.x + Math.cos(a) * r, mesa.z + Math.sin(a) * r);
    }
    // relocations (recycling / respawn) are not steps — ignore jumps of more than one cell
    const crossings = trackWalkers(w, 25, (ww) => {
      ww.player.x = mesa.x;
      ww.player.z = mesa.z;
      ww.player.y = t.height(mesa.x, mesa.z);
      ww.player.vx = ww.player.vz = 0;
    }).filter(([a, b]) => Math.abs((a % t.hdim) - (b % t.hdim)) <= 1 && Math.abs(Math.floor(a / t.hdim) - Math.floor(b / t.hdim)) <= 1);
    expect(crossings.length).toBeGreaterThan(100);
    const illegal = crossings.filter(([a, b]) => !t.canStep(a, b));
    expect(illegal).toEqual([]);
    // and the plateau is actually contested: enemies reached the top by the ramps
    const top = mesa.y0;
    let onTop = 0;
    for (let i = 0; i < w.enemies.count; i++) if (Math.abs(w.enemies.y[i] - top) < 0.6) onTop++;
    expect(onTop).toBeGreaterThan(3);
  });

  it('an enemy on a plateau comes down by a ramp, not off the cliff', () => {
    const w = newRun({ seed: 92, characterId: 'thea', god: true });
    w.weapons.length = 0;
    w.maxEnemies = 1;
    const t = w.terrain;
    const mesa = t.structures.find((s) => s.kind === 'mesa' && s.y0 - s.baseY > 4)!;
    // player on the ground beside the plateau
    const gx = mesa.x - mesa.sin * (mesa.hv + 4);
    const gz = mesa.z + mesa.cos * (mesa.hv + 4);
    const pin = (ww: World): void => {
      ww.player.x = gx;
      ww.player.z = gz;
      ww.player.y = t.height(gx, gz);
      ww.player.vx = ww.player.vz = 0;
    };
    pin(w);
    w.flow.compute(t.cellOf(gx, gz));
    const i = spawnEnemy(w, enemyIndex('gloomling'), mesa.x, mesa.z);
    expect(i).toBeGreaterThanOrEqual(0);
    const uid = w.enemies.uid[i];
    let maxDrop = 0;
    let lastY = w.enemies.y[i];
    let usedRamp = false;
    const ramps = t.structures.filter((s) => s.kind === 'ramp');
    const input = emptyInput();
    for (let k = 0; k < 60 * 30; k++) {
      pin(w);
      step(w, input);
      w.events.clear();
      w.state = 'playing';
      const j = w.enemies.findUid(uid);
      if (j < 0) break;
      const ex = w.enemies.x[j];
      const ez = w.enemies.z[j];
      maxDrop = Math.max(maxDrop, lastY - w.enemies.y[j]);
      lastY = w.enemies.y[j];
      for (const s of ramps) {
        const dx = ex - s.x;
        const dz = ez - s.z;
        if (Math.abs(dx * s.cos + dz * s.sin) <= s.hu && Math.abs(-dx * s.sin + dz * s.cos) <= s.hv) usedRamp = true;
      }
      if (Math.hypot(ex - gx, ez - gz) < 2) break;
    }
    expect(usedRamp).toBe(true);
    expect(maxDrop).toBeLessThan(1.2); // walked down, never fell off the wall
    expect(Math.abs(lastY - t.height(gx, gz))).toBeLessThan(1.5);
  });

  it('falls back to direct chasing when the player is on an unreachable island', () => {
    const w = newRun({ seed: 93, characterId: 'thea' });
    const t = w.terrain;
    // wall off a 9x9 block around (40, 40)
    const d = t.hdim;
    const c0 = t.cellOf(40, 40);
    const ci = c0 % d;
    const cj = Math.floor(c0 / d);
    for (let j = cj - 4; j <= cj + 4; j++) for (let i = ci - 4; i <= ci + 4; i++) if (Math.abs(j - cj) === 4 || Math.abs(i - ci) === 4) t.pass[j * d + i] = 0;
    w.flow.compute(c0);
    expect(w.flow.island).toBe(true);
    expect(w.flow.reachable(-60, -60)).toBe(true); // spawns allowed anywhere in island mode
  });
});
