// The other modes, as data: 20 Challenges (each a twist on the rules), the endless Garden Party,
// and the Daily garden (the same level for everyone on a given date; no streaks, no penalty).
import { critterPool, makeWaves, plantsAt } from './levels';
import { hashSeed, rng } from '../sim/rng';
import type { WorldId } from './roster';
import type { LevelSpec, Special } from '../sim/types';

export interface Challenge extends LevelSpec { blurb: string; plants: string[] }

const ALL_PLANTS = plantsAt(4, 9);
const tiles = (list: [number, number, Special][]) => Object.fromEntries(list.map(([l, c, s]) => [`${l},${c}`, s]));
const row = (lane: number, from: number, to: number, sp: Special): [number, number, Special][] => Array.from({ length: to - from + 1 }, (_, i) => [lane, from + i, sp]);

function challenge(n: number, name: string, blurb: string, world: WorldId, pool: string[], budget: number, waves: number, extra: Partial<Challenge> = {}): Challenge {
  const rnd = rng(hashSeed(`challenge-${n}`));
  return { id: `challenge-${n}`, name, blurb, world, startCompost: 175, seedSlots: 6, plants: ALL_PLANTS, waves: makeWaves(pool, budget, waves, rnd), ...extra };
}

const MEADOW = ['snail', 'mouse', 'ants', 'roly-poly'];
const EVERYONE = ['snail', 'mouse', 'ants', 'roly-poly', 'beetle', 'grasshopper', 'frog', 'vole', 'hedgehog', 'gecko', 'goat', 'jackrabbit', 'packrat'];

export const CHALLENGES: Challenge[] = [
  challenge(1, 'Pre-planted Picnic', 'The garden is planted already. No new planting: will it hold?', 'meadow', MEADOW, 4, 3, {
    noPlanting: true, seedSlots: 0,
    prePlanted: [0, 1, 2, 3, 4].flatMap(lane => [{ plant: 'comfrey', lane, col: 0 }, { plant: 'rowan', lane, col: 1 }, { plant: 'rowan', lane, col: 2 }, { plant: 'boxwood', lane, col: 5 }]),
  }),
  challenge(2, "Three's Company", 'Just three cards: Comfrey, Rowan and Boxwood.', 'meadow', MEADOW, 5, 4, { fixedSeeds: ['comfrey', 'rowan', 'boxwood'], seedSlots: 3 }),
  challenge(3, 'Snack Cart', 'The snack cart rolls from lane to lane. Only its lane can lose a snack!', 'meadow', MEADOW, 6, 4, { cartEvery: 20 }),
  challenge(4, 'Pinecone Curling', 'No plants today: slide pinecones down the lanes to knock the critters home.', 'cloud', ['snail', 'mouse', 'beetle', 'hedgehog'], 4, 3, { curling: true, startCompost: 150, seedSlots: 1 }),
  challenge(5, 'No Worms Today', 'The worms are napping: make every bit of compost count.', 'desert', EVERYONE.slice(0, 8), 5, 4, { worms: false, startCompost: 450 }),
  challenge(6, 'Speedy Critters', 'Everyone has had a big breakfast. They are quick today!', 'meadow', MEADOW, 5, 4, { speed: 1.4 }),
  challenge(7, 'Flyer Frenzy', 'Only flyers: magpies, gulls and kite crows. Look up!', 'cloud', ['magpie', 'seagull', 'kite-crow'], 6, 4, { fixedSeeds: ['comfrey', 'bluebell', 'maple', 'hollyhock', 'yarrow', 'basil'] }),
  challenge(8, 'Water Works', 'Channels everywhere: water plants are the stars.', 'greenhouse', ['snail', 'beetle', 'frog', 'grasshopper'], 6, 4, { specials: tiles([...row(0, 1, 7, 'water'), ...row(2, 1, 7, 'water'), ...row(4, 1, 7, 'water')]) }),
  challenge(9, 'Heat Wave', 'Hot tiles all over. Plant beside the channels to stay cool.', 'desert', ['gecko', 'mouse', 'goat', 'jackrabbit'], 7, 4, { specials: tiles([...[0, 1, 2, 3, 4].flatMap(l => row(l, 2, 7, 'hot')), ...[0, 2, 4].map(l => [l, 1, 'water'] as [number, number, Special])]) }),
  challenge(10, 'Lantern Night', 'Moths and owlets love the lanterns. Use that!', 'dusk', ['moths', 'owlet', 'hedgehog', 'snail'], 6, 4, { dusk: true, specials: tiles([[0, 5, 'lantern'], [1, 3, 'lantern'], [2, 6, 'lantern'], [3, 4, 'lantern'], [4, 5, 'lantern']]) }),
  challenge(11, 'Hedge Maze', 'Boxwood hedges are already in the way. Plant around them.', 'meadow', ['snail', 'mouse', 'ants', 'roly-poly', 'grasshopper'], 6, 4, {
    prePlanted: [{ plant: 'boxwood', lane: 0, col: 6 }, { plant: 'boxwood', lane: 1, col: 4 }, { plant: 'boxwood', lane: 2, col: 6 }, { plant: 'boxwood', lane: 3, col: 4 }, { plant: 'boxwood', lane: 4, col: 6 }],
  }),
  challenge(12, 'Hop Along', 'Grasshoppers and jackrabbits: tangle them, soften their landings.', 'desert', ['grasshopper', 'jackrabbit'], 6, 4),
  challenge(13, 'Shield Wall', 'Beetles, hedgehogs and badgers with shields up. Go over or through!', 'dusk', ['beetle', 'hedgehog', 'badger'], 7, 4),
  challenge(14, 'Big Appetites', 'Hungry goats. Keep them busy and shoo them fast.', 'desert', ['goat', 'mouse'], 7, 4),
  challenge(15, 'Curling Cup', 'Pinecone Curling again, with tougher critters.', 'cloud', ['beetle', 'hedgehog', 'roly-poly', 'gecko', 'mouse'], 5, 4, { curling: true, startCompost: 200, seedSlots: 1 }),
  challenge(16, 'Snack Cart Express', 'The snack cart rolls faster now!', 'desert', EVERYONE.slice(0, 10), 7, 4, { cartEvery: 12 }),
  challenge(17, 'Bring Your Own Compost', 'No producers allowed, but a big pile of compost to start.', 'greenhouse', EVERYONE.slice(0, 9), 6, 4, { fixedSeeds: ['rowan', 'wisteria', 'maple', 'boxwood', 'lambs-ear', 'touch-me-not'], startCompost: 1200 }),
  challenge(18, 'No Umbrellas', 'The umbrellas are at the cleaners. Every critter counts.', 'meadow', MEADOW, 4, 3, { umbrellas: false }),
  challenge(19, 'Garden Friends', 'Plant friends side by side: Comfrey and Rowan, Yarrow and Comfrey, Allium by shooters.', 'greenhouse', EVERYONE.slice(0, 9), 7, 4, { fixedSeeds: ['comfrey', 'yarrow', 'rowan', 'allium', 'borage', 'boxwood', 'chamomile'], seedSlots: 7 }),
  challenge(20, 'Boss Parade', 'Three big visitors in one afternoon. Good luck!', 'cloud', ['snail', 'ants', 'mouse', 'beetle'], 6, 4, { startCompost: 300, seedSlots: 8 }),
];
// the Boss Parade brings three mini-bosses, one per wave from the second
{
  const bossy = CHALLENGES[19]!;
  ['grand-snail', 'big-beetle', 'badger-baron'].forEach((boss, i) => bossy.waves[i + 1]!.spawns.push({ critter: boss, lane: [1, 2, 3][i]!, delay: 6 }));
}

/** The Garden Party: endless waves on the meadow, with every plant the player has. */
export const GARDEN_PARTY: LevelSpec = { id: 'garden-party', name: 'Garden Party', world: 'meadow', startCompost: 200, seedSlots: 8, waves: [], endless: true };

/** The Daily garden for a date ("2026-10-14"): a world, a twist and waves, all from the date. */
export function dailyLevel(date: string, unlocked: string[]): LevelSpec & { plants: string[]; twist: string } {
  const rnd = rng(hashSeed(`daily-${date}`));
  const world = Math.floor(rnd() * 5), ids: WorldId[] = ['meadow', 'greenhouse', 'dusk', 'desert', 'cloud'];
  const twists = [
    { twist: 'A sunny, ordinary garden day.', spec: {} },
    { twist: 'Speedy critters today!', spec: { speed: 1.25 } },
    { twist: 'The worms are napping: extra compost to start.', spec: { worms: false, startCompost: 400 } },
    { twist: 'The snack cart is out.', spec: { cartEvery: 18 } },
  ];
  const pick = twists[Math.floor(rnd() * twists.length)]!;
  const pool = critterPool(world, 9);
  return {
    id: `daily-${date}`, name: `Daily garden ${date}`, world: ids[world]!, startCompost: 175, seedSlots: Math.min(7, unlocked.length), dusk: world === 2,
    waves: makeWaves(pool, 5 + world, 4, rnd), plants: unlocked, twist: pick.twist, ...pick.spec,
  };
}
