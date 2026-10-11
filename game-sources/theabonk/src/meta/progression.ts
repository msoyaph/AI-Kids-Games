import { ACHIEVEMENTS, type AchievementContext, type AchievementDef } from '../config/achievements';
import { SHOP, shopCost } from '../config/meta';
import type { PlayerStats } from '../config/types';
import type { World } from '../sim/world';
import type { SaveData } from './save';

// ───────────────────────────── shop ─────────────────────────────

export function shopRank(save: SaveData, id: string): number {
  return save.shop[id] ?? 0;
}

export function nextCost(save: SaveData, id: string): number | null {
  const def = SHOP.find((s) => s.id === id);
  if (!def) return null;
  const r = shopRank(save, id);
  return r >= def.maxRank ? null : shopCost(def, r);
}

export function buy(save: SaveData, id: string): boolean {
  const cost = nextCost(save, id);
  if (cost === null || save.gold < cost) return false;
  save.gold -= cost;
  save.shop[id] = shopRank(save, id) + 1;
  return true;
}

export function totalSpent(save: SaveData): number {
  let sum = 0;
  for (const def of SHOP) for (let r = 0; r < shopRank(save, def.id); r++) sum += shopCost(def, r);
  return sum;
}

export function refundAll(save: SaveData): number {
  const g = totalSpent(save);
  save.gold += g;
  save.shop = {};
  return g;
}

/** Permanent stat bonuses from the shop. */
export function metaBonuses(save: SaveData): Partial<PlayerStats> {
  const out: Partial<PlayerStats> = {};
  for (const def of SHOP) {
    const r = shopRank(save, def.id);
    if (r > 0) out[def.stat] = (out[def.stat] ?? 0) + r * def.perRank;
  }
  return out;
}

// ───────────────────────────── run results ─────────────────────────────

export interface RunSummary {
  characterId: string;
  time: number;
  won: boolean;
  level: number;
  kills: number;
  coins: number;
  bossKills: Record<string, number>;
  evolutions: number;
  shrinesBroken: number;
  topSpeed: number;
  greed: number;
  weapons: Array<{ id: string; level: number; damage: number; kills: number }>;
  passives: Array<{ id: string; level: number }>;
}

export function summarize(w: World): RunSummary {
  return {
    characterId: w.player.character.id,
    time: w.time,
    won: w.state === 'won',
    level: w.player.level,
    kills: w.stats.kills,
    coins: w.stats.coins,
    bossKills: { ...w.stats.bossKills },
    evolutions: w.stats.evolutions,
    shrinesBroken: w.stats.shrinesBroken,
    topSpeed: w.stats.topSpeed,
    greed: w.player.stats.greed,
    weapons: w.weapons.map((x) => ({ id: x.def.id, level: x.level, damage: Math.round(x.damageDealt), kills: x.kills })),
    passives: w.passives.map((x) => ({ id: x.def.id, level: x.level })),
  };
}

export interface GoldBreakdown {
  coins: number;
  kills: number;
  time: number;
  bosses: number;
  victory: number;
  total: number;
}

/** Gold banked at the end of a run (coins picked up + performance bonus, scaled by greed). */
export function goldForRun(r: RunSummary): GoldBreakdown {
  const greed = Math.max(0.1, 1 + r.greed);
  const kills = Math.floor((r.kills / 30) * greed);
  const time = Math.floor((r.time / 20) * greed);
  const bossCount = Object.values(r.bossKills).reduce((a, b) => a + b, 0);
  const bosses = Math.floor(bossCount * 40 * greed);
  const victory = r.won ? Math.floor(250 * greed) : 0;
  const coins = Math.floor(r.coins);
  return { coins, kills, time, bosses, victory, total: coins + kills + time + bosses + victory };
}

export function achievementContext(save: SaveData, run?: RunSummary): AchievementContext {
  const s = save.stats;
  const bossKills: Record<string, number> = { ...s.bossKills };
  if (run) for (const [k, v] of Object.entries(run.bossKills)) bossKills[k] = (bossKills[k] ?? 0) + v;
  return {
    totalKills: s.totalKills + (run?.kills ?? 0),
    bestTime: Math.max(s.bestTime, run?.time ?? 0),
    highestLevel: Math.max(s.highestLevel, run?.level ?? 0),
    bossKills,
    evolutions: s.evolutions + (run?.evolutions ?? 0),
    shrinesBroken: s.shrinesBroken + (run?.shrinesBroken ?? 0),
    topSpeed: Math.max(s.topSpeed, run?.topSpeed ?? 0),
    wins: s.wins + (run?.won ? 1 : 0),
    totalGold: s.totalGold,
  };
}

/** Grant an achievement's reward and record it. */
function grant(save: SaveData, a: AchievementDef): void {
  if (save.achievements.includes(a.id)) return;
  save.achievements.push(a.id);
  if (a.reward.gold) {
    save.gold += a.reward.gold;
    save.stats.totalGold += a.reward.gold;
  }
  if (a.reward.character && !save.unlockedCharacters.includes(a.reward.character)) save.unlockedCharacters.push(a.reward.character);
  if (a.reward.weapon && !save.unlockedWeapons.includes(a.reward.weapon)) save.unlockedWeapons.push(a.reward.weapon);
}

/**
 * Check achievements against lifetime stats (+ an in-progress run, without committing
 * the run's stats). Newly earned ones are granted immediately and returned.
 */
export function checkAchievements(save: SaveData, run?: RunSummary): AchievementDef[] {
  const ctx = achievementContext(save, run);
  const earned: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements.includes(a.id)) continue;
    if (a.check(ctx)) {
      grant(save, a);
      earned.push(a);
    }
  }
  return earned;
}

export interface RunOutcome {
  gold: GoldBreakdown;
  achievements: AchievementDef[];
  newBest: boolean;
}

/** Commit a finished run to the save: gold, lifetime stats, achievements. */
export function applyRunResult(save: SaveData, r: RunSummary): RunOutcome {
  const gold = goldForRun(r);
  save.gold += gold.total;
  const s = save.stats;
  s.totalGold += gold.total;
  s.runsPlayed++;
  if (r.won) s.wins++;
  s.totalKills += r.kills;
  const newBest = r.time > s.bestTime;
  s.bestTime = Math.max(s.bestTime, r.time);
  s.bestTimeByChar[r.characterId] = Math.max(s.bestTimeByChar[r.characterId] ?? 0, r.time);
  s.highestLevel = Math.max(s.highestLevel, r.level);
  for (const [k, v] of Object.entries(r.bossKills)) s.bossKills[k] = (s.bossKills[k] ?? 0) + v;
  s.evolutions += r.evolutions;
  s.shrinesBroken += r.shrinesBroken;
  s.topSpeed = Math.max(s.topSpeed, r.topSpeed);
  s.playtime += r.time;
  const achievements = checkAchievements(save);
  return { gold, achievements, newBest };
}
