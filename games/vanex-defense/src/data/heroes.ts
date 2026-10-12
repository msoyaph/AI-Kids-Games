import { localized } from '../i18n';
import { TUNING, type AbilityId, type AbilityTuning, type HeroId, type HeroTuning } from './tuning';

export type { AbilityId, HeroId };

/** A commander hero: identity + looks here, numbers in TUNING.heroes, text in i18n (`hero.<id>.*`). */
export interface HeroDef extends HeroTuning {
  id: HeroId;
  /** Main armour colour and energy accent. */
  color: number;
  accent: number;
  weapon: 'rifle' | 'hammer' | 'staff' | 'drone';
  /** Free from the start (the others are unlocked with research). */
  starter?: boolean;
  readonly name: string;
  readonly role: string;
  readonly blurb: string;
  readonly special: HeroTuning['special'] & { readonly name: string; readonly desc: string };
}

const IDENTITY: Record<HeroId, Pick<HeroDef, 'color' | 'accent' | 'weapon' | 'starter'>> = {
  vanguard: { color: 0x4f6fa8, accent: 0x3ee6ff, weapon: 'rifle', starter: true },
  warden: { color: 0x9a7a4a, accent: 0xffb347, weapon: 'hammer' },
  seer: { color: 0x5d4a9a, accent: 0xc49bff, weapon: 'staff' },
  engineer: { color: 0x3f8a6a, accent: 0x3dffa0, weapon: 'drone' },
};

export const HERO_IDS = Object.keys(IDENTITY) as HeroId[];

export const HEROES = {} as Record<HeroId, HeroDef>;
for (const id of HERO_IDS) {
  const def = localized({ id, ...IDENTITY[id], ...TUNING.heroes[id] } as HeroDef, `hero.${id}`, ['name', 'role', 'blurb'] as const);
  Object.defineProperty(def, 'special', {
    value: localized({ ...TUNING.heroes[id].special }, `hero.${id}.special`, ['name', 'desc'] as const),
    enumerable: true,
  });
  HEROES[id] = def;
}

/** A commander ability: cooldown power the player triggers (Crystal Meteor, Chrono Field, Emergency Funds). */
export interface AbilityDef extends AbilityTuning {
  id: AbilityId;
  /** Needs a target point on the map. */
  targeted: boolean;
  color: number;
  readonly name: string;
  readonly desc: string;
}

const ABILITY_IDENTITY: Record<AbilityId, Pick<AbilityDef, 'targeted' | 'color'>> = {
  meteor: { targeted: true, color: 0xff7a3d },
  chrono: { targeted: true, color: 0x7fd8ff },
  funds: { targeted: false, color: 0xffc845 },
};

export const ABILITY_IDS = Object.keys(ABILITY_IDENTITY) as AbilityId[];

export const ABILITIES = {} as Record<AbilityId, AbilityDef>;
for (const id of ABILITY_IDS) {
  ABILITIES[id] = localized({ id, ...ABILITY_IDENTITY[id], ...TUNING.abilities[id] } as AbilityDef, `ability.${id}`, ['name', 'desc'] as const);
}
