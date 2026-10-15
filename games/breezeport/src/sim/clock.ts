/**
 * (Adapted from games/fieldlark/src/sim/clock.ts: the same day, a 5-day season.)
 * Town time. It is counted in seconds of play (`t`) and only moves while the town is on screen and
 * the player is playing: menus, dialogue, a hidden tab and the pause menu all stop it. Nothing here
 * reads the real clock.
 *
 * One day is 8 minutes of play: dawn, a long day, dusk, then a short lantern-lit night. A season
 * is 5 days (40 minutes), so a year of four seasons is 2 hours 40 minutes of play.
 */

export const DAY_SEC = 480;
export const SEASON_DAYS = 5;
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

/** A new town starts on the first morning of spring, just after dawn. */
export const START_T = DAY_SEC * 0.1;

export const dayIndex = (t: number) => Math.floor(t / DAY_SEC);
/** 0..1 through the current day. */
export const dayFrac = (t: number) => (t - dayIndex(t) * DAY_SEC) / DAY_SEC;
/** 1-based day within the season. */
export const dayOfSeason = (t: number) => (dayIndex(t) % SEASON_DAYS) + 1;
export const seasonIndex = (t: number) => Math.floor(dayIndex(t) / SEASON_DAYS) % SEASONS.length;
export const seasonOf = (t: number): Season => SEASONS[seasonIndex(t)]!;
export const yearOf = (t: number) => Math.floor(dayIndex(t) / (SEASON_DAYS * SEASONS.length)) + 1;
/** How many seasons have begun since the town was founded (0 in the first spring). */
export const seasonCount = (t: number) => Math.floor(dayIndex(t) / SEASON_DAYS);

export type DayPart = 'dawn' | 'day' | 'dusk' | 'night';
/** Parts of the day, as fractions: dawn 0–0.08, day –0.74, dusk –0.9, night –1. */
export const DAY_PARTS: readonly { part: DayPart; from: number }[] = [
  { part: 'dawn', from: 0 },
  { part: 'day', from: 0.08 },
  { part: 'dusk', from: 0.74 },
  { part: 'night', from: 0.9 },
];

export function dayPart(t: number): DayPart {
  const f = dayFrac(t);
  let part: DayPart = 'dawn';
  for (const p of DAY_PARTS) if (f >= p.from) part = p.part;
  return part;
}

/**
 * How much evening light to show, 0 (full day) to 1 (night), easing in through dusk and out through
 * dawn. The lighting and the music read it; it never jumps.
 */
export function duskAmount(t: number): number {
  const f = dayFrac(t);
  const smooth = (a: number) => a * a * (3 - 2 * a);
  if (f < 0.08) return 1 - smooth(f / 0.08) * 1; // dawn: night → day
  if (f < 0.74) return 0;
  if (f < 0.9) return smooth((f - 0.74) / 0.16);
  return 1;
}

const SEASON_NAMES: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
export const seasonName = (s: Season) => SEASON_NAMES[s];

/** "Spring, day 3" (and the year from the second year on). */
export function dateLabel(t: number): string {
  const y = yearOf(t);
  return `${seasonName(seasonOf(t))}, day ${dayOfSeason(t)}${y > 1 ? ` · Year ${y}` : ''}`;
}

/** Minutes and seconds of play, for timers ("2:05"). Under a minute it is just seconds ("45s"). */
export function playTimeLabel(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
