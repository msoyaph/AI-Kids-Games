import { PART_BY_ID } from '../data/parts';
import { STAT_KEYS, type Difficulty, type PartSlot, type RocketLoadout, type StatKey } from '../data/types';
import { tuning } from './difficulty';

export type Stats = Record<StatKey, number>;

const FUNCTIONAL: PartSlot[] = ['nose', 'body', 'engine', 'fins', 'tank', 'cargo'];

export function statTotals(loadout: RocketLoadout): Stats {
  const out: Stats = { speed: 0, fuel: 0, cargo: 0, shield: 0 };
  for (const slot of FUNCTIONAL) {
    const part = PART_BY_ID[loadout[slot] as string];
    if (!part) continue;
    for (const k of STAT_KEYS) out[k] += part.stats[k] ?? 0;
  }
  return out;
}

/** Turn a stat total into 0.5-5 stars (half-star steps, so every part point shows). */
export function toStars(total: number): number {
  return Math.max(0.5, Math.min(5, total / 2));
}

export function statStars(loadout: RocketLoadout): Stats {
  const t = statTotals(loadout);
  return { speed: toStars(t.speed), fuel: toStars(t.fuel), cargo: toStars(t.cargo), shield: toStars(t.shield) };
}

/** Stars a loadout would have if one part were swapped (for the hangar's "before/after" preview). */
export function starsWith(loadout: RocketLoadout, slot: PartSlot, partId: string): Stats {
  return statStars({ ...loadout, [slot]: partId });
}

export interface FlightParams {
  accel: number;
  maxSpeed: number;
  damping: number;
  boostAccel: number;
  boostSpeed: number;
  boostTime: number;
  boostCooldown: number;
  boostFuel: number;
  /** Fuel per second at full thrust. */
  fuelPerSec: number;
  maxFuel: number;
  maxShield: number;
  bumpShield: number;
  bumpFuel: number;
  magnetRadius: number;
  /** How many haul items (like ice chunks) fit in the cargo bay. */
  cargoCapacity: number;
  assist: number;
  turnRate: number;
  shipRadius: number;
}

export function flightParams(loadout: RocketLoadout, difficulty: Difficulty): FlightParams {
  const s = statStars(loadout);
  const d = tuning(difficulty);
  return {
    accel: 640 + 60 * s.speed,
    maxSpeed: 350 + 40 * s.speed,
    damping: d.damping,
    boostAccel: 1.9,
    boostSpeed: 1.65,
    boostTime: 1.1,
    boostCooldown: 0.6,
    boostFuel: 7 * d.fuelUse,
    fuelPerSec: 1.6 * d.fuelUse,
    maxFuel: 90 + 30 * s.fuel,
    maxShield: 2 + Math.ceil(s.shield),
    bumpShield: d.bumpShield,
    bumpFuel: d.bumpFuel,
    magnetRadius: 60 + 25 * s.cargo + d.magnetBonus,
    cargoCapacity: 2 + Math.floor(s.cargo),
    assist: d.assist,
    turnRate: 9,
    shipRadius: 34,
  };
}
