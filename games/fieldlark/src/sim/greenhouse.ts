/**
 * Greenhouses (from chapter 6): beds under glass where any crop grows in any season at full speed,
 * which makes winter cosy. Plant and pick through the greenhouse's card (or a helper on Harvesting
 * picks them). Indoor beds are always watered, so their crops have two stars; the Farm Lab's sunny
 * benches add a third, and its warm glass makes them grow faster in winter. Rice needs a paddy, so it
 * stays outside.
 */
import { BUILDING } from '../data/buildings';
import { CROP } from '../data/crops';
import { seasonOf } from './clock';
import { add, roomLeft, type Stars } from './inventory';
import type { BuildingObj, Obj, OtherObj } from './objects';
import type { Farm } from './state';
import { seedPrice, varietyChoice } from './varieties';
import { bump, ledgerNow, levelOf, spend } from './world';

export interface Plot { crop: string | null; variety: string | null; plantedAt: number; readyAt: number }

export const isGreenhouse = (o: Obj): o is BuildingObj => o.kind === 'building' && !!BUILDING[o.def]?.plots;

export function plotsOf(o: OtherObj): Plot[] {
  const d = (o.data ??= {});
  const n = BUILDING[o.def]?.plots ?? 0;
  if (!Array.isArray(d.plots)) d.plots = [];
  const plots = d.plots as Plot[];
  while (plots.length < n) plots.push({ crop: null, variety: null, plantedAt: 0, readyAt: 0 });
  plots.length = n;
  return plots;
}

export type PlotState = 'empty' | 'growing' | 'ready';
export const plotState = (farm: Farm, p: Plot): PlotState => (!p.crop ? 'empty' : farm.t >= p.readyAt ? 'ready' : 'growing');

/** Growing speed under glass: full speed always, and faster in winter with warm glass. */
const glassSpeed = (farm: Farm) => (seasonOf(farm.t) === 'winter' && farm.flags['lab:warm'] ? 1.25 : 1);

/** Stars for greenhouse crops: always watered (2), plus the sunny benches (3). */
export const plotStars = (farm: Farm): Stars => (farm.flags['lab:glassstars'] ? 3 : 2);

export function plantPlot(farm: Farm, o: OtherObj, i: number, cropId: string, variety: string | null = null): { ok: true } | { ok: false; why: string } {
  const p = plotsOf(o)[i];
  const crop = CROP[cropId];
  if (!p || !crop) return { ok: false, why: 'Nothing to plant there.' };
  if (p.crop) return { ok: false, why: 'This bed is already growing something.' };
  if (crop.wet) return { ok: false, why: `${crop.name} needs a wet paddy outside.` };
  if (levelOf(farm) < crop.level) return { ok: false, why: `${crop.name} seeds come at farm level ${crop.level}.` };
  if (variety && !varietyChoice(farm, crop.id).some(v => v.id === variety)) return { ok: false, why: 'Those seeds aren’t ready yet.' };
  const price = seedPrice(crop, variety);
  if (!spend(farm, price, crop.id)) return { ok: false, why: `Those seeds cost ${price} coins.` };
  p.crop = crop.id;
  p.variety = variety;
  p.plantedAt = farm.t;
  p.readyAt = farm.t + (crop.growMin * 60) / glassSpeed(farm);
  bump(farm, 'planted');
  bump(farm, `planted:${crop.id}`);
  if (variety) bump(farm, 'planted-heirloom');
  return { ok: true };
}

export function pickPlot(farm: Farm, o: OtherObj, i: number): { ok: true; item: string; amount: number; stars: Stars } | { ok: false; why: string } {
  const p = plotsOf(o)[i];
  if (!p || plotState(farm, p) !== 'ready') return { ok: false, why: p?.crop ? 'Not ready yet.' : 'Nothing is growing here.' };
  const crop = CROP[p.crop!]!;
  const amount = crop.yield;
  if (roomLeft(farm) < amount) return { ok: false, why: 'The barn is full! The crop will wait.' };
  const item = p.variety ?? crop.id;
  const stars = plotStars(farm);
  add(farm, item, stars, amount);
  farm.xp += Math.max(1, Math.round(crop.growMin * 1.5));
  farm.scraps += 1;
  const page = ledgerNow(farm);
  page.grown[crop.id] = (page.grown[crop.id] ?? 0) + amount;
  bump(farm, 'harvest', amount);
  bump(farm, `harvest:${crop.id}`, amount);
  if (p.variety) bump(farm, `harvest:${p.variety}`, amount);
  if (stars === 3) bump(farm, 'stars3', amount);
  bump(farm, 'greenhouse-picked', amount);
  p.crop = null; p.variety = null; p.plantedAt = 0; p.readyAt = 0;
  return { ok: true, item, amount, stars };
}

/** The first ready bed in any greenhouse (for helpers and "Show me"). */
export function readyPlots(farm: Farm): { o: OtherObj; i: number }[] {
  const out: { o: OtherObj; i: number }[] = [];
  for (const o of farm.objects) if (isGreenhouse(o)) plotsOf(o).forEach((p, i) => { if (plotState(farm, p) === 'ready') out.push({ o, i }); });
  return out;
}

/** "While you were away" helps greenhouse beds too. */
export function greenhousesCatchUp(farm: Farm, seconds: number) {
  for (const o of farm.objects) if (isGreenhouse(o)) for (const p of plotsOf(o)) if (p.crop && farm.t < p.readyAt) { p.readyAt = Math.max(farm.t, p.readyAt - seconds); p.plantedAt -= seconds; }
}
