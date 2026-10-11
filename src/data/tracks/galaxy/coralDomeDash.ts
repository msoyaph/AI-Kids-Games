import type { PropPlacement, TrackData } from '../../types';
import { between, layout, left, offset, right, straight, type MarkPos } from '../builder';

// An undersea figure-eight: race out of a glass dome hub, through kelp and coral, up into a glass tube that
// crosses right over the start straight, and skip the sunken-ship swerve across the wreck's deck.
const L = layout({ x: 0, z: 0, heading: 0, y: 0 }, [
  straight(130, { mark: 'startStraight' }),
  right(90, 44, { mark: 't1' }),
  straight(30, { mark: 'kelpIn' }),
  right(90, 36, { y: 1.5, mark: 'kelp' }),
  straight(20, { y: 3 }),
  right(90, 40, { y: 7, mark: 'tubeIn' }),
  straight(40, { mark: 'tubeA' }),
  left(25, 90, { mark: 's1' }),
  right(25, 90, { mark: 's2' }),
  right(25, 90, { mark: 'tubeMid' }),
  left(25, 90, { mark: 'tubeB' }),
  straight(35, { mark: 'tubeOut' }),
  left(90, 40, { y: 4, mark: 'tubeExit' }),
  straight(34, { y: 0, mark: 'dive' }),
  left(70, 28),
  right(140, 26, { mark: 'coral' }),
  left(70, 28, { mark: 'coralOut' }),
  left(90, 34, { mark: 't5' }),
  straight(15, { mark: 'shipA' }),
  right(20, 28, { mark: 'scA' }),
  right(40, 28),
  left(120, 28, { mark: 'ship' }),
  right(40, 28, { mark: 'scB' }),
  right(20, 28, { mark: 'shipB' }),
  straight(15),
  left(90, 36, { mark: 't6' }),
  straight(95, { mark: 'finish' }),
], { legacyMarkHeadings: true });
const m = L.marks;
const P = L.pos;
const GY = -0.5;
const rad = (deg: number): number => (deg * Math.PI) / 180;
/** A glass-tube rib `fwd` metres from a mark (follows the mark's heading). */
const rib = (p: MarkPos, fwd = 0): PropPlacement => ({ type: 'ga_tubering', ...offset(p, fwd, 0), rot: rad(p.heading) });
const arch = (p: MarkPos, fwd = 0): PropPlacement => ({ type: 'ga_hubarch', ...offset(p, fwd, 0, GY), rot: rad(p.heading) });
const deckY = 1.8;

export const CORAL_DOME_DASH: TrackData = {
  id: 'coral-dome-dash',
  name: 'Coral Dome Dash',
  cup: 'galaxy',
  theme: 'underwater',
  feature: 'An undersea figure-eight: swim through kelp and coral, then zoom through a glass tube right over the start line',
  width: 14,
  shoulder: 5,
  edge: 'open',
  autoBank: 0.5,
  start: 0.5,
  points: L.points,
  zones: [
    { from: m.t1 - 0.6, to: m.tubeIn - 1.2, kind: 'water', surface: false },
    { from: m.tubeExit - 0.2, to: m.t6 + 0.4, kind: 'water', surface: false },
  ],
  edges: [
    { from: m.kelp + 0.6, to: m.tubeExit, side: 'both', type: 'wall' },
    { from: m.tubeExit + 0.3, to: m.dive + 0.4, side: 'both', type: 'drop' },
    { from: m.t6 + 0.5, to: m.startStraight - 0.3, side: 'both', type: 'wall' },
  ],
  boostPads: [
    { at: m.tubeIn + 0.5, offset: 0 },
    { at: m.coralOut + 0.4, offset: 0.35 },
    { at: m.shipB + 0.6, offset: 0 },
  ],
  itemRows: [{ at: m.startStraight - 2.2 }, { at: m.tubeA - 0.6, count: 4 }, { at: m.t5 + 0.4 }, { at: m.finish - 2.2, count: 3 }],
  ramps: [{ at: m.dive - 0.4, kind: 'trick', length: 6, height: 1.4 }],
  hazards: [
    { kind: 'roller', at: m.tubeB + 0.7, offset: 0, amp: 0.7, period: 4.2, model: 'ga_hz_urchin', radius: 1.7 },
    { kind: 'bumper', at: m.coral - 0.9, offset: -0.45, model: 'ga_hz_puffer', radius: 1.5 },
    { kind: 'bumper', at: m.coral + 0.9, offset: 0.45, model: 'ga_hz_puffer', radius: 1.5 },
  ],
  shortcuts: [
    {
      points: [
        between(P.scA, P.scB, 0),
        between(P.scA, P.scB, 0.2),
        between(P.scA, P.scB, 0.33, 0, deckY),
        between(P.scA, P.scB, 0.58, 0, deckY),
        between(P.scA, P.scB, 0.75, 0, 0.3),
        between(P.scA, P.scB, 1),
      ],
      width: 6.5,
      edge: 'drop',
      surface: 'road',
      joinFrom: m.scA,
      joinTo: m.scB,
      ramps: [{ at: 3, kind: 'trick', length: 5, height: 1.2 }],
      gaps: [{ from: 3.03, to: 3.7 }],
      hint: 'Drive up onto the sunken ship and jump off its broken deck! The deck is narrow with no railings, so line up straight.',
      aiUse: 0.6,
    },
  ],
  palette: {
    road: 0x4a6f8a,
    road2: 0x527894,
    line: 0xd6fbff,
    kerb: 0xff7eb6,
    kerb2: 0xffffff,
    offroad: 0xe8d6a0,
    wall: 0xbff3ff,
    wall2: 0x3fd0c9,
    side: 0x6c8fa8,
  },
  sky: {
    light: { sunDir: [0, 1, 0.2], sun: 0x9fe8ff, hemiGround: 0x206080, grade: 0xe0f8ff },
    top: 0x0b3d6b,
    bottom: 0x2a9fd6,
    fog: 0x1f8ac0,
    fogNear: 0.3,
    sun: 0xbfefff,
    ambient: 0xcff6ff,
    ground: 0xe6d3a3,
    groundY: GY,
    backdrop: 'dunes',
    backdropColor: 0x2f7fa8,
  },
  supports: { kind: 'pillars', color: 0x8fb6d8, color2: 0x9fe8ff },
  scatter: [
    { types: ['ga_coral', 'ga_fancoral', 'ga_braincoral', 'ga_seagrass', 'ga_seagrass', 'ga_clam', 'ga_anemone', 'ga_bubbles'], density: 9, near: 2, far: 22 },
    { types: ['ga_kelp', 'ga_kelp', 'ga_fish', 'ga_jelly', 'ga_turtle', 'ga_coral'], density: 4, near: 14, far: 50, scale: [0.9, 1.5] },
  ],
  props: [
    { type: 'ga_domehub', ...offset(P.finish, -20, -90, GY), scale: 1.1 },
    // the wreck sits under the shortcut: its deck (2.4 m tall at scale 1) lines up just below the shortcut road
    { type: 'ga_sunkenship', ...between(P.scA, P.scB, 0.47, 0, deckY - 2.15), rot: Math.atan2(P.scB.x - P.scA.x, P.scB.z - P.scA.z), scale: 0.85 },
    arch(P.startStraight, -120),
    arch(P.startStraight, -95),
    arch(P.finish, -60),
    arch(P.finish, -30),
    rib(P.tubeIn, 4),
    rib(P.tubeIn, 22),
    rib(P.tubeA),
    rib(P.s2),
    rib(P.tubeMid),
    rib(P.tubeB),
    rib(P.tubeB, 18),
    rib(P.tubeOut),
    { type: 'ga_kelp', ...offset(P.kelp, 0, 22, GY), scale: 1.6 },
    { type: 'ga_kelp', ...offset(P.kelp, -12, 26, GY), scale: 1.3 },
    { type: 'ga_jelly', ...offset(P.coral, 0, -24, GY), scale: 1.5 },
    { type: 'ga_turtle', ...offset(P.tubeMid, 0, 30, GY), scale: 1.6 },
  ],
  music: 'galaxy2',
};
