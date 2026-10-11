import type { TuningOverrides } from '../config/tuning';
import { recordRun, type PlaytestRun } from '../meta/playtest';
import type { PlayerStats } from '../config/types';
import { Bot } from './bot';
import { newRun } from './run';
import { closeChest, step } from './sim';
import { resolveLevelUp } from './upgrades';
import { emptyInput, type World } from './world';

export interface HeadlessResult {
  characterId: string;
  seed: number;
  time: number;
  state: World['state'];
  level: number;
  kills: number;
  weapons: string[];
  passives: string[];
  bossKills: Record<string, number>;
  damageTaken: number;
  maxEnemies: number;
  evolutions: number;
  /** Same schema as human playtest records, for analyze-playtests comparisons. */
  record: PlaytestRun;
}

/** Play a full run with the bot, no rendering. Deterministic for (character, seed, skill). */
export function simulateRun(opts: {
  characterId: string;
  seed: number;
  skill?: number;
  maxSeconds?: number;
  meta?: Partial<PlayerStats>;
  unlockedWeapons?: string[];
  tuning?: TuningOverrides;
  /** Bot slides / slide-jumps / gap escapes (default true). */
  botMovement?: boolean;
  onWorld?: (w: World) => void;
}): HeadlessResult {
  const w = newRun({ seed: opts.seed, characterId: opts.characterId, meta: opts.meta, unlockedWeapons: opts.unlockedWeapons, tuning: opts.tuning });
  opts.onWorld?.(w);
  const bot = new Bot(opts.seed, opts.skill ?? 0.7, opts.botMovement ?? true);
  const input = emptyInput();
  const maxT = opts.maxSeconds ?? 20 * 60 + 5;
  let maxEnemies = 0;
  while (w.time < maxT) {
    if (w.state === 'playing') {
      bot.decide(w, input);
      step(w, input);
      w.events.clear();
      if (w.enemies.count > maxEnemies) maxEnemies = w.enemies.count;
    } else if (w.state === 'levelup') {
      resolveLevelUp(w, bot.chooseUpgrade(w));
    } else if (w.state === 'chest') {
      closeChest(w);
    } else break;
  }
  return {
    characterId: opts.characterId,
    seed: opts.seed,
    time: w.time,
    state: w.state,
    level: w.player.level,
    kills: w.stats.kills,
    weapons: w.weapons.map((x) => `${x.def.id}:${x.level}`),
    passives: w.passives.map((x) => `${x.def.id}:${x.level}`),
    bossKills: { ...w.stats.bossKills },
    damageTaken: Math.round(w.stats.damageTaken),
    maxEnemies,
    evolutions: w.stats.evolutions,
    record: recordRun(w, { player: 'bot', input: 'bot', quality: 'headless', result: w.state === 'won' ? 'won' : w.state === 'dead' ? 'dead' : 'quit', now: new Date(0) }),
  };
}
