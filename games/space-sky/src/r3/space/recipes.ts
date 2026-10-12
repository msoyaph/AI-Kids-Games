import { BODY_BY_ID } from '../../data/bodies';

/**
 * How each body looks in 3D. Real bodies get hand-tuned recipes with true-to-life colors
 * (kids learn from these!); made-up bodies (Zephyra and friends) get a clearly magical look.
 * The 2D `look` data in bodies.ts stays for the flat UI art.
 */

/** Surface kinds understood by the bake shader (keep in sync with SURFACE_KIND in planetShaders.ts). */
export const KIND = {
  rocky: 0,
  cratered: 1,
  earth: 2,
  venus: 3,
  mars: 4,
  banded: 5,
  io: 6,
  europa: 7,
  titan: 8,
  pluto: 9,
  alien: 10,
  icy: 11,
  sun: 12,
  candy: 13,
} as const;
export type SurfaceKind = keyof typeof KIND;

export interface RingRecipe {
  /** Inner / outer radius in planet radii. */
  inner: number;
  outer: number;
  colors: [string, string];
  opacity: number;
  /** Narrow, faint rings (Uranus) vs. broad bright ones (Saturn). */
  faint?: boolean;
}

export interface PlanetRecipe {
  kind: SurfaceKind;
  /** Up to six palette colors; meaning depends on the kind. */
  colors: string[];
  /** Kind-specific numbers (see planetShaders.ts). */
  p: [number, number, number, number];
  /** Random seed (from bodies.ts). */
  seed: number;
  /** Atmosphere rim color and strength (0 = airless). */
  atmo: string | null;
  atmoStrength: number;
  /** Separate rotating cloud layer (Medium/High). */
  clouds?: { color: string; coverage: number; speed: number };
  rings?: RingRecipe;
  /** Axial tilt (radians) and spin speed (radians per second, cosmetic). */
  tilt: number;
  spin: number;
  /** Bump strength for the baked height. */
  bump: number;
  /** Ocean glint strength (Earth). */
  spec?: number;
  /** Glowing parts: color and mode (1 = low places glow: lava; 2 = high ridges glow: magic veins). */
  emissive?: { color: string; mode: 1 | 2; strength: number };
  /** Lumpy, non-round shape (small moons and asteroids): 0 = round. */
  lumpy?: number;
  /** Real or made up (made-up worlds get extra sparkle). */
  real: boolean;
}

const deg = Math.PI / 180;

const R: Record<string, Omit<PlanetRecipe, 'seed' | 'real'>> = {
  sun: { kind: 'sun', colors: ['#ffe9a0', '#ffc23a', '#ff8a1e', '#ff5a10'], p: [1, 0, 0, 0], atmo: '#ffb347', atmoStrength: 1.4, tilt: 0.1, spin: 0.02, bump: 0 },
  mercury: { kind: 'cratered', colors: ['#8f857b', '#6b625a', '#b0a597', '#57504a'], p: [1.0, 0.65, 0.3, 0], atmo: null, atmoStrength: 0, tilt: 0.01, spin: 0.03, bump: 1.4 },
  venus: { kind: 'venus', colors: ['#e9d3a0', '#d6b06e', '#f6e9c6', '#c49452'], p: [0.6, 0, 0, 0], atmo: '#ffe2a0', atmoStrength: 0.8, clouds: { color: '#fff1cf', coverage: 0.45, speed: 0.012 }, tilt: 177 * deg, spin: 0.01, bump: 0 },
  earth: { kind: 'earth', colors: ['#123f8a', '#2a6fc6', '#3f7d3a', '#c4a46c', '#8a7a5a', '#f2f6fa'], p: [0.52, 0.85, 0, 0], atmo: '#6fb6ff', atmoStrength: 0.9, clouds: { color: '#ffffff', coverage: 0.32, speed: 0.01 }, tilt: 23.4 * deg, spin: 0.05, bump: 0.6, spec: 1.0 },
  moon: { kind: 'cratered', colors: ['#9d9a95', '#4a4845', '#c9c6c0', '#45433f'], p: [1.0, 1.0, 0.45, 1], atmo: null, atmoStrength: 0, tilt: 0.03, spin: 0.02, bump: 1.5 },
  mars: { kind: 'mars', colors: ['#b8532f', '#6e3220', '#d4835a', '#f4f1ec', '#8f4128'], p: [0.8, 0.12, 0, 0], atmo: '#f0a080', atmoStrength: 0.45, tilt: 25 * deg, spin: 0.045, bump: 1.1 },
  phobos: { kind: 'cratered', colors: ['#6b6058', '#4e4640', '#857a70', '#3f3833'], p: [1.2, 0.7, 0.2, 0], atmo: null, atmoStrength: 0, tilt: 0, spin: 0.06, bump: 1.6, lumpy: 0.28 },
  deimos: { kind: 'rocky', colors: ['#8b7f72', '#6f6459', '#a39687', '#5c5249'], p: [0.6, 0.3, 0, 0], atmo: null, atmoStrength: 0, tilt: 0, spin: 0.05, bump: 1.2, lumpy: 0.3 },
  ceres: { kind: 'cratered', colors: ['#6c6a67', '#4e4c4a', '#8a8784', '#f4f8ff'], p: [1.1, 0.6, 0.25, 2], atmo: null, atmoStrength: 0, tilt: 0.07, spin: 0.04, bump: 1.4 },
  vesta: { kind: 'cratered', colors: ['#9a8f80', '#756b5f', '#b9ae9e', '#5f564c'], p: [0.9, 0.5, 0.2, 0], atmo: null, atmoStrength: 0, tilt: 0.5, spin: 0.06, bump: 1.6, lumpy: 0.18 },
  jupiter: { kind: 'banded', colors: ['#ecdcc0', '#c4986a', '#94552f', '#f8efdf', '#c0573a', '#8a6a52'], p: [14, 0.75, 1, 1], atmo: '#f5e2c0', atmoStrength: 0.35, tilt: 3 * deg, spin: 0.05, bump: 0 },
  io: { kind: 'io', colors: ['#e8d65e', '#d38b32', '#3a2b1c', '#f6f0c8', '#c9532b'], p: [0.6, 0, 0, 0], atmo: null, atmoStrength: 0, tilt: 0, spin: 0.04, bump: 0.8, emissive: { color: '#ff7a2a', mode: 1, strength: 2.2 } },
  europa: { kind: 'europa', colors: ['#ece5d6', '#d9cbb0', '#9b5a38', '#c48a62'], p: [1, 0, 0, 0], atmo: null, atmoStrength: 0, tilt: 0, spin: 0.035, bump: 0.5 },
  ganymede: { kind: 'cratered', colors: ['#7d7368', '#5d554d', '#b5ab9c', '#d9d4cc'], p: [0.7, 0.45, 0.6, 3], atmo: null, atmoStrength: 0, tilt: 0, spin: 0.03, bump: 1.1 },
  callisto: { kind: 'cratered', colors: ['#5b5048', '#433a34', '#8a7f72', '#cfc7bb'], p: [1.4, 0.75, 0.15, 4], atmo: null, atmoStrength: 0, tilt: 0, spin: 0.025, bump: 1.4 },
  saturn: { kind: 'banded', colors: ['#e7d39f', '#cdae70', '#b8955a', '#f4e8c4', '#d9c08a', '#a8875a'], p: [10, 0.35, 0, 0.8], atmo: '#ffeec2', atmoStrength: 0.35, rings: { inner: 1.25, outer: 2.35, colors: ['#e2d2a6', '#b9a37a'], opacity: 0.92 }, tilt: 26.7 * deg, spin: 0.05, bump: 0 },
  titan: { kind: 'titan', colors: ['#d4963a', '#b97a2c', '#e8b45a', '#9a6224'], p: [0, 0, 0, 0], atmo: '#ffc46b', atmoStrength: 1.2, tilt: 0.05, spin: 0.02, bump: 0 },
  enceladus: { kind: 'icy', colors: ['#dfe6eb', '#c9d5de', '#6fb4dc', '#f4f8fa'], p: [0.4, 1, 0, 0], atmo: '#e6f7ff', atmoStrength: 0.3, tilt: 0, spin: 0.04, bump: 0.6 },
  uranus: { kind: 'banded', colors: ['#a9e2e6', '#9dd8de', '#b9eef0', '#c9f3f2', '#93ccd3', '#a2dde2'], p: [6, 0.08, 0, 0.3], atmo: '#c8fffb', atmoStrength: 0.6, rings: { inner: 1.55, outer: 2.0, colors: ['#9fb7bf', '#6f8790'], opacity: 0.55, faint: true }, tilt: 97.8 * deg, spin: 0.045, bump: 0 },
  miranda: { kind: 'icy', colors: ['#a3a6a9', '#7d8185', '#c7cacc', '#5f6366'], p: [0.8, 0, 1, 0], atmo: null, atmoStrength: 0, tilt: 0, spin: 0.04, bump: 1.3 },
  neptune: { kind: 'banded', colors: ['#3366d6', '#2a4fb8', '#4a7ff0', '#7fa8ff', '#1b2a78', '#e8f0ff'], p: [8, 0.3, 2, 0.85], atmo: '#7fa6ff', atmoStrength: 0.7, tilt: 28.3 * deg, spin: 0.05, bump: 0 },
  triton: { kind: 'icy', colors: ['#d9c3b8', '#bf9d90', '#9a6c5c', '#e8d2cc'], p: [0.6, 0, 2, 0], atmo: '#f0e4ff', atmoStrength: 0.15, tilt: 0, spin: 0.03, bump: 0.8 },
  pluto: { kind: 'pluto', colors: ['#bb9678', '#6b3f2e', '#f2e8da', '#9a7258', '#d8c0a6'], p: [0, 0, 0, 0], atmo: '#cfe0ff', atmoStrength: 0.18, tilt: 120 * deg, spin: 0.02, bump: 0.9 },
  charon: { kind: 'cratered', colors: ['#8f8b88', '#6c6865', '#a9a5a1', '#6e4a3e'], p: [0.8, 0.4, 0.2, 5], atmo: null, atmoStrength: 0, tilt: 0, spin: 0.02, bump: 1.1 },
  // Made-up worlds: bright and magical, clearly not real planets.
  zephyra: { kind: 'alien', colors: ['#5b3fd8', '#27c9b4', '#ff9ad9', '#fff7b3', '#3a2a9e'], p: [0.5, 0, 0, 0], atmo: '#c89bff', atmoStrength: 1.0, clouds: { color: '#ffe6fb', coverage: 0.35, speed: 0.015 }, rings: { inner: 1.35, outer: 1.9, colors: ['#ff9ad9', '#b07bff'], opacity: 0.7 }, tilt: 0.35, spin: 0.05, bump: 0.6, emissive: { color: '#7dffe9', mode: 2, strength: 2.6 } },
  tibble: { kind: 'candy', colors: ['#ff7ad9', '#ffe066', '#ffffff'], p: [5, 0, 0, 0], atmo: '#ffc2ee', atmoStrength: 0.5, tilt: 0.4, spin: 0.08, bump: 0.3 },
  tobble: { kind: 'candy', colors: ['#2de0c7', '#4c7dff', '#ffffff'], p: [3, 1, 0, 0], atmo: '#a8fff1', atmoStrength: 0.5, tilt: -0.3, spin: 0.06, bump: 0.3 },
};

/** Generic fallback from the 2D look (for any body without a hand-made recipe). */
function fromLook(id: string): Omit<PlanetRecipe, 'seed' | 'real'> {
  const b = BODY_BY_ID[id];
  const l = b?.look;
  const colors = [l?.base ?? '#999999', l?.second ?? '#777777', l?.third ?? '#bbbbbb', '#555555'];
  return { kind: 'rocky', colors, p: [0.6, 0.3, 0, 0], atmo: l?.glow ?? null, atmoStrength: l?.glow ? 0.5 : 0, tilt: 0.1, spin: 0.03, bump: 1 };
}

const cache = new Map<string, PlanetRecipe>();

export function recipeFor(id: string): PlanetRecipe {
  let r = cache.get(id);
  if (!r) {
    const b = BODY_BY_ID[id];
    r = { ...(R[id] ?? fromLook(id)), seed: b?.look.seed ?? id.length * 7, real: b?.real !== false };
    cache.set(id, r);
  }
  return r;
}
