import { describe, expect, it } from 'vitest';
import { availableFish, castTarget, fishingPress, fishingRT, startCast, waterKind } from '../src/sim/fishing';
import { availableBugs, bugRT, swingNet } from '../src/sim/bugs';
import { assessFossil, canDonate, donateSlot, museumPercent } from '../src/sim/museum';
import { countItem, give } from '../src/sim/inventory';
import { equipKind } from '../src/sim/tools';
import { FISH_BY_ID, FOSSILS } from '../src/data/registry';
import type { FishWhere } from '../src/data/types';
import type { WeatherT } from '../src/sim/state';
import { makeGame } from './helpers';
import type { Game } from '../src/sim/game';

function step(g: Game, frames: number, held = false) {
  for (let k = 0; k < frames; k++) g.update(1 / 60, { move: { x: 0, z: 0, run: false }, actionHeld: held });
}

function standFacingWater(g: Game): boolean {
  const w = g.world;
  for (let i = 0; i < w.size * w.size; i++) {
    const x = i % w.size, z = (i / w.size) | 0;
    if (w.region(i) !== 1 || w.isWater(i) || w.obj(i) || w.structure(i)) continue;
    if (z < 2) continue;
    const n1 = w.idx(x, z - 1), n2 = w.idx(x, z - 2);
    if (waterKind(g, n1) === 'river' && waterKind(g, n2) === 'river') {
      g.state.player.x = x + 0.5;
      g.state.player.z = z + 0.5;
      g.state.player.facing = Math.PI;
      return true;
    }
  }
  return false;
}

describe('fishing', () => {
  it('always has common fish available in every location, hour and weather', () => {
    const g = makeGame(50);
    for (const w of ['sunny', 'cloudy', 'rain', 'rainbow'] as WeatherT[])
      for (let h = 0; h < 24; h++)
        for (const where of ['river', 'pond', 'sea', 'mouth'] as FishWhere[]) {
          g.state.weather.today = w;
          g.state.clock.minute = h * 60 + 30;
          const list = availableFish(g, where).filter((f) => f.rarity <= 2);
          expect(list.length, `${where} ${h}h ${w}`).toBeGreaterThanOrEqual(2);
        }
  });

  it('cast -> nibble -> bite -> press catches the fish', () => {
    const g = makeGame(51);
    give(g, 'rod_flimsy');
    equipKind(g, 'rod');
    expect(standFacingWater(g)).toBe(true);
    expect(castTarget(g)).not.toBeNull();
    expect(startCast(g)).toBe(true);
    step(g, 40);
    const rt = fishingRT(g);
    expect(rt.cast?.phase).toBe('floating');
    // put a small fish right next to the bobber
    const small = Object.values(FISH_BY_ID).find((f) => f.where.includes('river') && f.size <= 2)!;
    rt.shadows.push({ id: 999, fish: small.id, size: small.size, where: 'river', x: rt.cast!.x + 0.8, z: rt.cast!.z, tx: rt.cast!.x + 0.8, tz: rt.cast!.z, heading: 0, life: 100, state: 'wander', wait: 0 });
    let n = 0;
    while (rt.cast && rt.cast.phase !== 'bite' && n < 2000) {
      step(g, 1);
      n++;
    }
    expect(rt.cast?.phase).toBe('bite');
    fishingPress(g);
    expect(countItem(g, small.id)).toBe(1);
    expect(g.state.stats.fishCaught).toBe(1);
  });

  it('pressing during a nibble scares the fish away', () => {
    const g = makeGame(52);
    give(g, 'rod_flimsy');
    equipKind(g, 'rod');
    standFacingWater(g);
    startCast(g);
    step(g, 40);
    const rt = fishingRT(g);
    const small = Object.values(FISH_BY_ID).find((f) => f.where.includes('river') && f.size <= 2)!;
    rt.shadows.push({ id: 998, fish: small.id, size: small.size, where: 'river', x: rt.cast!.x + 0.8, z: rt.cast!.z, tx: rt.cast!.x + 0.8, tz: rt.cast!.z, heading: 0, life: 100, state: 'wander', wait: 0 });
    let n = 0;
    while (rt.cast && rt.cast.phase !== 'nibble' && n < 2000) {
      step(g, 1);
      n++;
    }
    fishingPress(g);
    expect(rt.cast?.phase).toBe('escaped');
    expect(countItem(g, small.id)).toBe(0);
  });

  it('big fish require reeling; holding at the right times lands it', () => {
    const g = makeGame(53);
    give(g, 'rod_flimsy');
    equipKind(g, 'rod');
    standFacingWater(g);
    startCast(g);
    step(g, 40);
    const rt = fishingRT(g);
    const big = Object.values(FISH_BY_ID).find((f) => f.where.includes('river') && f.size >= 5)!;
    rt.shadows.push({ id: 997, fish: big.id, size: big.size, where: 'river', x: rt.cast!.x + 0.8, z: rt.cast!.z, tx: rt.cast!.x + 0.8, tz: rt.cast!.z, heading: 0, life: 100, state: 'wander', wait: 0 });
    let n = 0;
    while (rt.cast && rt.cast.phase !== 'bite' && n < 2000) {
      step(g, 1);
      n++;
    }
    fishingPress(g);
    expect(rt.cast?.phase).toBe('reel');
    n = 0;
    while (rt.cast && rt.cast.phase === 'reel' && n < 3000) {
      const r = rt.cast.reel!;
      step(g, 1, r.cursor < r.zone);
      n++;
    }
    expect(countItem(g, big.id)).toBe(1);
  });
});

describe('bugs', () => {
  it('every hour and weather has common bugs', () => {
    const g = makeGame(60);
    for (const w of ['sunny', 'cloudy', 'rain', 'rainbow'] as WeatherT[])
      for (let h = 0; h < 24; h++) {
        g.state.weather.today = w;
        g.state.clock.minute = h * 60 + 30;
        const n = (['flowers', 'air', 'trees', 'ground', 'rocks', 'beach', 'water', 'fruit'] as const).reduce((a, hab) => a + availableBugs(g, hab).filter((b) => b.rarity <= 2).length, 0);
        expect(n, `${h}h ${w}`).toBeGreaterThanOrEqual(4);
      }
  });

  it('a swing at an unalerted bug in reach catches it', () => {
    const g = makeGame(61);
    give(g, 'net_flimsy');
    equipKind(g, 'net');
    const p = g.state.player;
    p.facing = 0;
    const rt = bugRT(g);
    rt.bugs = [{ id: 1, bug: 'bug_clover_hopper', habitat: 'ground', x: p.x, y: 0.05, z: p.z + 0.9, tile: 0, alert: 0, state: 'idle', vx: 0, vz: 0, vy: 0, t: 0, phase: 0, life: 100 }];
    swingNet(g);
    for (let k = 0; k < 60 && g.action; k++) g.update(1 / 60, null);
    expect(g.state.stats.bugsCaught).toBe(1);
  });
});

describe('museum', () => {
  it('assesses fossils and accepts each donation once', () => {
    const g = makeGame(70);
    give(g, 'fossil_unknown', 2);
    const a = assessFossil(g)!;
    expect(FOSSILS.some((f) => f.id === a)).toBe(true);
    expect(countItem(g, 'fossil_unknown')).toBe(1);
    const slot = g.state.player.inv.findIndex((s) => s?.id === a);
    expect(canDonate(g, a)).toBe(true);
    expect(donateSlot(g, slot)).toBe(true);
    expect(canDonate(g, a)).toBe(false);
    expect(museumPercent(g)).toBeGreaterThan(0);
    expect(canDonate(g, 'timber')).toBe(false);
  });
});
