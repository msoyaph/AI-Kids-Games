/**
 * Starting spars and befriending from the overworld: builds the other side (a wild Agentmon, a
 * trainer's team) and plays the battle scene. Also the first partner's Spark Ring scene.
 */
import type { Outcome } from '../../core/battle/engine';
import { sparkSetup } from '../../core/befriend';
import { makeCreature } from '../../core/creature';
import { hash32, Rng } from '../../core/rng';
import type { WildMon } from '../../core/world/world';
import { DEX } from '../../data/index';
import { MAPS } from '../../data/maps/index';
import { SPECIES } from '../../data/species';
import { TRAINER_BY_ID, trainerTeam } from '../../data/trainers';
import { TUNING } from '../../tuning';
import { BattleView } from '../../render/battle-view';
import { playBattle, playSparkRing } from '../battle';
import type { Game } from '../game';

export type BattleRequest =
  | { kind: 'wild'; wild?: WildMon; species?: string; level?: number; guardian?: boolean }
  | { kind: 'trainer'; trainer: string };

export async function runBattleScene(game: Game, req: BattleRequest): Promise<Outcome> {
  const session = game.session!;
  const s = session.state;
  if (!session.awakeTeam().length) {
    await game.dialogue.say('Your friends are too sleepy to spar. Visit a Rest Stop first!');
    game.dialogue.close();
    return 'left';
  }
  const seed = hash32(s.rng, s.stats.battles, s.stats.steps);
  const rng = new Rng(seed);
  const bg = MAPS[s.map]?.battleBg ?? 'meadow';
  if (req.kind === 'trainer') {
    const t = TRAINER_BY_ID[req.trainer]!;
    const foe = trainerTeam(t, s.difficulty, s.starter, TUNING.difficulty[s.difficulty]).map(m => makeCreature(DEX, { species: m.species, level: m.level }, rng));
    const music = t.kind === 'keeper' ? 'battle-keeper' : t.kind === 'rival' || t.id === 'rematch-juno' ? 'battle-rival' : t.kind === 'rematch' ? 'battle-keeper' : 'battle-trainer';
    const r = await playBattle(game, { kind: 'trainer', foe, trainer: { name: t.name, title: t.title, gentle: t.gentle }, bg: t.kind === 'keeper' ? 'trial' : bg, seed, music });
    return r.outcome;
  }
  const species = req.wild?.species ?? req.species!;
  const foe = [makeCreature(DEX, { species, level: req.wild?.level ?? req.level ?? 5, shimmer: req.wild?.shimmer }, rng)];
  const r = await playBattle(game, { kind: 'wild', foe, mood: req.wild?.mood ?? 'calm', guardian: req.guardian, bg, seed });
  return r.outcome;
}

/** Your first partner: say hi, then the Spark Ring with a big, slow glow (retry until it works). */
export async function runPartnerScene(game: Game, species: string): Promise<void> {
  const session = game.session!;
  const c = makeCreature(DEX, { species, level: 5 }, new Rng(hash32(session.state.rng, 5)));
  const view = new BattleView(game.app.sprites, 'meadow');
  game.app.stage.addChild(view.root);
  const host = game.app.host;
  view.resize({ x: 0, y: 0, w: host.width, h: host.height });
  view.setCreature(1, c, 'happy');
  view.hide(0);
  try {
    await game.tutorial('befriend');
    for (let tries = 0; ; tries++) {
      const setup = sparkSetup(DEX, { foe: { ...c, energy: 1 }, mood: 'happy', difficulty: 'easy', seed: hash32(tries, 7) });
      setup.arc = Math.max(setup.arc, 150);
      setup.speed = Math.min(setup.speed, 0.38);
      const fill = await playSparkRing(game, view.root, setup, c);
      if (fill >= setup.need) break;
      await game.dialogue.say(`${SPECIES[species]!.name} is still a little shy. Let's try again!`);
      game.dialogue.close();
    }
  } finally {
    view.destroy();
  }
  session.befriend(c);
  session.state.starter = species;
  session.state.flags.add('got-partner');
  await game.dialogue.say(`You and ${SPECIES[species]!.name} are friends now! 💛`);
  game.dialogue.close();
}
