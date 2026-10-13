/**
 * After the story: the Starlit Meadow (the Spotlight Club's open garden, east of Cragtop) and Deep
 * Blue Cove (paddle east from Sandy Shore). Third-stage Agentmon live here, and two guardians wait
 * to be found: Tidecrest in the cove (Archwyn and Frostmantle wait on the Dune Flats and the
 * Frostfall Slopes).
 * 1.1: Banyan Hollow, through a root tunnel at the north end of the meadow's path: one old banyan
 * tree on many trunks, a pond with a rope bridge, a Rest Stop in a hollow trunk, three small quests
 * and, once the hollow is happy, the guardian Verdanyan.
 */
import { P } from '../../art/palette';
import { CAST, townsLook } from '../cast';
import type { MapDef } from '../../core/world/map';
import { restStopMap } from './interiors';

export const starlitMeadow: MapDef = {
  id: 'starlit-meadow', name: 'Starlit Meadow', music: 'garden', outdoor: true, battleBg: 'meadow',
  rows: [
    'KKKKKKKKKKKKKKKKKKKKKKKKKKKK',
    'K..........................K',
    'K..........................K',
    'K..,,,,,,,...::...,,,,,,,..K',
    'K..,,,,,,,...::...,,,,,,,..K',
    'K..,,,,,,,...::...,,,,,,,..K',
    'K..,,,,,,,...::...,,,,,,,..K',
    'K..,,,,,,,...::...,,,,,,,..K',
    'K............::............K',
    'K...""""""...::."""""""""..K',
    ':::::::::::::::."""""""""..K',
    ':::::::::::::::."""""""""..K',
    'K............::."""""""""..K',
    'K............::............K',
    'K..,,,,,,,...::...,,,,,,,..K',
    'K..,,,,,,,...::...,,,,,,,..K',
    'K..,,,,,,,...::...,,,,,,,..K',
    'K..,,,,,,,...::...,,,,,,,..K',
    'K..,,,,,,,...::...,,,,,,,..K',
    'K..........................K',
    'K..........................K',
    'KKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  ],
  objects: [
    { kind: 'sign', x: 12, y: 9, text: 'The Starlit Meadow. Once a showground, now an open garden. Agentmon come and go as they please!' },
    { kind: 'bench', x: 16, y: 13 }, { kind: 'bench', x: 19, y: 13 },
    { kind: 'gift', x: 25, y: 2, id: 'meadow-star-gift', item: 'rainbow-berry' },
    { kind: 'roots', x: 13, y: 1, w: 2, h: 2, id: 'root-tunnel' },
  ],
  warps: [
    { x: 13, y: 1, to: 'banyan-hollow', tx: 13, ty: 20, dir: 3, needs: 'credits', lockedText: 'The roots are tangled tight. Maybe after your adventure!' },
    { x: 14, y: 1, to: 'banyan-hollow', tx: 14, ty: 20, dir: 3, needs: 'credits', lockedText: 'The roots are tangled tight. Maybe after your adventure!' },
  ],
  edges: [{ side: 'w', to: 'cragtop', offset: -7 }],
  npcs: [
    { id: 'garden-velour', name: CAST.velour!.name, x: 20, y: 10, dir: 2, look: CAST.velour!.look, talk: 'garden-velour' },
    { id: 'garden-dot', name: 'Dot', x: 6, y: 9, dir: 0, look: CAST.club!.look, talk: 'garden-dot' },
    { id: 'garden-mabel', name: 'Mabel', x: 22, y: 12, dir: 1, look: { ...CAST.club!.look, skin: 4, hair: 6 }, talk: 'garden-mabel' },
  ],
  triggers: [],
  wild: ['starlit-meadow'],
};

export const deepBlueCove: MapDef = {
  id: 'deep-blue-cove', name: 'Deep Blue Cove', music: 'route-shore', outdoor: true, battleBg: 'beach',
  rows: [
    '~###########################',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '~~~~~~~~~~~~~~~~~~~~ssssss~#',
    '~~~~~~~~~~~~~~~~~~~~ssssss~#',
    '~~~~~~ssssss~~~~~~~~ssssss~#',
    '~~~~~~ssssss~~~~~~~~ssssss~#',
    '~~~~~~ssssss~~~~~~~~~~~~~~~#',
    '~~~~~~ssssss~~~~~~~~~~~~~~~#',
    '~~~~~~ssssss~~~~~~~~~~~~~~~#',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '~~~~~~~~~~~~~~~~~ssssssss~~#',
    '~~~~~~~~~~~~~~~~~ssssssss~~#',
    '~~~~~~~~~~~~~~~~~ssssssss~~#',
    '~~~~~~~~~~~~~~~~~ssssssss~~#',
    '~~~~~~~~~~~~sss~~ssssssss~~#',
    '~~~~~~~~~~~~sss~~ssssssss~~#',
    '#~~~~~~~~~~~sss~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '############################',
  ],
  objects: [
    { kind: 'sign', x: 8, y: 6, text: 'Deep Blue Cove. On moonlit nights, something big glows out on the water.' },
    { kind: 'gift', x: 23, y: 3, id: 'cove-gift', item: 'tide-charm' },
  ],
  warps: [],
  edges: [{ side: 'w', to: 'sandy-shore', offset: 0 }],
  npcs: [
    { id: 'tidecrest', name: 'Tidecrest', x: 21, y: 13, dir: 0, look: CAST.agent!.look, creature: 'tidecrest', talk: 'guardian-tidecrest', showIf: 'credits & item:tide-pearl:1 & !tidecrest-friend' },
  ],
  triggers: [],
  wild: ['deep-blue-cove'],
};

export const banyanHollow: MapDef = {
  id: 'banyan-hollow', name: 'Banyan Hollow', music: 'garden', outdoor: true, battleBg: 'forest', theme: 1,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T,,,,,,..............,,,,,,,,T',
    'T,,,,,,......::......,,,,,,,,T',
    'T,,,,,"".....::...."",,,,,,,,T',
    'T,,,,,"".....::....""........T',
    'T............::..............T',
    'T....::::::::::::::::::::....T',
    'T....:..................:....T',
    'T....:..................:....T',
    'T....:..................:....T',
    'T....:..................:....T',
    'T....:..................:....T',
    'T....::::::::::::::::::::....T',
    'T............::..............T',
    'T,,,,,,......::...-----------T',
    'T,,,,,,......::...-~~~~~~~~~-T',
    'T,,,,,,......::...-bbbbb"""~-T',
    'T,,,,,,......::...-~~~~~"""~-T',
    'T,,,,,,......::...-~~~~~~~~~-T',
    'T""..........::...-----------T',
    'T""..........::..............T',
    'TTTTTTTTTTTTT::TTTTTTTTTTTTTTT',
  ],
  objects: [
    { kind: 'banyan', x: 12, y: 11, w: 6, h: 3, id: 'great-banyan' },
    { kind: 'house', x: 2, y: 11, w: 3, h: 3, id: 'rest', house: { style: { roof: P.leaf, wall: 0x8a6a4a }, door: 1, kind: 'rest' } },
    { kind: 'roots', x: 13, y: 21, w: 2, h: 2, id: 'root-tunnel-back' },
    { kind: 'lantern', x: 8, y: 9, id: 'lantern-w', litBy: 'lanterns-lit' },
    { kind: 'lantern', x: 21, y: 9, id: 'lantern-e', litBy: 'lanterns-lit' },
    { kind: 'lantern', x: 11, y: 14, id: 'lantern-s', litBy: 'lanterns-lit' },
    { kind: 'gift', x: 1, y: 1, id: 'lantern-seed-1', item: 'lantern-seed' },
    { kind: 'gift', x: 26, y: 16, id: 'lantern-seed-2', item: 'lantern-seed' },
    { kind: 'gift', x: 28, y: 1, id: 'lantern-seed-3', item: 'lantern-seed' },
    { kind: 'table', x: 26, y: 5 },
    { kind: 'sign', x: 12, y: 13, text: 'Banyan Hollow. One old tree, many trunks. Rest a while in the hollow trunk!' },
    { kind: 'autumn', x: 27, y: 7 }, { kind: 'berrybush', x: 1, y: 8 }, { kind: 'bush', x: 28, y: 12 },
  ],
  warps: [
    { x: 3, y: 11, to: 'rest-banyan', tx: 4, ty: 6, dir: 3 },
    { x: 13, y: 21, to: 'starlit-meadow', tx: 13, ty: 2, dir: 0 },
    { x: 14, y: 21, to: 'starlit-meadow', tx: 14, ty: 2, dir: 0 },
  ],
  npcs: [
    { id: 'banyan-fen', name: 'Fen', x: 10, y: 4, dir: 0, look: townsLook('fen', { hat: 'beanie', hatColor: 0x4fa66a }), talk: 'banyan-fen' },
    { id: 'banyan-pip', name: 'Pip', x: 21, y: 13, dir: 0, look: townsLook('pip', { kid: true }), talk: 'banyan-pip' },
    { id: 'banyan-mo', name: 'Grandma Mo', x: 25, y: 5, dir: 0, look: townsLook('mo', { elder: true, apron: 0xfff0d8 }), talk: 'banyan-mo' },
    { id: 'banyan-rowan', name: 'Old Rowan', x: 17, y: 13, dir: 1, look: townsLook('rowan', { elder: true, scarf: 0x9ed97a }), talk: 'banyan-rowan' },
    { id: 'relay-sprigling', name: 'Sprigling', x: 8, y: 2, dir: 0, look: CAST.agent!.look, creature: 'sprigling', talk: 'relay-sprigling' },
    { id: 'relay-twigstride', name: 'Twigstride', x: 27, y: 10, dir: 1, look: CAST.agent!.look, creature: 'twigstride', talk: 'relay-twigstride' },
    { id: 'relay-leafwarden', name: 'Leafwarden', x: 9, y: 20, dir: 3, look: CAST.agent!.look, creature: 'leafwarden', talk: 'relay-leafwarden' },
    { id: 'verdanyan', name: 'Verdanyan', x: 15, y: 12, dir: 0, look: CAST.agent!.look, creature: 'verdanyan', talk: 'guardian-verdanyan', showIf: 'sq-lantern-done & sq-relay-done & sq-tea-done & !verdanyan-friend' },
  ],
  triggers: [],
  wild: ['banyan-hollow'],
};

export const restBanyan = restStopMap('rest-banyan', 'Hollow Trunk Rest Stop', { map: 'banyan-hollow', x: 3, y: 12 });
