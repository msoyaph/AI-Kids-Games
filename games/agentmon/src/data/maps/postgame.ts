/**
 * After the story: the Starlit Meadow (the Spotlight Club's open garden, east of Cragtop) and Deep
 * Blue Cove (paddle east from Sandy Shore). Third-stage Agentmon live here, and two guardians wait
 * to be found: Tidecrest in the cove (Archwyn and Frostmantle wait on the Dune Flats and the
 * Frostfall Slopes).
 */
import { CAST } from '../cast';
import type { MapDef } from '../../core/world/map';

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
  ],
  warps: [],
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
