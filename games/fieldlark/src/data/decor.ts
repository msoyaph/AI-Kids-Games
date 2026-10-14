/**
 * Decorations, paths and fences for build mode, and the land you can open. Each decoration adds to
 * the farm's beauty rating. The everyday ones are bought with coins; decoration sets are earned
 * through play (fair rosettes, chapters, neighbours) and are free to place once earned.
 */

export interface DecorDef {
  id: string;
  name: string;
  w: number;
  d: number;
  /** Coins (0 for earned set pieces). */
  cost: number;
  level: number;
  beauty: number;
  /** Earned sets: which set (unlocked by a flag `set:<name>`). */
  set?: string;
  /** Painted by dragging, like fences and flower beds. */
  paint?: boolean;
  height: number;
  /** Only from this chapter (0-based) of the story on. */
  chapter?: number;
}

export const DECOR: readonly DecorDef[] = [
  // painted by dragging
  { id: 'fence', name: 'Wooden Fence', w: 1, d: 1, cost: 4, level: 2, beauty: 1, paint: true, height: 0.4 },
  { id: 'picket', name: 'Picket Fence', w: 1, d: 1, cost: 8, level: 6, beauty: 2, paint: true, height: 0.45 },
  { id: 'hedge', name: 'Hedge', w: 1, d: 1, cost: 10, level: 9, beauty: 2, paint: true, height: 0.55 },
  { id: 'flowers_sun', name: 'Sunny Flower Bed', w: 1, d: 1, cost: 6, level: 2, beauty: 2, paint: true, height: 0.3 },
  { id: 'flowers_rose', name: 'Pink Flower Bed', w: 1, d: 1, cost: 6, level: 3, beauty: 2, paint: true, height: 0.3 },
  { id: 'flowers_sky', name: 'Blue Flower Bed', w: 1, d: 1, cost: 8, level: 5, beauty: 2, paint: true, height: 0.3 },
  { id: 'flowers_mix', name: 'Wildflower Bed', w: 1, d: 1, cost: 10, level: 8, beauty: 3, paint: true, height: 0.3 },
  // everyday decorations
  { id: 'bench', name: 'Garden Bench', w: 1, d: 1, cost: 40, level: 2, beauty: 4, height: 0.5 },
  { id: 'lamp', name: 'Lamp Post', w: 1, d: 1, cost: 50, level: 3, beauty: 4, height: 1.4 },
  { id: 'scarecrow', name: 'Scarecrow', w: 1, d: 1, cost: 60, level: 3, beauty: 5, height: 1.3 },
  { id: 'haybale', name: 'Hay Bales', w: 1, d: 1, cost: 25, level: 2, beauty: 2, height: 0.5 },
  { id: 'wheelbarrow', name: 'Wheelbarrow', w: 1, d: 1, cost: 35, level: 4, beauty: 3, height: 0.5 },
  { id: 'birdbath', name: 'Bird Bath', w: 1, d: 1, cost: 70, level: 6, beauty: 6, height: 0.7 },
  { id: 'barrel', name: 'Barrel Planter', w: 1, d: 1, cost: 45, level: 5, beauty: 4, height: 0.6 },
  { id: 'well', name: 'Wishing Well', w: 1, d: 1, cost: 160, level: 10, beauty: 10, height: 1.3 },
  { id: 'gazebo', name: 'Garden Gazebo', w: 2, d: 2, cost: 400, level: 14, beauty: 22, height: 2.0 },
  // irrigation (src/sim/water.ts): works on or beside a wet channel
  { id: 'sprinkler', name: 'Sprinkler', w: 1, d: 1, cost: 80, level: 1, beauty: 1, height: 0.5, chapter: 4 },
  // earned sets
  { id: 'bunting', name: 'Fair Bunting', w: 1, d: 1, cost: 0, level: 1, beauty: 6, set: 'fair', height: 1.6 },
  { id: 'ribbonarch', name: 'Ribbon Arch', w: 1, d: 1, cost: 0, level: 1, beauty: 10, set: 'fair', height: 1.7 },
  { id: 'prizestand', name: 'Prize Stand', w: 1, d: 1, cost: 0, level: 1, beauty: 8, set: 'fair', height: 1.0 },
  { id: 'ribbonwall', name: 'Ribbon Wall', w: 1, d: 1, cost: 0, level: 1, beauty: 6, set: 'ribbons', height: 1.1 },
  { id: 'rosearch', name: 'Rose Arch', w: 1, d: 1, cost: 0, level: 1, beauty: 10, set: 'garden', height: 1.7 },
  { id: 'topiary', name: 'Topiary Bird', w: 1, d: 1, cost: 0, level: 1, beauty: 8, set: 'garden', height: 1.2 },
  { id: 'sundial', name: 'Sundial', w: 1, d: 1, cost: 0, level: 1, beauty: 8, set: 'garden', height: 0.8 },
  { id: 'windpump', name: 'Wind Pump', w: 1, d: 1, cost: 0, level: 1, beauty: 12, set: 'country', height: 2.6 },
  { id: 'cart', name: 'Old Farm Cart', w: 2, d: 1, cost: 0, level: 1, beauty: 10, set: 'country', height: 0.9 },
  { id: 'milkcans', name: 'Milk Cans', w: 1, d: 1, cost: 0, level: 1, beauty: 6, set: 'country', height: 0.6 },
  { id: 'duckstatue', name: 'Duck Statue', w: 1, d: 1, cost: 0, level: 1, beauty: 8, set: 'pond', height: 0.7 },
  { id: 'lilyplanter', name: 'Lily Planter', w: 1, d: 1, cost: 0, level: 1, beauty: 7, set: 'pond', height: 0.5 },
  { id: 'paperlanterns', name: 'Paper Lanterns', w: 1, d: 1, cost: 0, level: 1, beauty: 9, set: 'lantern', height: 1.6 },
  { id: 'lanternpost', name: 'Lantern Post', w: 1, d: 1, cost: 0, level: 1, beauty: 7, set: 'lantern', height: 1.5 },
  { id: 'gardenmill', name: 'Garden Windmill', w: 1, d: 1, cost: 0, level: 1, beauty: 10, set: 'windmill', height: 1.6 },
  { id: 'birdhouse', name: 'Birdhouse', w: 1, d: 1, cost: 0, level: 1, beauty: 7, set: 'windmill', height: 1.4 },
  { id: 'snowfolk', name: 'Snow Friend', w: 1, d: 1, cost: 0, level: 1, beauty: 8, set: 'winter', height: 1.1 },
  { id: 'lanterns', name: 'Lantern String', w: 1, d: 1, cost: 0, level: 1, beauty: 8, set: 'winter', height: 1.5 },
  { id: 'pinetree', name: 'Little Pine', w: 1, d: 1, cost: 0, level: 1, beauty: 6, set: 'winter', height: 1.4 },
];

export const DECOR_BY_ID: Record<string, DecorDef> = Object.fromEntries(DECOR.map(d => [d.id, d]));

/** Decoration sets and how they're described when earned. */
export const SETS: Record<string, { name: string; how: string }> = {
  fair: { name: 'Fair Set', how: 'a rosette at a seasonal fair' },
  ribbons: { name: 'Ribbon Wall', how: 'your first fair ribbon' },
  garden: { name: 'Garden Set', how: 'a story chapter' },
  country: { name: 'Country Set', how: 'a gift from the neighbours' },
  winter: { name: 'Winter Set', how: 'the first winter' },
  pond: { name: 'Pond Set', how: 'the Farm Lab' },
  lantern: { name: 'Lantern Set', how: 'the Farm Lab' },
  windmill: { name: 'Windmill Set', how: 'the Farm Lab' },
};

export interface PathDef { id: number; name: string; cost: number; level: number; color: number; beauty: number }
/** Paths are painted on the ground (0 = no path). */
export const PATHS: readonly PathDef[] = [
  { id: 1, name: 'Dirt Path', cost: 1, level: 2, color: 0xc9a77a, beauty: 0.5 },
  { id: 2, name: 'Stone Path', cost: 3, level: 5, color: 0xc2bdb2, beauty: 1 },
  { id: 3, name: 'Brick Path', cost: 4, level: 9, color: 0xc97a5a, beauty: 1 },
];

export interface LandDef { area: 'meadow' | 'orchard' | 'pond' | 'riverside' | 'hilltop'; cost: number; level: number; blurb: string }
/** The land to open, in the order the story brings it. */
export const LAND: readonly LandDef[] = [
  { area: 'meadow', cost: 400, level: 4, blurb: 'Big flat fields for big harvests.' },
  { area: 'orchard', cost: 1500, level: 8, blurb: 'Sunny terraces, just right for fruit trees.' },
  { area: 'pond', cost: 2600, level: 11, blurb: 'A pond for ducks, and wet fields for rice.' },
  { area: 'riverside', cost: 4200, level: 14, blurb: 'More land by the river, and a second dock.' },
  { area: 'hilltop', cost: 7000, level: 17, blurb: 'The top of the hill: bees, breezes and the best view.' },
];

/** Beauty rating names, from a sleepy farm to a picture-perfect one. */
export const BEAUTY_TIERS: readonly { from: number; name: string }[] = [
  { from: 0, name: 'Sleepy' }, { from: 25, name: 'Tidy' }, { from: 70, name: 'Pretty' }, { from: 140, name: 'Lovely' }, { from: 240, name: 'Picture-perfect' },
];
