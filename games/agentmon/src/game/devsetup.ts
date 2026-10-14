/**
 * Shortcuts for tests and reviews, only with ?quickstart (a test adventure in slot 3, saved only
 * when slot 3 is empty, so a real adventure is never overwritten):
 *   &at=map,x,y          start there instead of Gran's house (and skip the opening)
 *   &flags=a,b,c          story flags (e.g. got-partner,mission-1,beacon-lighthouse)
 *   &team=species:level,… friends on the team (first one leads)
 *   &items=id:n,…         things in the bag
 *   &coins=N  &quest=N    coins, and the main quest stage
 */
import { makeCreature } from '../core/creature';
import { Rng } from '../core/rng';
import { addFriend, addItem, type GameState } from '../core/state';
import { DEX } from '../data/index';
import { MAPS } from '../data/maps/index';
import { SPECIES } from '../data/species';

export function applyTestSetup(s: GameState, params: URLSearchParams): boolean {
  const at = params.get('at')?.split(',');
  if (at && MAPS[at[0]!]) { s.map = at[0]!; s.x = Number(at[1] ?? 1); s.y = Number(at[2] ?? 1); s.dir = 0; }
  for (const f of params.get('flags')?.split(',').filter(Boolean) ?? []) s.flags.add(f);
  const rng = new Rng(4242);
  for (const t of params.get('team')?.split(',').filter(Boolean) ?? []) {
    const [species, level] = t.split(':');
    if (!SPECIES[species!]) continue;
    const c = makeCreature(DEX, { species: species!, level: Number(level ?? 5) }, rng);
    addFriend(s, c);
    s.guide.seen.add(SPECIES[species!]!.num);
    s.guide.friends.add(SPECIES[species!]!.num);
    if (!s.starter) s.starter = species!;
  }
  for (const t of params.get('items')?.split(',').filter(Boolean) ?? []) { const [id, n] = t.split(':'); addItem(s, id!, Number(n ?? 1)); }
  if (params.has('coins')) s.coins = Number(params.get('coins'));
  if (params.has('quest')) s.quests.main = Number(params.get('quest'));
  if (at) { s.flags.add('woke-up'); s.tutorials.add('move'); }
  return !!at;
}
