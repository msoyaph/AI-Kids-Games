/** Shop and home interiors (ASCII). Each returns to its town door one tile below. */
import { Ter } from '../../sim/terrain';
import { interior } from './builder';
import type { MapContext } from './index';
import type { MapDef } from './types';

const PROPS: Record<string, { t?: (typeof Ter)[keyof typeof Ter]; prop?: string }> = {
  C: { prop: 'counter' },
  S: { prop: 'shelf' },
  B: { prop: 'bed' },
  T: { prop: 'table' },
  t: { prop: 'table2' },
  h: { prop: 'chair' },
  P: { prop: 'plant' },
  F: { prop: 'fireplace' },
  K: { prop: 'stove' },
  A: { prop: 'anvil' },
  R: { prop: 'rug' },
  O: { prop: 'bookshelf' },
  E: { prop: 'easel' },
  w: { t: Ter.WALL, prop: 'window' },
  n: { t: Ter.WALL, prop: 'painting' },
  x: { prop: 'crate' },
  b: { prop: 'barrel' },
  H: { prop: 'hay' },
  G: { prop: 'case' },
  p: { prop: 'pedestal' },
  L: { prop: 'lantern' },
  k: { prop: 'workbench' },
  Q: { prop: 'piano' },
  U: { prop: 'cauldron' },
  Y: { prop: 'telescope' },
};

interface RoomSpec {
  id: string;
  name: string;
  rows: string[];
  /** town door this room exits to */
  exit: { to: string; x: number; y: number };
  music?: string;
  /** counter tiles that open the shop: [x0, x1, y] */
  counter?: [number, number, number, string];
  points?: Record<string, [number, number]>;
}

export function buildRoom(spec: RoomSpec): MapDef {
  const b = interior(spec.id, spec.name, spec.rows, PROPS, spec.music ?? 'home');
  const doorY = spec.rows.length - 1;
  const doorX = spec.rows[doorY].indexOf('D');
  b.warp(doorX, doorY, spec.exit.to, spec.exit.x, spec.exit.y, { dir: 0 });
  b.point('door', doorX, doorY - 1, 3);
  if (spec.counter) {
    const [x0, x1, y, shop] = spec.counter;
    b.trigger(x0, y, 'shop', shop, x1 - x0 + 1, 1);
  }
  for (const [k, [x, y]] of Object.entries(spec.points ?? {})) b.point(k, x, y);
  return b.build({ id: spec.id, name: spec.name, outdoor: false, farmable: false, music: spec.music ?? 'home', water: 'none' });
}

export const ROOMS: RoomSpec[] = [
  {
    id: 'store',
    name: "Thistle's General Store",
    music: 'shop',
    rows: [
      '##############',
      '#WWwWWWWWWwWW#',
      '#S.S.S...P...#',
      '#.......CCCC.#',
      '#............#',
      '#x..T.h..S.S.#',
      '#............#',
      '#.....R......#',
      '#b...........#',
      '#............#',
      '######D#######',
    ],
    exit: { to: 'town', x: 50, y: 22 },
    counter: [8, 11, 3, 'store'],
    points: { keeper: [10, 2], browse: [4, 4], table: [5, 6] },
  },
  {
    id: 'cafe',
    name: 'The Sunny Cup Café',
    music: 'cafe',
    rows: [
      '##############',
      '#WWwWWnWWWwWW#',
      '#K.U.....P..O#',
      '#.CCCCC......#',
      '#............#',
      '#.hTh....hTh.#',
      '#............#',
      '#.hTh....hTh.#',
      '#............#',
      '#P..........P#',
      '######D#######',
    ],
    exit: { to: 'town', x: 50, y: 31 },
    counter: [2, 6, 3, 'cafe'],
    points: { keeper: [4, 2], seat1: [2, 6], seat2: [4, 6], seat3: [9, 6], seat4: [11, 8], seat5: [2, 8], seat6: [9, 8], baker: [6, 2] },
  },
  {
    id: 'museum',
    name: 'Valley Museum & Library',
    music: 'museum',
    rows: [
      '################',
      '#WWnWWWwwWWWnWW#',
      '#O.G.G.G.G.G..O#',
      '#..............#',
      '#.p.p.p..p.p.p.#',
      '#..............#',
      '#.p.p.p..p.p.p.#',
      '#..............#',
      '#......CC......#',
      '#P............P#',
      '#..............#',
      '#######D########',
    ],
    exit: { to: 'town', x: 21, y: 17 },
    counter: [7, 8, 8, 'museum'],
    points: { keeper: [7, 7], shelf: [13, 3], reader: [3, 9] },
  },
  {
    id: 'smithy',
    name: 'Ironwood Smithy',
    music: 'shop',
    rows: [
      '############',
      '#WWwWWWWnWW#',
      '#A.F.k....S#',
      '#.....CCC..#',
      '#..........#',
      '#b.x.......#',
      '#..........#',
      '#.....P....#',
      '#..........#',
      '####D#######',
    ],
    exit: { to: 'town', x: 58, y: 12 },
    counter: [6, 8, 3, 'smithy'],
    points: { keeper: [7, 2], anvil: [2, 3] },
  },
  {
    id: 'carpentry',
    name: "Pine's Carpentry",
    music: 'shop',
    rows: [
      '############',
      '#WWwWWWWwWW#',
      '#k.x.x...O.#',
      '#....CCC...#',
      '#..........#',
      '#b.......x.#',
      '#..........#',
      '#..t.......#',
      '#..........#',
      '#####D######',
    ],
    exit: { to: 'town', x: 11, y: 12 },
    counter: [5, 7, 3, 'carpenter'],
    points: { keeper: [6, 2], bench: [2, 3] },
  },
  {
    id: 'ranch',
    name: 'Brook Family Ranch',
    music: 'shop',
    rows: [
      '############',
      '#WWwWWWWwWW#',
      '#H.H.....P.#',
      '#.....CCC..#',
      '#..........#',
      '#x.b.......#',
      '#..........#',
      '#.....T.h..#',
      '#..........#',
      '####D#######',
    ],
    exit: { to: 'town', x: 10, y: 41 },
    counter: [6, 8, 3, 'ranch'],
    points: { keeper: [7, 2], kid: [3, 6], table: [8, 7] },
  },
  {
    id: 'houseLumi',
    name: "Lumi's Workshop",
    rows: ['##########', '#WWwWWnWW#', '#B.k..Y..#', '#........#', '#.x...T.h#', '#........#', '#O......P#', '#........#', '####D#####'],
    exit: { to: 'town', x: 26, y: 41 },
    points: { bed: [2, 4], desk: [3, 3], telescope: [6, 3] },
  },
  {
    id: 'houseBasil',
    name: "Basil's Cottage",
    rows: ['##########', '#WWwWWWwW#', '#B..P..P.#', '#........#', '#.T.h..x.#', '#........#', '#P..b...P#', '#........#', '####D#####'],
    exit: { to: 'town', x: 33, y: 46 },
    points: { bed: [2, 4], chair: [4, 5] },
  },
  {
    id: 'houseOakes',
    name: 'Oakes Family Home',
    rows: ['############', '#WWwWWnWWwW#', '#B.O..Q..B.#', '#..........#', '#..t.h.....#', '#..........#', '#E....R....#', '#..........#', '#P........P#', '#####D######'],
    exit: { to: 'town', x: 43, y: 40 },
    points: { bed: [2, 4], bed2: [9, 4], easel: [2, 7], piano: [6, 3], table: [5, 5] },
  },
  {
    id: 'houseNana',
    name: "Nana Clementine's Cottage",
    rows: ['##########', '#WWwWWnWW#', '#B..KU.O.#', '#........#', '#.T.h....#', '#........#', '#P.R....P#', '#........#', '####D#####'],
    exit: { to: 'town', x: 60, y: 29 },
    points: { bed: [2, 4], stove: [4, 3], chair: [4, 5] },
  },
  {
    id: 'houseToby',
    name: "Toby's Cabin",
    rows: ['##########', '#WWwWWnWW#', '#B..F..O.#', '#........#', '#..T.h...#', '#........#', '#x.b...P.#', '#........#', '####D#####'],
    exit: { to: 'town', x: 65, y: 18 },
    points: { bed: [2, 4], chair: [5, 5], fire: [4, 3] },
  },
];

/** The Valley Hall with its six restoration boards and the crystal lamp. */
export function buildHall(ctx: MapContext = { houseLevel: 0, done: [] }): MapDef {
  const restored = ctx.done.includes('crafted');
  const rows = [
    '####################',
    '#WWwWWWWWWWWWWWWwWW#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#########D##########',
  ];
  const b = interior('hall', 'Valley Hall', rows, PROPS, 'hall');
  const boards: [string, number][] = [['crops', 2], ['forage', 5], ['fish', 8], ['animal', 11], ['minerals', 14], ['crafted', 17]];
  for (const [id, x] of boards) {
    b.prop('board', x, 2);
    b.trigger(x, 2, 'board', id, 2, 1);
  }
  b.prop('pedestal', 9, 7);
  b.prop('pedestal', 10, 7);
  b.trigger(9, 7, 'lamp', undefined, 2, 1);
  b.prop('plant', 1, 12);
  b.prop('plant', 18, 12);
  b.prop('bench', 3, 9);
  b.prop('bench', 15, 9);
  if (restored) {
    for (const x of [4, 7, 12, 15]) b.prop('painting', x, 1);
    b.prop('banner', 1, 4);
    b.prop('banner', 18, 4);
    b.prop('rug', 8, 10);
    b.prop('plant', 1, 5);
    b.prop('plant', 18, 5);
  } else {
    for (const [x, y] of [[5, 5], [14, 6], [3, 11], [16, 11], [12, 4]]) b.prop('rubble', x, y);
  }
  b.warp(9, 13, 'town', 35, 17, { dir: 0 });
  b.point('door', 9, 12, 3);
  b.point('mayor', 12, 5);
  b.point('center', 9, 9);
  for (let i = 0; i < 14; i++) b.point(`crowd${i}`, 3 + (i % 7) * 2, 10 + Math.floor(i / 7));
  return b.build({ id: 'hall', name: 'Valley Hall', outdoor: false, farmable: false, music: 'hall', water: 'none' });
}

