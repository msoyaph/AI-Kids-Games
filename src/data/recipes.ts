/**
 * Cooking recipes (dishes), crafting recipes (placeables, machines, decor, handy items),
 * and how you learn them (start, skills, villagers, the radio show, story rewards).
 * Ingredient keys: item id, `cat:<category>` (any item of that category), or `any:<group>`.
 */
import { CROPS } from './crops';
import { registerItem, tryItem } from './items';

export type Ingredient = [string, number];

export const GROUPS: Record<string, string[]> = {
  mushroom: ['morel', 'chanterelle', 'oysterMushroom'],
  berry: ['wildRaspberry', 'blackberry', 'blueberry', 'strawberry', 'cranberry'],
  nut: ['hazelnut', 'pineNut', 'acorn'],
  leafy: ['lettuce', 'kale', 'spinach', 'broccoli'],
  milk: ['milk', 'bigMilk', 'goatMilk'],
  egg: ['egg', 'bigEgg', 'duckEgg'],
  cheese: ['cheese', 'goatCheese'],
};

export interface DishDef {
  id: string;
  name: string;
  ing: Ingredient[];
  energy: number;
  price: number;
  look: ['plate' | 'bowl' | 'cup' | 'slice' | 'bread' | 'skewer' | 'pie', number, number];
  buff?: { id: string; minutes: number; speed?: number; luck?: number; farming?: number; fishing?: number; mining?: number; foraging?: number; defense?: number };
  desc: string;
}

const B = (id: string, minutes: number, k: string, v: number) => ({ id, minutes, [k]: v });

export const DISHES: DishDef[] = [
  { id: 'friedEgg', name: 'Fried Egg', ing: [['any:egg', 1]], energy: 50, price: 40, look: ['plate', 0xfffaf0, 0xf5d34a], desc: 'Sunny side up!' },
  { id: 'omelet', name: 'Omelet', ing: [['any:egg', 1], ['any:milk', 1]], energy: 100, price: 125, look: ['plate', 0xf5d34a, 0x86c25a], desc: 'Fluffy and folded.' },
  { id: 'pancakes', name: 'Pancakes', ing: [['flour', 1], ['any:egg', 1]], energy: 90, price: 110, look: ['plate', 0xdcae72, 0xa0501e], buff: B('pancakes', 240, 'foraging', 1), desc: 'A tall, fluffy stack. Great with syrup!' },
  { id: 'salad', name: 'Garden Salad', ing: [['any:leafy', 1], ['radish', 1]], energy: 80, price: 110, look: ['bowl', 0x86c25a, 0xd2434a], desc: 'Crunchy and fresh.' },
  { id: 'veggieSoup', name: 'Veggie Soup', ing: [['carrot', 1], ['potato', 1]], energy: 100, price: 150, look: ['bowl', 0xe4862e, 0x86c25a], desc: 'Warm and hearty.' },
  { id: 'pumpkinSoup', name: 'Pumpkin Soup', ing: [['pumpkin', 1], ['any:milk', 1]], energy: 200, price: 300, look: ['bowl', 0xf6b146, 0xffffff], buff: B('pumpkinSoup', 300, 'defense', 2), desc: 'Creamy autumn comfort.' },
  { id: 'fruitSalad', name: 'Fruit Salad', ing: [['cat:fruit', 3]], energy: 150, price: 240, look: ['bowl', 0xee8ab6, 0x4f7fe0], buff: B('fruitSalad', 300, 'luck', 1), desc: 'A rainbow in a bowl.' },
  { id: 'bakedPotato', name: 'Baked Potato', ing: [['potato', 1], ['oil', 1]], energy: 80, price: 120, look: ['plate', 0xb7844f, 0xfbe97a], desc: 'Crispy outside, fluffy inside.' },
  { id: 'carrotCake', name: 'Carrot Cake', ing: [['carrot', 2], ['flour', 1], ['sugar', 1]], energy: 150, price: 240, look: ['slice', 0xe4862e, 0xfffaf0], desc: 'Sweet cake with cream frosting.' },
  { id: 'strawberryShortcake', name: 'Strawberry Shortcake', ing: [['strawberry', 2], ['flour', 1], ['sugar', 1]], energy: 180, price: 300, look: ['slice', 0xf4e2b4, 0xd2434a], buff: B('shortcake', 240, 'speed', 0.1), desc: 'Layers of cake, cream and berries.' },
  { id: 'blueberryMuffin', name: 'Blueberry Muffin', ing: [['blueberry', 2], ['flour', 1], ['any:egg', 1]], energy: 140, price: 220, look: ['bread', 0xdcae72, 0x4f7fe0], desc: 'Bursting with blueberries.' },
  { id: 'cornChowder', name: 'Corn Chowder', ing: [['corn', 1], ['any:milk', 1], ['potato', 1]], energy: 150, price: 240, look: ['bowl', 0xfbe97a, 0xf5d34a], desc: 'Thick, sweet and creamy.' },
  { id: 'tomatoSoup', name: 'Tomato Soup', ing: [['tomato', 2], ['any:milk', 1]], energy: 120, price: 180, look: ['bowl', 0xd2434a, 0xffffff], desc: 'Perfect for rainy days.' },
  { id: 'pizza', name: 'Veggie Pizza', ing: [['flour', 1], ['tomato', 1], ['any:cheese', 1]], energy: 180, price: 300, look: ['slice', 0xf5d34a, 0xd2434a], buff: B('pizza', 300, 'mining', 1), desc: 'Cheesy, saucy, yummy.' },
  { id: 'fishTacos', name: 'Fish Tacos', ing: [['cat:fish', 1], ['flour', 1], ['hotpepper', 1]], energy: 160, price: 260, look: ['plate', 0xf4e2b4, 0x86c25a], buff: B('fishTacos', 300, 'fishing', 1), desc: 'Crunchy and a little spicy.' },
  { id: 'grilledFish', name: 'Grilled Fish', ing: [['cat:fish', 1]], energy: 70, price: 100, look: ['plate', 0xb08a68, 0xf5d34a], desc: 'Simple and tasty.' },
  { id: 'fishStew', name: 'Fish Stew', ing: [['cat:fish', 2], ['potato', 1], ['tomato', 1]], energy: 200, price: 320, look: ['bowl', 0xe4862e, 0xf3efe6], buff: B('fishStew', 300, 'fishing', 2), desc: 'A sailor\'s favorite.' },
  { id: 'sushiRoll', name: 'Sushi Roll', ing: [['cat:fish', 1], ['rice', 1], ['seaweed', 1]], energy: 150, price: 250, look: ['plate', 0x2c5a37, 0xf07868], buff: B('sushi', 240, 'fishing', 1), desc: 'Rolled up with care.' },
  { id: 'crabCakes', name: 'Crab Cakes', ing: [['crab', 1], ['any:egg', 1], ['flour', 1]], energy: 200, price: 340, look: ['plate', 0xdcae72, 0xd2434a], buff: B('crabCakes', 300, 'defense', 3), desc: 'Golden and crispy.' },
  { id: 'cheeseToast', name: 'Cheese Toast', ing: [['flour', 1], ['any:cheese', 1]], energy: 100, price: 160, look: ['bread', 0xdcae72, 0xf5d34a], desc: 'Melty and warm.' },
  { id: 'macCheese', name: 'Mac & Cheese', ing: [['flour', 1], ['any:cheese', 1], ['any:milk', 1]], energy: 160, price: 260, look: ['bowl', 0xf5d34a, 0xf6b146], desc: 'The coziest food ever.' },
  { id: 'pumpkinPie', name: 'Pumpkin Pie', ing: [['pumpkin', 1], ['flour', 1], ['sugar', 1], ['any:milk', 1]], energy: 220, price: 360, look: ['pie', 0xdcae72, 0xe4862e], desc: 'Mayor Bram\'s favorite!' },
  { id: 'applePie', name: 'Apple Pie', ing: [['apple', 2], ['flour', 1], ['sugar', 1]], energy: 200, price: 320, look: ['pie', 0xdcae72, 0xf07868], desc: 'Just like Nana makes.' },
  { id: 'cranberrySauce', name: 'Cranberry Sauce', ing: [['cranberry', 2], ['sugar', 1]], energy: 100, price: 180, look: ['bowl', 0x96293a, 0xd2434a], desc: 'Tangy and sweet.' },
  { id: 'roastedVeggies', name: 'Roasted Veggies', ing: [['cat:crop', 3], ['oil', 1]], energy: 150, price: 220, look: ['plate', 0xe4862e, 0x3e7c3c], buff: B('roasted', 300, 'farming', 1), desc: 'Golden-brown and herby.' },
  { id: 'mushroomSoup', name: 'Mushroom Soup', ing: [['any:mushroom', 2], ['any:milk', 1]], energy: 180, price: 280, look: ['bowl', 0xb7844f, 0xf3efe6], buff: B('mushroomSoup', 300, 'foraging', 2), desc: 'Earthy and creamy.' },
  { id: 'hotCocoa', name: 'Hot Cocoa', ing: [['any:milk', 1], ['sugar', 1]], energy: 80, price: 120, look: ['cup', 0x6a4630, 0xffffff], buff: B('cocoa', 180, 'speed', 0.15), desc: 'Warm and chocolatey. Makes you zippy!' },
  { id: 'cookies', name: 'Cookies', ing: [['flour', 1], ['sugar', 1], ['any:egg', 1]], energy: 90, price: 140, look: ['plate', 0xdcae72, 0x6a4630], desc: 'Fresh from the oven. Kai\'s favorite!' },
  { id: 'bread', name: 'Bread', ing: [['flour', 2]], energy: 60, price: 90, look: ['bread', 0xdcae72, 0xdcae72], desc: 'A warm, crusty loaf.' },
  { id: 'honeyToast', name: 'Honey Toast', ing: [['flour', 1], ['honey', 1]], energy: 100, price: 150, look: ['bread', 0xdcae72, 0xf6b146], buff: B('honeyToast', 240, 'farming', 1), desc: 'Sweet and golden.' },
  { id: 'springRolls', name: 'Spring Rolls', ing: [['any:leafy', 1], ['carrot', 1], ['rice', 1]], energy: 120, price: 180, look: ['plate', 0xf4e2b4, 0x86c25a], desc: 'Crunchy veggies in a wrap.' },
  { id: 'kaleChips', name: 'Kale Chips', ing: [['kale', 1], ['oil', 1]], energy: 90, price: 140, look: ['bowl', 0x2c5a37, 0x5c9e48], desc: 'Crispy green snacks.' },
  { id: 'beetSalad', name: 'Beet Salad', ing: [['beet', 1], ['any:cheese', 1]], energy: 130, price: 200, look: ['bowl', 0x96293a, 0xfffaf0], desc: 'Pretty and purple.' },
  { id: 'sweetPotatoFries', name: 'Sweet Potato Fries', ing: [['yam', 1], ['oil', 1]], energy: 140, price: 220, look: ['plate', 0xe4862e, 0xd2434a], desc: 'Crispy, sweet and salty.' },
  { id: 'berrySmoothie', name: 'Berry Smoothie', ing: [['any:berry', 2], ['any:milk', 1]], energy: 120, price: 170, look: ['cup', 0xee8ab6, 0x4f7fe0], buff: B('smoothie', 240, 'speed', 0.1), desc: 'Pink, cold and delicious.' },
  { id: 'veggieCurry', name: 'Veggie Curry', ing: [['rice', 1], ['cat:crop', 2], ['hotpepper', 1]], energy: 220, price: 340, look: ['bowl', 0xf6b146, 0x86c25a], buff: B('curry', 360, 'defense', 3), desc: 'Warm and spicy. Sunny\'s specialty!' },
  { id: 'trailMix', name: 'Trail Mix', ing: [['any:nut', 1], ['any:berry', 1]], energy: 100, price: 150, look: ['bowl', 0xb7844f, 0xd2434a], buff: B('trailMix', 300, 'foraging', 1), desc: 'Perfect for long walks.' },
  { id: 'campfireStew', name: 'Campfire Stew', ing: [['cat:crop', 2], ['cat:fish', 1]], energy: 180, price: 260, look: ['bowl', 0x8a6040, 0xe4862e], buff: B('stew', 300, 'mining', 2), desc: 'Smoky and filling.' },
];

for (const d of DISHES) registerItem({ id: d.id, name: d.name, cat: 'food', price: d.price, energy: d.energy, buff: d.buff, desc: d.desc, quality: false });

// store staples
registerItem({ id: 'flour', name: 'Flour', cat: 'ingredient', price: 25, desc: 'For baking breads, cakes and pancakes.' });
registerItem({ id: 'sugar', name: 'Sugar', cat: 'ingredient', price: 25, desc: 'Makes things sweet!' });
registerItem({ id: 'rice', name: 'Rice', cat: 'ingredient', price: 30, desc: 'A pantry staple.', energy: 10 });

// ── Artisan goods (made by machines) ─────────────────────────
registerItem({ id: 'cheese', name: 'Cheese', cat: 'artisan', price: 230, desc: 'Made in the cheese press.', energy: 50, quality: true });
registerItem({ id: 'goatCheese', name: 'Goat Cheese', cat: 'artisan', price: 400, desc: 'Tangy cheese from goat milk.', energy: 50, quality: true });
registerItem({ id: 'cloth', name: 'Cloth', cat: 'artisan', price: 470, desc: 'Woven on the loom. Soft and strong.' });
registerItem({ id: 'honey', name: 'Honey', cat: 'artisan', price: 120, desc: 'Sweet golden honey from your bee house.', energy: 40 });
registerItem({ id: 'oil', name: 'Cooking Oil', cat: 'artisan', price: 100, desc: 'Pressed from sunflowers or corn. Great for cooking.' });
registerItem({ id: 'fieldSnack', name: 'Field Snack', cat: 'food', price: 20, energy: 45, desc: 'A crunchy mix of seeds to keep you going.' });
registerItem({ id: 'healingTea', name: 'Healing Tea', cat: 'food', price: 120, energy: 60, desc: 'Chamomile and honey. Soothes you right up (heals in the mine).' });

/** Artisan goods derived from produce: jam/pickles/juice. Value = base × mult + add. */
export interface Artisan {
  id: string;
  name: string;
  from: string;
  kind: 'jam' | 'pickles' | 'juice';
}
export const ARTISAN: Artisan[] = [];
function addArtisan(from: string, kind: Artisan['kind']): void {
  const d = tryItem(from);
  if (!d) return;
  const id = `${kind}.${from}`;
  const name = kind === 'jam' ? `${d.name} Jam` : kind === 'pickles' ? `Pickled ${d.name}` : `${d.name} Juice`;
  const price = kind === 'juice' ? Math.round(d.price * 2.25) : d.price * 2 + 50;
  registerItem({ id, name, cat: 'artisan', price, desc: kind === 'jam' ? 'Sweet fruit jam from the preserves jar.' : kind === 'pickles' ? 'Tangy pickles from the preserves jar.' : 'Fresh juice from the juicer.', energy: Math.round(d.price / 6) + 20 });
  ARTISAN.push({ id, name, from, kind });
}
export function registerArtisanGoods(): void {
  for (const c of CROPS) {
    if (c.produce === 'flower') continue;
    addArtisan(c.id, c.fruit ? 'jam' : 'pickles');
    addArtisan(c.id, 'juice');
  }
  for (const id of ['cherry', 'peach', 'orange', 'apple', 'pear', 'wildRaspberry', 'blackberry', 'wildPlum']) {
    addArtisan(id, 'jam');
    addArtisan(id, 'juice');
  }
}

// ── Crafting ────────────────────────────────────────────────
export interface CraftDef {
  id: string;
  /** item produced (default = id) */
  out?: string;
  n?: number;
  ing: Ingredient[];
  /** how it's learned */
  learn: string;
}

export const CRAFTS: CraftDef[] = [
  // starting & farm supplies
  { id: 'chest', ing: [['wood', 50]], learn: 'start' },
  { id: 'scarecrow', ing: [['wood', 25], ['coal', 1], ['fiber', 20]], learn: 'start' },
  { id: 'woodFence', n: 5, ing: [['wood', 5]], learn: 'start' },
  { id: 'woodPath', n: 5, ing: [['wood', 2]], learn: 'start' },
  { id: 'torch', n: 2, ing: [['wood', 1], ['sap', 2]], learn: 'start' },
  { id: 'basicFertilizer', n: 5, ing: [['sap', 5]], learn: 'start' },
  { id: 'sprinkler1', ing: [['copperBar', 1], ['stone', 10]], learn: 'farming:1' },
  { id: 'gate', ing: [['wood', 10]], learn: 'farming:1' },
  { id: 'stoneFence', n: 5, ing: [['stone', 5]], learn: 'farming:2' },
  { id: 'stonePath', n: 5, ing: [['stone', 2]], learn: 'farming:2' },
  { id: 'deluxeFertilizer', n: 5, ing: [['sap', 10], ['coal', 1]], learn: 'farming:3' },
  { id: 'speedyGrow', n: 5, ing: [['pineCone', 1], ['fiber', 5]], learn: 'farming:4' },
  { id: 'sprinkler2', ing: [['ironBar', 1], ['copperBar', 1], ['quartz', 1]], learn: 'farming:5' },
  { id: 'sprinkler3', ing: [['goldBar', 1], ['ironBar', 1], ['crystalite', 1]], learn: 'farming:8' },
  { id: 'rainCharm', ing: [['cloth', 1], ['fiber', 10]], learn: 'farming:9' },
  { id: 'brickPath', n: 5, ing: [['clay', 2], ['stone', 1]], learn: 'foraging:3' },
  { id: 'gravelPath', n: 5, ing: [['stone', 1]], learn: 'mining:1' },
  // machines
  { id: 'preservesJar', ing: [['wood', 40], ['stone', 30], ['coal', 4]], learn: 'farming:2' },
  { id: 'juicer', ing: [['wood', 30], ['copperBar', 2], ['stone', 20]], learn: 'farming:4' },
  { id: 'cheesePress', ing: [['wood', 40], ['stone', 40], ['hardwood', 5], ['copperBar', 1]], learn: 'farming:3' },
  { id: 'loom', ing: [['wood', 50], ['fiber', 30], ['pineTar', 1]], learn: 'farming:6' },
  { id: 'furnace', ing: [['copperOre', 20], ['stone', 25]], learn: 'mining:1' },
  { id: 'beeHouse', ing: [['wood', 40], ['coal', 1], ['ironBar', 1], ['mapleSyrup', 1]], learn: 'farming:5' },
  { id: 'oilPress', ing: [['wood', 50], ['sap', 10], ['ironBar', 1]], learn: 'farming:7' },
  { id: 'recycler', ing: [['wood', 25], ['stone', 25], ['ironBar', 1]], learn: 'fishing:3' },
  { id: 'seedMaker', ing: [['wood', 25], ['coal', 10], ['goldBar', 1]], learn: 'farming:7' },
  { id: 'tapper', ing: [['wood', 40], ['copperBar', 2]], learn: 'foraging:2' },
  { id: 'crabPot', ing: [['wood', 30], ['copperBar', 1]], learn: 'fishing:2' },
  // handy items
  { id: 'bait', n: 5, ing: [['fiber', 5]], learn: 'fishing:1' },
  { id: 'fieldSnack', ing: [['acorn', 1], ['mapleSeed', 1], ['pineCone', 1]], learn: 'foraging:1' },
  { id: 'healingTea', ing: [['chamomile', 2], ['honey', 1]], learn: 'foraging:4' },
  { id: 'homeWhistle', ing: [['wood', 5], ['sap', 5], ['fiber', 10]], learn: 'foraging:5' },
  { id: 'ropeLadder', ing: [['fiber', 30], ['wood', 10]], learn: 'mining:2' },
  { id: 'popBomb', n: 2, ing: [['copperOre', 4], ['coal', 1]], learn: 'mining:3' },
  // decor
  { id: 'bench', ing: [['wood', 20]], learn: 'foraging:1' },
  { id: 'woodSign', ing: [['wood', 25]], learn: 'start' },
  { id: 'flowerPot', ing: [['clay', 2], ['fiber', 2]], learn: 'foraging:2' },
  { id: 'birdhouse', ing: [['wood', 15], ['fiber', 5]], learn: 'foraging:3' },
  { id: 'gardenGnome', ing: [['clay', 5], ['stone', 5]], learn: 'farming:3' },
  { id: 'lantern', ing: [['ironBar', 1], ['wood', 5]], learn: 'mining:5' },
  { id: 'lampPost', ing: [['ironBar', 1], ['wood', 10], ['coal', 1]], learn: 'mining:4' },
  { id: 'windChime', ing: [['copperBar', 1], ['seaGlass', 2]], learn: 'fishing:4' },
  { id: 'pumpkinLantern', ing: [['pumpkin', 1], ['torch', 1]], learn: 'farming:6' },
  { id: 'snowGlobe', ing: [['seaGlass', 1], ['quartz', 1]], learn: 'mining:6' },
  { id: 'fishTank', ing: [['seaGlass', 3], ['wood', 10]], learn: 'fishing:5' },
  { id: 'bookshelf', ing: [['wood', 30], ['hardwood', 5]], learn: 'foraging:6' },
  { id: 'table', ing: [['wood', 20]], learn: 'foraging:2' },
  { id: 'chair', ing: [['wood', 10]], learn: 'foraging:1' },
  { id: 'planterBox', ing: [['wood', 15], ['clay', 2]], learn: 'farming:4' },
  { id: 'barrelDeco', ing: [['wood', 25]], learn: 'foraging:4' },
  { id: 'stoneStatue', ing: [['stone', 50], ['quartz', 1]], learn: 'mining:7' },
  { id: 'crystalLamp', ing: [['crystalite', 1], ['quartz', 3]], learn: 'mining:8' },
  { id: 'glowTorch', ing: [['battery', 1], ['wood', 5]], learn: 'mining:9' },
  { id: 'heartLantern', ing: [['ruby', 1], ['wood', 10]], learn: 'mining:10' },
  { id: 'rug', ing: [['cloth', 2]], learn: 'farming:8' },
  { id: 'teaSet', ing: [['clay', 4], ['quartz', 1]], learn: 'cooking:3' },
  { id: 'cuttingBoard', ing: [['hardwood', 2]], learn: 'cooking:2' },
  { id: 'jamShelf', ing: [['wood', 20], ['any:berry', 2]], learn: 'cooking:5' },
  { id: 'flowerArch', ing: [['wood', 20], ['cat:flower', 3]], learn: 'farming:10' },
  { id: 'starLight', ing: [['quartz', 2], ['copperBar', 1]], learn: 'story' },
  { id: 'foundersStatue', ing: [['stone', 30], ['goldBar', 1]], learn: 'story' },
  { id: 'deluxeScarecrow', ing: [['wood', 50], ['fiber', 40], ['goldBar', 1]], learn: 'farming:9' },
];

export const CRAFT: Record<string, CraftDef> = {};
for (const c of CRAFTS) CRAFT[c.id] = c;

/** Cooking recipes learned from cooking levels and the Saturday radio show. */
export const COOK_LEARN: Record<string, string> = {
  friedEgg: 'start',
  salad: 'start',
  bread: 'cooking:1',
  grilledFish: 'fishing:1',
  cookies: 'cooking:2',
  hotCocoa: 'cooking:3',
  macCheese: 'cooking:4',
  bakedPotato: 'cooking:5',
  fruitSalad: 'cooking:6',
  campfireStew: 'cooking:7',
  sweetPotatoFries: 'cooking:8',
  veggieCurry: 'cooking:9',
};

/** "Cooking with Sunny" radio show: one recipe every Restday, in this order. */
export const RADIO_RECIPES = ['pancakes', 'omelet', 'veggieSoup', 'tomatoSoup', 'cornChowder', 'berrySmoothie', 'kaleChips', 'springRolls', 'cheeseToast', 'beetSalad', 'trailMix', 'honeyToast', 'fishTacos', 'cranberrySauce', 'roastedVeggies', 'sushiRoll'];
