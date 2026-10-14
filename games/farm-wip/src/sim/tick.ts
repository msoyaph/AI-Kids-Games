/**
 * Moving farm time forward, and everything that happens on its own as it passes: rain watering the
 * fields, the compost bin finishing a bag, and the safety net. Nothing here ever takes anything away.
 */
import { TUNING } from '../data/tuning';
import { seasonOf } from './clock';
import { cheapestSeed, fieldState } from './fields';
import { add, roomLeft } from './inventory';
import { itemDef } from '../data/items';
import type { Farm } from './state';
import { raining } from './weather';
import { levelOf } from './world';
import { animalsCatchUp, animalsIn, isHome } from './animals';
import { restTrees, treesCatchUp } from './trees';
import { machinesCatchUp, workMachines } from './production';
import { boatCatchUp, boatTick, refillBoard, type Order } from './orders';
import { neighborsTick, type Coop, type Visit } from './neighbors';
import { endlessTick, type EndlessGoal } from './story';

export type SimEvent =
  | { type: 'rain-start' }
  | { type: 'compost-ready' }
  | { type: 'safety-net'; seeds: number }
  | { type: 'level-up'; level: number }
  | { type: 'season'; season: string }
  | { type: 'goods-ready'; count: number }
  | { type: 'new-orders'; count: number }
  | { type: 'boat-back'; orders: Order[] }
  | { type: 'coop-done'; coop: Coop }
  | { type: 'visit'; visit: Visit }
  | { type: 'endless-done'; goals: EndlessGoal[] };

/** Moves the farm clock on by `dt` seconds of play and returns what happened. */
export function advance(farm: Farm, dt: number): SimEvent[] {
  if (!(dt > 0)) return [];
  const events: SimEvent[] = [];
  const level0 = levelOf(farm), season0 = seasonOf(farm.t), wasRaining = raining(farm.seed, farm.t);
  farm.t += dt;
  restTrees(farm, dt);
  const nowRaining = raining(farm.seed, farm.t);
  if (nowRaining) {
    for (const o of farm.objects) if (o.kind === 'field' && o.crop && !o.watered && fieldState(farm, o) === 'growing') o.watered = true;
    if (!wasRaining) events.push({ type: 'rain-start' });
  }
  compostTick(farm, events);
  const made = workMachines(farm);
  if (made) events.push({ type: 'goods-ready', count: made });
  const fresh = refillBoard(farm);
  if (fresh) events.push({ type: 'new-orders', count: fresh });
  const back = boatTick(farm);
  if (back.length) events.push({ type: 'boat-back', orders: back });
  const nb = neighborsTick(farm);
  if (nb.coopDone) events.push({ type: 'coop-done', coop: nb.coopDone });
  if (nb.visit) events.push({ type: 'visit', visit: nb.visit });
  const endless = endlessTick(farm);
  if (endless.length) events.push({ type: 'endless-done', goals: endless });
  if (seasonOf(farm.t) !== season0) events.push({ type: 'season', season: seasonOf(farm.t) });
  const level = levelOf(farm);
  if (level > level0) events.push({ type: 'level-up', level });
  const net = safetyNet(farm);
  if (net) events.push(net);
  return events;
}

/** The compost bin turns scraps into a bag of compost, one bag at a time, while it has scraps. */
function compostTick(farm: Farm, events: SimEvent[]) {
  if (!farm.objects.some(o => o.kind === 'building' && o.def === 'compost')) return;
  if (farm.compostUntil !== null && farm.t >= farm.compostUntil) {
    if (roomLeft(farm) > 0) {
      add(farm, 'fertilizer', 1, 1);
      farm.compostUntil = null;
      events.push({ type: 'compost-ready' });
    }
  }
  if (farm.compostUntil === null && farm.scraps >= TUNING.scrapsPerBag) {
    farm.scraps -= TUNING.scrapsPerBag;
    farm.compostUntil = farm.t + TUNING.compostMin * 60;
  }
}

/**
 * Nobody stays stuck: with too few coins for the cheapest seeds, nothing growing or ready, nothing to
 * sell and no free seeds left, the farm dog digs up a pouch of free seeds.
 */
export function stuck(farm: Farm): boolean {
  if (farm.freeSeeds > 0) return false;
  if (farm.coins >= cheapestSeed(farm)) return false;
  if (farm.objects.some(o => o.kind === 'field' && o.crop)) return false;
  // fruit trees and animals that make things will always bring something to sell
  for (const o of farm.objects) {
    if (o.kind === 'tree') return false;
    if (isHome(o) && o.def !== 'kennel' && animalsIn(o).length > 0) return false;
  }
  for (const [id, s] of Object.entries(farm.inv)) if (itemDef(id).sellable && s[0] + s[1] + s[2] > 0) return false;
  return true;
}

function safetyNet(farm: Farm): SimEvent | null {
  if (!stuck(farm)) return null;
  farm.freeSeeds = TUNING.safetySeeds;
  return { type: 'safety-net', seeds: TUNING.safetySeeds };
}

/**
 * "While you were away": growing crops and the compost bin get up to TUNING.awayCapMin minutes of
 * extra growing. The farm clock itself doesn't move (no seasons pass), and nothing is taken away.
 */
export function catchUp(farm: Farm, awaySeconds: number): number {
  const bonus = Math.min(Math.max(0, awaySeconds), TUNING.awayCapMin * 60);
  if (bonus <= 0) return 0;
  let helped = 0;
  for (const o of farm.objects) {
    if (o.kind !== 'field' || !o.crop || farm.t >= o.readyAt) continue;
    o.readyAt = Math.max(farm.t, o.readyAt - bonus);
    o.plantedAt -= bonus;
    helped++;
  }
  if (farm.compostUntil !== null) farm.compostUntil = Math.max(farm.t, farm.compostUntil - bonus);
  animalsCatchUp(farm, bonus);
  machinesCatchUp(farm, bonus);
  boatCatchUp(farm, bonus);
  treesCatchUp(farm, bonus);
  return bonus;
}
