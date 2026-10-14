/**
 * The save format (save/codec.ts): a town comes back exactly as it went in, the biggest possible
 * town fits under the cap, and damaged or newer saves never throw.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAP, decodeTown, encodeMap, encodeTown, MAX_BUILDINGS, MAX_DECOR, readSummary } from '../../src/save/codec';
import { isBuildingDef, THINGS } from '../../src/data/things';
import { newTown } from '../../src/sim/newtown';
import { SAVE_VERSION } from '../../src/sim/state';
import { maxTown } from '../support/maxTown';

/** A town without what a save leaves out: ids, build times, the order of things, and time past a tenth of a second. */
const strip = (t: ReturnType<typeof newTown>) => ({
  ...t, version: 0, nextId: 0, t: Math.round(t.t * 10) / 10,
  things: t.things.map(({ id: _id, born: _born, pay, ...rest }) => ({ ...rest, pay: Math.round(pay) })).sort((a, b) => a.def.localeCompare(b.def) || a.x - b.x || a.z - b.z),
});

describe('the save format', () => {
  it('brings a new town back exactly', () => {
    const town = newTown(42);
    const r = decodeTown(encodeTown(town, 12));
    expect(r.status).toBe('ok');
    expect(strip(r.town)).toEqual(strip(town));
  });

  it(`keeps the biggest possible town under the ${CAP / 1024} KB cap`, () => {
    const town = maxTown();
    expect(town.things.filter(t => isBuildingDef(t.def))).toHaveLength(MAX_BUILDINGS);
    expect(town.things.filter(t => !isBuildingDef(t.def))).toHaveLength(MAX_DECOR);
    expect(encodeMap(town).length).toBeGreaterThan(6000); // the map really is the worst case
    const text = encodeTown(town, 99_999);
    expect(text.length).toBeLessThanOrEqual(CAP);
  });

  it('brings the biggest town back exactly', () => {
    const town = maxTown();
    const r = decodeTown(encodeTown(town));
    expect(r.status).toBe('ok');
    const back = r.town;
    expect(back.things).toHaveLength(town.things.length);
    expect(Array.from(back.roads)).toEqual(Array.from(town.roads));
    expect(Array.from(back.rflags)).toEqual(Array.from(town.rflags));
    expect(Array.from(back.zones)).toEqual(Array.from(town.zones));
    expect(Array.from(back.finish)).toEqual(Array.from(town.finish));
    for (let i = 0; i < town.things.length; i++) {
      const a = town.things[i]!, b = back.things[i]!;
      expect([b.def, b.x, b.z, b.rot, b.level, !!b.solar]).toEqual([a.def, a.x, a.z, a.rot, a.level, !!a.solar]);
      expect(b.look).toBe(a.look & 7);
      expect(Math.abs(b.pay - a.pay)).toBeLessThan(a.pay / 50 + 0.01);
    }
    // bus routes point at the same stops
    const defOf = (id: number) => back.things.find(t => t.id === id)?.def;
    expect(back.routes).toHaveLength(town.routes.length);
    for (const r of back.routes) { expect(r.stops).toHaveLength(town.routes[0]!.stops.length); expect(r.stops.every(id => defOf(id) === 'busstop')).toBe(true); }
    expect(back.stats).toEqual(town.stats);
    expect(back.flags).toEqual(town.flags);
    expect(back.story).toEqual(town.story);
    expect(back.history).toEqual(town.history);
    expect(back.unlocked).toEqual(town.unlocked);
    expect(back.name).toBe(town.name);
  });

  it('names every kind of thing in a word list, with room to grow', () => {
    expect(THINGS.filter(d => isBuildingDef(d.id)).length).toBeLessThanOrEqual(64);
    expect(THINGS.filter(d => !isBuildingDef(d.id)).length).toBeLessThanOrEqual(64);
  });

  it('gives the title screen a summary without decoding the town', () => {
    const town = newTown(3);
    town.name = 'Sunny Bay';
    town.story.chapter = 4;
    expect(readSummary(encodeTown(town, 140))).toMatchObject({ name: 'Sunny Bay', mode: 's', chapter: 4, pop: 140 });
    expect(readSummary('{oops')).toBeNull();
  });

  it('never throws on damage, and repairs what it can', () => {
    expect(decodeTown(null).status).toBe('broken');
    expect(decodeTown('not json').status).toBe('broken');
    expect(decodeTown('{"v":1}').status).toBe('broken');
    const good = JSON.parse(encodeTown(newTown(5)));
    // an unknown building (from some future version) is left out; the rest loads
    good.wb[0] = 'spaceport';
    const r = decodeTown(JSON.stringify(good));
    expect(r.status).toBe('repaired');
    expect(r.town.things.length).toBeGreaterThan(0);
    // silly values are clamped
    const silly = JSON.parse(encodeTown(newTown(5)));
    Object.assign(silly, { coins: -50, t: 'soon', name: 'x'.repeat(200), unlocked: ['harbor', 'moon'], story: { chapter: 1e9, done: [1, 'a'] }, cam: [1e9, -4, 99, 'z'] });
    const s = decodeTown(JSON.stringify(silly)).town;
    expect(s.coins).toBe(0);
    expect(s.t).toBe(0);
    expect(s.name).toBe('Breezeport');
    expect(s.unlocked).toEqual(['harbor']);
    expect(s.story.chapter).toBe(99);
    expect(s.story.done).toEqual(['a']);
    expect(s.cam.yawStep).toBe(7);
  });

  it('leaves a save from a newer game alone', () => {
    const newer = JSON.parse(encodeTown(newTown(5)));
    newer.v = SAVE_VERSION + 1;
    expect(decodeTown(JSON.stringify(newer)).status).toBe('future');
  });

  it('loads a real version-1 save (a bot’s town in chapter 5) exactly as it was', () => {
    const text = readFileSync(new URL('../fixtures/save-v1.json', import.meta.url), 'utf8');
    const r = decodeTown(text);
    expect(r.status).toBe('ok');
    const t = r.town;
    expect(t.name).toBe('Pebble Harbour');
    expect(t.story.chapter).toBe(4);
    expect(t.things).toHaveLength(103);
    expect(Math.round(t.coins)).toBe(2196);
    expect(t.routes).toHaveLength(1);
    expect(t.routes[0]!.stops.every(id => t.things.find(x => x.id === id)?.def === 'busstop')).toBe(true);
    expect(readSummary(text)).toMatchObject({ name: 'Pebble Harbour', chapter: 4, pop: 186 });
    // and it saves back the same
    expect(decodeTown(encodeTown(t, 186)).town.things.map(x => [x.def, x.x, x.z])).toEqual(t.things.map(x => [x.def, x.x, x.z]));
  });
});
