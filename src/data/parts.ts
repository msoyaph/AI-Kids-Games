import type { BodyData, DecalData, GliderData, PaintData, WheelData } from './types';

// Kart bodies. Origin = ground under the kart centre, +Z forward. Wheel positions are mirrored on X.
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
];

export const WHEELS: WheelData[] = [
  {
    id: 'standard',
    name: 'Standard',
    mod: {},
    unlocked: true,
    radius: 0.36,
    width: 0.32,
    model: [
      { shape: 'cyl', s: [0.72, 0.32, 0.72], r: [0, 0, 90], c: 'tire', seg: 12 },
      { shape: 'cyl', s: [0.4, 0.34, 0.4], r: [0, 0, 90], c: 'metal', seg: 8 },
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
];

export const PAINTS: PaintData[] = [
  { id: 'cherry', name: 'Cherry Pop', color: 0xff4d6d, color2: 0xffd23f, unlocked: true },
  { id: 'ocean', name: 'Ocean Splash', color: 0x2f8cff, color2: 0x7ff0ff, unlocked: true },
];

export const DECALS: DecalData[] = [{ id: 'none', name: 'Plain', pattern: 'none', unlocked: true }];

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
