import type { BodyData, DecalData, GliderData, PaintData, WheelData } from './types';

// Kart bodies. Origin = ground under the kart centre, +Z forward. Wheel positions are mirrored on X.
// Stat mods are small (±1–2 bars) so the racer's weight class and driving skill matter most.
export const BODIES: BodyData[] = [
  {
    id: 'zoomster',
    name: 'Zoomster',
    mod: {},
    unlocked: true,
    wheelFront: [0.74, 0.36, 0.95],
    wheelBack: [0.76, 0.38, -0.85],
    seatY: 0.68,
    decals: [
      { p: [0, 0.545, 0.62], w: 1.0, l: 0.5, face: 'top' },
      { p: [0.775, 0.52, 0.05], w: 1.2, l: 0.26, face: 'side', mirror: true, color: 'paint' },
    ],
    model: [
      { shape: 'box', p: [0, 0.42, 0], s: [1.3, 0.24, 2.2], c: 'paint' },
      { shape: 'wedge', p: [0, 0.6, 1.25], s: [1.16, 0.32, 0.62], c: 'paint' },
      { shape: 'box', p: [0, 0.37, 1.62], s: [1.5, 0.14, 0.18], c: 'trim' },
      { shape: 'box', p: [0.62, 0.52, 0.05], s: [0.3, 0.3, 1.3], c: 'paint2', mirror: true },
      { shape: 'box', p: [0, 0.62, -0.32], s: [0.62, 0.14, 0.55], c: 'trim' },
      { shape: 'box', p: [0, 0.9, -0.6], s: [0.62, 0.55, 0.12], c: 'trim' },
      { shape: 'cyl', p: [0, 0.78, 0.42], s: [0.06, 0.42, 0.06], r: [-50, 0, 0], c: 'metal', seg: 6 },
      { shape: 'torus', p: [0, 0.94, 0.3], s: [0.42, 0.42, 0.42], r: [-40, 0, 0], c: 'trim' },
      { shape: 'box', p: [0, 0.66, -1.0], s: [0.8, 0.4, 0.45], c: 'metal' },
      { shape: 'cyl', p: [0.26, 0.72, -1.3], s: [0.13, 0.32, 0.13], r: [90, 0, 0], c: 'metal', seg: 8, mirror: true },
      { shape: 'box', p: [0, 1.08, -1.15], s: [1.34, 0.07, 0.3], c: 'paint2' },
      { shape: 'box', p: [0.45, 0.92, -1.15], s: [0.07, 0.3, 0.07], c: 'trim', mirror: true },
      { shape: 'sphere', p: [0.42, 0.56, 1.42], s: [0.18, 0.18, 0.1], c: 0xfff6b0, seg: 8, mirror: true },
    ],
  },
  {
    id: 'bubble',
    name: 'Bubble Buggy',
    mod: { accel: 1, handling: 1, speed: -1, weight: -1 },
    unlocked: true,
    wheelFront: [0.7, 0.34, 0.85],
    wheelBack: [0.72, 0.36, -0.78],
    seatY: 0.62,
    decals: [{ p: [0.66, 0.62, 0.05], w: 1.0, l: 0.26, face: 'side', mirror: true, color: 'paint2' }],
    model: [
      { shape: 'sphere', p: [0, 0.6, 0.05], s: [1.4, 0.7, 2.1], c: 'paint', seg: 12 },
      { shape: 'box', p: [0, 0.36, 0], s: [1.2, 0.16, 1.9], c: 'trim' },
      { shape: 'torus', p: [0, 0.8, 0.05], s: [1.2, 1.7, 1.2], r: [90, 0, 0], c: 'paint2' },
      { shape: 'box', p: [0, 0.82, -0.45], s: [0.56, 0.5, 0.12], c: 'trim' },
      { shape: 'cyl', p: [0, 0.86, 0.42], s: [0.06, 0.36, 0.06], r: [-50, 0, 0], c: 'metal', seg: 6 },
      { shape: 'torus', p: [0, 1.0, 0.3], s: [0.38, 0.38, 0.38], r: [-40, 0, 0], c: 'trim' },
      { shape: 'sphere', p: [0.34, 0.66, 1.06], s: [0.2, 0.2, 0.12], c: 0xfff6b0, seg: 8, mirror: true },
      { shape: 'cyl', p: [0, 0.62, -1.08], s: [0.22, 0.26, 0.22], r: [90, 0, 0], c: 'metal', seg: 8 },
    ],
  },
  {
    id: 'brick',
    name: 'Brick Bruiser',
    mod: { speed: 1, weight: 2, accel: -1, handling: -1 },
    unlocked: true,
    wheelFront: [0.82, 0.42, 1.0],
    wheelBack: [0.84, 0.44, -0.9],
    seatY: 0.8,
    decals: [
      { p: [0, 0.82, 0.85], w: 1.2, l: 0.6, face: 'top' },
      { p: [0.78, 0.6, 0], w: 1.6, l: 0.4, face: 'side', mirror: true, color: 'paint2' },
    ],
    model: [
      { shape: 'box', p: [0, 0.56, 0.05], s: [1.55, 0.5, 2.4], c: 'paint' },
      { shape: 'box', p: [0, 0.4, 1.36], s: [1.7, 0.3, 0.3], c: 'trim' },
      { shape: 'box', p: [0, 0.4, -1.3], s: [1.7, 0.3, 0.3], c: 'trim' },
      { shape: 'box', p: [0, 0.86, -0.4], s: [0.8, 0.2, 0.7], c: 'trim' },
      { shape: 'box', p: [0, 1.14, -0.72], s: [0.8, 0.6, 0.14], c: 'trim' },
      { shape: 'cyl', p: [0, 0.98, 0.42], s: [0.07, 0.4, 0.07], r: [-50, 0, 0], c: 'metal', seg: 6 },
      { shape: 'torus', p: [0, 1.14, 0.3], s: [0.42, 0.42, 0.42], r: [-40, 0, 0], c: 'trim' },
      { shape: 'box', p: [0.5, 1.1, -1.05], s: [0.22, 0.8, 0.22], c: 'metal', mirror: true },
      { shape: 'cyl', p: [0.5, 1.56, -1.05], s: [0.3, 0.12, 0.3], c: 0x2b2b3a, seg: 8, mirror: true },
      { shape: 'box', p: [0.5, 0.66, 1.25], s: [0.3, 0.2, 0.08], c: 0xfff6b0, mirror: true },
    ],
  },
  {
    id: 'rocket',
    name: 'Rocket Racer',
    mod: { speed: 2, accel: -1, traction: -1 },
    unlocked: false,
    wheelFront: [0.7, 0.34, 1.05],
    wheelBack: [0.78, 0.4, -0.95],
    seatY: 0.6,
    decals: [{ p: [0, 0.92, 0.75], w: 0.5, l: 0.6, face: 'top' }],
    model: [
      { shape: 'capsule', p: [0, 0.5, 0.15], s: [1.0, 2.6, 0.8], r: [90, 0, 0], c: 'paint', seg: 10 },
      { shape: 'cone', p: [0, 0.5, 1.75], s: [0.62, 0.7, 0.5], r: [90, 0, 0], c: 'paint2', seg: 10 },
      { shape: 'wedge', p: [0.62, 0.62, -0.95], s: [0.5, 0.6, 0.8], c: 'paint2', mirror: true },
      { shape: 'wedge', p: [0, 1.0, -1.1], s: [0.1, 0.7, 0.8], c: 'paint2' },
      { shape: 'box', p: [0, 0.62, -0.32], s: [0.6, 0.14, 0.55], c: 'trim' },
      { shape: 'box', p: [0, 0.86, -0.58], s: [0.6, 0.5, 0.1], c: 'trim' },
      { shape: 'cyl', p: [0, 0.78, 0.42], s: [0.06, 0.4, 0.06], r: [-50, 0, 0], c: 'metal', seg: 6 },
      { shape: 'torus', p: [0, 0.94, 0.3], s: [0.4, 0.4, 0.4], r: [-40, 0, 0], c: 'trim' },
      { shape: 'cyl', p: [0, 0.5, -1.3], s: [0.5, 0.3, 0.5], r: [90, 0, 0], c: 'metal', seg: 10 },
      { shape: 'cyl', p: [0, 0.5, -1.46], s: [0.36, 0.1, 0.36], r: [90, 0, 0], c: 0xff9f1c, seg: 10 },
    ],
  },
  {
    id: 'bathtub',
    name: 'Bathtub Blaster',
    mod: { handling: 1, traction: 1, speed: -1 },
    unlocked: false,
    wheelFront: [0.76, 0.36, 0.9],
    wheelBack: [0.78, 0.38, -0.85],
    seatY: 0.5,
    decals: [{ p: [0.81, 0.62, 0], w: 1.4, l: 0.3, face: 'side', mirror: true, color: 'paint2' }],
    model: [
      { shape: 'capsule', p: [0, 0.62, 0], s: [1.6, 2.4, 0.8], r: [90, 0, 0], c: 0xffffff, seg: 12 },
      { shape: 'capsule', p: [0, 0.72, 0], s: [1.35, 2.15, 0.62], r: [90, 0, 0], c: 'paint', seg: 12 },
      { shape: 'cyl', p: [0.3, 0.2, 0.9], s: [0.14, 0.4, 0.14], c: 0xffd23f, seg: 6, mirror: true },
      { shape: 'cyl', p: [0, 1.15, -1.0], s: [0.08, 0.5, 0.08], c: 'metal', seg: 6 },
      { shape: 'cyl', p: [0, 1.38, -0.86], s: [0.08, 0.36, 0.08], r: [90, 0, 0], c: 'metal', seg: 6 },
      { shape: 'sphere', p: [0.45, 1.05, 1.05], s: [0.32, 0.3, 0.36], c: 0xffd23f, seg: 8 },
      { shape: 'sphere', p: [0.45, 1.3, 1.12], s: [0.22, 0.22, 0.22], c: 0xffd23f, seg: 8 },
      { shape: 'cone', p: [0.45, 1.28, 1.26], s: [0.12, 0.12, 0.1], r: [90, 0, 0], c: 0xff9f1c, seg: 5 },
      { shape: 'cyl', p: [0, 0.86, 0.42], s: [0.06, 0.4, 0.06], r: [-50, 0, 0], c: 'metal', seg: 6 },
      { shape: 'torus', p: [0, 1.02, 0.3], s: [0.4, 0.4, 0.4], r: [-40, 0, 0], c: 'trim' },
      { shape: 'sphere', p: [-0.3, 0.98, -0.6], s: [0.22, 0.18, 0.22], c: 0xdff6ff, seg: 6 },
      { shape: 'sphere', p: [-0.1, 1.05, -0.8], s: [0.16, 0.14, 0.16], c: 0xdff6ff, seg: 6 },
    ],
  },
  {
    id: 'pickup',
    name: 'Pickup Pal',
    mod: { traction: 2, weight: 1, handling: -1 },
    unlocked: false,
    wheelFront: [0.82, 0.44, 1.0],
    wheelBack: [0.84, 0.46, -0.95],
    seatY: 0.82,
    decals: [
      { p: [0, 0.975, 1.0], w: 1.2, l: 0.6, face: 'top' },
      { p: [0.8, 0.86, -0.75], w: 0.8, l: 0.26, face: 'side', mirror: true, color: 'paint2' },
    ],
    model: [
      { shape: 'box', p: [0, 0.6, 0.1], s: [1.6, 0.36, 2.6], c: 'trim' },
      { shape: 'box', p: [0, 0.82, 1.0], s: [1.5, 0.3, 0.9], c: 'paint' },
      { shape: 'box', p: [0, 0.86, -0.75], s: [1.6, 0.32, 1.1], c: 'paint' },
      { shape: 'box', p: [0, 0.87, -0.75], s: [1.3, 0.34, 0.9], c: 0x4a4e5c },
      { shape: 'box', p: [0, 0.96, -0.2], s: [0.7, 0.16, 0.5], c: 'trim' },
      { shape: 'box', p: [0, 1.24, -0.42], s: [0.7, 0.55, 0.12], c: 'trim' },
      { shape: 'cyl', p: [0, 1.08, 0.45], s: [0.07, 0.4, 0.07], r: [-50, 0, 0], c: 'metal', seg: 6 },
      { shape: 'torus', p: [0, 1.24, 0.33], s: [0.42, 0.42, 0.42], r: [-40, 0, 0], c: 'trim' },
      { shape: 'box', p: [0, 1.6, -0.2], s: [1.5, 0.08, 0.4], c: 'paint2' },
      { shape: 'cyl', p: [0.6, 1.4, -0.2], s: [0.06, 0.4, 0.06], c: 'metal', seg: 4, mirror: true },
      { shape: 'box', p: [0.5, 0.8, 1.46], s: [0.32, 0.2, 0.06], c: 0xfff6b0, mirror: true },
    ],
  },
  {
    id: 'scooter',
    name: 'Scooter Swift',
    mod: { accel: 2, weight: -2, speed: -1 },
    unlocked: false,
    wheelFront: [0.56, 0.32, 0.85],
    wheelBack: [0.58, 0.34, -0.75],
    seatY: 0.6,
    decals: [{ p: [0, 0.475, 0.5], w: 0.6, l: 0.5, face: 'top' }],
    model: [
      { shape: 'box', p: [0, 0.38, 0], s: [0.9, 0.18, 1.9], c: 'paint' },
      { shape: 'wedge', p: [0, 0.6, 1.0], s: [0.8, 0.5, 0.5], c: 'paint' },
      { shape: 'cyl', p: [0, 0.98, 0.95], s: [0.1, 0.8, 0.1], r: [-15, 0, 0], c: 'metal', seg: 6 },
      { shape: 'box', p: [0, 1.36, 1.02], s: [0.9, 0.08, 0.08], c: 'trim' },
      { shape: 'sphere', p: [0.45, 1.36, 1.02], s: [0.14, 0.14, 0.14], c: 'paint2', seg: 6, mirror: true },
      { shape: 'box', p: [0, 0.56, -0.35], s: [0.56, 0.16, 0.7], c: 'trim' },
      { shape: 'box', p: [0, 0.8, -0.62], s: [0.56, 0.4, 0.1], c: 'paint2' },
      { shape: 'sphere', p: [0, 0.82, 1.18], s: [0.24, 0.24, 0.14], c: 0xfff6b0, seg: 8 },
    ],
  },
  {
    id: 'royal',
    name: 'Royal Coach',
    mod: { speed: 1, handling: 1, accel: -1, traction: -1 },
    unlocked: false,
    wheelFront: [0.78, 0.4, 0.95],
    wheelBack: [0.82, 0.46, -0.9],
    seatY: 0.74,
    decals: [{ p: [0.84, 0.82, -0.1], w: 1.2, l: 0.36, face: 'side', mirror: true, color: 'paint2' }],
    model: [
      { shape: 'box', p: [0, 0.5, 0.05], s: [1.4, 0.3, 2.3], c: 0xffd23f },
      { shape: 'capsule', p: [0, 0.82, -0.1], s: [1.65, 1.6, 1.2], r: [90, 0, 0], c: 'paint', seg: 10 },
      { shape: 'box', p: [0, 0.98, -0.1], s: [1.2, 0.4, 1.2], c: 'paint' },
      { shape: 'box', p: [0, 0.8, -0.4], s: [0.62, 0.14, 0.5], c: 0x8d2b4a },
      { shape: 'box', p: [0, 1.15, -0.62], s: [0.62, 0.6, 0.12], c: 0xffd23f },
      { shape: 'cone', p: [0, 1.6, -0.62], s: [0.3, 0.3, 0.1], c: 0xffd23f, seg: 4 },
      { shape: 'cyl', p: [0, 0.92, 0.48], s: [0.06, 0.4, 0.06], r: [-50, 0, 0], c: 0xffd23f, seg: 6 },
      { shape: 'torus', p: [0, 1.08, 0.36], s: [0.4, 0.4, 0.4], r: [-40, 0, 0], c: 0xffd23f },
      { shape: 'sphere', p: [0.66, 1.0, 0.9], s: [0.2, 0.2, 0.2], c: 0xfff6b0, seg: 8, mirror: true },
      { shape: 'cyl', p: [0.66, 0.78, 0.9], s: [0.06, 0.4, 0.06], c: 0xffd23f, seg: 4, mirror: true },
      { shape: 'torus', p: [0, 0.5, 1.22], s: [0.5, 0.5, 0.5], c: 0xffd23f },
    ],
  },
];

const TIRE: WheelData['model'] = [
  { shape: 'cyl', s: [0.72, 0.32, 0.72], r: [0, 0, 90], c: 'tire', seg: 12 },
  { shape: 'cyl', s: [0.4, 0.34, 0.4], r: [0, 0, 90], c: 'metal', seg: 8 },
];

export const WHEELS: WheelData[] = [
  { id: 'standard', name: 'Standard', mod: {}, unlocked: true, radius: 0.36, width: 0.32, model: TIRE },
  {
    id: 'chunky',
    name: 'Chunky Trax',
    mod: { traction: 2, speed: -1 },
    unlocked: true,
    radius: 0.4,
    width: 0.42,
    model: [
      { shape: 'cyl', s: [0.8, 0.44, 0.8], r: [0, 0, 90], c: 'tire', seg: 10 },
      { shape: 'torus', s: [0.82, 0.82, 1.6], r: [0, 90, 0], c: 0x3a3a46, seg: 10 },
      { shape: 'cyl', s: [0.38, 0.46, 0.38], r: [0, 0, 90], c: 'paint2', seg: 6 },
    ],
  },
  {
    id: 'slick',
    name: 'Speed Slicks',
    mod: { speed: 1, traction: -1 },
    unlocked: true,
    radius: 0.34,
    width: 0.36,
    model: [
      { shape: 'cyl', s: [0.68, 0.36, 0.68], r: [0, 0, 90], c: 'tire', seg: 14 },
      { shape: 'cyl', s: [0.5, 0.38, 0.5], r: [0, 0, 90], c: 'metal', seg: 10 },
      { shape: 'cyl', s: [0.2, 0.4, 0.2], r: [0, 0, 90], c: 'paint', seg: 6 },
    ],
  },
  {
    id: 'roller',
    name: 'Mini Rollers',
    mod: { accel: 1, handling: 1, speed: -1 },
    unlocked: false,
    radius: 0.3,
    width: 0.28,
    model: [
      { shape: 'cyl', s: [0.6, 0.28, 0.6], r: [0, 0, 90], c: 'paint2', seg: 12 },
      { shape: 'cyl', s: [0.3, 0.3, 0.3], r: [0, 0, 90], c: 0xffffff, seg: 8 },
    ],
  },
  {
    id: 'donut',
    name: 'Donut Wheels',
    mod: { handling: 1, weight: -1 },
    unlocked: false,
    radius: 0.37,
    width: 0.34,
    model: [
      { shape: 'torus', s: [0.9, 0.9, 1.7], r: [0, 90, 0], c: 0xd7a26c, seg: 12 },
      { shape: 'torus', s: [0.88, 0.88, 1.2], r: [0, 90, 0], c: 0xff8fc8, seg: 12 },
      { shape: 'cyl', s: [0.2, 0.3, 0.2], r: [0, 0, 90], c: 0xffffff, seg: 6 },
    ],
  },
  {
    id: 'gear',
    name: 'Gear Grips',
    mod: { weight: 1, traction: 1, accel: -1 },
    unlocked: false,
    radius: 0.38,
    width: 0.34,
    model: [
      { shape: 'cyl', s: [0.7, 0.34, 0.7], r: [0, 0, 90], c: 0x8a8fa8, seg: 8 },
      { shape: 'box', s: [0.18, 0.36, 0.82], c: 0x6c7086 },
      { shape: 'box', s: [0.18, 0.36, 0.82], r: [60, 0, 0], c: 0x6c7086 },
      { shape: 'box', s: [0.18, 0.36, 0.82], r: [120, 0, 0], c: 0x6c7086 },
      { shape: 'cyl', s: [0.22, 0.38, 0.22], r: [0, 0, 90], c: 'paint', seg: 6 },
    ],
  },
];

export const GLIDERS: GliderData[] = [
  {
    id: 'kite',
    name: 'Sky Kite',
    mod: {},
    unlocked: true,
    model: [
      { shape: 'box', p: [0, 2.1, -0.5], s: [3.4, 0.08, 1.1], c: 'paint2' },
      { shape: 'box', p: [1.2, 2.1, -0.5], s: [1.0, 0.1, 1.12], c: 'paint', mirror: true },
      { shape: 'cyl', p: [0.55, 1.45, -0.55], s: [0.04, 1.3, 0.04], r: [0, 0, 20], c: 'trim', seg: 4, mirror: true },
    ],
  },
  {
    id: 'paper',
    name: 'Paper Wing',
    mod: { accel: 1, speed: -1 },
    unlocked: true,
    model: [
      { shape: 'wedge', p: [0.9, 2.1, -0.5], s: [1.8, 0.06, 1.4], r: [0, 0, -6], c: 0xffffff, mirror: true },
      { shape: 'box', p: [0, 2.04, -0.5], s: [0.12, 0.16, 1.4], c: 'paint' },
      { shape: 'cyl', p: [0.45, 1.45, -0.55], s: [0.04, 1.3, 0.04], r: [0, 0, 18], c: 'trim', seg: 4, mirror: true },
    ],
  },
  {
    id: 'parasol',
    name: 'Party Parasol',
    mod: { handling: 1, speed: -1 },
    unlocked: false,
    model: [
      { shape: 'cone', p: [0, 2.3, -0.4], s: [3.4, 0.8, 3.0], c: 'paint', seg: 8 },
      { shape: 'cone', p: [0, 2.34, -0.4], s: [2.0, 0.5, 1.8], r: [0, 22, 0], c: 'paint2', seg: 8 },
      { shape: 'cyl', p: [0, 1.5, -0.4], s: [0.06, 1.6, 0.06], c: 'trim', seg: 4 },
    ],
  },
  {
    id: 'butterfly',
    name: 'Butterfly Wings',
    mod: { accel: 1, handling: 1, weight: -1, speed: -1 },
    unlocked: false,
    model: [
      { shape: 'sphere', p: [0.9, 2.1, -0.2], s: [1.6, 0.08, 1.2], r: [0, -20, 0], c: 'paint', seg: 10, mirror: true },
      { shape: 'sphere', p: [0.7, 2.06, -1.0], s: [1.1, 0.08, 0.9], r: [0, 25, 0], c: 'paint2', seg: 10, mirror: true },
      { shape: 'capsule', p: [0, 2.06, -0.5], s: [0.2, 1.4, 0.2], r: [90, 0, 0], c: 'trim', seg: 6 },
      { shape: 'cyl', p: [0.3, 1.45, -0.5], s: [0.04, 1.3, 0.04], r: [0, 0, 10], c: 'trim', seg: 4, mirror: true },
    ],
  },
  {
    id: 'cloudpuff',
    name: 'Cloud Puff',
    mod: { weight: 1, traction: 1, accel: -1 },
    unlocked: false,
    model: [
      { shape: 'ico', p: [0, 2.3, -0.5], s: [1.6, 0.9, 1.3], c: 0xffffff, seg: 1 },
      { shape: 'ico', p: [0.9, 2.15, -0.45], s: [1.1, 0.7, 1.0], c: 0xf0f4ff, seg: 1, mirror: true },
      { shape: 'cyl', p: [0.4, 1.45, -0.5], s: [0.04, 1.3, 0.04], r: [0, 0, 14], c: 'trim', seg: 4, mirror: true },
    ],
  },
];

export const PAINTS: PaintData[] = [
  { id: 'cherry', name: 'Cherry Pop', color: 0xff4d6d, color2: 0xffd23f, unlocked: true },
  { id: 'ocean', name: 'Ocean Splash', color: 0x2f8cff, color2: 0x7ff0ff, unlocked: true },
  { id: 'lime', name: 'Lime Zinger', color: 0x6ccf3a, color2: 0xfff176, unlocked: true },
  { id: 'sunny', name: 'Sunny Side', color: 0xffc21a, color2: 0xff6f3c, unlocked: true },
  { id: 'grape', name: 'Grape Soda', color: 0x8a4dff, color2: 0xff8fc8, unlocked: true },
  { id: 'tangerine', name: 'Tangerine', color: 0xff8a1f, color2: 0x4ce0d2, unlocked: false },
  { id: 'bubblegum', name: 'Bubblegum', color: 0xff8fc8, color2: 0xffffff, unlocked: false },
  { id: 'mint', name: 'Mint Chip', color: 0x7ef2c8, color2: 0x6d4c41, unlocked: false },
  { id: 'midnight', name: 'Midnight', color: 0x2b2550, color2: 0x4ce0d2, unlocked: false },
  { id: 'gold', name: 'Golden Glory', color: 0xffd23f, color2: 0xffffff, unlocked: false },
  { id: 'lava', name: 'Lava Lamp', color: 0xff5a1f, color2: 0x8a1fff, unlocked: false },
  { id: 'prism', name: 'Prism', color: 0x4ce0d2, color2: 0xff4dd2, unlocked: false },
];

export const DECALS: DecalData[] = [
  { id: 'none', name: 'Plain', pattern: 'none', unlocked: true },
  { id: 'stripes', name: 'Racing Stripes', pattern: 'stripes', unlocked: true },
  { id: 'stars', name: 'Stars', pattern: 'stars', unlocked: true },
  { id: 'dots', name: 'Polka Dots', pattern: 'dots', unlocked: true },
  { id: 'bolt', name: 'Lightning', pattern: 'bolt', unlocked: false },
  { id: 'hearts', name: 'Hearts', pattern: 'hearts', unlocked: false },
  { id: 'checker', name: 'Checkers', pattern: 'checker', unlocked: false },
  { id: 'flame', name: 'Hot Flames', pattern: 'flame', unlocked: false },
  { id: 'waves', name: 'Waves', pattern: 'waves', unlocked: false },
  { id: 'number', name: 'Number One', pattern: 'number', unlocked: false },
  { id: 'zigzag', name: 'Zigzag', pattern: 'zigzag', unlocked: false },
  { id: 'swirl', name: 'Swirl', pattern: 'swirl', unlocked: false },
];

export function findBody(id: string): BodyData {
  return BODIES.find((b) => b.id === id) ?? BODIES[0];
}
export function findWheels(id: string): WheelData {
  return WHEELS.find((b) => b.id === id) ?? WHEELS[0];
}
export function findGlider(id: string): GliderData {
  return GLIDERS.find((b) => b.id === id) ?? GLIDERS[0];
}
export function findPaint(id: string): PaintData {
  return PAINTS.find((b) => b.id === id) ?? PAINTS[0];
}
export function findDecal(id: string): DecalData {
  return DECALS.find((b) => b.id === id) ?? DECALS[0];
}
