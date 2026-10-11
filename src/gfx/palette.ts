/** The Space Sky color palette: bright, bold cartoon colors with a deep-purple ink outline. */
export const C = {
  ink: '#20124d',
  inkSoft: '#3a2a7a',
  night: '#140d3a',
  space1: '#1d1456',
  space2: '#2b1d78',
  white: '#f4f7ff',
  cream: '#fff6e0',
  red: '#ff5d73',
  orange: '#ff9f43',
  yellow: '#ffe066',
  gold: '#ffc83d',
  lime: '#8cff66',
  green: '#2ed47a',
  teal: '#2de0c7',
  cyan: '#4dd4ff',
  blue: '#4c7dff',
  navy: '#2a3f9e',
  purple: '#9b6bff',
  violet: '#6b3fd4',
  pink: '#ff7ad9',
  brown: '#b5764a',
  tan: '#e0b583',
  gray: '#9aa4c7',
  steel: '#c9d2ee',
  dark: '#4a4e6e',
} as const;

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb color. amt in [-1, 1]. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt >= 0) {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  } else {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  }
  return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
}

/** #rrggbb + alpha -> rgba() string. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** #rrggbb -> 0xRRGGBB number for Pixi tints. */
export function hexNum(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

/** Mix two #rrggbb colors. */
export function mix(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const r = Math.round(((na >> 16) & 255) * (1 - t) + ((nb >> 16) & 255) * t);
  const g = Math.round(((na >> 8) & 255) * (1 - t) + ((nb >> 8) & 255) * t);
  const bl = Math.round((na & 255) * (1 - t) + (nb & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
