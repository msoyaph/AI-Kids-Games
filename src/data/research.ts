import { TUNING, type ResearchBranch, type ResearchEffect, type ResearchNodeTuning } from './tuning';

/** Research ranks bought: node id → rank. */
export type ResearchState = Record<string, number>;

export const RESEARCH_IDS = Object.keys(TUNING.research);
export const RESEARCH_BRANCHES: ResearchBranch[] = ['arsenal', 'economy', 'citadel', 'command'];

export function researchNode(id: string): ResearchNodeTuning | undefined {
  return TUNING.research[id];
}

/** Stars spent on research (all refunded by a reset). */
export function researchSpent(r: ResearchState): number {
  let n = 0;
  for (const [id, rank] of Object.entries(r)) {
    const node = TUNING.research[id];
    if (!node) continue;
    for (let i = 0; i < Math.min(rank, node.cost.length); i++) n += node.cost[i]!;
  }
  return n;
}

export type BuyCheck = 'ok' | 'max' | 'stars' | 'requires' | 'unknown';

/** Can the next rank of `id` be bought with `starsFree` unspent stars? */
export function canResearch(r: ResearchState, id: string, starsFree: number): BuyCheck {
  const node = TUNING.research[id];
  if (!node) return 'unknown';
  const rank = r[id] ?? 0;
  if (rank >= node.cost.length) return 'max';
  if (node.requires?.some((req) => (r[req] ?? 0) <= 0)) return 'requires';
  if (starsFree < node.cost[rank]!) return 'stars';
  return 'ok';
}

/** Everything research adds to a run (summed over ranks). */
export interface RunBonuses {
  buildDiscount: number;
  damage: number;
  range: number;
  refund: number;
  startGold: number;
  interest: number;
  startCores: number;
  lives: number;
  abilityCooldown: number;
  heroLevel: number;
}

export const NO_BONUSES: Readonly<RunBonuses> = {
  buildDiscount: 0,
  damage: 0,
  range: 0,
  refund: 0,
  startGold: 0,
  interest: 0,
  startCores: 0,
  lives: 0,
  abilityCooldown: 0,
  heroLevel: 0,
};

export function bonusesFrom(r: ResearchState): RunBonuses {
  const b: RunBonuses = { ...NO_BONUSES };
  for (const [id, rank] of Object.entries(r)) {
    const node = TUNING.research[id];
    if (!node || rank <= 0) continue;
    const n = Math.min(rank, node.cost.length);
    const per: ResearchEffect = node.per;
    for (const k of Object.keys(b) as (keyof RunBonuses)[]) {
      const v = per[k];
      if (typeof v === 'number') b[k] += v * n;
    }
  }
  return b;
}
