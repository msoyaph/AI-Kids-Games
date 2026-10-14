/**
 * The farm's colours: bright, warm and soft, like a painted toy diorama. Each season has its own
 * ground and foliage colours; the sky and light follow the time of day (render/lighting.ts).
 */
import * as THREE from 'three';
import type { Season } from '../sim/clock';

export interface SeasonPalette {
  grass: number;
  grassAlt: number;
  wild: number;
  wildAlt: number;
  /** Sun-bleached patches in the grass. */
  dry: number;
  bank: number;
  bed: number;
  water: number;
  waterDeep: number;
  leaf: number;
  leafAlt: number;
  pine: number;
  flower: number[];
}

export const SEASON_PALETTES: Record<Season, SeasonPalette> = {
  spring: { grass: 0x86cf55, grassAlt: 0x9dd963, wild: 0x67b748, wildAlt: 0x7cc452, dry: 0xc9dc7c, bank: 0xa9d77c, bed: 0x6f9db0, water: 0x46b4c4, waterDeep: 0x1f6f98, leaf: 0x7cc95a, leafAlt: 0xf4b6c8, pine: 0x3f8f5a, flower: [0xffd34d, 0xff9fb8, 0xffffff, 0xb59cff] },
  summer: { grass: 0x72bd48, grassAlt: 0x8ac652, wild: 0x58a440, wildAlt: 0x6aae47, dry: 0xc4c766, bank: 0x9ccd6d, bed: 0x6a97a8, water: 0x3fb0bf, waterDeep: 0x1b6893, leaf: 0x5cb548, leafAlt: 0x6fc055, pine: 0x357f4c, flower: [0xffc53d, 0xff7a6b, 0xffffff, 0x8fd3ff] },
  autumn: { grass: 0xa6bf55, grassAlt: 0xbac862, wild: 0x95ab4c, wildAlt: 0xc0a24e, dry: 0xd6b45e, bank: 0xc3c983, bed: 0x6f8f9c, water: 0x48a8b8, waterDeep: 0x23668a, leaf: 0xf0a040, leafAlt: 0xe0673e, pine: 0x3e7d4f, flower: [0xffb13d, 0xd96a3a, 0xfff2c9, 0xc792ff] },
  winter: { grass: 0xe9f1f2, grassAlt: 0xf4f8f9, wild: 0xdfe9ec, wildAlt: 0xe8f0f2, dry: 0xd2dde0, bank: 0xe3edef, bed: 0x7d9cad, water: 0x7fc0d4, waterDeep: 0x467f9e, leaf: 0xdfe9ea, leafAlt: 0xc9d9dc, pine: 0x4f8a6a, flower: [0xffffff, 0xd8ecff, 0xffe7f0, 0xfff2b0] },
};

/** Soil, terrace sides and the diorama's cut-away base (the same all year). */
export const EARTH = {
  lip: 0x8a6a4a,
  soil: 0x9c7552,
  soilDark: 0x7d5a3d,
  rock: 0x8b8378,
  base: 0x6d4f37,
  baseDark: 0x5a412e,
  waterSide: 0x3b86b0,
  /** Worn paths and trodden yards. */
  dirt: 0xb48a5c,
  sand: 0xd8c08a,
  /** The bed under the water. */
  bed: 0x5f7f6a,
  /** The mist over land that isn't open yet. */
  mist: 0xe6eee4,
};

const a = new THREE.Color(), b = new THREE.Color();
/** Mix two hex colours (t = 0 → x, 1 → y). */
export function mixHex(x: number, y: number, t: number): number {
  a.setHex(x); b.setHex(y);
  return a.lerp(b, t).getHex();
}

/** Locked land looks pale and misty until it is unlocked. */
export const LOCKED_MIST = 0xe8efe4;
export const lockedTint = (hex: number) => mixHex(hex, LOCKED_MIST, 0.5);
