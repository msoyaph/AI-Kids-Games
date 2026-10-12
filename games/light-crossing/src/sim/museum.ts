// Museum: fossil assessment, donations, wing progress and completion rewards.
import { dayRng } from '../core/rng';
import { BUGS, FISH, FOSSILS, item } from '../data/registry';
import type { Game } from './game';
import { give, money, removeAt, removeItem, stat } from './inventory';
import { learnRecipe } from './crafting';

export type Wing = 'fish' | 'bugs' | 'fossils';

export const WING_TOTAL: Record<Wing, number> = { fish: FISH.length, bugs: BUGS.length, fossils: FOSSILS.length };
export const WING_REWARD: Record<Wing, { recipe: string; lumens: number }> = {
  fish: { recipe: 'r_furn_tidepool_tank', lumens: 3000 },
  bugs: { recipe: 'r_furn_critter_terrarium', lumens: 3000 },
  fossils: { recipe: 'r_furn_wingbone_statue', lumens: 3000 },
};

export function wingOf(id: string): Wing | null {
  const c = item(id).cat;
  if (c === 'fish') return 'fish';
  if (c === 'bug') return 'bugs';
  if (c === 'fossil') return 'fossils';
  return null;
}

export function isDonated(g: Game, id: string): boolean {
  return g.state.museum.donated.includes(id);
}

export function canDonate(g: Game, id: string): boolean {
  return wingOf(id) !== null && !isDonated(g, id);
}

export function wingCount(g: Game, wing: Wing): number {
  return g.state.museum.donated.filter((id) => wingOf(id) === wing).length;
}

export function museumPercent(g: Game): number {
  const total = WING_TOTAL.fish + WING_TOTAL.bugs + WING_TOTAL.fossils;
  return Math.round((g.state.museum.donated.length / total) * 100);
}

export function donateSlot(g: Game, slot: number): boolean {
  const s = g.state.player.inv[slot];
  if (!s || !canDonate(g, s.id)) return false;
  const id = s.id;
  const wing = wingOf(id)!;
  removeAt(g, slot, 1, 'donate');
  g.state.museum.donated.push(id);
  stat(g, 'donations');
  g.emit('donated', { id, kind: wing });
  g.emit('sfx', { name: 'donate' });
  if (wingCount(g, wing) >= WING_TOTAL[wing] && !g.state.flags[`wing_${wing}`]) {
    g.state.flags[`wing_${wing}`] = 1;
    const rw = WING_REWARD[wing];
    money(g, 0, rw.lumens, 'museum');
    learnRecipe(g, rw.recipe, 'museum');
    g.toast(`The ${wing} wing is complete! +${rw.lumens} Lumens`, 'good');
  }
  return true;
}

/** Identify one Mystery Fossil, preferring fossils the player hasn't donated or owned. */
export function assessFossil(g: Game): string | null {
  if (!removeItem(g, 'fossil_unknown', 1, 'assess')) return null;
  const n = g.state.stats.fossilsAssessed ?? 0;
  const rng = dayRng(g.state.seed, g.state.clock.day * 100 + n, 'fossil');
  const fresh = FOSSILS.filter((f) => !isDonated(g, f.id) && !g.state.catalog.owned[f.id]);
  const notDonated = FOSSILS.filter((f) => !isDonated(g, f.id));
  const pool = fresh.length && rng.chance(0.75) ? fresh : notDonated.length && rng.chance(0.6) ? notDonated : FOSSILS;
  const f = rng.pick(pool);
  give(g, f.id, 1, 'assess');
  stat(g, 'fossilsAssessed');
  g.emit('fossilAssessed', { id: f.id });
  return f.id;
}
