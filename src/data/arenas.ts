import type { ArenaData } from './types';

/** Test course used during development (Phase 2) and as a fallback. */
export const TEST_ARENA: ArenaData = {
  id: 'test',
  name: 'Test Lot',
  theme: 'test',
  shape: 'square',
  size: 70,
  obstacles: [
    { kind: 'cyl', x: 20, z: 20, hx: 2, hz: 2, h: 3, color: 0xff9f1c },
    { kind: 'cyl', x: -25, z: 10, hx: 3, hz: 3, h: 2, color: 0x4ce0d2 },
    { kind: 'box', x: 0, z: -30, hx: 6, hz: 1.5, h: 1.5, rot: 20, color: 0xff6fae },
  ],
  ramps: [{ x: -10, z: 25, dir: 0, width: 8, length: 9, height: 2.2 }],
  platforms: [{ x: 30, z: -20, hx: 10, hz: 8, h: 2 }],
  itemBoxes: [],
  palette: {
    road: 0x6c7086,
    road2: 0x7a7f96,
    line: 0xffffff,
    kerb: 0xff4d6d,
    kerb2: 0xffffff,
    offroad: 0x6cd36b,
    wall: 0x3fa7ff,
    wall2: 0xffd23f,
    side: 0x50536a,
  },
  sky: { top: 0x4fb6ff, bottom: 0xbfe8ff, fog: 0xbfe8ff, sun: 0xffffff, ambient: 0xffffff, ground: 0x6cd36b },
  music: 'menu',
  unlocked: false,
};

// Ramps leading to the platform
TEST_ARENA.ramps.push({ x: 30, z: -38, dir: 0, width: 8, length: 10, height: 2 });

export const ARENAS: ArenaData[] = [];

export function findArena(id: string): ArenaData {
  return ARENAS.find((a) => a.id === id) ?? TEST_ARENA;
}
