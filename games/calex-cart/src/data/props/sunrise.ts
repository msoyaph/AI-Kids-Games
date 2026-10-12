import type { ModelPart } from '../types';

/** Scenery + hazard recipes for the Sunrise Cup themes. Names must be unique across all prop files. */
export const SUNRISE_PROPS: Record<string, ModelPart[]> = {
  // ---------------- beach ----------------
  umbrella: [
    { shape: 'cyl', p: [0, 1.4, 0], s: [0.12, 2.8, 0.12], c: 0xffffff, seg: 5 },
    { shape: 'cone', p: [0, 2.9, 0], s: [3.4, 0.9, 3.4], c: 0xff4d6d, seg: 8 },
    { shape: 'cone', p: [0, 2.95, 0], s: [2.0, 0.6, 2.0], r: [0, 22, 0], c: 0xffffff, seg: 8 },
    { shape: 'box', p: [1.2, 0.2, 0.4], s: [1.0, 0.1, 2.0], r: [0, 20, 0], c: 0x4ce0d2 },
  ],
  umbrella2: [
    { shape: 'cyl', p: [0, 1.4, 0], s: [0.12, 2.8, 0.12], c: 0xffffff, seg: 5 },
    { shape: 'cone', p: [0, 2.9, 0], s: [3.4, 0.9, 3.4], c: 0x3fa7ff, seg: 8 },
    { shape: 'cone', p: [0, 2.95, 0], s: [2.0, 0.6, 2.0], r: [0, 22, 0], c: 0xffd23f, seg: 8 },
  ],
  sandcastle: [
    { shape: 'box', p: [0, 0.6, 0], s: [3.2, 1.2, 3.2], c: 0xf2cf8a },
    { shape: 'cyl', p: [1.5, 1.3, 1.5], s: [1.1, 2.6, 1.1], c: 0xe8c27a, seg: 8, mirror: true },
    { shape: 'cyl', p: [1.5, 1.3, -1.5], s: [1.1, 2.6, 1.1], c: 0xe8c27a, seg: 8, mirror: true },
    { shape: 'cone', p: [1.5, 2.9, 1.5], s: [1.2, 0.8, 1.2], c: 0xf2cf8a, seg: 8, mirror: true },
    { shape: 'cone', p: [1.5, 2.9, -1.5], s: [1.2, 0.8, 1.2], c: 0xf2cf8a, seg: 8, mirror: true },
    { shape: 'cyl', p: [0, 1.8, 0], s: [1.4, 1.2, 1.4], c: 0xe8c27a, seg: 8 },
    { shape: 'box', p: [0, 2.9, 0], s: [0.06, 1.2, 0.06], c: 0xffffff },
    { shape: 'box', p: [0.3, 3.3, 0], s: [0.6, 0.4, 0.04], c: 0xff4d6d },
  ],
  lifeguard: [
    { shape: 'cyl', p: [0.8, 1.6, 0.8], s: [0.18, 3.2, 0.18], c: 0xffffff, seg: 5, mirror: true },
    { shape: 'cyl', p: [0.8, 1.6, -0.8], s: [0.18, 3.2, 0.18], c: 0xffffff, seg: 5, mirror: true },
    { shape: 'box', p: [0, 3.6, 0], s: [2.2, 1.4, 2.2], c: 0xff4d6d },
    { shape: 'wedge', p: [0, 4.6, 0], s: [2.8, 0.6, 2.8], r: [0, 180, 0], c: 0xffffff },
    { shape: 'box', p: [0, 2.4, 1.6], s: [1.0, 0.1, 1.6], r: [40, 0, 0], c: 0xd9a066 },
  ],
  surfboard: [
    { shape: 'capsule', p: [0, 1.3, 0], s: [1.1, 2.6, 0.25], r: [0, 0, 8], c: 0x4ce0d2, seg: 8 },
    { shape: 'box', p: [0.08, 1.3, 0.08], s: [0.12, 2.0, 0.05], r: [0, 0, 8], c: 0xffffff },
  ],
  beachball: [
    { shape: 'sphere', p: [0, 0.6, 0], s: [1.2, 1.2, 1.2], c: 0xffffff, seg: 10 },
    { shape: 'torus', p: [0, 0.6, 0], s: [1.45, 1.45, 1.45], c: 0xff4d6d, seg: 12 },
    { shape: 'torus', p: [0, 0.6, 0], s: [1.45, 1.45, 1.45], r: [0, 90, 0], c: 0x3fa7ff, seg: 12 },
  ],
  lighthouse: [
    { shape: 'cyl', p: [0, 1, 0], s: [8, 2, 8], c: 0x8a8f9c, seg: 10 },
    { shape: 'cyl', p: [0, 6, 0], s: [5, 8, 5], c: 0xffffff, seg: 10 },
    { shape: 'cyl', p: [0, 12, 0], s: [4.4, 4, 4.4], c: 0xff4d6d, seg: 10 },
    { shape: 'cyl', p: [0, 17, 0], s: [3.8, 6, 3.8], c: 0xffffff, seg: 10 },
    { shape: 'cyl', p: [0, 21, 0], s: [4.6, 0.6, 4.6], c: 0x2b2b3a, seg: 10 },
    { shape: 'cyl', p: [0, 22.4, 0], s: [3, 2.4, 3], c: 0xfff3b0, seg: 10 },
    { shape: 'cone', p: [0, 24.6, 0], s: [4, 2.2, 4], c: 0xff4d6d, seg: 10 },
  ],
  sailboat: [
    { shape: 'wedge', p: [0, 0.5, 0], s: [2.4, 1.0, 6.0], r: [180, 0, 0], c: 0xffffff },
    { shape: 'box', p: [0, 0.9, 0], s: [2.2, 0.2, 5.4], c: 0x8a5a33 },
    { shape: 'cyl', p: [0, 4.0, 0.3], s: [0.2, 6, 0.2], c: 0x8a5a33, seg: 5 },
    { shape: 'wedge', p: [0, 4.0, -0.9], s: [0.08, 5.0, 2.4], c: 0xff6fae },
  ],
  dunegrass: [
    { shape: 'cone', p: [0, 0.6, 0], s: [0.3, 1.2, 0.3], r: [0, 0, 10], c: 0x9ccc65, seg: 4 },
    { shape: 'cone', p: [0.3, 0.5, 0.2], s: [0.25, 1.0, 0.25], r: [0, 0, -12], c: 0x8bc34a, seg: 4 },
    { shape: 'cone', p: [-0.25, 0.45, -0.2], s: [0.25, 0.9, 0.25], r: [10, 0, 0], c: 0xaed581, seg: 4 },
  ],
  starfish: [
    { shape: 'box', p: [0, 0.1, 0.5], s: [0.35, 0.18, 1.0], c: 0xff9f1c },
    { shape: 'box', p: [0.47, 0.1, 0.15], s: [0.35, 0.18, 1.0], r: [0, 72, 0], c: 0xff9f1c },
    { shape: 'box', p: [0.3, 0.1, -0.4], s: [0.35, 0.18, 1.0], r: [0, 144, 0], c: 0xff9f1c },
    { shape: 'box', p: [-0.3, 0.1, -0.4], s: [0.35, 0.18, 1.0], r: [0, 216, 0], c: 0xff9f1c },
    { shape: 'box', p: [-0.47, 0.1, 0.15], s: [0.35, 0.18, 1.0], r: [0, 288, 0], c: 0xff9f1c },
  ],
  pierpost: [{ shape: 'cyl', p: [0, 2, 0], s: [0.6, 6, 0.6], c: 0x8a5a33, seg: 6 }],
  hz_crab2: [
    { shape: 'sphere', p: [0, 0.8, 0], s: [2.2, 1.1, 1.7], c: 0xff7043, seg: 10 },
    { shape: 'sphere', p: [0.35, 1.45, 0.6], s: [0.3, 0.45, 0.3], c: 0xffffff, seg: 6, mirror: true },
    { shape: 'sphere', p: [0.35, 1.5, 0.7], s: [0.14, 0.2, 0.1], c: 0x1d1d2b, seg: 5, mirror: true },
    { shape: 'sphere', p: [1.35, 0.95, 0.7], s: [0.9, 0.55, 0.6], r: [0, 25, 0], c: 0xff8a65, seg: 8, mirror: true },
    { shape: 'cyl', p: [0.95, 0.35, 0.25], s: [0.14, 0.8, 0.14], r: [0, 0, 35], c: 0xe64a19, seg: 4, mirror: true },
    { shape: 'cyl', p: [0.95, 0.35, -0.35], s: [0.14, 0.8, 0.14], r: [0, 0, 35], c: 0xe64a19, seg: 4, mirror: true },
    { shape: 'torus', p: [0, 0.75, 0.75], s: [0.6, 0.35, 0.4], c: 0x1d1d2b, seg: 8 },
  ],

  // ---------------- rooftops ----------------
  tower: [
    { shape: 'box', p: [0, 30, 0], s: [18, 60, 18], c: 0x8fa3c7 },
    { shape: 'box', p: [0, 30, 9.05], s: [14, 54, 0.1], c: 0xbfe4ff },
    { shape: 'box', p: [9.05, 30, 0], s: [0.1, 54, 14], c: 0xa8d4f5 },
    { shape: 'box', p: [0, 30, -9.05], s: [14, 54, 0.1], c: 0xbfe4ff },
    { shape: 'box', p: [-9.05, 30, 0], s: [0.1, 54, 14], c: 0xa8d4f5 },
    { shape: 'box', p: [0, 60.5, 0], s: [19, 1, 19], c: 0x5d6178 },
    { shape: 'cyl', p: [4, 63, 4], s: [3, 4, 3], c: 0xd0a070, seg: 8 },
  ],
  tower2: [
    { shape: 'box', p: [0, 22, 0], s: [14, 44, 22], c: 0xff9f80 },
    { shape: 'box', p: [7.05, 22, 0], s: [0.1, 40, 18], c: 0xffe0b2 },
    { shape: 'box', p: [-7.05, 22, 0], s: [0.1, 40, 18], c: 0xffe0b2 },
    { shape: 'box', p: [0, 22, 11.05], s: [10, 40, 0.1], c: 0xfff3e0 },
    { shape: 'box', p: [0, 44.5, 0], s: [15, 1, 23], c: 0x5d6178 },
    { shape: 'box', p: [3, 46, -5], s: [3, 2, 3], c: 0xc0c8d8 },
  ],
  tower3: [
    { shape: 'cyl', p: [0, 35, 0], s: [16, 70, 16], c: 0x80cbc4, seg: 8 },
    { shape: 'cyl', p: [0, 35, 0], s: [16.2, 64, 16.2], c: 0xb2f2ec, seg: 8 },
    { shape: 'cone', p: [0, 74, 0], s: [14, 8, 14], c: 0x4db6ac, seg: 8 },
    { shape: 'cyl', p: [0, 80, 0], s: [0.4, 6, 0.4], c: 0xffffff, seg: 4 },
  ],
  watertank: [
    { shape: 'cyl', p: [1, 1.5, 1], s: [0.25, 3, 0.25], c: 0x6d4c41, seg: 4, mirror: true },
    { shape: 'cyl', p: [1, 1.5, -1], s: [0.25, 3, 0.25], c: 0x6d4c41, seg: 4, mirror: true },
    { shape: 'cyl', p: [0, 4.2, 0], s: [3.2, 2.8, 3.2], c: 0xa1887f, seg: 10 },
    { shape: 'cone', p: [0, 6.2, 0], s: [3.6, 1.4, 3.6], c: 0x6d4c41, seg: 10 },
  ],
  billboard: [
    { shape: 'cyl', p: [2.5, 2.5, 0], s: [0.3, 5, 0.3], c: 0x5d6178, seg: 5, mirror: true },
    { shape: 'box', p: [0, 6, 0], s: [8, 3.6, 0.3], c: 0xffd23f },
    { shape: 'box', p: [-1.5, 6, 0.2], s: [3.5, 2.6, 0.1], c: 0xff4d6d },
    { shape: 'sphere', p: [2.2, 6, 0.2], s: [1.8, 1.8, 0.2], c: 0x3fa7ff, seg: 10 },
  ],
  acunit: [
    { shape: 'box', p: [0, 0.6, 0], s: [2.2, 1.2, 1.6], c: 0xc0c8d8 },
    { shape: 'cyl', p: [0, 1.22, 0], s: [1.2, 0.06, 1.2], c: 0x5d6178, seg: 10 },
  ],
  antenna: [
    { shape: 'cyl', p: [0, 4, 0], s: [0.15, 8, 0.15], c: 0xc0c8d8, seg: 4 },
    { shape: 'box', p: [0, 6, 0], s: [2, 0.1, 0.1], c: 0xc0c8d8 },
    { shape: 'box', p: [0, 7, 0], s: [1.4, 0.1, 0.1], c: 0xc0c8d8 },
    { shape: 'sphere', p: [0, 8.1, 0], s: [0.4, 0.4, 0.4], c: 0xff4d6d, seg: 6 },
  ],
  pigeon: [
    { shape: 'sphere', p: [0, 0.35, 0], s: [0.4, 0.35, 0.6], c: 0x9e9e9e, seg: 6 },
    { shape: 'sphere', p: [0, 0.6, 0.25], s: [0.25, 0.25, 0.25], c: 0x8e8e8e, seg: 6 },
    { shape: 'cone', p: [0, 0.6, 0.42], s: [0.08, 0.15, 0.08], r: [90, 0, 0], c: 0xffb74d, seg: 4 },
  ],

  // ---------------- candy factory ----------------
  lollipop: [
    { shape: 'cyl', p: [0, 2.5, 0], s: [0.3, 5, 0.3], c: 0xffffff, seg: 6 },
    { shape: 'cyl', p: [0, 5.8, 0], s: [3.4, 0.5, 3.4], r: [90, 0, 0], c: 0xff6fae, seg: 16 },
    { shape: 'torus', p: [0, 5.8, 0], s: [2.6, 2.6, 3], c: 0xffffff, seg: 16 },
    { shape: 'torus', p: [0, 5.8, 0], s: [1.4, 1.4, 3], c: 0xffd23f, seg: 14 },
  ],
  candycane: [
    { shape: 'cyl', p: [0, 2.5, 0], s: [0.8, 5, 0.8], c: 0xffffff, seg: 8 },
    { shape: 'torus', p: [0, 1, 0], s: [1.2, 1.2, 3], r: [90, 0, 0], c: 0xff4d6d, seg: 8 },
    { shape: 'torus', p: [0, 2.4, 0], s: [1.2, 1.2, 3], r: [90, 0, 0], c: 0xff4d6d, seg: 8 },
    { shape: 'torus', p: [0, 3.8, 0], s: [1.2, 1.2, 3], r: [90, 0, 0], c: 0xff4d6d, seg: 8 },
    { shape: 'torus', p: [0.9, 5.0, 0], s: [2.2, 2.2, 6], r: [0, 0, 0], c: 0xffffff, seg: 10 },
  ],
  gumdrop: [
    { shape: 'cone', p: [0, 0.9, 0], s: [2.2, 1.8, 2.2], c: 0x8cff6b, seg: 8 },
    { shape: 'sphere', p: [0, 1.4, 0], s: [1.4, 1.2, 1.4], c: 0x9cff80, seg: 8 },
  ],
  gumdrop2: [
    { shape: 'cone', p: [0, 0.9, 0], s: [2.2, 1.8, 2.2], c: 0xb47bff, seg: 8 },
    { shape: 'sphere', p: [0, 1.4, 0], s: [1.4, 1.2, 1.4], c: 0xc79bff, seg: 8 },
  ],
  cupcake: [
    { shape: 'cone', p: [0, 1.0, 0], s: [3.0, 2.0, 3.0], r: [180, 0, 0], c: 0xffb74d, seg: 10 },
    { shape: 'sphere', p: [0, 2.3, 0], s: [3.2, 1.8, 3.2], c: 0xffc1e3, seg: 10 },
    { shape: 'sphere', p: [0, 3.2, 0], s: [1.8, 1.0, 1.8], c: 0xffe0f0, seg: 8 },
    { shape: 'sphere', p: [0, 3.9, 0], s: [0.7, 0.7, 0.7], c: 0xff1744, seg: 8 },
  ],
  donut: [
    { shape: 'torus', p: [0, 1.2, 0], s: [4, 4, 5], r: [90, 0, 0], c: 0xd7a26c, seg: 14 },
    { shape: 'torus', p: [0, 1.5, 0], s: [3.9, 3.9, 3.2], r: [90, 0, 0], c: 0xff8fc8, seg: 14 },
    { shape: 'box', p: [0.8, 1.9, 0.5], s: [0.5, 0.12, 0.12], r: [0, 30, 0], c: 0xffffff },
    { shape: 'box', p: [-0.6, 1.9, 1.0], s: [0.5, 0.12, 0.12], r: [0, -40, 0], c: 0x4ce0d2 },
    { shape: 'box', p: [-0.9, 1.9, -0.6], s: [0.5, 0.12, 0.12], r: [0, 70, 0], c: 0xffd23f },
  ],
  chocobar: [
    { shape: 'box', p: [0, 1.5, 0], s: [6, 3, 2], c: 0x6d4c41 },
    { shape: 'box', p: [-1.5, 3.1, 0], s: [2.6, 0.3, 1.8], c: 0x795548 },
    { shape: 'box', p: [1.5, 3.1, 0], s: [2.6, 0.3, 1.8], c: 0x795548 },
    { shape: 'box', p: [0, 1.2, 1.05], s: [6.1, 1.4, 0.1], c: 0xff4d6d },
  ],
  gingerhouse: [
    { shape: 'box', p: [0, 2, 0], s: [6, 4, 5], c: 0xc68642 },
    { shape: 'wedge', p: [0, 5, 1.4], s: [6.6, 2, 2.8], c: 0xffffff },
    { shape: 'wedge', p: [0, 5, -1.4], s: [6.6, 2, 2.8], r: [0, 180, 0], c: 0xffffff },
    { shape: 'box', p: [0, 1.2, 2.55], s: [1.4, 2.4, 0.1], c: 0x8d5524 },
    { shape: 'sphere', p: [1.8, 2.6, 2.55], s: [0.6, 0.6, 0.1], c: 0x8cff6b, seg: 8 },
    { shape: 'sphere', p: [-1.8, 2.6, 2.55], s: [0.6, 0.6, 0.1], c: 0xff4d6d, seg: 8 },
  ],
  icecream: [
    { shape: 'cone', p: [0, 1.5, 0], s: [1.8, 3.0, 1.8], r: [180, 0, 0], c: 0xe0a060, seg: 8 },
    { shape: 'sphere', p: [0, 3.4, 0], s: [2.2, 2.0, 2.2], c: 0xfff3e0, seg: 10 },
    { shape: 'sphere', p: [0, 4.8, 0], s: [1.9, 1.7, 1.9], c: 0xff8fc8, seg: 10 },
  ],
  candypipe: [
    { shape: 'cyl', p: [0, 6, 0], s: [2.4, 12, 2.4], c: 0xc0c8d8, seg: 10 },
    { shape: 'torus', p: [0, 3, 0], s: [3, 3, 3], r: [90, 0, 0], c: 0xff6fae, seg: 12 },
    { shape: 'torus', p: [0, 8, 0], s: [3, 3, 3], r: [90, 0, 0], c: 0xff6fae, seg: 12 },
    { shape: 'cone', p: [0, 13, 0], s: [3, 2, 3], c: 0x9e9e9e, seg: 10 },
  ],
  hz_gumball: [
    { shape: 'sphere', p: [0, 1.7, 0], s: [3.4, 3.4, 3.4], c: 0x4ce0d2, seg: 12 },
    { shape: 'sphere', p: [0.9, 2.6, 0.9], s: [0.8, 0.8, 0.8], c: 0xffffff, seg: 6 },
  ],
  hz_lollyswing: [
    { shape: 'cyl', p: [0, 1.6, 0], s: [0.35, 3.2, 0.35], c: 0xffffff, seg: 6 },
    { shape: 'cyl', p: [0, 0, 0], s: [3.6, 1.0, 3.6], r: [90, 0, 0], c: 0xffd23f, seg: 16 },
    { shape: 'torus', p: [0, 0, 0], s: [2.8, 2.8, 4], c: 0xff6fae, seg: 16 },
  ],

  // ---------------- forest canyon ----------------
  redwood: [
    { shape: 'cyl', p: [0, 4, 0], s: [1.2, 8, 1.2], c: 0x8d4b2a, seg: 7 },
    { shape: 'cone', p: [0, 9, 0], s: [5, 6, 5], c: 0x2e7d4f, seg: 8 },
    { shape: 'cone', p: [0, 12.5, 0], s: [3.8, 5, 3.8], c: 0x388e5c, seg: 8 },
    { shape: 'cone', p: [0, 15.5, 0], s: [2.6, 4, 2.6], c: 0x43a067, seg: 8 },
  ],
  mesa: [
    { shape: 'cyl', p: [0, 6, 0], s: [14, 12, 12], c: 0xc96f45, seg: 7 },
    { shape: 'cyl', p: [0, 12.5, 0], s: [12, 1.2, 10.5], c: 0xd98a5f, seg: 7 },
    { shape: 'cyl', p: [0, 4, 0], s: [14.4, 1.2, 12.4], c: 0xb85f38, seg: 7 },
  ],
  rockpillar: [
    { shape: 'ico', p: [0, 4, 0], s: [5, 8, 5], c: 0xb0786a, seg: 0 },
    { shape: 'ico', p: [0.6, 9, 0.2], s: [3.5, 5, 3.5], c: 0xc08a7a, seg: 0 },
  ],
  log: [
    { shape: 'cyl', p: [0, 0.5, 0], s: [1, 5, 1], r: [0, 0, 90], c: 0x8d6e63, seg: 7 },
    { shape: 'cyl', p: [2.52, 0.5, 0], s: [0.8, 0.06, 0.8], r: [0, 0, 90], c: 0xd7ccc8, seg: 7 },
  ],
  mushroom: [
    { shape: 'cyl', p: [0, 0.6, 0], s: [0.5, 1.2, 0.5], c: 0xfff3e0, seg: 6 },
    { shape: 'sphere', p: [0, 1.3, 0], s: [1.8, 0.9, 1.8], c: 0xff4d6d, seg: 8 },
    { shape: 'sphere', p: [0.4, 1.65, 0.3], s: [0.3, 0.15, 0.3], c: 0xffffff, seg: 5 },
    { shape: 'sphere', p: [-0.3, 1.6, -0.4], s: [0.25, 0.12, 0.25], c: 0xffffff, seg: 5 },
  ],
  fern: [
    { shape: 'box', p: [0.6, 0.4, 0], s: [1.4, 0.08, 0.4], r: [0, 0, 25], c: 0x4caf50 },
    { shape: 'box', p: [-0.6, 0.4, 0], s: [1.4, 0.08, 0.4], r: [0, 0, -25], c: 0x43a047 },
    { shape: 'box', p: [0, 0.4, 0.6], s: [0.4, 0.08, 1.4], r: [25, 0, 0], c: 0x4caf50 },
    { shape: 'box', p: [0, 0.4, -0.6], s: [0.4, 0.08, 1.4], r: [-25, 0, 0], c: 0x66bb6a },
  ],
  birdhouse: [
    { shape: 'cyl', p: [0, 1.5, 0], s: [0.2, 3, 0.2], c: 0x8d6e63, seg: 4 },
    { shape: 'box', p: [0, 3.4, 0], s: [1, 1, 1], c: 0xffd23f },
    { shape: 'wedge', p: [0, 4.1, 0.25], s: [1.3, 0.5, 0.6], c: 0xff4d6d },
    { shape: 'wedge', p: [0, 4.1, -0.25], s: [1.3, 0.5, 0.6], r: [0, 180, 0], c: 0xff4d6d },
    { shape: 'cyl', p: [0, 3.4, 0.51], s: [0.35, 0.05, 0.35], r: [90, 0, 0], c: 0x1d1d2b, seg: 8 },
  ],
};
