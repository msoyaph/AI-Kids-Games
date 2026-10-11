// Soft pastel palette used across the procedural art.
export const PAL = {
  grass0: 0xa7d98b,
  grass1: 0x9ccf80,
  grass2: 0xb1df93,
  grassHigh0: 0x9fd08f,
  grassHigh1: 0x94c785,
  grassTop0: 0xa9d6a0,
  grassTop1: 0x9dcd96,
  sand: 0xf6e7bf,
  sandWet: 0xe7d2a4,
  dirt: 0xe3c79b,
  dirtDark: 0xd2b386,
  riverBed: 0x5fa7a8,
  oceanShallow: 0x9fd9cf,
  oceanDeep: 0x5c9fb6,
  cliff: 0xc9b195,
  cliffBand: 0xb79f86,
  cliffDark: 0xa58f78,
  bank: 0xbfa27f,
  water: 0x86d8dc,
  trunk: 0x9b7457,
  trunkDark: 0x82614a,
  leaf: [0x7fc77a, 0x8fd18a, 0x76bd83, 0x9bd67f],
  pine: [0x5fae86, 0x6ab98f, 0x58a47d, 0x72be8e],
  palmLeaf: 0x88cf7a,
  rock: [0xb8b4c4, 0xc4bdb2, 0xaeb7bf],
  wood: 0xd9ad7c,
  woodDark: 0xb98a5e,
  roofTeal: 0x7cc7c2,
  roofPink: 0xf2a7b5,
  roofLilac: 0xb9a6e0,
  cream: 0xfff3dc,
  white: 0xffffff,
  lantern: 0xffd27a,
  lanternGlow: 0xffb347,
};

export const FLOWER_COLORS: Record<string, number> = {
  red: 0xf27c7c,
  yellow: 0xffe066,
  white: 0xfdfbf4,
  orange: 0xffa45c,
  pink: 0xffa8c8,
  purple: 0xb48cf0,
  blue: 0x7fb2ff,
  black: 0x55476b,
  green: 0x9be38a,
};

/** Colors that change with the seasons (everything else stays as PAL). */
export interface SeasonPalette {
  grass0: number;
  grass1: number;
  grass2: number;
  grassHigh0: number;
  grassHigh1: number;
  grassTop0: number;
  grassTop1: number;
  sand: number;
  sandWet: number;
  dirt: number;
  dirtDark: number;
  leaf: number[];
  pine: number[];
  palmLeaf: number;
  /** grass blade tint (null = no blades, e.g. under snow) */
  blades: [number, number, number] | null;
}

const BASE: SeasonPalette = {
  grass0: PAL.grass0,
  grass1: PAL.grass1,
  grass2: PAL.grass2,
  grassHigh0: PAL.grassHigh0,
  grassHigh1: PAL.grassHigh1,
  grassTop0: PAL.grassTop0,
  grassTop1: PAL.grassTop1,
  sand: PAL.sand,
  sandWet: PAL.sandWet,
  dirt: PAL.dirt,
  dirtDark: PAL.dirtDark,
  leaf: PAL.leaf,
  pine: PAL.pine,
  palmLeaf: PAL.palmLeaf,
  blades: [0x8cc76f, 0x86bf78, 0x8fc58a],
};

export const SEASON_PALETTES: Record<'spring' | 'summer' | 'autumn' | 'winter', SeasonPalette> = {
  // fresh greens with pink blossom canopies
  spring: {
    ...BASE,
    grass0: 0xb2e08f,
    grass1: 0xa6d886,
    grass2: 0xbfe69a,
    leaf: [0xffc2d4, 0x8fd18a, 0xf7b0c8, 0x9bd67f],
    blades: [0x9ad57a, 0x92cc80, 0x9bd291],
  },
  // the classic island look
  summer: BASE,
  // golden grass, orange and red trees
  autumn: {
    ...BASE,
    grass0: 0xc9cf86,
    grass1: 0xbcc479,
    grass2: 0xd3d68e,
    grassHigh0: 0xc2c886,
    grassHigh1: 0xb6bd7c,
    grassTop0: 0xc6cb8f,
    grassTop1: 0xb9bf85,
    dirt: 0xdcbf93,
    leaf: [0xf2a65c, 0xe8875a, 0xf5c45e, 0xd9734e],
    pine: [0x5f9e7e, 0x67a885, 0x5a9677, 0x6fae88],
    palmLeaf: 0xa8c46a,
    blades: [0xc4c27a, 0xbdb873, 0xc9c584],
  },
  // snow on the ground and on the trees
  winter: {
    ...BASE,
    grass0: 0xf3f6fa,
    grass1: 0xe6ecf4,
    grass2: 0xfafcff,
    grassHigh0: 0xeef2f8,
    grassHigh1: 0xe2e9f2,
    grassTop0: 0xf6f8fc,
    grassTop1: 0xe9eef6,
    sand: 0xf1ece0,
    sandWet: 0xe2dccd,
    dirt: 0xe4dccf,
    dirtDark: 0xd2c8b8,
    leaf: [0xe9f0f2, 0xdde8e6, 0xf2f6f8, 0xd8e4e0],
    pine: [0x7fae9a, 0x8ab8a2, 0x77a592, 0x92c0aa],
    palmLeaf: 0xa9cfa0,
    blades: null,
  },
};
