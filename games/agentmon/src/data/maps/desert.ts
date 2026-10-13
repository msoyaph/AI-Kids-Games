/**
 * Chapters 7–8: the Canyon Trail (red rock and sand, Juno's third spar), the desert town of
 * Dunehollow, and the Dune Flats with the Spotlight Club's tower and the Redrock Trial in a mesa.
 * North of Dunehollow, Frost Pass opens after the Redrock Beacon. The great sandstone arch on the
 * Dune Flats is where a guardian appears after the story.
 */
import { CAST, townsLook } from '../cast';
import { P } from '../../art/palette';
import type { MapDef } from '../../core/world/map';
import { homeMap, restStopMap, shopMap, trialHall, trialTop } from './interiors';

export const canyonTrail: MapDef = {
  id: 'canyon-trail', name: 'Canyon Trail', music: 'route-canyon', theme: 5, outdoor: true, battleBg: 'desert',
  rows: [
    '################################',
    '#ssssRsssssss####sssssssssRssss#',
    '#ssssssssssss####ssssssssssssss#',
    '#sss::::::::s####s::::::::::sss#',
    '#sss:ssssss:ssssss:ssssssss:sss#',
    '#sss:ssssss::::::::ssssssss:sss#',
    '#sss:sssssssssssssssssRssss:sss#',
    '#sss:ssss######ssssssssssss:sss#',
    '#sss:ssss######sssss########sss#',
    'sssss:sss######sssss########::::',
    ':::::::ssssssssssssssssssssss:::',
    'ssssssssssssRsssssssssssssssssss',
    '#sssssssssssssss####sssssssssss#',
    '#ssss::::::::::s####ssssRssssss#',
    '#ssss:ssssssss:ssssssssssssssss#',
    '#ssss:ssssssss::::::::::::sssss#',
    '#ssss:sssssssssssssssssss:sssss#',
    '#Rsss:sssssssssssssssssss:ssssR#',
    '#ssss:::::::::::::::::::::sssss#',
    '#ssssssssssssssssssssssssssssss#',
    '#ssssssRsssssssssssssRsssssssss#',
    '################################',
  ],
  objects: [
    { kind: 'sign', x: 28, y: 12, text: 'Canyon Trail. West: Dunehollow, the desert town. East: Cragtop.' },
    { kind: 'gift', x: 2, y: 1, id: 'canyon-gift', item: 'sun-pepper' },
    { kind: 'gift', x: 29, y: 19, id: 'canyon-gift-2', item: 'big-pep-berry' },
  ],
  warps: [],
  edges: [
    { side: 'e', to: 'cragtop', offset: 0 },
    { side: 'w', to: 'dunehollow', offset: 0 },
  ],
  npcs: [
    { id: 'agent-noa', name: 'Noa', x: 12, y: 5, dir: 0, look: townsLook('noa', { agent: true, hat: 'sunhat', hatColor: 0xf5c830 }), talk: 'trainer-agent-noa', trainer: 'agent-noa' },
    { id: 'juno-canyon', name: CAST.juno!.name, x: 16, y: 11, dir: 2, look: CAST.juno!.look, talk: 'juno-canyon', hideIf: 'juno-3' },
    { id: 'canyon-geo', name: 'Dr. Ochre', x: 6, y: 16, dir: 0, look: townsLook('ochre', { glasses: true, hat: 'sunhat', hatColor: 0xd9604f }), talk: 'canyon-ochre' },
  ],
  triggers: [{ x: 15, y: 10, w: 1, h: 2, script: 'juno-canyon', when: '!juno-3' }],
  wild: ['canyon-trail'],
};

export const dunehollow: MapDef = {
  id: 'dunehollow', name: 'Dunehollow', music: 'town-dunehollow', theme: 5, outdoor: true, battleBg: 'desert',
  rows: [
    'YYYYYYYYYYYY::YYYYYYYYYYYYYY',
    'Ysssssssssss::sssssssssssssY',
    'Ysssssssssss::sssssssssssssY',
    'Ysssssssssss::sssssssssssssY',
    'Ysssssssssss::sssssssssssssY',
    'Ysssssssssss::sssssssssssssY',
    'Y::::::::::::::::::::::::::Y',
    'Yssssss:sssss::ssssss:sssssY',
    'YsYssss:ss=========ss:sssYsY',
    'Yssssss:ss=========ss:ssssss',
    'Y:::::::::=========::::::::s',
    'Ysssssssss=========sssssssss',
    'YsYsssssss=========ssssssYsY',
    'Yssssssssssss::ssssssssssssY',
    'Y:::::::::::::::::::::::::sY',
    'Ysssss:sssssssssssss:ssssssY',
    'Ysssss:ssYssssssssYs:ssssssY',
    'YssYss:sssssssssssss:sssYssY',
    'Ysssss:sssssssssssss:ssssssY',
    'YsssYs:sssssssssssss:ssYsssY',
    'Ysssssssssssss::sssssssssssY',
    'YYYYYYYYYYYYYY::YYYYYYYYYYYY',
  ],
  objects: [
    { kind: 'house', x: 2, y: 5, w: 3, h: 3, id: 'rest', house: { style: { roof: P.roofGreen, wall: P.wallCream }, door: 1, kind: 'rest' } },
    { kind: 'house', x: 7, y: 5, w: 3, h: 3, id: 'shop', house: { style: { roof: P.roofSun, wall: P.wallPeach }, door: 1, kind: 'shop' } },
    { kind: 'house', x: 16, y: 5, w: 4, h: 3, id: 'home-a', house: { style: { roof: P.roofRed, wall: P.wallCream }, door: 2, kind: 'home' } },
    { kind: 'house', x: 22, y: 5, w: 3, h: 3, id: 'home-b', house: { style: { roof: P.roofTeal, wall: P.wallWhite }, door: 1, kind: 'home' } },
    { kind: 'sign', x: 12, y: 13, text: 'Dunehollow, the desert town. South: the Dune Flats and the Redrock Trial. North: Frost Pass.' },
    { kind: 'lamp', x: 9, y: 8 }, { kind: 'lamp', x: 19, y: 8 }, { kind: 'lamp', x: 9, y: 12 }, { kind: 'lamp', x: 19, y: 12 },
    { kind: 'pot', x: 12, y: 11 }, { kind: 'pot', x: 16, y: 11 },
    { kind: 'gift', x: 25, y: 19, id: 'dune-gift', item: 'honey-drop' },
  ],
  warps: [
    { x: 3, y: 5, to: 'rest-dunehollow', tx: 4, ty: 6, dir: 3 },
    { x: 8, y: 5, to: 'shop-dunehollow', tx: 4, ty: 6, dir: 3 },
    { x: 18, y: 5, to: 'dune-home', tx: 4, ty: 6, dir: 3 },
    { x: 23, y: 5, to: 'dune-home', tx: 4, ty: 6, needs: 'never', lockedText: 'Shh. A sign says: "Afternoon nap. Too hot!"' },
  ],
  edges: [
    { side: 'e', to: 'canyon-trail', offset: 0 },
    { side: 's', to: 'dune-flats', offset: 0 },
    { side: 'n', to: 'frost-pass', offset: 0 },
  ],
  npcs: [
    { id: 'dune-trader', name: 'Mx. Saffi', x: 5, y: 12, dir: 2, look: townsLook('saffi', { hat: 'sunhat', hatColor: 0xffd84a }), talk: 'dune-saffi' },
    { id: 'dune-kid', name: 'Ollie', x: 22, y: 12, dir: 1, look: townsLook('ollie', { kid: true }), talk: 'dune-ollie', wander: 2 },
    { id: 'dune-elder', name: 'Old Amar', x: 15, y: 17, dir: 0, look: townsLook('amar', { elder: true, scarf: 0xffd2a0 }), talk: 'dune-amar' },
    { id: 'velour-dune', name: CAST.velour!.name, x: 13, y: 3, dir: 0, look: CAST.velour!.look, talk: 'velour-dune', showIf: 'beacon-sunstone & !velour-dune' },
  ],
  triggers: [
    { x: 26, y: 10, w: 1, h: 1, script: 'dune-arrive', when: '!dune-arrive' },
    { x: 12, y: 1, w: 2, h: 1, script: 'not-yet-frost', when: '!beacon-sunstone' },
  ],
  wild: [],
};

export const restDunehollow = restStopMap('rest-dunehollow', 'Dunehollow Rest Stop', { map: 'dunehollow', x: 3, y: 6 });
export const shopDunehollow = shopMap('shop-dunehollow', 'Dunehollow Shop', 'shop-dunehollow', { map: 'dunehollow', x: 8, y: 6 });
export const duneHome = homeMap('dune-home', 'Adobe home', { map: 'dunehollow', x: 18, y: 6 }, [
  { id: 'dune-auntie', name: 'Auntie Zara', x: 1, y: 4, dir: 2, look: townsLook('zara', { apron: 0xffd2a0 }), talk: 'dune-zara' },
  { id: 'dune-bathlet', name: 'Bathlet', x: 6, y: 5, dir: 0, look: CAST.agent!.look, creature: 'bathlet', talk: 'dune-pet' },
]);

export const duneFlats: MapDef = {
  id: 'dune-flats', name: 'Dune Flats', music: 'route-desert', theme: 5, outdoor: true, battleBg: 'desert',
  rows: [
    'YYYYYYYYYYYYYY::YYYYYYYYYYYYYY',
    'Ysssssssssssss::sssssssssssssY',
    'YsssYsssssssss::ssssssssYssssY',
    'Ysssssssssssss::sssssssssssssY',
    'Ysssssssssssss::sssssssssssssY',
    'Ysssssssssssss::sssssssssssssY',
    'Ysss::::::::::::::::::::::sssY',
    'Ysss:ssssssssssssssssssss:sssY',
    'Ysss:sssss####sssssssssss:sssY',
    'Ysss:sssss####sssssssssss:sssY',
    'Ysss:sssss####sssssssssss:sssY',
    'Ysss:ssssssssssssssssssss:sssY',
    'Ysss::::::::::::::::::::::sssY',
    'Yssssssssssssssssssssssss:sssY',
    'Yssssssssssssssssss######:sssY',
    'Yssssssssssssssssss######:sssY',
    'YsssYssssssssssssss######:sssY',
    'Yssssssssssssssssss##ss##:sssY',
    'Ysssssssssssssssssss::::::sssY',
    'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  ],
  objects: [
    { kind: 'cave', x: 21, y: 17, w: 2, h: 2, id: 'sunstone-mesa' },
    { kind: 'lure', x: 11, y: 3, id: 'lure-dunes', goneIf: 'dunes-tower-off' },
    { kind: 'sign', x: 5, y: 5, text: 'Dune Flats. The Redrock Trial is inside the big red mesa to the south-east.' },
    { kind: 'gift', x: 2, y: 17, id: 'flats-gift', item: 'flare-charm' },
    { kind: 'rock', x: 9, y: 9, id: 'arch-stone', script: 'archwyn-arch', showIf: 'credits & !archwyn-friend' },
  ],
  warps: [
    { x: 21, y: 17, to: 'sunstone-gate', tx: 4, ty: 7, dir: 3 },
    { x: 22, y: 17, to: 'sunstone-gate', tx: 5, ty: 7, dir: 3 },
  ],
  edges: [{ side: 'n', to: 'dunehollow', offset: 0 }],
  npcs: [
    { id: 'club-mabel', name: 'Mabel', x: 12, y: 4, dir: 2, look: { ...CAST.club!.look, skin: 4, hair: 6 }, talk: 'club-mabel' },
    { id: 'flats-guide', name: 'Guide Rami', x: 3, y: 12, dir: 2, look: townsLook('rami', { hat: 'sunhat', hatColor: 0xd9604f }), talk: 'flats-rami' },
  ],
  triggers: [{ x: 14, y: 4, w: 2, h: 1, script: 'club-mabel', when: '!mabel-met' }],
  wild: ['dune-flats'],
};

export const sunstoneGate = trialHall({
  id: 'sunstone-gate', name: 'Redrock Mesa', trial: 'canyon', music: 'trial-4', intro: 'sunstone-hall',
  out: [{ map: 'dune-flats', x: 21, y: 18 }, { map: 'dune-flats', x: 22, y: 18 }],
  helper: { id: 'sunstone-helper', name: 'Rio', x: 0, y: 0, dir: 1, look: townsLook('rio-helper', { agent: true, hat: 'sunhat', hatColor: 0xffd84a }), talk: 'trainer-sunstone-helper', trainer: 'sunstone-helper' },
});

export const sunstoneTop = trialTop({
  id: 'sunstone-top', name: 'Redrock summit', beacon: 'beacon-sunstone', out: { map: 'dune-flats', x: 22, y: 18 },
  keeper: { id: 'keeper-sol', name: CAST.sol!.name, x: 0, y: 0, dir: 0, look: CAST.sol!.look, talk: 'keeper-sol', trainer: 'keeper-sol' },
});
