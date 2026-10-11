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
  { id: 'first_steps', name: 'First Steps', desc: 'Finish the tutorial with Pip.', icon: 'heart', color: 0xff7ad9, check: (c) => c.save.tutorialDone },
  { id: 'first_win', name: 'Crystal Keeper', desc: 'Win your first map.', icon: 'gem', color: 0x7ee8ff, check: wonCampaign },
  {
    id: 'perfect',
    name: 'Perfect Guard',
    desc: 'Win a map without losing a single life.',
    icon: 'heart',
    color: 0xff4f7b,
    check: (c) => wonCampaign(c) && c.game!.lives === c.game!.maxLives,
  },
  { id: 'stars10', name: 'Star Collector', desc: 'Collect 10 stars.', icon: 'star', color: 0xffd23f, check: (c) => c.totalStars >= 10 },
  { id: 'stars24', name: 'Superstar', desc: 'Collect 24 stars.', icon: 'star', color: 0xffb21f, check: (c) => c.totalStars >= 24 },
  { id: 'stars36', name: 'All the Stars!', desc: 'Collect all 36 stars.', icon: 'crown', color: 0xffd23f, check: (c) => c.totalStars >= 36 },
  { id: 'only_water', name: 'Just Add Water', desc: 'Win a map using only Water towers.', icon: 'water', color: ELEMENTS.water.color, check: (c) => wonCampaign(c) && onlyElement(c.game!, 'water') },
  { id: 'only_fire', name: 'Fire Friends', desc: 'Win a map using only Fire towers.', icon: 'fire', color: ELEMENTS.fire.color, check: (c) => wonCampaign(c) && onlyElement(c.game!, 'fire') },
  { id: 'only_nature', name: 'Green Thumb', desc: 'Win a map using only Nature towers.', icon: 'nature', color: ELEMENTS.nature.color, check: (c) => wonCampaign(c) && onlyElement(c.game!, 'nature') },
  {
    id: 'no_basic',
    name: 'Elements Only',
    desc: 'Win a map without building Arrow Posts or Pop Cannons.',
    icon: 'light',
    color: ELEMENTS.light.color,
    check: (c) => wonCampaign(c) && c.game!.stats.towerTypes.size > 0 && BASIC_TOWERS.every((b) => !c.game!.stats.towerTypes.has(b)),
  },
  { id: 'combo5', name: 'Combo Crafter', desc: 'Build 5 combo towers in one game.', icon: 'tower', color: 0x9b7cff, live: true, check: (c) => (c.game?.stats.combosBuilt ?? 0) >= 5 },
  {
    id: 'combo_all',
    name: 'Combo Master',
    desc: 'Build every one of the 15 combo towers (over all your games).',
    icon: 'crown',
    color: 0x9b7cff,
    live: true,
    check: (c) => new Set([...c.save.lifetime.combos, ...[...(c.game?.stats.towerTypes ?? [])].filter((t) => COMBO_TOWERS.includes(t))]).size >= COMBO_TOWERS.length,
  },
  { id: 'all_elements', name: 'Rainbow Wizard', desc: 'Unlock all 6 elements in one game.', icon: 'gem', color: 0xff9be6, live: true, check: (c) => (c.game?.unlocked.length ?? 0) >= 6 },
  { id: 'saver', name: 'Smart Saver', desc: 'Earn 50 bonus coins by saving in one game.', icon: 'coin', color: 0xffc928, live: true, check: (c) => (c.game?.stats.interestEarned ?? 0) >= 50 },
  { id: 'rich', name: 'Treasure Pile', desc: 'Have 1,000 coins at once.', icon: 'coin', color: 0xffb21f, live: true, check: (c) => (c.game?.stats.maxCoins ?? 0) >= 1000 },
  { id: 'early', name: 'Ready, Set, Go!', desc: 'Send 10 waves early in one game.', icon: 'clock', color: 0x6cf06a, live: true, check: (c) => (c.game?.stats.wavesSentEarly ?? 0) >= 10 },
  { id: 'poof1k', name: 'Poof Party', desc: 'Poof 1,000 creatures.', icon: 'poof', color: 0xd6b8ff, live: true, check: (c) => c.save.lifetime.kills + (c.ended ? 0 : (c.game?.stats.kills ?? 0)) >= 1000 },
  { id: 'poof10k', name: 'Mega Poof Party', desc: 'Poof 10,000 creatures.', icon: 'poof', color: 0xb48cff, live: true, check: (c) => c.save.lifetime.kills + (c.ended ? 0 : (c.game?.stats.kills ?? 0)) >= 10000 },
  { id: 'boss', name: 'Boss Buster', desc: 'Poof a boss.', icon: 'trophy', color: 0xff8f5a, live: true, check: (c) => (c.game?.stats.bossKills ?? 0) >= 1 },
  { id: 'king', name: 'Royal Rumble', desc: 'Poof the Grumble King.', icon: 'crown', color: 0xff8f5a, live: true, check: (c) => !!c.game?.stats.bossesKilled.includes('grumbleking') },
  { id: 'builder', name: 'Master Builder', desc: 'Build 30 towers in one game.', icon: 'tower', color: 0xc0864a, live: true, check: (c) => (c.game?.stats.towersBuilt ?? 0) >= 30 },
  { id: 'max_power', name: 'Max Power', desc: 'Upgrade a tower to level 4.', icon: 'star', color: 0x8ff3ff, live: true, check: (c) => (c.game?.stats.maxLevel ?? 0) >= 4 },
  {
    id: 'maze',
    name: 'Maze Maker',
    desc: 'Make the creatures walk 3 times farther on a maze map.',
    icon: 'maze',
    color: 0x6cf06a,
    live: true,
    check: (c) => !!c.game && c.game.map.style === 'maze' && c.game.stats.longestPath >= c.game.stats.shortestPath * 3,
  },
  { id: 'world2', name: 'Desert Explorer', desc: 'Win every map in Dune Desert.', icon: 'fire', color: 0xe8a64a, check: (c) => worldDone(c.save, 2) },
  { id: 'world3', name: 'Snow Hero', desc: 'Win every map in Frosty Peaks.', icon: 'water', color: 0x6ab8ee, check: (c) => worldDone(c.save, 3) },
  { id: 'world4', name: 'Cave Champion', desc: 'Win every map in Crystal Caves.', icon: 'shadow', color: 0x9b7cff, check: (c) => worldDone(c.save, 4) },
  { id: 'hard_win', name: 'Brave Hero', desc: 'Win a map on Hard.', icon: 'trophy', color: 0xff5a6a, check: (c) => wonCampaign(c) && c.game!.diff.id === 'hard' },
  { id: 'endless25', name: 'Never Give Up', desc: 'Reach wave 25 in Endless mode.', icon: 'clock', color: 0x7ee8ff, live: true, check: (c) => c.mode === 'endless' && (c.game?.waveNum ?? 0) >= 25 },
];
