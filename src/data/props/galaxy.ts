import type { ModelPart } from '../types';

/**
 * A ring of box segments standing in the local XY plane (so it spans across a road when the prop's +Z follows the road).
 * Only segments whose centre is at least `minY` above the ring centre are kept (e.g. 0 = upper half = an arch).
 */
function ring(r: number, yc: number, count: number, c: number, thick: number, depth: number, minY = -Infinity): ModelPart[] {
  const parts: ModelPart[] = [];
  const len = 2 * r * Math.sin(Math.PI / count) + thick * 0.6;
  for (let k = 0; k < count; k++) {
    const a = ((k + 0.5) / count) * Math.PI * 2;
    const y = Math.sin(a) * r;
    if (y < minY) continue;
    const deg = (a * 180) / Math.PI + 90;
    parts.push({ shape: 'box', p: [round(Math.cos(a) * r), round(yc + y), 0], s: [round(len), thick, depth], r: [0, 0, round(deg)], c });
  }
  return parts;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/** A cog wheel standing in the local XY plane (centre height `yc`), or lying flat when `flat` is set. */
function gear(r: number, yc: number, teeth: number, c: number, c2: number, thick = 0.8, flat = false): ModelPart[] {
  const rot: [number, number, number] = flat ? [0, 0, 0] : [90, 0, 0];
  const parts: ModelPart[] = [
    { shape: 'cyl', p: [0, yc, 0], s: [r * 2, thick, r * 2], r: rot, c, seg: Math.max(10, teeth) },
    { shape: 'cyl', p: [0, yc, 0], s: [r * 0.7, thick + 0.3, r * 0.7], r: rot, c: c2, seg: 8 },
  ];
  for (let k = 0; k < teeth; k++) {
    const a = (k / teeth) * Math.PI * 2;
    const deg = round((a * 180) / Math.PI);
    if (flat) parts.push({ shape: 'box', p: [round(Math.sin(a) * r), yc, round(Math.cos(a) * r)], s: [r * 0.32, thick, r * 0.4], r: [0, deg, 0], c });
    else parts.push({ shape: 'box', p: [round(Math.cos(a) * r), round(yc + Math.sin(a) * r), 0], s: [r * 0.4, r * 0.32, thick], r: [0, 0, deg], c });
  }
  return parts;
}

/** Scenery + hazard recipes for the Galaxy Cup themes. Names must be unique across all prop files. */
export const GALAXY_PROPS: Record<string, ModelPart[]> = {
  // ---------------- moon base ----------------
  ga_crater: [
    { shape: 'cyl', p: [0, 0.04, 0], s: [8.6, 0.08, 8.6], c: 0x6b7080, seg: 14 },
    { shape: 'cyl', p: [0, 0.07, 0], s: [5.4, 0.08, 5.4], c: 0x5d6272, seg: 12 },
    { shape: 'torus', p: [0, 0.2, 0], s: [10, 10, 6], r: [90, 0, 0], c: 0xb8bdc9, seg: 16 },
  ],
  ga_moonrock: [
    { shape: 'ico', p: [0, 0.5, 0], s: [2.0, 1.3, 1.7], c: 0xa3a8b5, seg: 0 },
    { shape: 'ico', p: [0.9, 0.3, 0.6], s: [1.0, 0.7, 0.9], c: 0x8e93a1, seg: 0 },
    { shape: 'ico', p: [-0.7, 0.25, -0.5], s: [0.7, 0.5, 0.7], c: 0xc2c6d0, seg: 0 },
  ],
  ga_dome: [
    { shape: 'sphere', p: [0, 0, 0], s: [9, 7, 9], c: 0xeef3fa, seg: 12 },
    { shape: 'torus', p: [0, 1.8, 0], s: [8, 8, 3], r: [90, 0, 0], c: 0x7fe7ff, seg: 16 },
    { shape: 'torus', p: [0, 0.2, 0], s: [9.4, 9.4, 4], r: [90, 0, 0], c: 0x8a8f9c, seg: 16 },
    { shape: 'box', p: [0, 1.1, 4.3], s: [2.2, 2.2, 1.6], c: 0xd5dce6 },
    { shape: 'box', p: [0, 1.0, 5.12], s: [1.2, 1.7, 0.08], c: 0xff9f1c },
    { shape: 'cyl', p: [0, 3.9, 0], s: [0.2, 1.6, 0.2], c: 0xc8ced8, seg: 4 },
    { shape: 'sphere', p: [0, 4.8, 0], s: [0.45, 0.45, 0.45], c: 0xff4d6d, seg: 6 },
  ],
  ga_antenna: [
    { shape: 'cyl', p: [0, 0.3, 0], s: [2, 0.6, 2], c: 0x8a8f9c, seg: 8 },
    { shape: 'cyl', p: [0, 6, 0], s: [0.3, 12, 0.3], c: 0xd0d6e0, seg: 6 },
    { shape: 'box', p: [0, 8, 0], s: [2.6, 0.16, 0.16], c: 0xd0d6e0 },
    { shape: 'box', p: [0, 10, 0], s: [1.8, 0.16, 0.16], c: 0xd0d6e0 },
    { shape: 'box', p: [0, 9, 0], s: [0.16, 0.16, 2.2], c: 0xd0d6e0 },
    { shape: 'sphere', p: [0, 12.3, 0], s: [0.8, 0.8, 0.8], c: 0xff4d6d, seg: 8 },
  ],
  ga_dish: [
    { shape: 'cyl', p: [0, 0.4, 0], s: [2.6, 0.8, 2.6], c: 0x8a8f9c, seg: 8 },
    { shape: 'cyl', p: [0, 2.4, 0], s: [0.7, 3.6, 0.7], c: 0xc8ced8, seg: 6 },
    { shape: 'cone', p: [0, 5, 0.2], s: [6.4, 1.6, 6.4], r: [145, 0, 0], c: 0xf2f5fa, seg: 12 },
    { shape: 'cyl', p: [0, 6.0, 1.4], s: [0.15, 2.6, 0.15], r: [55, 0, 0], c: 0x9aa0ad, seg: 4 },
    { shape: 'sphere', p: [0, 6.8, 2.5], s: [0.6, 0.6, 0.6], c: 0xff9f1c, seg: 6 },
  ],
  ga_rocket: [
    { shape: 'cyl', p: [0, 0.4, 0], s: [10, 0.8, 10], c: 0x7d828f, seg: 12 },
    { shape: 'torus', p: [0, 0.8, 0], s: [9, 9, 2], r: [90, 0, 0], c: 0xffd23f, seg: 16 },
    { shape: 'cone', p: [0, 1.9, 0], s: [2.8, 1.6, 2.8], c: 0x5d6178, seg: 10 },
    { shape: 'cyl', p: [0, 8, 0], s: [3.8, 11, 3.8], c: 0xf5f7fb, seg: 12 },
    { shape: 'cyl', p: [0, 11, 0], s: [3.9, 1.2, 3.9], c: 0xff4d6d, seg: 12 },
    { shape: 'cone', p: [0, 16, 0], s: [3.8, 5, 3.8], c: 0xff4d6d, seg: 12 },
    { shape: 'sphere', p: [0, 8.6, 1.85], s: [1.5, 1.5, 0.4], c: 0x7fe7ff, seg: 10 },
    { shape: 'torus', p: [0, 8.6, 1.9], s: [1.8, 1.8, 1.5], c: 0xd0d6e0, seg: 12 },
    { shape: 'box', p: [2.4, 3.6, 0], s: [1.8, 3.2, 0.35], r: [0, 0, -18], c: 0xff4d6d, mirror: true },
    { shape: 'box', p: [0, 3.6, 2.4], s: [0.35, 3.2, 1.8], r: [18, 0, 0], c: 0xff4d6d },
    { shape: 'box', p: [0, 3.6, -2.4], s: [0.35, 3.2, 1.8], r: [-18, 0, 0], c: 0xff4d6d },
  ],
  ga_rover: [
    { shape: 'box', p: [0, 1.2, 0], s: [2.2, 0.8, 3.4], c: 0xffd23f },
    { shape: 'box', p: [0, 1.85, -0.4], s: [1.8, 0.6, 1.6], c: 0x7fe7ff },
    { shape: 'cyl', p: [1.25, 0.55, 1.2], s: [1.1, 0.5, 1.1], r: [0, 0, 90], c: 0x3a3d4a, seg: 8, mirror: true },
    { shape: 'cyl', p: [1.25, 0.55, 0], s: [1.1, 0.5, 1.1], r: [0, 0, 90], c: 0x3a3d4a, seg: 8, mirror: true },
    { shape: 'cyl', p: [1.25, 0.55, -1.2], s: [1.1, 0.5, 1.1], r: [0, 0, 90], c: 0x3a3d4a, seg: 8, mirror: true },
    { shape: 'cyl', p: [0.6, 2.8, 1.2], s: [0.08, 1.8, 0.08], c: 0xd0d6e0, seg: 4 },
    { shape: 'sphere', p: [0.6, 3.75, 1.2], s: [0.35, 0.35, 0.35], c: 0xff4d6d, seg: 6 },
    { shape: 'box', p: [0, 2.3, 1.1], s: [2.0, 0.06, 1.0], r: [-15, 0, 0], c: 0x3f6fd8 },
  ],
  ga_solar: [
    { shape: 'cyl', p: [0, 0.9, 0], s: [0.25, 1.8, 0.25], c: 0x9aa0ad, seg: 5 },
    { shape: 'box', p: [0, 2.0, 0], s: [4.4, 0.12, 2.4], r: [-25, 0, 0], c: 0x2f5fd0 },
    { shape: 'box', p: [0, 2.06, 0], s: [0.1, 0.06, 2.4], r: [-25, 0, 0], c: 0xd0d6e0 },
    { shape: 'box', p: [0, 2.06, 0], s: [4.4, 0.06, 0.1], r: [-25, 0, 0], c: 0xd0d6e0 },
  ],
  ga_beacon: [
    { shape: 'cyl', p: [0, 0.2, 0], s: [1.2, 0.4, 1.2], c: 0x8a8f9c, seg: 6 },
    { shape: 'cyl', p: [0, 1.8, 0], s: [0.22, 3.2, 0.22], c: 0xd0d6e0, seg: 5 },
    { shape: 'sphere', p: [0, 3.6, 0], s: [0.8, 0.8, 0.8], c: 0x7fe7ff, seg: 8 },
  ],
  ga_flag: [
    { shape: 'cyl', p: [0, 2.6, 0], s: [0.14, 5.2, 0.14], c: 0xe0e4ec, seg: 5 },
    { shape: 'box', p: [0.9, 4.4, 0], s: [1.8, 1.1, 0.05], c: 0x26c6da },
    { shape: 'sphere', p: [0.9, 4.4, 0.04], s: [0.6, 0.6, 0.05], c: 0xffd23f, seg: 8 },
  ],
  ga_planet: [
    { shape: 'sphere', p: [0, 0, 0], s: [70, 70, 70], c: 0x2f7fe0, seg: 16 },
    { shape: 'ico', p: [14, 16, 22], s: [30, 24, 26], c: 0x4fbf5a, seg: 1 },
    { shape: 'ico', p: [-22, -6, 20], s: [24, 30, 22], c: 0x63c95a, seg: 1 },
    { shape: 'ico', p: [-8, 26, -18], s: [26, 18, 28], c: 0xc9a46a, seg: 1 },
    { shape: 'ico', p: [24, -18, -10], s: [22, 26, 24], c: 0x4fbf5a, seg: 1 },
    { shape: 'sphere', p: [0, 33, 0], s: [26, 8, 26], c: 0xffffff, seg: 10 },
    { shape: 'ico', p: [6, 4, 31], s: [16, 6, 8], c: 0xffffff, seg: 1 },
    { shape: 'ico', p: [-28, 12, -6], s: [8, 6, 16], c: 0xffffff, seg: 1 },
  ],
  ga_ringplanet: [
    { shape: 'sphere', p: [0, 0, 0], s: [30, 30, 30], c: 0xffb38a, seg: 14 },
    { shape: 'sphere', p: [0, 4, 0], s: [30.4, 6, 30.4], c: 0xffd0a8, seg: 14 },
    { shape: 'sphere', p: [0, -6, 0], s: [29, 5, 29], c: 0xe8946a, seg: 14 },
    { shape: 'torus', p: [0, 0, 0], s: [56, 56, 6], r: [70, 0, 15], c: 0xd4b0ff, seg: 24 },
  ],
  ga_hz_vent: [
    { shape: 'cyl', p: [0, 0.12, 0], s: [4.8, 0.24, 4.8], c: 0x8a8f9c, seg: 12 },
    { shape: 'torus', p: [0, 0.35, 0], s: [4.4, 4.4, 3], r: [90, 0, 0], c: 0xc2c6d0, seg: 14 },
    { shape: 'cyl', p: [0, 0.27, 0], s: [3.0, 0.12, 3.0], c: 0x7fe7ff, seg: 12 },
    { shape: 'sphere', p: [0, 0.3, 0], s: [1.4, 0.5, 1.4], c: 0xd6fbff, seg: 8 },
  ],

  // ---------------- underwater dome ----------------
  ga_coral: [
    { shape: 'cyl', p: [0, 1.2, 0], s: [0.5, 2.4, 0.5], c: 0xff6fae, seg: 6 },
    { shape: 'cyl', p: [0.6, 2.4, 0], s: [0.35, 1.8, 0.35], r: [0, 0, -35], c: 0xff6fae, seg: 6 },
    { shape: 'cyl', p: [-0.6, 2.2, 0.2], s: [0.35, 1.6, 0.35], r: [10, 0, 35], c: 0xff85bd, seg: 6 },
    { shape: 'cyl', p: [0.1, 2.6, -0.6], s: [0.3, 1.6, 0.3], r: [-35, 0, 0], c: 0xff85bd, seg: 6 },
    { shape: 'sphere', p: [1.1, 3.2, 0], s: [0.55, 0.55, 0.55], c: 0xffc1dc, seg: 6 },
    { shape: 'sphere', p: [-1.0, 2.9, 0.3], s: [0.5, 0.5, 0.5], c: 0xffc1dc, seg: 6 },
    { shape: 'sphere', p: [0.1, 3.3, -1.0], s: [0.5, 0.5, 0.5], c: 0xffc1dc, seg: 6 },
    { shape: 'sphere', p: [0, 2.5, 0], s: [0.6, 0.6, 0.6], c: 0xffc1dc, seg: 6 },
  ],
  ga_fancoral: [
    { shape: 'cyl', p: [0, 0.5, 0], s: [0.3, 1.0, 0.3], c: 0x8e5cc8, seg: 5 },
    { shape: 'sphere', p: [0, 2.4, 0], s: [3.4, 3.0, 0.3], c: 0xb47bff, seg: 10 },
    { shape: 'sphere', p: [0, 2.4, 0.12], s: [2.2, 2.0, 0.2], c: 0xd4b0ff, seg: 8 },
  ],
  ga_braincoral: [
    { shape: 'sphere', p: [0, 0.3, 0], s: [3.2, 2.4, 3.2], c: 0xff9f43, seg: 10 },
    { shape: 'torus', p: [0, 0.9, 0], s: [2.4, 2.4, 3], r: [90, 0, 0], c: 0xffc078, seg: 12 },
    { shape: 'torus', p: [0, 1.25, 0], s: [1.4, 1.4, 3], r: [90, 0, 0], c: 0xffc078, seg: 10 },
  ],
  ga_kelp: [
    { shape: 'capsule', p: [0, 1.5, 0], s: [0.9, 3.2, 0.9], r: [0, 0, 8], c: 0x3fae5a, seg: 6 },
    { shape: 'capsule', p: [0.3, 4.4, 0], s: [0.8, 3.2, 0.8], r: [0, 0, -10], c: 0x4cc46a, seg: 6 },
    { shape: 'capsule', p: [0.1, 7.2, 0], s: [0.7, 3.0, 0.7], r: [0, 0, 10], c: 0x5fd47a, seg: 6 },
    { shape: 'box', p: [0.6, 3.2, 0], s: [1.4, 0.1, 0.6], r: [0, 0, 30], c: 0x5fd47a },
    { shape: 'box', p: [-0.4, 5.8, 0], s: [1.2, 0.1, 0.5], r: [0, 0, -30], c: 0x4cc46a },
    { shape: 'capsule', p: [1.4, 1.2, 0.8], s: [0.6, 2.6, 0.6], r: [0, 0, -6], c: 0x3fae5a, seg: 6 },
    { shape: 'capsule', p: [1.3, 3.6, 0.8], s: [0.5, 2.4, 0.5], r: [0, 0, 8], c: 0x4cc46a, seg: 6 },
  ],
  ga_clam: [
    { shape: 'sphere', p: [0, 0.4, 0], s: [3, 1.0, 2.4], c: 0x8fb6d8, seg: 10 },
    { shape: 'sphere', p: [0, 1.1, -0.7], s: [3, 1.0, 2.4], r: [-40, 0, 0], c: 0xa6c8e6, seg: 10 },
    { shape: 'sphere', p: [0, 0.9, 0.1], s: [0.8, 0.8, 0.8], c: 0xffffff, seg: 8 },
  ],
  ga_anemone: [
    { shape: 'cyl', p: [0, 0.4, 0], s: [1.6, 0.8, 1.6], c: 0xff7b5c, seg: 8 },
    { shape: 'cyl', p: [0.5, 1.2, 0], s: [0.22, 1.0, 0.22], r: [0, 0, -20], c: 0xffb38a, seg: 4 },
    { shape: 'cyl', p: [-0.5, 1.2, 0], s: [0.22, 1.0, 0.22], r: [0, 0, 20], c: 0xffb38a, seg: 4 },
    { shape: 'cyl', p: [0, 1.2, 0.5], s: [0.22, 1.0, 0.22], r: [20, 0, 0], c: 0xffb38a, seg: 4 },
    { shape: 'cyl', p: [0, 1.2, -0.5], s: [0.22, 1.0, 0.22], r: [-20, 0, 0], c: 0xffb38a, seg: 4 },
    { shape: 'cyl', p: [0, 1.3, 0], s: [0.22, 1.1, 0.22], c: 0xffb38a, seg: 4 },
    { shape: 'sphere', p: [0.6, 1.9, 0.3], s: [0.6, 0.35, 0.25], c: 0xff9f1c, seg: 6 },
    { shape: 'box', p: [0.6, 1.9, 0.3], s: [0.12, 0.38, 0.27], c: 0xffffff },
  ],
  ga_fish: [
    { shape: 'sphere', p: [0, 4.5, 0], s: [0.7, 1.0, 1.8], c: 0xffd23f, seg: 8 },
    { shape: 'cone', p: [0, 4.5, -1.2], s: [0.2, 0.9, 1.0], r: [-90, 0, 0], c: 0xff9f1c, seg: 4 },
    { shape: 'sphere', p: [0.3, 4.7, 0.55], s: [0.25, 0.25, 0.25], c: 0x1d1d2b, seg: 5, mirror: true },
    { shape: 'sphere', p: [2, 5.6, 1.4], s: [0.6, 0.9, 1.6], c: 0x4ce0d2, seg: 8 },
    { shape: 'cone', p: [2, 5.6, 0.3], s: [0.2, 0.8, 0.9], r: [-90, 0, 0], c: 0x26a69a, seg: 4 },
    { shape: 'sphere', p: [-1.6, 6.2, -0.6], s: [0.6, 0.9, 1.6], c: 0xff6fae, seg: 8 },
    { shape: 'cone', p: [-1.6, 6.2, -1.7], s: [0.2, 0.8, 0.9], r: [-90, 0, 0], c: 0xd84a8a, seg: 4 },
  ],
  ga_jelly: [
    { shape: 'sphere', p: [0, 7, 0], s: [2.6, 1.8, 2.6], c: 0xffa6d8, seg: 10 },
    { shape: 'torus', p: [0, 6.3, 0], s: [2.6, 2.6, 2], r: [90, 0, 0], c: 0xff85c4, seg: 12 },
    { shape: 'cyl', p: [0.6, 5.0, 0], s: [0.12, 2.6, 0.12], r: [0, 0, 8], c: 0xffd1ea, seg: 4 },
    { shape: 'cyl', p: [-0.6, 4.8, 0.2], s: [0.12, 3.0, 0.12], r: [0, 0, -8], c: 0xffd1ea, seg: 4 },
    { shape: 'cyl', p: [0, 4.9, 0.6], s: [0.12, 2.8, 0.12], r: [8, 0, 0], c: 0xffd1ea, seg: 4 },
    { shape: 'cyl', p: [0, 5.1, -0.6], s: [0.12, 2.4, 0.12], r: [-8, 0, 0], c: 0xffd1ea, seg: 4 },
    { shape: 'sphere', p: [0.45, 7.2, 1.15], s: [0.25, 0.3, 0.2], c: 0x1d1d2b, seg: 5, mirror: true },
  ],
  ga_turtle: [
    { shape: 'sphere', p: [0, 5, 0], s: [2.6, 1.0, 3.0], c: 0x3f9a5a, seg: 10 },
    { shape: 'sphere', p: [0, 5.15, 0], s: [2.0, 0.9, 2.4], c: 0x6cc77a, seg: 8 },
    { shape: 'sphere', p: [0, 5.1, 1.9], s: [0.9, 0.8, 1.0], c: 0xa5d6a7, seg: 8 },
    { shape: 'sphere', p: [0.25, 5.3, 2.3], s: [0.18, 0.2, 0.15], c: 0x1d1d2b, seg: 5, mirror: true },
    { shape: 'box', p: [1.5, 4.95, 0.8], s: [1.6, 0.15, 0.6], r: [0, -30, -10], c: 0xa5d6a7, mirror: true },
    { shape: 'box', p: [1.1, 4.95, -1.1], s: [0.9, 0.15, 0.5], r: [0, 30, -10], c: 0xa5d6a7, mirror: true },
  ],
  ga_bubbles: [
    { shape: 'sphere', p: [0, 1.0, 0], s: [0.6, 0.6, 0.6], c: 0xd6fbff, seg: 6 },
    { shape: 'sphere', p: [0.3, 2.4, 0.2], s: [0.8, 0.8, 0.8], c: 0xc4f4ff, seg: 6 },
    { shape: 'sphere', p: [-0.2, 4.0, -0.2], s: [0.5, 0.5, 0.5], c: 0xd6fbff, seg: 6 },
    { shape: 'sphere', p: [0.2, 5.6, 0.1], s: [1.0, 1.0, 1.0], c: 0xc4f4ff, seg: 6 },
    { shape: 'sphere', p: [-0.3, 7.5, 0], s: [0.6, 0.6, 0.6], c: 0xd6fbff, seg: 6 },
  ],
  ga_seagrass: [
    { shape: 'cone', p: [0, 0.8, 0], s: [0.3, 1.6, 0.3], r: [0, 0, 8], c: 0x66bb6a, seg: 4 },
    { shape: 'cone', p: [0.35, 0.6, 0.2], s: [0.25, 1.2, 0.25], r: [0, 0, -14], c: 0x81c784, seg: 4 },
    { shape: 'cone', p: [-0.3, 0.7, -0.2], s: [0.25, 1.4, 0.25], r: [12, 0, 0], c: 0x4caf50, seg: 4 },
  ],
  // Hull runs along +Z (bow at +Z); the deck (top ≈ 2.4) is kept clear so a road can run along it.
  ga_sunkenship: [
    { shape: 'box', p: [0, 0.9, 0], s: [8, 2.8, 26], c: 0x8d5a3b },
    { shape: 'cyl', p: [0, 0.9, 15], s: [9.24, 2.8, 8], c: 0x7a4a2e, seg: 3 },
    { shape: 'box', p: [0, 0.9, -13.4], s: [8.2, 3.0, 1.0], c: 0x6d4c41 },
    { shape: 'box', p: [0, 2.35, 0], s: [7.6, 0.12, 26], c: 0xb07a4f },
    { shape: 'box', p: [4.0, 2.7, 0], s: [0.3, 0.7, 26], c: 0x6d4c41, mirror: true },
    { shape: 'sphere', p: [4.02, 1.2, 7], s: [0.2, 1.1, 1.1], c: 0x1d3a4a, seg: 8, mirror: true },
    { shape: 'sphere', p: [4.02, 1.2, 0], s: [0.2, 1.1, 1.1], c: 0x1d3a4a, seg: 8, mirror: true },
    { shape: 'sphere', p: [4.02, 1.2, -7], s: [0.2, 1.1, 1.1], c: 0x1d3a4a, seg: 8, mirror: true },
    { shape: 'cyl', p: [8, 0.4, 2], s: [0.7, 14, 0.7], r: [90, 25, 0], c: 0x6d4c41, seg: 6 },
    { shape: 'box', p: [10.5, 0.15, 3], s: [4.5, 0.12, 5], r: [0, 25, 4], c: 0xeae0c8 },
    { shape: 'box', p: [-7, 0.5, -6], s: [2.4, 1.4, 1.6], r: [0, 25, 0], c: 0xc8913a },
    { shape: 'box', p: [-7, 1.3, -6], s: [2.5, 0.3, 1.7], r: [0, 25, 0], c: 0xffd23f },
    { shape: 'sphere', p: [-7, 1.5, -6], s: [1.2, 0.5, 0.8], c: 0xffe45c, seg: 6 },
    { shape: 'capsule', p: [-4.2, 1.2, 4], s: [0.6, 2.6, 0.6], r: [0, 0, 12], c: 0x4cc46a, seg: 6 },
  ],
  ga_domehub: [
    { shape: 'cyl', p: [0, 0.8, 0], s: [34, 1.6, 34], c: 0x8fb6d8, seg: 16 },
    { shape: 'sphere', p: [0, 1.4, 0], s: [30, 24, 30], c: 0x9fe8ff, seg: 14 },
    ...ring(15.2, 1.4, 18, 0xffffff, 0.8, 0.8, 0),
    { shape: 'cyl', p: [0, 15.5, 0], s: [3, 3, 3], c: 0xffffff, seg: 10 },
    { shape: 'sphere', p: [0, 17.5, 0], s: [1.6, 1.6, 1.6], c: 0xffd23f, seg: 8 },
    { shape: 'cyl', p: [16, 2.5, 0], s: [6, 5, 6], c: 0xd5dce6, seg: 10 },
    { shape: 'sphere', p: [16, 5, 0], s: [6, 4, 6], c: 0x9fe8ff, seg: 10 },
  ],
  ga_hubarch: [...ring(13.5, 0, 14, 0x9fe8ff, 0.9, 1.2, 0), ...ring(14.1, 0, 14, 0xffffff, 0.35, 1.5, 0)],
  // Glass-tube rib around an elevated road (origin at road level); stops just under the deck.
  ga_tubering: [...ring(13.4, 2, 16, 0x9fe8ff, 0.8, 1.2, -5), ...ring(13.9, 2, 16, 0xffffff, 0.3, 1.4, -5)],
  ga_hz_urchin: [
    { shape: 'sphere', p: [0, 1.7, 0], s: [3.2, 3.2, 3.2], c: 0x7e57c2, seg: 10 },
    { shape: 'cone', p: [0, 3.6, 0], s: [0.5, 1.4, 0.5], c: 0xb39ddb, seg: 5 },
    { shape: 'cone', p: [1.9, 1.7, 0], s: [0.5, 1.4, 0.5], r: [0, 0, -90], c: 0xb39ddb, seg: 5, mirror: true },
    { shape: 'cone', p: [0, 1.7, 1.9], s: [0.5, 1.4, 0.5], r: [90, 0, 0], c: 0xb39ddb, seg: 5 },
    { shape: 'cone', p: [0, 1.7, -1.9], s: [0.5, 1.4, 0.5], r: [-90, 0, 0], c: 0xb39ddb, seg: 5 },
    { shape: 'cone', p: [1.35, 3.05, 0], s: [0.45, 1.2, 0.45], r: [0, 0, -45], c: 0xb39ddb, seg: 5, mirror: true },
    { shape: 'cone', p: [0, 3.05, 1.35], s: [0.45, 1.2, 0.45], r: [45, 0, 0], c: 0xb39ddb, seg: 5 },
    { shape: 'cone', p: [0, 3.05, -1.35], s: [0.45, 1.2, 0.45], r: [-45, 0, 0], c: 0xb39ddb, seg: 5 },
    { shape: 'sphere', p: [0.55, 2.2, -1.45], s: [0.6, 0.7, 0.3], c: 0xffffff, seg: 6, mirror: true },
    { shape: 'sphere', p: [0.55, 2.2, -1.6], s: [0.28, 0.34, 0.12], c: 0x1d1d2b, seg: 5, mirror: true },
  ],
  ga_hz_puffer: [
    { shape: 'sphere', p: [0, 1.5, 0], s: [3, 2.8, 3], c: 0xffd23f, seg: 12 },
    { shape: 'sphere', p: [0, 1.1, 0.4], s: [2.4, 1.6, 2.4], c: 0xfff3b0, seg: 10 },
    { shape: 'sphere', p: [0.6, 2.1, 1.3], s: [0.6, 0.7, 0.3], c: 0xffffff, seg: 6, mirror: true },
    { shape: 'sphere', p: [0.6, 2.1, 1.45], s: [0.28, 0.34, 0.12], c: 0x1d1d2b, seg: 5, mirror: true },
    { shape: 'torus', p: [0, 1.4, 1.5], s: [0.6, 0.4, 0.4], c: 0xff8a65, seg: 8 },
    { shape: 'cone', p: [0, 3.0, 0], s: [0.3, 0.7, 0.3], c: 0xffb300, seg: 4 },
    { shape: 'cone', p: [1.5, 1.6, 0], s: [0.3, 0.7, 0.3], r: [0, 0, -90], c: 0xffb300, seg: 4, mirror: true },
    { shape: 'cone', p: [1.1, 2.6, 0], s: [0.3, 0.6, 0.3], r: [0, 0, -45], c: 0xffb300, seg: 4, mirror: true },
    { shape: 'box', p: [0, 1.6, -1.7], s: [0.15, 1.2, 0.9], c: 0xff9f1c },
  ],

  // ---------------- sky islands (origin = grass surface; these float, so place them with an explicit y) ----------------
  ga_floatisle: [
    { shape: 'cyl', p: [0, -0.6, 0], s: [12, 1.2, 12], c: 0x7ed957, seg: 8 },
    { shape: 'cyl', p: [0, -1.6, 0], s: [12.4, 1.0, 12.4], c: 0x8d6e63, seg: 8 },
    { shape: 'cone', p: [0, -8, 0], s: [11.6, 12, 11.6], r: [180, 0, 0], c: 0x8d6e63, seg: 7 },
    { shape: 'cone', p: [2.5, -14.5, 1], s: [4.6, 6, 4.6], r: [180, 0, 0], c: 0x7a5c50, seg: 6 },
    { shape: 'cyl', p: [-2, 1.5, 1], s: [0.7, 3, 0.7], c: 0x8a5a33, seg: 6 },
    { shape: 'ico', p: [-2, 4.2, 1], s: [4.4, 3.8, 4.4], c: 0x4fbf4a, seg: 0 },
    { shape: 'ico', p: [-1.2, 5.4, 1.6], s: [2.6, 2.2, 2.6], c: 0x63d35a, seg: 0 },
    { shape: 'sphere', p: [2.5, 0.25, -2], s: [0.6, 0.5, 0.6], c: 0xff6fae, seg: 5 },
    { shape: 'sphere', p: [3.4, 0.25, 0.5], s: [0.6, 0.5, 0.6], c: 0xffd23f, seg: 5 },
    { shape: 'sphere', p: [1.2, 0.25, 3.2], s: [0.6, 0.5, 0.6], c: 0xffffff, seg: 5 },
  ],
  ga_floatisle2: [
    { shape: 'cyl', p: [0, -0.5, 0], s: [9, 1.0, 9], c: 0x8ee06a, seg: 7 },
    { shape: 'cone', p: [0, -6.5, 0], s: [9, 11, 9], r: [180, 0, 0], c: 0x9c7a6a, seg: 6 },
    { shape: 'box', p: [0, 1.4, 0], s: [3.6, 2.8, 3.2], c: 0xfff3e0 },
    { shape: 'wedge', p: [0, 3.5, 0.9], s: [4.2, 1.4, 1.8], c: 0xff6f61 },
    { shape: 'wedge', p: [0, 3.5, -0.9], s: [4.2, 1.4, 1.8], r: [0, 180, 0], c: 0xff6f61 },
    { shape: 'box', p: [0, 1.0, 1.62], s: [0.9, 1.6, 0.08], c: 0x8a5a33 },
    { shape: 'box', p: [1.1, 1.8, 1.62], s: [0.8, 0.8, 0.08], c: 0x7fe7ff },
    { shape: 'cyl', p: [1.2, 4.2, -0.6], s: [0.5, 1.4, 0.5], c: 0xb0786a, seg: 6 },
  ],
  ga_cloud: [
    { shape: 'sphere', p: [0, 0, 0], s: [9, 4.5, 6.5], c: 0xffffff, seg: 8 },
    { shape: 'sphere', p: [3.5, 1.5, 0.5], s: [6, 5, 5], c: 0xffffff, seg: 8 },
    { shape: 'sphere', p: [-3.2, 1.0, -0.3], s: [5.5, 4.2, 4.6], c: 0xf4f9ff, seg: 8 },
    { shape: 'sphere', p: [0.5, 2.6, -0.5], s: [5, 4.4, 4.4], c: 0xffffff, seg: 8 },
  ],
  ga_cloud2: [
    { shape: 'sphere', p: [0, 0, 0], s: [16, 6, 10], c: 0xf4f9ff, seg: 8 },
    { shape: 'sphere', p: [5, 2.2, 1], s: [9, 7, 8], c: 0xffffff, seg: 8 },
    { shape: 'sphere', p: [-5.5, 1.6, -1], s: [8, 6, 7], c: 0xffffff, seg: 8 },
    { shape: 'sphere', p: [0, 3.6, 0], s: [8, 6.5, 7], c: 0xffffff, seg: 8 },
    { shape: 'sphere', p: [0, -1.6, 0], s: [13, 2.5, 8], c: 0xdbe8f5, seg: 8 },
  ],
  ga_hotair: [
    { shape: 'box', p: [0, 1, 0], s: [2.6, 2, 2.6], c: 0xb07a4f },
    { shape: 'box', p: [0, 2.05, 0], s: [2.8, 0.2, 2.8], c: 0x8a5a33 },
    { shape: 'cyl', p: [1.1, 4.4, 1.1], s: [0.08, 4.8, 0.08], c: 0x5d4037, seg: 3, mirror: true },
    { shape: 'cyl', p: [1.1, 4.4, -1.1], s: [0.08, 4.8, 0.08], c: 0x5d4037, seg: 3, mirror: true },
    { shape: 'cone', p: [0, 7.6, 0], s: [5.4, 2.6, 5.4], r: [180, 0, 0], c: 0xff4d6d, seg: 10 },
    { shape: 'sphere', p: [0, 12.5, 0], s: [11, 11.5, 11], c: 0xff4d6d, seg: 12 },
    { shape: 'torus', p: [0, 12.5, 0], s: [13.2, 13.2, 9], r: [90, 0, 0], c: 0xffd23f, seg: 16 },
    { shape: 'torus', p: [0, 15.8, 0], s: [10.6, 10.6, 8], r: [90, 0, 0], c: 0xffffff, seg: 14 },
    { shape: 'torus', p: [0, 9.3, 0], s: [10.2, 10.2, 8], r: [90, 0, 0], c: 0xffffff, seg: 14 },
  ],
  ga_millisle: [
    { shape: 'cyl', p: [0, -0.6, 0], s: [18, 1.2, 18], c: 0x7ed957, seg: 9 },
    { shape: 'cyl', p: [0, -1.7, 0], s: [18.4, 1.0, 18.4], c: 0x8d6e63, seg: 9 },
    { shape: 'cone', p: [0, -11, 0], s: [17.5, 18, 17.5], r: [180, 0, 0], c: 0x8d6e63, seg: 8 },
    { shape: 'cone', p: [-4, -20, 3], s: [6, 8, 6], r: [180, 0, 0], c: 0x7a5c50, seg: 6 },
    { shape: 'cone', p: [0, 6, 0], s: [6, 12, 6], c: 0xfff3e0, seg: 8 },
    { shape: 'cyl', p: [0, 2.5, 0], s: [5.6, 5, 5.6], c: 0xfff3e0, seg: 8 },
    { shape: 'cone', p: [0, 11.6, 0], s: [4.2, 3, 4.2], c: 0xff6f61, seg: 8 },
    { shape: 'box', p: [0, 1.4, 2.75], s: [1.4, 2.6, 0.2], c: 0x8a5a33 },
    { shape: 'sphere', p: [0, 9.6, 2.2], s: [1.1, 1.1, 1.1], c: 0x8a5a33, seg: 8 },
    { shape: 'box', p: [0, 9.6, 2.6], s: [1.6, 20, 0.25], r: [0, 0, 25], c: 0xffffff },
    { shape: 'box', p: [0, 9.6, 2.6], s: [1.6, 20, 0.25], r: [0, 0, 115], c: 0xffffff },
    { shape: 'box', p: [0, 9.6, 2.5], s: [0.3, 20, 0.2], r: [0, 0, 25], c: 0xff6f61 },
    { shape: 'box', p: [0, 9.6, 2.5], s: [0.3, 20, 0.2], r: [0, 0, 115], c: 0xff6f61 },
    { shape: 'ico', p: [6, 2.5, -4], s: [4, 4, 4], c: 0x4fbf4a, seg: 0 },
    { shape: 'cyl', p: [6, 0.6, -4], s: [0.6, 1.4, 0.6], c: 0x8a5a33, seg: 5 },
    { shape: 'sphere', p: [-5, 0.3, 4], s: [0.8, 0.6, 0.8], c: 0xff6fae, seg: 5 },
    { shape: 'sphere', p: [-6, 0.3, 2], s: [0.8, 0.6, 0.8], c: 0xffd23f, seg: 5 },
  ],
  ga_airship: [
    { shape: 'capsule', p: [0, 0, 0], s: [14, 40, 14], r: [90, 0, 0], c: 0xb47bff, seg: 12 },
    { shape: 'torus', p: [0, 0, 4], s: [8.6, 8.6, 6], c: 0xffd23f, seg: 16 },
    { shape: 'torus', p: [0, 0, -4], s: [8.6, 8.6, 6], c: 0xffd23f, seg: 16 },
    { shape: 'box', p: [0, 4.6, -16], s: [0.4, 5, 5], c: 0xff6fae },
    { shape: 'box', p: [0, -4.6, -16], s: [0.4, 5, 5], c: 0xff6fae },
    { shape: 'box', p: [4.6, 0, -16], s: [5, 0.4, 5], c: 0xff6fae, mirror: true },
    { shape: 'box', p: [0, -5.6, 1], s: [3, 2, 7], c: 0xfff3e0 },
    { shape: 'box', p: [1.52, -5.4, 1], s: [0.1, 0.8, 5], c: 0x7fe7ff, mirror: true },
    { shape: 'cyl', p: [0, -5.6, -3], s: [1.6, 0.3, 1.6], r: [90, 0, 0], c: 0x5d6178, seg: 8 },
  ],
  ga_hz_cloudbump: [
    { shape: 'cyl', p: [0, 0.2, 0], s: [3.2, 0.4, 3.2], c: 0x4fc3f7, seg: 12 },
    { shape: 'sphere', p: [0, 1.4, 0], s: [3, 2.4, 3], c: 0xffffff, seg: 10 },
    { shape: 'sphere', p: [1.1, 1.8, 0], s: [1.8, 1.8, 1.8], c: 0xffffff, seg: 8, mirror: true },
    { shape: 'sphere', p: [0, 2.6, 0], s: [2, 1.8, 2], c: 0xffffff, seg: 8 },
    { shape: 'sphere', p: [0.45, 1.9, 1.35], s: [0.3, 0.4, 0.15], c: 0x1d1d2b, seg: 5, mirror: true },
    { shape: 'sphere', p: [0.9, 1.5, 1.25], s: [0.4, 0.25, 0.12], c: 0xff9ec4, seg: 5, mirror: true },
    { shape: 'torus', p: [0, 1.45, 1.4], s: [0.5, 0.4, 0.3], r: [0, 0, 180], c: 0x1d1d2b, seg: 8 },
  ],

  // ---------------- robot factory ----------------
  ga_gear: [...gear(4, 4.6, 12, 0xffb300, 0x5d6178), { shape: 'box', p: [0, 0.3, 0], s: [3, 0.6, 2], c: 0x4a4f5c }, { shape: 'box', p: [0, 2.2, 0], s: [0.8, 3.8, 0.8], c: 0x5d6178 }],
  ga_gear2: [...gear(2.6, 3.2, 10, 0x9aa5b8, 0xff7043), ...gear(1.6, 6.4, 8, 0x4fc3f7, 0x2b2b3a).map((p) => ({ ...p, p: [p.p![0] + 2.6, p.p![1], p.p![2] + 0.6] as [number, number, number] })), { shape: 'box', p: [0, 0.3, 0], s: [4, 0.6, 2.4], c: 0x4a4f5c }, { shape: 'box', p: [0, 1.5, 0], s: [0.6, 3, 0.6], c: 0x5d6178 }],
  ga_gearflat: [{ shape: 'cyl', p: [0, 0.8, 0], s: [2.4, 1.6, 2.4], c: 0x5d6178, seg: 8 }, ...gear(3.4, 1.9, 12, 0xc0c8d8, 0xff4d6d, 0.6, true)],
  ga_crates: [
    { shape: 'box', p: [0, 1, 0], s: [2, 2, 2], c: 0xc8913a },
    { shape: 'box', p: [2.1, 1, 0.2], s: [2, 2, 2], r: [0, 8, 0], c: 0x3f8fd8 },
    { shape: 'box', p: [1, 3, 0.1], s: [2, 2, 2], r: [0, -10, 0], c: 0xff9f1c },
    { shape: 'box', p: [0, 1, 1.01], s: [1.6, 0.25, 0.05], c: 0x8a5a33 },
    { shape: 'box', p: [-0.2, 0.75, -2.0], s: [1.5, 1.5, 1.5], r: [0, 20, 0], c: 0xc8913a },
  ],
  ga_pipes: [
    { shape: 'cyl', p: [0, 3, 0], s: [1.2, 12, 1.2], r: [0, 0, 90], c: 0x7fb069, seg: 8 },
    { shape: 'cyl', p: [0, 4.6, 0], s: [0.8, 12, 0.8], r: [0, 0, 90], c: 0xff7043, seg: 8 },
    { shape: 'cyl', p: [6, 1.5, 0], s: [1.2, 3, 1.2], c: 0x7fb069, seg: 8 },
    { shape: 'sphere', p: [6, 3, 0], s: [1.3, 1.3, 1.3], c: 0x7fb069, seg: 8 },
    { shape: 'cyl', p: [-4, 2.4, 0], s: [0.3, 4.8, 0.3], c: 0x5d6178, seg: 5 },
    { shape: 'cyl', p: [2, 2.4, 0], s: [0.3, 4.8, 0.3], c: 0x5d6178, seg: 5 },
    { shape: 'cyl', p: [-1, 4.6, 0], s: [1.2, 0.3, 1.2], r: [0, 0, 90], c: 0xffd23f, seg: 8 },
  ],
  ga_robotarm: [
    { shape: 'cyl', p: [0, 0.5, 0], s: [3, 1, 3], c: 0x4a4f5c, seg: 10 },
    { shape: 'cyl', p: [0, 1.4, 0], s: [2, 0.8, 2], c: 0xff9f1c, seg: 10 },
    { shape: 'box', p: [0.6, 3.6, 0], s: [0.9, 4.4, 0.9], r: [0, 0, -15], c: 0xff9f1c },
    { shape: 'sphere', p: [1.2, 5.8, 0], s: [1.3, 1.3, 1.3], c: 0x2b2b3a, seg: 8 },
    { shape: 'box', p: [2.8, 6.4, 0], s: [3.6, 0.8, 0.8], r: [0, 0, 20], c: 0xff9f1c },
    { shape: 'box', p: [4.6, 6.3, 0.35], s: [0.25, 1.4, 0.25], r: [0, 0, -10], c: 0xc0c8d8 },
    { shape: 'box', p: [4.6, 6.3, -0.35], s: [0.25, 1.4, 0.25], r: [0, 0, -10], c: 0xc0c8d8 },
  ],
  ga_tank: [
    { shape: 'cyl', p: [0, 4, 0], s: [5, 8, 5], c: 0xd5dce6, seg: 12 },
    { shape: 'sphere', p: [0, 8, 0], s: [5, 2.4, 5], c: 0xd5dce6, seg: 12 },
    { shape: 'cyl', p: [0, 2.6, 0], s: [5.1, 0.6, 5.1], c: 0x26c6da, seg: 12 },
    { shape: 'cyl', p: [0, 5.6, 0], s: [5.1, 0.6, 5.1], c: 0x26c6da, seg: 12 },
    { shape: 'box', p: [0, 4.5, 2.6], s: [0.8, 9, 0.1], c: 0x5d6178 },
    { shape: 'cyl', p: [1.6, 0.6, 2.2], s: [0.5, 1.2, 0.5], c: 0xffd23f, seg: 6 },
  ],
  ga_barrels: [
    { shape: 'cyl', p: [0, 0.7, 0], s: [1.2, 1.4, 1.2], c: 0x3f8fd8, seg: 10 },
    { shape: 'cyl', p: [1.3, 0.7, 0.3], s: [1.2, 1.4, 1.2], c: 0xff4d6d, seg: 10 },
    { shape: 'cyl', p: [0.6, 0.7, -1.1], s: [1.2, 1.4, 1.2], c: 0xffd23f, seg: 10 },
    { shape: 'cyl', p: [0.6, 2.1, -0.2], s: [1.2, 1.4, 1.2], c: 0x3f8fd8, seg: 10 },
    { shape: 'cyl', p: [0, 1.0, 0], s: [1.25, 0.12, 1.25], c: 0xffffff, seg: 10 },
  ],
  ga_bot: [
    { shape: 'box', p: [0, 1.6, 0], s: [1.6, 1.6, 1.2], c: 0x4fc3f7 },
    { shape: 'box', p: [0, 2.9, 0], s: [1.3, 1.0, 1.0], c: 0xd5dce6 },
    { shape: 'sphere', p: [0.3, 3.0, 0.52], s: [0.35, 0.35, 0.1], c: 0x1d1d2b, seg: 6, mirror: true },
    { shape: 'sphere', p: [0.32, 3.04, 0.56], s: [0.12, 0.12, 0.05], c: 0xffffff, seg: 5, mirror: true },
    { shape: 'cyl', p: [0, 3.7, 0], s: [0.08, 0.6, 0.08], c: 0x5d6178, seg: 4 },
    { shape: 'sphere', p: [0, 4.05, 0], s: [0.3, 0.3, 0.3], c: 0xff4d6d, seg: 6 },
    { shape: 'box', p: [1.0, 1.7, 0], s: [0.3, 1.2, 0.3], r: [0, 0, 20], c: 0xd5dce6, mirror: true },
    { shape: 'cyl', p: [0.45, 0.4, 0], s: [0.5, 0.8, 0.5], c: 0x5d6178, seg: 6, mirror: true },
    { shape: 'box', p: [0, 1.7, 0.62], s: [0.9, 0.5, 0.05], c: 0xffd23f },
  ],
  ga_chimney: [
    { shape: 'cyl', p: [0, 9, 0], s: [3, 18, 3], c: 0xb0786a, seg: 10 },
    { shape: 'cyl', p: [0, 12, 0], s: [3.1, 1.2, 3.1], c: 0xffffff, seg: 10 },
    { shape: 'cyl', p: [0, 15, 0], s: [3.1, 1.2, 3.1], c: 0xff4d6d, seg: 10 },
    { shape: 'cyl', p: [0, 18.2, 0], s: [3.4, 0.6, 3.4], c: 0x4a4f5c, seg: 10 },
    { shape: 'sphere', p: [0.4, 20.5, 0.2], s: [3.2, 2.4, 3.2], c: 0xe8ecf2, seg: 8 },
    { shape: 'sphere', p: [1.6, 22.6, 0.4], s: [2.4, 2, 2.4], c: 0xf4f6fa, seg: 8 },
  ],
  ga_lamp: [
    { shape: 'cyl', p: [0, 6, 0], s: [0.35, 12, 0.35], c: 0x5d6178, seg: 6 },
    { shape: 'box', p: [1.2, 12, 0], s: [2.6, 0.3, 0.4], c: 0x5d6178 },
    { shape: 'cone', p: [2.3, 11.6, 0], s: [1.4, 0.8, 1.4], c: 0xffd23f, seg: 8 },
    { shape: 'sphere', p: [2.3, 11.25, 0], s: [0.7, 0.4, 0.7], c: 0xfff6c0, seg: 6 },
  ],
  ga_console: [
    { shape: 'box', p: [0, 0.7, 0], s: [2.4, 1.4, 1.0], c: 0x9aa5b8 },
    { shape: 'box', p: [0, 1.5, 0.15], s: [2.4, 0.2, 1.1], r: [-25, 0, 0], c: 0x5d6178 },
    { shape: 'sphere', p: [-0.7, 1.65, 0.3], s: [0.3, 0.2, 0.3], c: 0xff4d6d, seg: 6 },
    { shape: 'sphere', p: [0, 1.65, 0.3], s: [0.3, 0.2, 0.3], c: 0x7ed957, seg: 6 },
    { shape: 'sphere', p: [0.7, 1.65, 0.3], s: [0.3, 0.2, 0.3], c: 0xffd23f, seg: 6 },
    { shape: 'box', p: [0, 2.3, -0.4], s: [2.0, 1.2, 0.1], c: 0x26c6da },
  ],
  ga_bigbot: [
    { shape: 'box', p: [0, 1, 0], s: [12, 2, 8], c: 0x4a4f5c },
    { shape: 'box', p: [2.2, 5, 0], s: [2.6, 6, 2.6], c: 0x9aa5b8, mirror: true },
    { shape: 'box', p: [0, 12, 0], s: [9, 8, 5.5], c: 0x4fc3f7 },
    { shape: 'box', p: [0, 12, 2.8], s: [4.4, 3.4, 0.2], c: 0xffd23f },
    { shape: 'cyl', p: [0, 12, 2.95], s: [2, 0.2, 2], r: [90, 0, 0], c: 0xff4d6d, seg: 10 },
    { shape: 'box', p: [5.6, 13, 0], s: [2, 7, 2], r: [0, 0, 20], c: 0x9aa5b8, mirror: true },
    { shape: 'sphere', p: [6.8, 9.4, 0], s: [2.4, 2.4, 2.4], c: 0xd5dce6, seg: 8, mirror: true },
    { shape: 'box', p: [0, 18.4, 0], s: [7, 5, 5], c: 0xd5dce6 },
    { shape: 'sphere', p: [1.6, 18.8, 2.5], s: [1.8, 1.8, 0.5], c: 0x1d1d2b, seg: 10, mirror: true },
    { shape: 'sphere', p: [1.75, 19.1, 2.7], s: [0.6, 0.6, 0.2], c: 0xffffff, seg: 6, mirror: true },
    { shape: 'box', p: [0, 17, 2.55], s: [2.4, 0.4, 0.1], c: 0xff4d6d },
    { shape: 'cyl', p: [0, 22, 0], s: [0.3, 2, 0.3], c: 0x5d6178, seg: 5 },
    { shape: 'sphere', p: [0, 23.3, 0], s: [1.2, 1.2, 1.2], c: 0xffd23f, seg: 8 },
  ],
  ga_factory: [
    { shape: 'box', p: [0, 7, 0], s: [36, 14, 22], c: 0xb0786a },
    { shape: 'wedge', p: [-12, 16, 0], s: [12, 4, 22], r: [0, 90, 0], c: 0x8d99ae },
    { shape: 'wedge', p: [0, 16, 0], s: [12, 4, 22], r: [0, 90, 0], c: 0x8d99ae },
    { shape: 'wedge', p: [12, 16, 0], s: [12, 4, 22], r: [0, 90, 0], c: 0x8d99ae },
    { shape: 'box', p: [0, 9, 11.05], s: [30, 3, 0.2], c: 0xffe8a0 },
    { shape: 'box', p: [0, 3, 11.05], s: [8, 6, 0.2], c: 0x4a4f5c },
    { shape: 'cyl', p: [14, 20, -6], s: [2.6, 14, 2.6], c: 0x9c6a5a, seg: 8 },
    { shape: 'cyl', p: [14, 25, -6], s: [2.7, 1, 2.7], c: 0xffffff, seg: 8 },
    { shape: 'sphere', p: [14.5, 28.5, -6], s: [4, 3, 4], c: 0xe8ecf2, seg: 8 },
  ],
  // Swinging crane magnet (hangs from the swinger rope; origin ≈ 1.5 m above the road).
  ga_hz_magnet: [
    { shape: 'cyl', p: [0, 2.8, 0], s: [0.25, 2.4, 0.25], c: 0xc0c8d8, seg: 6 },
    { shape: 'box', p: [0, 1.6, 0], s: [3.2, 0.9, 1.0], c: 0xff4d6d },
    { shape: 'box', p: [1.15, 0.4, 0], s: [0.9, 2.0, 1.0], c: 0xff4d6d, mirror: true },
    { shape: 'box', p: [1.15, -0.85, 0], s: [0.92, 0.6, 1.02], c: 0xe8ecf2, mirror: true },
  ],
  ga_hz_barrel: [
    { shape: 'cyl', p: [0, 1.6, 0], s: [3.2, 3.6, 3.2], r: [90, 0, 0], c: 0x3f8fd8, seg: 12 },
    { shape: 'cyl', p: [0, 1.6, 0], s: [3.3, 0.4, 3.3], r: [90, 0, 0], c: 0xffd23f, seg: 12 },
    { shape: 'cyl', p: [0, 1.6, 1.2], s: [3.3, 0.3, 3.3], r: [90, 0, 0], c: 0x2b6cb0, seg: 12 },
    { shape: 'cyl', p: [0, 1.6, -1.2], s: [3.3, 0.3, 3.3], r: [90, 0, 0], c: 0x2b6cb0, seg: 12 },
    { shape: 'sphere', p: [0.55, 2.3, -1.82], s: [0.5, 0.6, 0.1], c: 0xffffff, seg: 6, mirror: true },
    { shape: 'sphere', p: [0.55, 2.3, -1.86], s: [0.22, 0.28, 0.06], c: 0x1d1d2b, seg: 5, mirror: true },
  ],
  ga_hz_piston: [
    { shape: 'cyl', p: [0, 0.3, 0], s: [3.2, 0.6, 3.2], c: 0x2b2b3a, seg: 12 },
    { shape: 'cyl', p: [0, 0.65, 0], s: [3.0, 0.12, 3.0], c: 0xffd23f, seg: 12 },
    { shape: 'cyl', p: [0, 1.2, 0], s: [1.0, 1.4, 1.0], c: 0xc0c8d8, seg: 8 },
    { shape: 'cyl', p: [0, 2.0, 0], s: [2.6, 0.5, 2.6], c: 0xff9f1c, seg: 12 },
    { shape: 'cyl', p: [0, 2.3, 0], s: [2.0, 0.15, 2.0], c: 0x2b2b3a, seg: 12 },
  ],
};
