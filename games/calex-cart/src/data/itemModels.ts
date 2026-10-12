import type { ItemId, ModelPart } from './types';

/** 3D recipes for item entities (origin at the item's centre/base). */
export const ITEM_MODELS: Partial<Record<ItemId, ModelPart[]>> & { pod: ModelPart[]; rocket: ModelPart[]; magnetHat: ModelPart[]; ring: ModelPart[] } = {
  bumperBall: [
    { shape: 'sphere', s: [1.25, 1.25, 1.25], c: 0xff4d6d, seg: 12 },
    { shape: 'torus', s: [1.62, 1.62, 1.62], r: [90, 0, 0], c: 0xffd23f, seg: 16 },
    { shape: 'sphere', p: [0, 0, 0.6], s: [0.3, 0.3, 0.12], c: 0xffffff, seg: 6 },
    { shape: 'sphere', p: [0, 0, -0.6], s: [0.3, 0.3, 0.12], c: 0xffffff, seg: 6 },
  ],
  paperPlane: [
    { shape: 'wedge', p: [0.35, 0, 0], s: [0.7, 0.08, 1.8], r: [0, 0, -12], c: 0xffffff },
    { shape: 'wedge', p: [-0.35, 0, 0], s: [0.7, 0.08, 1.8], r: [0, 0, 12], c: 0xf2f6ff },
    { shape: 'box', p: [0, -0.12, -0.1], s: [0.08, 0.28, 1.5], c: 0x3fa7ff },
  ],
  gooPuddle: [
    { shape: 'ico', p: [0, 0.12, 0], s: [3.2, 0.35, 3.0], c: 0xa63ff0, seg: 1 },
    { shape: 'ico', p: [0.8, 0.22, 0.5], s: [1.2, 0.5, 1.2], c: 0xc56bff, seg: 1 },
    { shape: 'ico', p: [-0.7, 0.2, -0.5], s: [1.0, 0.45, 1.0], c: 0xb34dff, seg: 1 },
    { shape: 'sphere', p: [0.3, 0.4, -0.2], s: [0.35, 0.35, 0.35], c: 0xe0a8ff, seg: 6 },
    { shape: 'sphere', p: [0.9, 0.48, 0.55], s: [0.18, 0.18, 0.18], c: 0xffffff, seg: 5 },
  ],
  springTrap: [
    { shape: 'cyl', p: [0, 0.06, 0], s: [2.2, 0.12, 2.2], c: 0x8a8fa8, seg: 12 },
    { shape: 'torus', p: [0, 0.25, 0], s: [1.6, 1.6, 1.6], r: [90, 0, 0], c: 0xffd23f, seg: 12 },
    { shape: 'torus', p: [0, 0.48, 0], s: [1.45, 1.45, 1.45], r: [90, 0, 0], c: 0xffc21a, seg: 12 },
    { shape: 'torus', p: [0, 0.7, 0], s: [1.3, 1.3, 1.3], r: [90, 0, 0], c: 0xffd23f, seg: 12 },
    { shape: 'cyl', p: [0, 0.86, 0], s: [1.3, 0.1, 1.3], c: 0xff4d6d, seg: 12 },
  ],
  popper: [
    { shape: 'cone', p: [0, 0, 0], s: [0.8, 1.2, 0.8], r: [180, 0, 0], c: 0x8cff6b, seg: 8 },
    { shape: 'torus', p: [0, 0.15, 0], s: [0.9, 0.9, 0.9], r: [90, 0, 0], c: 0xff6fae, seg: 10 },
    { shape: 'torus', p: [0, -0.2, 0], s: [0.6, 0.6, 0.6], r: [90, 0, 0], c: 0xffd23f, seg: 10 },
    { shape: 'sphere', p: [0, 0.65, 0], s: [0.5, 0.25, 0.5], c: 0xffffff, seg: 6 },
  ],
  tornado: [
    { shape: 'cone', p: [0, 1.5, 0], s: [3.4, 3.0, 3.4], r: [180, 0, 0], c: 0x9fe3c9, seg: 9 },
    { shape: 'torus', p: [0, 2.6, 0], s: [3.6, 3.6, 3.6], r: [90, 0, 0], c: 0xc9f5e6, seg: 12 },
    { shape: 'torus', p: [0, 1.4, 0], s: [2.4, 2.4, 2.4], r: [90, 0, 0], c: 0x4ce0d2, seg: 12 },
    { shape: 'torus', p: [0, 0.5, 0], s: [1.2, 1.2, 1.2], r: [90, 0, 0], c: 0xc9f5e6, seg: 10 },
  ],
  cloud: [
    { shape: 'ico', p: [0, 0, 0], s: [1.6, 1.2, 1.4], c: 0xd9d4f2, seg: 1 },
    { shape: 'ico', p: [0.9, -0.15, 0.2], s: [1.1, 0.9, 1.0], c: 0xc9c3e6, seg: 1 },
    { shape: 'ico', p: [-0.85, -0.1, -0.2], s: [1.2, 0.9, 1.0], c: 0xe6e2fa, seg: 1 },
    { shape: 'sphere', p: [0.25, 0.1, 0.62], s: [0.16, 0.22, 0.08], c: 0x4a4466, seg: 5 },
    { shape: 'sphere', p: [-0.25, 0.1, 0.62], s: [0.16, 0.22, 0.08], c: 0x4a4466, seg: 5 },
  ],
  /** Floating "mystery gem" item pod. */
  pod: [
    { shape: 'ico', s: [1.6, 1.9, 1.6], c: 0xff6fae, seg: 0 },
    { shape: 'ico', s: [1.15, 1.35, 1.15], r: [0, 36, 0], c: 0xfff3b0, seg: 0 },
  ],
  rocket: [
    { shape: 'cyl', p: [0, 1.0, -1.35], s: [0.75, 1.6, 0.75], r: [90, 0, 0], c: 0xffffff, seg: 10 },
    { shape: 'cone', p: [0, 1.0, -0.25], s: [0.75, 0.7, 0.75], r: [90, 0, 0], c: 0xff4d6d, seg: 10 },
    { shape: 'wedge', p: [0.45, 1.0, -1.9], s: [0.12, 0.6, 0.5], r: [0, 0, 0], c: 0x3fa7ff, mirror: true },
    { shape: 'wedge', p: [0, 1.45, -1.9], s: [0.12, 0.6, 0.5], r: [0, 0, 90], c: 0x3fa7ff },
  ],
  magnetHat: [
    { shape: 'torus', p: [0, 2.3, 0.3], s: [1.2, 1.2, 1.2], r: [0, 90, 0], c: 0xff4d6d, seg: 12 },
    { shape: 'box', p: [0, 1.85, 0.05], s: [0.2, 0.3, 0.3], c: 0xc0c8d8 },
    { shape: 'box', p: [0, 1.85, 0.55], s: [0.2, 0.3, 0.3], c: 0xc0c8d8 },
  ],
  /** Landing marker for lobbed poppers. */
  ring: [
    { shape: 'torus', s: [12, 12, 2], r: [90, 0, 0], c: 0xff4d6d, seg: 24 },
    { shape: 'torus', s: [7, 7, 1.6], r: [90, 0, 0], c: 0xffffff, seg: 20 },
  ],
};
