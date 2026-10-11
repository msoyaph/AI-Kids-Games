import type { RacerData } from './types';

const SKIN = 0xffd2a1;
const INK = 0x1d1d2b;

// Driver models: origin = seat centre, +Z forward (the face looks toward +Z).
export const RACERS: RacerData[] = [
  {
    id: 'calex',
    name: 'Calex',
    bio: 'A cheerful kid racer who built their first kart out of a wagon and a leaf blower.',
    kind: 'kid',
    weight: 'medium',
    color: 0xff4d6d,
    color2: 0x3fa7ff,
    personality: 'balanced',
    defaultKart: { body: 'zoomster', wheels: 'standard', glider: 'kite' },
    voice: 1.1,
    unlocked: true,
    model: [
      { shape: 'capsule', p: [0, 0.38, 0], s: [1.2, 0.6, 1.0], c: 0x3fa7ff },
      { shape: 'sphere', p: [0, 0.98, 0.04], s: [0.62, 0.6, 0.6], c: SKIN, seg: 12 },
      { shape: 'sphere', p: [0, 1.14, 0.02], s: [0.66, 0.36, 0.66], c: 0xff4d6d, seg: 10 },
      { shape: 'box', p: [0, 1.1, 0.34], s: [0.52, 0.05, 0.3], c: 0xff4d6d },
      { shape: 'sphere', p: [0.12, 1.0, 0.31], s: [0.08, 0.12, 0.05], c: INK, seg: 6, mirror: true },
      { shape: 'capsule', p: [0.3, 0.46, 0.2], s: [0.4, 0.5, 0.4], r: [-65, 0, 12], c: 0x3fa7ff, mirror: true },
      { shape: 'sphere', p: [0.2, 0.55, 0.45], s: [0.16, 0.16, 0.16], c: SKIN, seg: 6, mirror: true },
    ],
  },
];

export function findRacer(id: string): RacerData {
  return RACERS.find((r) => r.id === id) ?? RACERS[0];
}
