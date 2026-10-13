/**
 * Starting spars and befriending from the overworld. (Phase 4: a simple stand-in that plays the
 * battle rules with the AI on both sides; phase 5 replaces it with the battle scene.)
 */
import { afterBattle, type Outcome } from '../../core/battle/engine';
import { makeCreature } from '../../core/creature';
import { Rng } from '../../core/rng';
import type { WildMon } from '../../core/world/world';
import { DEX } from '../../data/index';
import { SPECIES } from '../../data/species';
import { TRAINER_BY_ID, trainerTeam } from '../../data/trainers';
import { TUNING } from '../../tuning';
import { runBattle } from '../../sim/battle-runner';
import type { Game } from '../game';

export type BattleRequest =
  | { kind: 'wild'; wild?: WildMon; species?: string; level?: number; guardian?: boolean }
  | { kind: 'trainer'; trainer: string };

export async function runBattleScene(game: Game, req: BattleRequest): Promise<Outcome> {
  const session = game.session!;
  const s = session.state;
  const say = (t: string, who?: string) => game.dialogue.say(t, who);
  if (!session.awakeTeam().length) {
    await say('Your friends are too sleepy to spar. Visit a Rest Stop first!');
    game.dialogue.close();
    return 'left';
  }
  const rng = new Rng(s.rng ^ s.stats.battles * 977);
  let foe;
  if (req.kind === 'trainer') {
    const t = TRAINER_BY_ID[req.trainer]!;
    foe = trainerTeam(t, s.difficulty, s.starter, TUNING.difficulty[s.difficulty]).map(m => makeCreature(DEX, { species: m.species, level: m.level }, rng));
  } else {
    const species = req.wild?.species ?? req.species!;
    foe = [makeCreature(DEX, { species, level: req.wild?.level ?? req.level ?? 5, shimmer: req.wild?.shimmer }, rng)];
    await say(`A wild ${SPECIES[species]!.name} wants to play!`);
  }
  s.stats.battles++;
  const r = runBattle(DEX, { kind: req.kind, player: s.team, foe, difficulty: s.difficulty, playerAi: 'normal', foeAi: TUNING.difficulty[s.difficulty].ai, seed: rng.int(2 ** 31), sharedXp: game.settings.sharedXp });
  afterBattle(DEX, r.battle);
  if (r.outcome === 'won') { s.stats.wins++; s.coins += r.battle.coins; await say(`You won the spar! +${r.battle.coins} coins.`); }
  else if (r.outcome === 'lost') await say('Your friends are tuckered out. Time for a nap!');
  game.dialogue.close();
  return r.outcome;
}

export async function runPartnerScene(game: Game, species: string): Promise<void> {
  const session = game.session!;
  const c = makeCreature(DEX, { species, level: 5 }, new Rng(session.state.rng));
  session.befriend(c);
  session.state.starter = species;
  session.state.flags.add('got-partner');
  await game.dialogue.say(`You and ${SPECIES[species]!.name} are friends now!`);
  game.dialogue.close();
}
