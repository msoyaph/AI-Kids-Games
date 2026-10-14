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
    id: 'soil', title: 'Healthy soil', icon: 'compost', facts: ['idea:nitrogen', 'idea:humus', 'idea:legumes'],
    game: [
      'Every field has nitrogen and humus, from 0 to 3 dots. Choose Seeds to see them.',
      'Hungry crops use up nitrogen. Beans, peas and clover put it back.',
      'Compost and clover add humus. Growing the same family twice uses some up.',
      'Soil with 2 dots or more of each gives a crop two care points.',
    ],
  },
  {
    id: 'rotation', title: 'Crop rotation', icon: 'plough', facts: ['idea:rotation'],
    game: [
      'Plant a different family from last time, and the field gives a care point.',
      'Rotating also keeps the humus in the soil. Each crop page says which family it is in.',
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
    id: 'breeding', title: 'New varieties', icon: 'seeds', facts: ['idea:breeding', 'idea:heirloom'],
    game: [
      'From chapter 4, heirloom seeds are in the Seeds list.',
      'Plant two kinds of one crop side by side, with a beehive close by.',
      'When you pick them, the bees may have made a new variety!',
    ],
  },
  {
    id: 'weather', title: 'Weather', icon: 'rain', facts: ['idea:rain', 'forage:mushroom'],
    game: [
      'Tap the date to see the weather for the next few days.',
      'Rain waters every crop. A sunny spell makes them grow faster.',
      'After a misty morning, look for mushrooms at the edges of your land.',
    ],
  },
];
