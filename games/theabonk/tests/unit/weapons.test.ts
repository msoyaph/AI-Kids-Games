import { describe, expect, it } from 'vitest';
import { enemyIndex } from '../../src/config/enemies';
import { WEAPONS, weaponMaxLevel } from '../../src/config/weapons';
import { spawnEnemy } from '../../src/sim/combat';
import { simulateRun } from '../../src/sim/headless';
import { newRun } from '../../src/sim/run';
import { step } from '../../src/sim/sim';
import { Motion } from '../../src/sim/pools';
import { applyChoice } from '../../src/sim/upgrades';
import { addWeapon, levelUpWeapon } from '../../src/sim/weapons';
import { emptyInput } from '../../src/sim/world';

describe('weapons', () => {
  it('every weapon config has a valid behaviour and 5 levels (base) or 1 (evolved)', () => {
    for (const w of WEAPONS) {
      expect(['aura', 'projectile', 'orbit', 'burst', 'chain', 'boomerang', 'hazard', 'homing']).toContain(w.behavior);
      expect(weaponMaxLevel(w)).toBe(w.evolved ? 1 : 5);
    }
  });

  for (const def of WEAPONS) {
    it(`${def.id} damages enemies`, () => {
      const w = newRun({ seed: 11, characterId: 'thea' });
      w.weapons.length = 0;
      w.options.god = true;
      w.maxEnemies = 40;
      const wi = addWeapon(w, def.id)!;
      expect(wi).toBeTruthy();
      for (let k = 0; k < 4; k++) levelUpWeapon(w, wi);
      // a cluster of sturdy targets near the player
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const i = spawnEnemy(w, enemyIndex('boulderback'), Math.sin(a) * (2.5 + (k % 3)), Math.cos(a) * (2.5 + (k % 3)));
        w.enemies.speed[i] = 0;
      }
      const input = emptyInput();
      for (let t = 0; t < 60 * 6; t++) {
        step(w, input);
        w.events.clear();
        if (w.state !== 'playing') w.state = 'playing';
        w.pendingLevels = 0;
        w.pendingChests = 0;
      }
      expect(wi.damageDealt).toBeGreaterThan(0);
    });
  }
});

describe('orbit weapons', () => {
  it('permanent orbiters survive the player hugging the map edge', () => {
    const w = newRun({ seed: 12, characterId: 'brindle', god: true });
    const wi = w.weapons[0];
    while (wi.level < 5) levelUpWeapon(w, wi);
    applyChoice(w, { kind: 'newPassive', id: 'hourglassSand', level: 1 });
    applyChoice(w, { kind: 'evolve', id: 'lanterns', level: 1 });
    expect(wi.def.id).toBe('everglow');
    const input = emptyInput();
    const run = (ticks: number): void => {
      for (let t = 0; t < ticks; t++) {
        step(w, input);
        w.events.clear();
        w.state = 'playing';
        w.pendingLevels = 0;
        w.pendingChests = 0;
      }
    };
    const orbiters = (): number => {
      let n = 0;
      for (let i = 0; i < w.projectiles.count; i++) if (w.projectiles.alive[i] && w.projectiles.motion[i] === Motion.Orbit) n++;
      return n;
    };
    run(30);
    const before = orbiters();
    expect(before).toBe(wi.stats.amount);
    w.player.x = 147.5;
    w.player.z = 0;
    run(120);
    expect(orbiters()).toBe(before);
  });
});

describe('headless run', () => {
  it('a bot run with Thea kills enemies and levels up', () => {
    const r = simulateRun({ characterId: 'thea', seed: 99, maxSeconds: 150 });
    expect(r.kills).toBeGreaterThan(40);
    expect(r.level).toBeGreaterThan(3);
  });
});
