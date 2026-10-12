// Seasons: spring → summer → autumn → winter, 7 in-game days each (a 28-day year). Seasonal
// creatures, flowers and forage come and go with them. The story never depends on a season.
import { dayRng } from '../core/rng';
import { item, RECIPES } from '../data/registry';
import type { Season } from '../data/types';
import { Ground } from '../world/types';
import { learnRecipe } from './crafting';
import type { Game } from './game';

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_DAYS = 7;
export const SEASON_NAME: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
export const SEASON_ICON: Record<Season, string> = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };

export function seasonOf(g: Game): Season {
  return SEASONS[(g.state.season?.index ?? 0) % 4]!;
}

/** Is something with this `seasons` list around right now? (no list = all year) */
export function inSeason(g: Game, seasons: Season[] | undefined): boolean {
  return !seasons || seasons.includes(seasonOf(g));
}

/** Daily hook (runs first): move the calendar on, unless seasons are paused. */
export function dailySeason(g: Game): void {
  const s = g.state.season;
  const today = g.state.clock.day;
  if (s.lastDay === today) return;
  const first = s.lastDay === 0;
  s.lastDay = today;
  if (first || s.paused) return;
  s.day += 1;
  if (s.day > SEASON_DAYS) {
    s.day = 1;
    s.index = (s.index + 1) % 4;
    g.emit('seasonChanged', { season: seasonOf(g) });
  }
}

/** Pause or resume the seasons for this island. */
export function setSeasonsPaused(g: Game, paused: boolean): void {
  g.state.season.paused = paused;
}

/** Jump straight to a season (debug / tests / screenshots). */
export function setSeason(g: Game, season: Season, day = 1): void {
  g.state.season.index = SEASONS.indexOf(season);
  g.state.season.day = day;
  g.emit('seasonChanged', { season });
}

/** What changes, in a few easy words (shown when a season begins). */
export const SEASON_NEWS: Record<Season, string> = {
  spring: 'Spring is here! Pink petals fall from the trees. Look for Blossomcup flowers!',
  summer: 'Summer is here! Sea glass washes up on the beach. Big fish swim in the sea!',
  autumn: 'Autumn is here! Leaves turn orange, and pumpkins grow in the fields!',
  winter: 'Winter is here! Snow covers the island. Shake pine trees for Snowberries!',
};

/** What the season leaves on the ground each morning. */
const FORAGE: Record<Season, { item: string; where: 'trees' | 'beach' | 'grass'; count: number }[]> = {
  spring: [{ item: 'blossom_petals', where: 'trees', count: 8 }],
  summer: [{ item: 'sea_glass', where: 'beach', count: 5 }],
  autumn: [
    { item: 'maple_leaves', where: 'trees', count: 9 },
    { item: 'hearth_pumpkin', where: 'grass', count: 3 },
  ],
  winter: [{ item: 'snow_crystal', where: 'grass', count: 7 }],
};
/** Wild seasonal flowers that pop up (species index, colors 0..2). */
const WILD_FLOWERS: Partial<Record<Season, number>> = { spring: 6, winter: 7 };

/** Daily spawns for the season (separate RNG stream, so the classic spawns stay the same). */
export function seasonalSpawns(g: Game): void {
  const s = g.state;
  const w = g.world;
  const objs = s.world.objects;
  const season = seasonOf(g);
  const rng = dayRng(s.seed, s.clock.day, 'season');
  // wild seasonal flowers fade when their season ends
  for (const key in objs) {
    const o = objs[key]!;
    if (o.k === 'flower' && o.tag === 'wild' && WILD_FLOWERS[season] !== Math.floor((o.v ?? 0) / 16)) delete objs[key];
  }
  const N = w.size;
  const free = (i: number) => !objs[i] && !w.structure(i);
  const grass: number[] = [], sand: number[] = [], nearTrees: number[] = [];
  for (let i = 0; i < N * N; i++) {
    if (!free(i)) continue;
    const gr = w.ground(i);
    if (gr === Ground.Grass) grass.push(i);
    else if (gr === Ground.Sand) sand.push(i);
  }
  for (const key in objs) {
    const o = objs[key]!;
    if (o.k !== 'tree' && o.k !== 'fruitTree') continue;
    const i = +key, x = i % N, z = (i / N) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (!w.inb(x + dx, z + dz)) continue;
      const j = w.idx(x + dx, z + dz);
      if (free(j) && w.ground(j) === Ground.Grass && w.height(j) === w.height(i)) nearTrees.push(j);
    }
  }
  const take = (list: number[]): number | undefined => {
    while (list.length) {
      const k = rng.int(0, list.length - 1);
      const i = list[k]!;
      list[k] = list[list.length - 1]!;
      list.pop();
      if (free(i)) return i;
    }
    return undefined;
  };
  for (const f of FORAGE[season]) {
    const list = f.where === 'trees' ? nearTrees : f.where === 'beach' ? sand : grass;
    for (let k = 0; k < f.count; k++) {
      const i = take(list);
      if (i !== undefined) objs[i] = { k: 'item', item: f.item, q: 1, tag: 'spawn' };
    }
  }
  const sp = WILD_FLOWERS[season];
  if (sp !== undefined) {
    let wild = 0;
    for (const key in objs) if (objs[key]!.tag === 'wild') wild++;
    for (let k = wild; k < 10; k++) {
      const i = take(grass);
      if (i !== undefined) objs[i] = { k: 'flower', v: sp * 16 + rng.int(0, 2), g: 3, tag: 'wild' };
    }
  }
  g.emit('objectsChanged', {});
}

/** Picking up a season's treasure for the first time teaches that season's recipes. */
export function learnSeasonRecipes(g: Game, itemId: string): number {
  const seasons = item(itemId).seasons;
  if (!seasons || item(itemId).cat === 'fish' || item(itemId).cat === 'bug') return 0;
  let n = 0;
  for (const r of RECIPES) if (r.unlock === 'season' && r.season && seasons.includes(r.season) && learnRecipe(g, r.id, 'season', true)) n++;
  if (n) {
    g.toast(`${SEASON_ICON[seasons[0]!]} You learned ${n} ${SEASON_NAME[seasons[0]!]} recipes! Check your workbench.`, 'good', itemId);
    g.emit('sfx', { name: 'learn' });
  }
  return n;
}

export function installSeasons(g: Game): void {
  g.bus.on('itemGained', (e) => {
    if (e.source === 'pickup' || e.source === 'shake' || e.source === 'forage') learnSeasonRecipes(g, e.id);
  });
}
