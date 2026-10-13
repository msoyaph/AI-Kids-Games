/**
 * Brightmoor: the home town, with the Field Agent Academy, Gran's house, a Rest Stop, a shop,
 * and the Academy garden where you meet your partner. North: the Meadow Path.
 */
import { CAST, townsLook } from '../cast';
import { P } from '../../art/palette';
import type { MapDef } from '../../core/world/map';

export const brightmoor: MapDef = {
  id: 'brightmoor', name: 'Brightmoor', music: 'town-brightmoor', outdoor: true, battleBg: 'town',
  rows: [
    'TTTTTTTTTTTTTT::TTTTTTTTTTTTTT',
    'T.....,,,,....::.......""....T',
    'T....,,,,,,...::.............T',
    'T.....,,,,....::.............T',
    'T.............::.............T',
    'T.............::.............T',
    'T.............::.............T',
    'T...::::::::::::::::::::::...T',
    'T...:.........::........:....T',
    'T...:...============....:....T',
    'T...:...============....:.....',
    'T...::::============::::::::::',
    'T...:...============....:....T',
    'T...:...============....:....T',
    'T...:.........::........:....T',
    'T...:.........::........:....T',
    'T...:.........::........:....T',
    'T...::::::::::::::::::::::...T',
    'T......"""...........~~~~....T',
    'T.....B..........B..~~~~~....T',
    'T..K.......U........~~~~.....T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  objects: [
    { kind: 'house', x: 2, y: 6, w: 4, h: 3, id: 'home', house: { style: { roof: P.roofRed, wall: P.wallCream }, door: 2, kind: 'home' } },
    { kind: 'house', x: 8, y: 6, w: 3, h: 3, id: 'neighbor', house: { style: { roof: P.roofTeal, wall: P.wallPeach }, door: 1, kind: 'home' } },
    { kind: 'house', x: 17, y: 6, w: 6, h: 4, id: 'academy', house: { style: { roof: P.roofBlue, wall: P.wallWhite }, door: 2, kind: 'academy' } },
    { kind: 'house', x: 5, y: 16, w: 3, h: 3, id: 'rest', house: { style: { roof: P.roofGreen, wall: P.wallWhite }, door: 1, kind: 'rest' } },
    { kind: 'house', x: 20, y: 16, w: 3, h: 3, id: 'shop', house: { style: { roof: P.roofSun, wall: P.wallCream }, door: 1, kind: 'shop' } },
    { kind: 'sign', x: 13, y: 8, text: 'Brightmoor. A bright start for new Field Agents! North: Meadow Path. East: Academy Garden.' },
    { kind: 'lamp', x: 8, y: 9 }, { kind: 'lamp', x: 19, y: 9 }, { kind: 'lamp', x: 8, y: 13 }, { kind: 'lamp', x: 19, y: 13 },
    { kind: 'pot', x: 12, y: 10 }, { kind: 'pot', x: 15, y: 10 },
    { kind: 'gift', x: 27, y: 19, id: 'pond-berry', item: 'pep-berry' },
  ],
  warps: [
    { x: 4, y: 6, to: 'home', tx: 4, ty: 6, dir: 3 },
    { x: 9, y: 6, to: 'neighbor', tx: 4, ty: 6, dir: 3 },
    { x: 19, y: 6, to: 'academy', tx: 5, ty: 7, dir: 3, needs: 'woke-up', lockedText: 'The Academy opens soon. Say good morning to Gran first!' },
    { x: 6, y: 16, to: 'rest-brightmoor', tx: 4, ty: 6, dir: 3 },
    { x: 21, y: 16, to: 'shop-brightmoor', tx: 4, ty: 6, dir: 3 },
  ],
  edges: [
    { side: 'n', to: 'meadow-path', offset: -4 },
    { side: 'e', to: 'academy-garden', offset: -4 },
  ],
  npcs: [
    { id: 'kid-bo', name: 'Bo', x: 11, y: 15, dir: 0, look: townsLook('bo', { kid: true }), talk: 'bm-bo', wander: 2 },
    { id: 'mr-dale', name: 'Mr. Dale', x: 23, y: 9, dir: 1, look: townsLook('dale', { elder: true }), talk: 'bm-dale' },
    { id: 'tess', name: 'Tess', x: 16, y: 18, dir: 0, look: townsLook('tess'), talk: 'bm-tess', wander: 2 },
    { id: 'juno-town', name: CAST.juno!.name, x: 16, y: 8, dir: 0, look: CAST.juno!.look, talk: 'juno-town', showIf: 'got-partner & !left-brightmoor' },
  ],
  triggers: [
    { x: 14, y: 0, w: 2, h: 1, script: 'not-yet-north', when: '!got-partner' },
    { x: 29, y: 10, w: 1, h: 2, script: 'not-yet-garden', when: '!met-nell' },
  ],
  wild: [],
};

export const home: MapDef = {
  id: 'home', name: "Gran's house", music: 'home', outdoor: false, battleBg: 'indoor', theme: 3,
  rows: [
    'WWWWWWWWWW',
    'WWWWWWWWWW',
    'ffffffffff',
    'ffffffffff',
    'ffffrrffff',
    'ffffrrffff',
    'ffffffffff',
    'ffffrfffff',
  ],
  objects: [
    { kind: 'bed', x: 1, y: 3, h: 2 }, { kind: 'shelf', x: 8, y: 2 }, { kind: 'plant', x: 0, y: 6 }, { kind: 'table', x: 6, y: 5, w: 2 }, { kind: 'plant', x: 9, y: 6 },
  ],
  warps: [{ x: 4, y: 7, to: 'brightmoor', tx: 4, ty: 7, dir: 0 }],
  npcs: [{ id: 'gran', name: CAST.gran!.name, x: 6, y: 3, dir: 0, look: CAST.gran!.look, talk: 'gran' }],
  triggers: [],
};

export const neighbor: MapDef = {
  id: 'neighbor', name: 'The Hollis house', music: 'home', outdoor: false, battleBg: 'indoor', theme: 3,
  rows: ['WWWWWWWWW', 'WWWWWWWWW', 'fffffffff', 'fffffffff', 'fffrrrfff', 'fffffffff', 'fffffffff', 'ffffrffff'],
  objects: [{ kind: 'shelf', x: 1, y: 2 }, { kind: 'shelf', x: 2, y: 2 }, { kind: 'table', x: 5, y: 3, w: 2 }, { kind: 'plant', x: 8, y: 6 }],
  warps: [{ x: 4, y: 7, to: 'brightmoor', tx: 9, ty: 7, dir: 0 }],
  npcs: [{ id: 'mrs-hollis', name: 'Mrs. Hollis', x: 3, y: 4, dir: 0, look: townsLook('hollis', { elder: true }), talk: 'bm-hollis' }],
  triggers: [],
};

export const academy: MapDef = {
  id: 'academy', name: 'Field Agent Academy', music: 'academy', outdoor: false, battleBg: 'indoor', theme: 3,
  rows: [
    'WWWWWWWWWWWW',
    'WWWWWWWWWWWW',
    'ffffffffffff',
    'ffffrrrrffff',
    'ffffrrrrffff',
    'ffffrrrrffff',
    'ffffffffffff',
    'ffffffffffff',
    'fffffrrfffff',
  ],
  objects: [
    { kind: 'shelf', x: 0, y: 2 }, { kind: 'shelf', x: 1, y: 2 }, { kind: 'shelf', x: 10, y: 2 }, { kind: 'shelf', x: 11, y: 2 },
    { kind: 'plant', x: 3, y: 2 }, { kind: 'plant', x: 8, y: 2 }, { kind: 'nest', x: 9, y: 6, w: 2 },
  ],
  warps: [{ x: 5, y: 8, to: 'brightmoor', tx: 19, ty: 7, dir: 0 }, { x: 6, y: 8, to: 'brightmoor', tx: 19, ty: 7, dir: 0 }],
  npcs: [
    { id: 'nell', name: CAST.nell!.name, x: 6, y: 3, dir: 0, look: CAST.nell!.look, talk: 'nell' },
    { id: 'juno-academy', name: CAST.juno!.name, x: 8, y: 4, dir: 1, look: CAST.juno!.look, talk: 'juno-academy', showIf: '!met-nell' },
    { id: 'student', name: 'Kip', x: 2, y: 6, dir: 2, look: townsLook('kip', { agent: true, kid: true }), talk: 'academy-kip', wander: 1 },
  ],
  triggers: [{ x: 4, y: 6, w: 4, h: 2, script: 'nell-intro', when: '!met-nell' }],
  rest: { x: 9, y: 7 },
};

export const academyGarden: MapDef = {
  id: 'academy-garden', name: 'Academy Garden', music: 'garden', outdoor: true, battleBg: 'meadow',
  rows: [
    'TTTTTTTTTTTTTTTT',
    'T"""...,,,,..""T',
    'T"......,,,,...T',
    'T..............T',
    'T....::::::....T',
    'T....:....:....T',
    '.....:....:....T',
    ':::::::::::....T',
    'T....:....:....T',
    'T....::::::.,,.T',
    'T""..........,"T',
    'TTTTTTTTTTTTTTTT',
  ],
  objects: [{ kind: 'sign', x: 14, y: 6, text: 'Academy Garden. Young Agentmon play here. Be gentle!' }, { kind: 'bush', x: 2, y: 8 }, { kind: 'berrybush', x: 13, y: 3 }],
  warps: [],
  edges: [{ side: 'w', to: 'brightmoor', offset: 4 }],
  npcs: [
    { id: 'p-spinnet', name: 'Spinnet', x: 6, y: 3, dir: 0, look: CAST.agent!.look, creature: 'spinnet', talk: 'partner-spinnet', hideIf: 'got-partner' },
    { id: 'p-druzling', name: 'Druzling', x: 8, y: 3, dir: 0, look: CAST.agent!.look, creature: 'druzling', talk: 'partner-druzling', hideIf: 'got-partner' },
    { id: 'p-buzzbill', name: 'Buzzbill', x: 10, y: 3, dir: 0, look: CAST.agent!.look, creature: 'buzzbill', talk: 'partner-buzzbill', hideIf: 'got-partner' },
    { id: 'nell-garden', name: CAST.nell!.name, x: 8, y: 5, dir: 3, look: CAST.nell!.look, talk: 'nell-garden', showIf: 'met-nell & !juno-1' },
    { id: 'juno-garden', name: CAST.juno!.name, x: 10, y: 6, dir: 1, look: CAST.juno!.look, talk: 'juno-garden', showIf: 'met-nell & !juno-1' },
  ],
  triggers: [{ x: 0, y: 6, w: 2, h: 2, script: 'garden-arrive', when: 'met-nell & !got-partner' }],
  wild: ['academy-garden'],
};

export const restBrightmoor: MapDef = {
  id: 'rest-brightmoor', name: 'Brightmoor Rest Stop', music: 'rest', outdoor: false, battleBg: 'indoor', theme: 3,
  rows: ['WWWWWWWWW', 'WWWWWWWWW', 'fffffffff', 'fffffffff', 'ffffrffff', 'fffffffff', 'fffffffff', 'ffffrffff'],
  objects: [{ kind: 'nest', x: 1, y: 3, w: 2 }, { kind: 'counter', x: 3, y: 3, w: 3 }, { kind: 'plant', x: 8, y: 2 }, { kind: 'plant', x: 0, y: 6 }],
  warps: [{ x: 4, y: 7, to: 'brightmoor', tx: 6, ty: 17, dir: 0 }],
  npcs: [{ id: 'helper', name: CAST.helper!.name, x: 4, y: 2, dir: 0, look: CAST.helper!.look, talk: 'rest-stop' }],
  triggers: [],
  rest: { x: 4, y: 4 },
};

export const shopBrightmoor: MapDef = {
  id: 'shop-brightmoor', name: 'Brightmoor Shop', music: 'shop', outdoor: false, battleBg: 'indoor', theme: 3,
  rows: ['WWWWWWWWW', 'WWWWWWWWW', 'fffffffff', 'fffffffff', 'fffffffff', 'fffffffff', 'fffffffff', 'ffffrffff'],
  objects: [{ kind: 'counter', x: 3, y: 3, w: 3 }, { kind: 'shelf', x: 0, y: 2 }, { kind: 'shelf', x: 8, y: 2 }, { kind: 'crate', x: 8, y: 6 }],
  warps: [{ x: 4, y: 7, to: 'brightmoor', tx: 21, ty: 17, dir: 0 }],
  npcs: [{ id: 'clerk', name: CAST.clerk!.name, x: 4, y: 2, dir: 0, look: CAST.clerk!.look, talk: 'shop-brightmoor' }],
  triggers: [],
};
