import type { TrackData } from '../../types';
import { layout, left, right, straight } from '../builder';

// Driving School course 1: a friendly walled loop with every kind of bend — a medium right, a tight hairpin,
// a left kink and a long sweeper that is perfect for practising drifts.
const L = layout({ x: 0, z: 0, heading: 0, y: 0 }, [
  straight(110, { mark: 'start' }),
  right(90, 34, { mark: 't1' }),
  straight(50, { mark: 's1' }),
  right(150, 26, { mark: 'hair' }),
  straight(40, { mark: 's2' }),
  left(60, 36, { mark: 't3' }),
  right(120, 40, { mark: 'sweep' }),
  straight(60, { mark: 'back' }),
  right(60, 50, { mark: 'last' }),
]);
const m = L.marks;

export const PRACTICE_RING: TrackData = {
  id: 'school-ring',
  name: 'Practice Ring',
  cup: 'sunrise',
  theme: 'test',
  feature: 'Driving School course: every kind of bend, safe walls all round',
  width: 15,
  shoulder: 3,
  edge: 'wall',
  start: 0.5,
  points: L.points,
  marks: m,
  boostPads: [{ at: m.back - 1.5, offset: 0 }],
  itemRows: [{ at: m.start - 2.5 }],
  shortcuts: [],
  palette: { road: 0x5f6478, road2: 0x666b80, line: 0xffffff, kerb: 0xffd23f, kerb2: 0x2b2b3a, offroad: 0x7cd36b, wall: 0xff9f1c, wall2: 0xffffff, side: 0x50536a },
  sky: { top: 0x4fb6ff, bottom: 0xd6f1ff, fog: 0xd6f1ff, sun: 0xfff6e0, ambient: 0xffffff, ground: 0x7cd36b, groundY: -0.6, backdrop: 'clouds', light: { sunDir: [0.4, 1, 0.3] } },
  scatter: [
    { types: ['cone', 'flag', 'tree', 'bush'], density: 6, near: 1.5, far: 12 },
    { types: ['tree', 'pine'], density: 2, near: 20, far: 50 },
  ],
  music: 'school',
};
