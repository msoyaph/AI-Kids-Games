/** Phase 12: channels and sprinklers, greenhouses, and the Farm Lab. */
import { describe, expect, it } from 'vitest';
import { LAB, LAB_BY_ID } from '../../src/data/lab';
import { DECOR_BY_ID } from '../../src/data/decor';
import { decodeFarm, encodeFarm } from '../../src/save/save';
import { buyAndPlace, notYet } from '../../src/sim/build';
import { DAY_SEC, SEASON_DAYS } from '../../src/sim/clock';
import { placeDecor } from '../../src/sim/decorate';
import { fieldState, plant, plow } from '../../src/sim/fields';
import { pickPlot, plantPlot, plotsOf, plotStars, plotState } from '../../src/sim/greenhouse';
import { assign, helperSlots, hire } from '../../src/sim/helpers';
import { count } from '../../src/sim/inventory';
import { cantLearn, ideasForLevels, labOpen, learn } from '../../src/sim/lab';
import { tileAt } from '../../src/sim/map';
import type { FieldObj, OtherObj } from '../../src/sim/objects';
import { slotsOf, speedOf } from '../../src/sim/production';
import { newFarm, type Farm } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';
import { autoWatered, channelAt, digChannel, sprinklerWorks, waterOpen, wetChannel } from '../../src/sim/water';
import { barnUpgradeCost, levelOf } from '../../src/sim/world';
import { xpForLevel } from '../../src/data/tuning';
import { act } from '../../src/sim/actions';

const isWater = (x: number, z: number) => x >= 0 && z >= 0 && x < 56 && z < 56 && tileAt(x, z).water;
const atChapter = (ch: number, seed = 1) => { const farm = newFarm(seed); farm.story.chapter = ch; farm.coins = 50000; farm.xp = 1e7; farm.flags.levelSeen = levelOf(farm); return farm; };
const run = (farm: Farm, seconds: number) => { for (let i = 0; i < seconds; i++) advance(farm, 1); };

/** A dry farm tile right beside the river (x 50 is water), on the home plot, with nothing on it. */
function riverEdge(farm: Farm): { x: number; z: number } {
  for (let z = 37; z < 53; z++) if (!farm.objects.some(o => o.x === 49 && o.z === z) && !tileAt(49, z).water && tileAt(50, z).water) return { x: 49, z };
  throw new Error('no river edge');
}
const clear = (farm: Farm, tiles: { x: number; z: number }[]) => { farm.objects = farm.objects.filter(o => !tiles.some(t => o.x === t.x && o.z === t.z) || o.kind === 'building'); };

describe('channels', () => {
  it('come in chapter 5, cost a little, and go on open land', () => {
    const farm = atChapter(3);
    expect(waterOpen(farm)).toBe(false);
    const e = riverEdge(farm);
    expect(digChannel(farm, e.x, e.z).ok).toBe(false);
    farm.story.chapter = 4;
    clear(farm, [e]);
    const coins = farm.coins;
    expect(digChannel(farm, e.x, e.z)).toEqual({ ok: true, wet: true });
    expect(farm.coins).toBeLessThan(coins);
    expect(farm.stats['channel-wet']).toBe(1);
    expect(digChannel(farm, e.x, e.z).ok).toBe(false);
  });

  it('a network is wet when any tile of it touches water, and dry otherwise', () => {
    const farm = atChapter(4);
    const e = riverEdge(farm);
    const line = [e, { x: e.x - 1, z: e.z }, { x: e.x - 2, z: e.z }];
    clear(farm, line);
    // dig from the far end first: dry until it reaches the river
    expect(digChannel(farm, line[2]!.x, line[2]!.z)).toEqual({ ok: true, wet: false });
    digChannel(farm, line[1]!.x, line[1]!.z);
    expect(wetChannel(farm, line[2]!.x, line[2]!.z)).toBe(false);
    digChannel(farm, line[0]!.x, line[0]!.z);
    for (const t of line) expect(wetChannel(farm, t.x, t.z)).toBe(true);
    expect(channelAt(farm, line[2]!.x, line[2]!.z)).toBe(true);
  });

  it('waters fields beside it when planted and at dawn, and counts it', () => {
    const farm = atChapter(4, 2);
    const e = riverEdge(farm);
    const fieldAt = { x: e.x - 1, z: e.z };
    clear(farm, [e, fieldAt]);
    digChannel(farm, e.x, e.z);
    const r = plow(farm, fieldAt.x, fieldAt.z);
    expect(r.ok).toBe(true);
    const f = (r as { field: FieldObj }).field;
    expect(autoWatered(farm, f.x, f.z)).toBe(true);
    plant(farm, f, 'wheat', isWater);
    expect(f.watered).toBe(true);
    expect(farm.stats['auto-watered']).toBe(1);
  });
});

describe('sprinklers', () => {
  it('work only on or beside a wet channel, and reach further with the Lab', () => {
    const farm = atChapter(4, 3);
    const e = riverEdge(farm);
    const s = { x: e.x - 1, z: e.z };
    const far = { x: e.x - 3, z: e.z };
    clear(farm, [e, s, far, { x: e.x - 2, z: e.z }]);
    expect(placeDecor(farm, 'sprinkler', { x: s.x, z: s.z, rot: 0 }).ok).toBe(true);
    expect(sprinklerWorks(farm, s.x, s.z)).toBe(false);
    digChannel(farm, e.x, e.z);
    expect(sprinklerWorks(farm, s.x, s.z)).toBe(true);
    expect(autoWatered(farm, far.x, far.z)).toBe(false);
    farm.flags['lab:sprinkler2'] = 1;
    expect(autoWatered(farm, far.x, far.z)).toBe(true);
    expect(DECOR_BY_ID.sprinkler?.chapter).toBe(4);
    const early = atChapter(3, 3);
    expect(placeDecor(early, 'sprinkler', { x: s.x, z: s.z, rot: 0 }).ok).toBe(false);
  });
});

describe('greenhouses', () => {
  const build = (farm: Farm, def = 'greenhouse') => { const r = buyAndPlace(farm, { kind: 'building', def }, { x: 44, z: 38, rot: 0 }); if (!r.ok) throw new Error(r.why); return r.obj as OtherObj; };

  it('come in chapter 6, the bigger ones through the Lab', () => {
    expect(notYet(atChapter(4), { kind: 'building', def: 'greenhouse' })).toBeTruthy();
    const farm = atChapter(5);
    expect(notYet(farm, { kind: 'building', def: 'greenhouse' })).toBeNull();
    expect(notYet(farm, { kind: 'building', def: 'greenhouse_m' })).toBeTruthy();
    farm.flags['lab:medium'] = 1;
    expect(notYet(farm, { kind: 'building', def: 'greenhouse_m' })).toBeNull();
    expect(plotsOf(build(farm, 'greenhouse_m'))).toHaveLength(8);
  });

  it('grow any crop in any season (even winter), always watered, and count the picking', () => {
    const farm = atChapter(5, 4);
    farm.t = 3 * DAY_SEC * SEASON_DAYS + 30; // the first winter
    const gh = build(farm);
    expect(plotsOf(gh)).toHaveLength(4);
    expect(plantPlot(farm, gh, 0, 'watermelon').ok).toBe(true); // a summer crop, in winter
    expect(plantPlot(farm, gh, 1, 'rice').ok).toBe(false); // rice needs its paddy
    farm.t = plotsOf(gh)[0]!.readyAt;
    expect(plotState(farm, plotsOf(gh)[0]!)).toBe('ready');
    const r = pickPlot(farm, gh, 0);
    expect(r.ok && r.stars).toBe(2);
    expect(count(farm, 'watermelon', 2)).toBeGreaterThan(0);
    expect(farm.stats['greenhouse-picked']).toBeGreaterThan(0);
    farm.flags['lab:glassstars'] = 1;
    expect(plotStars(farm)).toBe(3);
  });

  it('warm glass grows faster in winter; helpers on Harvesting pick the beds', () => {
    const farm = atChapter(5, 5);
    farm.t = 3 * DAY_SEC * SEASON_DAYS + 30;
    const gh = build(farm);
    plantPlot(farm, gh, 0, 'wheat');
    const plain = plotsOf(gh)[0]!.readyAt - farm.t;
    farm.flags['lab:warm'] = 1;
    plantPlot(farm, gh, 1, 'wheat');
    expect(plotsOf(gh)[1]!.readyAt - farm.t).toBeLessThan(plain);
    hire(farm, { x: 36, z: 40 });
    assign(farm, 0, 'harvest');
    run(farm, 200);
    expect(plotsOf(gh).filter(p => p.crop)).toHaveLength(0);
  });

  it('beds survive a save', () => {
    const farm = atChapter(5, 6);
    const gh = build(farm);
    plantPlot(farm, gh, 2, 'cabbage');
    const back = decodeFarm(JSON.parse(JSON.stringify(encodeFarm(farm)))).farm;
    const g2 = back.objects.find(o => o.id === gh.id) as OtherObj;
    expect(plotsOf(g2)[2]).toEqual(plotsOf(gh)[2]);
  });
});

describe('the Farm Lab', () => {
  it('has 24 ideas in six branches of four, all with real effects', () => {
    expect(LAB).toHaveLength(24);
    const branches = new Map<string, number>();
    for (const l of LAB) branches.set(l.branch, (branches.get(l.branch) ?? 0) + 1);
    expect([...branches.values()]).toEqual([4, 4, 4, 4, 4, 4]);
  });

  it('opens in chapter 6; each branch goes in order; ideas are spent, never bought', () => {
    const farm = atChapter(4);
    expect(labOpen(farm)).toBe(false);
    farm.story.chapter = 5;
    farm.ideas = 3;
    expect(cantLearn(farm, 'slot')).toMatch(/first/);
    expect(learn(farm, 'fast1').ok).toBe(true);
    expect(farm.ideas).toBe(2);
    expect(learn(farm, 'slot').ok).toBe(true);
    expect(farm.ideas).toBe(0);
    expect(learn(farm, 'widecan').ok).toBe(false);
    expect(farm.stats.lab).toBe(2);
  });

  it('ideas come one a level from level 3', () => {
    expect(ideasForLevels(1, 2)).toBe(0);
    expect(ideasForLevels(1, 3)).toBe(1);
    expect(ideasForLevels(4, 7)).toBe(3);
    const farm = newFarm(9);
    farm.xp = xpForLevel(4);
    run(farm, 1);
    expect(farm.ideas).toBe(2); // levels 3 and 4
    farm.xp = xpForLevel(5);
    advance(farm, 1);
    expect(farm.ideas).toBe(3);
    expect(farm.flags.levelSeen).toBe(5);
  });

  it('changes the farm: workshops, helpers, the barn, the stand and decoration sets', () => {
    const farm = atChapter(5, 10);
    const mill = buyAndPlace(farm, { kind: 'building', def: 'mill' }, { x: 44, z: 38, rot: 0 });
    const m = (mill as { obj: OtherObj }).obj;
    const slots = slotsOf(m, farm), speed = speedOf(m, farm), barn = barnUpgradeCost(farm)!;
    const before = helperSlots(farm);
    for (const id of ['fast1', 'slot', 'widecan', 'stand1', 'barn', 'skills', 'helpers1', 'pondset']) farm.flags[`lab:${id}`] = 1;
    farm.flags['set:pond'] = 1;
    expect(slotsOf(m, farm)).toBe(slots + 1);
    expect(speedOf(m, farm)).toBeLessThan(speed);
    expect(barnUpgradeCost(farm)).toBeLessThan(barn);
    expect(helperSlots(farm)).toBe(before + 1);
    expect(placeDecor(farm, 'duckstatue', { x: 41, z: 40, rot: 0 }).ok).toBe(true);
    for (const l of LAB) expect(LAB_BY_ID[l.id]).toBe(l);
  });

  it('a wide watering can waters the neighbours too', () => {
    const farm = atChapter(5, 11);
    farm.flags['lab:widecan'] = 1;
    const fields = farm.objects.filter((o): o is FieldObj => o.kind === 'field');
    for (const f of fields) { plant(farm, f, 'cabbage', isWater); f.watered = false; }
    run(farm, 1);
    const first = fields[0]!;
    // the dispatcher waters the field and the dry ones beside it
    expect(act(farm, { type: 'water', x: first.x, z: first.z }).ok).toBe(true);
    expect(fields.filter(f => f.watered).length).toBeGreaterThan(1);
    expect(fields.every(f => fieldState(farm, f) === 'growing')).toBe(true);
  });
});
