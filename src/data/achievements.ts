import type { SaveData } from '../app/save';
import { localized } from '../i18n';
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
  /** Translated (`badge.<id>.name` / `.desc`). */
  readonly name: string;
  readonly desc: string;
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

const BADGES: Omit<AchievementDef, 'name' | 'desc'>[] = [
  { id: 'first_steps', icon: 'heart', color: 0xff7ad9, check: (c) => c.save.tutorialDone },
  { id: 'first_win', icon: 'gem', color: 0x7ee8ff, check: wonCampaign },
  {
    id: 'perfect',
    icon: 'heart',
    color: 0xff4f7b,
    check: (c) => wonCampaign(c) && c.game!.lives === c.game!.maxLives,
  },
  { id: 'stars10', icon: 'star', color: 0xffd23f, check: (c) => c.totalStars >= 10 },
  { id: 'stars24', icon: 'star', color: 0xffb21f, check: (c) => c.totalStars >= 24 },
  { id: 'stars36', icon: 'crown', color: 0xffd23f, check: (c) => c.totalStars >= 36 },
  { id: 'only_water', icon: 'water', color: ELEMENTS.water.color, check: (c) => wonCampaign(c) && onlyElement(c.game!, 'water') },
  { id: 'only_fire', icon: 'fire', color: ELEMENTS.fire.color, check: (c) => wonCampaign(c) && onlyElement(c.game!, 'fire') },
  { id: 'only_nature', icon: 'nature', color: ELEMENTS.nature.color, check: (c) => wonCampaign(c) && onlyElement(c.game!, 'nature') },
  {
    id: 'no_basic',
    icon: 'light',
    color: ELEMENTS.light.color,
    check: (c) => wonCampaign(c) && c.game!.stats.towerTypes.size > 0 && BASIC_TOWERS.every((b) => !c.game!.stats.towerTypes.has(b)),
  },
  { id: 'combo5', icon: 'tower', color: 0x9b7cff, live: true, check: (c) => (c.game?.stats.combosBuilt ?? 0) >= 5 },
  {
    id: 'combo_all',
    icon: 'crown',
    color: 0x9b7cff,
    live: true,
    check: (c) => new Set([...c.save.lifetime.combos, ...[...(c.game?.stats.towerTypes ?? [])].filter((t) => COMBO_TOWERS.includes(t))]).size >= COMBO_TOWERS.length,
  },
  { id: 'all_elements', icon: 'gem', color: 0xff9be6, live: true, check: (c) => (c.game?.unlocked.length ?? 0) >= 6 },
  { id: 'saver', icon: 'coin', color: 0xffc928, live: true, check: (c) => (c.game?.stats.interestEarned ?? 0) >= 50 },
  { id: 'rich', icon: 'coin', color: 0xffb21f, live: true, check: (c) => (c.game?.stats.maxCoins ?? 0) >= 1000 },
  { id: 'early', icon: 'clock', color: 0x6cf06a, live: true, check: (c) => (c.game?.stats.wavesSentEarly ?? 0) >= 10 },
  { id: 'poof1k', icon: 'poof', color: 0xd6b8ff, live: true, check: (c) => c.save.lifetime.kills + (c.ended ? 0 : (c.game?.stats.kills ?? 0)) >= 1000 },
  { id: 'poof10k', icon: 'poof', color: 0xb48cff, live: true, check: (c) => c.save.lifetime.kills + (c.ended ? 0 : (c.game?.stats.kills ?? 0)) >= 10000 },
  { id: 'boss', icon: 'trophy', color: 0xff8f5a, live: true, check: (c) => (c.game?.stats.bossKills ?? 0) >= 1 },
  { id: 'king', icon: 'crown', color: 0xff8f5a, live: true, check: (c) => !!c.game?.stats.bossesKilled.includes('grumbleking') },
  { id: 'builder', icon: 'tower', color: 0xc0864a, live: true, check: (c) => (c.game?.stats.towersBuilt ?? 0) >= 30 },
  { id: 'max_power', icon: 'star', color: 0x8ff3ff, live: true, check: (c) => (c.game?.stats.maxLevel ?? 0) >= 4 },
  {
    id: 'maze',
    icon: 'maze',
    color: 0x6cf06a,
    live: true,
    check: (c) => !!c.game && c.game.map.style === 'maze' && c.game.stats.longestPath >= c.game.stats.shortestPath * 3,
  },
  { id: 'world2', icon: 'fire', color: 0xe8a64a, check: (c) => worldDone(c.save, 2) },
  { id: 'world3', icon: 'water', color: 0x6ab8ee, check: (c) => worldDone(c.save, 3) },
  { id: 'world4', icon: 'shadow', color: 0x9b7cff, check: (c) => worldDone(c.save, 4) },
  { id: 'hard_win', icon: 'trophy', color: 0xff5a6a, check: (c) => wonCampaign(c) && c.game!.diff.id === 'hard' },
  { id: 'endless25', icon: 'clock', color: 0x7ee8ff, live: true, check: (c) => c.mode === 'endless' && (c.game?.waveNum ?? 0) >= 25 },
];

export const ACHIEVEMENTS: AchievementDef[] = BADGES.map((b) => localized({ ...b } as AchievementDef, `badge.${b.id}`, ['name', 'desc'] as const));
