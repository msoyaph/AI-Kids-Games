/**
 * The eco rating: 0–5 leaves for a green town. Points for trees per person, green park land, solar
 * roofs, recycling that reaches homes, and trips that go by bus, bike or tram instead of by car.
 * City Hall shows each part with a short, real reason why it helps.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { THING } from '../data/things';
import type { Census } from './census';
import type { Town } from './state';
import type { Traffic } from './traffic';

export interface Eco { leaves: number; parts: { id: string; label: string; score: number; why: string }[] }

export function eco(town: Town, c: Census, trips: Traffic | null): Eco {
  const pop = Math.max(1, c.population);
  let trees = 0, green = 0, solar = 0, zoned = 0;
  for (const t of town.things) {
    const d = THING[t.def];
    if (!d) continue;
    if (d.class === 'tree') trees++;
    else if (d.class === 'park') green += d.w * d.d;
    if (d.zone) { zoned++; if (t.solar) solar++; }
  }
  const covered = c.homes.filter(h => c.needs.get(h.id)?.services.recycling).length;
  const moving = trips ? trips.bus + trips.bike + trips.tram : 0, all = trips ? moving + trips.car : 0;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const parts = [
    { id: 'trees', label: 'Trees', score: clamp(trees / (pop / 8 + 4)), why: 'Trees give shade, cool hot streets, clean the air and give birds a home.' },
    { id: 'parks', label: 'Parks', score: clamp(green / (pop / 20 + 4)), why: 'Parks give people a place to play and rain somewhere to soak in.' },
    { id: 'solar', label: 'Solar roofs', score: zoned ? clamp(solar / (zoned * 0.4)) : 0, why: 'Solar panels make power from sunshine. No smoke at all!' },
    { id: 'recycling', label: 'Recycling', score: c.homes.length ? clamp(covered / (c.homes.length * 0.7)) : 0, why: 'Old cans, jars and paper get made into new things. Less goes in the bin.' },
    { id: 'travel', label: 'Buses, bikes and trams', score: all ? clamp((moving / all) / 0.35) : 0, why: 'One bus can take as many people as a whole street of cars. Bikes make no fumes at all.' },
  ];
  const total = parts.reduce((n, p) => n + p.score, 0);
  return { leaves: Math.min(5, Math.floor(total + 0.0001)), parts };
}
