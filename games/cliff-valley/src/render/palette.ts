/**
 * Cliff Valley master palette. Every sprite is authored against these named colors,
 * which lets seasons and variants palette-swap cleanly.
 */
export const P = {
  ink: 0x1a1520,
  ink2: 0x2b2433,
  white: 0xfffaf0,
  cream: 0xf4e9c8,

  // greens (grass / leaves)
  g0: 0x1d3a2b,
  g1: 0x2c5a37,
  g2: 0x3e7c3c,
  g3: 0x5c9e48,
  g4: 0x86c25a,
  g5: 0xb8e07c,

  // browns (wood / soil)
  b0: 0x2b1d16,
  b1: 0x46301f,
  b2: 0x6a4630,
  b3: 0x8f603d,
  b4: 0xb7844f,
  b5: 0xdcae72,

  // soil
  soil: 0x6b4a32,
  soilD: 0x4f3424,
  soilW: 0x3f2a1f,
  soilWD: 0x2c1d16,

  // stone / greys
  s0: 0x24232f,
  s1: 0x3d3c4e,
  s2: 0x5f5e74,
  s3: 0x8a8aa0,
  s4: 0xb9b9ca,
  s5: 0xe6e7ef,

  // water
  w0: 0x1b3363,
  w1: 0x24548f,
  w2: 0x3479c0,
  w3: 0x5fa6e0,
  w4: 0xa3d8f4,

  // sand
  sa0: 0xb08c55,
  sa1: 0xcfac6e,
  sa2: 0xe6c98f,
  sa3: 0xf4e2b4,

  // reds / oranges / yellows
  r0: 0x5a1e2a,
  r1: 0x96293a,
  r2: 0xd2434a,
  r3: 0xf07868,
  o1: 0xb4571e,
  o2: 0xe4862e,
  o3: 0xf6b146,
  y1: 0xf5d34a,
  y2: 0xfbe97a,
  y3: 0xfff5b8,

  // purples / pinks / blues
  p0: 0x3a2853,
  p1: 0x664788,
  p2: 0x9873be,
  p3: 0xc8a7e8,
  k1: 0xbf5688,
  k2: 0xee8ab6,
  k3: 0xffc6dc,
  bl1: 0x2f4fa8,
  bl2: 0x4f7fe0,
  bl3: 0x8fb6f5,
  t1: 0x1f7a78,
  t2: 0x35b0a2,
  t3: 0x8ae0cf,

  // skin tones
  sk0: 0xffe0c4,
  sk1: 0xf2c49b,
  sk2: 0xd59a6a,
  sk3: 0xa86b43,
  sk4: 0x7a4a2e,
  sk5: 0x553220,

  // snow
  snow0: 0xc9d6e8,
  snow1: 0xe3ecf7,
  snow2: 0xf8fbff,
} as const;

export type PaletteName = keyof typeof P;

/** Seasonal grass ramps (dark→light) used to palette-swap terrain and foliage. */
export const SEASON_GRASS: readonly (readonly number[])[] = [
  [P.g1, P.g2, P.g3, P.g4, P.g5], // spring
  [0x1f4a2a, 0x2f6a34, 0x47873a, 0x6aa64a, 0x9ccc62], // summer: deeper
  [0x5a3a1e, 0x7c5426, 0x9e7232, 0xc29445, 0xe3b866], // autumn: golden
  [P.s3, P.snow0, P.snow1, P.snow2, P.white], // winter: snow
];

/** Seasonal leaf colors for trees (dark, mid, light). */
export const SEASON_LEAF: readonly (readonly number[])[] = [
  [P.g1, P.g3, P.g4],
  [0x1f4a2a, 0x3b7a38, 0x5f9e45],
  [0x8a3a1c, 0xd0682a, 0xf0a640],
  [0x6b7f8f, 0xc9d6e8, 0xf8fbff],
];
