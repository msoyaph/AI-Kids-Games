/**
 * Chapters 11–13: Updraft Ridge (a camp Rest Stop, the cloud-step ruins puzzle, Velour's sky tower
 * and the great updraft a Gust friend rides), the Sky Island with the Beacon Spire, and the Spire's
 * Trial. The finale happens at the top of the Spire.
 */
import { CAST, townsLook } from '../cast';
import { P } from '../../art/palette';
import type { MapDef } from '../../core/world/map';
import { restStopMap, trialHall, trialTop } from './interiors';

export const updraftRidge: MapDef = {
  id: 'updraft-ridge', name: 'Updraft Ridge', music: 'route-sky', theme: 7, outdoor: true, battleBg: 'sky',
  rows: [
    '##############################',
    '#............................#',
    '#.kkkkk...................R..#',
    '#.kkkkk......................#',
    '#........::::::::::::........#',
    '#........:..........:........#',
    '#........::::::::::::.kkkkkk.#',
    '#...R.................kkkkkk.#',
    '#............R........kkkkkk.#',
    '#............................#',
    '##############################',
    '#.R..........................#',
    '#.............R...::::.......#',
    '.....................:..kkkk.#',
    '::::::::.............:..kkkk.#',
    '.......:.............:..kkkk.#',
    '#......:...kkkkkkk...:..kkkk.#',
    '#.R....:...kkkkkkk...:.......#',
    '#......:...kkkkkkk...:.......#',
    '#......:.............:.....R.#',
    '#......:::::::::::::::.......#',
    '#............................#',
    '#..kkkkkk.......R.....kkkkkk.#',
    '#..kkkkkk.............kkkkkk.#',
    '#..kkkkkk.R...........kkkkkk.#',
    '#..kkkkkk.............kkkkkk.#',
    '#............................#',
    '##############################',
  ],
  objects: [
    { kind: 'house', x: 15, y: 3, w: 3, h: 3, id: 'camp', house: { style: { roof: P.roofGreen, wall: P.wallWhite }, door: 1, kind: 'rest' } },
    { kind: 'cave', x: 18, y: 11, w: 2, h: 2, id: 'ruins' },
    { kind: 'cave', x: 20, y: 3, w: 2, h: 2, id: 'ruins-exit' },
    { kind: 'updraft', x: 3, y: 5, id: 'updraft-up', script: 'ride-up' },
    { kind: 'lure', x: 5, y: 7, id: 'lure-ridge', goneIf: 'towers-off' },
    { kind: 'sign', x: 3, y: 14, text: 'Updraft Ridge. The old ruins lead up the cliff. At the top, a great updraft rises to the Sky Island.' },
    { kind: 'sign', x: 4, y: 3, text: 'The great updraft! A Gust friend can ride it up to the Sky Island.' },
    { kind: 'gift', x: 27, y: 25, id: 'ridge-gift', item: 'gust-charm' },
  ],
  warps: [
    { x: 16, y: 3, to: 'rest-ridge', tx: 4, ty: 6, dir: 3 },
    { x: 18, y: 11, to: 'trial:ridge', tx: 0, ty: 0 },
    { x: 19, y: 11, to: 'trial:ridge', tx: 0, ty: 0 },
    { x: 20, y: 3, to: 'updraft-ridge', tx: 18, ty: 12, dir: 0 },
    { x: 21, y: 3, to: 'updraft-ridge', tx: 19, ty: 12, dir: 0 },
  ],
  edges: [{ side: 'w', to: 'frostfall', offset: -4 }],
  npcs: [
    { id: 'juno-ridge', name: CAST.juno!.name, x: 9, y: 15, dir: 1, look: CAST.juno!.look, talk: 'juno-ridge', hideIf: 'juno-4' },
    { id: 'velour-ridge', name: CAST.velour!.name, x: 6, y: 6, dir: 2, look: CAST.velour!.look, talk: 'club-velour-2', hideIf: 'velour-2' },
    { id: 'ridge-kite', name: 'Kite flyer Ana', x: 25, y: 20, dir: 1, look: townsLook('ana', { hat: 'cap', hatColor: 0x3fd0c0 }), talk: 'ridge-ana' },
  ],
  triggers: [
    { x: 10, y: 11, w: 1, h: 13, script: 'juno-ridge', when: '!juno-4' },
    { x: 10, y: 25, w: 1, h: 2, script: 'juno-ridge', when: '!juno-4' },
    { x: 8, y: 1, w: 1, h: 9, script: 'club-velour-2', when: '!velour-2' },
  ],
  wild: ['updraft-ridge'],
};

export const restRidge = restStopMap('rest-ridge', 'Ridge camp', { map: 'updraft-ridge', x: 16, y: 4 });

export const skyIsland: MapDef = {
  id: 'sky-island', name: 'Sky Island', music: 'sky-island', theme: 2, outdoor: true, battleBg: 'sky',
  rows: [
    '                              ',
    '                              ',
    '         ..............       ',
    '         .kkk......kkk.       ',
    '         .kkk......kkk.       ',
    '         .kkk......kkk.       ',
    '         .............. ..... ',
    '         ....======.... .kkk. ',
    '  ...........======...bbbkkk. ',
    '  .....bbb...======...bbbkkk. ',
    '  ..kkkbbb...======.... .kkk. ',
    '  ..kkk......======.... .kkk. ',
    '  ..kkk..      bb kk    ..... ',
    '  .......      bb kk          ',
    '               bb kk          ',
    '               bb kk          ',
    '               bb kk          ',
    '              ..........      ',
    '              ..........      ',
    '  ........    ..""""""..      ',
    '  ........    ..""""""..      ',
    '  kkkkkkkkkkkk..""""""..      ',
    '  kkkkkkkkkkkk..""""""..      ',
    '  ........    ..........      ',
    '  ........    ..........      ',
    '                              ',
  ],
  objects: [
    { kind: 'beacon', x: 15, y: 4, id: 'spire-beacon', litBy: 'beacon-spire' },
    { kind: 'cave', x: 15, y: 6, w: 2, h: 2, id: 'spire-door' },
    { kind: 'house', x: 3, y: 10, w: 3, h: 3, id: 'rest', house: { style: { roof: P.roofGreen, wall: P.wallWhite }, door: 1, kind: 'rest' } },
    { kind: 'updraft', x: 3, y: 20, id: 'updraft-down', script: 'ride-down' },
    { kind: 'sign', x: 8, y: 23, text: 'The Sky Island. The Beacon Spire stands at the top. Keeper Celeste waits there.' },
    { kind: 'gift', x: 27, y: 7, id: 'sky-gift', item: 'rainbow-berry' },
    { kind: 'gift', x: 22, y: 24, id: 'sky-gift-2', item: 'big-pep-berry' },
    { kind: 'gift', x: 26, y: 11, id: 'ana-kite', script: 'find-kite', showIf: 'sq-ana' },
  ],
  warps: [
    { x: 15, y: 6, to: 'spire-gate', tx: 4, ty: 7, dir: 3 },
    { x: 16, y: 6, to: 'spire-gate', tx: 5, ty: 7, dir: 3 },
    { x: 4, y: 10, to: 'rest-sky', tx: 4, ty: 6, dir: 3 },
  ],
  npcs: [
    { id: 'sky-sage', name: 'Sage Lumi', x: 18, y: 20, dir: 0, look: townsLook('lumi', { elder: true, scarf: 0xd0c0f8 }), talk: 'sky-lumi' },
    { id: 'sky-agent', name: 'Agent Zephyr', x: 26, y: 10, dir: 1, look: townsLook('zephyr', { agent: true, hat: 'cap', hatColor: 0x8fc8ff }), talk: 'sky-zephyr' },
  ],
  triggers: [{ x: 5, y: 19, w: 1, h: 1, script: 'sky-arrive', when: '!sky-arrive' }],
  wild: ['sky-island'],
};

export const restSky = restStopMap('rest-sky', 'Sky Island Rest Stop', { map: 'sky-island', x: 4, y: 11 });

export const spireGate = trialHall({
  theme: 13,
  id: 'spire-gate', name: 'Beacon Spire', trial: 'spire', music: 'trial-6', intro: 'spire-hall',
  out: [{ map: 'sky-island', x: 15, y: 8 }, { map: 'sky-island', x: 16, y: 8 }],
  helper: { id: 'spire-helper', name: 'Nova', x: 0, y: 0, dir: 1, look: townsLook('nova', { agent: true, scarf: 0xd0c0f8 }), talk: 'trainer-spire-helper', trainer: 'spire-helper' },
});

const spire = trialTop({
  theme: 13,
  id: 'spire-top', name: 'Top of the Beacon Spire', beacon: 'beacon-spire', out: { map: 'sky-island', x: 16, y: 8 },
  keeper: { id: 'keeper-celeste', name: CAST.celeste!.name, x: 0, y: 0, dir: 0, look: CAST.celeste!.look, talk: 'keeper-celeste', trainer: 'keeper-celeste' },
});
/** After the finale, Aurelune waits by the Beacon until you befriend it. */
export const spireTop: MapDef = {
  ...spire,
  npcs: [...spire.npcs, { id: 'aurelune', name: 'Aurelune', x: 8, y: 4, dir: 0, look: CAST.agent!.look, creature: 'aurelune', talk: 'guardian-aurelune', showIf: 'guardian-met & !aurelune-friend' }],
};
