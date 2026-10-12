import { withMapText, type MapDef } from './types';

/** World 6 — Rift Citadel: twin citadels, shifting ground and the rift core. */
export const WORLD6: MapDef[] = withMapText([
  {
    id: 'w6m1',
    world: 6,
    theme: 'rift',
    style: 'maze',
    favoredElements: ['shadow', 'water'],
    // two citadels: every construct heads for the closer one
    grid: [
      'TTTTTTTTTTTTTTTTTTTT',
      'T................CCT',
      'T................CCT',
      'T..................T',
      'T...#..........#...T',
      'S..................T',
      'S..................T',
      'T...#..........#...T',
      'T..................T',
      'T................CCT',
      'T................CCT',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
  },
  {
    id: 'w6m2',
    world: 6,
    theme: 'rift',
    style: 'maze',
    favoredElements: ['earth', 'shadow'],
    // at wave 20 the centre (U) crystallises shut and the rubble lanes (R) open
    events: { shiftWave: 20 },
    grid: [
      'TTTTTTTTTTTTTTTTTTTT',
      'T.......RRRR.......T',
      'T.......RRRR.......T',
      'T.......####.......T',
      'T.......UUUU.......T',
      'S.......UUUU......CC',
      'S.......UUUU......CC',
      'T.......UUUU.......T',
      'T.......####.......T',
      'T.......RRRR.......T',
      'T.......RRRR.......T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
  },
  {
    id: 'w6m3',
    world: 6,
    theme: 'rift',
    style: 'maze',
    favoredElements: ['shadow', 'light', 'fire'],
    // three platforms linked by two gate pairs; at wave 25 the rift collapses into new ground
    events: { shiftWave: 25 },
    grid: [
      'TTTTTTTTTTTTTTTTTTTT',
      'T.....~~.....~~....T',
      'T..P..~~.....~~....T',
      'T.....~~..p..~~....T',
      'T.....RR.....RR....T',
      'S.....RR.....RR...CC',
      'S.....RR.....RR...CC',
      'T.....~~.....~~....T',
      'T.....~~.Q...~~..q.T',
      'T.....~~.....~~....T',
      'T.....~~.....~~....T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
  },
]);
