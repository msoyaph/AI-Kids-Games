import type { PropPlacement, TrackData } from '../../types';
import { between, layout, left, offset, right, straight, type MarkPos } from '../builder';

// A glittering ice cave: race along the upper crystal gallery, dive down past a frozen waterfall into the icy
// grotto (slide the frozen-lake sweeper and the crystal slalom), climb back up under a swinging crystal chandelier,
// then weave through the S-bends and the switchback. Brave racers skip the S-bends along the Crystal Crack.
const UP = 6;
const L = layout({ x: 0, z: 0, heading: 0, y: UP }, [
  straight(110, { mark: 'start' }),
  right(100, 45, { mark: 'hall' }),
  straight(30, { mark: 'diveTop' }),
  straight(70, { y: 0, mark: 'grottoIn' }),
  left(40, 50, { mark: 'g1' }),
  right(150, 36, { mark: 'lakeApex' }),
  left(30, 50, { mark: 'g3' }),
  straight(25, { mark: 'slalom' }),
  right(45, 34),
  left(90, 30, { mark: 'slalomMid' }),
  right(45, 34, { mark: 'slalomOut' }),
  straight(56.3),
  right(90, 40, { mark: 'grottoOut' }),
  straight(44, { y: UP / 2, mark: 'swing' }),
  straight(43.9, { y: UP, mark: 'climbTop' }),
  // the S-bends wind round a crystal ridge; the Crystal Crack cuts straight through it
  left(65, 30, { mark: 'sA' }),
  right(130, 28, { mark: 'sMid' }),
  left(65, 30, { mark: 'sB' }),
  straight(20),
  right(170, 24, { mark: 'hairpin' }),
  left(80, 36, { mark: 't7' }),
  straight(60, { mark: 'finish' }),
]);
const m = L.marks;
const P = L.pos;
const GROUND = -1;
const rad = (deg: number): number => (deg * Math.PI) / 180;
/** An ice arch spanning the road `fwd` metres from a mark. */
const arch = (p: MarkPos, fwd = 0): PropPlacement => ({ type: 'cc_icearch', ...offset(p, fwd, 0), rot: rad(p.heading) });
/** A prop on the far side of the road wall at `side` metres (- = left), turned to face the road. */
const facing = (type: string, p: MarkPos, fwd: number, side: number, y = GROUND, scale = 1): PropPlacement => ({
  type,
  ...offset(p, fwd, side, y),
  rot: rad(p.heading + (side < 0 ? -90 : 90)),
  scale,
});
// The Crystal Crack runs straight from the top of the climb to the end of the S-bends.
const crackRot = Math.atan2(P.sB.x - P.climbTop.x, P.sB.z - P.climbTop.z);
const crackGate = (t: number): PropPlacement => ({ type: 'cc_crackgate', ...between(P.climbTop, P.sB, t), rot: crackRot });
// Turning centres of the big bends (the inside of a right-hander is on the right).
const hallCentre = offset(P.start, 0, 45, GROUND);
const lakeCentre = offset(P.g1, 0, 36);
const hairpinCentre = offset(P.sB, 20, 24);
const POND_Y = -0.85;
const penguin = (dx: number, dz: number, rot: number, scale = 1): PropPlacement => ({ type: 'th_penguin', x: lakeCentre.x + dx, z: lakeCentre.z + dz, y: POND_Y + 0.12, rot, scale });

export const CRYSTAL_CAVERN: TrackData = {
  id: 'crystal-cavern',
  name: 'Crystal Cavern',
  cup: 'frost',
  theme: 'icecave',
  feature: 'Dive into a glittering ice cave, slide across the frozen grotto and sneak along the narrow Crystal Crack',
  width: 13,
  shoulder: 3,
  edge: 'wall',
  autoBank: 0.5,
  start: 0.5,
  points: L.points,
  edges: [
    // gaps in the cave wall where the Crystal Crack leaves and rejoins the S-bends
    { from: m.climbTop - 0.2, to: m.climbTop + 2.4, side: 'right', type: 'open' },
    { from: m.sB - 2.4, to: m.sB + 0.2, side: 'right', type: 'open' },
  ],
  // the grotto floor is frozen solid: the lake sweeper and the crystal slalom are pure ice
  ice: [{ from: m.grottoIn - 0.3, to: m.slalomOut + 0.6 }],
  boostPads: [
    { at: m.diveTop + 0.3, offset: 0 },
    { at: m.grottoOut + 0.4, offset: 0 },
    { at: m.sB + 0.4, offset: 0 },
    { at: m.t7 + 0.6, offset: 0 },
  ],
  itemRows: [{ at: m.start - 2.2 }, { at: m.grottoIn - 0.8 }, { at: m.slalomOut + 0.6, count: 4 }, { at: m.climbTop - 0.6, count: 3 }],
  hazards: [{ kind: 'swinger', at: m.swing, amp: 0.8, period: 3.8, model: 'cc_hz_chandelier', radius: 1.6 }],
  shortcuts: [
    {
      points: [
        offset(P.climbTop, 0, 0),
        between(P.climbTop, P.sB, 0.25),
        between(P.climbTop, P.sB, 0.5),
        between(P.climbTop, P.sB, 0.75),
        offset(P.sB, 0, 0),
      ],
      width: 7.5,
      edge: 'drop',
      surface: 'ice',
      joinFrom: m.climbTop,
      joinTo: m.sB,
      hint: 'Skip the S-bends along the Crystal Crack! It is a narrow frozen ledge with no railings, so line up straight and keep your steering gentle.',
      aiUse: 0.5,
    },
  ],
  palette: {
    road: 0x5d6898,
    road2: 0x6470a0,
    line: 0xd8f4ff,
    kerb: 0x8a6cff,
    kerb2: 0xe8f6ff,
    offroad: 0x47548c,
    wall: 0xbfe6ff,
    wall2: 0x8a6cff,
    side: 0x3a4478,
  },
  sky: {
    light: { sunDir: [0.2, 1, 0.3], sun: 0xc8dcff, sunIntensity: 1.35, hemiIntensity: 1.25, hemiGround: 0x2a2060, grade: 0xe4eaff },
    top: 0x060818,
    bottom: 0x1a2656,
    fog: 0x161f4a,
    fogNear: 0.28,
    sun: 0xcfe0ff,
    ambient: 0xb8ccff,
    ground: 0x1c2550,
    groundY: GROUND,
    backdrop: 'none',
    roadSheen: 0.5,
  },
  scatter: [
    { types: ['cc_crystal', 'cc_crystal', 'th_icecrystal', 'cc_geode', 'cc_glowshroom', 'cc_lamp', 'th_snowrock'], density: 8, near: 1.2, far: 10 },
    { types: ['cc_icecliff', 'cc_spire'], density: 2, near: 9, far: 19, scale: [0.8, 1.2] },
    { types: ['cc_icecliff', 'cc_icecliff', 'cc_spire', 'cc_spire', 'cc_bigcrystal'], density: 3, near: 14, far: 42, scale: [1.1, 1.8] },
  ],
  props: [
    // the crystal gallery: ice arches over the start straight
    arch(P.finish, -30),
    arch(P.start, -60),
    arch(P.start, -20),
    { type: 'cc_bigcrystal', ...hallCentre, scale: 1.4 },
    // the Heart Crystal glows in the middle of the cavern, with a ring of smaller giants
    { type: 'cc_bigcrystal', x: -115, z: 0, y: GROUND, scale: 2.6 },
    { type: 'cc_bigcrystal', x: -92, z: 30, y: GROUND, scale: 1.5, rot: 1.2 },
    { type: 'cc_bigcrystal', x: -140, z: -28, y: GROUND, scale: 1.7, rot: 2.6 },
    { type: 'cc_bigcrystal', x: -132, z: 42, y: GROUND, scale: 1.2, rot: 4.1 },
    { type: 'cc_spire', x: -85, z: -35, y: GROUND, scale: 1.6 },
    { type: 'cc_spire', x: -160, z: 10, y: GROUND, scale: 1.9, rot: 0.8 },
    // dive into the grotto past a frozen waterfall
    arch(P.grottoIn, 0),
    facing('cc_icefall', P.grottoIn, -25, -33),
    // the frozen pond inside the lake sweeper, with penguin spectators
    { type: 'cc_frozenpond', ...lakeCentre, y: POND_Y },
    penguin(-4, 3, 0.5),
    penguin(-2.5, 4.5, 2.2, 0.8),
    penguin(5, -6, 4),
    facing('cc_bigcrystal', P.lakeApex, -30, -34, GROUND, 1.3),
    // the climb out of the grotto: a second frozen waterfall and the swinging chandelier's arch
    facing('cc_icefall', P.swing, -20, -32, GROUND, 1.1),
    arch(P.swing, 0),
    // the Crystal Crack: gates over the ledge and crystal giants on both sides
    crackGate(0.3),
    crackGate(0.7),
    { type: 'cc_bigcrystal', ...between(P.climbTop, P.sB, 0.5, -16, 2.5), scale: 0.9, rot: 0.4 },
    { type: 'cc_bigcrystal', ...between(P.climbTop, P.sB, 0.42, 15, GROUND), scale: 1.2, rot: 2 },
    { type: 'cc_spire', ...between(P.climbTop, P.sB, 0.62, 13, GROUND), scale: 1.2 },
    // a crystal cluster inside the switchback
    { type: 'cc_bigcrystal', ...hairpinCentre, y: 1, scale: 1.0, rot: 3 },
  ],
  music: 'frost2',
};
