import type { PropPlacement, TrackData } from '../../types';
import { between, layout, left, offset, right, straight, type MarkPos, type Seg } from '../builder';

// A cosy snowy mountain village during the winter lantern festival, at night. Race up Festival Main Street under
// strings of paper lanterns, round the Clock Tower, then weave through the cobbled lanes: past the market (or sledge
// straight down the icy back-alley), hairpin round the giant festival pine in the Town Square, slide the Frozen Alley,
// hairpin round the toy workshop, hop the little bridge over the frozen stream, sweep along the frozen pond and climb
// back over the snowy outskirts into town.
const SEGS: Seg[] = [
  straight(110, { y: 1, mark: 'start' }), // Festival Main Street
  right(90, 22, { y: 1.5, mark: 'clock' }), // Clock Tower Corner
  straight(24.4, { y: 2, mark: 'bulgeA' }),
  left(65, 28, { y: 2.2 }), // round the market…
  right(130, 30, { y: 2.4, mark: 'market' }),
  left(65, 28, { y: 2.2, mark: 'bulgeB' }), // …or sledge straight down the back-alley
  straight(24, { y: 2.2, mark: 'squareIn' }),
  right(180, 30, { y: 2, mark: 'square' }), // hairpin round the giant festival pine
  straight(24, { y: 1.8, mark: 'laneIn' }), // the Frozen Alley (icy)
  left(40, 30, { y: 1.6 }),
  right(40, 30, { y: 1.4, mark: 'laneS' }),
  straight(20, { y: 1.2, mark: 'laneOut' }),
  left(180, 28, { y: 1, mark: 'workshop' }), // hairpin round the toy workshop
  straight(30, { y: 0.8, mark: 'streamSt' }),
  straight(22, { y: 4, mark: 'bridgeIn' }), // up onto the little bridge
  straight(26, { y: 4, mark: 'bridgeOut' }),
  straight(22, { y: 0.4, mark: 'bridgeDown' }),
  straight(20, { y: -0.4, mark: 'pondIn' }),
  right(180, 45, { y: -0.9, mark: 'pond' }), // sweep along the frozen pond (icy)
  straight(30, { y: -0.5, mark: 'outskirts' }),
  right(35, 45, { y: 0.4 }),
  left(35, 45, { y: 1.4, mark: 'sbend' }),
  straight(101.3, { y: 2.4, mark: 'hill' }), // over the snowy outskirts
  right(90, 30, { y: 1.6, mark: 'last' }),
  straight(41.8, { y: 1 }),
];
const L = layout({ x: 0, z: 0, heading: 0, y: 1 }, SEGS);
const m = L.marks;
const P = L.pos;
/** Snow field level (the frozen stream and pond sit down here). */
const G = -1.2;

// ---- the Sledge Alley shortcut (straight through the back-alley behind the market)
const ALLEY = [
  offset(P.bulgeA, -8, 0),
  between(P.bulgeA, P.bulgeB, 0.2, 1.5, 1.6),
  between(P.bulgeA, P.bulgeB, 0.42, -1.8, 1.0),
  between(P.bulgeA, P.bulgeB, 0.64, 1.8, 1.2),
  between(P.bulgeA, P.bulgeB, 0.86, 0, 1.9),
  offset(P.bulgeB, 8, 0),
];

// ---- scenery placement helpers
const rad = (deg: number): number => (deg * Math.PI) / 180;
const r2 = (v: number): number => Math.round(v * 100) / 100;
/** Calls `fn(distance beyond the road edge, road height)` for the nearest point of every stretch of road. */
function eachRoad(x: number, z: number, fn: (beyond: number, roadY: number) => void): void {
  const ribbons: Array<[{ x: number; z: number; y?: number }[], number, boolean]> = [
    [L.points, 6.5 + 3, true],
    [ALLEY, 3.5 + 2.5, false],
  ];
  for (const [pts, edge, closed] of ribbons) {
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      fn(Math.hypot(a.x + dx * t - x, a.z + dz * t - z) - edge, (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * t);
    }
  }
}
/** Snow height at (x, z): every road's verge slopes from its edge down to the snow field over 22 m. */
function snowY(x: number, z: number): number {
  let y = G;
  eachRoad(x, z, (beyond, ry) => {
    if (beyond < 22) y = Math.max(y, ry + (Math.min(G, ry - 0.4) - ry) * Math.max(0, beyond / 22));
  });
  return r2(y);
}
/** Distance from (x, z) to the nearest road edge. */
function roadGap(x: number, z: number): number {
  let gap = Infinity;
  eachRoad(x, z, (beyond) => (gap = Math.min(gap, beyond)));
  return gap;
}
/** A building `fwd` m along mark `p` and `side` m to its right (negative = left), sunk into the snow, facing the road. */
function beside(type: string, p: MarkPos, fwd: number, side: number): PropPlacement {
  const q = offset(p, fwd, side);
  return { type, x: q.x, z: q.z, y: snowY(q.x, q.z) - 0.35, rot: rad(p.heading + (side > 0 ? 90 : -90)) };
}
/** A prop on a circle round (cx, cz) at compass angle `a` (0 = +Z, 90 = +X), facing the centre (or away from it). */
function around(type: string, cx: number, cz: number, r: number, a: number, faceIn = true): PropPlacement {
  const x = r2(cx + Math.sin(rad(a)) * r);
  const z = r2(cz + Math.cos(rad(a)) * r);
  return { type, x, z, y: snowY(x, z) - 0.35, rot: Math.atan2(cx - x, cz - z) + (faceIn ? 0 : Math.PI) };
}
/** A free-standing prop at (x, z) on the snow. */
const at = (type: string, x: number, z: number, rot = 0, scale = 1): PropPlacement => ({ type, x, z, y: snowY(x, z) - 0.1, rot, scale });
/** A row of houses along a street (types cycle so neighbours differ). */
const HOUSES = ['lv_house_red', 'lv_house_tall', 'lv_house_blue'];
const row = (p: MarkPos, side: number, fwds: number[], k = 0): PropPlacement[] => fwds.map((f, i) => beside(HOUSES[(i + k) % HOUSES.length], p, f, side));
/** A festival lantern arch spanning the street `fwd` m along mark `p`. */
function arch(p: MarkPos, fwd: number): PropPlacement {
  const q = offset(p, fwd, 0);
  return { type: 'lv_lanternarch', x: q.x, z: q.z, y: snowY(q.x, q.z) - 0.6, rot: rad(p.heading) };
}
/** A landmark `fwd` m along and `side` m right of mark `p`, turned by `rot` (radians). */
function landmark(type: string, p: MarkPos, fwd: number, side: number, rot: number, y?: number, scale?: number): PropPlacement {
  const q = offset(p, fwd, side);
  return { type, x: q.x, z: q.z, y: y ?? snowY(q.x, q.z) - 0.3, rot, scale: scale ?? 1 };
}
/** A snowman beside the Sledge Alley slalom (fraction `t` of the way along it). */
function slalom(t: number, side: number, rot: number): PropPlacement {
  const q = between(P.bulgeA, P.bulgeB, t, side);
  return at('lv_snowman', q.x, q.z, rot);
}

// Arc centres (from the layout): Town Square hairpin, workshop hairpin, frozen pond sweep, market bulge.
const SQUARE = { x: P.squareIn.x, z: P.squareIn.z - 30 };
const WORKSHOP = { x: P.laneOut.x, z: P.laneOut.z - 28 };
const POND = { x: P.pondIn.x, z: P.pondIn.z - 45 };
const MARKET = { x: (P.bulgeA.x + P.bulgeB.x) / 2, z: P.bulgeA.z + 3.5 };

const SCENERY: PropPlacement[] = [
  // Festival Main Street: houses both sides, lantern arches overhead
  ...row(P.start, -16.5, [-146, -137, -128, -119, -110, -101, -92, -83, -74, -65, -56, -47, -38, -29, -20, -11, -2]),
  ...row(P.start, 16.5, [-138, -129, -120, -111, -102, -93, -84, -75, -66, -57, -48, -39, -30], 1),
  arch(P.start, -78),
  arch(P.start, -48),
  arch(P.start, -18),
  arch(P.last, 12),
  // Clock Tower Corner
  landmark('lv_clocktower', P.clock, 9, 31, Math.PI / 4),
  arch(P.clock, 10),
  beside('lv_house_tall', P.bulgeA, -14, -16.5),
  beside('lv_house_blue', P.bulgeA, -14, 16.5),
  // the market inside the bulge, houses outside it, and the Sledge Alley through the back streets
  around('lv_stall', MARKET.x, MARKET.z, 12, -35),
  around('lv_stall', MARKET.x, MARKET.z, 12, 0),
  around('lv_stall', MARKET.x, MARKET.z, 12, 35),
  around('lv_gifts', MARKET.x, MARKET.z, 15, -17),
  around('lv_gifts', MARKET.x, MARKET.z, 15, 17),
  around('lv_lanternpost', MARKET.x, MARKET.z, 16, -50),
  around('lv_lanternpost', MARKET.x, MARKET.z, 16, 50),
  ...[-50, -25, 0, 25, 50].map((a, i) => around(HOUSES[i % 3], MARKET.x, MARKET.z, 46.5, a)),
  ...row(P.bulgeA, 13.5, [14, 24, 34, 44, 54, 64, 74, 84], 2),
  slalom(0.42, 5.5, 3.4),
  slalom(0.64, -5.5, 0.3),
  // Town Square: the giant festival pine, stalls and presents, houses round the hairpin
  at('lv_festivalpine', SQUARE.x - 1, SQUARE.z),
  around('lv_stall', SQUARE.x, SQUARE.z, 12.5, -55, false),
  around('lv_stall', SQUARE.x, SQUARE.z, 12.5, -100, false),
  around('lv_stall', SQUARE.x, SQUARE.z, 12.5, -145, false),
  around('lv_gifts', SQUARE.x, SQUARE.z, 7, -80),
  around('lv_gifts', SQUARE.x, SQUARE.z, 7, 70),
  around('lv_lanternpost', SQUARE.x, SQUARE.z, 9.5, -25),
  around('lv_lanternpost', SQUARE.x, SQUARE.z, 9.5, -122),
  around('lv_lanternpost', SQUARE.x, SQUARE.z, 9.5, 140),
  ...[-18, -48, -78, -108, -138, -165].map((a, i) => around(HOUSES[(i + 1) % 3], SQUARE.x, SQUARE.z, 46.5, a)),
  arch(P.squareIn, -12),
  arch(P.square, 10),
  // the Frozen Alley
  ...row(P.laneIn, 16.5, [-18, -8, 5], 0),
  ...row(P.laneIn, -16.5, [-18, -8], 2),
  ...row(P.laneOut, 16.5, [-15, -5], 1),
  beside('lv_house_red', P.laneOut, -32, -16.5),
  arch(P.laneOut, -8),
  // the toy workshop inside the second hairpin, houses round it
  at('lv_workshop', WORKSHOP.x - 1, WORKSHOP.z, -Math.PI / 2),
  around('lv_gifts', WORKSHOP.x, WORKSHOP.z, 10.5, -68),
  around('lv_gifts', WORKSHOP.x, WORKSHOP.z, 10.5, -112),
  around('lv_lanternpost', WORKSHOP.x, WORKSHOP.z, 12, -90),
  ...[30, 60, 90, 120, 150].map((a, i) => around(HOUSES[(i + 2) % 3], WORKSHOP.x, WORKSHOP.z, 44.5, a)),
  // the street down to the bridge, the frozen stream and the bridge-end lanterns
  ...row(P.streamSt, -16.5, [-22, -12, -2], 1),
  ...row(P.streamSt, 16.5, [-24, -14, -4], 0),
  landmark('lv_stream', P.bridgeIn, 15.1, 3.4, Math.atan2(-40, -73), G + 0.02, 1.5), // under the bridge, into the pond
  beside('lv_bridgepost', P.bridgeIn, -6, 11.2),
  beside('lv_bridgepost', P.bridgeIn, -6, -11.2),
  beside('lv_bridgepost', P.bridgeOut, 6, 11.2),
  beside('lv_bridgepost', P.bridgeOut, 6, -11.2),
  arch(P.streamSt, -18),
  // the frozen pond with skating penguins and a little skate hut
  { type: 'lv_pond', x: POND.x, z: POND.z, y: -1.0, rot: 0.3 },
  { type: 'lv_penguin', x: POND.x + 8, z: POND.z + 13, y: -0.92, rot: 1, scale: 1.2 },
  { type: 'lv_penguin', x: POND.x - 9, z: POND.z - 9, y: -0.92, rot: 2.5, scale: 1.2 },
  { type: 'lv_penguin', x: POND.x + 13, z: POND.z - 15, y: -0.92, rot: 4, scale: 1.2 },
  { type: 'lv_penguin', x: POND.x - 13, z: POND.z + 7, y: -0.92, rot: 5.5, scale: 1.2 },
  at('lv_cottage', POND.x + 33, POND.z - 15, Math.atan2(-33, 15)),
  at('lv_lanternpost', POND.x + 25, POND.z + 22),
  at('lv_lanternpost', POND.x + 23, POND.z - 23),
  around('th_cabin', POND.x, POND.z, 64, -90),
  around('lv_snowman', POND.x, POND.z, 60, -40, false),
  // the snowy outskirts
  beside('th_cabin', P.outskirts, -12, -19),
  beside('lv_snowman', P.outskirts, 4, -13.5),
  beside('lv_cottage', P.sbend, -6, 16),
  beside('th_igloo', P.hill, -82, -22),
  beside('th_sled', P.hill, -76, -13),
  beside('lv_cottage', P.hill, -56, -16),
  beside('lv_cottage', P.hill, -30, -16),
  beside('th_cabin', P.hill, -6, -19),
  beside('lv_cottage', P.hill, -88, 16),
  beside('lv_house_blue', P.hill, -64, 16.5),
  beside('lv_house_red', P.hill, -40, 16.5),
  beside('lv_snowman', P.hill, -22, 13.5),
];

/** Deterministic 0..1 noise from an integer (no Math.random in track data). */
function hash(n: number): number {
  let t = Math.imul(n ^ 0x5bd1e995, 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/** Snowy pines (and the odd cottage) in a rectangle, kept clear of the roads and of everything already placed. */
function grove(x0: number, z0: number, x1: number, z1: number, n: number, seed: number): void {
  for (let k = 0, made = 0; k < n * 6 && made < n; k++) {
    const x = r2(x0 + (x1 - x0) * hash(seed * 1000 + k * 3));
    const z = r2(z0 + (z1 - z0) * hash(seed * 1000 + k * 3 + 1));
    if (roadGap(x, z) < 5) continue;
    if (SCENERY.some((p) => Math.hypot(p.x - x, p.z - z) < (p.type === 'th_snowpine' ? 6 : 9))) continue;
    const r = hash(seed * 1000 + k * 3 + 2);
    SCENERY.push({ type: r < 0.15 ? 'lv_cottage' : 'th_snowpine', x, z, y: snowY(x, z) - 0.2, rot: r2(r * 6.28), scale: r2(1 + r * 0.6) });
    made++;
  }
}
grove(28, -70, 60, 160, 7, 1); // west of Main Street
grove(-10, 175, -170, 215, 7, 2); // north of the market
grove(-235, 170, -275, 40, 6, 3); // east of the Town Square
grove(-270, -110, -300, 30, 5, 4); // beyond the frozen pond
grove(40, -95, -230, -130, 7, 5); // south of the outskirts
grove(-30, -25, -160, -50, 6, 6); // the infield meadow
grove(-25, 30, -40, 90, 3, 7); // back gardens behind Main Street

export const LANTERN_VILLAGE: TrackData = {
  id: 'lantern-village',
  name: 'Lantern Village',
  cup: 'frost',
  theme: 'snowvillage',
  feature: 'Weave through a snowy village on lantern-festival night: hairpin round the giant pine, slide the Frozen Alley and sledge the back-alley shortcut',
  width: 13,
  shoulder: 3,
  edge: 'wall',
  autoBank: 0.5,
  start: 0.5,
  points: L.points,
  edges: [
    // the Sledge Alley leaves and rejoins on the right
    { from: m.bulgeA - 0.4, to: m.bulgeA + 1.0, side: 'right', type: 'open' },
    { from: m.bulgeB - 1.0, to: m.bulgeB + 0.4, side: 'right', type: 'open' },
    // the little bridge over the frozen stream has no railings
    { from: m.bridgeIn - 0.2, to: m.bridgeOut + 0.2, side: 'both', type: 'drop' },
    // low fences along the frozen pond and the open outskirts
    { from: m.pondIn - 0.3, to: m.sbend, side: 'both', type: 'open' },
  ],
  // the Frozen Alley and the pond shore are iced over
  ice: [
    { from: m.laneIn - 0.9, to: m.laneOut + 0.2 },
    { from: m.pondIn + 0.6, to: m.pond - 0.5 },
  ],
  boostPads: [
    { at: m.clock + 0.7, offset: 0 },
    { at: m.streamSt - 0.4, offset: 0 },
    { at: m.pond + 0.6, offset: -0.4 },
    { at: m.pond + 0.6, offset: 0.4 },
    { at: m.last + 0.7, offset: 0 },
  ],
  itemRows: [
    { at: m.start - 2.2 },
    { at: m.squareIn - 0.3, count: 4 },
    { at: m.bridgeDown + 0.4, count: 4 },
    { at: m.sbend + 0.8, count: 4 },
  ],
  hazards: [
    // penguins waddling across the outskirts road
    { kind: 'crab', at: m.sbend + 2.2, offset: 0, amp: 0.65, period: 5.5, model: 'th_penguin', radius: 1.1 },
    { kind: 'crab', at: m.sbend + 3.4, offset: 0.1, amp: 0.6, period: 6.5, phase: 0.45, model: 'th_penguin', radius: 1.1 },
  ],
  shortcuts: [
    {
      points: ALLEY,
      width: 7,
      edge: 'open',
      surface: 'ice',
      joinFrom: m.bulgeA - 0.5,
      joinTo: m.bulgeB + 0.5,
      ramps: [{ at: 3.55, kind: 'trick', length: 5, height: 1.0 }],
      hint: 'Sledge down the icy back-alley behind the market! It is narrow and slippery — steer gently past the snowmen, then trick off the snow kicker for a boost.',
      aiUse: 0.6,
    },
  ],
  palette: {
    road: 0x56506a,
    road2: 0x5e5874,
    line: 0xffd27a,
    kerb: 0xe8433a,
    kerb2: 0xfff4e6,
    offroad: 0xe6edf8,
    wall: 0xf2f4fa,
    wall2: 0xd9433a,
    side: 0x6d6a80,
  },
  sky: {
    light: { sunDir: [0.4, 0.9, -0.4], sun: 0xa8b8ff, sunIntensity: 0.8, hemiGround: 0x9a7c6c, hemiIntensity: 1.2, grade: 0xffe9cf },
    roadSheen: 0.4,
    top: 0x070d2e,
    bottom: 0x24366e,
    fog: 0x1c2a58,
    fogNear: 0.45,
    sun: 0xb8c4ff,
    ambient: 0xc8d0ff,
    ground: 0xdfe7f6,
    groundY: G,
    backdrop: 'mountains',
    backdropColor: 0x1e2850,
    night: true,
  },
  supports: { kind: 'pillars', color: 0x8a8296, color2: 0x6d6a80 },
  scatter: [
    { types: ['lv_lanternpost', 'lv_lanternpost', 'lv_snowman', 'th_sled', 'lv_gifts', 'lv_penguin'], density: 7, near: 1.0, far: 3.0, scale: [0.85, 1.1] },
  ],
  props: SCENERY,
  music: 'frost3',
};
