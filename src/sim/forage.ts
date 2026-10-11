/** Foraging: daily seasonal forage, dig spots (artifacts), berry bushes and crab pots. */
import { CRAB_CATCH, FORAGE, FORAGE_BY_ID, JUNK } from '../data/fish';
import { ARTIFACTS } from '../data/minerals';
import { placeHooks, interactHooks } from './actions';
import { gainXp, hasPerk, level } from './skills';
import type { Sim } from './sim';
import { seasonOf } from './state';
import { registerSystem } from './systems';
import { digHooks } from './tools';
import { zoneAt } from './fishing';
import { remove } from './inventory';
import type { Loc } from './world';
import { Ter } from './terrain';

/** Forage habitat for each outdoor map. */
export const HABITAT: Record<string, 'field' | 'forest' | 'beach' | 'mountain'> = {
  farm: 'field',
  town: 'field',
  forest: 'forest',
  beach: 'beach',
  mountain: 'mountain',
  quarry: 'mountain',
};

const DAILY: Record<string, [number, number]> = { farm: [1, 3], town: [2, 4], forest: [4, 7], beach: [3, 6], mountain: [2, 4], quarry: [1, 3] };
const CAP: Record<string, number> = { farm: 8, town: 10, forest: 18, beach: 14, mountain: 10, quarry: 6 };

function openTiles(loc: Loc, onlySand = false): number[] {
  const out: number[] = [];
  for (let y = 1; y < loc.h - 1; y++)
    for (let x = 1; x < loc.w - 1; x++) {
      const t = loc.ter(x, y);
      if (onlySand ? t !== Ter.SAND : t !== Ter.GRASS && t !== Ter.FLOWERS && t !== Ter.DIRT && t !== Ter.STONEFLOOR) continue;
      if (loc.blocked(x, y) || loc.obj(x, y) || loc.soilAt(x, y) || loc.warpAtTile(x, y) || loc.triggerAt(x, y) || loc.inClearZone(x, y)) continue;
      out.push(y * loc.w + x);
    }
  return out;
}

export function spawnForage(sim: Sim, id: string): void {
  if (!sim.hasLoc(id)) return;
  const loc = sim.loc(id);
  const hab = HABITAT[id];
  const season = seasonOf(sim.state.day);
  let have = 0, spots = 0;
  for (const o of loc.objs.values()) {
    if (o.k === 'forage') have++;
    if (o.k === 'spot') spots++;
  }
  const rng = sim.rng(0xf0a, id.length * 7 + id.charCodeAt(0));
  if (id === 'forest' && ![...loc.objs.values()].some((o) => o.k === 'bush')) {
    const t = openTiles(loc);
    const brng = sim.rng(0xb05, 1);
    for (let k = 0; k < 14 && t.length; k++) {
      const i = brng.pick(t);
      if (!loc.objs.has(i)) loc.objs.set(i, { k: 'bush', id: 'berryBush', n: 0 });
    }
    loc.objVersion++;
  }
  const pool = FORAGE.filter((f) => f.where.includes(hab) && f.seasons.includes(season) && f.kind !== 'berry');
  const tiles = openTiles(loc, hab === 'beach');
  if (pool.length && tiles.length) {
    const [a, b] = DAILY[id] ?? [1, 2];
    const n = Math.min(rng.range(a, b), (CAP[id] ?? 8) - have);
    for (let k = 0; k < n; k++) {
      const i = rng.pick(tiles);
      if (loc.objs.has(i)) continue;
      loc.objs.set(i, { k: 'forage', id: rng.pick(pool).id });
      loc.touch(i % loc.w, Math.floor(i / loc.w));
    }
  }
  // dig spots (wiggly earth)
  const all = openTiles(loc);
  if (all.length && spots < 3 && rng.chance(0.6)) {
    const i = rng.pick(all);
    if (!loc.objs.has(i)) {
      loc.objs.set(i, { k: 'spot', id: 'spot' });
      loc.touch(i % loc.w, Math.floor(i / loc.w));
    }
  }
  // the quarry regrows a few ore/gem rocks every day
  if (id === 'quarry') {
    const stones = all.length ? Math.min(6, 14 - [...loc.objs.values()].filter((o) => o.k === 'ore' || o.k === 'rock' || o.k === 'gem').length) : 0;
    for (let k = 0; k < stones; k++) {
      const i = rng.pick(all);
      if (loc.objs.has(i)) continue;
      const r = rng.next();
      loc.objs.set(i, r < 0.3 ? { k: 'ore', id: rng.pick(['copperOre', 'ironOre', 'coal']), hp: 3 } : r < 0.4 ? { k: 'gem', id: rng.pick(['quartz', 'amethyst', 'topaz', 'jade']), hp: 4 } : { k: 'rock', id: rng.chance(0.3) ? 'geode0' : 'rock0', hp: 2, n: rng.int(3) });
    }
    loc.objVersion++;
  }
}

export function pickForage(sim: Sim, loc: Loc, x: number, y: number): string | null {
  const o = loc.obj(x, y);
  if (!o || o.k !== 'forage') return null;
  loc.removeObj(x, y);
  const lvl = level(sim, 'foraging');
  const rng = sim.rng(0xf0b, x, y);
  const q = rng.chance(0.03 + lvl * 0.04) ? 2 : rng.chance(0.1 + lvl * 0.05) ? 1 : 0;
  sim.give(o.id, hasPerk(sim, 'gatherer') && rng.chance(0.2) ? 2 : 1, q);
  sim.state.stats.forage++;
  gainXp(sim, 'foraging', 7);
  return o.id;
}

/** Dig spot contents: artifacts from this area, or clay/stone/seeds. */
digHooks.dig = (sim, loc, x, y) => {
  const where = loc.id;
  const rng = sim.rng(0xd16, x, y);
  const arts = ARTIFACTS.filter((a) => a.where.includes(where));
  gainXp(sim, 'foraging', 5);
  if (arts.length && rng.chance(0.55)) {
    sim.give(rng.pick(arts).id, 1);
    sim.ev.emit('toast', { text: 'You dug up something old and interesting!', icon: 'ui.star2' });
  } else sim.give(rng.pick(['clay', 'clay', 'stone', 'mixedSeeds', 'oldBottle']), rng.range(1, 2));
};

// ── Berry bushes ─────────────────────────────────────────────
export function berryFor(season: number): string | null {
  return season === 1 ? 'wildRaspberry' : season === 2 ? 'blackberry' : null;
}

function growBerries(sim: Sim): void {
  if (!sim.hasLoc('forest')) return;
  const loc = sim.loc('forest');
  const s = seasonOf(sim.state.day);
  const berry = berryFor(s);
  for (const [i, o] of loc.objs) {
    if (o.k !== 'bush') continue;
    o.n = berry ? Math.min(3, (o.n ?? 0) + 1) : 0;
    o.inp = berry ?? undefined;
    loc.touch(i % loc.w, Math.floor(i / loc.w));
  }
}

// ── Crab pots ────────────────────────────────────────────────
placeHooks.push((sim, id, x, y) => {
  if (id !== 'crabPot') return null;
  const loc = sim.here;
  const zone = zoneAt(loc, x, y);
  if (!zone || zone === 'mine') return { ok: false, msg: 'Crab pots go in water, right next to the shore.' };
  let nearLand = false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!loc.isWater(x + dx, y + dy)) nearLand = true;
  if (!nearLand) return { ok: false, msg: 'Put the crab pot next to the shore so you can reach it.' };
  if (loc.obj(x, y)) return { ok: false, msg: "There's already something there." };
  loc.setObj(x, y, { k: 'crabpot', id: 'crabPot', bait: false, out: null });
  sim.ev.emit('sound', { id: 'splash' });
  return { ok: true };
});

interactHooks.push((sim, x, y) => {
  const loc = sim.here;
  const o = loc.obj(x, y);
  if (!o) return null;
  if (o.k === 'forage') {
    pickForage(sim, loc, x, y);
    return { type: 'forage', ok: true };
  }
  if (o.k === 'bush' && (o.n ?? 0) > 0 && o.inp) {
    const n = o.n!;
    o.n = 0;
    sim.give(o.inp, n);
    gainXp(sim, 'foraging', 3 * n);
    loc.touch(x, y);
    return { type: 'fruit', ok: true };
  }
  if (o.k === 'crabpot') {
    if (o.out) {
      sim.give(o.out.id, o.out.n, o.out.q);
      gainXp(sim, 'fishing', 5);
      o.out = null;
      loc.touch(x, y);
      return { type: 'collect', ok: true };
    }
    if (!o.bait) {
      if (remove(sim.p.inv, 'bait', 1)) {
        o.bait = true;
        loc.touch(x, y);
        sim.ev.emit('toast', { text: 'You baited the crab pot. Check it tomorrow!', icon: 'item.bait' });
        return { type: 'collect', ok: true };
      }
      sim.ev.emit('toast', { text: 'This crab pot needs bait. Buy some from Cap\'n Wren.', icon: 'item.bait' });
      return { type: 'collect', ok: true };
    }
    sim.ev.emit('toast', { text: 'The crab pot is baited. Check back tomorrow morning!' });
    return { type: 'collect', ok: true };
  }
  return null;
});

function fillCrabPots(sim: Sim): void {
  for (const id of ['beach', 'town', 'farm', 'forest', 'mountain']) {
    if (!sim.hasLoc(id)) continue;
    const loc = sim.loc(id);
    for (const [i, o] of loc.objs) {
      if (o.k !== 'crabpot' || !o.bait || o.out) continue;
      const x = i % loc.w, y = Math.floor(i / loc.w);
      const zone = zoneAt(loc, x, y);
      const rng = sim.rng(0xc4ab, x, y);
      const table = zone === 'ocean' || zone === 'pier' ? CRAB_CATCH.ocean : CRAB_CATCH.fresh;
      o.out = rng.chance(0.08) ? { id: rng.pick(JUNK), n: 1, q: 0 } : { id: rng.pick(table)[0], n: 1, q: 0 };
      o.bait = false;
      loc.touch(x, y);
    }
  }
}

registerSystem({
  id: 'forage',
  endDay(sim) {
    fillCrabPots(sim);
  },
  startDay(sim) {
    for (const id of Object.keys(HABITAT)) {
      if (id === 'quarry' && !sim.state.story.done.includes('forage')) continue;
      spawnForage(sim, id);
    }
    growBerries(sim);
  },
});

export { FORAGE_BY_ID };
