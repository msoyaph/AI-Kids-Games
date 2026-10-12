import type { PropPlacement, TrackData } from '../../types';
import { between, layout, left, offset, right, straight, type MarkPos } from '../builder';

// A sunny frozen lake ringed by pines. Grippy snowy shore roads alternate with glassy stretches out on the ice:
// climb through the pine woods to the lookout, slide down onto the lake, swing round the fishing bay (or dare the
// thin-ice shortcut straight across it), drift the big icy sweeper and climb back up the shore to the lodge.
const L = layout({ x: 0, z: 0, heading: 0, y: 2 }, [
  straight(130, { mark: 'start' }),
  right(70, 45, { y: 2.5, bank: 4, mark: 't1' }),
  // up through the pine woods to the lookout above the lake
  straight(50, { y: 4, mark: 'woods' }),
  left(40, 50, { y: 5.5, bank: -3 }),
  right(80, 40, { y: 6, bank: 4, mark: 'crest' }),
  straight(50, { y: 1.6, mark: 'down' }),
  // out onto the frozen lake (flat: no banking on the ice)
  right(70, 40, { y: 0.25, mark: 'ne' }),
  left(45, 45, { y: 0 }),
  right(45, 45, { mark: 'ess' }),
  straight(58, { mark: 'scFrom' }),
  // the road swings round the fishing bay on the shore; the thin-ice shortcut goes straight across
  left(60, 36, { y: 0.3, bank: -3, mark: 'bayA' }),
  right(120, 36, { y: 0.6, bank: 3, mark: 'bayB' }),
  left(60, 36, { y: 0.1, bank: -3, mark: 'scTo' }),
  straight(25, { y: 0, mark: 'iceIn' }),
  right(120, 45, { mark: 'se' }),
  straight(90, { mark: 'iceOut' }),
  // back up the shore to the lodge
  straight(16, { y: 0.25 }),
  straight(30, { y: 2, mark: 'shore' }),
  left(30, 50, { y: 2.5, bank: -3 }),
  right(90, 40, { y: 2, bank: 4, mark: 'sw' }),
  straight(21),
]);
const m = L.marks;
const P = L.pos;
const GROUND = -0.3;
/** Top of the lake ice: just below the flat road out on the lake, above the snowy ground plane. */
const LAKE_Y = -0.1;
const rad = (p: MarkPos): number => (p.heading * Math.PI) / 180;
/** Facing the road from its left (−) or right (+) side. */
const faceRoad = (p: MarkPos, side: -1 | 1): number => rad(p) + (side * Math.PI) / 2;

// ---- the thin-ice shortcut: dead straight across the mouth of the fishing bay
const bay = (t: number, lateral = 0, y?: number): { x: number; z: number; y: number } => between(P.scFrom, P.scTo, t, lateral, y);
const shortcutPoints = [offset(P.scFrom, -3, 0), bay(0.25), bay(0.5), bay(0.75), offset(P.scTo, 3, 0)];
// the crack (gap) in the middle of the shortcut: u 2.03–2.2 ≈ 53 % of the way across
const crack = bay(0.529, 0, -0.1);

// ---- the frozen lake: overlapping flat ice pieces. Semi-axes per unit scale (metres): long 50 × 125,
// oval 50 × 100, round 50. The road over the lake is flat (no banking) at y ≥ 0, so the ice never pokes through.
const LAKE_SIZE = { sh_lake_long: [50, 125], sh_lake_oval: [50, 100], sh_lake_round: [50, 50] } as const;
interface LakePiece {
  type: keyof typeof LAKE_SIZE;
  x: number;
  z: number;
  rot: number;
  scale: number;
}
const lakePiece = (type: LakePiece['type'], at: { x: number; z: number }, rot: number, scale: number): LakePiece => ({ type, x: at.x, z: at.z, rot, scale });
const LAKE: LakePiece[] = [
  // where the road comes down off the hill onto the ice
  lakePiece('sh_lake_round', offset(P.ne, -8, -4), 0, 0.8),
  // along the icy esses
  lakePiece('sh_lake_oval', offset(P.scFrom, -58, -1.5), rad(P.scFrom), 0.7),
  // the main lake inside the loop (and the fishing bay the shortcut crosses)
  lakePiece('sh_lake_long', offset(P.scFrom, 38, 47.5), rad(P.scFrom), 1.2),
  lakePiece('sh_lake_oval', bay(0.5, -8), rad(P.scFrom), 0.2),
  // round the big icy sweeper and along the south shore
  lakePiece('sh_lake_round', offset(P.iceIn, 13, 10), 0, 0.8),
  lakePiece('sh_lake_oval', offset(P.iceOut, -45, 3), rad(P.iceOut), 0.75),
];
/** Inside the lake (with a margin in metres; negative = keep further inside). */
function inLake(x: number, z: number, margin: number): boolean {
  return LAKE.some((e) => {
    const a = LAKE_SIZE[e.type][0] * e.scale + margin;
    const b = LAKE_SIZE[e.type][1] * e.scale + margin;
    if (a <= 0 || b <= 0) return false;
    const dx = x - e.x;
    const dz = z - e.z;
    const c = Math.cos(e.rot);
    const s = Math.sin(e.rot);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    return (lx / a) ** 2 + (lz / b) ** 2 < 1;
  });
}

// ---- landmarks (also kept clear of the pine ring)
const landmarks: PropPlacement[] = [
  // the lodge, the grandstand and a giant snowman at the start
  { type: 'th_cabin', ...offset(P.start, -62, -26), y: GROUND, rot: faceRoad(P.start, -1), scale: 1.3 },
  { type: 'crowd', ...offset(P.start, -112, -16.5), y: 1.5, rot: faceRoad(P.start, -1) },
  { type: 'crowd', ...offset(P.start, -102, -16.5), y: 1.5, rot: faceRoad(P.start, -1) },
  { type: 'th_snowman', ...offset(P.start, -70, 40), y: GROUND, rot: faceRoad(P.start, 1), scale: 3.2 },
  // the lookout on the hill
  { type: 'th_igloo', ...offset(P.crest, -4, -30), y: 1, rot: faceRoad(P.crest, -1), scale: 1.2 },
  // fishing camp on the bay and the lake
  { type: 'sh_fishhut', ...bay(0.42, -10, LAKE_Y), rot: rad(P.scFrom) + 1.2 },
  { type: 'sh_fishhut_b', ...bay(0.6, -10.5, LAKE_Y), rot: rad(P.scFrom) + 2.2 },
  { type: 'sh_fishhut', ...bay(0.33, 15, LAKE_Y), rot: rad(P.scFrom) - 1.4 },
  { type: 'sh_fishhut_b', ...bay(0.7, 17, LAKE_Y), rot: rad(P.scFrom) - 2.0 },
  { type: 'sh_iceblocks', ...bay(0.5, 12, LAKE_Y), rot: 0.6 },
  // thin ice! (where the shortcut leaves the road, and by the crack)
  { type: 'sh_thinice', ...offset(P.scFrom, -16, 13), y: 0, rot: rad(P.scFrom) + Math.PI },
  { type: 'sh_thinice', ...offset(P.scFrom, 14, 7.5), y: LAKE_Y, rot: rad(P.scFrom) + Math.PI },
  { type: 'sh_crack', ...crack, rot: rad(P.scFrom) },
  // an ice sculpture out on the lake inside the big sweeper, and the frozen fountain on the village green
  { type: 'sh_icefish', ...offset(P.se, 4, 26), y: LAKE_Y, rot: faceRoad(P.se, 1) + 0.5, scale: 1.4 },
  { type: 'sh_icefountain', ...offset(P.start, -30, 32), y: GROUND, scale: 1.2 },
  // skating penguins and snow sculptures by the shore
  { type: 'sh_skatepenguin', ...offset(P.ess, 20, 24), y: LAKE_Y, rot: 2.2 },
  { type: 'sh_skatepenguin', ...offset(P.ess, 27, 31), y: LAKE_Y, rot: 2.6, scale: 0.8 },
  { type: 'th_penguin', ...offset(P.ess, -10, 19), y: LAKE_Y, rot: 1.2 },
  { type: 'th_snowman', ...offset(P.shore, 6, 22), y: 0.6, rot: faceRoad(P.shore, 1), scale: 1.4 },
  // far mountains
  { type: 'th_snowpeak', x: 220, z: 330, y: GROUND, scale: 1.3 },
  { type: 'th_snowpeak', x: -480, z: 120, y: GROUND, scale: 1.1, rot: 1.2 },
  { type: 'th_snowpeak', x: 160, z: -300, y: GROUND, scale: 1.0, rot: 2.4 },
];

/**
 * The ring of pines round the lake (scatter can't tell shore from lake, so pines are placed here): a tiny
 * deterministic random generator walks the road, drops pines 26–75 m out on dry land, clear of the road, the
 * shortcut, the lake and the landmarks. Each pine sits on the snow verge sloping down from the nearest road point.
 */
function pineRing(): PropPlacement[] {
  let seed = 11;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pts = L.points;
  const n = pts.length;
  const segDist = (x: number, z: number, a: { x: number; z: number }, b: { x: number; z: number }): number => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
  };
  const roadDist = (x: number, z: number): { d: number; y: number } => {
    let best = { d: Infinity, y: 0 };
    for (let i = 0; i < n; i++) {
      const d = segDist(x, z, pts[i], pts[(i + 1) % n]);
      if (d < best.d) best = { d, y: pts[i].y ?? 0 };
    }
    return best;
  };
  const scDist = (x: number, z: number): number => {
    let d = Infinity;
    for (let i = 0; i + 1 < shortcutPoints.length; i++) d = Math.min(d, segDist(x, z, shortcutPoints[i], shortcutPoints[i + 1]));
    return d;
  };
  const out: PropPlacement[] = [];
  const taken = landmarks.filter((p) => p.type !== 'th_snowpeak').map((p) => ({ x: p.x, z: p.z }));
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const rx = -(b.z - a.z) / len;
    const rz = (b.x - a.x) / len;
    for (const side of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        if (rnd() > 0.62) continue;
        const along = rnd();
        const dist = 26 + rnd() * 49;
        const x = a.x + (b.x - a.x) * along + rx * dist * side;
        const z = a.z + (b.z - a.z) * along + rz * dist * side;
        const road = roadDist(x, z);
        if (road.d < 24 || scDist(x, z) < 18 || inLake(x, z, 8)) continue;
        if (taken.some((p) => Math.hypot(p.x - x, p.z - z) < 12)) continue;
        taken.push({ x, z });
        // the snow verge slopes from the road edge (11 m out) down to the ground over 22 m
        const y = Math.max(GROUND, road.y + (GROUND - 0.1 - road.y) * Math.min(1, (road.d - 11) / 22)) - 0.3;
        out.push({ type: 'th_snowpine', x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, y: Math.round(y * 10) / 10, rot: Math.round(rnd() * 628) / 100, scale: Math.round((1 + rnd() * 0.7) * 100) / 100 });
      }
    }
  }
  return out;
}

export const SHIVER_LAKE: TrackData = {
  id: 'shiver-lake',
  name: 'Shiver Lake',
  cup: 'frost',
  theme: 'icelake',
  feature: 'Slide across a sunny frozen lake — grip the snowy shore, drift the glassy ice and dare the thin-ice shortcut',
  width: 14,
  shoulder: 4,
  edge: 'wall',
  // the lake is flat: corners on the shore get a little manual banking instead
  autoBank: 0,
  start: 1,
  points: L.points,
  edges: [
    // low rink boards out on the lake so you can see the ice
    { from: m.down + 0.4, to: m.scFrom, side: 'both', type: 'open' },
    { from: m.scTo, to: m.iceOut + 0.3, side: 'both', type: 'open' },
    // the shortcut branches off on the bay side: no barrier there
    { from: m.scFrom - 0.2, to: m.scFrom + 1.6, side: 'right', type: 'drop' },
    { from: m.scTo - 1.6, to: m.scTo + 0.2, side: 'right', type: 'drop' },
  ],
  ice: [
    { from: m.down + 0.6, to: m.scFrom + 0.3 },
    { from: m.scTo - 0.3, to: m.iceOut },
  ],
  itemRows: [{ at: m.start - 2.5 }, { at: m.crest + 0.5 }, { at: m.iceIn - 0.3 }, { at: m.shore + 0.4 }],
  boostPads: [
    { at: m.t1 + 0.6, offset: 0 },
    { at: m.ess + 0.6, offset: 0 },
    { at: m.bayB - 0.4, offset: 0 },
    { at: m.iceOut + 1.2, offset: 0 },
  ],
  ramps: [{ at: m.crest + 1.6, kind: 'trick', length: 6, height: 1.2, offset: 0.45, width: 5.5 }],
  hazards: [
    { kind: 'roller', at: m.down - 1.0, offset: 0, amp: 0.65, period: 5.2, model: 'th_snowball', radius: 1.8 },
    { kind: 'crab', at: m.se + 1.0, offset: 0, amp: 0.7, period: 4.8, model: 'sh_skatepenguin', radius: 1.2 },
    { kind: 'crab', at: m.se + 2.6, offset: 0, amp: 0.7, period: 4.2, phase: 0.5, model: 'sh_skatepenguin', radius: 1.2 },
  ],
  shortcuts: [
    {
      points: shortcutPoints,
      width: 8,
      edge: 'drop',
      surface: 'ice',
      joinFrom: m.scFrom - 0.15,
      joinTo: m.scTo + 0.15,
      boostPads: [{ at: 1.1, offset: 0, width: 3 }],
      ramps: [{ at: 2.0, kind: 'trick', length: 5, height: 1.1 }],
      gaps: [{ from: 2.03, to: 2.2 }],
      hint: 'Dare the thin ice straight across the fishing bay! It is narrow and slippery with no railings, and there is a crack to jump — hit the boost pad and the little ramp at full speed, and keep your wheels straight.',
      aiUse: 0.5,
    },
  ],
  palette: {
    road: 0x7a7d90,
    road2: 0x82859a,
    line: 0xffffff,
    kerb: 0xff5a6e,
    kerb2: 0xffffff,
    offroad: 0xf2f7ff,
    wall: 0xe8f1ff,
    wall2: 0x4aa8ff,
    side: 0x9fb4d0,
  },
  sky: {
    // bright winter blue with a crisp, low sun
    light: { sunDir: [-0.55, 0.45, 0.6], sun: 0xfff0d8, sunIntensity: 1.65, hemiIntensity: 1.35, hemiGround: 0xc8daf2, grade: 0xf6faff },
    top: 0x3d8fea,
    bottom: 0xdff1ff,
    fog: 0xe4f2ff,
    fogNear: 0.5,
    sun: 0xfff4e0,
    ambient: 0xf2f7ff,
    ground: 0xf4f8ff,
    groundY: GROUND,
    backdrop: 'mountains',
    backdropColor: 0x9db4d8,
  },
  scatter: [
    { types: ['th_snowman', 'th_penguin', 'sh_skatepenguin', 'th_icecrystal', 'th_sled', 'th_skis', 'th_snowrock', 'sh_iceblocks', 'th_skiflag'], density: 6, near: 2, far: 12 },
    { types: ['th_snowrock', 'th_icecrystal', 'th_igloo', 'sh_iceblocks'], density: 2, near: 24, far: 60, scale: [1, 1.5] },
  ],
  props: [...LAKE.map((e): PropPlacement => ({ type: e.type, x: e.x, z: e.z, y: LAKE_Y - 0.05, rot: e.rot, scale: e.scale, color: 0xffffff })), ...landmarks, ...pineRing()],
  music: 'frost1',
};
