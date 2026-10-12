import type { DecorDef, OutfitDef } from './types';

/** Astronaut outfits (just for fun). */
export const OUTFITS: OutfitDef[] = [
  { id: 'outfit_none', name: 'Plain Suit', desc: 'Your trusty space suit.', price: 0, unlock: { kind: 'start' }, style: 'none' },
  { id: 'outfit_scarf', name: 'Explorer Scarf', desc: 'A cozy red scarf.', price: 40, unlock: { kind: 'start' }, style: 'scarf' },
  { id: 'outfit_cape', name: 'Hero Cape', desc: 'Every hero needs a cape!', price: 90, unlock: { kind: 'chapter', chapter: 2 }, style: 'cape' },
  { id: 'outfit_jetpack', name: 'Jet Pack', desc: 'A shiny orange jet pack.', price: 120, unlock: { kind: 'chapter', chapter: 2 }, style: 'jetpack' },
  { id: 'outfit_stars', name: 'Star Suit', desc: 'Covered in little stars.', price: 150, unlock: { kind: 'chapter', chapter: 3 }, style: 'stars' },
  { id: 'outfit_crown', name: 'Comet Crown', desc: 'A sparkly crown for your helmet.', price: 200, unlock: { kind: 'chapter', chapter: 4 }, style: 'crown' },
  { id: 'outfit_zephyra', name: 'Zephyra Sash', desc: 'A gift style from Zephyra.', price: 160, unlock: { kind: 'chapter', chapter: 5 }, style: 'sash' },
];

/** Decorations for your room at the Academy. */
export const DECOR: DecorDef[] = [
  { id: 'decor_plant', name: 'Space Plant', desc: 'A happy green plant.', price: 30, unlock: { kind: 'start' }, style: 'plant' },
  { id: 'decor_rug', name: 'Star Rug', desc: 'A soft rug shaped like a star.', price: 40, unlock: { kind: 'start' }, style: 'rug' },
  { id: 'decor_telescope', name: 'Telescope', desc: 'Look at the stars up close.', price: 80, unlock: { kind: 'chapter', chapter: 2 }, style: 'telescope' },
  { id: 'decor_model', name: 'Model Rocket', desc: 'A tiny rocket on a stand.', price: 60, unlock: { kind: 'start' }, style: 'model' },
  { id: 'decor_lamp', name: 'Lava Lamp', desc: 'Blobs float up and down.', price: 70, unlock: { kind: 'chapter', chapter: 2 }, style: 'lavalamp' },
  { id: 'decor_mobile', name: 'Planet Mobile', desc: 'Planets that spin above you.', price: 100, unlock: { kind: 'chapter', chapter: 3 }, style: 'mobile' },
  { id: 'decor_plush', name: 'Zibbo Plushie', desc: 'A soft toy of your alien friend.', price: 120, unlock: { kind: 'mission', mission: 'c3_rescue' }, style: 'plush' },
  { id: 'decor_trophy', name: 'Trophy Shelf', desc: 'Show off your cups.', price: 90, unlock: { kind: 'chapter', chapter: 4 }, style: 'trophy' },
  { id: 'decor_beanbag', name: 'Bean Bag', desc: 'A comfy seat for space naps.', price: 50, unlock: { kind: 'start' }, style: 'beanbag' },
  { id: 'decor_globe', name: 'Moon Globe', desc: 'A glowing Moon on a stand.', price: 110, unlock: { kind: 'chapter', chapter: 3 }, style: 'globe' },
];

export const OUTFIT_BY_ID: Record<string, OutfitDef> = Object.fromEntries(OUTFITS.map((o) => [o.id, o]));
export const DECOR_BY_ID: Record<string, DecorDef> = Object.fromEntries(DECOR.map((d) => [d.id, d]));
