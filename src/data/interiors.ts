// Walk-in interior layouts: the eight villager homes (one per personality), Lantern Hall and
// The Curled Leaf shop. Coordinates are room tiles (x right, z toward the door / camera).
// tests/interiors.test.ts checks every layout: in bounds, no overlaps, reachable from the door.

export interface PlacedDecor {
  id: string;
  x: number;
  z: number;
  /** quarter turns */
  r?: number;
}

export interface RoomLayout {
  w: number;
  d: number;
  /** surface ids from data/furniture.ts SURFACES */
  floor: string;
  wall: string;
  furniture: PlacedDecor[];
}

export interface VillagerRoom extends RoomLayout {
  /** where the villager stands */
  spot: { x: number; z: number };
  /** 1x1 tiles where gifted furniture shows up (most recent first) */
  giftSlots: { x: number; z: number }[];
}

export const VILLAGER_ROOM_W = 8;
export const VILLAGER_ROOM_D = 7;
/** Gifted furniture shown in a villager's home (most recent first). */
export const GIFT_SLOTS = 6;

const GIFTS = [
  { x: 0, z: 2 },
  { x: 0, z: 3 },
  { x: 7, z: 2 },
  { x: 7, z: 3 },
  { x: 1, z: 5 },
  { x: 6, z: 5 },
];
const room = (floor: string, wall: string, furniture: PlacedDecor[]): VillagerRoom => ({
  w: VILLAGER_ROOM_W,
  d: VILLAGER_ROOM_D,
  floor,
  wall,
  furniture,
  spot: { x: 5, z: 2 },
  giftSlots: GIFTS,
});

export const VILLAGER_ROOMS: Record<string, VillagerRoom> = {
  // sunny baker: a warm kitchen-bedroom that smells of cinnamon
  tansy: room('floor_honey_planks', 'wall_lemonade_stripe', [
    { id: 'furn_strawdream_bed', x: 0, z: 0 },
    { id: 'furn_snugglewarm_stove', x: 3, z: 0 },
    { id: 'furn_whistling_kettle', x: 4, z: 0 },
    { id: 'furn_cider_barrel', x: 5, z: 0 },
    { id: 'furn_honeycomb_dresser', x: 6, z: 0 },
    { id: 'furn_berrypatch_rug', x: 2, z: 2 },
    { id: 'furn_teacup_table', x: 3, z: 3 },
    { id: 'furn_gumdrop_chair', x: 2, z: 3, r: 1 },
    { id: 'furn_gumdrop_chair', x: 4, z: 3, r: 3 },
    { id: 'furn_bellbloom_vase', x: 0, z: 5 },
    { id: 'furn_terracotta_planter', x: 7, z: 5 },
  ]),
  // gruff gardener: plants everywhere, plain wood
  rusk: room('floor_moss_carpet', 'wall_birch_panel', [
    { id: 'furn_strawdream_bed', x: 0, z: 0 },
    { id: 'furn_terracotta_planter', x: 3, z: 0 },
    { id: 'furn_pocket_fern', x: 4, z: 0 },
    { id: 'furn_terracotta_planter', x: 5, z: 0 },
    { id: 'furn_seaside_crate', x: 6, z: 0 },
    { id: 'furn_wrenhaven_birdhouse', x: 7, z: 0 },
    { id: 'furn_woven_rug', x: 2, z: 2 },
    { id: 'furn_plank_table', x: 2, z: 2 },
    { id: 'furn_twiggy_chair', x: 2, z: 3, r: 2 },
    { id: 'furn_twiggy_chair', x: 3, z: 3, r: 2 },
    { id: 'furn_pocket_fern', x: 0, z: 5 },
    { id: 'furn_bellbloom_vase', x: 7, z: 5 },
  ]),
  // bookish scholar: books, a globe, fossils
  bellamy: room('floor_driftwood_deck', 'wall_seafoam_stripe', [
    { id: 'furn_strawdream_bed', x: 0, z: 0 },
    { id: 'furn_storyteller_bookcase', x: 3, z: 0 },
    { id: 'furn_storyteller_bookcase', x: 5, z: 0 },
    { id: 'furn_starmap_globe', x: 7, z: 0 },
    { id: 'furn_woven_rug', x: 2, z: 2 },
    { id: 'furn_scribbler_desk', x: 2, z: 2 },
    { id: 'furn_twiggy_chair', x: 2, z: 3, r: 2 },
    { id: 'furn_wick_lantern', x: 4, z: 2 },
    { id: 'furn_wingbone_statue', x: 0, z: 5 },
    { id: 'furn_critter_terrarium', x: 7, z: 5 },
  ]),
  // sporty jogger: beachy, trophies, a hammock
  juno: room('floor_sandy_shore', 'wall_tidewave', [
    { id: 'furn_seabreeze_hammock', x: 0, z: 0 },
    { id: 'furn_trophy_bronze', x: 3, z: 0 },
    { id: 'furn_trophy_silver', x: 4, z: 0 },
    { id: 'furn_breeze_pennant', x: 5, z: 0 },
    { id: 'furn_tideside_bench', x: 6, z: 0 },
    { id: 'furn_woven_rug', x: 2, z: 2 },
    { id: 'furn_driftwood_stool', x: 2, z: 2 },
    { id: 'furn_driftwood_stool', x: 3, z: 3 },
    { id: 'furn_seaside_crate', x: 0, z: 5 },
    { id: 'furn_keepsake_frame', x: 7, z: 5 },
  ]),
  // dapper gentleman: piano, plush seats, a shiny rug
  percival: room('floor_cream_checker', 'wall_lavender_haze', [
    { id: 'furn_clamshell_bed', x: 0, z: 0 },
    { id: 'furn_lullaby_piano', x: 3, z: 0 },
    { id: 'furn_hootwhistle_clock', x: 5, z: 0 },
    { id: 'furn_moonbeam_lamp', x: 6, z: 0 },
    { id: 'furn_bellbloom_vase', x: 7, z: 0 },
    { id: 'furn_starglimmer_rug', x: 2, z: 2 },
    { id: 'furn_marshmallow_loveseat', x: 2, z: 2 },
    { id: 'furn_teacup_table', x: 2, z: 3 },
    { id: 'furn_wick_lantern', x: 0, z: 5 },
    { id: 'furn_keepsake_frame', x: 7, z: 5 },
  ]),
  // spunky explorer: a camp-like room with crates and critters
  kip: room('floor_grass', 'wall_canvas', [
    { id: 'furn_seabreeze_hammock', x: 0, z: 0 },
    { id: 'furn_seaside_crate', x: 3, z: 0 },
    { id: 'furn_seaside_crate', x: 4, z: 0 },
    { id: 'furn_critter_terrarium', x: 5, z: 0 },
    { id: 'furn_wrenhaven_birdhouse', x: 6, z: 0 },
    { id: 'furn_glowcap_lamp', x: 7, z: 0 },
    { id: 'furn_woven_rug', x: 2, z: 2 },
    { id: 'furn_wick_lantern', x: 3, z: 3 },
    { id: 'furn_driftwood_stool', x: 2, z: 3 },
    { id: 'furn_pebble_owl_statue', x: 0, z: 5 },
    { id: 'furn_pocket_fern', x: 7, z: 5 },
  ]),
  // dreamy painter: easel, paintings, sea colors
  mochi: room('floor_rosewater_tile', 'wall_berry_dots', [
    { id: 'furn_strawdream_bed', x: 0, z: 0 },
    { id: 'furn_daydream_easel', x: 3, z: 0 },
    { id: 'furn_wavesong_painting', x: 4, z: 0 },
    { id: 'furn_keepsake_frame', x: 5, z: 0 },
    { id: 'furn_tidepool_tank', x: 6, z: 0 },
    { id: 'furn_berrypatch_rug', x: 2, z: 2 },
    { id: 'furn_bellbloom_vase', x: 3, z: 2 },
    { id: 'furn_puffmoss_cushion', x: 2, z: 3 },
    { id: 'furn_puffmoss_cushion', x: 4, z: 3 },
    { id: 'furn_pocket_fern', x: 0, z: 5 },
    { id: 'furn_moonbeam_lamp', x: 7, z: 5 },
  ]),
  // mellow stargazer: telescope, a starry rug, a big comfy sofa
  marlowe: room('floor_stardust', 'wall_midnight_twinkle', [
    { id: 'furn_strawdream_bed', x: 0, z: 0 },
    { id: 'furn_stargazer_telescope', x: 3, z: 0 },
    { id: 'furn_bubble_tv', x: 4, z: 0 },
    { id: 'furn_hootwhistle_clock', x: 5, z: 0 },
    { id: 'furn_starmap_globe', x: 6, z: 0 },
    { id: 'furn_moonbeam_lamp', x: 7, z: 0 },
    { id: 'furn_starglimmer_rug', x: 2, z: 2 },
    { id: 'furn_puffcloud_sofa', x: 2, z: 3 },
    { id: 'furn_puffmoss_cushion', x: 4, z: 2 },
    { id: 'furn_wick_lantern', x: 0, z: 5 },
    { id: 'furn_pocket_fern', x: 7, z: 5 },
  ]),
};

// ---------------------------------------------------------------- Lantern Hall

export interface FixtureDef {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export const HALL_ROOM: RoomLayout & { fixtures: FixtureDef[]; host: { x: number; z: number } } = {
  w: 10,
  d: 7,
  floor: 'floor_honey_planks',
  wall: 'wall_seafoam_stripe',
  furniture: [
    { id: 'furn_storyteller_bookcase', x: 0, z: 0 },
    { id: 'furn_hootwhistle_clock', x: 2, z: 0 },
    { id: 'furn_wick_lantern', x: 7, z: 0 },
    { id: 'furn_storyteller_bookcase', x: 8, z: 0 },
    { id: 'furn_starglimmer_rug', x: 4, z: 4 },
    { id: 'furn_pocket_fern', x: 0, z: 6 },
    { id: 'furn_pocket_fern', x: 9, z: 6 },
    { id: 'furn_mossback_bench', x: 1, z: 5 },
    { id: 'furn_wick_lantern', x: 9, z: 5 },
  ],
  fixtures: [
    { id: 'desk', x: 4, z: 2, w: 2, d: 1 },
    { id: 'board', x: 0, z: 2, w: 1, d: 2 },
    { id: 'kiosk', x: 9, z: 2, w: 1, d: 1 },
  ],
  host: { x: 5, z: 1.4 },
};

// ---------------------------------------------------------------- The Curled Leaf

export const SHOP_ROOM: RoomLayout & { fixtures: FixtureDef[]; host: { x: number; z: number }; shelves: { x: number; z: number; kind: 'wall' | 'table' }[] } = {
  w: 10,
  d: 8,
  floor: 'floor_driftwood_deck',
  wall: 'wall_peach_gingham',
  furniture: [
    { id: 'furn_pocket_fern', x: 0, z: 7 },
    { id: 'furn_terracotta_planter', x: 9, z: 7 },
    { id: 'furn_woven_rug', x: 4, z: 5 },
  ],
  fixtures: [{ id: 'counter', x: 3, z: 2, w: 4, d: 1 }],
  host: { x: 5, z: 1.4 },
  // display spots in fill order (stock is sorted tools, seeds, saplings, fruit, furniture, wall, floor):
  // tools on the left wall, garden goods on the right wall, furniture on tables, rolls at the back
  shelves: [
    { x: 0, z: 1, kind: 'wall' },
    { x: 0, z: 2, kind: 'wall' },
    { x: 0, z: 3, kind: 'wall' },
    { x: 0, z: 4, kind: 'wall' },
    { x: 0, z: 5, kind: 'wall' },
    { x: 9, z: 1, kind: 'wall' },
    { x: 9, z: 2, kind: 'wall' },
    { x: 9, z: 3, kind: 'wall' },
    { x: 9, z: 4, kind: 'wall' },
    { x: 9, z: 5, kind: 'wall' },
    { x: 8, z: 0, kind: 'wall' },
    { x: 7, z: 0, kind: 'wall' },
    { x: 2, z: 4, kind: 'table' },
    { x: 3, z: 4, kind: 'table' },
    { x: 6, z: 4, kind: 'table' },
    { x: 7, z: 4, kind: 'table' },
    { x: 2, z: 6, kind: 'table' },
    { x: 1, z: 0, kind: 'wall' },
    { x: 2, z: 0, kind: 'wall' },
    { x: 7, z: 6, kind: 'table' },
    { x: 3, z: 6, kind: 'table' },
    { x: 6, z: 6, kind: 'table' },
  ],
};
