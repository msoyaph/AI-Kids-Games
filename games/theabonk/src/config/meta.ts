import type { ShopDef, ShrineDef } from './types';

/** Permanent upgrades bought with gold between runs. */
export const SHOP: ShopDef[] = [
  { id: 'might', name: 'Heavier Mallet', description: '+5% damage per rank.', stat: 'might', perRank: 0.05, maxRank: 5, baseCost: 60, costGrowth: 1.6 },
  { id: 'maxHp', name: 'Thick Quilt', description: '+10 max HP per rank.', stat: 'maxHp', perRank: 10, maxRank: 5, baseCost: 50, costGrowth: 1.55 },
  { id: 'armor', name: 'Copper Rivets', description: '-1 damage taken per hit per rank.', stat: 'armor', perRank: 1, maxRank: 3, baseCost: 90, costGrowth: 1.9 },
  { id: 'regen', name: 'Herbal Tea', description: '+0.15 HP/s regeneration per rank.', stat: 'regen', perRank: 0.15, maxRank: 4, baseCost: 80, costGrowth: 1.7 },
  { id: 'moveSpeed', name: 'Springy Soles', description: '+4% move speed per rank.', stat: 'moveSpeed', perRank: 0.04, maxRank: 4, baseCost: 70, costGrowth: 1.6 },
  { id: 'cooldown', name: 'Oiled Gears', description: '-3% cooldowns per rank.', stat: 'cooldown', perRank: 0.03, maxRank: 4, baseCost: 120, costGrowth: 1.7 },
  { id: 'area', name: 'Long Reach', description: '+4% area per rank.', stat: 'area', perRank: 0.04, maxRank: 4, baseCost: 80, costGrowth: 1.6 },
  { id: 'duration', name: 'Slow Candle', description: '+5% duration per rank.', stat: 'duration', perRank: 0.05, maxRank: 3, baseCost: 80, costGrowth: 1.6 },
  { id: 'magnet', name: 'Sticky Pockets', description: '+0.6 pickup reach per rank.', stat: 'magnet', perRank: 0.6, maxRank: 4, baseCost: 40, costGrowth: 1.5 },
  { id: 'growth', name: 'Study Lamp', description: '+4% experience per rank.', stat: 'growth', perRank: 0.04, maxRank: 5, baseCost: 70, costGrowth: 1.6 },
  { id: 'greed', name: 'Coin Purse', description: '+8% gold per rank.', stat: 'greed', perRank: 0.08, maxRank: 5, baseCost: 40, costGrowth: 1.55 },
  { id: 'luck', name: 'Lucky Acorn', description: '+5% luck per rank.', stat: 'luck', perRank: 0.05, maxRank: 4, baseCost: 90, costGrowth: 1.7 },
  { id: 'reroll', name: 'Second Thoughts', description: '+1 upgrade reroll per run per rank.', stat: 'reroll', perRank: 1, maxRank: 3, baseCost: 150, costGrowth: 1.8 },
  { id: 'skip', name: 'Fresh Page', description: '+1 level-up skip per run per rank (you always get one).', stat: 'skip', perRank: 1, maxRank: 3, baseCost: 120, costGrowth: 1.8 },
  { id: 'banish', name: 'Cross It Off', description: '+1 banish per run per rank: remove an offer for the rest of the run.', stat: 'banish', perRank: 1, maxRank: 3, baseCost: 160, costGrowth: 1.8 },
  { id: 'revival', name: 'Spare Heart', description: 'Revive once per run.', stat: 'revival', perRank: 1, maxRank: 1, baseCost: 600, costGrowth: 1 },
  { id: 'amount', name: 'Twin Spirits', description: '+1 projectile / orb / bolt.', stat: 'amount', perRank: 1, maxRank: 1, baseCost: 1200, costGrowth: 1 },
];

export function shopCost(def: ShopDef, rank: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, rank));
}

/** Breakable shrines: bonk them to receive a temporary blessing. */
export const SHRINES: ShrineDef[] = [
  { kind: 'might', name: 'Shrine of Fury', description: '+60% damage for 30s', duration: 30, color: 0xff5a4f, weight: 3 },
  { kind: 'haste', name: 'Shrine of Haste', description: '+35% speed and -25% cooldowns for 30s', duration: 30, color: 0x55d6ff, weight: 3 },
  { kind: 'ward', name: 'Shrine of Warding', description: 'Invulnerable for 8s and heal 30%', duration: 8, color: 0xfff2a8, weight: 2 },
  { kind: 'magnet', name: 'Shrine of Gathering', description: 'Pulls every gem on the map to you', duration: 0, color: 0x6dff8a, weight: 2 },
  { kind: 'fortune', name: 'Shrine of Wisdom', description: 'Double experience for 30s', duration: 30, color: 0xd07bff, weight: 2 },
  { kind: 'gold', name: 'Shrine of Plenty', description: 'A shower of gold coins', duration: 0, color: 0xffcc33, weight: 2 },
];

export const SHRINE_HP = 3;
export const SHRINE_COUNT = 14;
