/** Ground terrain ids (one byte per tile) and their properties. */
export const Ter = {
  VOID: 0,
  GRASS: 1,
  DIRT: 2,
  PATH: 3,
  SAND: 4,
  WATER: 5,
  CLIFF: 6,
  FLOOR: 7,
  WALL: 8,
  WALLTOP: 9,
  BRIDGE: 10,
  CAVE: 11,
  CAVEWALL: 12,
  TILEFLOOR: 13,
  DOCK: 14,
  COBBLE: 15,
  CARPET: 16,
  RAIL: 17,
  DEEPWATER: 18,
  FLOWERS: 19,
  BROKENBRIDGE: 20,
  STONEFLOOR: 21,
  MUD: 22,
} as const;
export type TerId = (typeof Ter)[keyof typeof Ter];

interface TerInfo {
  walk: boolean;
  till: boolean;
  water: boolean;
  /** minimap color */
  map: number;
}

const info = (walk: boolean, till: boolean, water: boolean, map: number): TerInfo => ({ walk, till, water, map });

export const TER_INFO: TerInfo[] = [];
TER_INFO[Ter.VOID] = info(false, false, false, 0x101010);
TER_INFO[Ter.GRASS] = info(true, true, false, 0x5c9e48);
TER_INFO[Ter.DIRT] = info(true, true, false, 0x9b7448);
TER_INFO[Ter.PATH] = info(true, false, false, 0xb9b9ca);
TER_INFO[Ter.SAND] = info(true, false, false, 0xe6c98f);
TER_INFO[Ter.WATER] = info(false, false, true, 0x3479c0);
TER_INFO[Ter.CLIFF] = info(false, false, false, 0x5f5e74);
TER_INFO[Ter.FLOOR] = info(true, false, false, 0xb7844f);
TER_INFO[Ter.WALL] = info(false, false, false, 0x8a6a5a);
TER_INFO[Ter.WALLTOP] = info(false, false, false, 0x2b2433);
TER_INFO[Ter.BRIDGE] = info(true, false, false, 0x8f603d);
TER_INFO[Ter.CAVE] = info(true, false, false, 0x6a5a4a);
TER_INFO[Ter.CAVEWALL] = info(false, false, false, 0x3d3c4e);
TER_INFO[Ter.TILEFLOOR] = info(true, false, false, 0xe6e7ef);
TER_INFO[Ter.DOCK] = info(true, false, false, 0xa07040);
TER_INFO[Ter.COBBLE] = info(true, false, false, 0xa8a0a0);
TER_INFO[Ter.CARPET] = info(true, false, false, 0xb04050);
TER_INFO[Ter.RAIL] = info(true, false, false, 0x6a5040);
TER_INFO[Ter.DEEPWATER] = info(false, false, true, 0x24548f);
TER_INFO[Ter.FLOWERS] = info(true, true, false, 0x86c25a);
TER_INFO[Ter.BROKENBRIDGE] = info(false, false, true, 0x3479c0);
TER_INFO[Ter.STONEFLOOR] = info(true, false, false, 0x8a8aa0);
TER_INFO[Ter.MUD] = info(true, false, false, 0x6b4a32);
