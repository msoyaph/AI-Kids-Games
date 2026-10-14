// Every balance value in the game lives here, so balancing never means hunting through code. The
// bots' reports (reports/balance.md, reports/pacing.md) are read against this file. Units: tiles,
// seconds, compost. "Patience" is how much shooing a critter takes before it poofs and runs home;
// "health" is how much nibbling a plant takes before it wilts (it can be replanted).

export const BOARD = {
  lanes: 5,
  tiles: 9,
  /** Tile size in world units: a little deeper than wide, so tiles read square at the tilted camera. */
  tileWidth: 1.0,
  tileDepth: 1.15,
  /**
   * The path in: this many tiles of garden path beyond the last column, where critters are seen
   * coming through the bushes before they reach the beds. Not plantable.
   */
  runway: 1.5,
} as const;

export const SIM = {
  /** The rules run at a fixed 60 steps a second, whatever the frame rate. */
  stepHz: 60,
  /** The longest real frame time fed to the rules (seconds), clamped before any test speed-up. */
  maxFrame: 0.25,
  /** Plants only aim at critters this far right (tiles): the beds and the first step of the path. */
  sightX: 9.6,
  /** Where a critter reaches the blanket (x, tiles). */
  blanketX: -0.15,
} as const;

export const BASKET = {
  /** Snacks in the basket; stars count the snacks left at the end of a level. */
  snacks: 3,
} as const;

export const COMPOST = {
  /** Worth of one pickup made by a worm or a producer. */
  pickup: 25,
  /** A shooed critter's leaves, by its points (see CRITTERS): points × this, rounded. */
  leafPerPoint: 2,
  /** Seconds a pickup waits on the ground before it sinks back in. */
  pickupLife: 11,
  /** Auto-collect gathers a pickup this long after it appears. */
  autoCollectDelay: 0.9,
  /** Earthworms surface every `wormEvery` ± `wormJitter` seconds (day and dusk alike). */
  wormEvery: 7,
  wormJitter: 2.5,
  /** The first worm comes this soon, so a level starts moving. */
  firstWorm: 3,
} as const;

export const UMBRELLA = {
  /** Critters within this many tiles of the blanket in the lane are spooked back. */
  reach: 3.2,
  /** Where spooked critters scamper back to (x, tiles). */
  backTo: 10,
} as const;

export type Attack = 'none' | 'straight' | 'pierce' | 'lob' | 'area' | 'cloud' | 'air' | 'produce' | 'slow' | 'tangle' | 'push' | 'lure' | 'support';

export interface PlantStats {
  cost: number;
  /** Seconds before its card is ready again after planting. */
  recharge: number;
  health: number;
  attack: Attack;
  /** Seconds between actions. */
  every: number;
  /** Shooing per hit (or per second for clouds). */
  power: number;
  /** How far it reaches (tiles ahead; for area, the radius in tiles). */
  reach: number;
  /** Slows: speed multiplier and seconds; tangle: seconds held. */
  slow?: number;
  hold?: number;
  /** Compost per action for producers. */
  makes?: number;
  /** Where it grows. */
  tile?: 'soil' | 'water';
  /** Wakes only at dusk (World 3's dusk bloomers). */
  dusk?: boolean;
  /** Critters can't hop over it (tall, soft or tangly). */
  stopsJumpers?: boolean;
  /** Never dries on hot tiles. */
  heatproof?: boolean;
}

/** Plant stats by id (names and roles in data/roster.ts). */
export const PLANTS: Record<string, PlantStats> = {
  comfrey: { cost: 50, recharge: 6, health: 300, attack: 'produce', every: 9, power: 0, reach: 0, makes: 25 },
  rowan: { cost: 100, recharge: 6, health: 300, attack: 'straight', every: 1.45, power: 20, reach: 9 },
  boxwood: { cost: 50, recharge: 22, health: 4000, attack: 'none', every: 0, power: 0, reach: 0, stopsJumpers: true },
  'lambs-ear': { cost: 75, recharge: 12, health: 1000, attack: 'slow', every: 0.25, power: 0, reach: 1.6, slow: 0.45, stopsJumpers: true },
  maple: { cost: 100, recharge: 7, health: 300, attack: 'lob', every: 2.5, power: 32, reach: 9 },
  basil: { cost: 75, recharge: 10, health: 300, attack: 'support', every: 0, power: 0, reach: 1 },
  lavender: { cost: 100, recharge: 14, health: 400, attack: 'push', every: 6, power: 1.1, reach: 3.5 },
  arrowhead: { cost: 100, recharge: 7, health: 300, attack: 'straight', every: 1.3, power: 20, reach: 9, tile: 'water' },
  pickerelweed: { cost: 75, recharge: 8, health: 400, attack: 'slow', every: 0.25, power: 4, reach: 2.6, slow: 0.5, tile: 'water' },
  wisteria: { cost: 175, recharge: 8, health: 300, attack: 'pierce', every: 2.2, power: 22, reach: 4 },
  yarrow: { cost: 50, recharge: 6, health: 300, attack: 'produce', every: 9, power: 0, reach: 1, makes: 20 },
  'touch-me-not': { cost: 125, recharge: 10, health: 500, attack: 'area', every: 1.25, power: 26, reach: 1.2 },
  primrose: { cost: 75, recharge: 6, health: 300, attack: 'straight', every: 1.15, power: 24, reach: 9, dusk: true },
  'four-oclock': { cost: 75, recharge: 10, health: 500, attack: 'slow', every: 0.25, power: 0, reach: 2.2, slow: 0.4, dusk: true },
  'hop-vine': { cost: 100, recharge: 12, health: 600, attack: 'tangle', every: 4, power: 6, reach: 3, hold: 1.6, stopsJumpers: true },
  allium: { cost: 150, recharge: 10, health: 300, attack: 'cloud', every: 0.25, power: 11, reach: 3 },
  nasturtium: { cost: 50, recharge: 18, health: 900, attack: 'lure', every: 0.5, power: 0, reach: 2 },
  agave: { cost: 125, recharge: 24, health: 6000, attack: 'none', every: 0, power: 0, reach: 0, heatproof: true, stopsJumpers: true },
  hollyhock: { cost: 175, recharge: 8, health: 300, attack: 'lob', every: 3, power: 46, reach: 9 },
  chamomile: { cost: 100, recharge: 14, health: 300, attack: 'support', every: 0, power: 0, reach: 0 },
  milkweed: { cost: 150, recharge: 7, health: 300, attack: 'straight', every: 0.6, power: 10, reach: 9 },
  bluebell: { cost: 100, recharge: 7, health: 300, attack: 'air', every: 1.5, power: 50, reach: 9 },
  borage: { cost: 75, recharge: 10, health: 300, attack: 'support', every: 0, power: 0, reach: 1 },
  pampas: { cost: 100, recharge: 20, health: 2400, attack: 'slow', every: 0.25, power: 0, reach: 0.6, slow: 0.5, stopsJumpers: true },
};

/** Support plants: what they add to the plants around them (or to the garden). */
export const SUPPORT = {
  /** Basil: neighbours (the 8 around it) act this much faster. */
  basilHaste: 0.25,
  /** Chamomile: every card recharges this much faster per Chamomile (up to two count). */
  chamomileRecharge: 0.15,
  chamomileMax: 2,
  /** Borage: Garden Friends bonuses within reach are this much bigger. */
  borageBoost: 1,
  /** Yarrow: extra compost per neighbouring plant (8 around), up to `yarrowMax` neighbours. */
  yarrowPerNeighbour: 5,
  yarrowMax: 4,
} as const;

/** Garden Friends: real companion plants help each other when side by side (the 8 around). */
export const FRIENDS = {
  /** Comfrey feeds a Rowan next to it: more shooing per berry. */
  comfreyRowan: 0.2,
  /** Yarrow and Comfrey make each other's compost richer. */
  yarrowComfrey: 0.2,
  /** Nasturtium draws pests off its neighbours: they're nibbled this much slower. */
  nasturtiumShield: 0.3,
  /** Chamomile, "the plant doctor": neighbours mend this share of their health a second. */
  chamomileMend: 0.02,
  /** Borage's bees: flowering neighbours (Maple, Hollyhock, Lavender, Bluebell) act this much faster. */
  borageBees: 0.2,
  /** Allium keeps pests off shooters: Rowan, Wisteria and Milkweed shoo this much more. */
  alliumShooters: 0.15,
} as const;

export type Moves = 'walk' | 'fly' | 'dig' | 'hop';

export interface CritterStats {
  patience: number;
  /** Tiles a second. */
  speed: number;
  /** Nibbling a second. */
  bite: number;
  /** Difficulty points (wave budgets) and leaves dropped. */
  points: number;
  moves: Moves;
  /** An extra layer that takes the first shooing (shell, armour): halves it until it's gone. */
  armour?: number;
  /** A shield in front: stops straight shots until it's worn away; lobs and clouds go over it. */
  shield?: number;
  /** Lobs do nothing to it (a leaf umbrella). */
  blocksLobs?: boolean;
  /** Hops: how many plants it can hop over, and seconds between hops. */
  hops?: number;
  hopEvery?: number;
  /** Diggers pop up this far along (x, tiles) after a molehill warning. */
  digTo?: number;
  /** Swaps a plant for a pebble (packrat) or borrows it and drops it further on (magpie). */
  swap?: 'pebble' | 'borrow';
  /** Walks in a group of this many (ant columns). */
  group?: number;
  /** Faster on hot tiles by this factor. */
  heatHaste?: number;
  /** Floats over gap tiles. */
  floats?: boolean;
  /** Flutters low: it flies over plants, but any plant can shoo it. */
  low?: boolean;
  /** Only comes out at dusk (World 3's levels). */
  dusk?: boolean;
  /** Drawn to lanterns: waits this long at a lantern in its lane. */
  lanternWait?: number;
  /** Bosses: special trick. */
  boss?: 'summon' | 'charge' | 'burrow' | 'butt' | 'dive' | 'parade';
}

/** Critter stats by id (names and tips in data/roster.ts; bosses in data/bosses.ts). */
export const CRITTERS: Record<string, CritterStats> = {
  snail: { patience: 190, speed: 0.2, bite: 50, points: 1, moves: 'walk' },
  mouse: { patience: 120, speed: 0.42, bite: 40, points: 1, moves: 'walk' },
  ants: { patience: 70, speed: 0.3, bite: 22, points: 2, moves: 'walk', group: 3 },
  'roly-poly': { patience: 190, speed: 0.2, bite: 50, points: 2, moves: 'walk', armour: 260 },
  magpie: { patience: 150, speed: 0.36, bite: 0, points: 3, moves: 'fly', swap: 'borrow' },
  beetle: { patience: 190, speed: 0.2, bite: 50, points: 3, moves: 'walk', shield: 420 },
  grasshopper: { patience: 140, speed: 0.3, bite: 45, points: 2, moves: 'hop', hops: 3, hopEvery: 2.5 },
  frog: { patience: 230, speed: 0.22, bite: 50, points: 3, moves: 'walk', blocksLobs: true },
  vole: { patience: 190, speed: 0.26, bite: 60, points: 3, moves: 'dig', digTo: 5.2 },
  hedgehog: { patience: 260, speed: 0.2, bite: 55, points: 3, moves: 'walk', shield: 300 },
  moths: { patience: 60, speed: 0.36, bite: 0, points: 2, moves: 'fly', group: 3, lanternWait: 4, low: true, dusk: true },
  badger: { patience: 420, speed: 0.18, bite: 80, points: 5, moves: 'walk', shield: 700 },
  owlet: { patience: 110, speed: 0.26, bite: 0, points: 3, moves: 'fly', dusk: true },
  gecko: { patience: 140, speed: 0.5, bite: 40, points: 2, moves: 'walk', heatHaste: 1.6 },
  goat: { patience: 330, speed: 0.2, bite: 110, points: 5, moves: 'walk' },
  jackrabbit: { patience: 210, speed: 0.4, bite: 50, points: 3, moves: 'hop', hops: 2, hopEvery: 0.6 },
  packrat: { patience: 180, speed: 0.3, bite: 0, points: 3, moves: 'walk', swap: 'pebble' },
  seagull: { patience: 150, speed: 0.42, bite: 0, points: 4, moves: 'fly' },
  'kite-crow': { patience: 200, speed: 0.36, bite: 0, points: 4, moves: 'fly' },
  sheep: { patience: 700, speed: 0.16, bite: 45, points: 6, moves: 'walk', floats: true },
};

/** The bosses: a mini-boss ends each world, the Snack Parade Float ends the adventure. */
export const BOSSES: Record<string, CritterStats> = {
  'grand-snail': { patience: 3200, speed: 0.1, bite: 120, points: 20, moves: 'walk', armour: 600, boss: 'summon' },
  'big-beetle': { patience: 3600, speed: 0.12, bite: 140, points: 22, moves: 'walk', shield: 1600, boss: 'charge' },
  'badger-baron': { patience: 4200, speed: 0.11, bite: 160, points: 24, moves: 'walk', shield: 1200, boss: 'burrow' },
  'billy-goat': { patience: 4800, speed: 0.12, bite: 400, points: 26, moves: 'walk', boss: 'butt' },
  'captain-gull': { patience: 2200, speed: 0.16, bite: 0, points: 26, moves: 'fly', boss: 'dive' },
  'parade-float': { patience: 4200, speed: 0.07, bite: 140, points: 40, moves: 'walk', armour: 800, boss: 'parade' },
};

export const BOSS_TRICKS = {
  /** Grand Snail calls this many ants into nearby lanes every `summonEvery` seconds. */
  summon: 2, summonEvery: 9,
  /** Big Beetle charges (double speed for `chargeFor` s) every `chargeEvery` s. */
  chargeEvery: 10, chargeFor: 2.2,
  /** Badger Baron burrows to another lane every `burrowEvery` s. */
  burrowEvery: 12,
  /** Billy Goat butts the plant in front back a tile (if free) every `buttEvery` s. */
  buttEvery: 7,
  /** Captain Gull dives at a lane every `diveEvery` s, grabbing a snack if it reaches the blanket. */
  diveEvery: 11,
  /** The Parade Float drops `paradeDrop` critters across the lanes every `paradeEvery` s. */
  paradeDrop: 2, paradeEvery: 13,
} as const;

/** Twists: special tiles. */
export const TILES = {
  /** Sprinklers: a plant here acts this much faster. */
  sprinkler: 0.3,
  /** Hot tiles dry a plant out at this share of its health a second, unless a channel is next to it. */
  hotDry: 0.006,
  /** Updrafts lift flyers: this much faster over them. */
  updraft: 1.5,
} as const;

export const WAVES = {
  /** Seconds of calm before the first critter. */
  calm: 20,
  /** Seconds between ordinary spawns within a wave, shrinking a little per world. */
  gap: 5.2,
  /** Seconds between waves. */
  between: 13,
  /** When the garden is clear, the next wave comes this soon. */
  breather: 8,
  /** A big (flag) wave arrives faster: its spawns come this much closer together. */
  rush: 0.6,
} as const;

export const SAFETY = {
  /** Nothing on screen flashes more often than this (WCAG 2.3.1); see render/fx.ts. */
  flashLimitHz: 3,
  /** The smallest touch target, in CSS pixels. */
  minTouchPx: 48,
  /** The smallest tile on the smallest supported phone, in CSS pixels (the pick test checks it). */
  minTilePx: 40,
} as const;
