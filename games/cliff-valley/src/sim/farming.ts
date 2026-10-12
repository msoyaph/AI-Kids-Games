/**
 * Farming: tilling, planting, watering, overnight growth, quality, multi-harvest,
 * trellis, sprinklers, scarecrows & crows, giant crops, wild/fruit trees and tappers.
 */
import { Rng } from '../core/rng';
import { CROP, CROPS, FRUIT_TREE, WILD_TREES } from '../data/crops';
import { CROP_BALANCE, QUALITY, TREE_BALANCE, TUNING } from '../tuning';
import { gainXp, hasPerk, level } from './skills';
import type { Sim } from './sim';
import { seasonOf } from './state';
import { registerSystem, type DayReport } from './systems';
import { SOIL_FERT_MASK, SOIL_FERT_SHIFT, SOIL_TILLED, SOIL_WATERED, type WorldObject } from './types';
import { isWet } from './weather';
import type { Loc } from './world';

export const FARM_LOCS = ['farm', 'greenhouse'];

export function isGreenhouse(loc: Loc): boolean {
  return loc.id === 'greenhouse';
}

export function cropDaysNeeded(cropId: string, fert: number): number {
  const b = CROP_BALANCE[cropId];
  return fert === 3 ? Math.max(1, Math.round(b.days * (1 - QUALITY.speedyGrow))) : b.days;
}

export function isMature(o: WorldObject, loc: Loc, x: number, y: number): boolean {
  if (o.k !== 'crop' || o.dead) return false;
  const fert = (loc.soilAt(x, y) & SOIL_FERT_MASK) >> SOIL_FERT_SHIFT;
  return (o.g ?? 0) >= cropDaysNeeded(o.id, fert);
}

/** Visual stage 0..4 for a crop (4 = ready). */
export function cropStage(o: WorldObject, loc: Loc, x: number, y: number): number {
  if (isMature(o, loc, x, y)) return 4;
  const fert = (loc.soilAt(x, y) & SOIL_FERT_MASK) >> SOIL_FERT_SHIFT;
  const need = cropDaysNeeded(o.id, fert);
  const g = o.g ?? 0;
  if (o.rg) return 3; // regrowing after a harvest
  if (g <= 0) return 0;
  return Math.min(3, 1 + Math.floor(((g - 1) / Math.max(1, need - 1)) * 3));
}

export function canTill(loc: Loc, x: number, y: number): boolean {
  return loc.isTillable(x, y) && !loc.obj(x, y) && !(loc.soilAt(x, y) & SOIL_TILLED) && !loc.warpAtTile(x, y);
}

export function till(sim: Sim, loc: Loc, x: number, y: number): boolean {
  if (!canTill(loc, x, y)) return false;
  loc.setSoil(x, y, SOIL_TILLED | (isWet(sim.state.weather) && loc.def.outdoor ? SOIL_WATERED : 0));
  sim.state.stats.tilled++;
  return true;
}

export function waterTile(sim: Sim, loc: Loc, x: number, y: number): boolean {
  const s = loc.soilAt(x, y);
  if (!(s & SOIL_TILLED) || s & SOIL_WATERED) return false;
  loc.setSoil(x, y, s | SOIL_WATERED);
  sim.state.stats.watered++;
  return true;
}

export function seasonOk(sim: Sim, loc: Loc, cropId: string): boolean {
  return isGreenhouse(loc) || CROP[cropId].seasons.includes(seasonOf(sim.state.day));
}

/** Plant a seed item on a tile. Returns a friendly reason on failure. */
export function plant(sim: Sim, loc: Loc, x: number, y: number, seedId: string): { ok: boolean; msg?: string } {
  // tree seeds & saplings go on untilled ground
  const wild = Object.entries(WILD_TREES).find(([, v]) => v.seed === seedId);
  if (wild || seedId.startsWith('sapling.')) {
    if (!loc.def.farmable || isGreenhouse(loc)) return { ok: false, msg: 'Trees need to be planted outside on your farm.' };
    if (loc.obj(x, y) || loc.soilAt(x, y) & SOIL_TILLED || !loc.isTillable(x, y)) return { ok: false, msg: "Trees need a clear patch of grass or dirt (not tilled soil)." };
    if (seedId.startsWith('sapling.')) {
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const o = loc.obj(x + i, y + j);
        if ((i || j) && o && (o.k === 'fruitTree' || o.k === 'tree')) return { ok: false, msg: 'Fruit trees need some space around them.' };
      }
      loc.setObj(x, y, { k: 'fruitTree', id: seedId.slice(8), g: 0, n: 0 });
    } else loc.setObj(x, y, { k: 'tree', id: wild![0], g: 0, rg: 0, hp: TREE_BALANCE.chopHp });
    return { ok: true };
  }
  if (!(loc.soilAt(x, y) & SOIL_TILLED)) return { ok: false, msg: 'Seeds need tilled soil. Use your hoe first!' };
  if (loc.obj(x, y)) return { ok: false };
  let cropId = seedId.startsWith('seed.') ? seedId.slice(5) : '';
  if (seedId === 'mixedSeeds') {
    const s = seasonOf(sim.state.day);
    const opts = CROPS.filter((c) => (isGreenhouse(loc) || c.seasons.includes(s)) && !c.giant && CROP_BALANCE[c.id].days <= 6);
    if (!opts.length) return { ok: false, msg: 'Nothing in this mix grows right now.' };
    cropId = sim.rng(31, x, y).pick(opts).id;
  }
  if (!CROP[cropId]) return { ok: false };
  if (!seasonOk(sim, loc, cropId)) {
    const sn = CROP[cropId].seasons.map((v) => ['spring', 'summer', 'autumn', 'winter'][v]).join(' or ');
    return { ok: false, msg: `${CROP[cropId].name} only grows in ${sn}. Try the greenhouse later!` };
  }
  loc.setObj(x, y, { k: 'crop', id: cropId, g: 0 });
  return { ok: true };
}

export function fertilize(loc: Loc, x: number, y: number, kind: number): { ok: boolean; msg?: string } {
  const s = loc.soilAt(x, y);
  if (!(s & SOIL_TILLED)) return { ok: false, msg: 'Fertilizer goes on tilled soil.' };
  if (s & SOIL_FERT_MASK) return { ok: false, msg: 'This soil already has fertilizer.' };
  const o = loc.obj(x, y);
  if (o && o.k === 'crop' && (o.g ?? 0) > 0 && kind === 3) return { ok: false, msg: 'Speedy Grow must go in before the seeds sprout.' };
  loc.setSoil(x, y, s | (kind << SOIL_FERT_SHIFT));
  return { ok: true };
}

export function rollQuality(rng: Rng, lvl: number, fert: number, sim?: Sim): number {
  const gold = QUALITY.goldBase + QUALITY.goldPerLevel * lvl + QUALITY.fertGold[fert];
  const sparkle = QUALITY.sparkleFert[fert] + (sim && hasPerk(sim, 'bigHarvest') ? 0.05 : 0);
  const r = rng.next();
  if (r < sparkle) return 3;
  if (r < sparkle + gold) return 2;
  if (r < sparkle + gold + Math.min(0.7, gold * QUALITY.silverMult)) return 1;
  return 0;
}

/** Harvest a mature crop (by hand or scythe). */
export function harvest(sim: Sim, loc: Loc, x: number, y: number): boolean {
  const o = loc.obj(x, y);
  if (!o || o.k !== 'crop' || !isMature(o, loc, x, y)) return false;
  const b = CROP_BALANCE[o.id];
  const fert = (loc.soilAt(x, y) & SOIL_FERT_MASK) >> SOIL_FERT_SHIFT;
  const rng = sim.rng(77, x, y + (o.n ?? 0) * 1000);
  const lvl = level(sim, 'farming');
  const q = rollQuality(rng, lvl, fert, sim);
  let n = b.yield ? rng.range(b.yield[0], b.yield[1]) : 1;
  if (hasPerk(sim, 'bigHarvest') && rng.chance(0.15)) n++;
  sim.give(o.id, n, q);
  if (CROP[o.id].plant === 'tall' && o.id === 'wheat' && sim.state.buildings.built.silo !== undefined) {
    sim.state.buildings.hay = Math.min(sim.state.buildings.hay + 1, 240);
  }
  gainXp(sim, 'farming', b.xp);
  sim.state.stats.harvested += n;
  if (b.regrow) {
    o.g = b.days - b.regrow;
    o.rg = 1;
    o.n = (o.n ?? 0) + 1;
    loc.touch(x, y);
  } else loc.removeObj(x, y);
  sim.ev.emit('anim', { kind: 'harvest', x, y });
  return true;
}

/** Harvest a giant crop with the axe (returns true when it pops). */
export function chopGiant(sim: Sim, loc: Loc, ax: number, ay: number, dmg: number): boolean {
  const o = loc.obj(ax, ay);
  if (!o || o.k !== 'giant') return false;
  o.hp = (o.hp ?? 3) - Math.max(1, Math.floor(dmg / 2));
  if (o.hp > 0) return false;
  loc.removeObj(ax, ay);
  const n = sim.rng(5, ax, ay).range(15, 21);
  sim.give(o.id, n, 0);
  gainXp(sim, 'farming', 40);
  return true;
}

// ── Overnight systems ─────────────────────────────────────
function forEachFarmLoc(sim: Sim, fn: (l: Loc) => void): void {
  for (const id of FARM_LOCS) if (sim.hasLoc(id)) fn(sim.loc(id));
}

function endDay(sim: Sim, r: DayReport): void {
  forEachFarmLoc(sim, (loc) => {
    for (const [i, o] of loc.objs) {
      const x = i % loc.w, y = Math.floor(i / loc.w);
      if (o.k === 'crop' && !o.dead) {
        if (loc.soil[i] & SOIL_WATERED) {
          const fert = (loc.soil[i] & SOIL_FERT_MASK) >> SOIL_FERT_SHIFT;
          const need = cropDaysNeeded(o.id, fert);
          if ((o.g ?? 0) < need) {
            o.g = (o.g ?? 0) + 1 + (hasPerk(sim, 'greenThumb') && sim.rng(9, x, y).chance(0.1) ? 1 : 0);
            if (o.g >= need) o.rg = 0;
            loc.touch(x, y);
          }
        }
      } else if (o.k === 'tree') {
        if ((o.g ?? 0) < 4) {
          o.rg = (o.rg ?? 0) + 1;
          if (o.rg >= TREE_BALANCE.wildStageDays) {
            o.rg = 0;
            o.g = (o.g ?? 0) + 1;
            loc.touch(x, y);
          }
        } else if (o.tap && !o.tap.out) {
          o.tap.t -= 1;
          if (o.tap.t <= 0) {
            o.tap.out = { id: WILD_TREES[o.id as keyof typeof WILD_TREES].tap, n: 1, q: 0 };
            loc.touch(x, y);
          }
        }
      } else if (o.k === 'fruitTree') {
        o.g = (o.g ?? 0) + 1;
        const ft = FRUIT_TREE[o.id];
        if (ft && o.g >= TREE_BALANCE.fruitTreeDays && seasonOf(sim.state.day + 1) === ft.season) {
          o.n = Math.min(TREE_BALANCE.fruitPerDayMax, (o.n ?? 0) + 1);
        } else if (seasonOf(sim.state.day + 1) !== ft?.season) o.n = 0;
        loc.touch(x, y);
      }
    }
    // dry out soil
    for (let i = 0; i < loc.soil.length; i++) {
      const s = loc.soil[i];
      if (s & SOIL_WATERED) loc.soil[i] = s & ~SOIL_WATERED;
    }
    loc.chunkDirty.fill(1);
    loc.objVersion++;
  });
  void r;
}

function startDay(sim: Sim): void {
  const st = sim.state;
  const season = seasonOf(st.day);
  const newSeason = st.day % TUNING.seasonDays === 0 && st.day > 0;
  let withered = 0;
  forEachFarmLoc(sim, (loc) => {
    const outdoor = loc.def.outdoor;
    // season change: out-of-season crops wither outdoors
    if (newSeason && outdoor) {
      for (const [, o] of loc.objs) {
        if (o.k === 'crop' && !o.dead && !CROP[o.id].seasons.includes(season)) {
          o.dead = true;
          withered++;
        }
      }
    }
    // rain & snow water everything outside
    if (outdoor && isWet(st.weather)) {
      for (let i = 0; i < loc.soil.length; i++) if (loc.soil[i] & SOIL_TILLED) loc.soil[i] |= SOIL_WATERED;
    }
    // sprinklers
    for (const [i, o] of loc.objs) {
      if (o.k !== 'sprinkler') continue;
      const x = i % loc.w, y = Math.floor(i / loc.w);
      for (const [dx, dy] of sprinklerArea(o.id)) {
        const tx = x + dx, ty = y + dy;
        const s = loc.soilAt(tx, ty);
        if (s & SOIL_TILLED) loc.setSoil(tx, ty, s | SOIL_WATERED);
      }
    }
    if (outdoor) crows(sim, loc);
    giantCrops(sim, loc);
    loc.chunkDirty.fill(1);
    loc.objVersion++;
  });
  if (withered) sim.morningNotes.push(`It's ${['spring', 'summer', 'autumn', 'winter'][season]} now! ${withered} out-of-season crop${withered > 1 ? 's' : ''} withered. Clear them with your scythe.`);
}

export function sprinklerArea(id: string): [number, number][] {
  const out: [number, number][] = [];
  const r = id === 'sprinkler3' ? 2 : 1;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (id === 'sprinkler1' && Math.abs(dx) + Math.abs(dy) !== 1) continue;
      out.push([dx, dy]);
    }
  return out;
}

export const SCARECROW_RADIUS = 8;

function protectedByScarecrow(x: number, y: number, scarecrows: [number, number][]): boolean {
  for (const [sx, sy] of scarecrows) if (Math.hypot(sx - x, sy - y) <= SCARECROW_RADIUS) return true;
  return false;
}

function crows(sim: Sim, loc: Loc): void {
  const crops: number[] = [];
  const scare: [number, number][] = [];
  for (const [i, o] of loc.objs) {
    if (o.k === 'crop' && !o.dead) crops.push(i);
    else if (o.k === 'scarecrow') scare.push([i % loc.w, Math.floor(i / loc.w)]);
  }
  if (crops.length < TUNING.crowMinCrops) return;
  const rng = sim.rng(0xc40);
  for (const i of crops) {
    const x = i % loc.w, y = Math.floor(i / loc.w);
    if (protectedByScarecrow(x, y, scare)) continue;
    if (rng.chance(TUNING.crowChancePerCrop * 4)) {
      loc.removeObj(x, y);
      sim.morningNotes.push('A hungry crow nibbled one of your crops! A scarecrow keeps crows away.');
      sim.state.flags.crowVisit = (sim.state.flags.crowVisit ?? 0) + 1;
      return; // at most one per night — gentle
    }
  }
}

function giantCrops(sim: Sim, loc: Loc): void {
  if (!loc.def.outdoor) return;
  const rng = sim.rng(0x61a);
  for (const [i, o] of [...loc.objs]) {
    if (o.k !== 'crop' || !CROP[o.id]?.giant) continue;
    const x = i % loc.w, y = Math.floor(i / loc.w);
    if (!isMature(o, loc, x, y)) continue;
    let ok = true;
    for (let j = 0; j < 3 && ok; j++)
      for (let k = 0; k < 3 && ok; k++) {
        const p = loc.obj(x + k, y + j);
        if (!p || p.k !== 'crop' || p.id !== o.id || !isMature(p, loc, x + k, y + j)) ok = false;
      }
    if (!ok || !rng.chance(TUNING.giantCropChance * 2)) continue;
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) loc.removeObj(x + k, y + j);
    loc.setBig(x, y, 3, 3, { k: 'giant', id: o.id, hp: 3 });
    sim.morningNotes.push(`Whoa! A GIANT ${CROP[o.id].name.toLowerCase()} grew overnight! Use your axe to harvest it.`);
    sim.state.flags.giantCrop = (sim.state.flags.giantCrop ?? 0) + 1;
    return;
  }
}

registerSystem({ id: 'farming', endDay, startDay });
