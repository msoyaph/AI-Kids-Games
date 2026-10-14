/**
 * The Challenge Tower (after the story, in the Academy): spar up floor after floor. Every floor's
 * team is the same each time you climb (picked from the floor number, never at random), and a
 * little stronger than the last. Your friends rest between floors; the best floor reached is kept
 * in `agentmon.records` (this device only). Losing just ends the climb.
 */
import { makeCreature } from '../core/creature';
import { hash32, Rng } from '../core/rng';
import { DEX } from '../data/index';
import { SPECIES_LIST } from '../data/species';
import { playBattle } from './battle';
import type { Game } from './game';
import { readJson, writeKey } from './store';

interface Records { towerBest?: number }

const POOL = SPECIES_LIST.filter(s => s.stage >= 2 && !s.guardian).map(s => s.id);

/** The team on a floor: 2 friends on the first floors, then 3; levels rise by one a floor. */
export function towerTeam(floor: number) {
  const rng = new Rng(hash32(floor, 4049));
  const size = floor < 4 ? 2 : 3;
  const level = Math.min(50, 34 + floor);
  return Array.from({ length: size }, () => makeCreature(DEX, { species: rng.pick(POOL), level }, rng));
}

export function towerBest(): number {
  return readJson<Records>('records')?.towerBest ?? 0;
}

export async function playTower(game: Game): Promise<void> {
  const session = game.session!;
  const say = async (t: string) => { await game.dialogue.say(t, 'Coach Pim'); };
  let floor = 1;
  for (;;) {
    session.healAll();
    await say(`Floor ${floor}! Here comes your opponent.`);
    game.dialogue.close();
    const r = await playBattle(game, { kind: 'trainer', foe: towerTeam(floor), trainer: { name: `Floor ${floor}`, title: 'Challenge Tower' }, bg: 'trial', seed: hash32(floor, 77) });
    if (r.outcome !== 'won') break;
    if (floor > towerBest()) writeKey('records', JSON.stringify({ ...(readJson<Records>('records') ?? {}), towerBest: floor }));
    const go = await game.dialogue.ask(`Floor ${floor} cleared! Keep climbing?`, ['Next floor!', 'Rest for now'], 'Coach Pim');
    game.dialogue.close();
    if (go !== 0) break;
    floor++;
  }
  session.healAll();
  await say(`Great climbing! Your best floor so far: ${towerBest() || 'not yet'}. Come back any time!`);
  game.dialogue.close();
}
