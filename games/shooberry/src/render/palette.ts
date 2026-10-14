// The Meadow Picnic palette: bright and saturated, with rich dark soil so every character's bright
// fill stands out from it (3:1 or more), and a dark outline that separates them from the grass.
// tests/unit/squint.test.ts checks these numbers. Our own colours, chosen for this garden.

export const PALETTE = {
  /** Outlines around characters and props. */
  outline: 0x2b1910,
  /** Soil in the beds: columns alternate light and dark, so the grid reads at a glance. */
  soilLight: 0x7d4a2b,
  soilDark: 0x56301a,
  /** Grass between and around the beds. */
  grass: 0x5cbc3c,
  grassLight: 0x86dc58,
  grassDark: 0x3d9a2a,
  /** The beds' wooden frames. */
  wood: 0xf0ae5e,
  woodDark: 0xc07a3a,
  /** Sky and clouds behind the garden. */
  skyTop: 0x3fa9f5,
  skyLow: 0xaee3ff,
  cloud: 0xffffff,
  cloudShade: 0xcfe7ff,
} as const;

/** WCAG relative luminance of an sRGB hex colour. */
export function luminance(hex: number) {
  const ch = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch((hex >> 16) & 255) + 0.7152 * ch((hex >> 8) & 255) + 0.0722 * ch(hex & 255);
}

/** WCAG contrast ratio between two colours (1 to 21). */
export function contrast(a: number, b: number) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Hue in degrees (0–360) of an sRGB hex colour. */
export function hue(hex: number) {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
