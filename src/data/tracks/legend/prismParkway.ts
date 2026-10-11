import type { PropPlacement, TrackData, TrackPoint } from '../../types';
import { between, layout, left, offset, right, straight, type MarkPos } from '../builder';

// The grand finale: a shimmering crystal highway hung in deep space. Zig-zag up the Prism Spire switchbacks,
// glide the Comet Leap, bounce through the crystal canyon, hop the nebula gap — and dare the Starlight glider shortcut.
const L = layout({ x: 0, z: 0, heading: 0, y: 0 }, [
  straight(30, { mark: 'start' }),
  right(90, 40, { markStart: 'turn1In', mark: 'turn1' }),
  straight(100, { y: 2, mark: 'leg1' }),
  right(180, 30, { y: 6, mark: 'switch1' }),
  straight(50, { y: 10, mark: 'leg2' }),
  left(180, 30, { y: 16, mark: 'switch2' }),
  straight(30, { y: 18, mark: 'spireTop' }),
  straight(10, { mark: 'cometLip' }),
  // Comet Leap: glide across the void to a lower crystal platform
  straight(45, { y: 15, mark: 'cometGapEnd' }),
  straight(55, { mark: 'cometLanding' }),
  right(90, 40, { markStart: 'turn4In', mark: 'turn4' }),
  straight(50, { mark: 'canyonIn' }),
  left(45, 36, { mark: 'canyon1' }),
  right(90, 30, { mark: 'canyon2' }),
  left(45, 36, { mark: 'canyon3' }),
  right(90, 40, { y: 13, mark: 'turn5' }),
  straight(55, { y: 12, mark: 'alley' }),
  straight(10, { mark: 'hopLip' }),
  // Nebula Hop: a shorter glide
  straight(40, { y: 10, mark: 'hopGapEnd' }),
  straight(85, { mark: 'hopLanding' }),
  right(90, 40, { markStart: 'finalIn', mark: 'finalTurn' }),
  straight(50, { mark: 'starA' }),
  // the road swings out around the Starlight shortcut (a glider leap straight across)
  left(70, 38, { y: 7 }),
  right(140, 38, { y: 4, mark: 'starApex' }),
  left(70, 38, { y: 1, mark: 'starB' }),
  straight(40.5, { y: 0 }),
]);
const m = L.marks;
// Mark positions with the true road heading (a mark at the end of an arc otherwise carries the last chord's heading):
// use the chord on the straight side of the mark, or the average across an arc-to-arc junction.
const N = L.points.length;
const chord = (i: number): number => {
  const a = L.points[((i % N) + N) % N];
  const b = L.points[(((i + 1) % N) + N) % N];
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
const VOID = -40;

/** Floating space scenery: crystal clusters, asteroids and glow buoys beside the road, nebulae far below. */
function spaceScenery(pts: TrackPoint[], avoid: TrackPoint[][]): PropPlacement[] {
  let seed = 777123;
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
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const hl = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const rx = -(b.z - a.z) / hl;
    const rz = (b.x - a.x) / hl;
    const y = a.y ?? 0;
    for (const side of [-1, 1]) {
      const r = rnd();
      if (r < 0.35) {
        // glow buoys line the road at kart height
        const lat = 10.5 + rnd() * 2;
        const x = a.x + rx * lat * side;
        const z = a.z + rz * lat * side;
        if (near(x, z) > 9.5) out.push({ type: 'le_star_buoy', x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, y: Math.round((y + 2.5) * 10) / 10, rot: rnd() * 6.28 });
      } else if (r < 0.75) {
        const crystal = rnd() < 0.6;
        const lat = 18 + rnd() * 22;
        const x = a.x + rx * lat * side;
        const z = a.z + rz * lat * side;
        if (near(x, z) > 14) out.push({ type: crystal ? 'le_crystal_cluster' : 'le_asteroid', x: Math.round(x), z: Math.round(z), y: Math.round(y - 3 - rnd() * 8), rot: rnd() * 6.28, scale: Math.round((0.9 + rnd() * 0.8) * 100) / 100 });
      }
    }
    if (i % 3 === 0) {
      const lat = 50 + rnd() * 70;
      const s = rnd() < 0.5 ? 1 : -1;
      out.push({ type: 'le_nebula_puff', x: Math.round(a.x + rx * lat * s), z: Math.round(a.z + rz * lat * s), y: VOID + Math.round(rnd() * 15), rot: rnd() * 6.28, scale: Math.round((1 + rnd() * 1.2) * 10) / 10 });
    }
  }
  return out;
}

// Starlight shortcut: it runs 3 m right of the road centre so it splits off quickly; the glider ramp and gap start
// only once it is well clear of the main road (whose railing would otherwise block a gliding kart).
const starlight: TrackPoint[] = [
  { ...offset(P.starA, -6, 3), w: 6 },
  { ...between(P.starA, P.starB, 0.25, 3, P.starA.y), w: 6 },
  { ...between(P.starA, P.starB, 0.5, 2, 7), w: 7 },
  { ...between(P.starA, P.starB, 0.78, 3, 5), w: 9 },
  { ...offset(P.starB, 6, 3), w: 9 },
];
const ring = (p: MarkPos, fwd: number, lift = 3): PropPlacement => ({ type: 'le_prism_ring', ...offset(p, fwd, 0), y: p.y + lift, rot: rad(p) });

export const PRISM_PARKWAY: TrackData = {
  id: 'prism-parkway',
  name: 'Prism Parkway',
  cup: 'legend',
  theme: 'rainbow',
  feature: 'A crystal highway in deep space: zig-zag up the Prism Spire, then glide the Comet Leap and the Nebula Hop',
  width: 13,
  shoulder: 2,
  edge: 'drop',
  autoBank: 0.6,
  start: 0,
  points: L.points,
  edges: [
    // crystal railings on the insides of corners, the hairpins, the landing pads and the bumper canyon
    { from: m.turn1In - 0.4, to: m.turn1 + 0.3, side: 'right', type: 'wall' },
    { from: m.leg1 - 0.3, to: m.switch1 + 0.3, side: 'both', type: 'wall' },
    { from: m.leg2 - 0.3, to: m.switch2 + 0.3, side: 'both', type: 'wall' },
    { from: m.cometGapEnd, to: m.turn4 + 0.3, side: 'both', type: 'wall' },
    { from: m.canyonIn - 1.2, to: m.turn5 + 0.3, side: 'both', type: 'wall' },
    { from: m.hopGapEnd, to: m.hopGapEnd + 2.2, side: 'both', type: 'wall' },
    { from: m.finalIn - 0.4, to: m.finalTurn + 0.3, side: 'right', type: 'wall' },
    { from: m.starA - 0.6, to: m.starB + 0.6, side: 'left', type: 'wall' },
    { from: m.starA + 0.9, to: m.starB - 0.9, side: 'right', type: 'wall' },
    { from: m.starA - 1.0, to: m.starA + 0.9, side: 'right', type: 'open' },
    { from: m.starB - 0.9, to: m.starB + 1.0, side: 'right', type: 'open' },
  ],
  gaps: [
    { from: m.cometLip + 0.12, to: m.cometGapEnd - 0.05 },
    { from: m.hopLip + 0.12, to: m.hopGapEnd - 0.05 },
  ],
  ramps: [
    { at: m.cometLip, kind: 'glider', length: 9, height: 2.2 },
    { at: m.hopLip, kind: 'glider', length: 8, height: 1.8 },
  ],
  boostPads: [
    { at: m.switch1 + 0.5, offset: 0 },
    { at: m.switch2 + 0.5, offset: -0.35 },
    { at: m.switch2 + 0.5, offset: 0.35 },
    { at: m.turn4 + 0.5, offset: 0 },
    { at: m.alley - 1.2, offset: 0 },
  ],
  itemRows: [
    { at: m.start - 1.0 },
    { at: m.leg2 - 1.4, count: 4 },
    { at: m.canyonIn - 1.6, count: 4 },
    { at: m.hopLanding - 1.5, count: 4 },
  ],
  hazards: [
    { kind: 'bumper', at: m.canyon1 - 0.3, offset: 0.45, model: 'le_crystal_bumper', radius: 1.4 },
    { kind: 'bumper', at: m.canyon2 + 0.1, offset: -0.4, model: 'le_crystal_bumper', radius: 1.4 },
    { kind: 'bumper', at: m.canyon3 + 0.4, offset: 0.4, model: 'le_crystal_bumper', radius: 1.4 },
  ],
  shortcuts: [
    {
      points: starlight,
      width: 6,
      edge: 'drop',
      surface: 'road',
      joinFrom: m.starA,
      joinTo: m.starB,
      ramps: [{ at: 1.12, kind: 'glider', length: 7, height: 2.2 }],
      gaps: [{ from: 1.18, to: 2.84 }],
      hint: 'The Starlight Shortcut: hit the narrow glider ramp dead straight and soar across the stars to the landing pad!',
      aiUse: 0.6,
    },
  ],
  palette: {
    road: 0x4a3fc0,
    road2: 0x2f8fc8,
    line: 0xffffff,
    kerb: 0xff5fd2,
    kerb2: 0xffe14d,
    offroad: 0x7a6cff,
    wall: 0x4dfff0,
    wall2: 0xff7ae0,
    side: 0x2a1f6a,
  },
  sky: {
    light: { sunDir: [0.4, 1, 0.4], sun: 0xe0d8ff, hemiGround: 0x281850 }, roadSheen: 0.6,
    top: 0x05031a,
    bottom: 0x2a0f5a,
    fog: 0x1c0d40,
    fogNear: 0.55,
    sun: 0xe8e0ff,
    ambient: 0xdcd4ff,
    ground: null,
    groundY: VOID,
    backdrop: 'stars',
    backdropColor: 0x6a4fd0,
    night: true,
  },
  supports: { kind: 'rock', color: 0x4a3c78, color2: 0x5d3f9a },
  props: [
    ring(P.starB, 22),
    ring(P.spireTop, -14),
    ring(P.alley, -30),
    { type: 'le_crystal_spire', ...offset(P.leg2, 0, -30), y: 0 },
    { type: 'le_planet_ring', ...offset(P.cometLanding, 0, -230), y: 70, scale: 1.4 },
    { type: 'le_planet_small', ...offset(P.turn1, 20, -150), y: 55, scale: 1.8 },
    { type: 'le_comet', ...offset(P.canyon2, 0, 150), y: 80, rot: 0.8, scale: 2 },
    { type: 'le_comet', ...offset(P.starApex, 0, 180), y: 60, rot: 2.4, scale: 1.5 },
    ...spaceScenery(L.points, [starlight]),
  ],
  music: 'legend4',
};
