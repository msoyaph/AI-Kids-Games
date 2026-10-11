// Accelerated in-game clock: one in-game day ~= 15 real minutes.
export const REAL_SECONDS_PER_DAY = 900;
export const MINUTES_PER_DAY = 1440;
export const GAME_MIN_PER_SEC = MINUTES_PER_DAY / REAL_SECONDS_PER_DAY;
export const WAKE_MINUTE = 6 * 60;

export type DayPhase = 'morning' | 'day' | 'evening' | 'night';

export function phaseOf(minute: number): DayPhase {
  const h = minute / 60;
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 20.5) return 'evening';
  return 'night';
}

export function hourOf(minute: number): number {
  return Math.floor(minute / 60) % 24;
}

/** Does hour h fall into [start,end) where the window may wrap past midnight. */
export function hourInWindow(h: number, start: number, end: number): boolean {
  if (start === end) return true;
  if (start < end) return h >= start && h < end;
  return h >= start || h < end;
}

export function formatTime(minute: number): string {
  const m = Math.floor(minute) % MINUTES_PER_DAY;
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

/** Advance the clock. Returns number of day boundaries crossed. */
export function advanceClock(clock: { day: number; minute: number }, dtSec: number): number {
  clock.minute += dtSec * GAME_MIN_PER_SEC;
  let crossed = 0;
  while (clock.minute >= MINUTES_PER_DAY) {
    clock.minute -= MINUTES_PER_DAY;
    clock.day += 1;
    crossed++;
  }
  return crossed;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function weekdayOf(day: number): string {
  return WEEKDAYS[(day + 1) % 7]!;
}
