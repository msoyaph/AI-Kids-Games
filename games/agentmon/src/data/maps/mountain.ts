/**
 * Chapters 5–6: Whisper Woods (a thick hedge you pass through a hollow log, the "woods" puzzle; the
 * Spotlight Club's tower in a clearing), the dark Glimmer Cave (lit near its mouth, where Glow
 * friends live), the Cragtop Slopes (a boulder a Stone friend shoves) and the mountain town of
 * Cragtop, whose Old Mine door needs a Volt friend to wake its machine.
 */
import { CAST, townsLook } from '../cast';
import { P } from '../../art/palette';
import type { MapDef } from '../../core/world/map';
import { homeMap, restStopMap, shopMap, trialHall, trialTop } from './interiors';

export const whisperWoods: MapDef = {
  id: 'whisper-woods', name: 'Whisper Woods', music: 'route-whisper', theme: 1, outdoor: true, battleBg: 'forest',
  rows: [
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
    'P.,,,,.......::.......,,,,,..P',
    'P.,,,,,......::......,,,,,,..P',
    'P..,,,.......::.......,,,,...P',
    'P............::::::::........P',
    'P..,,,,,...........,,,,,,....P',
    'P.,,,,,,,.........,,,,,,,,...P',
    'P..,,,,,..........,,,,,,.....P',
    'P............................P',
    'P..,,,,......,,,,,......,,,..P',
    'P.,,,,,,....,,,,,,,....,,,,,.P',
    'P............................P',
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
    'P............................P',
    'P..,,,,..................,,,.P',
    'P.,,,,,,.........,,,,,..,,,,.P',
    'P..,,,,....:::::::::.....,,..P',
    'P..........:.......:.........P',
    'P....,,,...:.......:...,,,,..P',
    'P...,,,,,..:.......:..,,,,,,.P',
    'P....,,,...:::::::::...,,,,..P',
    'P.............::.............P',
    'P..,,,,,......::......,,,,,..P',
    'P.,,,,,,,.....::.....,,,,,,,.P',
    'P..,,,,,......::......,,,,,..P',
    'P.............::.............P',
    'P.............::.............P',
    'PPPPPPPPPPPPPP::PPPPPPPPPPPPPP',
  ],
  objects: [
    { kind: 'cave', x: 9, y: 14, w: 2, h: 2, id: 'log-south' },
    { kind: 'cave', x: 20, y: 3, w: 2, h: 2, id: 'log-north' },
    { kind: 'cave', x: 13, y: 1, w: 2, h: 2, id: 'glimmer-mouth' },
    { kind: 'lure', x: 15, y: 18, id: 'lure-woods', goneIf: 'woods-tower-off' },
    { kind: 'sign', x: 12, y: 21, text: 'Whisper Woods. Listen: the trees whisper when the wind blows. A hollow log leads through the hedge.' },
    { kind: 'gift', x: 27, y: 9, id: 'whisper-gift', item: 'calm-leaf' },
  ],
  warps: [
    { x: 9, y: 14, to: 'trial:woods', tx: 0, ty: 0 },
    { x: 10, y: 14, to: 'trial:woods', tx: 0, ty: 0 },
    { x: 20, y: 3, to: 'whisper-woods', tx: 9, ty: 15, dir: 0 },
    { x: 21, y: 3, to: 'whisper-woods', tx: 10, ty: 15, dir: 0 },
    { x: 13, y: 1, to: 'glimmer-cave', tx: 12, ty: 20, dir: 3 },
    { x: 14, y: 1, to: 'glimmer-cave', tx: 13, ty: 20, dir: 3 },
  ],
  edges: [{ side: 's', to: 'mossgrove', offset: 0 }],
  npcs: [
    { id: 'agent-bea', name: 'Bette', x: 24, y: 21, dir: 1, look: townsLook('bette', { agent: true, glasses: true }), talk: 'trainer-agent-bea', trainer: 'agent-bea' },
    { id: 'club-dot', name: 'Dot', x: 16, y: 18, dir: 1, look: CAST.club!.look, talk: 'club-dot' },
    { id: 'whisper-owlet', name: 'Mr. Hush', x: 6, y: 8, dir: 2, look: townsLook('hush', { elder: true, glasses: true }), talk: 'whisper-hush' },
  ],
  triggers: [
    { x: 14, y: 25, w: 2, h: 1, script: 'whisper-arrive', when: '!whisper-arrive' },
    { x: 12, y: 20, w: 7, h: 1, script: 'club-dot', when: '!beat:club-dot & !dot-met' },
  ],
  wild: ['whisper-woods'],
};

export const glimmerCave: MapDef = {
  id: 'glimmer-cave', name: 'Glimmer Cave', music: 'cave', theme: 4, outdoor: false, dark: true, battleBg: 'cave',
  rows: [
    '##########################',
    '##########cccc############',
    '#####ddddddddddddddd######',
    '###dddd#dddddd#ddddddd####',
    '##ddd#ddddQdddddd#dddddd##',
    '##dddddddddddd#dddddddd###',
    '###ddd##ddddddddddQdddd###',
    '####dddddd#ddddddddddd####',
    '#####dddddddddd##dddd#####',
    '######dddddddddddddd######',
    '#######dddddddcccc########',
    '#########ccccccccc########',
    '####cccccccQccccccccc#####',
    '###cccccccccccccccccccc###',
    '##cccQcccccccccccccQccc###',
    '##ccccccccccc#cccccccccc##',
    '###ccccccc#####cccccccc###',
    '####ccccccc###cccccccc####',
    '#####cccccccccccccccc#####',
    '#######cccccccccccc#######',
    '###########cccc###########',
    '###########cccc###########',
  ],
  objects: [
    { kind: 'sign', x: 15, y: 19, text: 'Glimmer Cave. Past the crystals it gets very dark. Bring a Glow friend!' },
    { kind: 'gift', x: 3, y: 15, id: 'cave-gift', item: 'wake-berry' },
    { kind: 'gift', x: 22, y: 4, id: 'dark-gift', item: 'glow-charm' },
  ],
  warps: [
    { x: 11, y: 21, to: 'whisper-woods', tx: 13, ty: 2, dir: 0 },
    { x: 12, y: 21, to: 'whisper-woods', tx: 13, ty: 2, dir: 0 },
    { x: 13, y: 21, to: 'whisper-woods', tx: 14, ty: 2, dir: 0 },
    { x: 14, y: 21, to: 'whisper-woods', tx: 14, ty: 2, dir: 0 },
    { x: 10, y: 1, to: 'cragtop-slopes', tx: 12, ty: 24, dir: 3 },
    { x: 11, y: 1, to: 'cragtop-slopes', tx: 12, ty: 24, dir: 3 },
    { x: 12, y: 1, to: 'cragtop-slopes', tx: 13, ty: 24, dir: 3 },
    { x: 13, y: 1, to: 'cragtop-slopes', tx: 13, ty: 24, dir: 3 },
  ],
  npcs: [
    { id: 'club-rudy', name: 'Rudy', x: 16, y: 10, dir: 0, look: { ...CAST.club!.look, skin: 1, hair: 3 }, talk: 'club-rudy' },
    { id: 'cave-agent', name: 'Agent Mo', x: 6, y: 14, dir: 2, look: townsLook('mo', { agent: true, hat: 'cap', hatColor: 0xf5c830 }), talk: 'cave-mo' },
  ],
  triggers: [{ x: 14, y: 11, w: 4, h: 1, script: 'club-rudy', when: '!beat:club-rudy & !rudy-met' }],
  wild: ['glimmer-cave'],
};

export const cragtopSlopes: MapDef = {
  id: 'cragtop-slopes', name: 'Cragtop Slopes', music: 'route-mountain', theme: 7, outdoor: true, battleBg: 'mountain',
  rows: [
    '############::############',
    '#R....,,,,..::..,,,,,...R#',
    '#....,,,,,,.::.,,,,,,,...#',
    '#.....,,,,..::...,,,,....#',
    '#...........::...........#',
    '#..R.....R..::..R.....R..#',
    '#...........::...........#',
    '#........................#',
    '##########O###############',
    '#.........:..............#',
    '#..,,,,,..:...,,,,,......#',
    '#.,,,,,,,.:..,,,,,,,..R..#',
    '#..,,,,,..:...,,,,,......#',
    '#.........:..............#',
    '#....R....::::::::::.....#',
    '#.................:......#',
    '#..,,,,,,.....,,,,:,,,...#',
    '#.,,,,,,,,...,,,,,:,,,,..#',
    '#..,,,,,,.....,,,,:,,,...#',
    '#.................:......#',
    '#..R.....::::::::::...R..#',
    '#........:...............#',
    '#..,,,,..:....,,,,.......#',
    '#.,,,,,,.:...,,,,,,......#',
    '#........::::............#',
    '############cc############',
  ],
  objects: [
    { kind: 'cave', x: 12, y: 25, w: 2, h: 1, id: 'glimmer-exit' },
    { kind: 'sign', x: 9, y: 9, text: 'A boulder blocks the trail. A Stone friend could shove it!' },
    { kind: 'gift', x: 24, y: 7, id: 'slope-gift', item: 'spark-fizz' },
  ],
  warps: [
    { x: 12, y: 25, to: 'glimmer-cave', tx: 11, ty: 2, dir: 0 },
    { x: 13, y: 25, to: 'glimmer-cave', tx: 12, ty: 2, dir: 0 },
  ],
  edges: [{ side: 'n', to: 'cragtop', offset: 2 }],
  npcs: [
    { id: 'agent-sami', name: 'Sami', x: 20, y: 15, dir: 1, look: townsLook('sami', { agent: true, hat: 'beanie', hatColor: 0xd9604f }), talk: 'trainer-agent-sami', trainer: 'agent-sami' },
    { id: 'slope-climber', name: 'Climber Jo', x: 15, y: 4, dir: 0, look: townsLook('jo-climb', { hat: 'cap', hatColor: 0xf5c830 }), talk: 'slope-jo' },
  ],
  triggers: [],
  wild: ['cragtop-slopes'],
};

export const cragtop: MapDef = {
  id: 'cragtop', name: 'Cragtop', music: 'town-cragtop', theme: 7, outdoor: true, battleBg: 'mountain',
  rows: [
    '############################',
    '#R...R..........R..........#',
    '#.P......P............cc...#',
    '#...........................',
    '#...........................',
    '#..........................#',
    '#::::::::::::::::::::::::::#',
    '#.....:..........:.......:.#',
    '#..P..:..........:..R....:.#',
    '......:...======.:.......:.#',
    '::::::::::======:::::::::::#',
    '......:...======.......P.:.#',
    '#...R.:.P................:.#',
    '#..P..:..................:.#',
    '#.....::::::::::::::::::::.#',
    '#..R.........::.........R..#',
    '#.........P..::............#',
    '#.....E......::.....PE.....#',
    '#............::............#',
    '#R......R....::....R......R#',
    '#............::............#',
    '##############::############',
  ],
  objects: [
    { kind: 'house', x: 2, y: 5, w: 3, h: 3, id: 'rest', house: { style: { roof: P.roofGreen, wall: P.wallWhite }, door: 1, kind: 'rest' } },
    { kind: 'house', x: 7, y: 5, w: 3, h: 3, id: 'shop', house: { style: { roof: P.roofSun, wall: P.wallCream }, door: 1, kind: 'shop' } },
    { kind: 'house', x: 12, y: 5, w: 4, h: 3, id: 'home-a', house: { style: { roof: P.roofRed, wall: P.wallPeach }, door: 2, kind: 'home' } },
    { kind: 'house', x: 18, y: 13, w: 4, h: 3, id: 'home-b', house: { style: { roof: P.roofBlue, wall: P.wallWhite }, door: 1, kind: 'home' } },
    { kind: 'cave', x: 22, y: 2, w: 2, h: 2, id: 'old-mine' },
    { kind: 'machine', x: 21, y: 2, id: 'mine-machine' },
    { kind: 'sign', x: 24, y: 2, text: 'The Old Mine. Its door wakes up when the old machine has power.' },
    { kind: 'sign', x: 15, y: 18, text: 'Cragtop, the town on the mountain. West: the Canyon Trail. North-east: the Old Mine.' },
    { kind: 'lamp', x: 9, y: 9 }, { kind: 'lamp', x: 16, y: 11 },
    { kind: 'gift', x: 26, y: 20, id: 'crag-gift', item: 'big-pep-berry' },
  ],
  warps: [
    { x: 3, y: 5, to: 'rest-cragtop', tx: 4, ty: 6, dir: 3 },
    { x: 8, y: 5, to: 'shop-cragtop', tx: 4, ty: 6, dir: 3 },
    { x: 14, y: 5, to: 'crag-home', tx: 4, ty: 6, dir: 3 },
    { x: 19, y: 13, to: 'crag-home', tx: 4, ty: 6, needs: 'never', lockedText: 'Nobody answers. A note says: "At the mine. Back for supper!"' },
    { x: 22, y: 2, to: 'old-mine', tx: 4, ty: 7, dir: 3, needs: 'powered:cragtop:mine-machine', lockedText: 'The mine door is shut tight. The old machine next to it needs power. A Volt friend could help!' },
    { x: 23, y: 2, to: 'old-mine', tx: 5, ty: 7, dir: 3, needs: 'powered:cragtop:mine-machine', lockedText: 'The mine door is shut tight. The old machine next to it needs power. A Volt friend could help!' },
  ],
  edges: [
    { side: 's', to: 'cragtop-slopes', offset: -2 },
    { side: 'w', to: 'canyon-trail', offset: 0 },
    { side: 'e', to: 'starlit-meadow', offset: 7 },
  ],
  npcs: [
    { id: 'crag-miner', name: 'Miner Gil', x: 20, y: 4, dir: 1, look: townsLook('gil', { hat: 'cap', hatColor: 0xf5c830 }), talk: 'crag-gil' },
    { id: 'crag-kid', name: 'Tam', x: 11, y: 12, dir: 0, look: townsLook('tam', { kid: true }), talk: 'crag-tam', wander: 2 },
    { id: 'crag-elder', name: 'Granny Rue', x: 4, y: 16, dir: 2, look: townsLook('rue', { elder: true, scarf: 0xd9604f }), talk: 'crag-rue' },
    { id: 'juno-crag', name: CAST.juno!.name, x: 12, y: 9, dir: 0, look: CAST.juno!.look, talk: 'juno-crag', showIf: 'beacon-mine & !juno-crag' },
  ],
  triggers: [
    { x: 14, y: 20, w: 2, h: 1, script: 'crag-arrive', when: '!crag-arrive' },
    { x: 1, y: 9, w: 1, h: 3, script: 'not-yet-canyon', when: '!beacon-mine' },
    { x: 26, y: 3, w: 1, h: 2, script: 'not-yet-meadow', when: '!credits' },
  ],
  wild: [],
};

export const restCragtop = restStopMap('rest-cragtop', 'Cragtop Rest Stop', { map: 'cragtop', x: 3, y: 6 });
export const shopCragtop = shopMap('shop-cragtop', 'Cragtop Shop', 'shop-cragtop', { map: 'cragtop', x: 8, y: 6 });
export const cragHome = homeMap('crag-home', 'Stone cottage', { map: 'cragtop', x: 14, y: 6 }, [
  { id: 'crag-gramps', name: 'Old Barlow', x: 1, y: 4, dir: 2, look: townsLook('barlow', { elder: true, glasses: true }), talk: 'crag-barlow' },
  { id: 'crag-burrowby', name: 'Burrowby', x: 6, y: 5, dir: 0, look: CAST.agent!.look, creature: 'burrowby', talk: 'crag-pet' },
]);

export const oldMine = trialHall({
  id: 'old-mine', name: 'Old Mine', trial: 'mine', music: 'trial-3', intro: 'mine-hall',
  out: [{ map: 'cragtop', x: 22, y: 3 }, { map: 'cragtop', x: 23, y: 3 }],
  helper: { id: 'mine-helper', name: 'Gus', x: 0, y: 0, dir: 1, look: townsLook('gus', { agent: true, hat: 'cap', hatColor: 0xf5c830 }), talk: 'trainer-mine-helper', trainer: 'mine-helper' },
});

export const mineTop = trialTop({
  id: 'mine-top', name: 'Old Mine lookout', beacon: 'beacon-mine', out: { map: 'cragtop', x: 23, y: 3 },
  keeper: { id: 'keeper-vee', name: CAST.vee!.name, x: 0, y: 0, dir: 0, look: CAST.vee!.look, talk: 'keeper-vee', trainer: 'keeper-vee' },
});
