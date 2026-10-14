/**
 * Headless battles for simulations and the playthrough bot: both sides pick with the AI, and the
 * battle runs to its end. Never used by the game itself (nothing here is bundled unless imported).
 */
import { chooseAction } from '../core/battle/ai';
import { afterBattle, resolveTurn, startBattle, type Action, type Battle, type Outcome } from '../core/battle/engine';
import { Rng } from '../core/rng';
import type { BattleDex, Creature, Difficulty } from '../core/types';

export interface RunResult {
  outcome: Outcome;
  turns: number;
  /** Move id → times picked, per side. */
  picks: [Map<string, number>, Map<string, number>];
  battle: Battle;
}

export interface RunOptions {
  kind: 'wild' | 'trainer';
  player: Creature[];
  foe: Creature[];
  difficulty: Difficulty;
  /** AI level for each side. */
  playerAi: Difficulty;
  foeAi: Difficulty;
  seed: number;
  sharedXp?: boolean;
  maxTurns?: number;
  /** Optional player override (e.g. the bot befriending). Return null to let the AI pick. */
  playerPolicy?: (b: Battle, rng: Rng) => Action | null;
}

export function runBattle(dex: BattleDex, o: RunOptions): RunResult {
  const b = startBattle(dex, { kind: o.kind, player: o.player, foe: o.foe, difficulty: o.difficulty, seed: o.seed, sharedXp: o.sharedXp ?? true });
  const rng = new Rng(o.seed ^ 0x5bd1e995);
  const picks: [Map<string, number>, Map<string, number>] = [new Map(), new Map()];
  const count = (side: 0 | 1, a: Action) => {
    const key = a.type === 'move' ? a.move : `:${a.type}`;
    picks[side].set(key, (picks[side].get(key) ?? 0) + 1);
  };
  const max = o.maxTurns ?? 300;
  let guard = 0;
  while (!b.outcome && guard++ < max * 2) {
    if (b.needsSwitch === 0) {
      resolveTurn(dex, b, chooseAction(dex, b, 0, o.playerAi, rng), { type: 'rest' });
      continue;
    }
    const pa = o.playerPolicy?.(b, rng) ?? chooseAction(dex, b, 0, o.playerAi, rng);
    const fa = chooseAction(dex, b, 1, o.foeAi, rng);
    count(0, pa);
    count(1, fa);
    resolveTurn(dex, b, pa, fa);
    if (b.turn >= max) break;
  }
  if (!b.outcome) b.outcome = 'left'; // a stalemate (counted and reported by the simulations)
  afterBattle(dex, b);
  return { outcome: b.outcome, turns: b.turn, picks, battle: b };
}
