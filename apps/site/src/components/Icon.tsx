import type { CSSProperties } from 'react';
export type IconName = 'search' | 'heart' | 'play' | 'pause' | 'back' | 'next' | 'sun' | 'moon' | 'shield' | 'grid' | 'home' | 'close' | 'expand' | 'shrink' | 'computer' | 'tablet' | 'phone' | 'gamepad' | 'keyboard' | 'mouse' | 'touch' | 'clock' | 'check' | 'chevron' | 'age' | 'lock' | 'more' | 'share' | 'add';
const paths: Record<IconName,string> = {
  search: 'M21 21l-5-5M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  play: 'M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z',
  pause: 'M8 5v14M16 5v14',
  back: 'M20 12H5m6-6-6 6 6 6',
  next: 'M4 12h15m-6-6 6 6-6 6',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
  moon: 'M21 13.2A9 9 0 1 1 10.8 3 7 7 0 0 0 21 13.2Z',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6',
  grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
  home: 'm3 11 9-8 9 8v10h-6v-7H9v7H3Z',
  close: 'm6 6 12 12M6 18 18 6',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  shrink: 'M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5',
  computer: 'M3 4h18v12H3Zm9 12v4m-5 0h10',
  tablet: 'M5 3h14v18H5Zm6 15h2',
  phone: 'M7 2h10v20H7Zm4 16h2',
  gamepad: 'M7 7h10a5 5 0 0 1 4.9 6l-.7 3.5a2.5 2.5 0 0 1-4.2 1.2L14.5 15h-5L7 17.7a2.5 2.5 0 0 1-4.2-1.2L2.1 13A5 5 0 0 1 7 7Zm0 3v4m-2-2h4m6.5-1h.01M17.5 13h.01',
  keyboard: 'M2 6h20v12H2Zm4 4h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10',
  mouse: 'M12 2a6 6 0 0 1 6 6v8a6 6 0 0 1-12 0V8a6 6 0 0 1 6-6Zm0 4v4',
  touch: 'M9 11V4.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v1m0 0a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.6-2.2L4 16.6a1.6 1.6 0 0 1 2.4-2.1L9 17',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 4v5l3 2',
  check: 'm5 12 4 4 10-10',
  chevron: 'm9 5 7 7-7 7',
  age: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01',
  lock: 'M6 11h12v10H6Zm3 0V7a3 3 0 0 1 6 0v4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  share: 'M12 3v12m-4-8 4-4 4 4M7 11H5v10h14V11h-2',
  add: 'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm6 5v8m-4-4h8'
};
export function Icon({ name, size = 22, filled = false, style }: { name: IconName; size?: number; filled?: boolean; style?: CSSProperties }) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name]} /></svg>;
}
/** The site mark: a friendly gamepad. Uses the text color, so it follows light and dark mode. */
export function Mark() {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="currentColor"/><path d="M13.5 14h13a6 6 0 0 1 5.9 7.1l-.8 4.1a2.8 2.8 0 0 1-4.7 1.4L24 24h-8l-2.9 2.6a2.8 2.8 0 0 1-4.7-1.4l-.8-4.1A6 6 0 0 1 13.5 14Z" fill="var(--paper)"/><path d="M13 17.5v4.5M10.8 19.8h4.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><circle cx="25" cy="18.6" r="1.6" fill="currentColor"/><circle cx="28.2" cy="21.6" r="1.6" fill="currentColor"/></svg>;
}
