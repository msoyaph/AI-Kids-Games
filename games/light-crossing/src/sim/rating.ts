// "Island Glow" rating (1-5 lanterns) from residents, museum, decorations, flowers, homes,
// infrastructure, friendships — minus weeds.
import { FISH, BUGS, FOSSILS, item } from '../data/registry';
import type { Game } from './game';
import { islandDecorPoints } from './decor';
import { hearts, residents } from './villagers';

export interface RatingBreakdown {
  residents: number;
  museum: number;
  decor: number;
  /** furniture, wall and tabletop decorations inside your home (bonus, capped) */
  homeDecor: number;
  flowers: number;
  home: number;
  paths: number;
  friends: number;
  weeds: number;
  total: number;
  stars: number;
}

export const RATING_STEPS = [0, 20, 40, 60, 80];

export function ratingBreakdown(g: Game): RatingBreakdown {
  const s = g.state;
  const res = residents(g);
  // measured against the core (all-year) collection, so seasonal additions never lower the score
  const museumTotal = FISH.filter((f) => !f.seasons).length + BUGS.filter((b) => !b.seasons).length + FOSSILS.length;
  let flowers = 0, weeds = 0;
  for (const key in s.world.objects) {
    const o = s.world.objects[key]!;
    if (o.k === 'flower' && (o.g ?? 3) >= 2) flowers++;
    else if (o.k === 'weed') weeds++;
  }
  let paths = 0;
  for (const st of s.world.structures) if (st.type === 'bridge' || st.type === 'ramp') paths++;
  const heartSum = res.reduce((a, id) => a + hearts(s.villagers[id]!.friendship), 0);
  const b = {
    residents: res.length * 5,
    museum: Math.round(Math.min(1, s.museum.donated.length / museumTotal) * 20),
    decor: Math.min(20, islandDecorPoints(g)),
    homeDecor: Math.min(HOME_DECOR_MAX, Math.floor(homeDecorPoints(g) / 4)),
    flowers: Math.min(12, Math.floor(flowers / 6)),
    home: Math.max(0, s.home.level) * 2,
    paths: Math.min(6, paths * 2),
    friends: Math.min(8, Math.floor(heartSum / 4)),
    weeds: -Math.min(10, Math.floor(weeds * 0.3)),
    total: 0,
    stars: 1,
  };
  b.total = Math.max(0, b.residents + b.museum + b.decor + b.homeDecor + b.flowers + b.home + b.paths + b.friends + b.weeds);
  b.stars = RATING_STEPS.filter((t) => b.total >= t).length;
  return b;
}

/** The home décor bonus never goes above this, so it only ever helps. */
export const HOME_DECOR_MAX = 6;

/** Decor points of everything placed inside your home: floor, wall and tabletop pieces. */
export function homeDecorPoints(g: Game): number {
  const h = g.state.home;
  let pts = 0;
  for (const floor of [h, h.basement]) {
    if (!floor) continue;
    for (const pf of floor.furniture) pts += item(pf.id).furn?.decor ?? 1;
    for (const wi of floor.walls ?? []) pts += item(wi.id).furn?.decor ?? 1;
  }
  return pts;
}

export function islandStars(g: Game): number {
  return ratingBreakdown(g).stars;
}
