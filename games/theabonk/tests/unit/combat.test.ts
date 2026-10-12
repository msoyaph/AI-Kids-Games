import { describe, expect, it } from 'vitest';
import { enemyIndex } from '../../src/config/enemies';
import { damageAfterArmor, hitDamage, isCrit, knockbackImpulse } from '../../src/sim/damage';
import { damagePlayer, hitEnemy, spawnEnemy } from '../../src/sim/combat';
import { step } from '../../src/sim/sim';
import { createWorld, emptyInput } from '../../src/sim/world';

describe('damage math', () => {
  it('applies variance within ±10% and doubles on crit', () => {
    expect(hitDamage(10, false, 0)).toBeCloseTo(9);
    expect(hitDamage(10, false, 1)).toBeCloseTo(11);
    expect(hitDamage(10, true, 0.5)).toBeCloseTo(20);
  });

  it('crit roll compares against chance', () => {
    expect(isCrit(0.25, 0.1)).toBe(true);
    expect(isCrit(0.25, 0.3)).toBe(false);
  });

  it('armor reduces flat damage but never below 20% or 1', () => {
    expect(damageAfterArmor(10, 3)).toBe(7);
    expect(damageAfterArmor(10, 20)).toBe(2);
    expect(damageAfterArmor(2, 5)).toBe(1);
    expect(damageAfterArmor(0, 5)).toBe(0);
  });

  it('knockback respects resistance and elites', () => {
    expect(knockbackImpulse(10, 0, false)).toBe(10);
    expect(knockbackImpulse(10, 0.5, false)).toBe(5);
    expect(knockbackImpulse(10, 0.6, true)).toBe(0);
  });
});

describe('enemies', () => {
  it('dies when HP is depleted, counts the kill and drops a gem', () => {
    const w = createWorld({ seed: 1, characterId: 'thea' });
    const i = spawnEnemy(w, enemyIndex('gloomling'), 10, 0);
    expect(i).toBeGreaterThanOrEqual(0);
    hitEnemy(w, i, 1000, 0, -1, 1, 0, 0);
    expect(w.enemies.alive[i]).toBe(0);
    expect(w.stats.kills).toBe(1);
    expect(w.gems.count).toBe(1);
  });

  it('splitters split into children', () => {
    const w = createWorld({ seed: 2, characterId: 'thea' });
    const i = spawnEnemy(w, enemyIndex('blobbin'), 10, 0);
    hitEnemy(w, i, 1000, 0, -1, 1, 0, 0);
    let children = 0;
    for (let k = 0; k < w.enemies.count; k++) if (w.enemies.alive[k] && w.enemies.type[k] === enemyIndex('blobbit')) children++;
    expect(children).toBe(2);
  });

  it('elites drop a chest', () => {
    const w = createWorld({ seed: 3, characterId: 'thea' });
    const i = spawnEnemy(w, enemyIndex('gloomling'), 10, 0, true);
    expect(w.enemies.maxHp[i]).toBeGreaterThan(50);
    hitEnemy(w, i, 100000, 0, -1, 1, 0, 0);
    let chests = 0;
    for (let k = 0; k < w.pickups.count; k++) if (w.pickups.kind[k] === 3) chests++;
    expect(chests).toBe(1);
  });
});

describe('player damage', () => {
  it('uses i-frames and kills the player at 0 HP', () => {
    const w = createWorld({ seed: 4, characterId: 'thea' });
    expect(damagePlayer(w, 30)).toBe(true);
    expect(damagePlayer(w, 30)).toBe(false); // i-frames
    w.player.iframes = 0;
    w.player.hp = 5;
    damagePlayer(w, 30);
    expect(w.player.alive).toBe(false);
    expect(w.state).toBe('dead');
  });

  it('revives once when a revival is available', () => {
    const w = createWorld({ seed: 5, characterId: 'thea', meta: { revival: 1 } });
    w.player.hp = 1;
    damagePlayer(w, 50);
    expect(w.player.alive).toBe(true);
    expect(w.player.hp).toBeGreaterThan(40);
    expect(w.player.revivals).toBe(0);
  });
});

describe('simulation', () => {
  it('spawns waves and hurts an idle player over time', () => {
    const w = createWorld({ seed: 6, characterId: 'thea' });
    const input = emptyInput();
    for (let t = 0; t < 60 * 180 && w.state === 'playing'; t++) step(w, input);
    // with no weapons an idle player must eventually die
    expect(w.stats.damageTaken).toBeGreaterThan(0);
    expect(w.state).toBe('dead');
  });
});
