import type { TrackData } from '../../types';
import { between, layout, left, offset, right, straight } from '../builder';

// Desert ruins high on the sandstone mesas: a triangle of temple roads with a colonnade straight, a quicksand-slide
// shortcut, rolling boulders and a glider leap across the crumbled bridge, all around the Great Sun Pyramid.
const L = layout({ x: 0, z: 0, heading: 90, y: 14 }, [
  straight(231, { mark: 'start' }),
  left(120, 36, { y: 16, mark: 'cornerA' }),
  straight(20, { y: 18 }),
  left(30, 70, { y: 20 }),
  right(30, 70, { y: 23, mark: 'esses' }),
  straight(20, { y: 24, mark: 'chuteA' }),
  right(65, 30, { y: 23 }),
  left(130, 30, { y: 20, mark: 'chute' }),
  right(65, 30, { y: 18, mark: 'chuteB' }),
  straight(16, { mark: 'chuteOut' }),
  left(120, 42, { y: 19, mark: 'cornerB' }),
  straight(66, { y: 18, mark: 'boulders' }),
  straight(30, { y: 15.5, mark: 'lip' }),
  straight(46, { y: 15, mark: 'gapEnd' }),
  straight(76, { y: 13.5, mark: 'landed' }),
  left(120, 38, { y: 13, mark: 'cornerC' }),
  straight(20, { y: 14 }),
], { legacyMarkHeadings: true });
const m = L.marks;
const P = L.pos;
const GROUND = 0;

export const SUNSTONE_RUINS: TrackData = {
  id: 'sunstone-ruins',
  name: 'Sunstone Ruins',
  cup: 'thunder',
  theme: 'ruins',
  feature: 'Sky-high sandstone ruins: dodge rolling boulders and glide across the crumbled bridge past the Sun Pyramid',
  width: 14,
  shoulder: 4,
  edge: 'wall',
  autoBank: 0.6,
  start: 0.5,
  points: L.points,
  edges: [
    // the crumbled bridge: broken stone edges, no railings
    { from: m.lip - 0.6, to: m.gapEnd + 1.2, side: 'both', type: 'drop' },
    { from: m.chuteA - 0.3, to: m.chuteA + 0.9, side: 'left', type: 'open' },
    { from: m.chuteB - 0.9, to: m.chuteB + 0.3, side: 'left', type: 'open' },
  ],
  gaps: [{ from: m.lip + 0.12, to: m.gapEnd - 0.05 }],
  boostPads: [
    { at: m.start - 2.4, offset: -0.35 },
    { at: m.cornerA + 0.6, offset: 0 },
    { at: m.cornerB + 0.7, offset: -0.4 },
    { at: m.cornerB + 0.7, offset: 0.4 },
  ],
  itemRows: [
    { at: m.start - 1.2 },
    { at: m.esses + 0.4, count: 4 },
    { at: m.cornerB + 1.6, count: 4 },
    { at: m.landed + 0.2, count: 3 },
  ],
  ramps: [
    { at: m.lip, kind: 'glider', length: 9, height: 2.4 },
    { at: m.start - 5.5, kind: 'trick', length: 6, height: 1.3, offset: 0.4, width: 6 },
  ],
  hazards: [
    { kind: 'roller', at: m.boulders - 2.4, offset: 0, amp: 0.72, period: 4.6, model: 'th_boulder', radius: 1.7 },
    { kind: 'roller', at: m.boulders - 0.6, offset: 0, amp: 0.72, period: 5.4, phase: 0.5, model: 'th_boulder', radius: 1.7 },
  ],
  shortcuts: [
    {
      points: [
        offset(P.chuteA, -6, 0),
        between(P.chuteA, P.chuteB, 0.25),
        between(P.chuteA, P.chuteB, 0.5),
        between(P.chuteA, P.chuteB, 0.75),
        offset(P.chuteOut, 0, 0),
      ],
      width: 8,
      edge: 'open',
      surface: 'offroad',
      joinFrom: m.chuteA,
      joinTo: m.chuteOut,
      ramps: [{ at: 2.7, kind: 'trick', length: 5, height: 1.2 }],
      hint: 'Surf down the quicksand slide! Sand slows you, so fire a Turbo Can at the top — and trick off the dune at the bottom.',
      aiUse: 1,
    },
  ],
  palette: {
    road: 0xc9a46a,
    road2: 0xc19c62,
    line: 0xfff3d6,
    kerb: 0x3fb5a8,
    kerb2: 0xfff3d6,
    offroad: 0xe8c27a,
    wall: 0xd9b37a,
    wall2: 0xb5835a,
    side: 0xb07a4a,
  },
  sky: {
    light: { sunDir: [0.2, 1, 0.2], sunIntensity: 2.0, hemiGround: 0xb08850, grade: 0xfff4e0 },
    top: 0x3f9cff,
    bottom: 0xffe2a8,
    fog: 0xf6deb0,
    fogNear: 0.45,
    sun: 0xfff0d0,
    ambient: 0xfff4e0,
    ground: 0xe2b56e,
    groundY: GROUND,
    backdrop: 'dunes',
    backdropColor: 0xe0b070,
  },
  supports: { kind: 'rock', color: 0xc8955b, color2: 0xb5835a },
  scatter: [
    { types: ['th_column', 'th_brokencolumn', 'th_urn', 'th_cactus', 'th_ruinwall', 'th_column', 'th_datepalm'], density: 7, near: 1.5, far: 12 },
    { types: ['th_obelisk', 'th_datepalm', 'th_sandmesa', 'th_cactus'], density: 2.2, near: 26, far: 70, scale: [1.2, 2] },
  ],
  props: [
    { type: 'th_pyramid', x: 118, z: -112, y: GROUND, rot: 0.3 },
    { type: 'th_ruinarch', ...offset(P.start, -150, 0), y: P.start.y, rot: Math.PI / 2 },
    { type: 'th_sandcat', ...offset(P.cornerC, 20, 45), y: GROUND, scale: 2.2, rot: 2.6 },
    { type: 'th_obelisk', ...offset(P.start, -40, -12.5), y: P.start.y - 1, scale: 1.2 },
    { type: 'th_obelisk', ...offset(P.start, -40, 12.5), y: P.start.y - 1, scale: 1.2 },
  ],
  music: 'thunder3',
};
