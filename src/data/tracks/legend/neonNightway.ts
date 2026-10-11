import type { PropPlacement, TrackData, TrackPoint } from '../../types';
import { between, layout, left, offset, right, straight, type MarkPos } from '../builder';

// A glowing figure-eight through a city at night: street-level blocks, then a pillar-held skyway that
// soars OVER the start straight, a neon girder jump shortcut, and a long sweeping descent back to the streets.
const L = layout({ x: 0, z: 0, heading: 45, y: 0, w: 13 }, [
  // --- street level: start straight runs under the skyway (a little narrower right under the bridge)
  straight(48),
  straight(25, { w: 12, mark: 'xLow' }),
  straight(25, { w: 13 }),
  straight(60, { mark: 'a0' }),
  left(90, 34, { mark: 'turnA1' }),
  straight(8.6),
  right(40, 40, { mark: 'chicane' }),
  left(40, 40),
  straight(25),
  left(90, 27, { mark: 'turnA2' }),
  straight(74.7, { mark: 'discoRun' }),
  left(90, 36, { y: 2, mark: 'turnA3' }),
  // --- climb onto the skyway and fly over the start straight
  straight(80, { y: 8, mark: 'climbTop' }),
  straight(30, { mark: 'xHigh' }),
  straight(91, { mark: 'skyOut' }),
  right(90, 50, { y: 10, mark: 'sweep' }),
  straight(15, { mark: 'bumpA' }),
  left(70, 32),
  right(140, 32, { mark: 'bumpApex' }),
  left(70, 32, { mark: 'bumpB' }),
  straight(14.7),
  right(90, 27, { mark: 'hairpin' }),
  // --- sweeping descent back to the street
  straight(70, { y: 4, mark: 'descent' }),
  right(90, 44, { y: 0, mark: 'lastTurn' }),
  straight(110, { mark: 'finish' }),
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
const rad = (p: MarkPos): number => (p.heading * Math.PI) / 180;
const GROUND = -0.2;

/** Deterministic city blocks: towers on a jittered grid, kept well clear of every road. */
function cityBlocks(roads: TrackPoint[][], closed: boolean[], minD: number, maxD: number, step: number): PropPlacement[] {
  const types = ['le_neon_tower', 'le_neon_tower2', 'le_neon_tower3'];
  let seed = 1234567;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const segDist = (x: number, z: number): number => {
    let best = Infinity;
    roads.forEach((pts, r) => {
      const n = pts.length;
      for (let i = 0; i < (closed[r] ? n : n - 1); i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
        best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
      }
    });
    return best;
  };
  const xs = roads[0].map((p) => p.x);
  const zs = roads[0].map((p) => p.z);
  const out: PropPlacement[] = [];
  for (let x = Math.min(...xs) - maxD; x <= Math.max(...xs) + maxD; x += step) {
    for (let z = Math.min(...zs) - maxD; z <= Math.max(...zs) + maxD; z += step) {
      const px = x + (rnd() - 0.5) * step * 0.4;
      const pz = z + (rnd() - 0.5) * step * 0.4;
      const type = types[Math.floor(rnd() * types.length)];
      const scale = 0.75 + rnd() * 0.5;
      const rot = Math.floor(rnd() * 4) * (Math.PI / 2) + 0.1;
      const d = segDist(px, pz);
      if (d < minD || d > maxD) continue;
      out.push({ type, x: Math.round(px), z: Math.round(pz), y: GROUND, rot, scale: Math.round(scale * 100) / 100 });
    }
  }
  return out;
}

// The shortcut runs 4 m right of the road centre (parallel), so karts split off it quickly.
const girder = [offset(P.bumpA, -6, 4), between(P.bumpA, P.bumpB, 0.2, 4), between(P.bumpA, P.bumpB, 0.5, 4), between(P.bumpA, P.bumpB, 0.8, 4), offset(P.bumpB, 6, 4)];
const arch = (p: MarkPos, fwd: number): PropPlacement => ({ type: 'le_neon_arch', ...offset(p, fwd, 0), rot: rad(p) });

export const NEON_NIGHTWAY: TrackData = {
  id: 'neon-nightway',
  name: 'Neon Nightway',
  cup: 'legend',
  theme: 'neon',
  feature: 'A glowing figure-eight where the pillar-held skyway roars right over the start straight',
  width: 13,
  shoulder: 1,
  edge: 'wall',
  verge: false,
  autoBank: 0.5,
  // start line placed so the skyway pillars stand either side of the street (not on it)
  start: 0.72,
  points: L.points,
  edges: [
    // skyway straights and the descent have no railings
    { from: m.xHigh + 1.4, to: m.skyOut, side: 'both', type: 'drop' },
    { from: m.bumpA - 1.0, to: m.bumpA + 0.9, side: 'right', type: 'open' },
    { from: m.bumpB - 0.9, to: m.bumpB + 1.0, side: 'right', type: 'open' },
    { from: m.hairpin + 0.3, to: m.descent, side: 'both', type: 'drop' },
  ],
  boostPads: [
    { at: m.turnA1 + 0.7, offset: -0.45 },
    { at: m.turnA1 + 0.7, offset: 0.45 },
    { at: m.turnA3 + 1.2, offset: 0 },
    { at: m.hairpin + 0.6, offset: 0 },
  ],
  itemRows: [
    { at: m.xLow + 1.6 },
    { at: m.turnA2 + 0.9, count: 4 },
    { at: m.skyOut - 1.4, count: 3, spread: 0.6 },
    { at: m.lastTurn + 1.6 },
  ],
  ramps: [{ at: m.descent - 0.9, kind: 'trick', offset: -0.45, width: 5, length: 6, height: 1.3 }],
  hazards: [
    { kind: 'roller', at: m.discoRun - 1.6, offset: 0, amp: 0.62, period: 4.6, model: 'le_disco_ball', radius: 1.9 },
    { kind: 'bumper', at: m.chicane - 0.4, offset: 0.42, model: 'le_neon_bumper', radius: 1.4 },
    { kind: 'bumper', at: m.chicane + 0.9, offset: -0.42, model: 'le_neon_bumper', radius: 1.4 },
  ],
  shortcuts: [
    {
      points: girder,
      width: 6.5,
      edge: 'drop',
      surface: 'road',
      joinFrom: m.bumpA,
      joinTo: m.bumpB,
      boostPads: [{ at: 1.15, offset: 0 }],
      ramps: [{ at: 1.92, kind: 'trick', length: 5, height: 1.0 }],
      gaps: [{ from: 1.96, to: 2.16 }],
      hint: 'Skip the swerve on the neon girder! Hit the boost, jump the gap at full speed — and stay in the middle, there are no railings.',
      aiUse: 0.7,
    },
  ],
  palette: {
    road: 0x2b2a40,
    road2: 0x33314d,
    line: 0x22e8ff,
    kerb: 0xff2bd6,
    kerb2: 0x22e8ff,
    offroad: 0x3a2f5c,
    wall: 0xff2bd6,
    wall2: 0x22e8ff,
    side: 0x4a4370,
  },
  sky: {
    light: { sunDir: [0.3, 1, -0.5], sun: 0xd0a0ff, hemiGround: 0x401860, grade: 0xf4e8ff }, roadSheen: 0.85,
    top: 0x0a0620,
    bottom: 0x3a1a5c,
    fog: 0x2a1648,
    fogNear: 0.5,
    sun: 0xc8b4ff,
    ambient: 0xd8ccff,
    ground: 0x1a1730,
    groundY: GROUND,
    backdrop: 'skyline',
    backdropColor: 0x3b2a6e,
    night: true,
  },
  supports: { kind: 'pillars', color: 0x4a4370, color2: 0xff2bd6 },
  scatter: [
    { types: ['le_neon_lamp', 'le_neon_lamp', 'le_neon_bollard', 'le_vending', 'le_neon_palm'], density: 9, near: 1.2, far: 7 },
    { types: ['le_neon_sign', 'le_neon_palm', 'le_neon_lamp'], density: 3, near: 6, far: 14 },
  ],
  props: [
    arch(P.xLow, -40),
    arch(P.a0, -30),
    arch(P.discoRun, -62),
    arch(P.lastTurn, 45),
    { type: 'le_neon_wheel', x: 285, z: 40, y: GROUND, rot: 1.2, scale: 1.2 },
    { type: 'le_neon_sign', ...offset(P.climbTop, 0, -16), y: GROUND, rot: rad(P.climbTop) + Math.PI, scale: 1.6 },
    ...[0.15, 0.36, 0.64, 0.85].map((t): PropPlacement => ({ type: 'le_neon_pylon', ...between(P.bumpA, P.bumpB, t, 4), y: GROUND, rot: rad(P.bumpA), scale: 1.35 })),
    ...cityBlocks([L.points, girder], [true, false], 24, 110, 30),
  ],
  music: 'legend1',
};
