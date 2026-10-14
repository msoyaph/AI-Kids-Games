/**
 * Orchard trees and berry bushes: planted once, picked again and again. Fruit only grows in the
 * plant's seasons; the rest of the year it rests (ripe fruit stays on the branch, waiting). Care
 * points make stars, as for crops: compost, bees nearby (for plants that need them), and age: a tree
 * that has been picked three times is established and gives better fruit.
 */
import { TREE } from '../data/orchard';
import { TUNING } from '../data/tuning';
import { seasonOf } from './clock';
import { add, roomLeft, take, type Stars } from './inventory';
import type { Obj, OtherObj, TreeObj } from './objects';
import type { Farm } from './state';
import { bump, ledgerNow } from './world';
import { hiveNear } from './animals';

export interface TreeState { readyAt: number; picks: number; compost: boolean }

export function treeState(o: OtherObj): TreeState {
  const d = (o.data ??= {});
  if (typeof d.readyAt !== 'number') d.readyAt = 0;
  if (typeof d.picks !== 'number') d.picks = 0;
  if (typeof d.compost !== 'boolean') d.compost = false;
  return d as unknown as TreeState;
}

export const isTree = (o: Obj): o is TreeObj => o.kind === 'tree';
export const treeRipe = (farm: Farm, o: OtherObj) => farm.t >= treeState(o).readyAt;
export const inFruitSeason = (farm: Farm, o: OtherObj) => !!TREE[o.def]?.seasons.includes(seasonOf(farm.t));

/** 0..1 towards the next fruit. */
export function treeGrowth(farm: Farm, o: OtherObj): number {
  const def = TREE[o.def], s = treeState(o);
  if (!def) return 0;
  const span = (s.picks === 0 ? def.firstMin : def.againMin) * 60;
  return Math.min(1, Math.max(0, 1 - (s.readyAt - farm.t) / span));
}

export function treeCare(farm: Farm, o: OtherObj) {
  const def = TREE[o.def]!, s = treeState(o);
  const bees = def.bees && hiveNear(farm, o.x, o.z);
  const established = s.picks >= 3;
  const points = (s.compost ? 1 : 0) + (bees ? 1 : 0) + (established ? 1 : 0);
  const stars: Stars = points >= TUNING.starCare[1] ? 3 : points >= TUNING.starCare[0] ? 2 : 1;
  return { compost: s.compost, bees, established, points, stars };
}

/** A tree just planted: its first fruit comes after `firstMin` minutes of its seasons. */
export function startTree(farm: Farm, o: OtherObj) {
  const def = TREE[o.def]!;
  Object.assign(treeState(o), { readyAt: farm.t + def.firstMin * 60, picks: 0, compost: false });
}

export function pickTree(farm: Farm, o: OtherObj): { ok: true; fruit: string; stars: Stars; amount: number } | { ok: false; why: string } {
  const def = TREE[o.def];
  if (!def) return { ok: false, why: 'Not a fruit tree.' };
  if (!treeRipe(farm, o)) return { ok: false, why: inFruitSeason(farm, o) ? 'The fruit isn’t ripe yet.' : `${def.name}s rest until ${def.seasons.join(' or ')}.` };
  const c = treeCare(farm, o);
  const amount = def.yield + (c.bees ? 1 : 0);
  if (roomLeft(farm) < amount) return { ok: false, why: 'The barn is full! Sell or use some things to make room. The fruit will wait.' };
  add(farm, def.fruit, c.stars, amount);
  farm.xp += Math.max(2, Math.round(def.againMin));
  bump(farm, 'harvest', amount);
  bump(farm, `harvest:${def.fruit}`, amount);
  if (c.stars === 3) bump(farm, 'stars3', amount);
  const page = ledgerNow(farm);
  page.grown[def.fruit] = (page.grown[def.fruit] ?? 0) + amount;
  const s = treeState(o);
  s.picks++;
  s.compost = false;
  s.readyAt = farm.t + def.againMin * 60;
  return { ok: true, fruit: def.fruit, stars: c.stars, amount };
}

export function compostTree(farm: Farm, o: OtherObj): { ok: true } | { ok: false; why: string } {
  const s = treeState(o);
  if (treeRipe(farm, o)) return { ok: false, why: 'Pick the fruit first.' };
  if (s.compost) return { ok: false, why: 'This tree already has compost.' };
  if (!take(farm, 'fertilizer', 1)) return { ok: false, why: 'No compost yet. The compost bin makes it from scraps.' };
  s.compost = true;
  s.readyAt = farm.t + (s.readyAt - farm.t) * (1 - TUNING.compostSpeed);
  bump(farm, 'composted');
  return { ok: true };
}

/** Out of season, a tree rests: its fruit timer waits. Called as farm time passes. */
export function restTrees(farm: Farm, dt: number) {
  for (const o of farm.objects) {
    if (!isTree(o) || inFruitSeason(farm, o)) continue;
    const s = treeState(o);
    if (farm.t < s.readyAt) s.readyAt += dt;
  }
}

/** For "while you were away": in-season fruit comes sooner, never later. */
export function treesCatchUp(farm: Farm, seconds: number) {
  for (const o of farm.objects) {
    if (!isTree(o) || !inFruitSeason(farm, o)) continue;
    const s = treeState(o);
    if (s.readyAt > farm.t) s.readyAt = Math.max(farm.t, s.readyAt - seconds);
  }
}
