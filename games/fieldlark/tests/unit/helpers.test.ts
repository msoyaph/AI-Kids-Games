/** Phase 10: farmhands (helpers) as workers: hiring, jobs, zones, skills, and saving them. */
import { describe, expect, it } from 'vitest';
import { HELPER_NAMES } from '../../src/data/cast';
import { decodeFarm, encodeFarm } from '../../src/save/save';
import { buyAnimal, animalsIn } from '../../src/sim/animals';
import { buyAndPlace } from '../../src/sim/build';
import { fieldState, plant } from '../../src/sim/fields';
import { assign, helperSlots, hire, MAX_HELPERS, PACE, SKILL_AT, skillLevel } from '../../src/sim/helpers';
import { add, count } from '../../src/sim/inventory';
import { tileAt } from '../../src/sim/map';
import type { FieldObj, OtherObj } from '../../src/sim/objects';
import { machineState } from '../../src/sim/production';
import { newFarm, type Farm } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';
import { xpForLevel } from '../../src/data/tuning';

const isWater = (x: number, z: number) => x >= 0 && z >= 0 && x < 56 && z < 56 && tileAt(x, z).water;
const fields = (farm: Farm) => farm.objects.filter((o): o is FieldObj => o.kind === 'field');
const run = (farm: Farm, seconds: number) => { for (let i = 0; i < seconds * 2; i++) advance(farm, 0.5); };
const cottage = { x: 36, z: 40 };
/** A farm in chapter 3 with plenty of coins and every level open. */
const ready = (seed = 1) => { const farm = newFarm(seed); farm.story.chapter = 2; farm.coins = 50000; farm.xp = 1e7; return farm; };
const place = (farm: Farm, def: string, x: number, z: number) => { const r = buyAndPlace(farm, { kind: 'building', def }, { x, z, rot: 0 }); if (!r.ok) throw new Error(r.why); return r.obj as OtherObj; };

describe('hiring', () => {
  it('opens a place for a helper in chapter 3, then at level 9, after chapter 6, at level 16 and from the Lab', () => {
    const farm = newFarm(1);
    expect(helperSlots(farm)).toBe(0);
    expect(hire(farm, cottage)).toBeNull();
    farm.story.chapter = 2;
    expect(helperSlots(farm)).toBe(1);
    farm.xp = xpForLevel(9);
    expect(helperSlots(farm)).toBe(2);
    farm.story.chapter = 6;
    expect(helperSlots(farm)).toBe(3);
    farm.xp = xpForLevel(16);
    expect(helperSlots(farm)).toBe(4);
    farm.flags['lab:helpers1'] = 1;
    farm.flags['lab:helpers2'] = 1;
    expect(helperSlots(farm)).toBe(MAX_HELPERS);
  });

  it('welcomes helpers by name, in order, for free', () => {
    const farm = ready();
    farm.xp = xpForLevel(9);
    const coins = farm.coins;
    expect(hire(farm, cottage)?.name).toBe(HELPER_NAMES[0]);
    expect(hire(farm, cottage)?.name).toBe(HELPER_NAMES[1]);
    expect(hire(farm, cottage)).toBeNull();
    expect(farm.coins).toBe(coins);
    expect(farm.stats.hired).toBe(2);
  });
});

describe('jobs', () => {
  it('a resting helper does nothing', () => {
    const farm = ready();
    hire(farm, cottage);
    plant(farm, fields(farm)[0]!, 'wheat', isWater);
    const before = JSON.stringify(farm.objects);
    run(farm, 30);
    expect(farm.helpers[0]!.done.water).toBe(0);
    expect(fields(farm)[0]!.watered).toBe(JSON.parse(before).find((o: FieldObj) => o.kind === 'field').watered);
  });

  it('waters growing crops in their patch, one every few seconds, and gets better with practice', () => {
    const farm = ready(3);
    hire(farm, cottage);
    assign(farm, 0, 'water', { zone: 'home' });
    for (const f of fields(farm)) plant(farm, f, 'cabbage', isWater);
    for (const f of fields(farm)) f.watered = false;
    run(farm, PACE[0] * 7);
    expect(fields(farm).every(f => f.watered)).toBe(true);
    expect(farm.helpers[0]!.done.water).toBe(6);
    expect(farm.stats['helper:water']).toBe(6);
    // practice makes faster
    expect(skillLevel(SKILL_AT[0])).toBe(2);
    expect(skillLevel(SKILL_AT[3])).toBe(5);
  });

  it('only works in the chosen patch', () => {
    const farm = ready(4);
    farm.unlocked.push('meadow');
    hire(farm, cottage);
    assign(farm, 0, 'water', { zone: 'meadow' });
    for (const f of fields(farm)) plant(farm, f, 'cabbage', isWater);
    for (const f of fields(farm)) f.watered = false;
    run(farm, 40);
    expect(fields(farm).some(f => f.watered)).toBe(false);
  });

  it('picks ready crops into the barn', () => {
    const farm = ready(5);
    hire(farm, cottage);
    assign(farm, 0, 'harvest');
    for (const f of fields(farm)) plant(farm, f, 'wheat', isWater);
    for (const f of fields(farm)) f.readyAt = farm.t;
    run(farm, PACE[0] * 7);
    expect(fields(farm).every(f => fieldState(farm, f) === 'empty')).toBe(true);
    expect(count(farm, 'wheat')).toBeGreaterThanOrEqual(18);
  });

  it('looks after the chosen animal homes: collects, feeds and brushes', () => {
    const farm = ready(6);
    const coop = place(farm, 'coop', 41, 40);
    buyAnimal(farm, coop, true);
    buyAnimal(farm, coop, true);
    add(farm, 'wheat', 1, 10);
    hire(farm, cottage);
    assign(farm, 0, 'animals', { homes: [coop.id] });
    run(farm, 40);
    const hens = animalsIn(coop);
    expect(farm.helpers[0]!.done.animals).toBeGreaterThan(0);
    expect(hens.every(a => a.fed || a.brushed) || count(farm, 'egg') > 0).toBe(true);
  });

  it('keeps a workshop making one thing while ingredients last, and collects it', () => {
    const farm = ready(7);
    const mill = place(farm, 'mill', 44, 38);
    add(farm, 'wheat', 2, 9);
    hire(farm, cottage);
    assign(farm, 0, 'workshop', { machine: mill.id, recipe: 'flour' });
    run(farm, 60 * 12);
    expect(count(farm, 'wheat')).toBeLessThan(9);
    expect(count(farm, 'flour')).toBeGreaterThan(0);
    expect(machineState(mill).queue.length + machineState(mill).shelf.length + count(farm, 'flour')).toBeGreaterThan(0);
  });

  it('sends board orders the barn can fill, but leaves story requests to you', () => {
    const farm = ready(8);
    run(farm, 30); // the board fills
    const order = farm.orders.find(o => !o.story)!;
    for (const x of order.items) add(farm, x.id, 1, x.n);
    farm.orders.unshift({ id: 999, who: 'amara', items: [{ id: 'wheat', n: 1 }], coins: 10, xp: 1, story: 'test', note: 'A story request' });
    add(farm, 'wheat', 1, 1);
    hire(farm, cottage);
    assign(farm, 0, 'deliver');
    run(farm, PACE[0] * 3);
    expect(farm.orders.some(o => o.id === order.id)).toBe(false);
    expect(farm.orders.some(o => o.id === 999)).toBe(true);
    expect(farm.stats['helper:deliveries']).toBeGreaterThanOrEqual(1);
  });
});

describe('saving helpers', () => {
  it('keeps names, jobs, settings and skills, and starts tasks fresh', () => {
    const farm = ready(9);
    hire(farm, cottage);
    assign(farm, 0, 'water', { zone: 'home' });
    farm.helpers[0]!.done.water = 25;
    for (const f of fields(farm)) plant(farm, f, 'cabbage', isWater);
    for (const f of fields(farm)) f.watered = false;
    run(farm, 3);
    const back = decodeFarm(JSON.parse(JSON.stringify(encodeFarm(farm)))).farm;
    expect(back.helpers).toHaveLength(1);
    expect(back.helpers[0]).toMatchObject({ name: HELPER_NAMES[0], job: 'water', zone: 'home', task: null });
    expect(back.helpers[0]!.done.water).toBe(farm.helpers[0]!.done.water);
    // damaged values fall back to safe ones
    const raw = JSON.parse(JSON.stringify(encodeFarm(farm)));
    raw.helpers[0].job = 'juggling';
    raw.helpers[0].zone = 'moon';
    raw.helpers.push(...Array.from({ length: 9 }, () => ({})));
    const fixed = decodeFarm(raw).farm;
    expect(fixed.helpers).toHaveLength(MAX_HELPERS);
    expect(fixed.helpers[0]).toMatchObject({ job: 'rest', zone: 'all' });
  });
});
