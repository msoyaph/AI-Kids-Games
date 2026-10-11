// Furniture and interior surfaces (wallpaper / flooring) for the tent / house and the island.
// Sell prices of craftable pieces are ~1.3x the value of their recipe ingredients (see recipes.ts);
// buy > 0 means the piece can appear in the rotating shop (buy ~ 4x sell).
import type { FurnitureDef, SurfaceDef } from './types';

export const FURNITURE: FurnitureDef[] = [
  // ---- Starter recipes ----
  {
    id: 'furn_plank_table', name: 'Sunbleached Plank Table', price: 230, buy: 0, tags: ['plain', 'nature'],
    desc: 'A sturdy table of sun-faded planks. Perfect for suppers and jigsaw puzzles.',
    furn: { w: 2, d: 1, model: 'table', color: 0xe8cfa4, color2: 0xc9a477, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_twiggy_chair', name: 'Twiggy Chair', price: 140, buy: 0, tags: ['nature', 'plain'],
    desc: 'Bent twigs lashed into a surprisingly comfy seat.',
    furn: { w: 1, d: 1, model: 'chair', color: 0xd9b48a, color2: 0xa9d18e, outdoor: false, decor: 1 },
  },
  {
    id: 'furn_strawdream_bed', name: 'Strawdream Bed', price: 380, buy: 0, tags: ['cozy', 'nature'],
    desc: 'Stuffed with sweet-smelling straw. Sleep comes quickly here.',
    furn: { w: 2, d: 2, model: 'bed', color: 0xf3e2b3, color2: 0xb8dff0, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_hearthstone_bonfire', name: 'Hearthstone Bonfire', price: 170, buy: 0, tags: ['cozy', 'nature'],
    desc: 'A ring of warm stones around a crackling fire. Gather round!',
    furn: { w: 1, d: 1, model: 'bonfire', color: 0xc8c2d4, color2: 0xffb37a, outdoor: true, decor: 4 },
  },
  {
    id: 'furn_pastel_picket', name: 'Pastel Picket Fence', price: 130, buy: 0, tags: ['cute', 'plain'],
    desc: 'A little fence painted the color of a spring morning.',
    furn: { w: 1, d: 1, model: 'fence', color: 0xfdf3f6, color2: 0xbfe3d0, outdoor: true, decor: 2 },
  },
  {
    id: 'furn_howdy_signpost', name: 'Howdy Signpost', price: 100, buy: 0, tags: ['cute', 'plain'],
    desc: 'A cheerful wooden sign that greets everyone who wanders by.',
    furn: { w: 1, d: 1, model: 'sign', color: 0xe6c9a0, color2: 0xfff1d6, outdoor: true, decor: 2 },
  },
  {
    id: 'furn_terracotta_planter', name: 'Terracotta Planter', price: 260, buy: 1040, tags: ['nature', 'cute'],
    desc: 'A chubby clay pot with a sunny bloom poking out the top.',
    furn: { w: 1, d: 1, model: 'planter', color: 0xe8a888, color2: 0xffe066, outdoor: true, decor: 3 },
  },
  {
    id: 'furn_mossback_bench', name: 'Mossback Bench', price: 220, buy: 0, tags: ['nature', 'cozy'],
    desc: 'A fallen log smoothed into a bench. The moss grows on it for free.',
    furn: { w: 2, d: 1, model: 'bench', color: 0xc9a477, color2: 0xa8d69a, outdoor: true, decor: 3 },
  },
  {
    id: 'furn_pocket_fern', name: 'Pocket Fern', price: 140, buy: 0, tags: ['nature', 'plain'],
    desc: 'A small, frilly fern in a clay cup. Loves a shady corner.',
    furn: { w: 1, d: 1, model: 'plant', color: 0x9fd38a, color2: 0xe8a888, outdoor: false, decor: 1 },
  },
  {
    id: 'furn_seaside_crate', name: 'Seaside Crate', price: 170, buy: 0, tags: ['plain', 'retro'],
    desc: 'A salty old shipping crate. Good for sitting, stacking or storing.',
    furn: { w: 1, d: 1, model: 'box', color: 0xd9b48a, color2: 0x9fc9e0, outdoor: false, decor: 1 },
  },

  // ---- Story & errand rewards ----
  {
    id: 'furn_driftwood_stool', name: 'Driftwood Stool', price: 130, buy: 0, tags: ['nature', 'sea'],
    desc: 'Carved from silvery driftwood. Smells faintly of the sea.',
    furn: { w: 1, d: 1, model: 'stool', color: 0xd8cfc0, color2: 0xb8a68e, outdoor: false, decor: 1 },
  },
  {
    id: 'furn_wick_lantern', name: 'Wick Lantern', price: 160, buy: 0, tags: ['cozy', 'retro'],
    desc: 'A homemade lantern with a fat wax wick. Glows gently all night.',
    furn: { w: 1, d: 1, model: 'lantern', color: 0xf3d9a4, color2: 0xffe27a, outdoor: true, decor: 2 },
  },
  {
    id: 'furn_woven_rug', name: 'Woven Rug', price: 170, buy: 0, tags: ['cozy', 'nature'],
    desc: 'A round rug braided from weed fiber and dyed with river clay.',
    furn: { w: 2, d: 2, model: 'rug', color: 0xe6c9a0, color2: 0xd99a7a, outdoor: false, rug: true, decor: 1 },
  },
  {
    id: 'furn_lantern_post', name: 'Lantern Post', price: 1300, buy: 0, tags: ['retro', 'shiny'],
    desc: 'A tall post that holds a lantern high above the path.',
    furn: { w: 1, d: 1, model: 'streetlamp', color: 0x9aa3b8, color2: 0xfff1a8, outdoor: true, decor: 5 },
  },
  {
    id: 'furn_tidecurl_fountain', name: 'Tidecurl Fountain', price: 1520, buy: 0, tags: ['sea', 'fancy'],
    desc: 'Water spills from a curling scallop into a pebbled basin.',
    furn: { w: 2, d: 2, model: 'fountain', color: 0xd8ecf5, color2: 0xffc2b3, outdoor: true, decor: 8 },
  },
  {
    id: 'furn_wishing_well', name: 'Pebble Wishing Well', price: 940, buy: 0, tags: ['nature', 'retro'],
    desc: 'Drop in a pebble and make a wish. The echo always sounds hopeful.',
    furn: { w: 2, d: 2, model: 'well', color: 0xc8c2d4, color2: 0xd9b48a, outdoor: true, decor: 7 },
  },
  {
    id: 'furn_bellbloom_arbor', name: 'Bellbloom Arbor', price: 570, buy: 0, tags: ['nature', 'cute'],
    desc: 'A leafy archway twined with bellblooms and puffcaps.',
    furn: { w: 2, d: 1, model: 'arch', color: 0xa8d69a, color2: 0xf7a8b8, outdoor: true, decor: 5 },
  },
  {
    id: 'furn_breeze_pennant', name: 'Breeze Pennant', price: 230, buy: 0, tags: ['sporty', 'cute'],
    desc: 'A bright flag that flaps hello whenever the wind passes through.',
    furn: { w: 1, d: 1, model: 'flag', color: 0xffb3a7, color2: 0xfff1d6, outdoor: true, decor: 3 },
  },
  {
    id: 'furn_whistling_kettle', name: 'Whistling Kettle', price: 490, buy: 1960, tags: ['food', 'cozy'],
    desc: 'Sings a little song the moment the tea is ready.',
    furn: { w: 1, d: 1, model: 'kettle', color: 0xbfe3d0, color2: 0xfff6ea, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_snugglewarm_stove', name: 'Snugglewarm Stove', price: 820, buy: 0, tags: ['cozy', 'retro'],
    desc: 'A round-bellied stove that keeps the whole room toasty.',
    furn: { w: 1, d: 1, model: 'stove', color: 0xf2b8a0, color2: 0x9aa3b8, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_driftwood_shelf', name: 'Driftwood Shelf', price: 350, buy: 1400, tags: ['sea', 'nature'],
    desc: 'Knobbly driftwood planks with room for books, jars and shells.',
    furn: { w: 2, d: 1, model: 'shelf', color: 0xd8cfc0, color2: 0xffc2b3, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_puffmoss_cushion', name: 'Puffmoss Cushion', price: 140, buy: 0, tags: ['cozy', 'cute'],
    desc: 'A plump floor cushion stuffed with puffcap fluff.',
    furn: { w: 1, d: 1, model: 'cushion', color: 0xd8f0d0, color2: 0xfdfbf4, outdoor: false, decor: 1 },
  },
  {
    id: 'furn_sunpeek_sundial', name: 'Sunpeek Sundial', price: 390, buy: 0, tags: ['science', 'retro'],
    desc: 'Tells the time, but only when the sun feels like peeking out.',
    furn: { w: 1, d: 1, model: 'sundial', color: 0xd6d2e0, color2: 0xffe27a, outdoor: true, decor: 4 },
  },
  {
    id: 'furn_scribbler_desk', name: 'Scribbler Desk', price: 430, buy: 1720, tags: ['plain', 'artsy'],
    desc: 'A writing desk with one wobbly leg and a drawer full of doodles.',
    furn: { w: 2, d: 1, model: 'desk', color: 0xe0c49a, color2: 0xbfe3f2, outdoor: false, decor: 2 },
  },

  // ---- Message-bottle recipe cards ----
  {
    id: 'furn_moonbeam_lamp', name: 'Moonbeam Lamp', price: 790, buy: 3160, tags: ['shiny', 'cozy'],
    desc: 'A frosted globe that glows like a captured sliver of moonlight.',
    furn: { w: 1, d: 1, model: 'lamp', color: 0xe8e4ff, color2: 0xfff6c9, outdoor: false, decor: 3 },
  },
  {
    id: 'furn_puffcloud_sofa', name: 'Puffcloud Sofa', price: 620, buy: 0, tags: ['cozy', 'cute'],
    desc: 'So soft you might float away. Made from two very loyal cushions.',
    furn: { w: 2, d: 1, model: 'sofa', color: 0xdcefff, color2: 0xfdfbf4, outdoor: false, decor: 3 },
  },
  {
    id: 'furn_tideside_bench', name: 'Tideside Bench', price: 660, buy: 0, tags: ['sea', 'nature'],
    desc: 'A mossback bench dressed up in seashells for a day at the beach.',
    furn: { w: 2, d: 1, model: 'bench', color: 0xd8cfc0, color2: 0xffc2b3, outdoor: true, decor: 4 },
  },
  {
    id: 'furn_shellsong_chime', name: 'Shellsong Chime', price: 470, buy: 0, tags: ['sea', 'music'],
    desc: 'Spiral shells on fiber strings. Every breeze plays a new tune.',
    furn: { w: 1, d: 1, model: 'windchime', color: 0xf7d9c4, color2: 0xb8dff0, outdoor: true, decor: 3 },
  },
  {
    id: 'furn_glowcap_lamp', name: 'Glowcap Lamp', price: 720, buy: 2880, tags: ['spooky', 'nature', 'cute'],
    desc: 'A toadstool-shaped lamp that glimmers softly after dusk.',
    furn: { w: 1, d: 1, model: 'mushroom', color: 0xffb3c6, color2: 0xfff6c9, outdoor: true, decor: 3 },
  },
  {
    id: 'furn_picnic_spread', name: 'Sunny Picnic Spread', price: 390, buy: 0, tags: ['food', 'cute'],
    desc: 'A checkered blanket, a basket and fruit for two. Ants not included.',
    furn: { w: 2, d: 1, model: 'picnic', color: 0xffc2c2, color2: 0xfdfbf4, outdoor: true, decor: 4 },
  },
  {
    id: 'furn_wrenhaven_birdhouse', name: 'Wrenhaven Birdhouse', price: 230, buy: 920, tags: ['nature', 'cute'],
    desc: 'A tiny house on a pole. The tenants pay their rent in songs.',
    furn: { w: 1, d: 1, model: 'birdhouse', color: 0xbfe3d0, color2: 0xf7a8b8, outdoor: true, decor: 3 },
  },
  {
    id: 'furn_cider_barrel', name: 'Sunplum Cider Barrel', price: 690, buy: 2760, tags: ['food', 'retro'],
    desc: 'Something fizzy and golden sloshes around inside.',
    furn: { w: 1, d: 1, model: 'barrel', color: 0xd9b48a, color2: 0xffd27a, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_seabreeze_hammock', name: 'Seabreeze Hammock', price: 550, buy: 0, tags: ['cozy', 'sea'],
    desc: 'Strung between two posts, with a coconut cup holder for long, lazy afternoons.',
    furn: { w: 2, d: 1, model: 'hammock', color: 0xf3e2b3, color2: 0x9fd9cf, outdoor: true, decor: 4 },
  },
  {
    id: 'furn_daydream_easel', name: 'Daydream Easel', price: 400, buy: 1600, tags: ['artsy'],
    desc: 'Holds a half-finished painting of somewhere you have never been.',
    furn: { w: 1, d: 1, model: 'easel', color: 0xe0c49a, color2: 0xffd6e0, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_hootwhistle_clock', name: 'Hootwhistle Clock', price: 370, buy: 1480, tags: ['retro', 'cute'],
    desc: 'An owl pops out every hour to hoot the time, then goes back to napping.',
    furn: { w: 1, d: 1, model: 'clock', color: 0xc9a477, color2: 0xfff1d6, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_bubble_tv', name: 'Bubble-Screen TV', price: 1270, buy: 5080, tags: ['retro', 'science'],
    desc: 'A rounded old set that only gets the weather channel. That is plenty.',
    furn: { w: 1, d: 1, model: 'tv', color: 0xbfe3f2, color2: 0xf7a8b8, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_starmap_globe', name: 'Starmap Globe', price: 790, buy: 3160, tags: ['science', 'retro'],
    desc: 'Shows the islands below and the constellations above.',
    furn: { w: 1, d: 1, model: 'globe', color: 0x9fc9e0, color2: 0xffe27a, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_hollyhock_wardrobe', name: 'Hollyhock Wardrobe', price: 780, buy: 3120, tags: ['cozy', 'cute'],
    desc: 'Painted with hollyhocks, so your clothes always smell like summer.',
    furn: { w: 1, d: 1, model: 'wardrobe', color: 0xf7d6e0, color2: 0xa8d69a, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_bellbloom_vase', name: 'Bellbloom Vase', price: 310, buy: 1240, tags: ['cute', 'nature'],
    desc: 'A glazed vase holding a bunch of fresh bellblooms.',
    furn: { w: 1, d: 1, model: 'vase', color: 0xbfe3f2, color2: 0xf7a8a8, outdoor: false, decor: 1 },
  },

  // ---- Villager friendship gifts ----
  {
    id: 'furn_keepsake_frame', name: 'Keepsake Frame', price: 220, buy: 0, tags: ['artsy', 'cute'],
    desc: 'Holds a photo of a dear friend. Made with love, given with more.',
    furn: { w: 1, d: 1, model: 'frame', color: 0xffd6e0, color2: 0xfff6ea, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_honeycomb_dresser', name: 'Honeycomb Dresser', price: 720, buy: 0, tags: ['cute', 'sweet'],
    desc: 'Six little drawers, each shaped like a cell of honeycomb.',
    furn: { w: 2, d: 1, model: 'dresser', color: 0xffe8a3, color2: 0xf3c57a, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_lullaby_piano', name: 'Lullaby Piano', price: 2340, buy: 0, tags: ['music', 'fancy'],
    desc: 'Its keys play softly, as if trying not to wake anyone.',
    furn: { w: 2, d: 1, model: 'piano', color: 0xfdfbf4, color2: 0xb9b0e8, outdoor: false, decor: 3 },
  },
  {
    id: 'furn_storyteller_bookcase', name: 'Storyteller Bookcase', price: 350, buy: 0, tags: ['retro', 'artsy'],
    desc: 'Packed with tales your neighbors swear are mostly true.',
    furn: { w: 2, d: 1, model: 'bookcase', color: 0xc9a477, color2: 0xb8dff0, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_teacup_table', name: 'Teacup Table', price: 490, buy: 0, tags: ['sweet', 'cute', 'food'],
    desc: 'A little round table shaped like a giant teacup. Sip responsibly.',
    furn: { w: 1, d: 1, model: 'table', color: 0xffd6e0, color2: 0xfdfbf4, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_stargazer_telescope', name: 'Stargazer Telescope', price: 1440, buy: 0, tags: ['science', 'shiny'],
    desc: 'Point it skyward on a clear night and count the shooting stars.',
    furn: { w: 1, d: 1, model: 'telescope', color: 0xb9b0e8, color2: 0xffe27a, outdoor: false, decor: 3 },
  },

  // ---- Lumen exchange exclusives ----
  {
    id: 'furn_beacon_statue', name: 'Beacon Keeper Statue', price: 4750, buy: 0, tags: ['fancy', 'shiny'],
    desc: 'A stone keeper raising a glowing lamp to guide the boats home.',
    furn: { w: 2, d: 2, model: 'statue', color: 0xe6e2f0, color2: 0xfff1a8, outdoor: true, decor: 8 },
  },
  {
    id: 'furn_prism_lamppost', name: 'Prism Lamppost', price: 4030, buy: 0, tags: ['shiny', 'fancy'],
    desc: 'A lantern post crowned with a prism that scatters tiny rainbows.',
    furn: { w: 1, d: 1, model: 'streetlamp', color: 0xe8e4ff, color2: 0xffd6f0, outdoor: true, decor: 6 },
  },
  {
    id: 'furn_starglimmer_rug', name: 'Starglimmer Rug', price: 1820, buy: 0, tags: ['shiny', 'cozy'],
    desc: 'Woven with threads that twinkle faintly, like a night sky underfoot.',
    furn: { w: 3, d: 2, model: 'rug', color: 0xb9c4f2, color2: 0xfff6c9, outdoor: false, rug: true, decor: 3 },
  },

  // ---- Museum wing rewards ----
  {
    id: 'furn_tidepool_tank', name: 'Tidepool Tank', price: 1500, buy: 0, tags: ['sea', 'science'],
    desc: 'A little slice of the shallows, complete with swaying coral.',
    furn: { w: 2, d: 1, model: 'tank', color: 0xbfe9f2, color2: 0xff9fb0, outdoor: false, decor: 3 },
  },
  {
    id: 'furn_critter_terrarium', name: 'Critter Terrarium', price: 690, buy: 0, tags: ['nature', 'science'],
    desc: 'A glass home of leaves and twigs where tiny critters thrive.',
    furn: { w: 1, d: 1, model: 'tank', color: 0xd8f0d0, color2: 0xc9a477, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_wingbone_statue', name: 'Wingbone Fossil Statue', price: 880, buy: 0, tags: ['science', 'retro'],
    desc: 'A stone tribute to a long-gone flyer, wings spread wide.',
    furn: { w: 1, d: 1, model: 'statue', color: 0xe6dccb, color2: 0xc8b89a, outdoor: true, decor: 7 },
  },

  // ---- Shop only (rotating stock) ----
  {
    id: 'furn_gumdrop_chair', name: 'Gumdrop Chair', price: 180, buy: 720, tags: ['sweet', 'cute'],
    desc: 'Squishy, round and candy-colored. Please do not lick.',
    furn: { w: 1, d: 1, model: 'chair', color: 0xffb3c6, color2: 0xb8f0d8, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_wavesong_painting', name: 'Wavesong Painting', price: 400, buy: 1600, tags: ['artsy', 'sea'],
    desc: 'A painting of the sea so calm you can almost hear it.',
    furn: { w: 1, d: 1, model: 'frame', color: 0x9fd9cf, color2: 0xfff6ea, outdoor: false, decor: 2 },
  },
  {
    id: 'furn_marshmallow_loveseat', name: 'Marshmallow Loveseat', price: 520, buy: 2080, tags: ['sweet', 'cozy'],
    desc: 'Toasty-golden and puffy. Seats two very relaxed friends.',
    furn: { w: 2, d: 1, model: 'sofa', color: 0xfff6ea, color2: 0xf3d9a4, outdoor: false, decor: 3 },
  },
  {
    id: 'furn_clamshell_bed', name: 'Clamshell Bed', price: 950, buy: 3800, tags: ['sea', 'fancy'],
    desc: 'Sleep tucked inside a giant pearly shell. Dreams of the deep guaranteed.',
    furn: { w: 2, d: 2, model: 'bed', color: 0xffe3ec, color2: 0xd8ecff, outdoor: false, decor: 3 },
  },
  {
    id: 'furn_berrypatch_rug', name: 'Berrypatch Rug', price: 300, buy: 1200, tags: ['sweet', 'cute'],
    desc: 'A rug patterned with plump berries. Feels sweet underfoot.',
    furn: { w: 3, d: 2, model: 'rug', color: 0xffc2d1, color2: 0xb8e0a8, outdoor: false, rug: true, decor: 2 },
  },
  {
    id: 'furn_pebble_owl_statue', name: 'Pebble Owl Statue', price: 650, buy: 2600, tags: ['cute', 'nature'],
    desc: 'A round stone owl who keeps a watchful eye on the garden.',
    furn: { w: 1, d: 1, model: 'statue', color: 0xd6d2e0, color2: 0xffe27a, outdoor: true, decor: 5 },
  },

  // ---- Event trophies (prizes only) ----
  {
    id: 'furn_trophy_gold', name: 'Golden Glimmer Cup', price: 2000, buy: 0, tags: ['shiny', 'sporty'],
    desc: 'First prize! It shines almost as brightly as your grin.',
    furn: { w: 1, d: 1, model: 'trophy', color: 0xffd970, color2: 0xfff6c9, outdoor: false, decor: 3 },
  },
  {
    id: 'furn_trophy_silver', name: 'Silver Ripple Cup', price: 1000, buy: 0, tags: ['shiny', 'sporty'],
    desc: 'A gleaming second-place cup. So close you could taste it.',
    furn: { w: 1, d: 1, model: 'trophy', color: 0xdfe6f0, color2: 0xffffff, outdoor: false, decor: 3 },
  },
  {
    id: 'furn_trophy_bronze', name: 'Bronze Sprout Cup', price: 500, buy: 0, tags: ['shiny', 'sporty'],
    desc: 'A warm little cup for a fine third place. Every champion starts somewhere.',
    furn: { w: 1, d: 1, model: 'trophy', color: 0xe8b48a, color2: 0xfff1d6, outdoor: false, decor: 2 },
  },
];

export const SURFACES: SurfaceDef[] = [
  // ---- Wallpaper ----
  { id: 'wall_canvas', name: 'Canvas Tent Wall', kind: 'wallpaper', price: 0, buy: 0, c: 0xf3e6c8, c2: 0xe6d3ad, pattern: 'plain' },
  { id: 'wall_seafoam_stripe', name: 'Seafoam Stripe Wall', kind: 'wallpaper', price: 200, buy: 800, c: 0xd4f2e8, c2: 0xa8e0d0, pattern: 'stripe' },
  { id: 'wall_peach_gingham', name: 'Peach Gingham Wall', kind: 'wallpaper', price: 180, buy: 720, c: 0xffe3d1, c2: 0xffc2a8, pattern: 'check' },
  { id: 'wall_berry_dots', name: 'Berry Dot Wall', kind: 'wallpaper', price: 220, buy: 880, c: 0xfff0f4, c2: 0xffa8c0, pattern: 'dots' },
  { id: 'wall_midnight_twinkle', name: 'Midnight Twinkle Wall', kind: 'wallpaper', price: 450, buy: 1800, c: 0x8f94c8, c2: 0xfff1a8, pattern: 'stars' },
  { id: 'wall_tidewave', name: 'Tidewave Wall', kind: 'wallpaper', price: 350, buy: 1400, c: 0xcfeaf7, c2: 0x9fd0ec, pattern: 'waves' },
  { id: 'wall_birch_panel', name: 'Birch Panel Wall', kind: 'wallpaper', price: 260, buy: 1040, c: 0xf2e2c4, c2: 0xdcc39c, pattern: 'planks' },
  { id: 'wall_mint_tile', name: 'Mint Bathhouse Tile', kind: 'wallpaper', price: 300, buy: 1200, c: 0xe0f7ec, c2: 0xb8e6d0, pattern: 'tiles' },
  { id: 'wall_lavender_haze', name: 'Lavender Haze Wall', kind: 'wallpaper', price: 120, buy: 480, c: 0xe6dcf7, c2: 0xd4c6ef, pattern: 'plain' },
  { id: 'wall_lemonade_stripe', name: 'Lemonade Stripe Wall', kind: 'wallpaper', price: 160, buy: 640, c: 0xfff8d6, c2: 0xffe999, pattern: 'stripe' },

  // ---- Flooring ----
  { id: 'floor_grass', name: 'Grassy Tent Floor', kind: 'flooring', price: 0, buy: 0, c: 0xa8d890, c2: 0x94c97c, pattern: 'plain' },
  { id: 'floor_honey_planks', name: 'Honey Plank Floor', kind: 'flooring', price: 240, buy: 960, c: 0xe8c48e, c2: 0xd4a970, pattern: 'planks' },
  { id: 'floor_cream_checker', name: 'Cream Checker Floor', kind: 'flooring', price: 200, buy: 800, c: 0xfff6e6, c2: 0xe8d8c0, pattern: 'check' },
  { id: 'floor_sandy_shore', name: 'Sandy Shore Floor', kind: 'flooring', price: 160, buy: 640, c: 0xf7e6c4, c2: 0xe8cfa0, pattern: 'dots' },
  { id: 'floor_shallow_tide', name: 'Shallow Tide Floor', kind: 'flooring', price: 380, buy: 1520, c: 0xbfe6f2, c2: 0x94d0e6, pattern: 'waves' },
  { id: 'floor_rosewater_tile', name: 'Rosewater Tile Floor', kind: 'flooring', price: 320, buy: 1280, c: 0xffe0e8, c2: 0xf7c2d0, pattern: 'tiles' },
  { id: 'floor_stardust', name: 'Stardust Floor', kind: 'flooring', price: 550, buy: 2200, c: 0x9fa4d8, c2: 0xfff1a8, pattern: 'stars' },
  { id: 'floor_moss_carpet', name: 'Mossy Carpet', kind: 'flooring', price: 140, buy: 560, c: 0xc4e6b0, c2: 0xb0d89c, pattern: 'plain' },
  { id: 'floor_driftwood_deck', name: 'Driftwood Deck', kind: 'flooring', price: 280, buy: 1120, c: 0xe0d6c6, c2: 0xc8bca8, pattern: 'planks' },
  { id: 'floor_candy_stripe', name: 'Candy Stripe Floor', kind: 'flooring', price: 220, buy: 880, c: 0xfff0f4, c2: 0xc8ecff, pattern: 'stripe' },
];
