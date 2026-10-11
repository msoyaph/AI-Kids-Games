// "Island Glow" rating (1-5 lanterns) from residents, museum, decorations, flowers, homes,
// infrastructure, friendships — minus weeds.
import { FISH, BUGS, FOSSILS } from '../data/registry';
import type { Game } from './game';
import { islandDecorPoints } from './decor';
import { hearts, residents } from './villagers';

export interface RatingBreakdown {
  residents: number;
  museum: number;
  decor: number;
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
  const museumTotal = FISH.length + BUGS.length + FOSSILS.length;
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
    museum: Math.round((s.museum.donated.length / museumTotal) * 20),
    decor: Math.min(20, islandDecorPoints(g)),
    flowers: Math.min(12, Math.floor(flowers / 6)),
    home: Math.max(0, s.home.level) * 2,
    paths: Math.min(6, paths * 2),
    friends: Math.min(8, Math.floor(heartSum / 4)),
    weeds: -Math.min(10, Math.floor(weeds * 0.3)),
    total: 0,
    stars: 1,
  };
  b.total = Math.max(0, b.residents + b.museum + b.decor + b.flowers + b.home + b.paths + b.friends + b.weeds);
  b.stars = RATING_STEPS.filter((t) => b.total >= t).length;
  return b;
}

export function islandStars(g: Game): number {
  return ratingBreakdown(g).stars;
}
