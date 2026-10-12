import { TUNING, type ModifierId, type MutatorId } from './tuning';
import { CAMPAIGN_MAPS } from './maps';
import type { MapDef } from './maps/types';
import { hashString, Rng } from '../core/rng';

export type { ModifierId, MutatorId };

export const MODIFIER_IDS: ModifierId[] = ['iron', 'pure', 'budget', 'nocombo', 'speed'];
export const MUTATOR_IDS: MutatorId[] = ['armored', 'swift', 'barrier', 'regen', 'elite', 'cloak', 'splinter'];

/** Today's date key (local time) for the daily challenge. */
export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface DailyDef {
  date: string;
  seed: number;
  map: MapDef;
  modifiers: ModifierId[];
  mutators: MutatorId[];
  waves: number;
}

/** The same challenge for everyone on a given day (it's generated, never downloaded). */
export function dailyFor(date: string): DailyDef {
  const seed = hashString(`vanex-daily-${date}`);
  const rng = new Rng(seed);
  const map = CAMPAIGN_MAPS[rng.int(0, CAMPAIGN_MAPS.length - 1)]!;
  const D = TUNING.daily;
  // the daily never uses the brutal modifiers (one life, one element)
  const mods = rng.shuffle(MODIFIER_IDS.filter((m) => m !== 'iron' && m !== 'pure')).slice(0, D.modifiers);
  const muts = rng.shuffle(MUTATOR_IDS.slice()).slice(0, D.mutators);
  return { date, seed, map, modifiers: mods, mutators: muts, waves: D.waves };
}

/** Daily score: waves cleared, lives kept and a win bonus. */
export function dailyScore(wavesCleared: number, lives: number, won: boolean): number {
  const S = TUNING.daily.score;
  return wavesCleared * S.wave + lives * S.life + (won ? S.win : 0);
}
