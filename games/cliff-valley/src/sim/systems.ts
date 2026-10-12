/**
 * System registry. Each gameplay module registers hooks; the Sim calls them in order.
 * Keeps sim.ts small and lets content systems stay independent and testable.
 */
import type { Sim } from './sim';

export interface DayReport {
  /** the day that just ended */
  day: number;
  shipped: { id: string; n: number; q: number; v: number }[];
  total: number;
  levelUps: { skill: string; level: number }[];
  notes: string[];
  passedOut: boolean;
}

export interface System {
  id: string;
  /** overnight processing, in registration order */
  endDay?(sim: Sim, r: DayReport): void;
  /** morning setup of the new day */
  startDay?(sim: Sim): void;
  /** every 10 game minutes; `min` is the tick's minute of the day */
  tick?(sim: Sim, min: number): void;
}

export const SYSTEMS: System[] = [];

export function registerSystem(s: System): void {
  const i = SYSTEMS.findIndex((x) => x.id === s.id);
  if (i >= 0) SYSTEMS[i] = s;
  else SYSTEMS.push(s);
}
