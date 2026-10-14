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
  spring: { grass: 0x8fd16a, grassAlt: 0x9ad874, wild: 0x6fbf5b, wildAlt: 0x79c862, bank: 0xa9d77c, bed: 0x6f9db0, water: 0x5cc2e0, waterDeep: 0x3f9fc7, leaf: 0x7cc95a, leafAlt: 0xf4b6c8, pine: 0x3f8f5a, flower: [0xffd34d, 0xff9fb8, 0xffffff, 0xb59cff] },
  summer: { grass: 0x7ccb57, grassAlt: 0x86d260, wild: 0x5eb44c, wildAlt: 0x68bc52, bank: 0x9ccd6d, bed: 0x6a97a8, water: 0x4fbde0, waterDeep: 0x3597c4, leaf: 0x5cb548, leafAlt: 0x6fc055, pine: 0x357f4c, flower: [0xffc53d, 0xff7a6b, 0xffffff, 0x8fd3ff] },
  autumn: { grass: 0xb5c76a, grassAlt: 0xbfce73, wild: 0xa3b85d, wildAlt: 0xc9b25e, bank: 0xc3c983, bed: 0x6f8f9c, water: 0x58b2cf, waterDeep: 0x3d8eb6, leaf: 0xf0a040, leafAlt: 0xe0673e, pine: 0x3e7d4f, flower: [0xffb13d, 0xd96a3a, 0xfff2c9, 0xc792ff] },
  winter: { grass: 0xe9f1f2, grassAlt: 0xf2f7f8, wild: 0xdde9ec, wildAlt: 0xe6eff1, bank: 0xe3edef, bed: 0x7d9cad, water: 0x8ccbe0, waterDeep: 0x6aaecb, leaf: 0xdfe9ea, leafAlt: 0xc9d9dc, pine: 0x4f8a6a, flower: [0xffffff, 0xd8ecff, 0xffe7f0, 0xfff2b0] },
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
