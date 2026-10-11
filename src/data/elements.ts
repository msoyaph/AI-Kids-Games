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
    light: 0xffc15e,
    dark: 0x9c2a0c,
    icon: 'flame',
    beats: 'nature',
    why: 'Fire burns leaves',
    blurb: 'Hot and bouncy! Fire towers splash and make creatures toasty.',
  },
  water: {
    id: 'water',
    name: 'Water',
    color: 0x2f9bff,
    light: 0x9fe0ff,
    dark: 0x134f9e,
    icon: 'drop',
    beats: 'fire',
    why: 'Water puts out fire',
    blurb: 'Splishy splashy! Water towers slow creatures down with bubbles.',
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    color: 0x3fcf4f,
    light: 0xb6f58a,
    dark: 0x17702a,
    icon: 'leaf',
    beats: 'water',
    why: 'Plants drink water',
    blurb: 'Leafy and sneaky! Nature towers make creatures itchy over time.',
  },
  light: {
    id: 'light',
    name: 'Light',
    color: 0xffd52e,
    light: 0xfff6b0,
    dark: 0xa77c00,
    icon: 'star',
    beats: 'shadow',
    why: 'Light chases away shadows',
    blurb: 'Bright and zappy! Light towers bounce from creature to creature.',
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow',
    color: 0x9b5cff,
    light: 0xd6b8ff,
    dark: 0x4a1f9e,
    icon: 'moon',
    beats: 'earth',
    why: 'Shadows sneak through rock cracks',
    blurb: 'Spooky-cute! Shadow towers crack armor so others hit harder.',
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    color: 0xc0864a,
    light: 0xf0cf98,
    dark: 0x6b4420,
    icon: 'hex',
    beats: 'light',
    why: 'Rocks block the light',
    blurb: 'Big and stompy! Earth towers shake the ground and stun creatures.',
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
