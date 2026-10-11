import { describe, expect, it } from 'vitest';
import { WORLD1 } from '../../src/data/maps/world1';
import { mapById } from '../../src/data/maps';
import { traitsOf } from '../../src/data/traits';
import { ENEMIES } from '../../src/data/enemies';
import { generateWave } from '../../src/data/waves';
import { TUNING } from '../../src/data/tuning';
import type { Enemy } from '../../src/sim/enemy';
import { Ev } from '../../src/sim/events';
import { DT, Game } from '../../src/sim/Game';

const map = WORLD1[0]!;
const newGame = (): Game => {
  const g = new Game({ map, difficulty: 'normal', mode: 'campaign', seed: 11 });
  g.coins = 100_000;
  g.crystals = 6;
  for (const e of ['fire', 'water', 'nature', 'light', 'shadow', 'earth'] as const) g.chooseElement(e);
  g.sendNextWave();
  return g;
};
const spawn = (g: Game, id: Parameters<Game['debugSpawn']>[0]): Enemy => {
  const e = g.debugSpawn(id)!;
  e.hp = e.maxHp = 1000;
  e.armor = 0;
  return e;
};
const run = (g: Game, seconds: number): void => {
  for (let i = 0; i < seconds / DT; i++) g.step();
};
const events = (g: Game, type: Ev): number => {
  let n = 0;
  g.events.drain((e) => (n += e.type === type ? 1 : 0));
  return n;
};

describe('construct mechanics', () => {
  it('barriers absorb hits until they shatter; damage over time slips past', () => {
    const g = newGame();
    const e = spawn(g, 'bulwark');
    e.barrier = e.barrierMax = 100;
    g.damage(e, 60, [], -1);
    expect(e.barrier).toBe(40);
    expect(e.hp).toBe(1000);
    g.damage(e, 60, [], -1); // 40 to the barrier, 20 through
    expect(e.barrier).toBe(0);
    expect(e.hp).toBe(980);
    expect(events(g, Ev.BarrierBreak)).toBe(1);
    e.barrier = 50;
    g.damage(e, 10, [], -1, true); // dot ignores barriers
    expect(e.barrier).toBe(50);
    expect(e.hp).toBe(970);
  });

  it('cloaked constructs cannot be targeted unless a detector reveals them', () => {
    const g = newGame();
    const e = spawn(g, 'phantom');
    e.cloakTimer = 0;
    g.step();
    expect(e.cloaked).toBe(true);
    expect(e.targetable).toBe(false);
    // a Focus Lens (detector) in range reveals it
    const lens = g.build('prism', Math.floor(e.x) + 1, Math.floor(e.y) + 1)!;
    g.upgrade(lens);
    g.upgrade(lens, 1);
    expect(lens.stats.detect).toBe(true);
    g.step();
    expect(e.revealed).toBeGreaterThan(0);
    expect(e.targetable).toBe(true);
  });

  it('cloak cycles: hidden, then briefly visible', () => {
    const g = newGame();
    const e = spawn(g, 'phantom');
    const C = ENEMIES.phantom.cloak!;
    let visibleSeen = false;
    for (let i = 0; i < (C.hidden + C.visible) / DT + 2; i++) {
      g.step();
      if (e.alive && !e.cloaked) visibleSeen = true;
    }
    expect(visibleSeen).toBe(true);
  });

  it('tunnelers go under (untargetable) and surface on an open, reachable cell', () => {
    const g = newGame();
    const e = spawn(g, 'borer');
    e.burrowTimer = 0.01;
    g.step();
    expect(e.burrowed).toBe(true);
    expect(e.targetable).toBe(false);
    run(g, ENEMIES.borer.burrow!.duration + 0.2);
    expect(e.burrowed).toBe(false);
    expect(g.grid.isOpen(e.cell)).toBe(true);
    expect(g.flow.dist[e.cell]!).toBeLessThan(1e6);
    expect(events(g, Ev.Burrow)).toBe(2);
  });

  it('jammers warn first, then knock nearby towers offline', () => {
    const g = newGame();
    const e = spawn(g, 'jammer');
    const t = g.build('arrow', Math.floor(e.x) + 1, Math.floor(e.y))!;
    e.attackTimer = 0.01;
    g.step();
    expect(e.windup).toBeGreaterThan(0);
    expect(events(g, Ev.Warn)).toBe(1);
    expect(t.disabled).toBe(0);
    run(g, ENEMIES.jammer.emp!.windup + 0.1);
    expect(t.disabled).toBeGreaterThan(0);
    // offline towers do not fire
    const fired = t.sinceFire;
    run(g, 0.5);
    expect(t.sinceFire).toBeGreaterThan(fired);
  });

  it('regeneration waits for a pause in damage and is blocked by burn or poison', () => {
    const g = newGame();
    const e = spawn(g, 'hulk');
    e.hp = 500;
    e.sinceHit = 99;
    run(g, 1);
    expect(e.hp).toBeGreaterThan(500);
    const hp = e.hp;
    e.burnDps = 0.0001;
    e.burnTime = 5;
    run(g, 1);
    expect(e.hp).toBeLessThanOrEqual(hp);
  });

  it('resistant constructs take half damage from their resisted element', () => {
    const g = newGame();
    const e = spawn(g, 'gloop');
    e.element = null;
    e.resist = 'fire';
    const a = g.damage(e, 100, ['fire'], -1);
    const b = g.damage(e, 100, ['water'], -1);
    expect(a).toBeCloseTo(b * TUNING.combat.resistMult, 5);
  });
});

describe('boss phases', () => {
  it('enter at their health thresholds with a banner event and telegraphed attacks', () => {
    const g = newGame();
    const boss = spawn(g, 'bigclank');
    boss.hp = boss.maxHp * 0.59;
    g.step();
    expect(boss.phase).toBe(1);
    expect(events(g, Ev.BossPhase)).toBe(1);
    const t = g.build('arrow', Math.floor(boss.x) + 1, Math.floor(boss.y))!;
    boss.attackTimer = 0.01;
    g.step();
    expect(boss.windup).toBeGreaterThan(0);
    expect(boss.currentSpeed).toBe(0); // stands still while winding up
    run(g, 1.6);
    expect(t.disabled).toBeGreaterThan(0);
    boss.hp = boss.maxHp * 0.25;
    g.step();
    expect(boss.phase).toBe(2);
    expect(boss.armor).toBe(0.2);
    expect(boss.speedMult).toBeGreaterThan(1);
  });

  it('the Matriarch summons only away from the Citadel', () => {
    const g = newGame();
    const boss = spawn(g, 'kinggloop');
    boss.hp = boss.maxHp * 0.6;
    g.step();
    expect(boss.phase).toBe(1);
    // put her right at the gate (2–3 tiles from the Citadel)
    let cell = -1;
    for (let i = 0; i < g.grid.cols * g.grid.rows && cell < 0; i++) if (g.grid.isOpen(i) && g.flow.dist[i]! >= 2 && g.flow.dist[i]! <= 3) cell = i;
    boss.cell = cell;
    boss.x = boss.px = g.grid.cellX(cell) + 0.5;
    boss.y = boss.py = g.grid.cellY(cell) + 0.5;
    boss.wcell = cell;
    boss.wx = boss.x;
    boss.wy = boss.y;
    boss.speed = 0;
    boss.remaining = 2.5;
    boss.attackTimer = 0.01;
    run(g, 2);
    expect(boss.windup).toBe(0);
    expect(g.enemies.filter((x) => x.def.id === 'minigloop').length).toBe(0);
  });
});

describe('mechanics in waves', () => {
  it('arrive world by world', () => {
    const kinds = (mapId: string): Set<string> => {
      const m = mapById(mapId)!;
      const s = new Set<string>();
      for (let w = 1; w <= 40; w++) for (const gr of generateWave(w, m).groups) s.add(gr.enemy);
      return s;
    };
    const w1 = kinds('w1m1');
    expect(w1.has('bulwark')).toBe(true);
    expect(w1.has('phantom')).toBe(false);
    const w3 = kinds('w3m1');
    expect(w3.has('phantom')).toBe(true);
    expect(w3.has('jammer')).toBe(true);
    expect(w3.has('borer')).toBe(false);
    expect(kinds('w4m1').has('borer')).toBe(true);
    // every new construct shows its mechanic as a trait
    expect(traitsOf(ENEMIES.bulwark)).toContain('shield');
    expect(traitsOf(ENEMIES.phantom)).toContain('cloaked');
    expect(traitsOf(ENEMIES.borer)).toContain('tunneler');
    expect(traitsOf(ENEMIES.jammer)).toContain('disabler');
    expect(traitsOf(ENEMIES.hulk)).toContain('regen');
  });
});
