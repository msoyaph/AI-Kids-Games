import type { MapDef } from './types';

/** World 1 — Sunny Meadow. */
export const WORLD1: MapDef[] = [
  {
    id: 'w1m1',
    name: 'Daisy Field',
    world: 1,
    theme: 'meadow',
    style: 'maze',
    story: 'The Grumblewumps are hopping across Daisy Field! Build towers to make their path long and wiggly.',
    favoredElements: ['nature', 'water'],
    grid: [
      'TTTT~~~TTTTTTTTTTTTT',
      'T.........B........T',
      'T..................T',
      'T....#.........#...T',
      'T..................T',
      'S.................CC',
      'S.................CC',
      'T..................T',
      'T...#.........#....T',
      'T..................T',
      'T.......B..........T',
      'TTTTTTTTT~~~TTTTTTTT',
    ],
  },
];
