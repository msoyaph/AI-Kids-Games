export type ElementId = 'fire' | 'water' | 'nature' | 'light' | 'shadow' | 'earth';

export type ElementIcon = 'flame' | 'drop' | 'leaf' | 'star' | 'moon' | 'hex';

export interface ElementDef {
  id: ElementId;
  name: string;
  /** Main colour, light tint and dark outline colour. */
  color: number;
  light: number;
  dark: number;
  /** Distinct shape so colour is never the only cue (colour-blind friendly). */
  icon: ElementIcon;
  /** This element deals bonus damage to creatures of `beats`. */
  beats: ElementId;
  /** Kid-friendly reason, e.g. "Fire burns leaves". */
  why: string;
  blurb: string;
}

export const ELEMENT_ORDER: readonly ElementId[] = ['fire', 'water', 'nature', 'light', 'shadow', 'earth'];

export const ELEMENTS: Record<ElementId, ElementDef> = {
  fire: {
    id: 'fire',
    name: 'Fire',
    color: 0xff6a2b,
    light: 0xffb36b,
    dark: 0x8a2208,
    icon: 'flame',
    beats: 'nature',
    why: 'Fire scorches Nature',
    blurb: 'Splash damage that leaves targets burning. Best against tight groups.',
  },
  water: {
    id: 'water',
    name: 'Water',
    color: 0x2fa8ff,
    light: 0x9be7ff,
    dark: 0x0f4a8a,
    icon: 'drop',
    beats: 'fire',
    why: 'Water quenches Fire',
    blurb: 'Slows enemies down so every other tower gets more shots in.',
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    color: 0x39e07a,
    light: 0xa8ffc6,
    dark: 0x11663a,
    icon: 'leaf',
    beats: 'water',
    why: 'Nature drains Water',
    blurb: 'Stacking poison that ignores armor. Wears down tough targets.',
  },
  light: {
    id: 'light',
    name: 'Light',
    color: 0xffd84a,
    light: 0xfff3b8,
    dark: 0x9a7300,
    icon: 'star',
    beats: 'shadow',
    why: 'Light pierces Shadow',
    blurb: 'Arcs of energy that jump between enemies. Built for swarms.',
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow',
    color: 0xa06bff,
    light: 0xd9c2ff,
    dark: 0x45208f,
    icon: 'moon',
    beats: 'earth',
    why: 'Shadow erodes Earth',
    blurb: 'Cracks armor and lands critical hits, softening targets for the rest of the grid.',
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    color: 0xd9a066,
    light: 0xf5d6a8,
    dark: 0x6a4320,
    icon: 'hex',
    beats: 'light',
    why: 'Earth blots out Light',
    blurb: 'Ground slams that hit everything nearby and can stun.',
  },
};

export const STRONG_MULT = 1.6;
export const WEAK_MULT = 0.6;

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
