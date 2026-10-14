/**
 * The Farm Book's "Farm science" pages: real facts (by id, from src/data/facts.ts) and how the same
 * idea works on your farm. The game lines describe the game's own rules, so they change when the
 * rules do (tests/unit/reading.test.ts keeps them easy to read).
 */
export interface SciencePage {
  id: string;
  title: string;
  /** An interface icon's name (src/ui/icons.ts). */
  icon: string;
  /** Fact ids from src/data/facts.ts. */
  facts: string[];
  /** How it works in the game. */
  game: string[];
}

export const SCIENCE: readonly SciencePage[] = [
  {
    id: 'soil', title: 'Healthy soil', icon: 'compost', facts: ['idea:compost', 'idea:legumes'],
    game: [
      'Compost makes a crop grow faster, and it earns a care point.',
      'Beans, peas and clover leave nitrogen behind. The next crop in that field gets a care point.',
    ],
  },
  {
    id: 'rotation', title: 'Crop rotation', icon: 'plough', facts: ['idea:rotation'],
    game: [
      'Plant a different kind of crop from last time, and the field gives a care point.',
      'Each crop page says which family it is in.',
    ],
  },
  {
    id: 'bees', title: 'Bees and flowers', icon: 'star', facts: ['idea:bees', 'tree:almond'],
    game: [
      'A beehive helps flowering crops and fruit trees within 5 tiles give more.',
      'More flowers near the hive make better honey.',
    ],
  },
  {
    id: 'water', title: 'Rain and water', icon: 'water', facts: ['idea:rain'],
    game: [
      'A watered crop earns a care point.',
      'On a rainy day, every growing crop gets a drink for free.',
    ],
  },
];
