// Daily weather roll.
import { dayRng } from '../core/rng';
import type { WeatherNeed } from '../data/types';
import type { Game } from './game';
import type { WeatherT } from './state';

export const WEATHER_LABEL: Record<WeatherT, string> = {
  sunny: 'Sunny',
  cloudy: 'Cloudy',
  rain: 'Rain',
  rainbow: 'Rainbow',
};

export function rollWeather(seed: number, day: number): WeatherT {
  if (day <= 1) return 'sunny';
  const r = dayRng(seed, day, 'weather').next();
  if (r < 0.42) return 'sunny';
  if (r < 0.66) return 'cloudy';
  if (r < 0.94) return 'rain';
  return 'rainbow';
}

export function dailyWeather(g: Game): void {
  const s = g.state;
  s.weather = { day: s.clock.day, today: rollWeather(s.seed, s.clock.day) };
}

/** Does the current weather satisfy a creature's requirement? */
export function weatherOk(need: WeatherNeed, w: WeatherT): boolean {
  switch (need) {
    case 'any':
      return true;
    case 'rain':
      return w === 'rain';
    case 'clear':
      return w !== 'rain';
    case 'rainbow':
      return w === 'rainbow';
  }
}
