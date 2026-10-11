import type { TrackData } from '../../types';
import { layout, left, offset, straight } from '../builder';

// PLACEHOLDER — replaced by the real Avalanche Peak layout.
const L = layout({ x: 0, z: 0, heading: 0, y: 0 }, [
  straight(160, { mark: 'start' }),
  left(180, 45, { mark: 'far' }),
  straight(160, { mark: 'back' }),
  left(180, 45),
]);
const m = L.marks;
const P = L.pos;

export const AVALANCHE_PEAK: TrackData = {
  id: 'avalanche-peak',
  name: 'Avalanche Peak',
  cup: 'frost',
  theme: 'summit',
  feature: 'Coming soon',
  width: 14,
  shoulder: 4,
  edge: 'wall',
  start: 0.5,
  points: L.points,
  ice: [{ from: m.start + 1, to: m.start + 3 }],
  itemRows: [{ at: m.start - 2 }, { at: m.back - 2 }],
  shortcuts: [
    {
      points: [offset(P.far, 4, 0), offset(P.far, 30, 30), offset(P.back, -100, 0)],
      width: 9,
      edge: 'open',
      surface: 'ice',
      joinFrom: m.far + 0.2,
      joinTo: m.back - 4.4,
      hint: 'Placeholder shortcut.',
      aiUse: 0.3,
    },
  ],
  palette: { road: 0x6a7388, road2: 0x717a90, line: 0xffffff, kerb: 0x3fa7ff, kerb2: 0xffffff, offroad: 0xeef4ff, wall: 0xdfeaff, wall2: 0x3fa7ff, side: 0x9fb4d0 },
  sky: { top: 0x4f9ef5, bottom: 0xe6f4ff, fog: 0xeaf4ff, sun: 0xfff6ea, ambient: 0xf4f8ff, ground: 0xf4f8ff, groundY: -1, backdrop: 'mountains' },
  music: 'frost4',
};
