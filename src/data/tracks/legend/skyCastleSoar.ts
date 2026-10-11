import type { PropPlacement, TrackData, TrackPoint } from '../../types';
import { between, layout, left, offset, right, straight, type MarkPos } from '../builder';

// A castle floating above the clouds: golden gates, a climb up the west wing rampart, a glider leap across
// the sky to the east wing, and a soft (but slow) cloud-bank shortcut with nothing to stop you falling off.
const L = layout({ x: 0, z: 0, heading: 0, y: 0 }, [
  straight(45, { mark: 'start' }),
  left(35, 45, { mark: 'gateA' }),
  right(70, 45, { mark: 'gate' }),
  left(35, 45, { mark: 'gateB' }),
  straight(73.8, { mark: 'gateOut' }),
  right(90, 36, { mark: 'turn1' }),
  straight(100, { y: 10, mark: 'climb' }),
  straight(40, { y: 14, mark: 'rampart' }),
  straight(10, { mark: 'lip' }),
  // the glider leap between the castle wings (the road under the gap is not there!)
  straight(45, { y: 12, mark: 'gapEnd' }),
  straight(55, { mark: 'landing' }),
  right(180, 28, { mark: 'towerHairpin' }),
  straight(20),
  left(90, 40, { mark: 'turn3' }),
  straight(45, { mark: 'bankA' }),
  left(75, 36, { y: 11 }),
  right(150, 36, { y: 9, mark: 'bankApex' }),
  left(75, 36, { y: 8, mark: 'bankB' }),
  straight(30, { y: 6, mark: 'bankOut' }),
  right(90, 38, { mark: 'turn4' }),
  straight(20, { mark: 'essesIn' }),
  left(40, 40, { mark: 'esses1' }),
  right(80, 40, { y: 4, mark: 'esses2' }),
  left(40, 40, { mark: 'esses3' }),
  straight(25, { y: 0, mark: 'bellOut' }),
  right(90, 40, { markStart: 'lastIn', mark: 'lastTurn' }),
  straight(50, { mark: 'finish' }),
]);
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
const rad = (p: MarkPos): number => (p.heading * Math.PI) / 180;
const SEA = -32;

/** Floating scenery: towers on little islands and cloud puffs beside the road, plus a sea of clouds far below. */
function skyScenery(pts: TrackPoint[], avoid: TrackPoint[][]): PropPlacement[] {
  let seed = 424242;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const near = (x: number, z: number): number => {
    let best = Infinity;
    for (const road of [pts, ...avoid]) {
      const n = road.length;
      for (let i = 0; i < n - (road === pts ? 0 : 1); i++) {
        const a = road[i];
        const b = road[(i + 1) % n];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
        best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
      }
    }
    return best;
  };
  const out: PropPlacement[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i += 2) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const hx = b.x - a.x;
    const hz = b.z - a.z;
    const hl = Math.hypot(hx, hz) || 1;
    const rx = -hz / hl;
    const rz = hx / hl;
    const side = (i / 2) % 2 ? 1 : -1;
    const y = a.y ?? 0;
    // something beside the road
    const tower = rnd() < 0.45;
    const lat = tower ? 24 + rnd() * 16 : 15 + rnd() * 20;
    const x = a.x + rx * lat * side;
    const z = a.z + rz * lat * side;
    if (near(x, z) > (tower ? 19 : 12)) {
      const type = tower ? (rnd() < 0.5 ? 'le_castle_tower' : 'le_castle_tower2') : rnd() < 0.6 ? 'le_cloud_puff' : 'le_cloud_puff2';
      out.push({ type, x: Math.round(x), z: Math.round(z), y: Math.round(tower ? y - 6 - rnd() * 6 : y - 4 - rnd() * 8), rot: rnd() * 6.28, scale: Math.round((0.8 + rnd() * 0.5) * 100) / 100 });
    }
    // the sea of clouds far below
    const fx = a.x + rx * (30 + rnd() * 60) * -side;
    const fz = a.z + rz * (30 + rnd() * 60) * -side;
    out.push({ type: rnd() < 0.7 ? 'le_cloud_puff' : 'le_cloud_puff2', x: Math.round(fx), z: Math.round(fz), y: SEA + Math.round(rnd() * 6), rot: rnd() * 6.28, scale: Math.round((2 + rnd() * 2) * 10) / 10 });
  }
  return out;
}

// The shortcut runs 4 m right of the road centre (parallel), so karts split off it quickly.
const bank = [offset(P.bankA, -6, 4), between(P.bankA, P.bankB, 0.2, 4), between(P.bankA, P.bankB, 0.5, 4), between(P.bankA, P.bankB, 0.8, 4), offset(P.bankB, 6, 4)];
const gate = (p: MarkPos, fwd: number): PropPlacement => ({ type: 'le_golden_gate', ...offset(p, fwd, 0), rot: rad(p) });
const banner = (p: MarkPos, fwd: number, side: number): PropPlacement => ({ type: 'le_banner', ...offset(p, fwd, side * 8.6), rot: rad(p) + (side > 0 ? 0 : Math.PI) });

export const SKY_CASTLE_SOAR: TrackData = {
  id: 'sky-castle-soar',
  name: 'Sky Castle Soar',
  cup: 'legend',
  theme: 'cloudcastle',
  feature: 'Glide from one castle wing to the other high above a sea of clouds',
  width: 13,
  shoulder: 2,
  edge: 'drop',
  autoBank: 0.6,
  start: 0,
  points: L.points,
  edges: [
    // railings on the inside of the big corners, the landing battlements, the cloud-bank swerve and the bell esses;
    // everything else is open sky
    { from: m.gateB + 0.6, to: m.turn1 + 0.3, side: 'right', type: 'wall' },
    { from: m.gapEnd, to: m.towerHairpin + 0.3, side: 'both', type: 'wall' },
    { from: m.towerHairpin + 0.3, to: m.turn3 + 0.3, side: 'left', type: 'wall' },
    { from: m.bankA - 0.6, to: m.bankB + 0.6, side: 'left', type: 'wall' },
    { from: m.bankA + 0.9, to: m.bankB - 0.9, side: 'right', type: 'wall' },
    { from: m.bankA - 1.0, to: m.bankA + 0.9, side: 'right', type: 'open' },
    { from: m.bankB - 0.9, to: m.bankB + 1.0, side: 'right', type: 'open' },
    { from: m.bankOut - 0.8, to: m.essesIn, side: 'right', type: 'wall' },
    { from: m.esses1 - 0.6, to: m.esses3 + 0.4, side: 'both', type: 'wall' },
    { from: m.lastIn - 0.4, to: m.lastTurn + 0.3, side: 'right', type: 'wall' },
  ],
  gaps: [{ from: m.lip + 0.12, to: m.gapEnd - 0.05 }],
  ramps: [{ at: m.lip, kind: 'glider', length: 9, height: 2.2 }],
  boostPads: [
    { at: m.turn1 + 0.5, offset: -0.35 },
    { at: m.turn1 + 0.5, offset: 0.35 },
    { at: m.rampart - 0.6, offset: 0 },
    { at: m.turn4 + 0.4, offset: 0 },
    { at: m.lastTurn + 0.4, offset: 0 },
  ],
  itemRows: [
    { at: m.start - 1.0 },
    { at: m.climb - 1.5, count: 4 },
    { at: m.landing - 0.4, count: 4 },
    { at: m.turn3 + 0.5, count: 4 },
  ],
  hazards: [
    { kind: 'swinger', at: m.esses2 - 0.2, amp: 0.8, period: 3.6, model: 'le_bell', radius: 1.6 },
    { kind: 'geyser', at: m.bankOut - 0.4, offset: 0.35, period: 4.2, model: 'le_wind_vent', radius: 2.4 },
  ],
  shortcuts: [
    {
      points: bank,
      width: 7,
      edge: 'drop',
      surface: 'offroad',
      joinFrom: m.bankA,
      joinTo: m.bankB,
      boostPads: [{ at: 0.9, offset: 0 }],
      hint: 'Cut straight across the cloud bank! Fluffy clouds slow you down, so grab the wind boost or fire a Turbo — and stay away from the edges.',
      aiUse: 1,
    },
  ],
  palette: {
    road: 0xc9c2e8,
    road2: 0xd2cbef,
    line: 0xffffff,
    kerb: 0xffc83d,
    kerb2: 0xffffff,
    offroad: 0xf6f8ff,
    wall: 0xffffff,
    wall2: 0xffc83d,
    side: 0x9a8fb8,
  },
  sky: {
    top: 0x4a90ff,
    bottom: 0xffd9ef,
    fog: 0xf3e6ff,
    fogNear: 0.45,
    sun: 0xfff6e0,
    ambient: 0xfff8ff,
    ground: null,
    groundY: SEA,
    backdrop: 'clouds',
    backdropColor: 0xffffff,
  },
  supports: { kind: 'rock', color: 0x8a7f99, color2: 0x9d93ad },
  props: [
    gate(P.start, -20),
    gate(P.gate, 0),
    { type: 'le_golden_gate', ...between(P.bankB, P.bankOut, 0.5), rot: Math.atan2(P.bankOut.x - P.bankB.x, P.bankOut.z - P.bankB.z) },
    { type: 'le_keep', ...offset(P.turn1, 0, 70), y: -12, rot: 0.4 },
    { type: 'le_castle_hall', ...offset(P.rampart, -10, -17), y: 6, rot: rad(P.rampart) },
    { type: 'le_castle_hall', ...offset(P.landing, -12, 17), y: 4, rot: rad(P.landing) },
    { type: 'le_castle_tower', ...offset(P.lip, 3, -11), y: 2 },
    { type: 'le_castle_tower2', ...offset(P.lip, 3, 11), y: 2 },
    { type: 'le_castle_tower2', ...offset(P.gapEnd, -2, -11), y: 0 },
    { type: 'le_castle_tower', ...offset(P.gapEnd, -2, 11), y: 0 },
    { type: 'le_sky_balloon', ...between(P.lip, P.gapEnd, 0.5, 26), y: 20, scale: 1.4 },
    { type: 'le_sky_balloon', ...offset(P.bankApex, 0, 40), y: 16 },
    { type: 'le_float_island', ...between(P.bankA, P.bankB, 0.5, -16), y: 2 },
    banner(P.start, -35, 1),
    banner(P.start, -35, -1),
    banner(P.turn1, 30, 1),
    banner(P.turn1, 30, -1),
    banner(P.gateOut, -15, 1),
    banner(P.gateOut, -15, -1),
    ...skyScenery(L.points, [bank]),
  ],
  music: 'legend3',
};
