// The rules, mechanic by mechanic (the brief's list: targeting, damage and slow maths, compost,
// waves, recharge, every critter mechanic, Garden Friends, the umbrella and the basket, stars and
// the Daily seed). Each test builds a tiny level and steps the real rules.
import { describe, expect, it } from 'vitest';
import { dailyLevel } from '../../src/data/modes';
import { BOSSES, COMPOST, CRITTERS, FRIENDS, PLANTS, UMBRELLA, WAVES } from '../../src/data/tuning';
import { canPlant, command, createGame, plantAt, run, stars, step } from '../../src/sim/game';
import type { Critter, GameState, LevelSpec, Special, WaveSpec } from '../../src/sim/types';

const spec = (waves: WaveSpec[] = [], extra: Partial<LevelSpec> = {}): LevelSpec => ({ id: 'test', name: 'Test', world: 'meadow', startCompost: 2000, seedSlots: 8, waves, worms: false, ...extra });
const game = (seeds: string[], extra: Partial<LevelSpec> = {}, waves: WaveSpec[] = []) => createGame(spec(waves, extra), seeds, { seed: 7, autoCollect: false });
const plant = (g: GameState, id: string, lane: number, col: number) => {
  const card = g.cards.findIndex(c => c.plant === id);
  g.cards[card]!.wait = 0;
  expect(command(g, { type: 'plant', card, lane, col }), `plant ${id} at ${lane},${col}`).toBe(true);
};
/** Puts a critter on the board right away (bypassing the waves). */
const critter = (g: GameState, kind: string, lane: number, x: number): Critter => {
  g.spec = { ...g.spec, waves: [{ spawns: [{ critter: kind, lane, delay: 0 }] }] };
  g.wave = 0; g.nextWaveAt = g.t;
  const before = g.critters.length;
  step(g);
  const c = g.critters[before]!;
  c.x = x;
  return c;
};
const tick = (g: GameState, seconds: number) => { const end = g.t + seconds; while (g.t < end && !g.result) step(g); };

describe('planting and cards', () => {
  it('costs compost, starts the recharge, and only goes on free soil', () => {
    const g = game(['rowan', 'arrowhead'], { specials: { '2,3': 'water', '1,1': 'gap' } });
    const before = g.compost;
    plant(g, 'rowan', 0, 0);
    expect(g.compost).toBe(before - PLANTS.rowan!.cost);
    expect(g.cards[0]!.wait).toBeCloseTo(PLANTS.rowan!.recharge);
    expect(canPlant(g, 'rowan', 0, 0)).toBe(false);
    expect(canPlant(g, 'rowan', 2, 3)).toBe(false);
    expect(canPlant(g, 'arrowhead', 2, 3)).toBe(true);
    expect(canPlant(g, 'arrowhead', 2, 4)).toBe(false);
    expect(canPlant(g, 'rowan', 1, 1)).toBe(false);
  });
  it('a card is not ready again until its recharge has passed; Chamomile shortens it', () => {
    const g = game(['comfrey', 'chamomile']);
    plant(g, 'chamomile', 0, 0);
    plant(g, 'comfrey', 1, 0);
    expect(g.cards[0]!.wait).toBeCloseTo(PLANTS.comfrey!.recharge * 0.85);
    expect(command(g, { type: 'plant', card: 0, lane: 2, col: 0 })).toBe(false);
    tick(g, PLANTS.comfrey!.recharge);
    expect(command(g, { type: 'plant', card: 0, lane: 2, col: 0 })).toBe(true);
  });
});

describe('shooting and shooing', () => {
  it('a Rowan fires only when a critter is ahead in its lane, and its berry shoos the first one', () => {
    const g = game(['rowan']);
    plant(g, 'rowan', 2, 1);
    tick(g, 3);
    expect(g.shots).toHaveLength(0);
    const near = critter(g, 'snail', 2, 6), far = critter(g, 'snail', 2, 8);
    tick(g, 2);
    expect(near.patience).toBeLessThan(near.max);
    expect(far.patience).toBe(far.max);
  });
  it('a critter behind the plant, or in another lane, is never a target', () => {
    const g = game(['rowan']);
    plant(g, 'rowan', 2, 4);
    critter(g, 'snail', 2, 2).heldUntil = 1e9;
    critter(g, 'snail', 3, 7).heldUntil = 1e9;
    tick(g, 4);
    expect(g.shots).toHaveLength(0);
  });
  it('a shield takes straight shots first; lobs go over it; a frog\'s umbrella stops lobs', () => {
    const g = game(['rowan', 'maple']);
    const beetle = critter(g, 'beetle', 1, 7);
    beetle.heldUntil = 1e9;
    plant(g, 'rowan', 1, 0);
    tick(g, 4);
    expect(beetle.shield).toBeLessThan(CRITTERS.beetle!.shield!);
    expect(beetle.patience).toBe(beetle.max);
    const g2 = game(['maple']);
    const b2 = critter(g2, 'beetle', 1, 7), frog = critter(g2, 'frog', 3, 7);
    b2.heldUntil = frog.heldUntil = 1e9;
    plant(g2, 'maple', 1, 0);
    plant(g2, 'maple', 3, 0);
    tick(g2, 4);
    expect(b2.shield).toBe(CRITTERS.beetle!.shield);
    expect(b2.patience).toBeLessThan(b2.max);
    expect(frog.patience).toBe(frog.max);
  });
  it('Wisteria\'s pods pierce a whole line, through shields', () => {
    const g = game(['wisteria']);
    const a = critter(g, 'beetle', 0, 3.5), b = critter(g, 'snail', 0, 4.2);
    a.heldUntil = b.heldUntil = 1e9;
    plant(g, 'wisteria', 0, 0);
    tick(g, 2.5);
    expect(a.patience).toBeLessThan(a.max);
    expect(b.patience).toBeLessThan(b.max);
  });
  it('armour halves the shooing until it is worn away', () => {
    const g = game([]);
    const r = critter(g, 'roly-poly', 2, 5);
    r.heldUntil = 1e9;
    g.shots.push({ id: 999, kind: 'berry', lane: 2, x: 4.8, speed: 6, power: 100, pierce: false, hit: [], lob: null, air: false, glide: 99 });
    tick(g, 0.2);
    expect(r.armour).toBe(CRITTERS['roly-poly']!.armour! - 50);
    expect(r.patience).toBe(r.max);
  });
  it('a critter out of patience poofs, runs home, and leaves leaves worth compost', () => {
    const g = game([]);
    const s = critter(g, 'snail', 2, 5);
    s.patience = 1;
    s.heldUntil = 1e9;
    g.shots.push({ id: 999, kind: 'berry', lane: 2, x: 4.8, speed: 6, power: 20, pierce: false, hit: [], lob: null, air: false, glide: 99 });
    tick(g, 0.3);
    expect(g.critters).toHaveLength(0);
    expect(g.pickups[0]).toMatchObject({ from: 'leaves', worth: CRITTERS.snail!.points * COMPOST.leafPerPoint });
  });
});

describe('slowing, holding and pushing', () => {
  it('Lamb\'s Ear slows critters in reach by its factor, and only them', () => {
    const g = game(['lambs-ear']);
    plant(g, 'lambs-ear', 2, 3);
    const close = critter(g, 'snail', 2, 5.1), far = critter(g, 'snail', 2, 8);
    const x0 = close.x, f0 = far.x;
    tick(g, 1);
    expect((x0 - close.x) / (f0 - far.x)).toBeCloseTo(PLANTS['lambs-ear']!.slow!, 1);
  });
  it('Hop Vine holds the front critter; Lavender pushes it back a tile', () => {
    const g = game(['hop-vine', 'lavender']);
    plant(g, 'hop-vine', 0, 2);
    const held = critter(g, 'snail', 0, 4);
    tick(g, 3);
    expect(held.heldUntil).toBeGreaterThan(0);
    const g2 = game(['lavender']);
    plant(g2, 'lavender', 0, 2);
    const pushed = critter(g2, 'snail', 0, 4);
    tick(g2, 4);
    expect(pushed.x).toBeGreaterThan(4);
  });
  it('Nasturtium calls critters over from the next lane, once', () => {
    const g = game(['nasturtium']);
    plant(g, 'nasturtium', 2, 2);
    const c = critter(g, 'snail', 1, 4);
    tick(g, 2);
    expect(c.lane).toBe(2);
    expect(c.lured).toBe(true);
  });
});

describe('critter mechanics', () => {
  it('nibbling wilts a plant (the tile is free again)', () => {
    const g = game(['rowan']);
    plant(g, 'rowan', 2, 3);
    critter(g, 'goat', 2, 4.2);
    tick(g, 6);
    expect(plantAt(g, 2, 3)).toBeNull();
    expect(g.stats.wilted).toBe(1);
  });
  it('a grasshopper hops over plants, but not over a tall or tangly one', () => {
    const g = game(['comfrey', 'boxwood']);
    plant(g, 'comfrey', 1, 3);
    const hopper = critter(g, 'grasshopper', 1, 4.3);
    tick(g, 1.5);
    expect(hopper.x).toBeLessThan(3);
    const g2 = game(['boxwood']);
    plant(g2, 'boxwood', 1, 3);
    const h2 = critter(g2, 'grasshopper', 1, 4.3);
    tick(g2, 2);
    expect(h2.x).toBeGreaterThan(3.9);
    expect(h2.mood).toBe('nibble');
  });
  it('a vole travels underground (out of reach), with a molehill warning, and pops up mid-lane', () => {
    const g = game([]);
    g.spec = { ...g.spec, waves: [{ spawns: [{ critter: 'vole', lane: 2, delay: 0 }] }] };
    g.nextWaveAt = 0;
    step(g);
    expect(g.events.some(e => e.type === 'molehill')).toBe(true);
    const vole = g.critters[0]!;
    expect(vole.under).toBe(true);
    tick(g, 30);
    expect(vole.under).toBe(false);
    expect(vole.x).toBeLessThanOrEqual(CRITTERS.vole!.digTo!);
  });
  it('a magpie borrows a plant and drops it a couple of tiles on, and never takes a snack', () => {
    const g = game(['comfrey']);
    plant(g, 'comfrey', 3, 6);
    critter(g, 'magpie', 3, 7);
    tick(g, 12);
    expect(plantAt(g, 3, 6)).toBeNull();
    expect(g.grid[3]!.some(t => t.kind === 'plant')).toBe(true);
    tick(g, 30);
    expect(g.snacks).toBe(3);
  });
  it('a packrat trades a plant for a pebble and heads home; tapping the pebble clears it', () => {
    const g = game(['comfrey']);
    plant(g, 'comfrey', 0, 4);
    critter(g, 'snail', 4, 9).heldUntil = 1e9; // someone still in the garden, so the level goes on
    critter(g, 'packrat', 0, 5.3);
    tick(g, 1);
    expect(g.grid[0]![4]!.kind).toBe('pebble');
    expect(g.critters.find(c => c.kind === 'packrat')!.withSnack).toBe(true);
    expect(command(g, { type: 'clear', lane: 0, col: 4 })).toBe(true);
    expect(g.grid[0]![4]!.kind).toBe('free');
  });
  it('moths wait at a lantern once; owlets are in reach by a lantern; moths flutter low enough for any plant', () => {
    const lanterns: Record<string, Special> = { '1,5': 'lantern', '3,4': 'lantern' };
    const g = game(['rowan'], { dusk: true, specials: lanterns });
    const moth = critter(g, 'moths', 1, 5.9);
    tick(g, 1.5);
    expect(moth.waited).toBe(true);
    expect(moth.heldUntil).toBeGreaterThan(g.t);
    const g2 = game(['rowan'], { dusk: true, specials: lanterns });
    const owl = critter(g2, 'owlet', 3, 5.0), far = critter(g2, 'owlet', 0, 6);
    owl.heldUntil = far.heldUntil = 1e9;
    plant(g2, 'rowan', 3, 0);
    plant(g2, 'rowan', 0, 0);
    tick(g2, 3);
    expect(owl.patience).toBeLessThan(owl.max);
    expect(far.patience).toBe(far.max);
  });
  it('hot tiles dry plants out unless a channel is next to them or the plant is heatproof', () => {
    const g = game(['rowan', 'agave'], { specials: { '0,3': 'hot', '1,3': 'hot', '1,4': 'water', '2,3': 'hot' } });
    plant(g, 'rowan', 0, 3);
    plant(g, 'rowan', 1, 3);
    plant(g, 'agave', 2, 3);
    tick(g, 20);
    expect(plantAt(g, 0, 3)!.health).toBeLessThan(plantAt(g, 0, 3)!.max);
    expect(plantAt(g, 1, 3)!.health).toBe(plantAt(g, 1, 3)!.max);
    expect(plantAt(g, 2, 3)!.health).toBe(plantAt(g, 2, 3)!.max);
  });
  it('a sprinkler makes a plant act faster; gaps slow walkers but not floaters; updrafts speed flyers', () => {
    const fires = (sp?: Special) => {
      const g = game(['rowan'], sp ? { specials: { '2,1': sp } } : {});
      plant(g, 'rowan', 2, 1);
      critter(g, 'badger', 2, 8).heldUntil = 1e9;
      let n = 0;
      for (let i = 0; i < 60 * 20; i++) { step(g); n += g.events.filter(e => e.type === 'fire').length; g.events.length = 0; }
      return n;
    };
    expect(fires('sprinkler')).toBeGreaterThan(fires());
    const g = game([], { specials: { '2,5': 'gap', '3,5': 'gap', '4,5': 'updraft' } });
    const walker = critter(g, 'snail', 2, 5.9), floater = critter(g, 'sheep', 3, 5.9), flyer = critter(g, 'seagull', 4, 5.9);
    tick(g, 1);
    expect(5.9 - walker.x).toBeCloseTo(CRITTERS.snail!.speed * 0.6, 1);
    expect(5.9 - floater.x).toBeCloseTo(CRITTERS.sheep!.speed, 1);
    expect(5.9 - flyer.x).toBeGreaterThan(CRITTERS.seagull!.speed * 1.2);
  });
  it('dusk bloomers sleep in daylight', () => {
    const g = game(['primrose']);
    plant(g, 'primrose', 2, 0);
    critter(g, 'snail', 2, 6).heldUntil = 1e9;
    tick(g, 4);
    expect(g.shots).toHaveLength(0);
  });
  it('bosses have their tricks: the Grand Snail calls ants', () => {
    const g = game([]);
    critter(g, 'grand-snail', 2, 9).heldUntil = 1e9;
    expect(g.critters[0]!.boss).toBe(true);
    expect(g.critters[0]!.patience).toBe(BOSSES['grand-snail']!.patience);
    tick(g, 8);
    expect(g.critters.filter(c => c.kind === 'ants').length).toBeGreaterThanOrEqual(2);
  });
});

describe('compost', () => {
  it('worms surface on their own; pickups wait to be tapped, then sink back in', () => {
    const g = createGame(spec([], { worms: true }), [], { seed: 3, autoCollect: false });
    tick(g, COMPOST.firstWorm + 0.1);
    expect(g.pickups).toHaveLength(1);
    const id = g.pickups[0]!.id, before = g.compost;
    expect(command(g, { type: 'collect', pickup: id })).toBe(true);
    expect(g.compost).toBe(before + COMPOST.pickup);
    tick(g, COMPOST.wormEvery + COMPOST.wormJitter + 0.1);
    expect(g.pickups.length).toBeGreaterThan(0);
    tick(g, COMPOST.pickupLife + 0.1);
    expect(g.pickups.every(p => g.t - p.bornAt < COMPOST.pickupLife)).toBe(true);
  });
  it('auto-collect gathers pickups by itself', () => {
    const g = createGame(spec([], { worms: true }), [], { seed: 3, autoCollect: true });
    const before = g.compost;
    tick(g, COMPOST.firstWorm + COMPOST.autoCollectDelay + 0.2);
    expect(g.compost).toBe(before + COMPOST.pickup);
  });
  it('Comfrey makes compost; next to Yarrow (Garden Friends) it makes more; Yarrow counts its neighbours', () => {
    const made = (seeds: string[], put: [string, number, number][]) => {
      const g = game(seeds);
      for (const [id, l, c] of put) plant(g, id, l, c);
      tick(g, PLANTS.comfrey!.every * 1.2);
      return g.pickups.filter(p => p.from === 'plant' && p.lane === put[0]![1]).map(p => p.worth);
    };
    expect(made(['comfrey'], [['comfrey', 0, 0]])).toEqual([PLANTS.comfrey!.makes]);
    expect(made(['comfrey', 'yarrow'], [['comfrey', 0, 0], ['yarrow', 4, 0]])).toEqual([PLANTS.comfrey!.makes]);
    expect(made(['comfrey', 'yarrow'], [['comfrey', 0, 0], ['yarrow', 1, 0]])[0]).toBe(Math.round(PLANTS.comfrey!.makes! * (1 + FRIENDS.yarrowComfrey)));
  });
});

describe('Garden Friends', () => {
  it('a Rowan beside a Comfrey shoos harder', () => {
    const power = (friend: boolean) => {
      const g = game(['rowan', 'comfrey']);
      plant(g, 'rowan', 2, 1);
      if (friend) plant(g, 'comfrey', 2, 0);
      critter(g, 'badger', 2, 8).heldUntil = 1e9;
      tick(g, 2);
      return g.shots[0]?.power ?? 0;
    };
    expect(power(true)).toBeCloseTo(power(false) * (1 + FRIENDS.comfreyRowan));
  });
  it('Nasturtium draws nibbling off its neighbours', () => {
    const left = (friend: boolean) => {
      const g = game(['boxwood', 'nasturtium']);
      plant(g, 'boxwood', 2, 3);
      if (friend) plant(g, 'nasturtium', 1, 3);
      critter(g, 'goat', 2, 4.3);
      tick(g, 5);
      return plantAt(g, 2, 3)!.health;
    };
    expect(left(true)).toBeGreaterThan(left(false));
  });
});

describe('the umbrella and the snack basket', () => {
  it('the first critter at the blanket opens the lane\'s umbrella and spooks the lane back; then snacks go', () => {
    const g = game([]);
    const a = critter(g, 'mouse', 2, 0.1), b = critter(g, 'snail', 2, 2);
    tick(g, 0.6);
    expect(g.umbrellas[2]).toBe(false);
    expect(a.x).toBeGreaterThanOrEqual(UMBRELLA.backTo - 0.5);
    expect(b.x).toBeGreaterThanOrEqual(UMBRELLA.backTo - 0.5);
    expect(g.snacks).toBe(3);
    a.x = 0.1;
    tick(g, 0.6);
    expect(g.snacks).toBe(2);
  });
  it('an ant column takes one snack together', () => {
    const g = game([], { umbrellas: false });
    g.spec = { ...g.spec, waves: [{ spawns: [{ critter: 'ants', lane: 1, delay: 0 }] }] };
    g.nextWaveAt = 0;
    step(g);
    for (const c of g.critters) c.x = 0.05 + (c.x - g.critters[0]!.x) * 0.2;
    tick(g, 2);
    expect(g.snacks).toBe(2);
  });
  it('three snacks gone is a gentle loss; a win scores a star per snack left', () => {
    const g = game([], { umbrellas: false });
    for (let i = 0; i < 3; i++) critter(g, 'mouse', i, 0.05 + i * 0.01);
    tick(g, 1);
    expect(g.result).toBe('lost');
    const w = createGame(spec([{ spawns: [{ critter: 'snail', lane: 2, delay: 0 }] }], { prePlanted: [{ plant: 'rowan', lane: 2, col: 0 }, { plant: 'rowan', lane: 2, col: 1 }] }), [], { seed: 1 });
    run(w, 300);
    expect(w.result).toBe('won');
    expect(stars(w)).toBe(3);
  });
  it('the snack cart: only the cart\'s lane can lose a snack', () => {
    const g = game([], { umbrellas: false, cartEvery: 1000 });
    critter(g, 'snail', 4, 9).heldUntil = 1e9;
    critter(g, 'mouse', 0, 0.05);
    tick(g, 1);
    expect(g.snacks).toBe(3);
    critter(g, 'mouse', g.cartLane, 0.05);
    tick(g, 1);
    expect(g.snacks).toBe(2);
  });
});

describe('waves, determinism and the Daily', () => {
  it('the first wave starts after the calm, and groups come as three', () => {
    const g = createGame(spec([{ spawns: [{ critter: 'ants', lane: 0, delay: 0 }, { critter: 'snail', lane: 1, delay: 1 }] }]), [], { seed: 1 });
    tick(g, WAVES.calm - 0.5);
    expect(g.critters).toHaveLength(0);
    tick(g, 2);
    expect(g.critters.filter(c => c.kind === 'ants')).toHaveLength(3);
    expect(g.critters.filter(c => c.kind === 'snail')).toHaveLength(1);
  });
  it('the same seed plays the same level', () => {
    const play = () => { const g = createGame(spec([{ spawns: Array.from({ length: 8 }, (_, i) => ({ critter: 'snail', lane: -1, delay: i * 2 })) }], { worms: true }), [], { seed: 42 }); run(g, 120); return JSON.stringify(g.critters.map(c => [c.lane, c.x.toFixed(3)])) + g.compost; };
    expect(play()).toBe(play());
  });
  it('the Daily garden is the same for everyone on a date, and changes from day to day', () => {
    const a = dailyLevel('2026-10-14', ['rowan', 'comfrey']), b = dailyLevel('2026-10-14', ['rowan', 'comfrey']), c = dailyLevel('2026-10-15', ['rowan', 'comfrey']);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a.waves)).not.toBe(JSON.stringify(c.waves));
  });
});
