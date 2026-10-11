// Clothing: tops, bottoms, dresses, hats, glasses, shoes and bags. All original designs.
// Dyed copies are the same item with "#<dye index>" on the end of the id (e.g. "cloth_sunny_tee#6"),
// so saves stay small and every piece can come in eight colors.
import type { ItemDef, RecipeDef } from './types';

export type ClothSlot = 'top' | 'bottom' | 'dress' | 'hat' | 'glasses' | 'shoes' | 'bag';
export const CLOTH_SLOTS: ClothSlot[] = ['top', 'bottom', 'dress', 'hat', 'glasses', 'shoes', 'bag'];
export const SLOT_LABEL: Record<ClothSlot, string> = { top: 'Tops', bottom: 'Bottoms', dress: 'Dresses', hat: 'Hats', glasses: 'Glasses', shoes: 'Shoes', bag: 'Bags' };
export const SLOT_ICON: Record<ClothSlot, string> = { top: '👕', bottom: '👖', dress: '👗', hat: '🧢', glasses: '👓', shoes: '👟', bag: '🎒' };

export type ClothShape =
  | 'tee' | 'hoodie' | 'sweater' | 'tank' | 'jacket' | 'raincoat' | 'buttonup'
  | 'shorts' | 'pants' | 'skirt' | 'overalls'
  | 'sundress' | 'puffdress' | 'longdress'
  | 'cap' | 'beanie' | 'sunhat' | 'bow' | 'flowercrown' | 'bucket' | 'beret' | 'crown' | 'party'
  | 'round' | 'square' | 'star' | 'heart' | 'shades' | 'goggles'
  | 'sneakers' | 'boots' | 'sandals' | 'rainboots' | 'slippers'
  | 'backpack' | 'satchel' | 'pouch' | 'basket';

export type ClothPattern = 'plain' | 'stripe' | 'dots' | 'check' | 'stars' | 'heart' | 'flower' | 'leaf';

/** Where a piece comes from (for the catalog). */
export type ClothSource = 'craft' | 'shop' | 'gift' | 'event';

export interface ClothingDef {
  id: string;
  name: string;
  slot: ClothSlot;
  shape: ClothShape;
  color: number;
  color2: number;
  pattern: ClothPattern;
  /** sell price */
  price: number;
  /** shop price (0 = not sold in the shop) */
  buy: number;
  source: ClothSource;
  desc: string;
  tags: string[];
}

/** Dye colors, one per flower color (a flower of that color is the dye). */
export const DYE_COLORS = [0xf27c7c, 0xffd966, 0xfdfbf4, 0xffa45c, 0xffa8c8, 0xb48cf0, 0x7fb2ff, 0x55476b];
export const DYE_NAMES = ['Red', 'Yellow', 'White', 'Orange', 'Pink', 'Purple', 'Blue', 'Black'];
export const DYE_FLOWER_COLORS = ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'];

const C = (id: string, name: string, slot: ClothSlot, shape: ClothShape, color: number, color2: number, pattern: ClothPattern, price: number, buy: number, source: ClothSource, desc: string, tags: string[]): ClothingDef => ({
  id: `cloth_${id}`,
  name,
  slot,
  shape,
  color,
  color2,
  pattern,
  price,
  buy,
  source,
  desc,
  tags,
});

export const CLOTHING: ClothingDef[] = [
  // ---- tops ----
  C('sunny_tee', 'Sunny Tee', 'top', 'tee', 0xffd966, 0xfff6d0, 'plain', 80, 0, 'craft', 'A soft yellow shirt. It feels like a sunny day.', ['cute', 'plain']),
  C('stripe_tee', 'Sailboat Stripe Tee', 'top', 'tee', 0xfdfbf4, 0x7fb2ff, 'stripe', 120, 480, 'shop', 'White with blue stripes, like a little boat.', ['sea', 'plain']),
  C('cozy_hoodie', 'Cozy Hoodie', 'top', 'hoodie', 0xa9e3c4, 0xfdfbf4, 'plain', 180, 720, 'shop', 'A warm hoodie with a big front pocket.', ['cozy', 'sporty']),
  C('cloud_sweater', 'Cloud Sweater', 'top', 'sweater', 0xfdfbf4, 0x9fd3f0, 'dots', 160, 0, 'craft', 'Fluffy and white, with little sky-blue dots.', ['cozy', 'cute']),
  C('berry_tank', 'Berry Tank Top', 'top', 'tank', 0xffa8c8, 0xe0475b, 'dots', 90, 360, 'shop', 'A cool top for hot days, with berry dots.', ['sweet', 'sporty']),
  C('explorer_jacket', 'Explorer Jacket', 'top', 'jacket', 0x9aa86a, 0xe0c48a, 'plain', 260, 0, 'gift', 'Lots of pockets for bugs, rocks and snacks.', ['nature', 'sporty']),
  C('puddle_raincoat', 'Puddle Raincoat', 'top', 'raincoat', 0xffd36b, 0xfff6d0, 'plain', 200, 800, 'shop', 'Splash in puddles and stay dry!', ['cute', 'nature']),
  C('garden_buttonup', 'Garden Shirt', 'top', 'buttonup', 0x8fd18a, 0xfdfbf4, 'check', 170, 0, 'gift', 'A green checked shirt for digging in the dirt.', ['nature', 'plain']),
  C('star_sweater', 'Starry Night Sweater', 'top', 'sweater', 0x4f5a9a, 0xffe27a, 'stars', 400, 0, 'event', 'Knitted stars twinkle all over it.', ['cozy', 'shiny']),
  C('heart_tee', 'Big Heart Tee', 'top', 'tee', 0xfdfbf4, 0xff7f9f, 'heart', 100, 0, 'craft', 'A white shirt with one big pink heart.', ['cute']),
  // ---- bottoms ----
  C('denim_shorts', 'Blue Shorts', 'bottom', 'shorts', 0x7fa8d9, 0x5b7fb2, 'plain', 80, 0, 'craft', 'Soft blue shorts for running and jumping.', ['plain', 'sporty']),
  C('comfy_pants', 'Comfy Pants', 'bottom', 'pants', 0xb6b2c4, 0x8a85a0, 'plain', 120, 480, 'shop', 'Soft pants for long walks.', ['plain', 'cozy']),
  C('twirl_skirt', 'Twirl Skirt', 'bottom', 'skirt', 0xffa8c8, 0xfdfbf4, 'plain', 130, 520, 'shop', 'Spin around and watch it twirl!', ['cute']),
  C('plaid_skirt', 'Plaid Skirt', 'bottom', 'skirt', 0xd9734e, 0x6f4a32, 'check', 160, 0, 'gift', 'A neat checked skirt. It is just right for the library.', ['retro']),
  C('garden_overalls', 'Garden Overalls', 'bottom', 'overalls', 0x7fa8d9, 0xffd966, 'plain', 200, 0, 'craft', 'Blue overalls with big yellow buttons. Great for digging!', ['nature', 'plain']),
  C('leafy_shorts', 'Leafy Shorts', 'bottom', 'shorts', 0x8fd18a, 0x5a8a4a, 'leaf', 110, 440, 'shop', 'Green shorts with a pattern of leaves.', ['nature']),
  C('sailor_pants', 'Sailor Pants', 'bottom', 'pants', 0xfdfbf4, 0x4f5a9a, 'stripe', 150, 0, 'gift', 'White pants with a navy stripe. Ready to sail!', ['sea', 'sporty']),
  // ---- dresses ----
  C('daisy_sundress', 'Daisy Sundress', 'dress', 'sundress', 0xffd966, 0xfdfbf4, 'flower', 220, 0, 'craft', 'A sunny dress with tiny daisies all over it.', ['cute', 'nature']),
  C('sea_sundress', 'Seaside Sundress', 'dress', 'sundress', 0x9fd3f0, 0xfdfbf4, 'stripe', 240, 960, 'shop', 'Blue and white, like waves on the sand.', ['sea', 'cute']),
  C('cupcake_dress', 'Cupcake Dress', 'dress', 'puffdress', 0xffa8c8, 0xfdfbf4, 'dots', 300, 0, 'gift', 'Puffy and pink, with sprinkle dots.', ['sweet', 'cute']),
  C('starlight_dress', 'Starlight Dress', 'dress', 'longdress', 0x4f5a9a, 0xffe27a, 'stars', 500, 0, 'event', 'It shimmers like the night sky.', ['fancy', 'shiny']),
  C('painter_smock', 'Painter Smock', 'dress', 'longdress', 0xf6efe0, 0xff7f9f, 'dots', 220, 0, 'gift', 'It has splats of paint in every color.', ['artsy']),
  C('moon_robe', 'Moonbeam Robe', 'dress', 'longdress', 0xb9a6e0, 0xfff1a8, 'stars', 320, 0, 'gift', 'A sleepy robe for watching the stars.', ['cozy', 'science']),
  // ---- hats ----
  C('sun_cap', 'Sporty Cap', 'hat', 'cap', 0xf27c7c, 0xfdfbf4, 'plain', 70, 0, 'craft', 'Keeps the sun out of your eyes.', ['sporty']),
  C('snug_beanie', 'Snug Beanie', 'hat', 'beanie', 0x7fb2ff, 0xfdfbf4, 'plain', 90, 360, 'shop', 'A warm hat with a fluffy pom-pom.', ['cozy']),
  C('straw_sunhat', 'Straw Sunhat', 'hat', 'sunhat', 0xf3dcb5, 0xf27c7c, 'plain', 120, 0, 'craft', 'A wide hat with a red ribbon.', ['nature', 'cute']),
  C('big_bow', 'Big Bow', 'hat', 'bow', 0xff7f9f, 0xffa8c8, 'plain', 80, 320, 'shop', 'A giant bow for a giant smile.', ['cute']),
  C('flower_crown', 'Flower Crown', 'hat', 'flowercrown', 0x8fd18a, 0xffd966, 'flower', 90, 0, 'craft', 'A ring of fresh flowers to wear on your head.', ['nature', 'cute']),
  C('bucket_hat', 'Bucket Hat', 'hat', 'bucket', 0xe0c48a, 0x9b7457, 'plain', 100, 400, 'shop', 'A floppy hat to wear when you explore.', ['sporty', 'retro']),
  C('artist_beret', 'Artist Beret', 'hat', 'beret', 0xe0475b, 0xe0475b, 'plain', 140, 0, 'gift', 'A soft red hat. All painters need one!', ['artsy']),
  C('lantern_crown', 'Lantern Crown', 'hat', 'crown', 0xffd36b, 0xff9f6b, 'plain', 600, 0, 'event', 'A gold crown with a tiny lantern that glows.', ['fancy', 'shiny']),
  C('party_hat', 'Party Hat', 'hat', 'party', 0x7fd3c8, 0xffd966, 'stripe', 60, 0, 'event', 'Time for a party!', ['cute']),
  // ---- glasses ----
  C('round_specs', 'Round Specs', 'glasses', 'round', 0x9b7457, 0xdcefff, 'plain', 90, 0, 'craft', 'Big round glasses for reading.', ['science', 'retro']),
  C('star_shades', 'Star Shades', 'glasses', 'star', 0xffd966, 0x7fb2ff, 'plain', 120, 480, 'shop', 'Shine like a star!', ['shiny', 'cute']),
  C('heart_shades', 'Heart Shades', 'glasses', 'heart', 0xff7f9f, 0xffc2d4, 'plain', 120, 480, 'shop', 'Look through the hearts. The whole world looks sweet!', ['cute']),
  C('cool_shades', 'Cool Shades', 'glasses', 'shades', 0x2c2433, 0x55476b, 'plain', 160, 0, 'gift', 'So cool. So fancy.', ['fancy']),
  C('dive_goggles', 'Dive Goggles', 'glasses', 'goggles', 0x5fae9e, 0xbfe6f2, 'plain', 110, 440, 'shop', 'Ready to splash!', ['sea', 'sporty']),
  // ---- shoes ----
  C('bouncy_sneakers', 'Bouncy Sneakers', 'shoes', 'sneakers', 0xfdfbf4, 0xf27c7c, 'plain', 90, 0, 'craft', 'Bounce, bounce, bounce!', ['sporty']),
  C('trail_boots', 'Trail Boots', 'shoes', 'boots', 0x9b7457, 0x6f4a32, 'plain', 140, 560, 'shop', 'Tough boots for muddy hills.', ['nature']),
  C('beach_sandals', 'Beach Sandals', 'shoes', 'sandals', 0xe0c48a, 0x7fd3c8, 'plain', 70, 280, 'shop', 'Flip, flop, off to the beach!', ['sea']),
  C('puddle_boots', 'Puddle Boots', 'shoes', 'rainboots', 0xffd36b, 0xfdfbf4, 'plain', 110, 0, 'craft', 'Made for jumping in puddles.', ['cute', 'nature']),
  C('bunny_slippers', 'Bunny Slippers', 'shoes', 'slippers', 0xffc2d4, 0xfdfbf4, 'plain', 100, 400, 'shop', 'Soft and floppy, with little ears.', ['cozy', 'cute']),
  // ---- bags ----
  C('explorer_backpack', 'Explorer Backpack', 'bag', 'backpack', 0xf2a65c, 0x9b7457, 'plain', 160, 0, 'craft', 'Room for all your treasures.', ['sporty', 'nature']),
  C('book_satchel', 'Book Satchel', 'bag', 'satchel', 0x9b7457, 0xf3dcb5, 'plain', 180, 0, 'gift', 'A brown bag that always has a book inside.', ['retro', 'science']),
  C('shell_pouch', 'Shell Pouch', 'bag', 'pouch', 0xffc2b3, 0xf28f7c, 'plain', 100, 400, 'shop', 'A little pouch with a shell button.', ['sea', 'cute']),
  C('picnic_basket', 'Picnic Basket', 'bag', 'basket', 0xe0c48a, 0xf27c7c, 'check', 120, 0, 'craft', 'Pack a snack and have a picnic!', ['food', 'cute']),
];

export const CLOTH_BY_ID: Record<string, ClothingDef> = Object.fromEntries(CLOTHING.map((c) => [c.id, c]));

/** Clothes a villager might give you (matches their style). */
export const VILLAGER_STYLE: Record<string, string[]> = {
  tansy: ['cloth_cupcake_dress', 'cloth_heart_tee'],
  rusk: ['cloth_garden_buttonup', 'cloth_garden_overalls'],
  bellamy: ['cloth_plaid_skirt', 'cloth_book_satchel', 'cloth_round_specs'],
  juno: ['cloth_sailor_pants', 'cloth_bouncy_sneakers'],
  percival: ['cloth_cool_shades', 'cloth_bucket_hat'],
  kip: ['cloth_explorer_jacket', 'cloth_explorer_backpack'],
  mochi: ['cloth_painter_smock', 'cloth_artist_beret'],
  marlowe: ['cloth_moon_robe', 'cloth_snug_beanie'],
};

const ICON_SHAPE: Record<ClothSlot, 'shirt' | 'pants' | 'dress' | 'hat' | 'glasses' | 'shoes' | 'bag'> = {
  top: 'shirt',
  bottom: 'pants',
  dress: 'dress',
  hat: 'hat',
  glasses: 'glasses',
  shoes: 'shoes',
  bag: 'bag',
};

export function clothingItem(c: ClothingDef): ItemDef {
  return {
    id: c.id,
    name: c.name,
    cat: 'clothing',
    price: c.price,
    stack: 1,
    desc: c.desc,
    icon: { s: ICON_SHAPE[c.slot], c: c.color, c2: c.color2 },
    tags: c.tags,
  };
}

/** Workbench recipes for the crafted pieces ('start' ones come with your tent). */
export const CLOTHING_RECIPES: RecipeDef[] = [
  { id: 'r_cloth_sunny_tee', result: 'cloth_sunny_tee', ingredients: [{ id: 'fiber', qty: 8 }, { id: 'flower_sun_yellow', qty: 1 }], unlock: 'start' },
  { id: 'r_cloth_denim_shorts', result: 'cloth_denim_shorts', ingredients: [{ id: 'fiber', qty: 8 }], unlock: 'start' },
  { id: 'r_cloth_sun_cap', result: 'cloth_sun_cap', ingredients: [{ id: 'fiber', qty: 5 }, { id: 'flower_bell_red', qty: 1 }], unlock: 'start' },
  { id: 'r_cloth_bouncy_sneakers', result: 'cloth_bouncy_sneakers', ingredients: [{ id: 'fiber', qty: 6 }, { id: 'clay', qty: 1 }], unlock: 'start' },
  { id: 'r_cloth_flower_crown', result: 'cloth_flower_crown', ingredients: [{ id: 'fiber', qty: 3 }, { id: 'flower_sun_yellow', qty: 1 }, { id: 'flower_bell_white', qty: 1 }], unlock: 'start' },
  { id: 'r_cloth_cloud_sweater', result: 'cloth_cloud_sweater', ingredients: [{ id: 'fiber', qty: 14 }], unlock: 'card' },
  { id: 'r_cloth_heart_tee', result: 'cloth_heart_tee', ingredients: [{ id: 'fiber', qty: 8 }, { id: 'flower_bell_pink', qty: 1 }], unlock: 'card' },
  { id: 'r_cloth_garden_overalls', result: 'cloth_garden_overalls', ingredients: [{ id: 'fiber', qty: 10 }, { id: 'iron', qty: 1 }], unlock: 'card' },
  { id: 'r_cloth_daisy_sundress', result: 'cloth_daisy_sundress', ingredients: [{ id: 'fiber', qty: 10 }, { id: 'flower_sun_white', qty: 2 }], unlock: 'card' },
  { id: 'r_cloth_straw_sunhat', result: 'cloth_straw_sunhat', ingredients: [{ id: 'fiber', qty: 8 }, { id: 'branch', qty: 2 }], unlock: 'card' },
  { id: 'r_cloth_round_specs', result: 'cloth_round_specs', ingredients: [{ id: 'iron', qty: 1 }, { id: 'branch', qty: 1 }], unlock: 'card' },
  { id: 'r_cloth_puddle_boots', result: 'cloth_puddle_boots', ingredients: [{ id: 'clay', qty: 3 }, { id: 'fiber', qty: 2 }], unlock: 'card' },
  { id: 'r_cloth_explorer_backpack', result: 'cloth_explorer_backpack', ingredients: [{ id: 'fiber', qty: 10 }, { id: 'timber', qty: 1 }], unlock: 'card' },
  { id: 'r_cloth_picnic_basket', result: 'cloth_picnic_basket', ingredients: [{ id: 'branch', qty: 6 }, { id: 'fiber', qty: 4 }], unlock: 'card' },
  // home pieces for dressing up
  { id: 'r_furn_dye_station', result: 'furn_dye_station', ingredients: [{ id: 'timber', qty: 4 }, { id: 'clay', qty: 2 }], unlock: 'start' },
  { id: 'r_furn_standing_mirror', result: 'furn_standing_mirror', ingredients: [{ id: 'timber', qty: 3 }, { id: 'iron', qty: 1 }], unlock: 'start' },
];
