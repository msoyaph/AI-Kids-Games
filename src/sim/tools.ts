/** Tool use: areas by tier, energy costs, and effects on soil and objects. */
import { DIR_DX, DIR_DY, type Dir } from '../core/math';
import { WILD_TREES } from '../data/crops';
import { tryItem, type ToolKind } from '../data/items';
import { TOOL_TIERS, TREE_BALANCE, TUNING } from '../tuning';
import { chopGiant, harvest, isMature, till, waterTile } from './farming';
import { gainXp, hasPerk, level } from './skills';
import { addHay } from './animals';
import type { Sim } from './sim';
import { SOIL_TILLED } from './types';
import type { Loc } from './world';

export interface ToolResult {
  ok: boolean;
  /** animation the client should play */
  anim: 'swing' | 'water' | 'dig' | 'none';
  msg?: string;
  tiles: [number, number][];
}

/** Tiles a tool affects, starting at the target and extending away from the player. */
export function toolArea(kind: ToolKind, tier: number, tx: number, ty: number, dir: Dir): [number, number][] {
  const dx = DIR_DX[dir], dy = DIR_DY[dir];
  const px = -dy, py = dx; // perpendicular
  const out: [number, number][] = [];
  if (kind === 'hoe' || kind === 'can') {
    const depth = [1, 3, 3, 5][tier] ?? 1;
    const width = tier >= 2 ? 1 : 0;
    for (let d = 0; d < depth; d++) for (let w = -width; w <= width; w++) out.push([tx + dx * d + px * w, ty + dy * d + py * w]);
    return out;
  }
  if (kind === 'scythe') {
    const r = tier >= 1 ? 1 : 0;
    out.push([tx, ty], [tx + px, ty + py], [tx - px, ty - py]);
    if (r) for (const [ox, oy] of [[dx, dy], [dx + px, dy + py], [dx - px, dy - py]]) out.push([tx + ox, ty + oy]);
    return out;
  }
  return [[tx, ty]];
}

export function energyCost(sim: Sim, kind: ToolKind): number {
  const tier = Math.max(0, sim.p.tools[kind] ?? 0);
  const base = (TUNING.energy as Record<string, number>)[kind === 'can' ? 'water' : kind === 'pick' ? 'pickaxe' : kind] ?? 2;
  if (base === 0) return 0;
  const skill = kind === 'hoe' || kind === 'can' ? 'farming' : kind === 'pick' ? 'mining' : kind === 'axe' ? 'foraging' : kind === 'rod' ? 'fishing' : 'farming';
  const lvl = level(sim, skill);
  const area = kind === 'hoe' || kind === 'can' ? tier : 0;
  return Math.max(1, base + area - Math.floor(lvl / 4) - (hasPerk(sim, 'tireless') ? 1 : 0));
}

const R = (ok: boolean, anim: ToolResult['anim'], tiles: [number, number][], msg?: string): ToolResult => ({ ok, anim, tiles, msg });

export function useTool(sim: Sim, kind: ToolKind, tx: number, ty: number): ToolResult {
  const loc = sim.here;
  const tier = Math.max(0, sim.p.tools[kind] ?? 0);
  const tiles = toolArea(kind, tier, tx, ty, sim.p.dir);
  const cost = energyCost(sim, kind);
  if (cost > 0 && sim.p.energy <= 0) {
    sim.ev.emit('tired', { energy: 0 });
    return R(false, 'none', tiles);
  }
  let res: ToolResult;
  switch (kind) {
    case 'hoe':
      res = useHoe(sim, loc, tiles);
      break;
    case 'can':
      res = useCan(sim, loc, tiles, tx, ty);
      break;
    case 'axe':
      res = useAxe(sim, loc, tx, ty, tier);
      break;
    case 'pick':
      res = usePick(sim, loc, tx, ty, tier);
      break;
    case 'scythe':
      res = useScythe(sim, loc, tiles);
      break;
    default:
      return R(false, 'none', tiles);
  }
  // swings always cost a little energy (even a miss) except scythe and refills
  if (res.anim !== 'none' && cost > 0 && !(kind === 'can' && res.msg === 'refill')) sim.useEnergy(res.ok ? cost : Math.ceil(cost / 2));
  return res;
}

function useHoe(sim: Sim, loc: Loc, tiles: [number, number][]): ToolResult {
  let any = false;
  for (const [x, y] of tiles) {
    const o = loc.obj(x, y);
    if (o && o.k === 'spot') {
      digSpot(sim, loc, x, y);
      any = true;
      continue;
    }
    if (till(sim, loc, x, y)) any = true;
  }
  if (any) {
    gainXp(sim, 'farming', 1);
    return R(true, 'dig', tiles);
  }
  const [x, y] = tiles[0];
  const o = loc.obj(x, y);
  if (o?.k === 'weed') return R(false, 'dig', tiles, 'Weeds are in the way. Cut them with your scythe!');
  if (!loc.def.farmable) return R(false, 'dig', tiles, "You can only dig soil on your farm (or a dig spot!).");
  return R(false, 'dig', tiles);
}

/** Artifact / dig spots: filled in by the foraging system. */
export const digHooks = { dig: (_sim: Sim, _loc: Loc, _x: number, _y: number): void => {} };
function digSpot(sim: Sim, loc: Loc, x: number, y: number): void {
  loc.removeObj(x, y);
  digHooks.dig(sim, loc, x, y);
}

function nearWater(loc: Loc, x: number, y: number): boolean {
  if (loc.isWater(x, y)) return true;
  for (const st of loc.structs) {
    if (st.key === 'well' && st.def && x >= st.sp.x && x < st.sp.x + st.def.w && y >= st.sp.y && y < st.sp.y + st.def.h) return true;
  }
  return false;
}

function useCan(sim: Sim, loc: Loc, tiles: [number, number][], tx: number, ty: number): ToolResult {
  const p = sim.p;
  const cap = TOOL_TIERS.canCapacity[Math.max(0, p.tools.can ?? 0)];
  if (nearWater(loc, tx, ty)) {
    p.water = cap;
    return R(true, 'water', [[tx, ty]], 'refill');
  }
  if (p.water <= 0) return R(false, 'none', tiles, 'Your watering can is empty! Refill it at a pond, river or well.');
  let any = false;
  for (const [x, y] of tiles) {
    if (p.water <= 0) break;
    if (waterTile(sim, loc, x, y)) {
      p.water--;
      any = true;
    }
  }
  const t = sim.here.triggerAt(tx, ty);
  if (t?.action === 'petBowl') {
    sim.state.pet.bowl = true;
    any = true;
  }
  if (any) gainXp(sim, 'farming', 1);
  return R(any, 'water', tiles);
}

function chopTree(sim: Sim, loc: Loc, x: number, y: number, dmg: number): ToolResult {
  const o = loc.obj(x, y)!;
  const g = o.g ?? 0;
  const tiles: [number, number][] = [[x, y]];
  const kind = o.id as keyof typeof WILD_TREES;
  if (o.tap) {
    sim.give('tapper', 1);
    if (o.tap.out) sim.give(o.tap.out.id, o.tap.out.n, o.tap.out.q);
    delete o.tap;
    loc.touch(x, y);
    return R(true, 'swing', tiles);
  }
  if (g <= 1) {
    loc.removeObj(x, y);
    if (g === 1 && WILD_TREES[kind]) sim.give(WILD_TREES[kind].seed);
    return R(true, 'swing', tiles);
  }
  o.hp = (o.hp ?? TREE_BALANCE.chopHp) - dmg;
  sim.ev.emit('anim', { kind: 'shake', x, y });
  if (o.hp > 0) return R(true, 'swing', tiles);
  const rng = sim.rng(0x7ee, x, y);
  if (g >= 4) {
    sim.give('wood', rng.range(TREE_BALANCE.wood[0], TREE_BALANCE.wood[1]));
    sim.give('sap', rng.range(1, 3));
    if (WILD_TREES[kind] && rng.chance(0.6)) sim.give(WILD_TREES[kind].seed, 1);
    loc.setObj(x, y, { k: 'stump', id: 'treestump', hp: TREE_BALANCE.stumpHp });
    sim.state.stats.trees++;
    gainXp(sim, 'foraging', 12);
    sim.ev.emit('anim', { kind: 'treefall', x, y });
  } else {
    sim.give('wood', rng.range(2, 4));
    loc.removeObj(x, y);
    gainXp(sim, 'foraging', 3);
  }
  return R(true, 'swing', tiles);
}

/** Pick up a placed craftable (machines, chests, sprinklers…) and return it to the bag. */
function pickUpPlaced(sim: Sim, loc: Loc, x: number, y: number): boolean {
  const o = loc.obj(x, y);
  if (!o) return false;
  const placeable = ['machine', 'chest', 'sprinkler', 'scarecrow', 'fence', 'gate', 'deco', 'path', 'torch', 'beehouse', 'crabpot'];
  if (!placeable.includes(o.k)) return false;
  if (o.k === 'chest' && o.items?.some((s) => s)) {
    sim.ev.emit('toast', { text: 'Empty the chest before picking it up.' });
    return true;
  }
  if (o.out) sim.give(o.out.id, o.out.n, o.out.q);
  loc.removeObj(x, y);
  if (tryItem(o.id)) sim.give(o.id, 1);
  return true;
}

function useAxe(sim: Sim, loc: Loc, x: number, y: number, tier: number): ToolResult {
  const tiles: [number, number][] = [[x, y]];
  const dmg = TOOL_TIERS.damage[tier];
  const a = loc.objAnchor(x, y);
  if (!a) return R(false, 'swing', tiles);
  const { o, i } = a;
  const ax = i % loc.w, ay = Math.floor(i / loc.w);
  const rng = sim.rng(0xa7e, ax, ay);
  switch (o.k) {
    case 'twig':
      loc.removeObj(ax, ay);
      sim.give('wood', 1);
      gainXp(sim, 'foraging', 1);
      return R(true, 'swing', tiles);
    case 'stump':
      o.hp = (o.hp ?? 4) - dmg;
      sim.ev.emit('anim', { kind: 'shake', x: ax, y: ay });
      if (o.hp <= 0) {
        loc.removeObj(ax, ay);
        sim.give('wood', o.id === 'treestump' ? rng.range(2, 4) : rng.range(3, 5));
        if (rng.chance(0.25)) sim.give('hardwood', 1);
        gainXp(sim, 'foraging', 4);
      }
      return R(true, 'swing', tiles);
    case 'log':
      if (tier < 1) return R(false, 'swing', tiles, 'This big log is too tough! Upgrade your axe at the blacksmith.');
      o.hp = (o.hp ?? 10) - dmg;
      sim.ev.emit('anim', { kind: 'shake', x: ax, y: ay });
      if (o.hp <= 0) {
        loc.removeObj(ax, ay);
        sim.give('hardwood', 8);
        gainXp(sim, 'foraging', 20);
      }
      return R(true, 'swing', tiles);
    case 'tree':
      return chopTree(sim, loc, ax, ay, dmg);
    case 'giant':
      chopGiant(sim, loc, ax, ay, dmg);
      return R(true, 'swing', tiles);
    case 'crop':
      if (o.dead) {
        loc.removeObj(ax, ay);
        return R(true, 'swing', tiles);
      }
      return R(false, 'swing', tiles);
    case 'fruitTree':
      if ((o.g ?? 0) < 3) {
        loc.removeObj(ax, ay);
        sim.give(`sapling.${o.id}`, 1);
        return R(true, 'swing', tiles);
      }
      return R(false, 'swing', tiles, 'Your fruit tree is happy here. Let it grow!');
    default:
      if (pickUpPlaced(sim, loc, ax, ay)) return R(true, 'swing', tiles);
  }
  return R(false, 'swing', tiles);
}

/** Mine-rock hooks are provided by the mine system. */
export const mineHooks = { hit: (_sim: Sim, _loc: Loc, _x: number, _y: number, _dmg: number): boolean => false };

function usePick(sim: Sim, loc: Loc, x: number, y: number, tier: number): ToolResult {
  const tiles: [number, number][] = [[x, y]];
  const dmg = TOOL_TIERS.damage[tier];
  const a = loc.objAnchor(x, y);
  if (a) {
    const { o, i } = a;
    const ax = i % loc.w, ay = Math.floor(i / loc.w);
    if (o.k === 'stone') {
      loc.removeObj(ax, ay);
      const rng = sim.rng(0x570, ax, ay);
      sim.give('stone', rng.range(1, 2));
      if (rng.chance(0.05)) sim.give('coal', 1);
      if (rng.chance(0.08)) sim.give('clay', 1);
      sim.state.stats.rocks++;
      gainXp(sim, 'mining', 2);
      return R(true, 'swing', tiles);
    }
    if (o.k === 'boulder') {
      if (tier < 1) return R(false, 'swing', tiles, 'This boulder is too hard! Upgrade your pickaxe at the blacksmith.');
      o.hp = (o.hp ?? 10) - dmg;
      sim.ev.emit('anim', { kind: 'shake', x: ax, y: ay });
      if (o.hp <= 0) {
        loc.removeObj(ax, ay);
        sim.give('stone', 15);
        if (sim.rng(1, ax, ay).chance(0.5)) sim.give('coal', 2);
        gainXp(sim, 'mining', 15);
      }
      return R(true, 'swing', tiles);
    }
    if (mineHooks.hit(sim, loc, ax, ay, dmg)) return R(true, 'swing', tiles);
    if (o.k === 'crop' && o.dead) {
      loc.removeObj(ax, ay);
      return R(true, 'swing', tiles);
    }
    if (pickUpPlaced(sim, loc, ax, ay)) return R(true, 'swing', tiles);
    return R(false, 'swing', tiles);
  }
  // untill empty soil
  const s = loc.soilAt(x, y);
  if (s & SOIL_TILLED) {
    loc.setSoil(x, y, 0);
    return R(true, 'swing', tiles);
  }
  return R(false, 'swing', tiles);
}

function useScythe(sim: Sim, loc: Loc, tiles: [number, number][]): ToolResult {
  let any = false;
  for (const [x, y] of tiles) {
    const o = loc.obj(x, y);
    if (!o) continue;
    if (o.k === 'weed') {
      loc.removeObj(x, y);
      const rng = sim.rng(0x5c7, x, y);
      if (rng.chance(0.6)) sim.give('fiber', 1);
      if (rng.chance(0.05)) sim.give('mixedSeeds', 1);
      any = true;
    } else if (o.k === 'grass') {
      loc.removeObj(x, y);
      const rng = sim.rng(0x9a5, x, y);
      if (rng.chance(0.75) && addHay(sim, 1) > 0) sim.ev.emit('fx', { kind: 'hay', x, y });
      else if (rng.chance(0.3)) sim.give('fiber', 1);
      any = true;
    } else if (o.k === 'crop') {
      if (o.dead) {
        loc.removeObj(x, y);
        sim.give('fiber', 1);
        any = true;
      } else if (isMature(o, loc, x, y)) {
        any = harvest(sim, loc, x, y) || any;
      }
    }
  }
  return R(any, 'swing', tiles);
}
