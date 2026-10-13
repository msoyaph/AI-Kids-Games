/**
 * All 52 Agentmon: 16 families of three growth stages, plus 4 guardians.
 *
 * Each family is one entry: its element, real-world inspiration (its facts are in facts.ts),
 * trait, favorite snack, stage-3 base stats and growth levels. Stage 1 and 2 stats are the same
 * shape, smaller. Learnsets follow the element's ten move roles (moves.ts) on a shared schedule,
 * plus a few family moves for variety and coverage.
 *
 * `num` is the Field Guide number and the save id: never renumber. Names are web-checked against
 * other games and products (see games/agentmon/CLAUDE.md, IP log).
 */
import type { Element, SnackId, Species, TraitId } from '../core/types';
import { ELEMENT_MOVES } from './moves';

interface StageDef { num: number; id: string; name: string; blurb: string }

interface FamilyDef {
  family: string;
  element: Element;
  inspiration: string;
  trait: TraitId;
  snack: SnackId;
  friendliness: number;
  /** Stage-3 base stats: energy, power, guard, speed. */
  stats: [number, number, number, number];
  grow: [number, number];
  /** Family moves: [move, level]. */
  extra: [string, number][];
  stages: [StageDef, StageDef, StageDef];
}

/** When each of the ten element move roles is learned. */
const SCHEDULE: [role: number, level: number][] = [
  [0, 1], [1, 5], [2, 9], [7, 13], [3, 17], [4, 21], [6, 25], [8, 29], [5, 35], [9, 42],
];

const STAGE_SCALE = [0.64, 0.82, 1];
const XP_YIELD = [55, 120, 195];

const whole = (n: number) => Math.max(10, Math.round(n));

function learnset(element: Element, extra: [string, number][]): [number, string][] {
  const moves = ELEMENT_MOVES[element]!;
  const out: [number, string][] = [[1, 'bump'], ...SCHEDULE.map(([role, level]) => [level, moves[role]!] as [number, string]), ...extra.map(([m, l]) => [l, m] as [number, string])];
  return out.sort((a, b) => a[0] - b[0]);
}

const FAMILIES: FamilyDef[] = [
  {
    family: 'maple', element: 'gust', inspiration: 'maple seeds', trait: 'speedy', snack: 'crunch-seed', friendliness: 1.2,
    stats: [95, 105, 84, 136], grow: [16, 32], extra: [['hop-in', 7], ['seed-flick', 11], ['shine-bop', 23]],
    stages: [
      { num: 1, id: 'spinnet', name: 'Spinnet', blurb: 'A seed with one wing. It loves to spin down from high places, giggling all the way.' },
      { num: 2, id: 'twirlwing', name: 'Twirlwing', blurb: 'Two leafy wings let it twirl in the breeze for a long time without landing.' },
      { num: 3, id: 'maplegale', name: 'Maplegale', blurb: 'It rides big autumn winds and scatters seeds so new trees can grow far away.' },
    ],
  },
  {
    family: 'geode', element: 'stone', inspiration: 'amethyst geodes', trait: 'sturdy', snack: 'moon-melon', friendliness: 1.1,
    stats: [101, 91, 125, 67], grow: [16, 32], extra: [['cozy-curl', 7], ['shine-bop', 11], ['prism-ray', 27]],
    stages: [
      { num: 4, id: 'druzling', name: 'Druzling', blurb: 'It looks like a plain pebble. When it smiles, purple crystals peek out of a crack.' },
      { num: 5, id: 'druzette', name: 'Druzette', blurb: 'Its rocky shell has opened wide, and its crystals sparkle in the sun.' },
      { num: 6, id: 'druzarch', name: 'Druzarch', blurb: 'A calm, rocky friend with a crown of crystals. It hums when it is happy.' },
    ],
  },
  {
    family: 'platypus', element: 'volt', inspiration: 'platypuses', trait: 'waterproof', snack: 'sea-crisp', friendliness: 1.2,
    stats: [102, 107, 96, 102], grow: [16, 32], extra: [['hop-in', 7], ['puddle-pat', 11], ['ripple-roll', 24]],
    stages: [
      { num: 7, id: 'buzzbill', name: 'Buzzbill', blurb: 'Its zigzag bill buzzes softly when it finds a snack in the stream.' },
      { num: 8, id: 'zipbill', name: 'Zipbill', blurb: 'It zips through rivers and can feel tiny sparks with its bill.' },
      { num: 9, id: 'voltabill', name: 'Voltabill', blurb: 'It surfs on storm waves, and its tail crackles with happy sparks.' },
    ],
  },
  {
    family: 'popcorn', element: 'flare', inspiration: 'popcorn', trait: 'cheerful', snack: 'honey-drop', friendliness: 1.1,
    stats: [91, 122, 85, 128], grow: [15, 31], extra: [['twirl-around', 7], ['seed-flick', 11], ['vine-twirl', 26]],
    stages: [
      { num: 10, id: 'kernip', name: 'Kernip', blurb: 'A warm little kernel with a fluffy puff on top. It hops when it gets excited.' },
      { num: 11, id: 'poplet', name: 'Poplet', blurb: 'Pop! It puffed up big and soft, and it smells like a movie night.' },
      { num: 12, id: 'fluffkorn', name: 'Fluffkorn', blurb: 'Its fluffy mane is warm like a blanket. Friends gather round it on cold nights.' },
    ],
  },
  {
    family: 'leafcutter', element: 'leaf', inspiration: 'leafcutter ants', trait: 'brave', snack: 'berry-bun', friendliness: 1.0,
    stats: [83, 112, 103, 74], grow: [15, 31], extra: [['pep-talk', 7], ['rock-nudge', 11], ['burrow-bonk', 27]],
    stages: [
      { num: 13, id: 'snipsy', name: 'Snipsy', blurb: 'A tiny ant that carries a leaf like an umbrella. It never drops it.' },
      { num: 14, id: 'leafhauler', name: 'Leafhauler', blurb: 'It hauls big leaves home on its back to feed its garden.' },
      { num: 15, id: 'canopant', name: 'Canopant', blurb: 'It waves a leafy banner and leads its friends on long, careful marches.' },
    ],
  },
  {
    family: 'hummingbird', element: 'gust', inspiration: 'hummingbirds', trait: 'wakeful', snack: 'honey-drop', friendliness: 0.9,
    stats: [89, 129, 83, 145], grow: [16, 33], extra: [['hop-in', 7], ['hot-hop', 11], ['kettle-roll', 26]],
    stages: [
      { num: 16, id: 'hummet', name: 'Hummet', blurb: 'It wears a flower as a hat and hums as it hovers in one spot.' },
      { num: 17, id: 'whirrbird', name: 'Whirrbird', blurb: 'Its wings whirr so fast they blur. It can even fly backward.' },
      { num: 18, id: 'galehum', name: 'Galehum', blurb: 'Its feathers shimmer in every color. It dances on the wind at sunrise.' },
    ],
  },
  {
    family: 'wombat', element: 'stone', inspiration: 'wombats', trait: 'cozy', snack: 'crunch-seed', friendliness: 1.0,
    stats: [117, 107, 102, 64], grow: [16, 33], extra: [['twig-swat', 11], ['friendly-shove', 22], ['log-roll', 30]],
    stages: [
      { num: 19, id: 'burrowby', name: 'Burrowby', blurb: 'A round little digger. It naps in cozy tunnels it makes itself.' },
      { num: 20, id: 'burrowbat', name: 'Burrowbat', blurb: 'Its strong paws dig long tunnels with many snug rooms.' },
      { num: 21, id: 'bouldwom', name: 'Bouldwom', blurb: 'Its back is as tough as a boulder, but it loves gentle scratches.' },
    ],
  },
  {
    family: 'manatee', element: 'tide', inspiration: 'manatees', trait: 'calm', snack: 'sea-crisp', friendliness: 1.3,
    stats: [130, 87, 111, 58], grow: [18, 34], extra: [['cozy-curl', 7], ['flutter-flick', 11], ['sleepy-tune', 15], ['kite-spin', 28]],
    stages: [
      { num: 22, id: 'lullakin', name: 'Lullakin', blurb: 'A chubby baby with a sea-grass scarf. It sings little bubbly songs.' },
      { num: 23, id: 'lullatee', name: 'Lullatee', blurb: 'It drifts slowly in warm water and munches sea grass all day.' },
      { num: 24, id: 'grandatee', name: 'Grandatee', blurb: 'A gentle giant with a coral crown. Little fish love to swim beside it.' },
    ],
  },
  {
    family: 'tardigrade', element: 'tide', inspiration: 'tardigrades', trait: 'sturdy', snack: 'berry-bun', friendliness: 1.0,
    stats: [108, 89, 128, 68], grow: [17, 33], extra: [['cheer-up', 7], ['rock-nudge', 11], ['chilly-breeze', 19], ['boulder-bounce', 26]],
    stages: [
      { num: 25, id: 'dewpud', name: 'Dewpud', blurb: 'A plump bean with eight stubby legs. It lives in drops of water on moss.' },
      { num: 26, id: 'mossbub', name: 'Mossbub', blurb: 'It wears a soft moss coat and bumbles along on its eight little feet.' },
      { num: 27, id: 'hardigrade', name: 'Hardigrade', blurb: 'Dew drops on its coat shine like armor. It can handle almost anything.' },
    ],
  },
  {
    family: 'fern', element: 'leaf', inspiration: 'ferns', trait: 'thrifty', snack: 'sun-pepper', friendliness: 1.0,
    stats: [100, 100, 100, 100], grow: [17, 34], extra: [['snack-break', 7], ['puddle-pat', 11], ['drizzle-drop', 23]],
    stages: [
      { num: 28, id: 'fiddlit', name: 'Fiddlit', blurb: 'Its head is curled up tight like a fiddle. It uncurls a bit every day.' },
      { num: 29, id: 'frondle', name: 'Frondle', blurb: 'It has unrolled its fronds like little wings and loves shady forests.' },
      { num: 30, id: 'fernadore', name: 'Fernadore', blurb: 'An old and gentle fern friend. It fans cool air on hot days.' },
    ],
  },
  {
    family: 'glowworm', element: 'glow', inspiration: 'glowworms', trait: 'friendly', snack: 'moon-melon', friendliness: 1.1,
    stats: [117, 96, 102, 91], grow: [19, 35], extra: [['sleepy-tune', 7], ['flutter-flick', 11], ['static-tickle', 23]],
    stages: [
      { num: 31, id: 'gleamgrub', name: 'Gleamgrub', blurb: 'A soft little grub with a glowing tail. It lights up dark caves like a star.' },
      { num: 32, id: 'silklight', name: 'Silklight', blurb: 'It hangs glowing silk threads that sparkle like tiny beads.' },
      { num: 33, id: 'starwisp', name: 'Starwisp', blurb: 'Its starry pattern glows softly. Lost explorers follow it home.' },
    ],
  },
  {
    family: 'fluorite', element: 'glow', inspiration: 'fluorite crystals', trait: 'fireproof', snack: 'spark-fizz', friendliness: 1.0,
    stats: [92, 106, 116, 72], grow: [20, 36], extra: [['cozy-curl', 7], ['rock-nudge', 11], ['ice-slide', 27]],
    stages: [
      { num: 34, id: 'glintle', name: 'Glintle', blurb: 'A little crystal cube on tiny legs. It glows when the light is just right.' },
      { num: 35, id: 'prismble', name: 'Prismble', blurb: 'It stacks its crystal cubes into towers and glows in many colors.' },
      { num: 36, id: 'fluorelle', name: 'Fluorelle', blurb: 'Its striped crystal body makes rainbows on the cave walls.' },
    ],
  },
  {
    family: 'lemon', element: 'volt', inspiration: 'lemons', trait: 'thrifty', snack: 'spark-fizz', friendliness: 1.1,
    stats: [86, 122, 81, 117], grow: [20, 36], extra: [['goofy-grin', 7], ['twig-swat', 11], ['bramble-bundle', 28]],
    stages: [
      { num: 37, id: 'zestle', name: 'Zestle', blurb: 'A sour little lemon with a leafy sprout. It fizzes when it giggles.' },
      { num: 38, id: 'zestwick', name: 'Zestwick', blurb: 'Its zesty peel tingles with tiny sparks. It makes everyone pucker and laugh.' },
      { num: 39, id: 'citrivolt', name: 'Citrivolt', blurb: 'It wears its peel like a cape and glows like a lantern on stormy nights.' },
    ],
  },
  {
    family: 'hailstone', element: 'frost', inspiration: 'hailstones', trait: 'warm', snack: 'frost-mint', friendliness: 1.0,
    stats: [113, 93, 118, 69], grow: [22, 38], extra: [['cozy-curl', 7], ['flutter-flick', 11], ['drizzle-drop', 24]],
    stages: [
      { num: 40, id: 'hailbit', name: 'Hailbit', blurb: 'A round bit of ice with little mittens. You can see its layers inside.' },
      { num: 41, id: 'hailroll', name: 'Hailroll', blurb: 'It rolls up and down in storm clouds and grows a new layer each time.' },
      { num: 42, id: 'hailcastle', name: 'Hailcastle', blurb: 'It wears a fluffy storm cloud like a hat and keeps it from raining on friends.' },
    ],
  },
  {
    family: 'snow-leopard', element: 'frost', inspiration: 'snow leopards', trait: 'speedy', snack: 'frost-mint', friendliness: 0.9,
    stats: [89, 119, 84, 104], grow: [23, 38], extra: [['pep-talk', 7], ['rock-nudge', 11], ['zip-dash', 22]],
    stages: [
      { num: 43, id: 'scarfcub', name: 'Scarfcub', blurb: 'A fluffy cub that wraps its tail around its neck like a scarf.' },
      { num: 44, id: 'scarfpaw', name: 'Scarfpaw', blurb: 'Its wide, furry paws pad softly across deep snow.' },
      { num: 45, id: 'scarfspire', name: 'Scarfspire', blurb: 'It watches over snowy peaks from the highest rocks, calm and kind.' },
    ],
  },
  {
    family: 'capybara', element: 'flare', inspiration: 'capybaras', trait: 'cozy', snack: 'sun-pepper', friendliness: 1.3,
    stats: [124, 94, 109, 69], grow: [24, 39], extra: [['snack-break', 7], ['puddle-pat', 11], ['sunny-sip', 19], ['ripple-roll', 27]],
    stages: [
      { num: 46, id: 'bathlet', name: 'Bathlet', blurb: 'It wears a tiny towel on its head and loves warm puddles.' },
      { num: 47, id: 'steambly', name: 'Steambly', blurb: 'Warm steam puffs around it. Everyone nearby feels calm and sleepy.' },
      { num: 48, id: 'thermabara', name: 'Thermabara', blurb: 'A tiny hot spring bubbles on its back. Little friends ride along.' },
    ],
  },
];

interface GuardianDef {
  num: number; id: string; name: string; element: Element; inspiration: string; snack: SnackId;
  stats: [number, number, number, number]; signature: string; extra: [string, number][]; blurb: string;
}

const GUARDIANS: GuardianDef[] = [
  {
    num: 49, id: 'archwyn', name: 'Archwyn', element: 'stone', inspiration: 'sandstone arches', snack: 'crunch-seed',
    stats: [120, 115, 135, 80], signature: 'canyon-echo', extra: [['shine-bop', 1], ['prism-ray', 30]],
    blurb: 'A gentle giant whose back curves into a red stone arch. Desert flowers grow on top.',
  },
  {
    num: 50, id: 'tidecrest', name: 'Tidecrest', element: 'tide', inspiration: 'tides and the Moon', snack: 'sea-crisp',
    stats: [140, 110, 120, 80], signature: 'moon-tide', extra: [['shine-bop', 1], ['star-toss', 30]],
    blurb: 'A great sea snail with a moon-white shell. A whole tide pool garden lives on its back.',
  },
  {
    num: 51, id: 'frostmantle', name: 'Frostmantle', element: 'frost', inspiration: 'snowshoe hares', snack: 'frost-mint',
    stats: [110, 120, 95, 125], signature: 'snowshoe-dash', extra: [['zip-dash', 1], ['kite-spin', 30]],
    blurb: 'A giant snow hare with a frosty collar and wide snowshoe feet. It guards the icy peak.',
  },
  {
    num: 52, id: 'aurelune', name: 'Aurelune', element: 'glow', inspiration: 'auroras', snack: 'moon-melon',
    stats: [120, 120, 105, 105], signature: 'ribbon-sky', extra: [['flutter-flick', 1], ['kite-spin', 30]],
    blurb: 'A great sky kite of soft light that trails ribbons of aurora. It watches over all of Sunreach.',
  },
];

function build(): Record<string, Species> {
  const out: Record<string, Species> = {};
  for (const f of FAMILIES) {
    const ls = learnset(f.element, f.extra);
    f.stages.forEach((st, i) => {
      const k = STAGE_SCALE[i]!;
      const [e, p, g, s] = f.stats.map(v => whole(v * k)) as [number, number, number, number];
      const next = f.stages[i + 1];
      out[st.id] = {
        num: st.num, id: st.id, name: st.name, family: f.family, stage: (i + 1) as 1 | 2 | 3, element: f.element,
        base: { energy: e, power: p, guard: g, speed: s },
        ...(next ? { grows: { to: next.id, level: f.grow[i]! } } : {}),
        learnset: ls, trait: f.trait, favoriteSnack: f.snack, friendliness: f.friendliness, xpYield: XP_YIELD[i]!,
        blurb: st.blurb, inspiration: f.inspiration, fact: st.id,
      };
    });
  }
  for (const g of GUARDIANS) {
    const moves = ELEMENT_MOVES[g.element]!;
    const ls: [number, string][] = [
      [1, 'bump'], [1, moves[0]!], [1, moves[1]!], [1, moves[3]!], [20, moves[4]!], [30, moves[5]!], [35, moves[6]!], [40, g.signature], [45, moves[9]!],
      ...g.extra.map(([m, l]) => [l, m] as [number, string]),
    ];
    ls.sort((a, b) => a[0] - b[0]);
    const [e, p, gd, s] = g.stats;
    out[g.id] = {
      num: g.num, id: g.id, name: g.name, family: g.id, stage: 1, element: g.element,
      base: { energy: e, power: p, guard: gd, speed: s }, learnset: ls, trait: 'guardian', favoriteSnack: g.snack,
      friendliness: 1, xpYield: 260, guardian: true, blurb: g.blurb, inspiration: g.inspiration, fact: g.id,
    };
  }
  return out;
}

export const SPECIES: Record<string, Species> = build();

/** Field Guide order (by num). */
export const SPECIES_LIST: Species[] = Object.values(SPECIES).sort((a, b) => a.num - b.num);
export const speciesByNum = (num: number) => SPECIES_LIST.find(s => s.num === num);

/** The three partners offered at the Academy (deliberately not a heat/water/plant trio). */
export const STARTERS = ['spinnet', 'druzling', 'buzzbill'] as const;
export const FAMILY_IDS = FAMILIES.map(f => f.family);
