/** Seeded daily weather. Festivals and the first two days are fixed for a gentle start. */
import { hash32, Rng } from '../core/rng';
import { TUNING } from '../tuning';
import { seasonOf, type Weather } from './state';

/** Days (absolute within a year, 0..39) where weather is fixed. */
const FIXED: Record<number, Weather> = { 0: 'sun', 1: 'sun', 2: 'rain' };

export function rollWeather(seed: number, day: number, isFestival: (day: number) => boolean): Weather {
  const dy = day % 40;
  if (day < 40 && FIXED[dy]) return FIXED[dy];
  if (isFestival(day)) return 'sun';
  const s = seasonOf(day);
  const r = new Rng(hash32(seed, day, 0x77ea));
  const x = r.next();
  if (s === 3) {
    if (x < TUNING.snowChance[3]) return 'snow';
    return x < TUNING.snowChance[3] + TUNING.windChance[3] ? 'wind' : 'sun';
  }
  let acc = TUNING.stormChance[s];
  if (x < acc) return 'storm';
  acc += TUNING.rainChance[s];
  if (x < acc) return 'rain';
  acc += TUNING.windChance[s];
  if (x < acc) return 'wind';
  return 'sun';
}

export const isWet = (w: Weather): boolean => w === 'rain' || w === 'storm';
