// Flower cross-breeding table. Colors are indices into FLOWER_COLOR_NAMES
// (0 red, 1 yellow, 2 white, 3 orange, 4 pink, 5 purple, 6 blue, 7 black).
export interface BreedRule {
  a: number;
  b: number;
  child: number;
  chance: number;
}

export const BREEDING: BreedRule[] = [
  { a: 0, b: 1, child: 3, chance: 0.35 }, // red + yellow -> orange
  { a: 0, b: 2, child: 4, chance: 0.35 }, // red + white -> pink
  { a: 2, b: 2, child: 5, chance: 0.2 }, // white + white -> purple
  { a: 4, b: 5, child: 6, chance: 0.18 }, // pink + purple -> blue
  { a: 3, b: 5, child: 7, chance: 0.18 }, // orange + purple -> black
  { a: 1, b: 2, child: 1, chance: 0.3 },
  { a: 0, b: 0, child: 0, chance: 0.25 },
  { a: 1, b: 1, child: 1, chance: 0.25 },
  { a: 3, b: 3, child: 3, chance: 0.2 },
  { a: 4, b: 4, child: 4, chance: 0.2 },
  { a: 5, b: 5, child: 5, chance: 0.15 },
  { a: 6, b: 6, child: 6, chance: 0.12 },
  { a: 7, b: 7, child: 7, chance: 0.12 },
];

export function breedResult(a: number, b: number): BreedRule | undefined {
  return BREEDING.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

/** days for a sapling to become a tree / a sprout to bloom */
export const SAPLING_DAYS = 3;
export const FLOWER_BLOOM_STAGE = 2;
export const FRUIT_REGROW_DAYS = 3;
