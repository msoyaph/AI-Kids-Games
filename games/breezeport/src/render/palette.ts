/**
 * The town's colours: a sunny seaside palette. Sea-glass teal and deep bay blue, warm sand, pastel
 * clapboard and brick, white trim, slate and coral roofs, and lawns a little cooler and bluer than a
 * farm's meadow. Each season has its own grass, leaves and sea; the light follows the time of day
 * (render/lighting.ts). (The structure follows games/fieldlark/src/render/palette.ts; the colours are
 * the town's own.)
 */
import * as THREE from 'three';
import type { Season } from '../sim/clock';

export interface SeasonPalette {
  grass: number;
  grassAlt: number;
  /** Mown lawns in yards and parks. */
  lawn: number;
  lawnAlt: number;
  /** Sun-bleached patches in the grass. */
  dry: number;
  water: number;
  waterDeep: number;
  leaf: number;
  leafAlt: number;
  pine: number;
  flower: number[];
}

export const SEASON_PALETTES: Record<Season, SeasonPalette> = {
  spring: { grass: 0x7fca63, grassAlt: 0x93d470, lawn: 0x78c968, lawnAlt: 0x8fd57a, dry: 0xc5da86, water: 0x3cc0c8, waterDeep: 0x1d6fa3, leaf: 0x6fc36a, leafAlt: 0xf7b8cf, pine: 0x3c8a64, flower: [0xffd34d, 0xff8fb0, 0xffffff, 0xa98bff] },
  summer: { grass: 0x6dbd57, grassAlt: 0x82c862, lawn: 0x67c05c, lawnAlt: 0x7fcd6c, dry: 0xc2c97a, water: 0x2fb9c6, waterDeep: 0x16659c, leaf: 0x55b257, leafAlt: 0x6cc064, pine: 0x337c58, flower: [0xffc23d, 0xff6f7a, 0xffffff, 0x7fc8ff] },
  autumn: { grass: 0x9dbc5e, grassAlt: 0xb3c56a, lawn: 0x8fbd61, lawnAlt: 0xa3c76c, dry: 0xd3b766, water: 0x3aa9bd, waterDeep: 0x1d5f90, leaf: 0xf2a23e, leafAlt: 0xe0613f, pine: 0x3b7a55, flower: [0xffae3d, 0xd9643a, 0xfff2c9, 0xc48dff] },
  winter: { grass: 0xe8f0f3, grassAlt: 0xf3f7f9, lawn: 0xe6eff2, lawnAlt: 0xf1f6f8, dry: 0xd3dde1, water: 0x6fbad2, waterDeep: 0x3b7aa2, leaf: 0xdfe9ea, leafAlt: 0xc9d9dc, pine: 0x4b876c, flower: [0xffffff, 0xd8ecff, 0xffe7f0, 0xfff2b0] },
};

/** Streets, paving and the shore (the same all year; snow settles on them in winter). */
export const STREET = {
  asphalt: 0x6c7480,
  asphaltDark: 0x5c636e,
  sidewalk: 0xdcd5c6,
  curb: 0xb8b0a0,
  paint: 0xf7f3e8,
  paintYellow: 0xf2c84b,
  paving: 0xe6dccb,
  pavingAlt: 0xd5c8b2,
  gravel: 0xd9c49a,
  sand: 0xf0dcaa,
  wetSand: 0xc9b385,
  bed: 0x4f8a8a,
  soil: 0x9c7552,
  base: 0x6d4f37,
};

export { PAINT } from '../data/paints';

const a = new THREE.Color(), b = new THREE.Color();
/** Mix two hex colours (t = 0 → x, 1 → y). */
export function mixHex(x: number, y: number, t: number): number {
  a.setHex(x); b.setHex(y);
  return a.lerp(b, t).getHex();
}
