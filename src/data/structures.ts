/**
 * Static map props and buildings. A building's footprint (w×h tiles) is solid except
 * its door tile, which is a walkable warp. Sprites are generated in render/art/buildings.ts
 * from the `look` parameters, so adding a building is just adding data here.
 */
export interface BuildingLook {
  wall: number;
  roof: number;
  trim: number;
  /** roof height in tiles above the footprint */
  roofH: number;
  windows: number;
  sign?: string; // small icon drawn on the sign board
  style?: 'house' | 'shop' | 'barn' | 'coop' | 'silo' | 'hall' | 'greenhouse' | 'well' | 'shed' | 'station' | 'ruin';
  chimney?: boolean;
}

export interface StructureDef {
  w: number;
  h: number;
  door?: { dx: number; dy: number };
  look: BuildingLook;
}

const C = {
  creamWall: 0xe8d8b0,
  wood: 0xb7844f,
  darkWood: 0x6a4630,
  redRoof: 0xb04040,
  blueRoof: 0x3f6aa8,
  greenRoof: 0x3e7c3c,
  brownRoof: 0x7a4a2e,
  purpleRoof: 0x6a4f8c,
  tealRoof: 0x2f8a80,
  orangeRoof: 0xd06a2a,
  stone: 0x9a98a8,
  white: 0xf3efe6,
  pink: 0xe8a8b8,
  yellow: 0xf0d070,
};

export const STRUCTURES: Record<string, StructureDef> = {
  farmhouse0: { w: 6, h: 3, door: { dx: 2, dy: 2 }, look: { wall: C.wood, roof: C.redRoof, trim: C.darkWood, roofH: 2, windows: 1, style: 'house', chimney: true } },
  farmhouse1: { w: 7, h: 3, door: { dx: 2, dy: 2 }, look: { wall: C.creamWall, roof: C.redRoof, trim: C.darkWood, roofH: 2, windows: 2, style: 'house', chimney: true } },
  farmhouse2: { w: 8, h: 3, door: { dx: 2, dy: 2 }, look: { wall: C.white, roof: C.redRoof, trim: C.darkWood, roofH: 3, windows: 3, style: 'house', chimney: true } },
  greenhouseRuin: { w: 7, h: 4, look: { wall: 0x9ab0a8, roof: 0x6f8f8a, trim: 0x5f5e74, roofH: 2, windows: 0, style: 'ruin' } },
  greenhouse: { w: 7, h: 4, door: { dx: 3, dy: 3 }, look: { wall: 0xbfe8e0, roof: 0x8fd8e8, trim: 0x2f6a6a, roofH: 2, windows: 0, style: 'greenhouse' } },
  coop0: { w: 5, h: 3, door: { dx: 1, dy: 2 }, look: { wall: 0xc8a070, roof: C.brownRoof, trim: C.darkWood, roofH: 2, windows: 1, style: 'coop' } },
  coop1: { w: 5, h: 3, door: { dx: 1, dy: 2 }, look: { wall: 0xd8b880, roof: C.greenRoof, trim: C.darkWood, roofH: 2, windows: 2, style: 'coop' } },
  coop2: { w: 5, h: 3, door: { dx: 1, dy: 2 }, look: { wall: 0xe8d090, roof: C.blueRoof, trim: C.darkWood, roofH: 2, windows: 2, style: 'coop' } },
  barn0: { w: 7, h: 4, door: { dx: 3, dy: 3 }, look: { wall: 0xb04a3a, roof: C.brownRoof, trim: C.white, roofH: 3, windows: 0, style: 'barn' } },
  barn1: { w: 7, h: 4, door: { dx: 3, dy: 3 }, look: { wall: 0xc05a40, roof: 0x5a3a2a, trim: C.white, roofH: 3, windows: 1, style: 'barn' } },
  barn2: { w: 7, h: 4, door: { dx: 3, dy: 3 }, look: { wall: 0xd06a48, roof: 0x3a4a6a, trim: C.white, roofH: 3, windows: 2, style: 'barn' } },
  silo: { w: 3, h: 3, look: { wall: 0xc8c0b0, roof: 0x8a5a3a, trim: 0x6a6a7a, roofH: 3, windows: 0, style: 'silo' } },
  well: { w: 2, h: 2, look: { wall: C.stone, roof: C.brownRoof, trim: C.darkWood, roofH: 1, windows: 0, style: 'well' } },
  shed: { w: 4, h: 3, door: { dx: 1, dy: 2 }, look: { wall: 0x9a7a58, roof: 0x5a6a4a, trim: C.darkWood, roofH: 2, windows: 1, style: 'shed' } },
  plot: { w: 1, h: 1, look: { wall: 0, roof: 0, trim: 0, roofH: 0, windows: 0 } },

  // Town
  store: { w: 8, h: 4, door: { dx: 3, dy: 3 }, look: { wall: C.creamWall, roof: C.greenRoof, trim: C.darkWood, roofH: 2, windows: 2, sign: 'store', style: 'shop' } },
  smithy: { w: 7, h: 4, door: { dx: 2, dy: 3 }, look: { wall: 0x8a8898, roof: 0x4a4a5a, trim: 0x3d3c4e, roofH: 2, windows: 1, sign: 'anvil', style: 'shop', chimney: true } },
  carpentry: { w: 7, h: 4, door: { dx: 3, dy: 3 }, look: { wall: 0xc89a60, roof: C.orangeRoof, trim: C.darkWood, roofH: 2, windows: 2, sign: 'saw', style: 'shop' } },
  ranch: { w: 8, h: 4, door: { dx: 2, dy: 3 }, look: { wall: 0xe8e0c8, roof: 0xb04a3a, trim: C.darkWood, roofH: 2, windows: 2, sign: 'egg', style: 'barn' } },
  cafe: { w: 7, h: 4, door: { dx: 3, dy: 3 }, look: { wall: C.pink, roof: C.purpleRoof, trim: C.white, roofH: 2, windows: 2, sign: 'cup', style: 'shop' } },
  hall: { w: 10, h: 5, door: { dx: 4, dy: 4 }, look: { wall: 0xd8ccb0, roof: C.tealRoof, trim: 0x5a4a3a, roofH: 3, windows: 4, sign: 'star', style: 'hall' } },
  museum: { w: 8, h: 4, door: { dx: 3, dy: 3 }, look: { wall: 0xd0c8d8, roof: C.blueRoof, trim: 0x4a4a6a, roofH: 2, windows: 3, sign: 'gem', style: 'hall' } },
  fishshop: { w: 6, h: 3, door: { dx: 2, dy: 2 }, look: { wall: 0x7aa8c8, roof: 0xe8e0d0, trim: 0x2f4fa8, roofH: 2, windows: 1, sign: 'fish', style: 'shop' } },
  station: { w: 8, h: 3, look: { wall: 0xa86a4a, roof: 0x3a5a4a, trim: 0x2b2433, roofH: 2, windows: 3, sign: 'train', style: 'station' } },
  houseA: { w: 5, h: 3, door: { dx: 2, dy: 2 }, look: { wall: 0xe0c8a0, roof: C.blueRoof, trim: C.darkWood, roofH: 2, windows: 1, style: 'house', chimney: true } },
  houseB: { w: 5, h: 3, door: { dx: 2, dy: 2 }, look: { wall: 0xc8d8b8, roof: C.redRoof, trim: C.darkWood, roofH: 2, windows: 1, style: 'house' } },
  houseC: { w: 6, h: 3, door: { dx: 3, dy: 2 }, look: { wall: 0xe8d0d8, roof: C.purpleRoof, trim: C.white, roofH: 2, windows: 2, style: 'house', chimney: true } },
  houseD: { w: 5, h: 3, door: { dx: 2, dy: 2 }, look: { wall: 0xd8c098, roof: C.greenRoof, trim: C.darkWood, roofH: 2, windows: 1, style: 'house' } },
  cabin: { w: 5, h: 3, door: { dx: 2, dy: 2 }, look: { wall: 0x8f603d, roof: 0x4a6a3a, trim: 0x46301f, roofH: 2, windows: 1, style: 'house', chimney: true } },
  mineEntrance: { w: 4, h: 2, door: { dx: 1, dy: 1 }, look: { wall: 0x5f5e74, roof: 0x3d3c4e, trim: 0x24232f, roofH: 2, windows: 0, style: 'ruin' } },
};

export interface PropDef {
  /** sprite name in atlas (without season suffix); seasonal props get `.s{n}` */
  sprite: string;
  solid: boolean;
  seasonal?: boolean;
  /** footprint in tiles (default 1×1), anchored at the placement tile (top-left) */
  w?: number;
  h?: number;
  /** drawn flat on the ground layer instead of y-sorted */
  flat?: boolean;
}

export const PROPS: Record<string, PropDef> = {
  tree: { sprite: 'prop.tree', solid: true, seasonal: true },
  pine: { sprite: 'prop.pine', solid: true, seasonal: true },
  bush: { sprite: 'prop.bush', solid: true, seasonal: true },
  flowers: { sprite: 'prop.flowers', solid: false, seasonal: true, flat: true },
  rockwall: { sprite: 'prop.rockwall', solid: true },
  lamp: { sprite: 'prop.lamp', solid: true },
  bench: { sprite: 'prop.bench', solid: true, w: 2 },
  sign: { sprite: 'prop.sign', solid: true },
  mailbox: { sprite: 'prop.mailbox', solid: true },
  bin: { sprite: 'prop.bin', solid: true, w: 2 },
  fence: { sprite: 'prop.fence', solid: true },
  crate: { sprite: 'prop.crate', solid: true },
  barrel: { sprite: 'prop.barrel', solid: true },
  fountain: { sprite: 'prop.fountain', solid: true, w: 2, h: 2 },
  board: { sprite: 'prop.board', solid: true, w: 2 },
  // interiors
  bed: { sprite: 'prop.bed', solid: true, h: 2 },
  radio: { sprite: 'prop.radio', solid: true },
  stove: { sprite: 'prop.stove', solid: true },
  table: { sprite: 'prop.table', solid: true },
  chair: { sprite: 'prop.chair', solid: false },
  shelf: { sprite: 'prop.shelf', solid: true },
  counter: { sprite: 'prop.counter', solid: true },
  plant: { sprite: 'prop.plant', solid: true },
  rug: { sprite: 'prop.rug', solid: false, flat: true },
  fireplace: { sprite: 'prop.fireplace', solid: true },
  window: { sprite: 'prop.window', solid: true },
  painting: { sprite: 'prop.painting', solid: true },
  anvil: { sprite: 'prop.anvil', solid: true },
  case: { sprite: 'prop.case', solid: true },
  pedestal: { sprite: 'prop.pedestal', solid: true },
  hay: { sprite: 'prop.hay', solid: true },
  trough: { sprite: 'prop.trough', solid: true },
  lantern: { sprite: 'prop.lantern', solid: true },
  crystal: { sprite: 'prop.crystal', solid: true },
  stalagmite: { sprite: 'prop.stalagmite', solid: true },
  lift: { sprite: 'prop.lift', solid: true },
  ladderUp: { sprite: 'prop.ladderUp', solid: true },
  boat: { sprite: 'prop.boat', solid: true, w: 2 },
  piano: { sprite: 'prop.piano', solid: true },
  bookshelf: { sprite: 'prop.bookshelf', solid: true },
  table2: { sprite: 'prop.table2', solid: true, w: 2 },
  easel: { sprite: 'prop.easel', solid: true },
  workbench: { sprite: 'prop.workbench', solid: true },
  cauldron: { sprite: 'prop.cauldron', solid: true },
  telescope: { sprite: 'prop.telescope', solid: true },
  bigtree: { sprite: 'prop.bigtree', solid: true, seasonal: true, w: 3, h: 2 },
  rubble: { sprite: 'prop.rubble', solid: true },
  railEnd: { sprite: 'prop.railEnd', solid: true },
  stall: { sprite: 'prop.stall', solid: true, w: 2 },
  banner: { sprite: 'prop.banner', solid: false },
  lanternPost: { sprite: 'prop.lanternPost', solid: true },
  pumpkinDeco: { sprite: 'prop.pumpkinDeco', solid: true },
  snowman: { sprite: 'prop.snowman', solid: true },
  starTree: { sprite: 'prop.starTree', solid: true },
};
