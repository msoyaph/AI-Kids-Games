import type { PropPlacement, TrackData } from '../../types';
import { between, layout, left, offset, right, straight, type MarkPos } from '../builder';

// The Frost Cup finale on the highest mountain: leave the ski lodge, climb two switchbacks to the summit ridge,
// glide across the great snowy valley, then race the icy downhill slalom back to the lodge.
const L = layout({ x: 0, z: 0, heading: 0, y: 0 }, [
  straight(60, { mark: 'lodge' }),
  right(90, 32, { y: 3, mark: 'turn1' }),
  straight(10, { y: 4 }),
  left(180, 25, { y: 12, mark: 'hair1' }),
  straight(110, { y: 23, mark: 'climb' }),
  right(180, 27, { y: 31, mark: 'hair2' }),
  straight(60, { y: 36, mark: 'ridgeIn' }),
  straight(50, { y: 38, mark: 'summit' }),
  straight(45, { y: 38, mark: 'lip' }),
  // the glider leap across the valley (no road under the gap!)
  straight(56, { y: 32, mark: 'gapEnd' }),
  straight(60, { y: 31, mark: 'landing' }),
  right(90, 45, { y: 28, mark: 'turnS' }),
  straight(50, { y: 22, mark: 'downhill' }),
  right(70, 38, { y: 20, mark: 'sA' }),
  left(140, 38, { y: 14 }),
  right(70, 38, { y: 10, mark: 'sB' }),
  straight(30, { y: 6 }),
  right(90, 35, { y: 4, mark: 'turnW' }),
  left(25, 100, { y: 3 }),
  right(50, 100, { y: 2, mark: 'sweep' }),
  left(25, 100, { y: 1, mark: 'runIn' }),
  right(90, 40, { y: 0, mark: 'last' }),
  straight(65),
]);
const m = L.marks;
const P = L.pos;
const N = L.points.length;
const GROUND = -2;
const rad = (p: MarkPos): number => (p.heading * Math.PI) / 180;
const r2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * A point beside the road at control-point position `u`, `side` metres right of the centre line (left if negative),
 * resting on the snowy verge that slopes from the road boundary (11 m out) down to the valley floor 22 m further.
 */
function beside(u: number, side: number): { x: number; y: number; z: number; h: number } {
  const i = Math.floor(u);
  const f = u - i;
  const a = L.points[((i % N) + N) % N];
  const b = L.points[(((i + 1) % N) + N) % N];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const roadY = (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * f;
  const down = Math.min(1, Math.max(0, (Math.abs(side) - 11) / 22));
  return {
    x: r2(a.x + dx * f - (dz / len) * side),
    z: r2(a.z + dz * f + (dx / len) * side),
    y: r2(roadY - (roadY - GROUND) * down - 0.3),
    h: Math.atan2(dx, dz),
  };
}

// The ski run: straight down the fall line across the inside of the icy slalom (left of the road heading down).
const SKI = [
  offset(P.downhill, -10, -4),
  between(P.downhill, P.sB, 0.25, -4),
  between(P.downhill, P.sB, 0.5, -4),
  between(P.downhill, P.sB, 0.75, -4),
  offset(P.sB, 10, -4),
];
const skiHeading = Math.atan2(P.sB.x - P.downhill.x, P.sB.z - P.downhill.z);
/** Snow ridges under the ski run so it rides the crest of a hill instead of floating. */
const skiRidges: PropPlacement[] = [0.18, 0.32, 0.46, 0.6, 0.74, 0.88].map((t) => {
  const p = between(P.downhill, P.sB, t, -4);
  return { type: 'ap_snowridge', x: p.x, z: p.z, y: GROUND, rot: skiHeading, scale: r2((p.y - GROUND - 1.6) / 12) };
});

/** Feather flags along both sides of the icy run-in, alternating colours. */
const runInFlags: PropPlacement[] = [];
for (let u = m.turnW + 0.6, k = 0; u < m.last + 2.5; u += 0.75, k++) {
  for (const side of [-1, 1]) {
    const p = beside(u, side * 12.6);
    runInFlags.push({ type: (k + (side > 0 ? 1 : 0)) % 2 ? 'ap_bannerflag' : 'ap_bannerflag2', x: p.x, y: p.y, z: p.z, rot: p.h + Math.PI / 2 });
  }
}

/** Cheering crowd stands facing the road (`side` < 0 = left). */
const crowd = (u: number, side: number): PropPlacement => {
  const p = beside(u, side);
  return { type: 'crowd', x: p.x, y: p.y, z: p.z, rot: p.h + (side > 0 ? Math.PI / 2 : -Math.PI / 2) };
};

/** Snowy pines and penguins on the valley floor under the glider leap. */
const valley: PropPlacement[] = [
  { type: 'ap_frozenpond', ...between(P.lip, P.gapEnd, 0.45, -4, GROUND), rot: rad(P.lip) },
  { type: 'th_igloo', ...between(P.lip, P.gapEnd, 0.7, 26, GROUND), rot: rad(P.lip) - 2.2 },
  { type: 'th_penguin', ...between(P.lip, P.gapEnd, 0.3, 12, GROUND), rot: 0.4 },
  { type: 'th_penguin', ...between(P.lip, P.gapEnd, 0.36, 14, GROUND), rot: -0.6, scale: 0.8 },
  { type: 'th_penguin', ...between(P.lip, P.gapEnd, 0.62, -16, GROUND), rot: 2.2 },
  ...[
    [0.1, -30, 1.8],
    [0.25, 30, 1.6],
    [0.5, -36, 2.1],
    [0.55, 40, 1.7],
    [0.8, -28, 1.9],
    [0.92, 34, 1.5],
    [0.35, -52, 2.2],
    [0.7, 56, 2],
  ].map(([t, side, s]): PropPlacement => ({ type: 'th_snowpine', ...between(P.lip, P.gapEnd, t, side, GROUND), rot: t * 9, scale: s })),
];

export const AVALANCHE_PEAK: TrackData = {
  id: 'avalanche-peak',
  name: 'Avalanche Peak',
  cup: 'frost',
  theme: 'summit',
  feature: 'Climb to the summit ridge, glide across the giant snowy valley and slalom down the icy slopes to the lodge',
  width: 14,
  shoulder: 4,
  edge: 'wall',
  autoBank: 0.6,
  start: 0,
  points: L.points,
  edges: [
    // no railings at the cliff tops either side of the glider leap
    { from: m.lip - 0.8, to: m.gapEnd + 0.6, side: 'both', type: 'drop' },
    // the ski run leaves / rejoins on the inside of the slalom
    { from: m.downhill - 0.7, to: m.downhill + 0.9, side: 'left', type: 'open' },
    { from: m.sB - 0.9, to: m.sB + 0.6, side: 'left', type: 'open' },
  ],
  gaps: [{ from: m.lip + 0.12, to: m.gapEnd - 0.05 }],
  ramps: [
    { at: m.lip, kind: 'glider', length: 9, height: 2.2 },
    // a mogul on the run-in for a trick boost
    { at: m.sweep + 0.8, kind: 'trick', length: 6, height: 1.3, offset: -0.4, width: 6 },
  ],
  // the slalom and the fast sweepers into the lodge are frozen over
  ice: [
    { from: m.downhill - 0.2, to: m.sB + 0.8 },
    { from: m.turnW + 0.3, to: m.runIn + 0.2 },
  ],
  boostPads: [
    { at: m.hair1 + 0.6, offset: 0 },
    { at: m.summit + 0.4, offset: 0 },
    { at: m.turnW + 0.2, offset: 0 },
    { at: m.last + 0.4, offset: 0 },
  ],
  itemRows: [{ at: m.lodge - 1.2 }, { at: m.climb - 2.4, count: 4 }, { at: m.sB + 1.2, count: 4 }, { at: m.sweep - 0.5, count: 4 }],
  // a mini avalanche: giant snowballs rolling across the top of the downhill
  hazards: [
    { kind: 'roller', at: m.downhill - 1.6, offset: 0, amp: 0.7, period: 4.6, model: 'th_snowball', radius: 1.8 },
    { kind: 'roller', at: m.downhill - 0.5, offset: 0, amp: 0.7, period: 5.4, phase: 0.45, model: 'th_snowball', radius: 1.8 },
  ],
  shortcuts: [
    {
      points: SKI,
      width: 8,
      edge: 'drop',
      surface: 'ice',
      joinFrom: m.downhill - 0.4,
      joinTo: m.sB + 0.33,
      boostPads: [{ at: 0.9, offset: 0, width: 3 }],
      hint: 'Skip the slalom and zoom straight down the icy ski run! It is narrow with no fences, so keep your wheels pointing downhill.',
      aiUse: 0.6,
    },
  ],
  palette: {
    road: 0x6c7086,
    road2: 0x747890,
    line: 0xffffff,
    kerb: 0xff7a45,
    kerb2: 0xffffff,
    offroad: 0xf3f6ff,
    wall: 0xe4ecff,
    wall2: 0xff7a45,
    side: 0x8f9ab0,
  },
  sky: {
    // golden hour: a warm, low sun from the west, lavender shadows on the snow
    light: { sunDir: [0.85, 0.34, 0.4], sun: 0xffc07a, sunIntensity: 1.6, hemiGround: 0xa898c0, grade: 0xfff0e2 },
    top: 0x5a7fd0,
    bottom: 0xffcf9e,
    fog: 0xf8dcc4,
    fogNear: 0.5,
    sun: 0xffe2b8,
    ambient: 0xf2eaf6,
    ground: 0xf4f6ff,
    groundY: GROUND,
    backdrop: 'mountains',
    backdropColor: 0x9a9cc6,
  },
  supports: { kind: 'rock', color: 0x8792a8, color2: 0x99a3b8 },
  scatter: [
    { types: ['th_snowpine', 'th_snowpine', 'th_snowrock', 'th_icecrystal', 'th_skiflag', 'th_skis', 'th_penguin', 'th_sled'], density: 8, near: 1.5, far: 13 },
    { types: ['th_snowpine', 'th_snowpine', 'th_snowrock', 'th_snowpine'], density: 3, near: 24, far: 70, scale: [1.1, 1.9] },
  ],
  props: [
    // the lodge village by the start
    { type: 'ap_lodge', ...offset(P.lodge, -48, -33, GROUND + 0.2), rot: rad(P.lodge) - Math.PI / 2 },
    { type: 'th_cabin', ...offset(P.lodge, -86, -30, GROUND + 0.3), rot: rad(P.lodge) - Math.PI / 2 },
    { type: 'th_cabin', ...offset(P.lodge, -14, -34, GROUND + 0.3), rot: rad(P.lodge) - Math.PI / 2 - 0.3 },
    { type: 'ap_snowcat', ...offset(P.lodge, -24, -22, GROUND + 0.6), rot: rad(P.lodge) + 0.5 },
    { type: 'th_snowman', ...offset(P.last, 59, 18, GROUND + 1.3), rot: rad(P.last) + 1.9 },
    { type: 'th_skis', ...offset(P.lodge, -40, -19, GROUND + 1.0), rot: rad(P.lodge) - 1.2 },
    { type: 'th_sled', ...offset(P.lodge, -56, -19, GROUND + 1.0), rot: rad(P.lodge) + 0.3 },
    crowd(m.last + 1.1, 15.5),
    crowd(m.last + 1.5, 15.5),
    crowd(m.last + 1.9, 15.5),
    crowd(m.last + 2.3, 15.5),
    crowd(1.0, -15.5),
    crowd(1.4, -15.5),
    crowd(m.runIn + 0.5, 15.5),
    crowd(m.sweep + 0.2, -16),
    // the finish arch at the end of the downhill run
    { type: 'ap_arch', ...offset(P.last, 22, 0), rot: rad(P.last) },
    ...runInFlags,
    // the summit: a flag on a cairn above the ridge, and the giant massif dead ahead of the glider leap
    { type: 'ap_summitflag', ...offset(P.summit, 4, 13.5, P.summit.y - 4.4), rot: rad(P.summit) },
    { type: 'ap_bigpeak', ...offset(P.lip, 275, -18, GROUND), rot: rad(P.lip) + Math.PI / 2 },
    { type: 'th_snowpeak', ...offset(P.turn1, -40, 240, GROUND), rot: 1.2, scale: 1.1 },
    { type: 'th_snowpeak', ...offset(P.runIn, 40, -220, GROUND), rot: 2.6, scale: 0.9 },
    // the cliffs at both ends of the glider leap, and the cable car across the valley
    { type: 'ap_cliff', ...offset(P.lip, -6, 0, GROUND), rot: rad(P.lip) },
    { type: 'ap_cliff', ...offset(P.lip, -22, -19, GROUND), rot: rad(P.lip) + 1.3, scale: 0.78 },
    { type: 'ap_cliff', ...offset(P.lip, -20, 20, GROUND), rot: rad(P.lip) - 0.9, scale: 0.74 },
    { type: 'ap_cliff', ...offset(P.gapEnd, 7, 0, GROUND), rot: rad(P.gapEnd) + Math.PI, scale: 0.84 },
    { type: 'ap_cliff', ...offset(P.gapEnd, 22, 20, GROUND), rot: rad(P.gapEnd) + 2.1, scale: 0.7 },
    { type: 'ap_cliff', ...offset(P.gapEnd, 20, -21, GROUND), rot: rad(P.gapEnd) - 2.6, scale: 0.68 },
    { type: 'ap_cableway', ...offset(P.lip, 28, -44, GROUND), rot: rad(P.lip) - Math.PI / 2 },
    ...valley,
    // the ski run: start gate, snowy ridge underneath, a pile of snowballs at the top of the downhill
    { type: 'ap_skigate', ...between(P.downhill, P.sB, 0.3, -4), rot: skiHeading },
    ...skiRidges,
    { type: 'th_snowball', ...offset(P.turnS, 4, -15, P.turnS.y - 1.4), scale: 0.9 },
    { type: 'th_snowball', ...offset(P.turnS, 10, -16.5, P.turnS.y - 2.6), scale: 1.2, rot: 1.1 },
  ],
  music: 'frost4',
};
