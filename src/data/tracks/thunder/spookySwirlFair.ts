import type { TrackData } from '../../types';
import { between, layout, left, offset, right, straight } from '../builder';

// Haunted-but-silly fairground at dusk: a figure-eight that spirals up around the Swirl Tower, zooms over the start
// straight on the Skyway bridge, plunges down the Big Dipper, bounces through bumper alley and hops the pumpkin patch.
const L = layout({ x: 0, z: 0, heading: 0, y: 0 }, [
  straight(100, { mark: 'start' }),
  right(135, 34, { y: 4, mark: 'swirlIn' }),
  straight(24, { y: 6, mark: 'swirl' }),
  right(135, 30, { y: 10, mark: 'swirlTop' }),
  straight(122, { mark: 'skyway' }),
  straight(111, { y: 1, mark: 'dipper' }),
  left(90, 40, { y: 0, mark: 'turn3' }),
  straight(110, { mark: 'bumpers' }),
  left(90, 40),
  straight(22, { mark: 'patchA' }),
  left(70, 24),
  right(140, 30, { mark: 'patch' }),
  left(70, 24, { mark: 'patchB' }),
  straight(10, { mark: 'patchOut' }),
  left(90, 46, { mark: 'last' }),
  straight(88),
]);
const m = L.marks;
const P = L.pos;

export const SPOOKY_SWIRL_FAIR: TrackData = {
  id: 'spooky-swirl-fair',
  name: 'Spooky Swirl Fair',
  cup: 'thunder',
  theme: 'themepark',
  feature: 'A figure-eight fairground: spiral up the Swirl Tower, then zoom right over the start line on the Skyway bridge',
  width: 14,
  shoulder: 4,
  edge: 'wall',
  autoBank: 0.6,
  start: 0.5,
  points: L.points,
  edges: [
    // the Skyway bridge crosses over the start straight: no railings (and no embankment) up there
    { from: m.swirlTop + 1.85, to: m.swirlTop + 3.45, side: 'both', type: 'drop' },
    { from: m.patchA - 0.3, to: m.patchA + 0.9, side: 'right', type: 'open' },
    { from: m.patchB - 0.9, to: m.patchB + 0.3, side: 'right', type: 'open' },
  ],
  boostPads: [
    { at: m.swirlTop + 1, offset: 0 },
    { at: m.skyway - 0.5, offset: 0 },
    { at: m.turn3 + 0.6, offset: -0.4 },
    { at: m.turn3 + 0.6, offset: 0.4 },
    { at: m.patchA - 0.6, offset: 0.4 },
    { at: m.patchOut + 0.6, offset: 0 },
  ],
  itemRows: [{ at: 1.4 }, { at: m.swirl + 0.6, count: 4 }, { at: m.skyway + 1.2, count: 4 }, { at: m.bumpers + 0.8, count: 4 }],
  ramps: [{ at: m.dipper - 2.2, kind: 'trick', length: 6, height: 1.4 }],
  hazards: [
    { kind: 'bumper', at: m.turn3 + 1.4, offset: -0.45, model: 'th_pumpkinbumper', radius: 1.6 },
    { kind: 'bumper', at: m.turn3 + 2.6, offset: 0.4, model: 'th_pumpkinbumper', radius: 1.6 },
    { kind: 'bumper', at: m.turn3 + 3.8, offset: -0.1, model: 'th_pumpkinbumper', radius: 1.6 },
  ],
  shortcuts: [
    {
      points: [
        offset(P.patchA, -6, 0),
        between(P.patchA, P.patchB, 0.25),
        between(P.patchA, P.patchB, 0.5),
        between(P.patchA, P.patchB, 0.75),
        offset(P.patchOut, 0, 0),
      ],
      width: 8,
      edge: 'open',
      surface: 'offroad',
      joinFrom: m.patchA,
      joinTo: m.patchOut,
      ramps: [
        { at: 1.4, kind: 'trick', length: 5, height: 1.1 },
        { at: 2.6, kind: 'trick', length: 5, height: 1.1 },
      ],
      hint: 'Cut through the squishy pumpkin patch! The grass slows you down, so bring a Turbo Can — and trick off both hay-bale hops for extra boosts.',
      aiUse: 1,
    },
  ],
  palette: {
    road: 0x4a3f63,
    road2: 0x52466c,
    line: 0xffd23f,
    kerb: 0xff8a1c,
    kerb2: 0x8f5bd6,
    offroad: 0x3f7a3f,
    wall: 0xfff3e0,
    wall2: 0xff8a1c,
    side: 0x5a3f7a,
  },
  sky: {
    light: { sunDir: [-0.4, 1, -0.3], sun: 0xb8c8ff, hemiGround: 0x2a1a44, grade: 0xf0e8ff },
    top: 0x1e0f3d,
    bottom: 0xc070e0,
    fog: 0x6a3f98,
    fogNear: 0.4,
    sun: 0xffe0b8,
    ambient: 0xd8c4ff,
    ground: 0x2c4a30,
    groundY: -1,
    backdrop: 'skyline',
    backdropColor: 0x2a1a48,
    night: true,
  },
  supports: { kind: 'pillars', color: 0xf0e8ff, color2: 0x8f5bd6 },
  scatter: [
    {
      types: ['th_pumpkin', 'th_pumpkinpile', 'th_lantern', 'th_ghostballoon', 'th_booth', 'th_hedge', 'th_balloonbunch', 'th_pumpkin'],
      density: 8,
      near: 1.5,
      far: 14,
    },
    { types: ['th_tent', 'th_curlytree', 'th_ghostballoon', 'th_curlytree'], density: 2.4, near: 22, far: 60, scale: [1.1, 1.8] },
  ],
  props: [
    { type: 'th_swirltower', x: -45, z: 98, y: -1 },
    { type: 'th_ferriswheel', x: 118, z: 5, y: -1, rot: 0.5 },
    { type: 'th_carousel', x: 52, z: -22, y: -1 },
    { type: 'th_tent', x: 150, z: -60, y: -1, scale: 1.8, rot: 0.3 },
    { type: 'th_ghostballoon', ...offset(P.patch, 0, -18), y: -1, scale: 2.2 },
  ],
  music: 'thunder2',
};
