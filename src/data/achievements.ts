import type { SaveData } from '../app/save';
import type { Game, GameMode } from '../sim/Game';
import { ELEMENTS, type ElementId } from './elements';
import { mapsOfWorld } from './worlds';
import { BASIC_TOWERS, COMBO_TOWERS, TOWERS } from './towers';

export type BadgeIcon = 'star' | 'gem' | 'crown' | 'heart' | 'coin' | 'tower' | 'poof' | 'clock' | 'maze' | 'trophy' | ElementId;

export interface AchievementCtx {
  game: Game | null;
  /** Run finished with a win (only true at the end of a run). */
  won: boolean;
  ended: boolean;
  mode: GameMode | null;
  save: SaveData;
  totalStars: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: BadgeIcon;
  color: number;
  /** Can be earned mid-game (checked live), not only at the end. */
  live?: boolean;
  check(c: AchievementCtx): boolean;
}

const onlyElement = (g: Game, el: ElementId): boolean =>
  g.stats.towerTypes.size > 0 && [...g.stats.towerTypes].every((t) => TOWERS[t].elements.includes(el));

const wonCampaign = (c: AchievementCtx): boolean => c.ended && c.won && c.mode === 'campaign' && !!c.game;

const worldDone = (save: SaveData, world: number): boolean =>
  mapsOfWorld(world).every((m) => Object.values(save.maps[m.id]?.stars ?? {}).some((n) => (n ?? 0) > 0));

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_steps', name: 'Field Ready', desc: 'Finish Training with PIP.', icon: 'heart', color: 0xff7ad9, check: (c) => c.save.tutorialDone },
  { id: 'first_win', name: 'First Contact', desc: 'Secure your first sector.', icon: 'gem', color: 0x7ee8ff, check: wonCampaign },
  {
    id: 'perfect',
    name: 'Flawless Grid',
    desc: 'Win a sector without losing a single life.',
    icon: 'heart',
    color: 0xff4f7b,
    check: (c) => wonCampaign(c) && c.game!.lives === c.game!.maxLives,
  },
  { id: 'stars10', name: 'Rising Commander', desc: 'Earn 10 stars.', icon: 'star', color: 0xffd23f, check: (c) => c.totalStars >= 10 },
  { id: 'stars24', name: 'Decorated Commander', desc: 'Earn 24 stars.', icon: 'star', color: 0xffb21f, check: (c) => c.totalStars >= 24 },
  { id: 'stars36', name: 'Grid Legend', desc: 'Earn all 36 stars.', icon: 'crown', color: 0xffd23f, check: (c) => c.totalStars >= 36 },
  { id: 'only_water', name: 'Tidebound', desc: 'Win a sector using only Water towers.', icon: 'water', color: ELEMENTS.water.color, check: (c) => wonCampaign(c) && onlyElement(c.game!, 'water') },
  { id: 'only_fire', name: 'Pyromancer', desc: 'Win a sector using only Fire towers.', icon: 'fire', color: ELEMENTS.fire.color, check: (c) => wonCampaign(c) && onlyElement(c.game!, 'fire') },
  { id: 'only_nature', name: 'Overgrowth', desc: 'Win a sector using only Nature towers.', icon: 'nature', color: ELEMENTS.nature.color, check: (c) => wonCampaign(c) && onlyElement(c.game!, 'nature') },
  {
    id: 'no_basic',
    name: 'Pure Elements',
    desc: 'Win a sector without building Bolt Turrets or Impact Cannons.',
    icon: 'light',
    color: ELEMENTS.light.color,
    check: (c) => wonCampaign(c) && c.game!.stats.towerTypes.size > 0 && BASIC_TOWERS.every((b) => !c.game!.stats.towerTypes.has(b)),
  },
  { id: 'combo5', name: 'Fusion Engineer', desc: 'Build 5 combo towers in one match.', icon: 'tower', color: 0x9b7cff, live: true, check: (c) => (c.game?.stats.combosBuilt ?? 0) >= 5 },
  {
    id: 'combo_all',
    name: 'Fusion Archive',
    desc: 'Build all 15 combo towers (across all matches).',
    icon: 'crown',
    color: 0x9b7cff,
    live: true,
    check: (c) => new Set([...c.save.lifetime.combos, ...[...(c.game?.stats.towerTypes ?? [])].filter((t) => COMBO_TOWERS.includes(t))]).size >= COMBO_TOWERS.length,
  },
  { id: 'all_elements', name: 'Full Spectrum', desc: 'Unlock all 6 elements in one match.', icon: 'gem', color: 0xff9be6, live: true, check: (c) => (c.game?.unlocked.length ?? 0) >= 6 },
  { id: 'saver', name: 'Compound Interest', desc: 'Earn 50 gold from interest in one match.', icon: 'coin', color: 0xffc928, live: true, check: (c) => (c.game?.stats.interestEarned ?? 0) >= 50 },
  { id: 'rich', name: 'War Chest', desc: 'Hold 1,000 gold at once.', icon: 'coin', color: 0xffb21f, live: true, check: (c) => (c.game?.stats.maxCoins ?? 0) >= 1000 },
  { id: 'early', name: 'Aggressive Tempo', desc: 'Call 10 waves early in one match.', icon: 'clock', color: 0x6cf06a, live: true, check: (c) => (c.game?.stats.wavesSentEarly ?? 0) >= 10 },
  { id: 'poof1k', name: 'Shatterpoint', desc: 'Destroy 1,000 constructs.', icon: 'poof', color: 0xd6b8ff, live: true, check: (c) => c.save.lifetime.kills + (c.ended ? 0 : (c.game?.stats.kills ?? 0)) >= 1000 },
  { id: 'poof10k', name: 'Crystal Storm', desc: 'Destroy 10,000 constructs.', icon: 'poof', color: 0xb48cff, live: true, check: (c) => c.save.lifetime.kills + (c.ended ? 0 : (c.game?.stats.kills ?? 0)) >= 10000 },
  { id: 'boss', name: 'Titan Breaker', desc: 'Destroy a boss construct.', icon: 'trophy', color: 0xff8f5a, live: true, check: (c) => (c.game?.stats.bossKills ?? 0) >= 1 },
  { id: 'king', name: 'Null and Void', desc: 'Defeat Archon Null.', icon: 'crown', color: 0xff8f5a, live: true, check: (c) => !!c.game?.stats.bossesKilled.includes('grumbleking') },
  { id: 'builder', name: 'Grid Architect', desc: 'Build 30 towers in one match.', icon: 'tower', color: 0xc0864a, live: true, check: (c) => (c.game?.stats.towersBuilt ?? 0) >= 30 },
  { id: 'max_power', name: 'Overclocked', desc: 'Upgrade a tower to level 4.', icon: 'star', color: 0x8ff3ff, live: true, check: (c) => (c.game?.stats.maxLevel ?? 0) >= 4 },
  {
    id: 'maze',
    name: 'Labyrinth',
    desc: 'Make constructs walk 3 times farther on a maze sector.',
    icon: 'maze',
    color: 0x6cf06a,
    live: true,
    check: (c) => !!c.game && c.game.map.style === 'maze' && c.game.stats.longestPath >= c.game.stats.shortestPath * 3,
  },
  { id: 'world2', name: 'Ember Wastes Cleared', desc: 'Secure every sector in the Ember Wastes.', icon: 'fire', color: 0xe8a64a, check: (c) => worldDone(c.save, 2) },
  { id: 'world3', name: 'Frostspire Cleared', desc: 'Secure every sector on Frostspire Peaks.', icon: 'water', color: 0x6ab8ee, check: (c) => worldDone(c.save, 3) },
  { id: 'world4', name: 'Hollow Deep Cleared', desc: 'Secure every sector in the Hollow Deep.', icon: 'shadow', color: 0x9b7cff, check: (c) => worldDone(c.save, 4) },
  { id: 'hard_win', name: 'Hardened', desc: 'Win a sector on Hard.', icon: 'trophy', color: 0xff5a6a, check: (c) => wonCampaign(c) && c.game!.diff.id === 'hard' },
  { id: 'endless25', name: 'Unbroken Line', desc: 'Reach wave 25 in Endless.', icon: 'clock', color: 0x7ee8ff, live: true, check: (c) => c.mode === 'endless' && (c.game?.waveNum ?? 0) >= 25 },
];
