/**
 * Chapters 9–10: Frost Pass (an ice wall a Flare friend melts, a cozy Rest cabin, Velour and the
 * club's grandest tower, and a frozen cave you slide through, the "pass" puzzle), the snowy town of
 * Frostfall, and the Frostfall Slopes, where a rushing stream needs a Frost friend to freeze a path
 * to the Summit Trial. East of Frostfall, Updraft Ridge opens after the Summit Beacon.
 */
import { CAST, townsLook } from '../cast';
import { P } from '../../art/palette';
import type { MapDef, MapObject } from '../../core/world/map';
import { homeMap, restStopMap, shopMap, trialHall, trialTop } from './interiors';

export const frostPass: MapDef = {
  id: 'frost-pass', name: 'Frost Pass', music: 'route-frost', theme: 6, outdoor: true, battleBg: 'snow',
  rows: [
    'NNNNNNNNNNNNNN::NNNNNNNNNNNNNN',
    'N*************::*************N',
    'N*****N*******::*******N*****N',
    'N*************::*************N',
    'N*************::::::*********N',
    'N****************************N',
    'N***N**********************N*N',
    'N****************************N',
    'N****************************N',
    '##############################',
    '#****************************#',
    '#*****************:::::::****#',
    '#***********************:****#',
    '#*************iiiii*****:****#',
    '#***********************:****#',
    '#*****:::::::::::::::::::****#',
    '#***********:****************#',
    '#***********:*************N**#',
    '#***********:****************#',
    '############I#################',
    'N***********:****************N',
    'N**N********:*******N********N',
    'N***********:****************N',
    'N***********:***N************N',
    'N***********:****************N',
    'N*******N***:****************N',
    'N***********:***********N****N',
    'N***********:****************N',
    'N***********:****************N',
    'NNNNNNNNNNNN::NNNNNNNNNNNNNNNN',
  ],
  objects: [
    { kind: 'house', x: 2, y: 14, w: 3, h: 3, id: 'cabin', house: { style: { roof: P.roofGreen, wall: P.wallWhite }, door: 1, kind: 'rest' } },
    { kind: 'cave', x: 20, y: 10, w: 2, h: 2, id: 'frozen-cave' },
    { kind: 'cave', x: 20, y: 3, w: 2, h: 2, id: 'frozen-cave-exit' },
    { kind: 'lure', x: 27, y: 13, id: 'lure-pass', goneIf: 'pass-tower-off' },
    { kind: 'sign', x: 11, y: 20, text: 'Frost Pass. An ice wall blocks the way. A Flare friend could melt it!' },
    { kind: 'sign', x: 17, y: 11, text: 'The frozen cave leads through the cliff. Slide carefully!' },
    { kind: 'gift', x: 1, y: 27, id: 'pass-gift', item: 'frost-mint' },
    { kind: 'gift', x: 27, y: 1, id: 'pass-gift-2', item: 'big-pep-berry' },
    { kind: 'gift', x: 25, y: 24, id: 'nia-mitten', script: 'find-mitten', showIf: 'sq-nia' },
  ],
  warps: [
    { x: 3, y: 14, to: 'rest-frostpass', tx: 4, ty: 6, dir: 3 },
    { x: 20, y: 10, to: 'trial:pass', tx: 0, ty: 0 },
    { x: 21, y: 10, to: 'trial:pass', tx: 0, ty: 0 },
    { x: 20, y: 3, to: 'frost-pass', tx: 20, ty: 11, dir: 0 },
    { x: 21, y: 3, to: 'frost-pass', tx: 21, ty: 11, dir: 0 },
  ],
  edges: [
    { side: 's', to: 'dunehollow', offset: 0 },
    { side: 'n', to: 'frostfall', offset: 0 },
  ],
  npcs: [
    { id: 'agent-kit', name: 'Kit', x: 8, y: 23, dir: 2, look: townsLook('kit', { agent: true, hat: 'beanie', hatColor: 0x8fb8ff, scarf: 0xffffff }), talk: 'trainer-agent-kit', trainer: 'agent-kit' },
    { id: 'club-velour', name: CAST.velour!.name, x: 26, y: 14, dir: 1, look: CAST.velour!.look, talk: 'club-velour', hideIf: 'velour-1' },
    { id: 'pass-hiker', name: 'Hiker Bo', x: 16, y: 6, dir: 0, look: townsLook('hiker-bo', { hat: 'beanie', hatColor: 0xd9604f, scarf: 0xffd84a }), talk: 'pass-hiker' },
  ],
  triggers: [
    { x: 12, y: 27, w: 2, h: 1, script: 'pass-arrive', when: '!pass-arrive' },
    { x: 24, y: 13, w: 1, h: 2, script: 'club-velour', when: '!velour-1' },
  ],
  wild: ['frost-pass'],
};

export const restFrostPass = restStopMap('rest-frostpass', 'Frost Pass cabin', { map: 'frost-pass', x: 3, y: 15 });

export const frostfall: MapDef = {
  id: 'frostfall', name: 'Frostfall', music: 'town-frostfall', theme: 6, outdoor: true, battleBg: 'snow',
  rows: [
    'NNNNNNNNNNNN::NNNNNNNNNNNNNN',
    'N***********::*************N',
    'N***********::*************N',
    'N***********::*************N',
    'N***********::*************N',
    'N***********::*************N',
    'N::::::::::::::::::::::::::N',
    'N*****:**************:*****N',
    'N*****:**************:*****N',
    'N*****:**=======*****:******',
    'N::::::**=======*****:::::::',
    'N*****:**=======*****:******',
    'N*****:**************:*****N',
    'N*****:**************:*****N',
    'N::::::::::::::::::::::::::N',
    'N*************::***********N',
    'N*************::***********N',
    'N*************::***********N',
    'N*************::***********N',
    'N*************::***********N',
    'N*************::***********N',
    'NNNNNNNNNNNNNN::NNNNNNNNNNNN',
  ],
  objects: [
    { kind: 'house', x: 2, y: 5, w: 3, h: 3, id: 'rest', house: { style: { roof: P.roofGreen, wall: P.wallWhite }, door: 1, kind: 'rest' } },
    { kind: 'house', x: 8, y: 5, w: 3, h: 3, id: 'shop', house: { style: { roof: P.roofSun, wall: P.wallCream }, door: 1, kind: 'shop' } },
    { kind: 'house', x: 16, y: 5, w: 4, h: 3, id: 'home-a', house: { style: { roof: P.roofBlue, wall: P.wallWhite }, door: 1, kind: 'home' } },
    { kind: 'house', x: 17, y: 18, w: 4, h: 3, id: 'home-b', house: { style: { roof: P.roofRed, wall: P.wallCream }, door: 1, kind: 'home' } },
    { kind: 'sign', x: 11, y: 13, text: 'Frostfall, the town in the snow. North: the Summit Trial. East: Updraft Ridge.' },
    { kind: 'lamp', x: 8, y: 9 }, { kind: 'lamp', x: 16, y: 9 }, { kind: 'lamp', x: 8, y: 11 }, { kind: 'lamp', x: 16, y: 11 },
    { kind: 'gift', x: 3, y: 19, id: 'frostfall-gift', item: 'frost-mint' },
  ],
  warps: [
    { x: 3, y: 5, to: 'rest-frostfall', tx: 4, ty: 6, dir: 3 },
    { x: 9, y: 5, to: 'shop-frostfall', tx: 4, ty: 6, dir: 3 },
    { x: 17, y: 5, to: 'frost-home', tx: 4, ty: 6, dir: 3 },
    { x: 18, y: 18, to: 'frost-home', tx: 4, ty: 6, needs: 'never', lockedText: 'The door is frozen shut. Brr! Someone inside waves through the window.' },
  ],
  edges: [
    { side: 's', to: 'frost-pass', offset: 0 },
    { side: 'n', to: 'frostfall-slopes', offset: 0 },
    { side: 'e', to: 'updraft-ridge', offset: 4 },
  ],
  npcs: [
    { id: 'ff-sledder', name: 'Nia', x: 24, y: 17, dir: 1, look: townsLook('nia', { kid: true, hat: 'beanie', hatColor: 0xff7ac0 }), talk: 'ff-nia', wander: 2 },
    { id: 'ff-elder', name: 'Grandma Ilse', x: 4, y: 12, dir: 2, look: townsLook('ilse', { elder: true, scarf: 0x8fb8ff }), talk: 'ff-ilse' },
    { id: 'ff-agent', name: 'Agent Rook', x: 19, y: 12, dir: 1, look: townsLook('rook', { agent: true, hat: 'beanie', hatColor: 0x4f7fd9 }), talk: 'ff-rook' },
  ],
  triggers: [
    { x: 14, y: 20, w: 2, h: 1, script: 'ff-arrive', when: '!ff-arrive' },
    { x: 26, y: 9, w: 1, h: 3, script: 'not-yet-ridge', when: '!beacon-summit' },
  ],
  wild: [],
};

export const restFrostfall = restStopMap('rest-frostfall', 'Frostfall Rest Stop', { map: 'frostfall', x: 3, y: 6 });
export const shopFrostfall = shopMap('shop-frostfall', 'Frostfall Shop', 'shop-frostfall', { map: 'frostfall', x: 9, y: 6 });
export const frostHome = homeMap('frost-home', 'Snowy cottage', { map: 'frostfall', x: 17, y: 6 }, [
  { id: 'ff-knitter', name: 'Mr. Purl', x: 1, y: 4, dir: 2, look: townsLook('purl', { elder: true, scarf: 0xff7ac0 }), talk: 'ff-purl' },
  { id: 'ff-scarfcub', name: 'Scarfcub', x: 6, y: 5, dir: 0, look: CAST.agent!.look, creature: 'scarfcub', talk: 'ff-pet' },
]);

/** The rushing stream: every tile needs a Frost friend to freeze it into an ice step. */
const rapids: MapObject[] = Array.from({ length: 26 }, (_, i) => ({ kind: 'water-gap', x: i + 1, y: 12, id: `rapids-${i + 1}` }));

export const frostfallSlopes: MapDef = {
  id: 'frostfall-slopes', name: 'Frostfall Slopes', music: 'route-frost', theme: 6, outdoor: true, battleBg: 'snow',
  rows: [
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNN',
    'N**************************N',
    'N**************************N',
    'N***********::*************N',
    'N***N*******::*************N',
    'N***********::********N****N',
    'N***********::*************N',
    'N***********::*************N',
    'N***********::*************N',
    'N**N********::**********N**N',
    'N***********::*************N',
    'N***********::*************N',
    'NiiiiiiiiiiiiiiiiiiiiiiiiiiN',
    'N***********::*************N',
    'N***********::*************N',
    'N**iii******::*************N',
    'N****N******::*************N',
    'N***********::*******N*****N',
    'N***********::*************N',
    'N***********::*************N',
    'N***********::***********N*N',
    'N*******N***::*************N',
    'N***********::*****N*******N',
    'N***********::*************N',
    'N***********::*************N',
    'NNNNNNNNNNNN::NNNNNNNNNNNNNN',
  ],
  objects: [
    ...rapids,
    { kind: 'cave', x: 12, y: 2, w: 2, h: 2, id: 'summit-door' },
    { kind: 'sign', x: 11, y: 14, text: 'The stream rushes too fast to paddle. A Frost friend could freeze a path!' },
    { kind: 'sign', x: 11, y: 4, text: 'The Summit Trial. Keeper Yuki waits at the very top.' },
    { kind: 'gift', x: 25, y: 2, id: 'slopes-gift', item: 'rainbow-berry' },
    { kind: 'rock', x: 23, y: 2, id: 'snowdrift', script: 'frostmantle-peak', showIf: 'credits & !frostmantle-friend' },
  ],
  warps: [
    { x: 12, y: 2, to: 'summit-gate', tx: 4, ty: 7, dir: 3 },
    { x: 13, y: 2, to: 'summit-gate', tx: 5, ty: 7, dir: 3 },
  ],
  edges: [{ side: 's', to: 'frostfall', offset: 0 }],
  npcs: [
    { id: 'agent-yan', name: 'Yan', x: 16, y: 18, dir: 1, look: townsLook('yan', { agent: true, scarf: 0xffffff }), talk: 'trainer-agent-yan', trainer: 'agent-yan' },
    { id: 'slopes-fisher', name: 'Mr. Floe', x: 9, y: 13, dir: 3, look: townsLook('floe', { elder: true, hat: 'beanie', hatColor: 0x4f7fd9 }), talk: 'slopes-floe' },
  ],
  triggers: [],
  wild: ['frostfall-slopes'],
};

export const summitGate = trialHall({
  id: 'summit-gate', name: 'Summit hall', trial: 'summit', music: 'trial-5', intro: 'summit-hall',
  out: [{ map: 'frostfall-slopes', x: 12, y: 3 }, { map: 'frostfall-slopes', x: 13, y: 3 }],
  helper: { id: 'summit-helper', name: 'Pell', x: 0, y: 0, dir: 1, look: townsLook('pell-helper', { agent: true, hat: 'beanie', hatColor: 0xffffff }), talk: 'trainer-summit-helper', trainer: 'summit-helper' },
});

export const summitTop = trialTop({
  id: 'summit-top', name: 'The Summit', beacon: 'beacon-summit', out: { map: 'frostfall-slopes', x: 13, y: 3 },
  keeper: { id: 'keeper-yuki', name: CAST.yuki!.name, x: 0, y: 0, dir: 0, look: CAST.yuki!.look, talk: 'keeper-yuki', trainer: 'keeper-yuki' },
});
