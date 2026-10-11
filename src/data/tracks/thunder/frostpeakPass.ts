import type { TrackData } from '../../types';
import { between, layout, left, offset, right, straight } from '../builder';

// Snowy mountain: climb the pass through the pines, round the summit hairpin, then a long fast downhill slalom with
// rolling snowballs and a ski-jump shortcut over an icy crevasse.
const L = layout({ x: 0, z: 0, heading: 0, y: 2 }, [
  straight(120, { mark: 'start' }),
  left(35, 40, { y: 5 }),
  right(70, 34, { y: 9, mark: 'esses' }),
  left(35, 40, { y: 12 }),
  straight(102.5, { y: 18, mark: 'climb' }),
  left(20, 100, { y: 22.5 }),
  right(20, 100, { y: 26.5, mark: 'pass' }),
  right(90, 36, { y: 27.5, mark: 'summit' }),
  right(90, 36, { y: 28, mark: 'summitOut' }),
  straight(60, { y: 22, mark: 'downhill' }),
  left(55, 36, { y: 21.5 }),
  straight(18, { y: 21 }),
  right(110, 36, { y: 20, mark: 'slalom' }),
  straight(18, { y: 19.5 }),
  left(55, 36, { y: 19, mark: 'downhill2' }),
  straight(40, { y: 15, mark: 'jumpA' }),
  left(65, 30, { y: 13 }),
  straight(10, { y: 12.4 }),
  right(130, 30, { y: 9.6, mark: 'crevasse' }),
  straight(10, { y: 9 }),
  left(65, 30, { y: 7, mark: 'jumpB' }),
  straight(20, { y: 5, mark: 'jumpOut' }),
  right(90, 30, { y: 3.5 }),
  right(90, 30, { y: 2, mark: 'last' }),
]);
const m = L.marks;
const P = L.pos;
const GROUND = -6;

export const FROSTPEAK_PASS: TrackData = {
  id: 'frostpeak-pass',
  name: 'Frostpeak Pass',
  cup: 'thunder',
  theme: 'snow',
  feature: 'Climb the snowy pass, round the summit hairpin and slalom down the mountain past rolling snowballs',
  width: 14,
  shoulder: 4,
  edge: 'wall',
  autoBank: 0.6,
  start: 0.5,
  points: L.points,
  edges: [
    // the cliff road: a sheer drop on the outside with a view over the valley
    { from: m.climb - 3.2, to: m.climb - 0.4, side: 'left', type: 'drop' },
    { from: m.jumpA - 0.3, to: m.jumpA + 0.9, side: 'right', type: 'open' },
    { from: m.jumpB - 0.9, to: m.jumpB + 0.3, side: 'right', type: 'open' },
  ],
  boostPads: [
    { at: m.start - 2.4, offset: 0 },
    { at: m.esses + 2.2, offset: 0 },
    { at: m.climb - 0.6, offset: 0 },
    { at: m.jumpOut + 0.4, offset: 0 },
  ],
  itemRows: [
    { at: m.start - 1.2 },
    { at: m.climb - 0.4, count: 4 },
    { at: m.summitOut + 0.5, count: 4 },
    { at: m.downhill2 + 0.3, count: 4 },
  ],
  ramps: [{ at: m.climb - 1.4, kind: 'trick', length: 6, height: 1.3, offset: 0.4, width: 6 }],
  hazards: [
    { kind: 'roller', at: m.downhill - 1.9, offset: 0, amp: 0.7, period: 4.4, model: 'th_snowball', radius: 1.8 },
    { kind: 'roller', at: m.downhill - 0.6, offset: 0, amp: 0.7, period: 5.2, phase: 0.4, model: 'th_snowball', radius: 1.8 },
  ],
  shortcuts: [
    {
      points: [
        offset(P.jumpA, -6, 0),
        between(P.jumpA, P.jumpB, 0.25, 0, 12.2),
        between(P.jumpA, P.jumpB, 0.5, 0, 9.4),
        between(P.jumpA, P.jumpB, 0.75, 0, 8.3),
        offset(P.jumpOut, 0, 0),
      ],
      width: 10,
      edge: 'open',
      surface: 'road',
      joinFrom: m.jumpA,
      joinTo: m.jumpOut,
      boostPads: [{ at: 1.2, offset: 0, width: 3 }],
      ramps: [{ at: 1.92, kind: 'trick', length: 6, height: 1.4 }],
      gaps: [{ from: 1.96, to: 2.3 }],
      hint: 'Take the ski jump over the icy crevasse! Hit the boost pad and keep your speed up — too slow and you will drop into the crack.',
      aiUse: 0.7,
    },
  ],
  palette: {
    road: 0x6a7388,
    road2: 0x717a90,
    line: 0xffffff,
    kerb: 0xff4d6d,
    kerb2: 0xffffff,
    offroad: 0xeef4ff,
    wall: 0xdfeaff,
    wall2: 0x3fa7ff,
    side: 0x9fb4d0,
  },
  sky: {
    top: 0x4f9ef5,
    bottom: 0xe6f4ff,
    fog: 0xeaf4ff,
    fogNear: 0.45,
    sun: 0xfff6ea,
    ambient: 0xf4f8ff,
    ground: 0xf4f8ff,
    groundY: GROUND,
    backdrop: 'mountains',
    backdropColor: 0x8ea8d0,
  },
  supports: { kind: 'rock', color: 0x8a96a8, color2: 0x9aa6b8 },
  scatter: [
    { types: ['th_snowpine', 'th_snowpine', 'th_snowman', 'th_snowrock', 'th_icecrystal', 'th_sled', 'th_skis', 'th_penguin', 'th_skiflag'], density: 8, near: 1.5, far: 13 },
    { types: ['th_snowpine', 'th_snowpine', 'th_snowrock', 'th_igloo'], density: 3, near: 24, far: 70, scale: [1.1, 1.9] },
  ],
  props: [
    { type: 'th_snowpeak', x: 170, z: 330, y: GROUND, scale: 1.2 },
    { type: 'th_snowpeak', x: -260, z: 260, y: GROUND, scale: 0.9, rot: 1.4 },
    { type: 'th_cabin', ...offset(P.start, -70, -20), y: -2.3, rot: -Math.PI / 2 },
    { type: 'th_igloo', ...offset(P.start, -20, 26), y: -3.2, scale: 1.3 },
    { type: 'th_snowman', ...offset(P.summit, -10, 12), y: P.summit.y - 1.7, scale: 1.6, rot: 1.6 },
  ],
  music: 'thunder4',
};
