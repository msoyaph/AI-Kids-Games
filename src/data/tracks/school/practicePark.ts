import type { TrackData } from '../../types';
import { layout, offset, right, straight } from '../builder';

// Driving School course 2: a glider ramp over a small valley (with rings to fly through) and a grassy off-road
// shortcut across the last corner — use a Turbo Can there!
const L = layout({ x: 0, z: 0, heading: 0, y: 4 }, [
  straight(100, { mark: 'start' }),
  right(90, 36, { mark: 't1' }),
  straight(36, { mark: 'lip' }),
  straight(54, { y: -1, mark: 'gapEnd' }),
  straight(40, { y: -1, mark: 'landed' }),
  right(90, 32, { y: 0, mark: 't2' }),
  straight(80, { y: 2, mark: 'park' }),
  right(90, 34, { y: 4, mark: 't3' }),
  straight(70, { mark: 'back' }),
  right(90, 36, { mark: 'last' }),
]);
const m = L.marks;
const P = L.pos;

export const PRACTICE_PARK: TrackData = {
  id: 'school-park',
  name: 'Practice Park',
  cup: 'sunrise',
  theme: 'test',
  feature: 'Driving School course: a glider leap and a grassy shortcut',
  width: 15,
  shoulder: 3,
  edge: 'wall',
  start: 0.5,
  points: L.points,
  marks: m,
  edges: [{ from: m.lip - 0.6, to: m.landed + 0.2, side: 'both', type: 'drop' }],
  ramps: [{ at: m.lip - 0.05, kind: 'glider', length: 7, height: 1.4 }],
  gaps: [{ from: m.lip + 0.1, to: m.gapEnd - 0.1 }],
  boostPads: [{ at: m.lip - 0.9, offset: 0 }],
  itemRows: [{ at: m.start - 2.5 }],
  shortcuts: [
    {
      // cut the inside of the third corner across the grass
      // inside of the corner is to the RIGHT of the road (it turns right)
      points: [offset(P.park, -46, 0), offset(P.park, -22, 9), offset(P.back, -62, 9), offset(P.back, -36, 0)],
      width: 9,
      edge: 'open',
      surface: 'offroad',
      joinFrom: m.park - 2.3,
      joinTo: m.back - 1.55,
      hint: 'Off-road grass is slow — fire your Turbo Cans one after another while you cross it!',
      aiUse: 0.6,
    },
  ],
  palette: { road: 0x5f6478, road2: 0x666b80, line: 0xffffff, kerb: 0x3fa7ff, kerb2: 0xffffff, offroad: 0x6cc35c, wall: 0x3fa7ff, wall2: 0xffffff, side: 0x50536a },
  sky: { top: 0x4fb6ff, bottom: 0xd6f1ff, fog: 0xd6f1ff, sun: 0xfff6e0, ambient: 0xffffff, ground: 0x7cd36b, groundY: -7, backdrop: 'clouds', light: { sunDir: [0.4, 1, 0.3] } },
  scatter: [
    { types: ['cone', 'flag', 'tree', 'bush'], density: 6, near: 1.5, far: 12 },
    { types: ['tree', 'pine'], density: 2, near: 20, far: 50 },
  ],
  music: 'school',
};
