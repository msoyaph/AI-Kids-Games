import { describe, expect, it } from 'vitest';
import { PASSIVE_SLOTS, WEAPON_SLOTS } from '../../src/config/balance';
import { EVOLUTIONS, PASSIVES } from '../../src/config/passives';
import { WEAPONS } from '../../src/config/weapons';
import { newRun } from '../../src/sim/run';
import { step } from '../../src/sim/sim';
import { applyChoice, eligibleEvolutions, openChest, resolveLevelUp, rollChoices, upgradeCandidates } from '../../src/sim/upgrades';
import { addWeapon, levelUpWeapon } from '../../src/sim/weapons';
import { emptyInput, type World } from '../../src/sim/world';

function maxWeapon(w: World, id: string): void {
  const wi = w.weapons.find((x) => x.def.id === id) ?? addWeapon(w, id)!;
  while (wi.level < 5) levelUpWeapon(w, wi);
}

describe('upgrade selection', () => {
  it('offers 3 distinct choices by default', () => {
    for (let seed = 1; seed < 30; seed++) {
      const w = newRun({ seed, characterId: 'thea' });
      const c = rollChoices(w);
      expect(c.length).toBe(3);
      const keys = c.map((x) => `${x.kind}:${x.id}`);
      expect(new Set(keys).size).toBe(3);
    }
  });

  it('can offer a 4th card with high luck', () => {
    let saw4 = false;
    for (let seed = 1; seed < 40 && !saw4; seed++) {
      const w = newRun({ seed, characterId: 'thea', meta: { luck: 2 } });
      if (rollChoices(w).length === 4) saw4 = true;
    }
    expect(saw4).toBe(true);
  });

  it('never offers locked weapons, evolved forms or maxed items', () => {
    const w = newRun({ seed: 3, characterId: 'thea', unlockedWeapons: [] });
    maxWeapon(w, 'bonkRing');
    const ids = upgradeCandidates(w).map((c) => `${c.kind}:${c.id}`);
    expect(ids).not.toContain('weaponLevel:bonkRing');
    for (const def of WEAPONS) {
      if (def.evolved || def.unlock) expect(ids).not.toContain(`newWeapon:${def.id}`);
    }
  });

  it('falls back to heal/gold when the build is complete', () => {
    const w = newRun({ seed: 4, characterId: 'thea' });
    const base = WEAPONS.filter((d) => !d.evolved && !d.unlock).slice(0, WEAPON_SLOTS);
    for (const d of base) maxWeapon(w, d.id);
    for (const p of PASSIVES.slice(0, PASSIVE_SLOTS)) {
      applyChoice(w, { kind: 'newPassive', id: p.id, level: 1 });
      while (w.passives.find((x) => x.def.id === p.id)!.level < p.maxLevel) applyChoice(w, { kind: 'passiveLevel', id: p.id, level: 0 });
    }
    // evolutions may still be offered; take them all
    for (const e of eligibleEvolutions(w)) applyChoice(w, { kind: 'evolve', id: e.wi.def.id, level: 1 });
    const c = rollChoices(w);
    expect(c.every((x) => x.kind === 'heal' || x.kind === 'gold')).toBe(true);
  });

  it('applying choices adds and levels weapons/passives and recomputes stats', () => {
    const w = newRun({ seed: 5, characterId: 'thea' });
    const might0 = w.player.stats.might;
    applyChoice(w, { kind: 'newWeapon', id: 'zapJar', level: 1 });
    applyChoice(w, { kind: 'weaponLevel', id: 'zapJar', level: 2 });
    applyChoice(w, { kind: 'newPassive', id: 'whetstone', level: 1 });
    expect(w.weapons.find((x) => x.def.id === 'zapJar')!.level).toBe(2);
    expect(w.player.stats.might).toBeCloseTo(might0 + 0.1);
    // weapon damage reflects might
    const zap = w.weapons.find((x) => x.def.id === 'zapJar')!;
    expect(zap.stats.damage).toBeCloseTo((14 + 0) * (1 + w.player.stats.might));
  });

  it('level-up queue resolves one level at a time', () => {
    const w = newRun({ seed: 6, characterId: 'thea' });
    w.pendingLevels = 2;
    w.state = 'levelup';
    w.choices = rollChoices(w);
    expect(resolveLevelUp(w, w.choices[0])).toBe(true);
    expect(w.state).toBe('levelup');
    expect(resolveLevelUp(w, null)).toBe(false);
    expect(w.state).toBe('playing');
  });
});

describe('evolutions', () => {
  it('every evolution references real weapons/passives', () => {
    for (const e of EVOLUTIONS) {
      expect(WEAPONS.find((d) => d.id === e.weapon && !d.evolved)).toBeTruthy();
      expect(WEAPONS.find((d) => d.id === e.into && d.evolved)).toBeTruthy();
      expect(PASSIVES.find((p) => p.id === e.passive)).toBeTruthy();
    }
  });

  it('a maxed weapon + catalyst evolves via the level-up offer', () => {
    const w = newRun({ seed: 7, characterId: 'thea' });
    maxWeapon(w, 'bonkRing');
    expect(eligibleEvolutions(w).length).toBe(0);
    applyChoice(w, { kind: 'newPassive', id: 'kettleLid', level: 1 });
    const c = rollChoices(w);
    expect(c[0].kind).toBe('evolve');
    applyChoice(w, c[0]);
    expect(w.weapons[0].def.id).toBe('quakeCrown');
    expect(w.stats.evolutions).toBe(1);
  });

  it('chests evolve eligible weapons first', () => {
    const w = newRun({ seed: 8, characterId: 'pip' });
    maxWeapon(w, 'thistleDarts');
    applyChoice(w, { kind: 'newPassive', id: 'echoShell', level: 1 });
    const rewards = openChest(w);
    expect(rewards[0].kind).toBe('evolve');
    expect(w.weapons[0].def.id).toBe('thornstorm');
  });

  it('picking up a chest pauses the sim on the chest screen', () => {
    const w = newRun({ seed: 9, characterId: 'thea' });
    w.pendingChests = 1;
    step(w, emptyInput());
    expect(w.state).toBe('chest');
    expect(w.chestRewards.length).toBeGreaterThan(0);
  });
});

describe('shrines', () => {
  it('are placed at run start and break when bonked, granting a buff', () => {
    const w = newRun({ seed: 10, characterId: 'thea' });
    expect(w.shrines.length).toBeGreaterThan(8);
    const s = w.shrines.find((x) => x.kind === 'might' || x.kind === 'haste' || x.kind === 'fortune' || x.kind === 'ward')!;
    expect(s).toBeTruthy();
    w.options.god = true;
    for (let t = 0; t < 120 && s.alive; t++) {
      w.player.x = s.x;
      w.player.z = s.z;
      w.player.y = s.y;
      step(w, emptyInput());
      w.events.clear();
      if (w.state !== 'playing') w.state = 'playing';
      w.pendingLevels = 0;
    }
    expect(s.alive).toBe(false);
    expect(w.stats.shrinesBroken).toBe(1);
    const b = w.player.buffs;
    expect(b.might + b.haste + b.ward + b.fortune).toBeGreaterThan(0);
  });
});
