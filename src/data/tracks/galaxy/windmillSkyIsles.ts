import type { PropPlacement, TrackData, TrackPoint } from '../../types';
import { between, layout, left, offset, right, straight } from '../builder';

// Floating grassy islands high above the clouds, linked by bridges and two long glider leaps.
const Y = 20;
const L = layout({ x: 0, z: 0, heading: 0, y: Y }, [
  straight(70, { mark: 'start' }),
  straight(26, { mark: 'lip1' }),
  straight(66, { y: 15, mark: 'gap1End' }),
  straight(34, { y: 14, mark: 'land1' }),
  left(45, 30),
  right(90, 30, { mark: 'mill' }),
  straight(40, { mark: 'bridgeA' }),
  straight(110, { y: 26, mark: 'bridgeB' }),
  right(135, 32, { mark: 't3' }),
  straight(20, { mark: 'lip2' }),
  straight(88, { y: 17, mark: 'gap2End' }),
  straight(50, { y: 16, mark: 'land2' }),
  right(20, 30, { mark: 'scA' }),
  right(40, 30),
  left(120, 30, { mark: 'isle4' }),
  right(40, 30, { mark: 'scB' }),
  right(20, 30, { mark: 'isle4Out' }),
  straight(85, { y: 18, mark: 'hop' }),
  right(90, 36, { y: 19, mark: 't4' }),
  straight(76, { y: 20, mark: 'back' }),
  right(90, 40, { mark: 'last' }),
]);
const m = L.marks;
const P = L.pos;

/**
 * Floating scenery (the track has no ground, so scenery is placed by hand): small islands, clouds and balloons
 * scattered around the course with a tiny deterministic random generator, kept clear of the road.
 */
function skyScenery(pts: TrackPoint[], keepClear: Array<{ x: number; z: number }>): PropPlacement[] {
  let seed = 7;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const avoid = [...pts, ...keepClear];
  const clear = (x: number, z: number, r: number): boolean => avoid.every((p) => Math.hypot(p.x - x, p.z - z) > r);
  const out: PropPlacement[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i += 2) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const rx = -(b.z - a.z) / len;
    const rz = (b.x - a.x) / len;
    for (const side of [-1, 1]) {
      const roll = rnd();
      const type = roll < 0.3 ? 'ga_floatisle' : roll < 0.55 ? 'ga_cloud' : roll < 0.7 ? 'ga_floatisle2' : roll < 0.85 ? 'ga_cloud2' : 'ga_hotair';
      const dist = type === 'ga_hotair' ? 40 + rnd() * 50 : 24 + rnd() * 45;
      const x = a.x + rx * dist * side;
      const z = a.z + rz * dist * side;
      if (!clear(x, z, type === 'ga_hotair' ? 22 : 20)) continue;
      const roadY = a.y ?? Y;
      const y = type === 'ga_hotair' ? roadY + 8 + rnd() * 20 : type.startsWith('ga_cloud') ? roadY - 18 + rnd() * 12 : roadY - 10 + rnd() * 12;
      out.push({ type, x: Math.round(x), z: Math.round(z), y: Math.round(y), rot: rnd() * 6.28, scale: 0.8 + rnd() * 0.7 });
    }
  }
  return out;
}

export const WINDMILL_SKY_ISLES: TrackData = {
  id: 'windmill-sky-isles',
  name: 'Windmill Sky Isles',
  cup: 'galaxy',
  theme: 'sky',
  feature: 'Glide between floating windmill islands high above the clouds — two giant glider leaps per lap!',
  width: 14,
  shoulder: 3,
  edge: 'drop',
  autoBank: 0.5,
  start: 0.5,
  points: L.points,
  edges: [
    { from: m.back - 1.2, to: m.start - 1.2, side: 'both', type: 'wall' },
    { from: m.land1 - 0.6, to: m.mill + 1.5, side: 'both', type: 'wall' },
    { from: m.bridgeB - 1.0, to: m.lip2 - 0.1, side: 'both', type: 'wall' },
    // island 4: the chord shortcut leaves/rejoins on the right, so only that side opens up at the junctions
    { from: m.land2 - 0.5, to: m.isle4Out + 1.5, side: 'left', type: 'wall' },
    { from: m.scA + 0.25, to: m.scB - 0.25, side: 'right', type: 'wall' },
    { from: m.scB + 0.25, to: m.isle4Out + 1.5, side: 'right', type: 'wall' },
    { from: m.hop - 1.0, to: m.t4 + 0.6, side: 'both', type: 'wall' },
  ],
  gaps: [
    { from: m.lip1 + 0.05, to: m.gap1End },
    { from: m.lip2 + 0.05, to: m.gap2End },
  ],
  ramps: [
    { at: m.lip1, kind: 'glider', length: 9, height: 2.2 },
    { at: m.lip2, kind: 'glider', length: 9, height: 2.2 },
    { at: m.hop - 1.6, kind: 'trick', length: 6, height: 1.3 },
  ],
  boostPads: [
    { at: m.bridgeA + 0.6, offset: -0.4 },
    { at: m.bridgeA + 0.6, offset: 0.4 },
    { at: m.t4 + 1.0, offset: 0 },
  ],
  itemRows: [{ at: m.start - 0.8 }, { at: m.bridgeA + 2.6 },{ at: m.land2 + 0.1 }, { at: m.back - 1.6, count: 4 }],
  hazards: [
    { kind: 'bumper', at: m.mill - 2.2, offset: 0.45, model: 'ga_hz_cloudbump', radius: 1.6 },
    { kind: 'bumper', at: m.mill - 0.9, offset: -0.45, model: 'ga_hz_cloudbump', radius: 1.6 },
  ],
  shortcuts: [
    {
      points: [
        between(P.scA, P.scB, 0),
        between(P.scA, P.scB, 0.22),
        between(P.scA, P.scB, 0.45),
        between(P.scA, P.scB, 0.62),
        between(P.scA, P.scB, 0.8),
        between(P.scA, P.scB, 1),
      ],
      width: 5.5,
      edge: 'drop',
      surface: 'road',
      joinFrom: m.scA,
      joinTo: m.scB,
      ramps: [{ at: 2, kind: 'trick', length: 5, height: 1.2 }],
      gaps: [{ from: 2.03, to: 2.6 }],
      hint: 'Take the skinny plank bridge and hop the missing planks with the little ramp. No railings up here — keep it steady!',
      aiUse: 0.6,
    },
  ],
  palette: {
    road: 0x6b6f86,
    road2: 0x73788f,
    line: 0xffffff,
    kerb: 0xffd23f,
    kerb2: 0xffffff,
    offroad: 0x7ed957,
    wall: 0xffffff,
    wall2: 0x4fc3f7,
    side: 0x8d6e63,
  },
  sky: {
    light: { sunDir: [0.5, 0.9, 0.5], grade: 0xfffaf2 },
    top: 0x3fa7ff,
    bottom: 0xd6f1ff,
    fog: 0xdff4ff,
    fogNear: 0.45,
    sun: 0xfff6e0,
    ambient: 0xffffff,
    ground: null,
    groundY: -30,
    backdrop: 'clouds',
    backdropColor: 0xffffff,
  },
  supports: { kind: 'rock', color: 0x8d6e63, color2: 0x7a5c50 },
  props: [
    ...skyScenery(
      L.points,
      [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => between(P.scA, P.scB, t)),
    ),
    { type: 'ga_millisle', ...offset(P.land1, 0, -48, 4), scale: 1.2 },
    { type: 'ga_millisle', ...offset(P.start, -40, -32, 12), rot: 1.1 },
    { type: 'ga_millisle', ...offset(P.isle4, 0, -40, 6), rot: 2.2, scale: 0.9 },
    { type: 'ga_airship', ...offset(P.bridgeB, -50, 60, 45), rot: 1.4, scale: 1.3 },
    { type: 'ga_hotair', ...between(P.lip1, P.gap1End, 0.5, 26, 34), scale: 1.4 },
    { type: 'ga_hotair', ...between(P.lip2, P.gap2End, 0.4, -30, 40), scale: 1.6, color: 0xffd0e0 },
  ],
  music: 'galaxy3',
};
