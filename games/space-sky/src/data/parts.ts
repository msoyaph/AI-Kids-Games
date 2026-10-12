import type { PartDef, RocketLoadout } from './types';

/**
 * Rocket parts. Stats are small numbers added together across the rocket, then shown as
 * 1-5 stars (see systems/rocketStats.ts). Any combination flies.
 */
export const PARTS: PartDef[] = [
  // ---- Noses
  { id: 'nose_cone', slot: 'nose', name: 'Classic Cone', desc: 'A trusty pointy nose.', style: 'cone', stats: { speed: 1 }, price: 0, unlock: { kind: 'start' } },
  { id: 'nose_bubble', slot: 'nose', name: 'Bubble Dome', desc: 'A big glass dome. Great view!', style: 'bubble', stats: { shield: 1, cargo: 1 }, price: 60, unlock: { kind: 'start' } },
  { id: 'nose_needle', slot: 'nose', name: 'Speedy Needle', desc: 'Long and sharp. Zoom!', style: 'needle', stats: { speed: 2 }, price: 120, unlock: { kind: 'chapter', chapter: 2 } },
  { id: 'nose_star', slot: 'nose', name: 'Star Tip', desc: 'A shiny star on top.', style: 'star', stats: { speed: 1, shield: 1 }, price: 150, unlock: { kind: 'chapter', chapter: 2 } },
  { id: 'nose_comet', slot: 'nose', name: 'Comet Cap', desc: 'Smooth like a comet.', style: 'comet', stats: { speed: 2, shield: 1 }, price: 280, unlock: { kind: 'chapter', chapter: 3 } },
  { id: 'nose_prism', slot: 'nose', name: 'Zephyra Prism', desc: 'A glowing crystal from Zephyra.', style: 'prism', stats: { speed: 3, shield: 2 }, price: 0, unlock: { kind: 'mission', mission: 'c5_zephyra' } },

  // ---- Bodies
  { id: 'body_classic', slot: 'body', name: 'Classic Body', desc: 'A good all-round rocket.', style: 'classic', stats: { fuel: 1, cargo: 1, shield: 1 }, price: 0, unlock: { kind: 'start' } },
  { id: 'body_chubby', slot: 'body', name: 'Chubby Body', desc: 'Round and roomy.', style: 'chubby', stats: { fuel: 2, cargo: 2 }, price: 110, unlock: { kind: 'start' } },
  { id: 'body_slim', slot: 'body', name: 'Slim Body', desc: 'Thin and quick.', style: 'slim', stats: { speed: 1, fuel: 1, shield: 1 }, price: 120, unlock: { kind: 'chapter', chapter: 2 } },
  { id: 'body_capsule', slot: 'body', name: 'Explorer Capsule', desc: 'Lots of round windows.', style: 'capsule', stats: { fuel: 2, shield: 2 }, price: 240, unlock: { kind: 'chapter', chapter: 3 } },
  { id: 'body_armor', slot: 'body', name: 'Armor Body', desc: 'Tough plates for bumpy trips.', style: 'armor', stats: { shield: 3, cargo: 1 }, price: 340, unlock: { kind: 'chapter', chapter: 4 } },
  { id: 'body_crystal', slot: 'body', name: 'Crystal Body', desc: 'Made with help from Zibbo.', style: 'crystal', stats: { speed: 1, fuel: 2, shield: 2, cargo: 1 }, price: 0, unlock: { kind: 'mission', mission: 'c4_starpath' } },

  // ---- Engines
  { id: 'eng_single', slot: 'engine', name: 'Puff Engine', desc: 'Small but mighty.', style: 'single', stats: { speed: 1 }, price: 0, unlock: { kind: 'start' }, flame: ['#ff9f43', '#fff36b'] },
  { id: 'eng_twin', slot: 'engine', name: 'Twin Engine', desc: 'Two engines, twice the fun.', style: 'twin', stats: { speed: 2 }, price: 0, unlock: { kind: 'mission', mission: 'c1_moon_rocks' }, flame: ['#ff9f43', '#fff36b'] },
  { id: 'eng_ion', slot: 'engine', name: 'Ion Engine', desc: 'A cool blue glow. Saves fuel.', style: 'ion', stats: { speed: 2, fuel: 1 }, price: 220, unlock: { kind: 'chapter', chapter: 2 }, flame: ['#4dd4ff', '#e6fbff'] },
  { id: 'eng_triple', slot: 'engine', name: 'Triple Engine', desc: 'Three flames! Very fast.', style: 'triple', stats: { speed: 3 }, price: 300, unlock: { kind: 'chapter', chapter: 3 }, flame: ['#ff7a3b', '#ffe066'] },
  { id: 'eng_turbo', slot: 'engine', name: 'Turbo Engine', desc: 'A huge engine for long trips.', style: 'turbo', stats: { speed: 3, fuel: 1 }, price: 420, unlock: { kind: 'chapter', chapter: 4 }, flame: ['#ff5d73', '#ffd1dc'] },
  { id: 'eng_star', slot: 'engine', name: 'Star Drive', desc: 'Powered by starlight!', style: 'star', stats: { speed: 4, fuel: 1 }, price: 0, unlock: { kind: 'mission', mission: 'c5_beacon' }, flame: ['#b07bff', '#f3e6ff'] },

  // ---- Fins
  { id: 'fins_basic', slot: 'fins', name: 'Basic Fins', desc: 'Keeps you steady.', style: 'basic', stats: { shield: 1 }, price: 0, unlock: { kind: 'start' } },
  { id: 'fins_swept', slot: 'fins', name: 'Swept Fins', desc: 'Swooshy and fast.', style: 'swept', stats: { speed: 1 }, price: 80, unlock: { kind: 'start' } },
  { id: 'fins_round', slot: 'fins', name: 'Round Fins', desc: 'Soft round fins.', style: 'round', stats: { shield: 1, cargo: 1 }, price: 90, unlock: { kind: 'chapter', chapter: 2 } },
  { id: 'fins_wing', slot: 'fins', name: 'Big Wings', desc: 'Wide wings like a bird.', style: 'wing', stats: { speed: 1, shield: 1 }, price: 160, unlock: { kind: 'chapter', chapter: 2 } },
  { id: 'fins_quad', slot: 'fins', name: 'Four Fins', desc: 'Extra fins, extra safe.', style: 'quad', stats: { shield: 2, speed: 1 }, price: 260, unlock: { kind: 'chapter', chapter: 3 } },
  { id: 'fins_star', slot: 'fins', name: 'Star Fins', desc: 'Sparkly star fins.', style: 'star', stats: { speed: 2, shield: 1 }, price: 330, unlock: { kind: 'chapter', chapter: 4 } },

  // ---- Fuel tanks
  { id: 'tank_mini', slot: 'tank', name: 'Mini Tank', desc: 'A small tank inside.', style: 'mini', stats: { fuel: 1 }, price: 0, unlock: { kind: 'start' } },
  { id: 'tank_pods', slot: 'tank', name: 'Side Pods', desc: 'Two extra tanks on the sides.', style: 'pods', stats: { fuel: 2 }, price: 90, unlock: { kind: 'start' } },
  { id: 'tank_belly', slot: 'tank', name: 'Big Belly Tank', desc: 'A big round tank.', style: 'belly', stats: { fuel: 3 }, price: 0, unlock: { kind: 'mission', mission: 'c2_report' } },
  { id: 'tank_boosters', slot: 'tank', name: 'Booster Tanks', desc: 'Tanks with tiny boosters.', style: 'boosters', stats: { fuel: 3, speed: 1 }, price: 300, unlock: { kind: 'chapter', chapter: 3 } },
  { id: 'tank_ice', slot: 'tank', name: 'Comet Ice Tank', desc: 'Holds lots of icy fuel.', style: 'ice', stats: { fuel: 4 }, price: 380, unlock: { kind: 'chapter', chapter: 4 } },
  { id: 'tank_glow', slot: 'tank', name: 'Glow Cell', desc: 'A Zephyran power cell.', style: 'glow', stats: { fuel: 5 }, price: 0, unlock: { kind: 'mission', mission: 'c5_sky' } },

  // ---- Cargo bays
  { id: 'cargo_hatch', slot: 'cargo', name: 'Small Hatch', desc: 'Room for a few treasures.', style: 'hatch', stats: { cargo: 1 }, price: 0, unlock: { kind: 'start' } },
  { id: 'cargo_pod', slot: 'cargo', name: 'Cargo Pod', desc: 'A handy box on your rocket.', style: 'pod', stats: { cargo: 2 }, price: 80, unlock: { kind: 'start' } },
  { id: 'cargo_bags', slot: 'cargo', name: 'Saddle Bags', desc: 'Bags on both sides.', style: 'bags', stats: { cargo: 2, fuel: 1 }, price: 150, unlock: { kind: 'chapter', chapter: 2 } },
  { id: 'cargo_magnet', slot: 'cargo', name: 'Magnet Bay', desc: 'Pulls in star-coins from far away!', style: 'magnet', stats: { cargo: 3 }, price: 0, unlock: { kind: 'mission', mission: 'c3_belt' } },
  { id: 'cargo_big', slot: 'cargo', name: 'Big Bay', desc: 'A giant cargo bay.', style: 'big', stats: { cargo: 4 }, price: 320, unlock: { kind: 'chapter', chapter: 4 } },
  { id: 'cargo_treasure', slot: 'cargo', name: 'Treasure Hold', desc: 'The biggest bay of all.', style: 'treasure', stats: { cargo: 5 }, price: 450, unlock: { kind: 'chapter', chapter: 5 } },

  // ---- Lights (just for fun)
  { id: 'lights_none', slot: 'lights', name: 'No Lights', desc: 'Plain and simple.', style: 'none', stats: {}, price: 0, unlock: { kind: 'start' } },
  { id: 'lights_blink', slot: 'lights', name: 'Blinkers', desc: 'Red and green blinking lights.', style: 'blink', stats: {}, price: 40, unlock: { kind: 'start' } },
  { id: 'lights_strip', slot: 'lights', name: 'Glow Strip', desc: 'A glowing stripe.', style: 'strip', stats: {}, price: 60, unlock: { kind: 'chapter', chapter: 2 } },
  { id: 'lights_halo', slot: 'lights', name: 'Halo Ring', desc: 'A ring of light.', style: 'halo', stats: {}, price: 90, unlock: { kind: 'chapter', chapter: 3 } },
  { id: 'lights_party', slot: 'lights', name: 'Party Lights', desc: 'Every color at once!', style: 'party', stats: {}, price: 120, unlock: { kind: 'chapter', chapter: 4 } },
  { id: 'lights_head', slot: 'lights', name: 'Headlight', desc: 'Light up dark places.', style: 'head', stats: {}, price: 70, unlock: { kind: 'chapter', chapter: 2 } },

  // ---- Paint (just for fun)
  { id: 'paint_classic', slot: 'paint', name: 'Classic', desc: 'White with red.', style: 'paint', stats: {}, price: 0, unlock: { kind: 'start' }, colors: { main: '#f4f7ff', accent: '#ff5d73', trim: '#4c7dff', window: '#4dd4ff' } },
  { id: 'paint_ocean', slot: 'paint', name: 'Ocean Blue', desc: 'Deep blue like the sea.', style: 'paint', stats: {}, price: 40, unlock: { kind: 'start' }, colors: { main: '#4c7dff', accent: '#ffe066', trim: '#f4f7ff', window: '#a8f0ff' } },
  { id: 'paint_lime', slot: 'paint', name: 'Lime Zing', desc: 'Bright and zesty green.', style: 'paint', stats: {}, price: 40, unlock: { kind: 'start' }, colors: { main: '#8cff66', accent: '#6b3fd4', trim: '#f4f7ff', window: '#4dd4ff' } },
  { id: 'paint_sunset', slot: 'paint', name: 'Sunset', desc: 'Warm orange and pink.', style: 'paint', stats: {}, price: 50, unlock: { kind: 'chapter', chapter: 2 }, colors: { main: '#ff9f43', accent: '#ff5d73', trim: '#ffe066', window: '#4dd4ff', pattern: 'stripes' } },
  { id: 'paint_bubblegum', slot: 'paint', name: 'Bubblegum', desc: 'Sweet pink.', style: 'paint', stats: {}, price: 50, unlock: { kind: 'start' }, colors: { main: '#ff7ad9', accent: '#f4f7ff', trim: '#9b6bff', window: '#4dd4ff' } },
  { id: 'paint_mint', slot: 'paint', name: 'Mint Chip', desc: 'Cool and minty.', style: 'paint', stats: {}, price: 50, unlock: { kind: 'chapter', chapter: 2 }, colors: { main: '#9cf5d6', accent: '#4a4e6e', trim: '#2ed47a', window: '#4dd4ff', pattern: 'stars' } },
  { id: 'paint_galaxy', slot: 'paint', name: 'Galaxy', desc: 'Purple with stars.', style: 'paint', stats: {}, price: 80, unlock: { kind: 'chapter', chapter: 3 }, colors: { main: '#6b3fd4', accent: '#ff7ad9', trim: '#ffe066', window: '#4dd4ff', pattern: 'stars' } },
  { id: 'paint_navy', slot: 'paint', name: 'Night Navy', desc: 'Dark blue with gold.', style: 'paint', stats: {}, price: 60, unlock: { kind: 'chapter', chapter: 3 }, colors: { main: '#2a3f9e', accent: '#ffc83d', trim: '#f4f7ff', window: '#4dd4ff' } },
  { id: 'paint_gold', slot: 'paint', name: 'Gold Star', desc: 'Shiny gold. Fancy!', style: 'paint', stats: {}, price: 150, unlock: { kind: 'chapter', chapter: 4 }, colors: { main: '#ffc83d', accent: '#ff5d73', trim: '#f4f7ff', window: '#4dd4ff', pattern: 'stripes' } },
  { id: 'paint_rainbow', slot: 'paint', name: 'Rainbow', desc: 'All the colors!', style: 'paint', stats: {}, price: 200, unlock: { kind: 'chapter', chapter: 5 }, colors: { main: '#f4f7ff', accent: '#ff5d73', trim: '#4c7dff', window: '#4dd4ff', pattern: 'rainbow' } },
];

export const PART_BY_ID: Record<string, PartDef> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export const STARTER_LOADOUT: RocketLoadout = {
  nose: 'nose_cone',
  body: 'body_classic',
  engine: 'eng_single',
  fins: 'fins_basic',
  tank: 'tank_mini',
  cargo: 'cargo_hatch',
  lights: 'lights_none',
  paint: 'paint_classic',
  stickers: [],
};

/** Parts every new cadet owns. */
export const STARTER_PARTS: string[] = PARTS.filter((p) => p.unlock.kind === 'start' && p.price === 0).map((p) => p.id);

/** The special story part needed for the wormhole (given by a mission, equipped automatically). */
export const WORMHOLE_SHIELD = 'shield_wormhole';
