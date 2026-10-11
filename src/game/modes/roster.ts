import type { KartConfig } from '../../data/types';
import { RACERS } from '../../data/racers';
import { PAINTS } from '../../data/parts';
import { Rng } from '../../core/rng';
import type { AiSlot } from '../session';

/** Pick AI opponents (any racer, not the players' picks) with their signature karts. Two get a "rival" boost. */
export function pickOpponents(exclude: string[], count: number, seed: number, rivals = 2): AiSlot[] {
  const rng = new Rng(seed);
  let pool = RACERS.filter((r) => !exclude.includes(r.id));
  if (pool.length === 0) pool = [...RACERS];
  rng.shuffle(pool);
  const out: AiSlot[] = [];
  for (let i = 0; i < count; i++) {
    const r = pool[i % pool.length];
    out.push({ racerId: r.id, kart: aiKart(r.id, rng), skillBonus: i < rivals ? 0.08 : 0 });
  }
  return out;
}

export function aiKart(racerId: string, rng: Rng): KartConfig {
  const r = RACERS.find((x) => x.id === racerId) ?? RACERS[0];
  // prefer a paint close to the racer's signature colour, otherwise random
  const paint = PAINTS.find((p) => p.color === r.color)?.id ?? rng.pick(PAINTS).id;
  return { ...r.defaultKart, paint, decal: 'none' };
}
