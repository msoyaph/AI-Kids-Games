import type { GameEventType } from '../systems/events';

/**
 * Story triggers: small moments that play a short dialogue the first time something happens
 * (e.g. first time near Saturn). Pure data; see systems/triggers.ts.
 */
export interface TriggerDef {
  id: string;
  on: GameEventType;
  /** Optional match fields (body, system, area, npc, place). */
  body?: string;
  system?: string;
  area?: string;
  /** Only while this flag is set / not set. */
  flag?: string;
  notFlag?: string;
  dialogue: string;
}

export const TRIGGERS: TriggerDef[] = [
  { id: 'first_bump', on: 'bump', dialogue: 'tr_first_bump' },
  { id: 'first_tow', on: 'tow', dialogue: 'tr_first_tow' },
  { id: 'first_comet', on: 'comet', dialogue: 'tr_first_comet' },
  { id: 'first_slingshot', on: 'slingshot', dialogue: 'tr_first_slingshot' },
  { id: 'belt_arrive', on: 'arrive', system: 'belt', dialogue: 'tr_belt' },
  { id: 'saturn_near', on: 'near', body: 'saturn', flag: 'zibboJoined', dialogue: 'tr_saturn' },
  { id: 'neptune_arrive', on: 'arrive', system: 'neptune', dialogue: 'tr_neptune' },
  { id: 'sun_near', on: 'arrive', system: 'mercury', dialogue: 'tr_sun' },
  { id: 'jupiter_near', on: 'near', body: 'jupiter', dialogue: 'tr_jupiter' },
  { id: 'pluto_near', on: 'near', body: 'pluto', dialogue: 'tr_pluto' },
  { id: 'zephyra_arrive', on: 'arrive', system: 'zephyra', dialogue: 'tr_zephyra' },
  { id: 'mars_land', on: 'land', body: 'mars', dialogue: 'tr_mars' },
];
