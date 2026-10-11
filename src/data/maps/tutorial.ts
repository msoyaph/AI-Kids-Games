import type { MapDef } from './types';

export const TUTORIAL_MAP: MapDef = {
  id: 'tutorial',
  name: "Pip's Garden",
  world: 0,
  theme: 'meadow',
  style: 'maze',
  story: "Hi, I'm Pip! Let's learn how to keep the crystals safe.",
  startCoins: 120,
  waves: 8,
  grid: [
    'TTTTTTTTTTTTTT',
    'T....B.......T',
    'T............T',
    'S...........CC',
    'S...........CC',
    'T............T',
    'T.......B....T',
    'TTTTTTTTTTTTTT',
  ],
};
