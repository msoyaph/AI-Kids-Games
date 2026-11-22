/**
 * The shop: things for the diner, bought with coins earned at the counter. Each has a few
 * levels; `costs[n]` is the price of level n + 1. What a level does is applied in sim.ts (modsFor).
 */
export type UpgradeId = 'stove' | 'shoes' | 'mats' | 'tray' | 'tips' | 'cake';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  /** What each level does, as a short sentence. */
  text: string;
  costs: number[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'shoes', name: 'Speedy shoes', text: 'You walk a little faster.', costs: [40, 120, 260] },
  { id: 'stove', name: 'Hot stoves', text: 'Food cooks a little faster.', costs: [50, 140, 300] },
  { id: 'mats', name: 'Comfy mats', text: 'Friends are happy to wait longer.', costs: [50, 140, 300] },
  { id: 'tips', name: 'Tip jar', text: 'Every happy friend leaves one more coin.', costs: [60, 160, 340] },
  { id: 'cake', name: 'Bigger cake', text: 'One more round of free cake each day.', costs: [80, 220] },
  { id: 'tray', name: 'Bigger tray', text: 'Your tray holds one more thing.', costs: [200] },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u])) as Record<UpgradeId, UpgradeDef>;
