// The five worlds' looks: ground, soil, light and backdrop. Soil stays the same rich, dark tones in
// every world (so the characters' 3:1 contrast holds everywhere); what changes is the ground around
// the beds, the light and the backdrop. All our own designs.
import type { WorldId } from '../data/roster';

export interface Theme {
  id: WorldId;
  /** Ground around the beds (top, lighter patches, edge). */
  ground: number;
  groundLight: number;
  groundEdge: number;
  /** The slab's sides, top to bottom. */
  side: [number, number];
  soilLight: number;
  soilDark: number;
  wood: number;
  woodDark: number;
  skyTop: number;
  skyLow: number;
  /** Key light and fill. */
  sun: number;
  sunIntensity: number;
  fillSky: number;
  fillGround: number;
  fillIntensity: number;
  rim: number;
  /** Decorations scattered around the beds. */
  decor: 'meadow' | 'greenhouse' | 'dusk' | 'desert' | 'cloud';
}

export const THEMES: Record<WorldId, Theme> = {
  meadow: {
    id: 'meadow', ground: 0x5cbc3c, groundLight: 0x86dc58, groundEdge: 0x3d9a2a, side: [0x8a5432, 0x6e4024],
    soilLight: 0x7d4a2b, soilDark: 0x56301a, wood: 0xf0ae5e, woodDark: 0xc07a3a, skyTop: 0x3fa9f5, skyLow: 0xaee3ff,
    sun: 0xfff1d8, sunIntensity: 2.5, fillSky: 0xe6f6ff, fillGround: 0x7fae4e, fillIntensity: 1.0, rim: 0xfff4d8, decor: 'meadow',
  },
  greenhouse: {
    id: 'greenhouse', ground: 0xd8d2c4, groundLight: 0xe8e2d4, groundEdge: 0xb9b1a0, side: [0xc96f45, 0x9c4f2e],
    soilLight: 0x7d4a2b, soilDark: 0x56301a, wood: 0xf3f0e8, woodDark: 0xcfc8b8, skyTop: 0x9fdcf0, skyLow: 0xe8f8f2,
    sun: 0xfffaf0, sunIntensity: 2.3, fillSky: 0xf2fff8, fillGround: 0xb8c8a8, fillIntensity: 1.15, rim: 0xffffff, decor: 'greenhouse',
  },
  dusk: {
    id: 'dusk', ground: 0x4fa34a, groundLight: 0x6cbc58, groundEdge: 0x2f7a36, side: [0x7a4a2e, 0x5a321e],
    soilLight: 0x7d4a2b, soilDark: 0x56301a, wood: 0xe8a060, woodDark: 0xb06a34, skyTop: 0x5a4aa8, skyLow: 0xffa070,
    sun: 0xffc890, sunIntensity: 2.4, fillSky: 0xb8a8f0, fillGround: 0x6a7a4a, fillIntensity: 1.05, rim: 0xffb070, decor: 'dusk',
  },
  desert: {
    id: 'desert', ground: 0xe9c98f, groundLight: 0xf3dcaa, groundEdge: 0xc9a46a, side: [0xc97a4a, 0xa05a32],
    soilLight: 0x7d4a2b, soilDark: 0x56301a, wood: 0xe0a070, woodDark: 0xb07040, skyTop: 0x4fb4f0, skyLow: 0xffe8c0,
    sun: 0xfff0d0, sunIntensity: 2.5, fillSky: 0xfff4e0, fillGround: 0xc9a46a, fillIntensity: 1.05, rim: 0xffe0b0, decor: 'desert',
  },
  cloud: {
    id: 'cloud', ground: 0x8fe06a, groundLight: 0xb0ec8a, groundEdge: 0xffffff, side: [0xffffff, 0xdfeaf8],
    soilLight: 0x7d4a2b, soilDark: 0x56301a, wood: 0xf6c97a, woodDark: 0xd8a050, skyTop: 0x8fc8ff, skyLow: 0xffe4f4,
    sun: 0xfff6ea, sunIntensity: 2.4, fillSky: 0xf4f0ff, fillGround: 0xc8e8b0, fillIntensity: 1.15, rim: 0xfff0ff, decor: 'cloud',
  },
};
