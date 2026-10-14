/**
 * Rain. Some days are rainy (never in winter: winter days are snowy or clear, and snow doesn't water
 * anything). On a rainy day it rains through the middle of the day, and every growing field gets
 * watered. Which days rain comes from the farm's seed, so it is the same after a reload.
 */
import { noise } from '../core/rng';
import { TUNING } from '../data/tuning';
import { DAY_SEC, dayFrac, dayIndex, seasonOf } from './clock';

export function rainyDay(seed: number, day: number): boolean {
  // the very first day is always dry, so the first lesson is watering by hand
  if (day === 0) return false;
  const t = day * DAY_SEC + 1;
  if (seasonOf(t) === 'winter') return false;
  return noise(seed, day, 911) < TUNING.rainChance;
}

/** Is it raining right now? */
export function raining(seed: number, t: number): boolean {
  const f = dayFrac(t);
  return f >= TUNING.rainFrom && f < TUNING.rainTo && rainyDay(seed, dayIndex(t));
}

/** Snow falls on some winter days (only a look; it never hurts anything). */
export function snowing(seed: number, t: number): boolean {
  if (seasonOf(t) !== 'winter') return false;
  const f = dayFrac(t);
  return f >= TUNING.rainFrom && f < TUNING.rainTo && noise(seed, dayIndex(t), 912) < 0.4;
}
