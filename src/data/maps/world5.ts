import { withMapText, type MapDef } from './types';

/** World 5 — Skyforge Ruins: gates, drawbridges and a sky lane over the void. */
export const WORLD5: MapDef[] = withMapText([
  {
    id: 'w5m1',
    world: 5,
    theme: 'sky',
    style: 'maze',
    favoredElements: ['light', 'fire'],
    // two platforms joined only by a gate pair (P → Q)
    grid: [
      'TTTTTTTTT~~TTTTTTTTT',
      'T........~~........T',
      'T......P.~~........T',
      'T........~~...#....T',
      'T..#.....~~........T',
      'S........~~.......CC',
      'S........~~.......CC',
      'T........~~....#...T',
      'T.....#..~~........T',
      'T........~~.Q......T',
      'T........~~........T',
      'TTTTTTTTT~~TTTTTTTTT',
    ],
  },
  {
    id: 'w5m2',
    world: 5,
    theme: 'sky',
    style: 'maze',
    favoredElements: ['earth', 'light'],
    // two drawbridges: only one is down at a time; they flip every five waves
    events: { bridgeWaves: [6, 11, 16, 21, 26, 31, 36] },
    grid: [
      'TTTTTTTTT~~TTTTTTTTT',
      'T........~~........T',
      'T........HH........T',
      'T........~~........T',
      'T....#...~~...#....T',
      'S........~~.......CC',
      'S........~~.......CC',
      'T....#...~~...#....T',
      'T........~~........T',
      'T........hh........T',
      'T........~~........T',
      'TTTTTTTTT~~TTTTTTTTT',
    ],
  },
  {
    id: 'w5m3',
    world: 5,
    theme: 'sky',
    style: 'path',
    favoredElements: ['shadow', 'light'],
    // a winding road for walkers and a sky lane (Y → F…) that every flyer follows
    grid: [
      'TTTTTTTTTTTTTTTTTTTT',
      'YFFFFFFFFFFFFFFFFFFT',
      'ToooooooooooooooooFT',
      'S===============oooF',
      'Toooooooooooooo=ooFT',
      'To==============ooCC',
      'To=oooooooooooooo=CC',
      'To=oooooooooooooo=oT',
      'To================oT',
      'ToooooooooooooooooTT',
      'ToooooooooooooooooTT',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
  },
]);
