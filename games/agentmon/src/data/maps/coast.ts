/**
 * Chapter 2, the coast: Saltwhistle (a fishing town), Sandy Shore (the beach, with the Lighthouse on
 * its little island; a Tide friend paddles you across), the Lighthouse hall (the Trial door) and the
 * Lighthouse top (Keeper Marisol and the Beacon). West of town, the Cliff Road opens after the Beacon.
 */
import { CAST, townsLook } from '../cast';
import { P } from '../../art/palette';
import type { MapDef } from '../../core/world/map';
import { restStopMap, shopMap, trialHall, trialTop } from './interiors';

export const saltwhistle: MapDef = {
  id: 'saltwhistle', name: 'Saltwhistle', music: 'town-saltwhistle', outdoor: true, battleBg: 'beach',
  rows: [
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~bb~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~bb~~~~~~~~~~~~~~#',
    '#-ssssssssssbbbbssssssssssss-#',
    '#Yssssssssss::::ssssssssssssY#',
    'Tsss.......::::::.........sssT',
    'T.........::....::...........T',
    'T.........::....::...........T',
    'T.........::....::...........T',
    '::::::::::::::::::::::::::::::',
    'T.........::.................T',
    'T.........::...======........T',
    'T.........::...======........T',
    'T.........::...======........T',
    'T.........::::::======.......T',
    'T.........::...======........T',
    'T.........::.................T',
    'T.B.......::.............""..T',
    'T.........::..........B..""..T',
    'T.........::.................T',
    'TTTTTTTTTT::TTTTTTTTTTTTTTTTTT',
  ],
  objects: [
    { kind: 'house', x: 1, y: 9, w: 3, h: 3, id: 'rest', house: { style: { roof: P.roofGreen, wall: P.wallWhite }, door: 1, kind: 'rest' } },
    { kind: 'house', x: 5, y: 9, w: 3, h: 3, id: 'home-a', house: { style: { roof: P.roofTeal, wall: P.wallCream }, door: 1, kind: 'home' } },
    { kind: 'house', x: 19, y: 9, w: 3, h: 3, id: 'shop', house: { style: { roof: P.roofSun, wall: P.wallCream }, door: 1, kind: 'shop' } },
    { kind: 'house', x: 23, y: 9, w: 4, h: 3, id: 'home-b', house: { style: { roof: P.roofBlue, wall: P.wallPeach }, door: 2, kind: 'home' } },
    { kind: 'house', x: 2, y: 16, w: 4, h: 3, id: 'home-c', house: { style: { roof: P.roofRed, wall: P.wallWhite }, door: 1, kind: 'home' } },
    { kind: 'sign', x: 12, y: 11, text: 'Saltwhistle. Listen! The wind whistles over the waves. East: Sandy Shore and the Lighthouse. West: Cliff Road.' },
    { kind: 'lamp', x: 14, y: 12 }, { kind: 'lamp', x: 21, y: 12 }, { kind: 'lamp', x: 14, y: 16 }, { kind: 'lamp', x: 21, y: 16 },
    { kind: 'bench', x: 17, y: 11 }, { kind: 'pot', x: 16, y: 14 }, { kind: 'pot', x: 19, y: 14 },
    { kind: 'crate', x: 11, y: 4 }, { kind: 'crate', x: 16, y: 4 },
    { kind: 'gift', x: 28, y: 18, id: 'salt-gift', item: 'sea-crisp' },
  ],
  warps: [
    { x: 2, y: 9, to: 'rest-saltwhistle', tx: 4, ty: 6, dir: 3 },
    { x: 6, y: 9, to: 'salt-home', tx: 4, ty: 6, dir: 3 },
    { x: 20, y: 9, to: 'shop-saltwhistle', tx: 4, ty: 6, dir: 3 },
    { x: 25, y: 9, to: 'salt-home', tx: 4, ty: 6, needs: 'never', lockedText: 'Nobody is home. A note says: "Gone fishing!"' },
    { x: 3, y: 16, to: 'salt-home', tx: 4, ty: 6, needs: 'never', lockedText: 'The door is locked. Someone inside is taking a nap. Shh!' },
  ],
  edges: [
    { side: 's', to: 'meadow-path', offset: 0 },
    { side: 'e', to: 'sandy-shore', offset: 0 },
    { side: 'w', to: 'cliff-road', offset: 12 },
  ],
  npcs: [
    { id: 'salt-fisher', name: 'Mr. Bram', x: 13, y: 2, dir: 3, look: townsLook('bram', { elder: true, hat: 'cap', hatColor: 0x4f7fd9 }), talk: 'salt-bram' },
    { id: 'salt-kid', name: 'Wren', x: 8, y: 13, dir: 0, look: townsLook('wren', { kid: true }), talk: 'salt-wren', wander: 2 },
    { id: 'salt-net', name: 'Ms. Ada', x: 24, y: 13, dir: 1, look: townsLook('ada', { hat: 'sunhat', hatColor: 0xd9604f }), talk: 'salt-ada' },
    { id: 'salt-agent', name: 'Agent Lin', x: 12, y: 18, dir: 2, look: townsLook('lin', { agent: true }), talk: 'salt-lin' },
    { id: 'juno-salt', name: CAST.juno!.name, x: 17, y: 10, dir: 0, look: CAST.juno!.look, talk: 'juno-salt', showIf: 'beacon-lighthouse & !juno-salt' },
  ],
  triggers: [
    { x: 10, y: 20, w: 2, h: 1, script: 'salt-arrive', when: '!salt-arrive' },
    { x: 1, y: 10, w: 1, h: 1, script: 'not-yet-west', when: '!beacon-lighthouse' },
  ],
  wild: [],
};

export const restSaltwhistle = restStopMap('rest-saltwhistle', 'Saltwhistle Rest Stop', { map: 'saltwhistle', x: 2, y: 10 });
export const shopSaltwhistle = shopMap('shop-saltwhistle', 'Saltwhistle Shop', 'shop-saltwhistle', { map: 'saltwhistle', x: 20, y: 10 });

export const saltHome: MapDef = {
  id: 'salt-home', name: 'Seaside house', music: 'home', outdoor: false, battleBg: 'indoor', theme: 3,
  rows: ['WWWWWWWWW', 'WWWWWWWWW', 'fffffffff', 'fffffffff', 'fffrrffff', 'fffrrffff', 'fffffffff', 'ffffrffff'],
  objects: [{ kind: 'bed', x: 7, y: 3 }, { kind: 'table', x: 2, y: 4 }, { kind: 'shelf', x: 0, y: 2 }, { kind: 'plant', x: 8, y: 6 }],
  warps: [{ x: 4, y: 7, to: 'saltwhistle', tx: 6, ty: 10, dir: 0 }],
  npcs: [
    { id: 'salt-grandpa', name: 'Grandpa Tov', x: 1, y: 4, dir: 2, look: townsLook('tov', { elder: true }), talk: 'salt-tov' },
    { id: 'salt-lullakin', name: 'Lullakin', x: 6, y: 5, dir: 0, look: CAST.agent!.look, creature: 'lullakin', talk: 'salt-pet' },
  ],
  triggers: [],
};

export const sandyShore: MapDef = {
  id: 'sandy-shore', name: 'Sandy Shore', music: 'route-shore', outdoor: true, battleBg: 'beach',
  rows: [
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '#----------~~~~~~~~~~~~~~~~~~~~~~~~~',
    'Yssssssssss---------------~~~sssss~~',
    'YsYssssssssssssssssssssss-~~ssssss~~',
    'YssssssssssssssYssssssss--~~ssssss~~',
    'Yssssssssssssssssssssssss-~~ssssss~~',
    'Ysssssssssssssssssssssssss~~s::::s~~',
    'Ysssssssssssssssssssssssss~~s::::s~~',
    '::::::::::::::::::::::::::~~s::::s~~',
    'Ysssssssssssssssssssssssss~~ssssss~~',
    'YsYsssssssssssssssssssssss~~~~~~~~~~',
    'YsssssssssssssssssssYsssss~~~~~~~~~~',
    'Yssssssssssssssssssssssss~~~~~~~~~~~',
    'TTssssssssssssssssssssss~~~~~~~~~~~~',
    'TTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~~~~~~',
  ],
  objects: [
    { kind: 'sign', x: 3, y: 9, text: 'Sandy Shore. The Lighthouse stands on the little island. Paddle across with a Tide friend!' },
    { kind: 'lighthouse', x: 31, y: 7, w: 2, h: 2, id: 'lighthouse', litBy: 'beacon-lighthouse' },
    { kind: 'lure', x: 18, y: 13, id: 'lure-shore', goneIf: 'beacon-lighthouse' },
    { kind: 'gift', x: 23, y: 4, id: 'shore-gift', item: 'pep-berry' },
    { kind: 'gift', x: 33, y: 5, id: 'islet-gift', item: 'tide-charm' },
    { kind: 'gift', x: 6, y: 12, id: 'wren-shell', script: 'find-shell', showIf: 'sq-shell' },
    { kind: 'rock', x: 9, y: 12 }, { kind: 'rock', x: 14, y: 6 },
  ],
  warps: [
    { x: 31, y: 7, to: 'lighthouse', tx: 4, ty: 7, dir: 3 },
    { x: 32, y: 7, to: 'lighthouse', tx: 5, ty: 7, dir: 3 },
  ],
  edges: [
    { side: 'w', to: 'saltwhistle', offset: 0 },
    { side: 'e', to: 'deep-blue-cove', offset: 0 },
  ],
  npcs: [
    { id: 'agent-coral', name: 'Coral', x: 12, y: 11, dir: 3, look: townsLook('coral', { agent: true, hat: 'sunhat', hatColor: 0x3fd0c0 }), talk: 'trainer-agent-coral', trainer: 'agent-coral' },
    { id: 'shore-finch', name: 'Finch', x: 24, y: 9, dir: 2, look: townsLook('finch', { agent: true, hat: 'cap', hatColor: 0xffffff }), talk: 'shore-finch', hideIf: 'met-finch' },
    { id: 'club-pip', name: 'Pip', x: 19, y: 13, dir: 1, look: CAST.club!.look, talk: 'club-pip', hideIf: 'beacon-lighthouse' },
  ],
  triggers: [
    { x: 22, y: 10, w: 1, h: 1, script: 'shore-finch', when: '!met-finch' },
    { x: 35, y: 0, w: 1, h: 17, script: 'not-yet-cove', when: '!credits' },
  ],
  wild: ['sandy-shore'],
};

/** Inside the Lighthouse: the Trial door (the stairs) and the helper. */
export const lighthouseHall = trialHall({
  id: 'lighthouse', name: 'Lighthouse', trial: 'lighthouse', music: 'trial-1', intro: 'lighthouse-hall',
  out: [{ map: 'sandy-shore', x: 31, y: 8 }, { map: 'sandy-shore', x: 32, y: 8 }],
  helper: { id: 'lighthouse-helper', name: 'Finch', x: 0, y: 0, dir: 1, look: townsLook('finch', { agent: true, hat: 'cap', hatColor: 0xffffff }), talk: 'trainer-lighthouse-helper', trainer: 'lighthouse-helper' },
});

/** The top of the Lighthouse: Keeper Marisol and the Beacon. */
export const lighthouseTop = trialTop({
  id: 'lighthouse-top', name: 'Lighthouse top', beacon: 'beacon-lighthouse', out: { map: 'sandy-shore', x: 32, y: 8 },
  keeper: { id: 'keeper-marisol', name: CAST.marisol!.name, x: 0, y: 0, dir: 0, look: CAST.marisol!.look, talk: 'keeper-marisol', trainer: 'keeper-marisol' },
});
