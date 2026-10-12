// Shared content types. All game content is plain typed data.
export type ItemCategory =
  | 'tool'
  | 'material'
  | 'fruit'
  | 'flower'
  | 'seed'
  | 'sapling'
  | 'fish'
  | 'bug'
  | 'fossil'
  | 'fossilUnknown'
  | 'shell'
  | 'furniture'
  | 'wallpaper'
  | 'flooring'
  | 'recipe'
  | 'key'
  | 'clothing'
  | 'misc';

export type ToolKind = 'net' | 'rod' | 'shovel' | 'axe' | 'can' | 'ladder';

export type IconShape =
  | 'fish'
  | 'eel'
  | 'ray'
  | 'puffer'
  | 'jelly'
  | 'crab'
  | 'beetle'
  | 'butterfly'
  | 'moth'
  | 'dragonfly'
  | 'bee'
  | 'hopper'
  | 'snail'
  | 'spider'
  | 'firefly'
  | 'ant'
  | 'bone'
  | 'skull'
  | 'shellFossil'
  | 'rock'
  | 'fruit'
  | 'branch'
  | 'log'
  | 'stone'
  | 'ore'
  | 'clay'
  | 'fiber'
  | 'shell'
  | 'flower'
  | 'seed'
  | 'sapling'
  | 'net'
  | 'rod'
  | 'shovel'
  | 'axe'
  | 'can'
  | 'ladder'
  | 'furniture'
  | 'wall'
  | 'floor'
  | 'scroll'
  | 'bottle'
  | 'gem'
  | 'key'
  | 'bag'
  | 'lantern'
  | 'letter'
  | 'hat'
  | 'glasses'
  | 'book'
  | 'shirt'
  | 'pants'
  | 'dress'
  | 'shoes'
  | 'mystery';

export interface IconSpec {
  s: IconShape;
  /** primary / secondary / accent colors */
  c: number;
  c2?: number;
  c3?: number;
  /** clothing: the piece's shape (hoodie, beanie, sandals...) */
  v?: string;
  /** clothing: its pattern (stripe, dots, stars...) */
  p?: string;
}

export type FurnModel =
  | 'table'
  | 'chair'
  | 'stool'
  | 'bed'
  | 'lamp'
  | 'rug'
  | 'shelf'
  | 'plant'
  | 'sofa'
  | 'lantern'
  | 'bench'
  | 'fence'
  | 'clock'
  | 'dresser'
  | 'box'
  | 'barrel'
  | 'fountain'
  | 'statue'
  | 'sign'
  | 'arch'
  | 'planter'
  | 'bonfire'
  | 'tank'
  | 'easel'
  | 'piano'
  | 'tv'
  | 'kettle'
  | 'trophy'
  | 'sundial'
  | 'windchime'
  | 'mushroom'
  | 'picnic'
  | 'streetlamp'
  | 'bookcase'
  | 'desk'
  | 'wardrobe'
  | 'vase'
  | 'globe'
  | 'telescope'
  | 'hammock'
  | 'well'
  | 'flag'
  | 'birdhouse'
  | 'cushion'
  | 'stove'
  | 'frame'
  // wall decorations
  | 'painting'
  | 'poster'
  | 'wallclock'
  | 'wallshelf'
  | 'wreath'
  | 'sconce'
  | 'kite'
  | 'mirror'
  | 'dyestation';

/** Where a piece goes: on the floor (default), on a wall, or small enough to sit on a table/shelf too. */
export type FurnLayer = 'floor' | 'wall' | 'small';

export interface FurnitureInfo {
  w: number;
  d: number;
  model: FurnModel;
  /** primary / secondary color */
  color: number;
  color2: number;
  /** can be placed outside (counts for island rating) */
  outdoor: boolean;
  /** rug (placed under other furniture) */
  rug?: boolean;
  /** decor points for the island rating */
  decor: number;
  /** placement layer (default 'floor'). Wall pieces use `w` as their width along the wall. */
  layer?: FurnLayer;
}

export interface ItemDef {
  id: string;
  name: string;
  cat: ItemCategory;
  /** sell price in Glints (0 = cannot be sold) */
  price: number;
  stack: number;
  desc: string;
  icon: IconSpec;
  /** preference tags used by villager likes/dislikes */
  tags?: string[];
  tool?: { kind: ToolKind; durability: number; sturdy: boolean };
  furn?: FurnitureInfo;
  /** planting: object created when planted */
  plant?: { kind: 'flower' | 'sapling'; v: number; item?: string };
  /** wallpaper / flooring color(s) */
  surface?: { c: number; c2: number; pattern: 'plain' | 'stripe' | 'check' | 'dots' | 'planks' | 'tiles' | 'stars' | 'waves' };
  /** key/quest items cannot be sold or dropped */
  key?: boolean;
  rarity?: number;
  /** seasonal: only found / sold in these seasons */
  seasons?: Season[];
}

// ---------- creatures ----------
export type FishWhere = 'river' | 'pond' | 'sea' | 'mouth';
export type WeatherNeed = 'any' | 'rain' | 'clear' | 'rainbow';

/** The four seasons (7 in-game days each). */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface FishDef {
  id: string;
  name: string;
  /** one-sentence museum blurb */
  desc: string;
  where: FishWhere[];
  /** shadow size 1 (tiny) .. 6 (huge) */
  size: 1 | 2 | 3 | 4 | 5 | 6;
  /** active hours [start, end) on a 24h clock; start > end wraps past midnight; [0,24] = all day */
  hours: [number, number];
  weather: WeatherNeed;
  /** 1 common .. 5 legendary */
  rarity: 1 | 2 | 3 | 4 | 5;
  price: number;
  shape: 'fish' | 'eel' | 'ray' | 'puffer' | 'jelly' | 'crab';
  /** body, fin, accent */
  colors: [number, number, number];
  /** only around in these seasons (absent = all year) */
  seasons?: Season[];
}

export type BugHabitat = 'flowers' | 'air' | 'trees' | 'ground' | 'rocks' | 'beach' | 'water' | 'fruit';

export interface BugDef {
  id: string;
  name: string;
  desc: string;
  habitat: BugHabitat;
  hours: [number, number];
  weather: WeatherNeed;
  rarity: 1 | 2 | 3 | 4 | 5;
  price: number;
  shape: 'beetle' | 'butterfly' | 'moth' | 'dragonfly' | 'bee' | 'hopper' | 'snail' | 'spider' | 'firefly' | 'ant';
  colors: [number, number, number];
  /** flee speed 1..3 */
  speed: 1 | 2 | 3;
  /** how easily it notices you 1..3 */
  wariness: 1 | 2 | 3;
  /** only around in these seasons (absent = all year) */
  seasons?: Season[];
}

export interface FossilDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  shape: 'bone' | 'skull' | 'shellFossil' | 'rock';
  colors: [number, number];
}

// ---------- crafting ----------
export type RecipeUnlock = 'start' | 'mission' | 'card' | 'friend' | 'lumen' | 'museum' | 'season';

export interface RecipeDef {
  id: string;
  /** item produced */
  result: string;
  qty?: number;
  ingredients: { id: string; qty: number }[];
  unlock: RecipeUnlock;
  /** Lumen price when unlock === 'lumen' */
  lumenCost?: number;
  /** unlock === 'season': learned when you first gather that season's treasures */
  season?: Season;
}

export interface FurnitureDef {
  id: string;
  name: string;
  desc: string;
  /** sell price */
  price: number;
  /** shop buy price (0 = not sold in shop) */
  buy: number;
  tags: string[];
  furn: FurnitureInfo;
}

export interface SurfaceDef {
  id: string;
  name: string;
  kind: 'wallpaper' | 'flooring';
  price: number;
  buy: number;
  c: number;
  c2: number;
  pattern: 'plain' | 'stripe' | 'check' | 'dots' | 'planks' | 'tiles' | 'stars' | 'waves';
}
