// Headless story driver: performs mission steps through the real sim APIs.
import { expect } from 'vitest';
import type { Game } from '../src/sim/game';
import { MISSION_BY_ID } from '../src/data/missions';
import { FOSSILS, RECIPE_BY_ID, item } from '../src/data/registry';
import { active, allDone, deliverItemId, isDone, objectiveLive, objectiveValue, questOptions, talkScene, tryStart } from '../src/sim/quests';
import { give, countItem } from '../src/sim/inventory';
import { craft, learnRecipe } from '../src/sim/crafting';
import { sleep, orderUpgrade, payLoan } from '../src/sim/housing';
import { confirmPlacement, placementRT, startPlotPlacement } from '../src/sim/placement';
import { donateSlot, canDonate } from '../src/sim/museum';
import type { DeliverObjective } from '../src/data/questTypes';
import { FRUITS } from '../src/data/fruit';

export function talk(g: Game, npc: string): boolean {
  const s = talkScene(g, npc);
  if (!s) return false;
  s.apply();
  return true;
}

export function deliverAll(g: Game, npc: string): void {
  for (const m of active(g)) {
    m.objectives.forEach((o, i) => {
      if (o.kind !== 'deliver' || o.npc !== npc || objectiveValue(g, m, i).done || !objectiveLive(g, m, i)) return;
      const d = o as DeliverObjective;
      const id = deliverItemId(g, d) ?? (d.cat === 'foreignFruit' ? FRUITS.find((_, k) => k !== g.world.gen.nativeFruit)!.id : d.cat === 'fossil' ? FOSSILS[0]!.id : '');
      if (countItem(g, id) < d.qty) give(g, id, d.qty - countItem(g, id));
    });
  }
  for (const o of questOptions(g, npc)) if (!o.plot) o.run();
}

export function craftItem(g: Game, recipeId: string): void {
  const r = RECIPE_BY_ID[recipeId]!;
  learnRecipe(g, recipeId, 'test', true);
  for (const ing of r.ingredients) if (countItem(g, ing.id) < ing.qty) give(g, ing.id, ing.qty - countItem(g, ing.id));
  expect(craft(g, recipeId), recipeId).toBe(true);
}

export function placePlot(g: Game, owner: string): void {
  startPlotPlacement(g, owner);
  const w = g.world;
  const pl = placementRT(g)!;
  for (let i = 0; i < w.size * w.size; i++) {
    if (w.region(i) !== 1 || !w.standable(i)) continue;
    g.state.player.x = (i % w.size) + 0.5;
    g.state.player.z = ((i / w.size) | 0) + 0.5;
    g.state.player.facing = Math.PI;
    g.state.player.level = w.height(i);
    pl.compute(g, pl);
    if (pl.valid) {
      expect(confirmPlacement(g)).toBe(true);
      return;
    }
  }
  throw new Error('no plot spot for ' + owner);
}

export function nextDay(g: Game): void {
  g.state.clock.minute = 22 * 60;
  sleep(g);
  tryStart(g);
}

export function setHour(g: Game, h: number): void {
  g.state.clock.minute = h * 60;
}

export function expectDone(g: Game, id: string): void {
  const m = MISSION_BY_ID[id]!;
  if (!isDone(g, id)) {
    const st = m.objectives.map((_, i) => `${m.objectives[i]!.label}: ${JSON.stringify(objectiveValue(g, m, i))}`);
    throw new Error(`Mission ${id} not done. active=${!!g.state.quests.active[id]} allDone=${g.state.quests.active[id] ? allDone(g, m) : '-'}\n${st.join('\n')}`);
  }
}

export function donateSome(g: Game, ids: string[]): void {
  for (const id of ids) {
    if (!canDonate(g, id)) continue;
    give(g, id, 1);
    const slot = g.state.player.inv.findIndex((s) => s?.id === id);
    donateSlot(g, slot);
  }
}

export { item, orderUpgrade, payLoan };
