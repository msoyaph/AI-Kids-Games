import { localized } from '../i18n';
import { TUNING } from './tuning';

export type ElementId = 'fire' | 'water' | 'nature' | 'light' | 'shadow' | 'earth';

export type ElementIcon = 'flame' | 'drop' | 'leaf' | 'star' | 'moon' | 'hex';

export interface ElementDef {
  id: ElementId;
  /** Translated. */
  readonly name: string;
  /** Main colour, light tint and dark outline colour. */
  color: number;
  light: number;
  dark: number;
  /** Distinct shape so colour is never the only cue (colour-blind friendly). */
  icon: ElementIcon;
  /** This element deals bonus damage to creatures of `beats`. */
  beats: ElementId;
  /** Short reason, e.g. "Water quenches Fire" (translated). */
  readonly why: string;
  readonly blurb: string;
}

export const ELEMENT_ORDER: readonly ElementId[] = ['fire', 'water', 'nature', 'light', 'shadow', 'earth'];

const ELEMENT_BASE: Record<ElementId, Omit<ElementDef, 'name' | 'why' | 'blurb'>> = {
  fire: {
    id: 'fire',
    color: 0xff6a2b,
    light: 0xffb36b,
    dark: 0x8a2208,
    icon: 'flame',
    beats: 'nature',
  },
  water: {
    id: 'water',
    color: 0x2fa8ff,
    light: 0x9be7ff,
    dark: 0x0f4a8a,
    icon: 'drop',
    beats: 'fire',
  },
  nature: {
    id: 'nature',
    color: 0x39e07a,
    light: 0xa8ffc6,
    dark: 0x11663a,
    icon: 'leaf',
    beats: 'water',
  },
  light: {
    id: 'light',
    color: 0xffd84a,
    light: 0xfff3b8,
    dark: 0x9a7300,
    icon: 'star',
    beats: 'shadow',
  },
  shadow: {
    id: 'shadow',
    color: 0xa06bff,
    light: 0xd9c2ff,
    dark: 0x45208f,
    icon: 'moon',
    beats: 'earth',
  },
  earth: {
    id: 'earth',
    color: 0xd9a066,
    light: 0xf5d6a8,
    dark: 0x6a4320,
    icon: 'hex',
    beats: 'light',
  },
};

export const ELEMENTS = {} as Record<ElementId, ElementDef>;
for (const id of ELEMENT_ORDER) ELEMENTS[id] = localized({ ...ELEMENT_BASE[id] } as ElementDef, `element.${id}`, ['name', 'why', 'blurb'] as const);

export const STRONG_MULT = TUNING.combat.strongMult;
export const WEAK_MULT = TUNING.combat.weakMult;

/** Damage multiplier for one attacking element against a creature's element. */
export function elementVs(attack: ElementId, defender: ElementId | null): number {
  if (!defender) return 1;
  if (ELEMENTS[attack].beats === defender) return STRONG_MULT;
  if (ELEMENTS[defender].beats === attack) return WEAK_MULT;
  return 1;
}

/**
 * Multiplier for a tower with 0–2 elements. Neutral (basic) towers are 1×.
 * Combo towers use whichever of their elements works best.
 */
export function elementMultiplier(attack: readonly ElementId[], defender: ElementId | null): number {
  if (attack.length === 0 || !defender) return 1;
  let best = 0;
  for (let i = 0; i < attack.length; i++) {
    const m = elementVs(attack[i]!, defender);
    if (m > best) best = m;
  }
  return best;
}

/** Which element beats the given one (used for hints and shield weaknesses). */
export function counterOf(el: ElementId): ElementId {
  for (const id of ELEMENT_ORDER) if (ELEMENTS[id].beats === el) return id;
  return el;
}
