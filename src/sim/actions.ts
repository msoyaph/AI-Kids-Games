/**
 * Player actions shared by the client, bot and tests: use the selected item on a tile,
 * or interact (hand) with a tile. Returns outcomes the client turns into animations/UI.
 */
import { tryItem, isTool, toolKind } from '../data/items';
import { fertilize, harvest, isMature, plant } from './farming';
import { remove } from './inventory';
import { gainXp, hasPerk } from './skills';
import type { Sim } from './sim';
import { useTool, type ToolResult } from './tools';
import type { WorldObject } from './types';

export type UseOutcome =
  | (ToolResult & { type: 'tool' })
  | { type: 'plant' | 'place' | 'fertilize'; ok: boolean; msg?: string }
  | { type: 'eat'; id: string }
  | { type: 'special'; id: string }
  | { type: 'none'; ok: false; msg?: string };

/** Spaces where the player may place craftables. */
export const PLAYER_SPACES = new Set(['farm', 'farmhouse', 'greenhouse', 'coop', 'barn', 'shed']);

/** Use the currently selected toolbar item on tile (tx, ty). */
export function useSelected(sim: Sim, tx: number, ty: number): UseOutcome {
  const s = sim.p.inv[sim.p.sel];
  if (!s) return { type: 'none', ok: false };
  if (isTool(s.id)) {
    const k = toolKind(s.id);
    if (k === 'rod' || k === 'bonk' || k === 'sling') return { type: 'none', ok: false };
    return { type: 'tool', ...useTool(sim, k, tx, ty) };
  }
  const d = tryItem(s.id);
  if (!d) return { type: 'none', ok: false };
  const loc = sim.here;
  if (d.cat === 'seed' || d.cat === 'sapling') {
    if (!PLAYER_SPACES.has(loc.id)) return { type: 'plant', ok: false, msg: 'Plant seeds on your farm!' };
    const r = plant(sim, loc, tx, ty, s.id);
    if (r.ok) {
      remove(sim.p.inv, s.id, 1);
      gainXp(sim, 'farming', 1);
    }
    return { type: 'plant', ...r };
  }
  if (d.cat === 'fertilizer') {
    const kind = s.id === 'basicFertilizer' ? 1 : s.id === 'deluxeFertilizer' ? 2 : 3;
    const r = fertilize(loc, tx, ty, kind);
    if (r.ok) remove(sim.p.inv, s.id, 1);
    return { type: 'fertilize', ...r };
  }
  if (d.cat === 'special' && SPECIAL_ITEMS.has(s.id)) return { type: 'special', id: s.id };
  if (d.place || s.id === 'tapper') {
    const r = placeItem(sim, s.id, tx, ty);
    if (r.ok) remove(sim.p.inv, s.id, 1);
    return { type: 'place', ...r };
  }
  if (d.energy && d.energy > 0) return { type: 'eat', id: s.id };
  return { type: 'none', ok: false };
}

/** Items that do something when used (handled by the client). */
export const SPECIAL_ITEMS = new Set(['homeWhistle', 'ropeLadder', 'popBomb', 'rainCharm']);

/** Placement hooks: systems add custom placement (e.g. tapper on trees, crab pots on water). */
export const placeHooks: ((sim: Sim, id: string, x: number, y: number) => { ok: boolean; msg?: string } | null)[] = [];

export function placeItem(sim: Sim, id: string, x: number, y: number): { ok: boolean; msg?: string } {
  for (const h of placeHooks) {
    const r = h(sim, id, x, y);
    if (r) return r;
  }
  const loc = sim.here;
  const d = tryItem(id);
  if (!d?.place) return { ok: false };
  if (!PLAYER_SPACES.has(loc.id)) return { ok: false, msg: 'You can only place things on your farm or in your buildings.' };
  if (loc.blocked(x, y) || loc.obj(x, y) || loc.warpAtTile(x, y) || loc.triggerAt(x, y)) return { ok: false, msg: "There's no room there." };
  const pt = sim.playerTile();
  if (pt.x === x && pt.y === y && d.place !== 'path') return { ok: false, msg: 'Step aside first!' };
  const o: WorldObject = { k: d.place as WorldObject['k'], id };
  if (d.place === 'chest') {
    o.items = new Array(24).fill(null);
    o.col = 0;
  }
  if (d.place === 'gate') o.open = false;
  loc.setObj(x, y, o);
  sim.ev.emit('sound', { id: 'place' });
  return { ok: true };
}

export type InteractOutcome =
  | { type: 'harvest' | 'forage' | 'collect' | 'fruit'; ok: true }
  | { type: 'chest'; x: number; y: number }
  | { type: 'trigger'; action: string; arg?: string }
  | { type: 'object'; o: WorldObject; x: number; y: number }
  | { type: 'none' };

/** Interaction hooks for later systems (machines, NPCs, animals, forage…). */
export const interactHooks: ((sim: Sim, x: number, y: number) => InteractOutcome | null)[] = [];

/** Interact with a tile: harvest, pick up, open, trigger. */
export function interactAt(sim: Sim, x: number, y: number): InteractOutcome {
  for (const h of interactHooks) {
    const r = h(sim, x, y);
    if (r) return r;
  }
  const loc = sim.here;
  const a = loc.objAnchor(x, y);
  if (a) {
    const { o, i } = a;
    const ax = i % loc.w, ay = Math.floor(i / loc.w);
    if (o.k === 'crop' && isMature(o, loc, ax, ay)) {
      harvest(sim, loc, ax, ay);
      return { type: 'harvest', ok: true };
    }
    if (o.k === 'fruitTree' && (o.n ?? 0) > 0) {
      const n = o.n!;
      o.n = 0;
      const age = (o.g ?? 0) - 10;
      const q = age > 40 ? 3 : age > 25 ? 2 : age > 10 ? 1 : 0;
      sim.give(o.id, n, q);
      gainXp(sim, 'foraging', 3 * n);
      loc.touch(ax, ay);
      return { type: 'fruit', ok: true };
    }
    if (o.k === 'tree' && o.tap?.out) {
      const out = o.tap.out;
      sim.give(out.id, out.n, out.q);
      o.tap.out = null;
      o.tap.t = 0;
      gainXp(sim, 'foraging', 5);
      loc.touch(ax, ay);
      return { type: 'collect', ok: true };
    }
    if (o.k === 'chest') return { type: 'chest', x: ax, y: ay };
    if (o.k === 'gate') {
      o.open = !o.open;
      loc.touch(ax, ay);
      return { type: 'collect', ok: true };
    }
    return { type: 'object', o, x: ax, y: ay };
  }
  const t = loc.triggerAt(x, y);
  if (t) return { type: 'trigger', action: t.action, arg: t.arg };
  return { type: 'none' };
}

/** Would tapping this tile with a hand do something? (no side effects) */
export function canInteract(sim: Sim, x: number, y: number): boolean {
  const loc = sim.here;
  if (loc.triggerAt(x, y)) return true;
  const a = loc.objAnchor(x, y);
  if (!a) return false;
  const { o, i } = a;
  const ax = i % loc.w, ay = Math.floor(i / loc.w);
  switch (o.k) {
    case 'crop':
      return isMature(o, loc, ax, ay);
    case 'forage':
    case 'chest':
    case 'machine':
    case 'beehouse':
    case 'crabpot':
    case 'gate':
    case 'mineChest':
    case 'heartstone':
    case 'ladder':
      return true;
    case 'fruitTree':
      return (o.n ?? 0) > 0;
    case 'tree':
      return !!o.tap?.out;
    case 'bush':
      return (o.n ?? 0) > 0;
  }
  return false;
}

/** Eat one of an item from the bag. */
export function eat(sim: Sim, id: string): boolean {
  const d = tryItem(id);
  if (!d?.energy) return false;
  if (!remove(sim.p.inv, id, 1)) return false;
  const e = Math.round(d.energy * (hasPerk(sim, 'hearty') ? 1.25 : 1));
  sim.gainEnergy(e);
  sim.p.hp = Math.min(sim.p.maxHp, sim.p.hp + Math.round(e * (id === 'healingTea' ? 1.2 : 0.45)));
  if (d.buff) {
    sim.p.buffs = sim.p.buffs.filter((b) => b.id !== d.buff!.id);
    sim.p.buffs.push({ ...d.buff, until: sim.absMinute() + d.buff.minutes * (hasPerk(sim, 'buffet') ? 2 : 1) });
  }
  return true;
}
