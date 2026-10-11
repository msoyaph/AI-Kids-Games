import type { CSSProperties } from 'react';
export type IconName = 'search' | 'heart' | 'play' | 'arrow' | 'back' | 'sun' | 'moon' | 'shield' | 'spark' | 'grid' | 'home' | 'close' | 'expand' | 'shrink' | 'computer' | 'phone' | 'gamepad' | 'leaf' | 'bolt' | 'compass' | 'clock' | 'check' | 'chevron';
const paths: Record<IconName,string> = {
  search: 'M21 21l-5-5M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  play: 'M8 4l12 8-12 8Z',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  back: 'M20 12H5m6-6-6 6 6 6',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
  moon: 'M21 13.2A9 9 0 1 1 10.8 3 7 7 0 0 0 21 13.2Z',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6',
  spark: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
  home: 'm3 11 9-8 9 8v10h-6v-7H9v7H3Z',
  close: 'm6 6 12 12M6 18 18 6',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  shrink: 'M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5',
  computer: 'M3 3h18v13H3Zm9 13v5m-5 0h10',
  phone: 'M7 2h10v20H7Zm4 16h2',
  gamepad: 'M7 7h10l4 4 1 8-3 1-4-4H9l-4 4-3-1 1-8ZM6 11v5m-2.5-2.5h5M16 11h.1m3 3h.1',
  leaf: 'M20 3c-12-1-18 6-15 13s16 6 15-13ZM3 21 15 9',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-8Z',
  compass: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm5 5-3 7-7 3 3-7Z',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 4v5l3 2',
  check: 'm5 12 4 4 10-10',
  chevron: 'm9 5 7 7-7 7'
};
export function Icon({ name, size = 22, filled = false, style }: { name: IconName; size?: number; filled?: boolean; style?: CSSProperties }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name]} /></svg>;
}
