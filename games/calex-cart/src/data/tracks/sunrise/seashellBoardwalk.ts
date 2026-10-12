import type { TrackData } from '../../types';
import { layout, left, offset, right, straight } from '../builder';

// A sunny beach loop with a boardwalk pier hairpin out over the sea.
const L = layout({ x: 0, z: 0, heading: 0, y: 0 }, [
  straight(175, { mark: 'startStraight' }),
  right(90, 44, { mark: 'turn1' }),
  straight(40, { y: 1.6, markStart: 'pierStart' }),
  straight(150, { mark: 'pierOut' }),
  right(180, 32, { mark: 'hairpin' }),
  straight(80, { mark: 'pierReturn' }),
  straight(26, { mark: 'pierEnd', y: 1.6 }),
  straight(30, { y: 0, mark: 'beachDrop' }),
  left(90, 36),
  straight(24, { mark: 'duneA' }),
  left(55, 34),
  right(110, 34, { mark: 'crabs' }),
  left(55, 34, { mark: 'duneB' }),
  straight(24),
  right(180, 54, { mark: 'lastTurn' }),
], { legacyMarkHeadings: true });
const m = L.marks;
const P = L.pos;
const duneLen = Math.hypot(P.duneA.x - P.duneB.x, P.duneA.z - P.duneB.z);

export const SEASHELL_BOARDWALK: TrackData = {
  id: 'seashell-boardwalk',
  name: 'Seashell Boardwalk',
  cup: 'sunrise',
  theme: 'beach',
  feature: 'A wooden pier hairpin over the sparkling sea and a sand-dune jump shortcut',
  width: 15,
  shoulder: 6,
  edge: 'open',
  autoBank: 0.5,
  start: 0.6,
  points: L.points,
  edges: [{ from: m.pierStart, to: m.pierEnd, side: 'both', type: 'wall' }],
  boostPads: [
    { at: m.startStraight - 2.2, offset: -0.45 },
    { at: m.startStraight - 2.2, offset: 0.45 },
    { at: m.hairpin + 0.6, offset: 0 },
  ],
  itemRows: [{ at: m.startStraight - 0.8 }, { at: m.pierOut - 2.5, count: 4 }, { at: m.crabs + 0.6, count: 4 }],
  ramps: [{ at: m.pierEnd + 0.4, kind: 'trick', length: 6, height: 1.2, offset: 0, width: 9 }],
  hazards: [
    { kind: 'crab', at: m.crabs - 1.2, offset: 0, amp: 0.75, period: 5, model: 'hz_crab2', radius: 1.3 },
    { kind: 'crab', at: m.crabs + 1.6, offset: 0, amp: 0.75, period: 4.2, phase: 0.5, model: 'hz_crab2', radius: 1.3 },
  ],
  shortcuts: [
    {
      points: [offset(P.duneA, 0, 0), offset(P.duneA, duneLen * 0.33, 0, 0.3), offset(P.duneA, duneLen * 0.66, 0, 0.3), offset(P.duneB, 0, 0)],
      width: 7,
      edge: 'open',
      surface: 'offroad',
      joinFrom: m.duneA,
      joinTo: m.duneB,
      ramps: [{ at: 1.6, kind: 'trick', length: 6, height: 1.4 }],
      hint: 'Blast straight through the sand dunes! Sand slows you down, so use a Turbo Can — and do a trick off the dune.',
      aiUse: 0.6,
    },
  ],
  palette: {
    road: 0xc8955b,
    road2: 0xbd8a50,
    line: 0xfff3d6,
    kerb: 0x4ce0d2,
    kerb2: 0xffffff,
    offroad: 0xf2d79b,
    wall: 0xffffff,
    wall2: 0xff8a65,
    side: 0x8a5a33,
  },
  sky: {
    light: { sunDir: [0.4, 1, 0.3], sunIntensity: 1.85, grade: 0xfff8ee }, waterGround: true,
    top: 0x3fb4ff,
    bottom: 0xc6f1ff,
    fog: 0xcdf3ff,
    sun: 0xfff3e0,
    ambient: 0xffffff,
    ground: 0x2aa6e0,
    groundY: -1.6,
    backdrop: 'clouds',
    backdropColor: 0xffffff,
  },
  supports: { kind: 'pillars', color: 0x8a5a33, color2: 0x9c6b3e },
  scatter: [
    { types: ['palm', 'palm', 'umbrella', 'umbrella2', 'dunegrass', 'beachball', 'surfboard', 'starfish'], density: 9, near: 2, far: 22 },
    { types: ['palm', 'sandcastle', 'lifeguard', 'dunegrass'], density: 3, near: 20, far: 45 },
  ],
  props: [
    { type: 'lighthouse', x: -250, z: 160, y: -1.6, scale: 1.2 },
    { type: 'sailboat', x: -120, z: 250, y: -1.6, rot: 1.2, scale: 1.4 },
    { type: 'sailboat', x: -300, z: 90, y: -1.6, rot: -0.6, scale: 1.2 },
    { type: 'lifeguard', x: 30, z: 80, y: 0 },
    { type: 'sandcastle', x: -135, z: 40, y: -0.4 },
  ],
  music: 'sunrise1',
};
