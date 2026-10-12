import type { PropPlacement, TrackData } from '../../types';
import { between, layout, left, offset, right, straight, type MarkPos } from '../builder';

// Deep jungle ruins: snake through giant trees, charge up the Grand Stairway over a stepped temple,
// dodge stone balls rolling down the far side, splash through the Jade River ford — and risk the rope bridge.
const L = layout({ x: 0, z: 0, heading: 0, y: 0 }, [
  straight(67, { mark: 'start' }),
  right(135, 42, { mark: 'turn1' }),
  left(90, 39, { mark: 'jungleS' }),
  straight(30),
  left(30, 60, { mark: 'vines' }),
  right(30, 60),
  straight(25, { mark: 'climbStart' }),
  // the Grand Stairway up the temple, a hairpin around the summit shrine, then the Boulder Run back down
  straight(91, { y: 9, mark: 'climbTop' }),
  right(150, 34, { mark: 'summit' }),
  straight(15, { mark: 'descentTop' }),
  straight(143, { y: 0, mark: 'boulderRun' }),
  left(15, 52, { mark: 'kink' }),
  straight(40, { mark: 'fordIn' }),
  // down the bank and splash through the river below the Jade Falls
  right(45, 36, { y: -4.4, mark: 'ford' }),
  left(45, 36, { y: 0, mark: 'fordOut' }),
  straight(20),
  right(90, 40, { mark: 'turn5' }),
  straight(20, { mark: 'gorgeA' }),
  // the road swings round the rim of a deep ravine (the rope bridge goes straight across)
  left(65, 41.6),
  right(130, 41.6, { mark: 'gorgeApex' }),
  left(65, 41.6, { mark: 'gorgeB' }),
  straight(38, { mark: 'courtIn' }),
  right(90, 36, { mark: 'lastTurn' }),
  straight(60),
], { legacyMarkHeadings: true });
const m = L.marks;
// Mark positions with the true road heading (a mark at the end of an arc otherwise carries the last chord's heading):
// use the chord on the straight side of the mark, or the average across an arc-to-arc junction.
const N = L.points.length;
const chord = (i: number): number => {
  const a = L.points[(((i % N) + N) % N)];
  const b = L.points[((((i + 1) % N) + N) % N)];
  return Math.atan2(b.x - a.x, b.z - a.z);
};
const turnOf = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const P: Record<string, MarkPos> = Object.fromEntries(
  Object.entries(L.pos).map(([k, p]) => {
    const i = Math.round(m[k]);
    const hb = chord(i - 1);
    const hf = chord(i);
    const h = Math.abs(turnOf(hb, chord(i - 2))) < 0.01 ? hb : Math.abs(turnOf(hf, chord(i + 1))) < 0.01 ? hf : hb + turnOf(hf, hb) / 2;
    return [k, { ...p, heading: Math.round((h * 1800) / Math.PI) / 10 }];
  }),
);
const GROUND = -5;
const rad = (p: MarkPos): number => (p.heading * Math.PI) / 180;

// River: from the Jade Falls outside the track, across the ford and on into the jungle.
const ux = -Math.cos(rad(P.ford));
const uz = Math.sin(rad(P.ford));
const fall = { x: Math.round(P.ford.x - ux * 46), z: Math.round(P.ford.z - uz * 46) };
const river: PropPlacement[] = [0, 1, 2, 3, 4].map((k) => ({
  type: 'le_river',
  x: Math.round((fall.x + ux * (16 + 20 * k)) * 10) / 10,
  z: Math.round((fall.z + uz * (16 + 20 * k)) * 10) / 10,
  // water surface just below the ford's road surface (the jungle floor verges slope down to it)
  y: P.ford.y - 0.5,
  rot: Math.atan2(ux, uz),
}));
// The shortcut runs 4 m right of the road centre (parallel), so karts split off it quickly.
const bridge = [offset(P.gorgeA, -6, 4), between(P.gorgeA, P.gorgeB, 0.2, 4), between(P.gorgeA, P.gorgeB, 0.5, 4), between(P.gorgeA, P.gorgeB, 0.8, 4), offset(P.gorgeB, 6, 4)];

export const JADEFALL_TEMPLE: TrackData = {
  id: 'jadefall-temple',
  name: 'Jadefall Temple',
  cup: 'legend',
  theme: 'jungle',
  feature: 'Charge up the Grand Stairway over a jungle pyramid, then dodge stone balls rolling down the other side',
  width: 13,
  shoulder: 3,
  edge: 'wall',
  autoBank: 0.6,
  start: 0,
  points: L.points,
  edges: [
    // the Grand Stairway has no railings
    { from: m.climbStart + 0.3, to: m.climbTop - 0.1, side: 'both', type: 'drop' },
    // low fences at the ford so you can see the river flowing past
    { from: m.ford - 0.9, to: m.ford + 0.9, side: 'both', type: 'open' },
    { from: m.gorgeA - 1.0, to: m.gorgeA + 0.9, side: 'right', type: 'open' },
    { from: m.gorgeB - 0.9, to: m.gorgeB + 1.0, side: 'right', type: 'open' },
  ],
  zones: [{ from: m.ford - 0.8, to: m.ford + 0.8, kind: 'water' }],
  boostPads: [
    { at: m.turn1 + 0.6, offset: 0 },
    { at: m.climbStart + 0.6, offset: -0.4 },
    { at: m.climbStart + 0.6, offset: 0.4 },
    { at: m.fordOut + 0.3, offset: 0 },
    { at: m.turn5 + 0.3, offset: 0 },
  ],
  itemRows: [
    { at: m.start - 1.2 },
    { at: m.vines + 0.4, count: 4 },
    { at: m.summit + 0.5, count: 3, spread: 0.6 },
    { at: m.fordIn - 0.8 },
  ],
  ramps: [{ at: m.descentTop - 0.1, kind: 'trick', length: 6, height: 1.2 }],
  hazards: [
    { kind: 'roller', at: m.boulderRun - 4.2, offset: 0, amp: 0.62, period: 5.2, model: 'le_stone_ball', radius: 1.8 },
    { kind: 'roller', at: m.boulderRun - 1.8, offset: 0, amp: 0.62, period: 5.8, phase: 0.5, model: 'le_stone_ball', radius: 1.8 },
  ],
  shortcuts: [
    {
      points: bridge,
      width: 6,
      edge: 'drop',
      surface: 'road',
      joinFrom: m.gorgeA,
      joinTo: m.gorgeB,
      hint: 'Skip the long way round the ravine on the rope bridge! It is narrow with no railings, so line up straight before you cross.',
      aiUse: 0.65,
    },
  ],
  palette: {
    road: 0x9a8f78,
    road2: 0x918670,
    line: 0xf0e6c8,
    kerb: 0x5fae4a,
    kerb2: 0xe8dcb0,
    offroad: 0x4f9a3c,
    wall: 0x9aa08a,
    wall2: 0x6f8a5a,
    side: 0x7a6a50,
  },
  sky: {
    light: { sunDir: [0.6, 0.9, 0.1], sun: 0xfff0b0, hemiGround: 0x2a5a20, grade: 0xf4fff0 },
    top: 0x3fa8e0,
    bottom: 0xc8f0d8,
    fog: 0xb8e6c8,
    fogNear: 0.4,
    sun: 0xfff2c8,
    ambient: 0xf0ffe8,
    ground: 0x3c7a32,
    groundY: GROUND,
    backdrop: 'mountains',
    backdropColor: 0x3f8a5a,
  },
  supports: { kind: 'pillars', color: 0x9a9a84, color2: 0xa8a68e },
  scatter: [
    { types: ['le_fern_big', 'le_fern_big', 'le_banana_plant', 'le_jungle_flower', 'le_ruin_block'], density: 10, near: 1, far: 12 },
    { types: ['le_giant_tree', 'le_kapok', 'le_kapok', 'le_ruin_pillar', 'le_stone_idol', 'le_banana_plant'], density: 4, near: 9, far: 40, scale: [0.8, 1.3] },
    { types: ['le_giant_tree', 'le_kapok', 'le_giant_tree'], density: 3, near: 35, far: 80, scale: [1, 1.5] },
  ],
  props: [
    { type: 'le_temple_gate', ...offset(P.start, -45, 0), rot: rad(P.start) },
    { type: 'le_temple_gate', ...offset(P.descentTop, -6, 0), rot: rad(P.descentTop) },
    { type: 'le_pyramid', ...offset(P.climbTop, 0, 34), y: GROUND, rot: rad(P.climbTop) },
    { type: 'le_stone_idol', ...offset(P.climbStart, 2, -13), y: 0, rot: rad(P.climbStart) + Math.PI / 2, scale: 1.4 },
    { type: 'le_stone_idol', ...offset(P.climbStart, 2, 13), y: 0, rot: rad(P.climbStart) - Math.PI / 2, scale: 1.4 },
    { type: 'le_waterfall', ...fall, y: GROUND, rot: Math.atan2(ux, uz), scale: 1.2 },
    ...river,
    ...[0.3, 0.7].flatMap((t) => [0, 8].map((d): PropPlacement => ({ type: 'le_bridge_post', ...between(P.gorgeA, P.gorgeB, t, d), y: GROUND }))),
  ],
  music: 'legend2',
};
