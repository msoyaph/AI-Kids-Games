// Crafting recipes: tools, festival lanterns and furniture.
// unlock: how the recipe is learned ('start' known from day one, 'mission' story/errands,
// 'card' message bottles, 'friend' villager gifts, 'lumen' Lumen exchange, 'museum' museum wings).
import type { RecipeDef } from './types';

export const RECIPES: RecipeDef[] = [
  // ---- Tools & festival lanterns ----
  { id: 'r_net_flimsy', result: 'net_flimsy', ingredients: [{ id: 'branch', qty: 5 }], unlock: 'mission' },
  { id: 'r_rod_flimsy', result: 'rod_flimsy', ingredients: [{ id: 'branch', qty: 5 }], unlock: 'mission' },
  { id: 'r_axe_flimsy', result: 'axe_flimsy', ingredients: [{ id: 'branch', qty: 4 }, { id: 'stone', qty: 1 }], unlock: 'mission' },
  { id: 'r_shovel_flimsy', result: 'shovel_flimsy', ingredients: [{ id: 'branch', qty: 4 }, { id: 'stone', qty: 1 }], unlock: 'mission' },
  { id: 'r_can_flimsy', result: 'can_flimsy', ingredients: [{ id: 'branch', qty: 3 }, { id: 'clay', qty: 2 }], unlock: 'mission' },
  { id: 'r_net', result: 'net', ingredients: [{ id: 'net_flimsy', qty: 1 }, { id: 'iron', qty: 3 }], unlock: 'mission' },
  { id: 'r_rod', result: 'rod', ingredients: [{ id: 'rod_flimsy', qty: 1 }, { id: 'iron', qty: 3 }], unlock: 'mission' },
  { id: 'r_axe', result: 'axe', ingredients: [{ id: 'axe_flimsy', qty: 1 }, { id: 'iron', qty: 3 }, { id: 'timber', qty: 2 }], unlock: 'mission' },
  { id: 'r_shovel', result: 'shovel', ingredients: [{ id: 'shovel_flimsy', qty: 1 }, { id: 'iron', qty: 3 }], unlock: 'mission' },
  { id: 'r_can', result: 'can', ingredients: [{ id: 'can_flimsy', qty: 1 }, { id: 'iron', qty: 3 }], unlock: 'mission' },
  { id: 'r_ladder', result: 'ladder', ingredients: [{ id: 'timber', qty: 8 }, { id: 'fiber', qty: 4 }], unlock: 'mission' },
  { id: 'r_lantern_kit', result: 'lantern_kit', qty: 2, ingredients: [{ id: 'fiber', qty: 3 }, { id: 'glowstone', qty: 1 }, { id: 'timber', qty: 2 }], unlock: 'mission' },

  // ---- Furniture: Starter recipes ----
  { id: 'r_furn_plank_table', result: 'furn_plank_table', ingredients: [{ id: 'timber', qty: 6 }], unlock: 'start' },
  { id: 'r_furn_twiggy_chair', result: 'furn_twiggy_chair', ingredients: [{ id: 'timber', qty: 3 }, { id: 'branch', qty: 4 }], unlock: 'start' },
  { id: 'r_furn_strawdream_bed', result: 'furn_strawdream_bed', ingredients: [{ id: 'timber', qty: 8 }, { id: 'fiber', qty: 10 }], unlock: 'start' },
  { id: 'r_furn_hearthstone_bonfire', result: 'furn_hearthstone_bonfire', ingredients: [{ id: 'branch', qty: 6 }, { id: 'stone', qty: 4 }], unlock: 'start' },
  { id: 'r_furn_pastel_picket', result: 'furn_pastel_picket', ingredients: [{ id: 'timber', qty: 3 }, { id: 'branch', qty: 2 }], unlock: 'start' },
  { id: 'r_furn_howdy_signpost', result: 'furn_howdy_signpost', ingredients: [{ id: 'timber', qty: 2 }, { id: 'branch', qty: 3 }], unlock: 'start' },
  { id: 'r_furn_terracotta_planter', result: 'furn_terracotta_planter', ingredients: [{ id: 'clay', qty: 3 }, { id: 'flower_sun_yellow', qty: 2 }], unlock: 'start' },
  { id: 'r_furn_mossback_bench', result: 'furn_mossback_bench', ingredients: [{ id: 'timber', qty: 5 }, { id: 'fiber', qty: 4 }], unlock: 'start' },
  { id: 'r_furn_pocket_fern', result: 'furn_pocket_fern', ingredients: [{ id: 'clay', qty: 2 }, { id: 'fiber', qty: 6 }], unlock: 'start' },
  { id: 'r_furn_seaside_crate', result: 'furn_seaside_crate', ingredients: [{ id: 'timber', qty: 4 }, { id: 'branch', qty: 2 }], unlock: 'start' },

  // ---- Furniture: Story & errand rewards ----
  { id: 'r_furn_driftwood_stool', result: 'furn_driftwood_stool', ingredients: [{ id: 'timber', qty: 3 }, { id: 'branch', qty: 2 }], unlock: 'mission' },
  { id: 'r_furn_wick_lantern', result: 'furn_wick_lantern', ingredients: [{ id: 'branch', qty: 4 }, { id: 'fiber', qty: 4 }, { id: 'clay', qty: 2 }], unlock: 'mission' },
  { id: 'r_furn_woven_rug', result: 'furn_woven_rug', ingredients: [{ id: 'fiber', qty: 10 }, { id: 'clay', qty: 2 }], unlock: 'mission' },
  { id: 'r_furn_lantern_post', result: 'furn_lantern_post', ingredients: [{ id: 'furn_wick_lantern', qty: 1 }, { id: 'iron', qty: 2 }, { id: 'glowstone', qty: 1 }, { id: 'timber', qty: 3 }], unlock: 'mission' },
  { id: 'r_furn_tidecurl_fountain', result: 'furn_tidecurl_fountain', ingredients: [{ id: 'stone', qty: 10 }, { id: 'shell_scallop', qty: 4 }, { id: 'shell_coral', qty: 2 }, { id: 'iron', qty: 2 }], unlock: 'mission' },
  { id: 'r_furn_wishing_well', result: 'furn_wishing_well', ingredients: [{ id: 'stone', qty: 12 }, { id: 'timber', qty: 4 }, { id: 'iron', qty: 2 }], unlock: 'mission' },
  { id: 'r_furn_bellbloom_arbor', result: 'furn_bellbloom_arbor', ingredients: [{ id: 'timber', qty: 6 }, { id: 'fiber', qty: 4 }, { id: 'flower_bell_red', qty: 3 }, { id: 'flower_puff_white', qty: 3 }], unlock: 'mission' },
  { id: 'r_furn_breeze_pennant', result: 'furn_breeze_pennant', ingredients: [{ id: 'fiber', qty: 8 }, { id: 'timber', qty: 2 }, { id: 'flower_lantern_red', qty: 2 }], unlock: 'mission' },
  { id: 'r_furn_whistling_kettle', result: 'furn_whistling_kettle', ingredients: [{ id: 'iron', qty: 2 }, { id: 'clay', qty: 2 }], unlock: 'mission' },
  { id: 'r_furn_snugglewarm_stove', result: 'furn_snugglewarm_stove', ingredients: [{ id: 'iron', qty: 3 }, { id: 'stone', qty: 4 }, { id: 'clay', qty: 2 }], unlock: 'mission' },
  { id: 'r_furn_driftwood_shelf', result: 'furn_driftwood_shelf', ingredients: [{ id: 'timber', qty: 5 }, { id: 'shell_spiral', qty: 2 }], unlock: 'mission' },
  { id: 'r_furn_puffmoss_cushion', result: 'furn_puffmoss_cushion', ingredients: [{ id: 'fiber', qty: 6 }, { id: 'flower_puff_white', qty: 2 }], unlock: 'mission' },
  { id: 'r_furn_sunpeek_sundial', result: 'furn_sunpeek_sundial', ingredients: [{ id: 'stone', qty: 6 }, { id: 'iron', qty: 1 }], unlock: 'mission' },
  { id: 'r_furn_scribbler_desk', result: 'furn_scribbler_desk', ingredients: [{ id: 'timber', qty: 6 }, { id: 'iron', qty: 1 }], unlock: 'mission' },

  // ---- Furniture: Message-bottle recipe cards ----
  { id: 'r_furn_moonbeam_lamp', result: 'furn_moonbeam_lamp', ingredients: [{ id: 'glowstone', qty: 1 }, { id: 'clay', qty: 2 }, { id: 'flower_moon_white', qty: 2 }], unlock: 'card' },
  { id: 'r_furn_puffcloud_sofa', result: 'furn_puffcloud_sofa', ingredients: [{ id: 'furn_puffmoss_cushion', qty: 2 }, { id: 'timber', qty: 6 }, { id: 'fiber', qty: 4 }], unlock: 'card' },
  { id: 'r_furn_tideside_bench', result: 'furn_tideside_bench', ingredients: [{ id: 'furn_mossback_bench', qty: 1 }, { id: 'shell_spiral', qty: 4 }, { id: 'stone', qty: 2 }], unlock: 'card' },
  { id: 'r_furn_shellsong_chime', result: 'furn_shellsong_chime', ingredients: [{ id: 'shell_spiral', qty: 3 }, { id: 'shell_scallop', qty: 2 }, { id: 'branch', qty: 2 }, { id: 'fiber', qty: 3 }], unlock: 'card' },
  { id: 'r_furn_glowcap_lamp', result: 'furn_glowcap_lamp', ingredients: [{ id: 'clay', qty: 2 }, { id: 'glowstone', qty: 1 }, { id: 'fiber', qty: 4 }], unlock: 'card' },
  { id: 'r_furn_picnic_spread', result: 'furn_picnic_spread', ingredients: [{ id: 'fiber', qty: 8 }, { id: 'timber', qty: 2 }, { id: 'fruit_blushpear', qty: 2 }], unlock: 'card' },
  { id: 'r_furn_wrenhaven_birdhouse', result: 'furn_wrenhaven_birdhouse', ingredients: [{ id: 'timber', qty: 4 }, { id: 'branch', qty: 3 }, { id: 'clay', qty: 1 }], unlock: 'card' },
  { id: 'r_furn_cider_barrel', result: 'furn_cider_barrel', ingredients: [{ id: 'timber', qty: 6 }, { id: 'iron', qty: 1 }, { id: 'fruit_sunplum', qty: 2 }], unlock: 'card' },
  { id: 'r_furn_seabreeze_hammock', result: 'furn_seabreeze_hammock', ingredients: [{ id: 'fiber', qty: 10 }, { id: 'timber', qty: 4 }, { id: 'fruit_seacoconut', qty: 1 }], unlock: 'card' },
  { id: 'r_furn_daydream_easel', result: 'furn_daydream_easel', ingredients: [{ id: 'timber', qty: 5 }, { id: 'flower_sun_red', qty: 2 }, { id: 'flower_bell_yellow', qty: 2 }], unlock: 'card' },
  { id: 'r_furn_hootwhistle_clock', result: 'furn_hootwhistle_clock', ingredients: [{ id: 'timber', qty: 4 }, { id: 'iron', qty: 1 }, { id: 'branch', qty: 3 }], unlock: 'card' },
  { id: 'r_furn_bubble_tv', result: 'furn_bubble_tv', ingredients: [{ id: 'iron', qty: 3 }, { id: 'glowstone', qty: 1 }, { id: 'clay', qty: 2 }], unlock: 'card' },
  { id: 'r_furn_starmap_globe', result: 'furn_starmap_globe', ingredients: [{ id: 'timber', qty: 3 }, { id: 'iron', qty: 2 }, { id: 'shell_cowrie', qty: 1 }], unlock: 'card' },
  { id: 'r_furn_hollyhock_wardrobe', result: 'furn_hollyhock_wardrobe', ingredients: [{ id: 'timber', qty: 10 }, { id: 'iron', qty: 2 }], unlock: 'card' },
  { id: 'r_furn_bellbloom_vase', result: 'furn_bellbloom_vase', ingredients: [{ id: 'clay', qty: 2 }, { id: 'flower_bell_red', qty: 2 }, { id: 'flower_bell_white', qty: 2 }], unlock: 'card' },

  // ---- Furniture: Villager friendship gifts ----
  { id: 'r_furn_keepsake_frame', result: 'furn_keepsake_frame', ingredients: [{ id: 'timber', qty: 3 }, { id: 'shell_scallop', qty: 1 }], unlock: 'friend' },
  { id: 'r_furn_honeycomb_dresser', result: 'furn_honeycomb_dresser', ingredients: [{ id: 'timber', qty: 8 }, { id: 'iron', qty: 1 }, { id: 'shell_scallop', qty: 2 }], unlock: 'friend' },
  { id: 'r_furn_lullaby_piano', result: 'furn_lullaby_piano', ingredients: [{ id: 'timber', qty: 10 }, { id: 'iron', qty: 4 }, { id: 'shell_pearl', qty: 1 }], unlock: 'friend' },
  { id: 'r_furn_storyteller_bookcase', result: 'furn_storyteller_bookcase', ingredients: [{ id: 'timber', qty: 8 }, { id: 'fiber', qty: 6 }], unlock: 'friend' },
  { id: 'r_furn_teacup_table', result: 'furn_teacup_table', ingredients: [{ id: 'clay', qty: 3 }, { id: 'timber', qty: 2 }, { id: 'fruit_rubylychee', qty: 2 }], unlock: 'friend' },
  { id: 'r_furn_stargazer_telescope', result: 'furn_stargazer_telescope', ingredients: [{ id: 'iron', qty: 4 }, { id: 'glowstone', qty: 1 }, { id: 'timber', qty: 2 }], unlock: 'friend' },

  // ---- Furniture: Lumen exchange exclusives ----
  { id: 'r_furn_beacon_statue', result: 'furn_beacon_statue', ingredients: [{ id: 'stone', qty: 10 }, { id: 'glowstone', qty: 2 }, { id: 'starnugget', qty: 1 }], unlock: 'lumen', lumenCost: 2500 },
  { id: 'r_furn_prism_lamppost', result: 'furn_prism_lamppost', ingredients: [{ id: 'furn_lantern_post', qty: 1 }, { id: 'glowstone', qty: 2 }, { id: 'shell_pearl', qty: 1 }], unlock: 'lumen', lumenCost: 1500 },
  { id: 'r_furn_starglimmer_rug', result: 'furn_starglimmer_rug', ingredients: [{ id: 'fiber', qty: 12 }, { id: 'glowstone', qty: 2 }, { id: 'shell_cowrie', qty: 2 }], unlock: 'lumen', lumenCost: 800 },

  // ---- Furniture: Museum wing rewards ----
  { id: 'r_furn_tidepool_tank', result: 'furn_tidepool_tank', ingredients: [{ id: 'iron', qty: 3 }, { id: 'shell_coral', qty: 4 }, { id: 'stone', qty: 4 }], unlock: 'museum' },
  { id: 'r_furn_critter_terrarium', result: 'furn_critter_terrarium', ingredients: [{ id: 'iron', qty: 2 }, { id: 'timber', qty: 4 }, { id: 'fiber', qty: 6 }, { id: 'flower_star_yellow', qty: 2 }], unlock: 'museum' },
  { id: 'r_furn_wingbone_statue', result: 'furn_wingbone_statue', ingredients: [{ id: 'stone', qty: 12 }, { id: 'iron', qty: 2 }, { id: 'clay', qty: 2 }], unlock: 'museum' },
];
