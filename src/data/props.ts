import type { ModelPart } from './types';

/**
 * Scenery prop recipes (origin at the base, +Y up). Drawn with InstancedMesh, one draw call per prop type.
 * Themes reference these names from TrackData.scatter / TrackData.props.
 */
export const PROPS: Record<string, ModelPart[]> = {
  tree: [
    { shape: 'cyl', p: [0, 1.2, 0], s: [0.5, 2.4, 0.5], c: 0x8a5a33, seg: 6 },
    { shape: 'ico', p: [0, 3.4, 0], s: [3.2, 2.8, 3.2], c: 0x4fbf4a, seg: 0 },
    { shape: 'ico', p: [0.6, 4.4, 0.3], s: [2.0, 1.8, 2.0], c: 0x63d35a, seg: 0 },
  ],
  pine: [
    { shape: 'cyl', p: [0, 0.8, 0], s: [0.45, 1.6, 0.45], c: 0x7a4a2a, seg: 6 },
    { shape: 'cone', p: [0, 2.6, 0], s: [3.2, 2.6, 3.2], c: 0x2f9e5a, seg: 7 },
    { shape: 'cone', p: [0, 4.0, 0], s: [2.4, 2.2, 2.4], c: 0x38b066, seg: 7 },
    { shape: 'cone', p: [0, 5.2, 0], s: [1.5, 1.8, 1.5], c: 0x42c270, seg: 7 },
  ],
  bush: [
    { shape: 'ico', p: [0, 0.6, 0], s: [2.0, 1.4, 2.0], c: 0x4caf50, seg: 0 },
    { shape: 'ico', p: [0.7, 0.5, 0.3], s: [1.2, 1.0, 1.2], c: 0x5cc25b, seg: 0 },
  ],
  rock: [
    { shape: 'ico', p: [0, 0.5, 0], s: [2.2, 1.4, 1.8], c: 0x9aa0ad, seg: 0 },
    { shape: 'ico', p: [0.8, 0.3, 0.5], s: [1.1, 0.8, 1.0], c: 0x8a909c, seg: 0 },
  ],
  flower: [
    { shape: 'cyl', p: [0, 0.35, 0], s: [0.08, 0.7, 0.08], c: 0x3f9a3a, seg: 4 },
    { shape: 'ico', p: [0, 0.75, 0], s: [0.45, 0.25, 0.45], c: 0xff6fae, seg: 0 },
    { shape: 'sphere', p: [0, 0.8, 0], s: [0.18, 0.18, 0.18], c: 0xffd23f, seg: 5 },
  ],
  palm: [
    { shape: 'cyl', p: [0, 1.0, 0], s: [0.5, 2.0, 0.5], r: [0, 0, 4], c: 0x9c6b3e, seg: 6 },
    { shape: 'cyl', p: [0.15, 2.9, 0], s: [0.42, 2.0, 0.42], r: [0, 0, 9], c: 0xa87645, seg: 6 },
    { shape: 'cyl', p: [0.45, 4.7, 0], s: [0.36, 1.8, 0.36], r: [0, 0, 14], c: 0x9c6b3e, seg: 6 },
    { shape: 'box', p: [1.6, 5.5, 0], s: [3.0, 0.12, 0.9], r: [0, 0, -22], c: 0x3fbf5a },
    { shape: 'box', p: [-0.6, 5.6, 0], s: [3.0, 0.12, 0.9], r: [0, 0, 22], c: 0x35b050 },
    { shape: 'box', p: [0.5, 5.6, 1.2], s: [0.9, 0.12, 3.0], r: [22, 0, 0], c: 0x3fbf5a },
    { shape: 'box', p: [0.5, 5.6, -1.2], s: [0.9, 0.12, 3.0], r: [-22, 0, 0], c: 0x35b050 },
    { shape: 'sphere', p: [0.5, 5.2, 0.3], s: [0.4, 0.4, 0.4], c: 0x6b4a2a, seg: 5 },
  ],
  cone: [
    { shape: 'box', p: [0, 0.04, 0], s: [0.8, 0.08, 0.8], c: 0xff7b1c },
    { shape: 'cone', p: [0, 0.5, 0], s: [0.6, 0.9, 0.6], c: 0xff7b1c, seg: 8 },
    { shape: 'cyl', p: [0, 0.5, 0], s: [0.44, 0.16, 0.44], c: 0xffffff, seg: 8 },
  ],
  lamp: [
    { shape: 'cyl', p: [0, 2.5, 0], s: [0.18, 5.0, 0.18], c: 0x555566, seg: 6 },
    { shape: 'sphere', p: [0, 5.1, 0], s: [0.7, 0.5, 0.7], c: 0xfff3b0, seg: 8 },
  ],
  flag: [
    { shape: 'cyl', p: [0, 2.2, 0], s: [0.12, 4.4, 0.12], c: 0xdddddd, seg: 5 },
    { shape: 'box', p: [0.7, 3.8, 0], s: [1.4, 0.9, 0.05], c: 0xff4d6d },
  ],
  crowd: [
    { shape: 'box', p: [0, 0.6, 0], s: [6, 1.2, 3], c: 0x8a8fa8 },
    { shape: 'box', p: [0, 1.5, -0.7], s: [6, 0.6, 1.6], c: 0x9aa0b8 },
    { shape: 'sphere', p: [-2.2, 1.6, 0.6], s: [0.6, 0.6, 0.6], c: 0xffd2a1, seg: 6 },
    { shape: 'sphere', p: [-0.6, 1.6, 0.6], s: [0.6, 0.6, 0.6], c: 0xc68b59, seg: 6 },
    { shape: 'sphere', p: [1.0, 1.6, 0.6], s: [0.6, 0.6, 0.6], c: 0xffd2a1, seg: 6 },
    { shape: 'sphere', p: [2.4, 1.6, 0.6], s: [0.6, 0.6, 0.6], c: 0x8d5524, seg: 6 },
    { shape: 'sphere', p: [-1.4, 2.4, -0.7], s: [0.6, 0.6, 0.6], c: 0xc68b59, seg: 6 },
    { shape: 'sphere', p: [0.3, 2.4, -0.7], s: [0.6, 0.6, 0.6], c: 0xffd2a1, seg: 6 },
    { shape: 'sphere', p: [1.8, 2.4, -0.7], s: [0.6, 0.6, 0.6], c: 0xe0ac69, seg: 6 },
  ],
  balloon: [
    { shape: 'cyl', p: [0, 1.6, 0], s: [0.03, 3.2, 0.03], c: 0xffffff, seg: 3 },
    { shape: 'sphere', p: [0, 3.8, 0], s: [1.1, 1.3, 1.1], c: 0xff6fae, seg: 8 },
  ],
};
