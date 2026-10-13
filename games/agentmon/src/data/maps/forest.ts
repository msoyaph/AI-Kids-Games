/**
 * Chapters 3–4: the Cliff Road (vines a Leaf friend snips, a river bridge, a boulder nook), the
 * forest town of Mossgrove, and Mossgrove Woods with the Canopy Trial in a hollow giant tree.
 * North of Mossgrove, Whisper Woods opens after the Canopy Beacon.
 */
import { CAST, townsLook } from '../cast';
import { P } from '../../art/palette';
import type { MapDef } from '../../core/world/map';
import { homeMap, restStopMap, shopMap, trialHall, trialTop } from './interiors';

export const cliffRoad: MapDef = {
  id: 'cliff-road', name: 'Cliff Road', music: 'route-cliff', theme: 7, outdoor: true, battleBg: 'mountain',
  rows: [
    '############::############',
    '#PPP........::........PPP#',
    '#P...,,,,...::...,,,,....#',
    '#....,,,,...::...,,,,,...#',
    '#...........::...........#',
    '#######.....::.....#######',
    '############V#############',
    '#.....,,,,..:.....,,,,...#',
    '#....,,,,,,.:....,,,,,,..#',
    '#.....,,,,..:.....,,,,...#',
    '#...........:............#',
    '#..::::::::::...........R#',
    '#..:..................RR.#',
    '#..:...,,,,,.............#',
    '#~~bb~~~~~~~~~~~~~~~~~~~~#',
    '#~~bb~~~~~~~~~~~~~~~~~~~~#',
    '#..:::::::::::::::.......#',
    '#.......,,,,,...:...,,,..#',
    '#......,,,,,,,..:..,,,,,.#',
    '#RRR....,,,,,...:...,,,..#',
    '#..R............:........#',
    '#..O............:........#',
    '#RRR............::::::::::',
    '#.........,,,,...........#',
    '#........,,,,,,..........#',
    '##########################',
  ],
  objects: [
    { kind: 'sign', x: 17, y: 21, text: 'Cliff Road. North: Mossgrove, the forest town. East: Saltwhistle.' },
    { kind: 'sign', x: 11, y: 7, text: 'Thick vines grow here. Ask a Leaf friend to snip them!' },
    { kind: 'gift', x: 1, y: 20, id: 'nook-gift', item: 'big-pep-berry' },
    { kind: 'gift', x: 24, y: 2, id: 'top-gift', item: 'crunch-seed' },
  ],
  warps: [],
  edges: [
    { side: 'e', to: 'saltwhistle', offset: -12 },
    { side: 'n', to: 'mossgrove', offset: 2 },
  ],
  npcs: [
    { id: 'agent-rafi', name: 'Rafi', x: 18, y: 17, dir: 1, look: townsLook('rafi', { agent: true }), talk: 'trainer-agent-rafi', trainer: 'agent-rafi' },
    { id: 'agent-lou', name: 'Lou', x: 6, y: 12, dir: 2, look: townsLook('lou', { agent: true, hat: 'beanie', hatColor: 0x4fa66a }), talk: 'trainer-agent-lou', trainer: 'agent-lou' },
    { id: 'juno-cliff', name: CAST.juno!.name, x: 13, y: 8, dir: 1, look: CAST.juno!.look, talk: 'juno-cliff', hideIf: 'juno-2' },
    { id: 'cliff-hiker', name: 'Mr. Pell', x: 20, y: 4, dir: 0, look: townsLook('pell-hiker', { elder: true, hat: 'sunhat', hatColor: 0x4fa66a }), talk: 'cliff-pell' },
  ],
  triggers: [{ x: 12, y: 9, w: 1, h: 1, script: 'juno-cliff', when: '!juno-2' }],
  wild: ['cliff-road'],
};

export const mossgrove: MapDef = {
  id: 'mossgrove', name: 'Mossgrove', music: 'town-mossgrove', theme: 1, outdoor: true, battleBg: 'forest',
  rows: [
    'PPPPPPPPPPPPPP::PPPPPPPPPPPPPP',
    'P.AA.........::..P......AA...P',
    'P............::......A.......P',
    'P......P.....::..............P',
    'P............::..............P',
    'P............::..............P',
    'P::::::::::::::::::::::::::::P',
    'P.....:.......::.......:...A.P',
    'P.P...:.......::.......:.P...P',
    'P...A.:...=========....:......',
    'P.....:...=========....:......',
    'P.....::::=========::::::::::P',
    'P.........=========."".......P',
    'P.A.......=========.......P..P',
    'P............::..............P',
    'P..""........::........""....P',
    'P..""........::........""....P',
    'P::::::::::::::::::::::::::..P',
    'P.....:.P.........:.....A....P',
    'P.....:...........:..........P',
    'P.."".....A.E....P....E......P',
    'P.A......................"...P',
    'P............::.........A....P',
    'PPPPPPPPPPPPPP::PPPPPPPPPPPPPP',
  ],
  objects: [
    { kind: 'house', x: 3, y: 5, w: 3, h: 3, id: 'rest', house: { style: { roof: P.roofGreen, wall: P.wallWhite }, door: 1, kind: 'rest' } },
    { kind: 'house', x: 8, y: 5, w: 3, h: 3, id: 'home-a', house: { style: { roof: P.roofRed, wall: P.wallCream }, door: 1, kind: 'home' } },
    { kind: 'house', x: 17, y: 5, w: 3, h: 3, id: 'shop', house: { style: { roof: P.roofSun, wall: P.wallCream }, door: 1, kind: 'shop' } },
    { kind: 'house', x: 22, y: 5, w: 4, h: 3, id: 'home-b', house: { style: { roof: P.roofTeal, wall: P.wallPeach }, door: 1, kind: 'home' } },
    { kind: 'house', x: 4, y: 16, w: 3, h: 3, id: 'home-c', house: { style: { roof: P.roofBlue, wall: P.wallWhite }, door: 1, kind: 'home' } },
    { kind: 'sign', x: 12, y: 14, text: 'Mossgrove, the forest town. East: Mossgrove Woods and the Canopy Trial. North: Whisper Woods.' },
    { kind: 'lamp', x: 9, y: 9 }, { kind: 'lamp', x: 19, y: 9 }, { kind: 'lamp', x: 9, y: 13 }, { kind: 'lamp', x: 19, y: 13 },
    { kind: 'pot', x: 12, y: 12 }, { kind: 'pot', x: 16, y: 12 },
    { kind: 'gift', x: 27, y: 20, id: 'moss-gift', item: 'sun-pepper' },
  ],
  warps: [
    { x: 4, y: 5, to: 'rest-mossgrove', tx: 4, ty: 6, dir: 3 },
    { x: 9, y: 5, to: 'moss-home', tx: 4, ty: 6, dir: 3 },
    { x: 18, y: 5, to: 'shop-mossgrove', tx: 4, ty: 6, dir: 3 },
    { x: 23, y: 5, to: 'moss-home', tx: 4, ty: 6, needs: 'never', lockedText: 'A sign on the door: "Out gathering acorns. Back soon!"' },
    { x: 5, y: 16, to: 'moss-home', tx: 4, ty: 6, needs: 'never', lockedText: 'It is locked. You hear soft snoring inside.' },
  ],
  edges: [
    { side: 's', to: 'cliff-road', offset: -2 },
    { side: 'e', to: 'mossgrove-woods', offset: 0 },
    { side: 'n', to: 'whisper-woods', offset: 0 },
  ],
  npcs: [
    { id: 'moss-elder', name: 'Elder Fen', x: 15, y: 15, dir: 0, look: townsLook('fen', { elder: true, scarf: 0x9ed97a }), talk: 'moss-fen' },
    { id: 'moss-kid', name: 'Pippa', x: 21, y: 19, dir: 1, look: townsLook('pippa', { kid: true }), talk: 'moss-pippa', wander: 2 },
    { id: 'moss-carver', name: 'Mr. Oak', x: 26, y: 12, dir: 1, look: townsLook('oak', { hat: 'beanie', hatColor: 0x8a5a2a }), talk: 'moss-oak' },
    { id: 'moss-agent', name: 'Agent Sky', x: 2, y: 12, dir: 2, look: townsLook('sky', { agent: true }), talk: 'moss-sky' },
  ],
  triggers: [
    { x: 14, y: 22, w: 2, h: 1, script: 'moss-arrive', when: '!moss-arrive' },
    { x: 14, y: 0, w: 2, h: 1, script: 'not-yet-whisper', when: '!beacon-canopy' },
  ],
  wild: [],
};

export const restMossgrove = restStopMap('rest-mossgrove', 'Mossgrove Rest Stop', { map: 'mossgrove', x: 4, y: 6 });
export const shopMossgrove = shopMap('shop-mossgrove', 'Mossgrove Shop', 'shop-mossgrove', { map: 'mossgrove', x: 18, y: 6 });
export const mossHome = homeMap('moss-home', 'Treehouse home', { map: 'mossgrove', x: 9, y: 6 }, [
  { id: 'moss-baker', name: 'Mrs. Bun', x: 1, y: 4, dir: 2, look: townsLook('bun', { apron: 0xfff0d8 }), talk: 'moss-bun' },
  { id: 'moss-kernip', name: 'Kernip', x: 6, y: 5, dir: 0, look: CAST.agent!.look, creature: 'kernip', talk: 'moss-pet' },
]);

export const mossgroveWoods: MapDef = {
  id: 'mossgrove-woods', name: 'Mossgrove Woods', music: 'route-woods', theme: 1, outdoor: true, battleBg: 'forest',
  rows: [
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPP',
    'P..,,,,,......PPPP.....,,,.P',
    'P.,,,,,,,.....PPPP....,,,,,P',
    'P..,,,,,...........,,,,,,..P',
    'P..........::::::..........P',
    'P...,,,,...:....:...,,,,...P',
    'P..,,,,,,..:....:..,,,,,,..P',
    'P...,,,,...:....:...,,,,...P',
    'P..........:....:..........P',
    '::::::::::::....:::::::::..P',
    '............,,,,...........P',
    'P...,,,,,..,,,,,,..,,,,,...P',
    'P..,,,,,,,..,,,,..,,,,,,,..P',
    'P...,,,,,.........,,,,,....P',
    'P..........................P',
    'P.E....,,,,,......,,,,..E..P',
    'P.....,,,,,,,....,,,,,,....P',
    'P......,,,,,......,,,,.....P',
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPP',
  ],
  objects: [
    { kind: 'cave', x: 14, y: 3, w: 2, h: 2, id: 'canopy-hollow' },
    { kind: 'sign', x: 10, y: 4, text: 'The Canopy Trial is inside the great hollow tree. Keeper Oren waits at the top.' },
    { kind: 'gift', x: 26, y: 13, id: 'woods-gift', item: 'moon-melon' },
  ],
  warps: [
    { x: 14, y: 3, to: 'canopy-gate', tx: 4, ty: 7, dir: 3 },
    { x: 15, y: 3, to: 'canopy-gate', tx: 5, ty: 7, dir: 3 },
  ],
  edges: [{ side: 'w', to: 'mossgrove', offset: 0 }],
  npcs: [
    { id: 'agent-ivo', name: 'Ivo', x: 20, y: 9, dir: 1, look: townsLook('ivo', { agent: true, hat: 'cap', hatColor: 0x9a5fb8 }), talk: 'trainer-agent-ivo', trainer: 'agent-ivo' },
    { id: 'woods-ranger', name: 'Ranger Moss', x: 7, y: 8, dir: 2, look: townsLook('ranger', { hat: 'sunhat', hatColor: 0x4fa66a }), talk: 'woods-ranger' },
  ],
  triggers: [],
  wild: ['mossgrove-woods'],
};

export const canopyGate = trialHall({
  id: 'canopy-gate', name: 'Hollow tree', trial: 'canopy', music: 'trial-2', intro: 'canopy-hall',
  out: [{ map: 'mossgrove-woods', x: 14, y: 4 }, { map: 'mossgrove-woods', x: 15, y: 4 }],
  helper: { id: 'canopy-helper', name: 'Tilly', x: 0, y: 0, dir: 1, look: townsLook('tilly', { agent: true, scarf: 0x9ed97a }), talk: 'trainer-canopy-helper', trainer: 'canopy-helper' },
});

export const canopyTop = trialTop({
  id: 'canopy-top', name: 'Canopy top', beacon: 'beacon-canopy', out: { map: 'mossgrove-woods', x: 15, y: 4 },
  keeper: { id: 'keeper-oren', name: CAST.oren!.name, x: 0, y: 0, dir: 0, look: CAST.oren!.look, talk: 'keeper-oren', trainer: 'keeper-oren' },
});
