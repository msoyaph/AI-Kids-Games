/** Buying upgrades with saved coins. Pure: every function returns a new save or a plain answer. */
import { UPGRADE_BY_ID, type UpgradeId } from './data/upgrades';
import type { Save } from './storage';

/** The level the player owns (never more than the upgrade has). */
export const levelOf = (data: Save, id: UpgradeId) => Math.min(UPGRADE_BY_ID[id].costs.length, Math.max(0, Math.floor(data.upgrades[id] ?? 0)));

/** What the next level costs, or null when it is as good as it gets. */
export const nextCost = (data: Save, id: UpgradeId): number | null => UPGRADE_BY_ID[id].costs[levelOf(data, id)] ?? null;

/** Buy the next level. Returns null (and changes nothing) when it is maxed or there are too few coins. */
export function buy(data: Save, id: UpgradeId): Save | null {
  const cost = nextCost(data, id);
  if (cost === null || data.coins < cost) return null;
  return { ...data, coins: data.coins - cost, upgrades: { ...data.upgrades, [id]: levelOf(data, id) + 1 } };
}
