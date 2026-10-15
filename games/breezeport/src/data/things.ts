/**
 * Everything that can stand on Breezeport's land: its footprint in tiles, height (for tap picking),
 * contact shade, the paints its instances pick from, and what it does in the town. Models live in
 * src/render/models; balance numbers live in data/tuning.ts. Data only (no three.js).
 *
 * - Buildings that **grow** on zoned lots (homes, shops, workplaces) come in three levels; a
 *   building that levels up changes into its next-level def (same lot, new look).
 * - Everything else is **placed** by the player for coins: services, park pieces, trees, transit
 *   stops and the story's landmarks.
 */
import { PAINT } from './paints';

export type ThingClass = 'home' | 'shop' | 'work' | 'civic' | 'park' | 'street' | 'tree' | 'transit' | 'landmark';
export type ServiceKind = 'school' | 'library' | 'clinic' | 'safety' | 'community' | 'recycling';
export type ZoneName = 'home' | 'shop' | 'work';

export interface ThingDef {
  id: string;
  name: string;
  class: ThingClass;
  /** Footprint in tiles, before turning. */
  w: number;
  d: number;
  height: number;
  /** Contact shade under it (0 none). */
  shade: number;
  /** Paints its instances choose from (the instance colour); none = drawn as modelled. */
  looks?: readonly number[];
  /** Grown buildings: the zone they grow on and their level (1–3). */
  zone?: ZoneName;
  level?: 1 | 2 | 3;
  /** Placed things: the coins it costs and the chapter it opens in (0 = from the start). */
  cost?: number;
  chapter?: number;
  service?: ServiceKind;
  /** Nature points for homes nearby (a tree is 1). */
  green?: number;
  /** One short line for the info card. */
  blurb: string;
}

const BRICKS = [0xc8735a, 0xd99a7a, 0xb8705e, 0xe0b090, 0xa98b7a, 0xcf8f6a] as const;
const OFFICE = [0x9fcbee, 0xa6dccb, 0xf6d6a4, 0xd3c0ef, 0xf9f1e0, 0xb7d6c4] as const;

const defs: ThingDef[] = [
  // --- homes (grow on home zones) ---
  { id: 'cottage', name: 'Cottage', class: 'home', zone: 'home', level: 1, w: 2, d: 2, height: 1.5, shade: 0.75, looks: PAINT.walls, blurb: 'A cosy clapboard cottage for a small family.' },
  { id: 'bungalow', name: 'Bungalow', class: 'home', zone: 'home', level: 1, w: 2, d: 2, height: 1.2, shade: 0.75, looks: PAINT.walls, blurb: 'A low house with a porch swing.' },
  { id: 'townhouse', name: 'Townhouse', class: 'home', zone: 'home', level: 2, w: 2, d: 2, height: 1.7, shade: 0.8, looks: BRICKS, blurb: 'Two floors of brick and a stoop to sit on.' },
  { id: 'duplex', name: 'Duplex', class: 'home', zone: 'home', level: 2, w: 2, d: 2, height: 1.8, shade: 0.8, looks: PAINT.walls, blurb: 'Two homes side by side under one roof.' },
  { id: 'flats', name: 'Flats', class: 'home', zone: 'home', level: 3, w: 2, d: 2, height: 2.7, shade: 0.85, looks: BRICKS, blurb: 'Homes for twelve people, with balconies and a roof garden.' },
  // --- shops (grow on shop zones) ---
  { id: 'store', name: 'Corner store', class: 'shop', zone: 'shop', level: 1, w: 2, d: 2, height: 1.3, shade: 0.75, looks: PAINT.awning, blurb: 'Fruit, bread and everything in between.' },
  { id: 'bakery', name: 'Bakery', class: 'shop', zone: 'shop', level: 1, w: 2, d: 2, height: 1.3, shade: 0.75, looks: PAINT.awning, blurb: 'Warm buns every morning.' },
  { id: 'cafe', name: 'Café', class: 'shop', zone: 'shop', level: 2, w: 2, d: 2, height: 1.6, shade: 0.75, looks: PAINT.awning, blurb: 'Tables outside and the smell of cocoa.' },
  { id: 'bookshop', name: 'Bookshop', class: 'shop', zone: 'shop', level: 2, w: 2, d: 2, height: 1.6, shade: 0.75, looks: PAINT.awning, blurb: 'Stories, maps and comics, stacked to the ceiling.' },
  { id: 'market', name: 'Market hall', class: 'shop', zone: 'shop', level: 3, w: 2, d: 2, height: 2.3, shade: 0.8, looks: PAINT.awning, blurb: 'A busy hall of little shops, with flats above.' },
  // --- workplaces (grow on work zones) ---
  { id: 'workshop', name: 'Workshop', class: 'work', zone: 'work', level: 1, w: 2, d: 2, height: 1.3, shade: 0.75, looks: OFFICE, blurb: 'Where bikes and boats get fixed.' },
  { id: 'studio', name: 'Studio', class: 'work', zone: 'work', level: 2, w: 2, d: 2, height: 1.9, shade: 0.8, looks: OFFICE, blurb: 'Designers and game makers at big sunny windows.' },
  { id: 'offices', name: 'Offices', class: 'work', zone: 'work', level: 3, w: 2, d: 2, height: 3.1, shade: 0.85, looks: OFFICE, blurb: 'A tall glass building full of busy desks.' },
  // --- services (placed) ---
  { id: 'cityhall', name: 'City Hall', class: 'civic', w: 4, d: 3, height: 2.6, shade: 0.8, blurb: 'Where the junior mayor works. Tap it to see the budget.' },
  { id: 'school', name: 'School', class: 'civic', service: 'school', cost: 420, chapter: 2, w: 3, d: 3, height: 2.2, shade: 0.8, blurb: 'Classrooms, a playground and a bell.' },
  { id: 'library', name: 'Library', class: 'civic', service: 'library', cost: 360, chapter: 2, w: 4, d: 3, height: 2.4, shade: 0.8, blurb: 'Free books for everyone, and a cosy reading room.' },
  { id: 'clinic', name: 'Clinic', class: 'civic', service: 'clinic', cost: 480, chapter: 4, w: 3, d: 2, height: 1.9, shade: 0.8, blurb: 'Doctors and nurses who help people feel better.' },
  { id: 'safety', name: 'Safety station', class: 'civic', service: 'safety', cost: 450, chapter: 4, w: 3, d: 2, height: 1.9, shade: 0.8, blurb: 'The safety crew checks smoke alarms, teaches bike safety and helps cats down from trees.' },
  { id: 'community', name: 'Community center', class: 'civic', service: 'community', cost: 340, chapter: 4, w: 3, d: 3, height: 1.8, shade: 0.8, blurb: 'Clubs, dances and a big kitchen for everyone.' },
  { id: 'recycling', name: 'Recycling center', class: 'civic', service: 'recycling', cost: 520, chapter: 5, w: 3, d: 3, height: 1.6, shade: 0.8, blurb: 'Old cans, jars and paper become new things.' },
  // --- parks and trees (placed) ---
  { id: 'tree', name: 'Tree', class: 'tree', cost: 10, green: 1, w: 1, d: 1, height: 1.4, shade: 0.45, blurb: 'Shade for hot days, homes for birds.' },
  { id: 'blossom', name: 'Blossom tree', class: 'tree', cost: 14, green: 1, w: 1, d: 1, height: 1.4, shade: 0.45, blurb: 'Pink blossom every spring.' },
  { id: 'pine', name: 'Pine', class: 'tree', cost: 12, green: 1, w: 1, d: 1, height: 1.5, shade: 0.4, blurb: 'Green all year round.' },
  { id: 'bush', name: 'Bushes', class: 'tree', cost: 6, green: 1, w: 1, d: 1, height: 0.3, shade: 0.25, blurb: 'Flowering bushes.' },
  { id: 'flowerbed', name: 'Flower bed', class: 'park', cost: 27, green: 1, w: 1, d: 1, height: 0.3, shade: 0.2, looks: [0xff7a8a, 0xffd34d, 0xb59cff, 0xff9a4d, 0xffffff], blurb: 'Bright flowers that bees love.' },
  { id: 'bench', name: 'Bench', class: 'park', cost: 21, green: 0, w: 1, d: 1, height: 0.3, shade: 0.15, blurb: 'A place to sit and watch the town.' },
  { id: 'picnic', name: 'Picnic table', class: 'park', cost: 33, green: 1, w: 1, d: 1, height: 0.3, shade: 0.2, blurb: 'Lunch outside!' },
  { id: 'arch', name: 'Rose arch', class: 'park', cost: 45, green: 1, w: 1, d: 1, height: 1, shade: 0.1, blurb: 'A welcome arch covered in roses.' },
  { id: 'fountain', name: 'Fountain', class: 'park', cost: 180, green: 2, w: 2, d: 2, height: 0.9, shade: 0.3, blurb: 'Splashing water to cool the plaza.' },
  { id: 'playground', name: 'Playground', class: 'park', cost: 220, green: 2, w: 2, d: 2, height: 0.8, shade: 0.2, chapter: 1, blurb: 'A slide, swings and a climbing dome.' },
  { id: 'pond', name: 'Duck pond', class: 'park', cost: 140, green: 3, w: 2, d: 2, height: 0.3, shade: 0.1, chapter: 5, blurb: 'Lily pads, reeds and a family of ducks.' },
  { id: 'skatepark', name: 'Skate park', class: 'park', cost: 300, green: 1, w: 3, d: 3, height: 0.6, shade: 0.15, chapter: 3, blurb: 'Ramps and rails for skaters and scooters.' },
  // --- street things (placed; lamps line the sidewalks by themselves) ---
  { id: 'lamp', name: 'Street lamp', class: 'street', w: 1, d: 1, height: 1.1, shade: 0, blurb: 'Lights the way at night.' },
  { id: 'hydrant', name: 'Hydrant', class: 'street', cost: 6, w: 1, d: 1, height: 0.2, shade: 0, blurb: 'A bright red water point.' },
  { id: 'postbox', name: 'Post box', class: 'street', cost: 8, w: 1, d: 1, height: 0.35, shade: 0, blurb: 'Letters to everywhere.' },
  { id: 'bin', name: 'Bin', class: 'street', cost: 5, w: 1, d: 1, height: 0.2, shade: 0, blurb: 'Keeps the streets tidy.' },
  // --- transit (placed beside a road) ---
  { id: 'busstop', name: 'Bus stop', class: 'transit', cost: 40, chapter: 3, w: 1, d: 1, height: 0.8, shade: 0.2, blurb: 'Wait here for the bus. Join stops into a route.' },
  { id: 'tramstop', name: 'Tram stop', class: 'transit', cost: 170, chapter: 7, w: 1, d: 1, height: 0.9, shade: 0.2, blurb: 'The tram stops here.' },
  // --- landmarks (the story opens them) ---
  { id: 'pier', name: 'Harbour pier', class: 'landmark', w: 2, d: 5, height: 0.6, shade: 0, blurb: 'The old wooden pier, where the ferry docks.' },
  { id: 'ferris', name: 'Ferris wheel', class: 'landmark', cost: 3600, chapter: 6, w: 3, d: 3, height: 3.6, shade: 0.4, blurb: 'See the whole bay from the top!' },
  { id: 'glasshouse', name: 'Glasshouse', class: 'landmark', cost: 3200, chapter: 5, green: 4, w: 4, d: 3, height: 2.2, shade: 0.4, blurb: 'Plants from all over the world, warm all year.' },
  { id: 'aquarium', name: 'Aquarium', class: 'landmark', cost: 4400, chapter: 6, w: 4, d: 4, height: 2.2, shade: 0.7, blurb: 'Rays, seahorses and a giant kelp tank.' },
  { id: 'observatory', name: 'Observatory', class: 'landmark', cost: 4000, chapter: 7, w: 3, d: 3, height: 3, shade: 0.6, blurb: 'A big telescope for looking at the stars.' },
  { id: 'stage', name: 'Festival stage', class: 'landmark', cost: 4800, chapter: 8, w: 4, d: 3, height: 2.4, shade: 0.4, blurb: 'Where the Bay Festival happens!' },
  // --- scaffolding (drawn while a building goes up; never placed) ---
  { id: 'scaffold', name: 'Being built', class: 'street', w: 2, d: 2, height: 1.4, shade: 0.5, blurb: 'Something new is going up here!' },
  // --- the style frame's big apartments (3 × 3) ---
  { id: 'apartments', name: 'Apartments', class: 'home', w: 3, d: 3, height: 2.3, shade: 0.85, looks: BRICKS, blurb: 'Lots of homes in one building.' },
];

export const THING: Record<string, ThingDef> = Object.fromEntries(defs.map(d => [d.id, d]));
export const THINGS: readonly ThingDef[] = defs;

/** The buildings that grow on a zone at a level. */
export const GROWS: Record<ZoneName, Record<1 | 2 | 3, readonly string[]>> = {
  home: { 1: ['cottage', 'bungalow'], 2: ['townhouse', 'duplex'], 3: ['flats'] },
  shop: { 1: ['store', 'bakery'], 2: ['cafe', 'bookshop'], 3: ['market'] },
  work: { 1: ['workshop'], 2: ['studio'], 3: ['offices'] },
};

/** Is this a building (it has walls and people inside), rather than a decoration? */
export const isBuildingDef = (def: string) => { const c = THING[def]?.class; return c === 'home' || c === 'shop' || c === 'work' || c === 'civic' || c === 'landmark' || c === 'transit'; };
