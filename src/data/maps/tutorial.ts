import { withMapText, type MapDef } from './types';

export const TUTORIAL_MAP: MapDef = withMapText([
  {
  id: 'tutorial',
  world: 0,
  theme: 'meadow',
  style: 'maze',
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
},
])[0]!;
