/**
 * Production buildings and their recipes: the farm's chains, such as wheat → flour → bread,
 * milk → butter → jam tarts, and wool → yarn → sweater. A building works on one job at a time from its
 * queue; finished goods wait on its shelf until collected (they never spoil). Upgrades add queue
 * slots and make it faster. Good ingredients make good goods: the stars of what goes in carry through.
 */

export interface MachineDef {
  id: string;
  name: string;
  w: number;
  d: number;
  cost: number;
  level: number;
  /** Queue slots at upgrade levels 1, 2 and 3. */
  slots: [number, number, number];
  /** Time multiplier at upgrade levels 1, 2 and 3. */
  speed: [number, number, number];
  /** Coins for upgrades to level 2 and 3. */
  upgrade: [number, number];
  color: { wall: number; roof: number };
}

export const MACHINES: readonly MachineDef[] = [
  { id: 'mill', name: 'Windmill', w: 2, d: 2, cost: 300, level: 4, slots: [2, 3, 4], speed: [1, 0.85, 0.7], upgrade: [600, 1800], color: { wall: 0xfff2d6, roof: 0x8a5a3b } },
  { id: 'bakery', name: 'Bakery', w: 2, d: 2, cost: 450, level: 5, slots: [2, 3, 4], speed: [1, 0.85, 0.7], upgrade: [800, 2200], color: { wall: 0xf6d7b0, roof: 0xd96a3a } },
  { id: 'dairy', name: 'Dairy', w: 2, d: 2, cost: 500, level: 6, slots: [2, 3, 4], speed: [1, 0.85, 0.7], upgrade: [900, 2400], color: { wall: 0xf4f8fb, roof: 0x5f8fc0 } },
  { id: 'loom', name: 'Loom House', w: 2, d: 2, cost: 550, level: 7, slots: [2, 3, 4], speed: [1, 0.85, 0.7], upgrade: [1000, 2600], color: { wall: 0xe9e0f2, roof: 0x8a6ab8 } },
  { id: 'juicepress', name: 'Juice Press', w: 2, d: 2, cost: 600, level: 8, slots: [2, 3, 4], speed: [1, 0.85, 0.7], upgrade: [1100, 2800], color: { wall: 0xfff1c9, roof: 0xf0a040 } },
  { id: 'jamkitchen', name: 'Jam Kitchen', w: 2, d: 2, cost: 650, level: 9, slots: [2, 3, 4], speed: [1, 0.85, 0.7], upgrade: [1200, 3000], color: { wall: 0xffe3e8, roof: 0xc2465a } },
  { id: 'kitchen', name: 'Farm Kitchen', w: 3, d: 2, cost: 800, level: 10, slots: [2, 3, 4], speed: [1, 0.85, 0.7], upgrade: [1400, 3400], color: { wall: 0xe6f3dc, roof: 0x4f8f5a } },
];

export const MACHINE: Record<string, MachineDef> = Object.fromEntries(MACHINES.map(m => [m.id, m]));

export interface RecipeDef {
  /** The good's item id (one recipe per good). */
  id: string;
  name: string;
  machine: string;
  /** Item id → how many. */
  inputs: Record<string, number>;
  minutes: number;
  level: number;
  color: number;
}

const r = (id: string, name: string, machine: string, inputs: Record<string, number>, minutes: number, level: number, color: number): RecipeDef => ({ id, name, machine, inputs, minutes, level, color });

export const RECIPES: readonly RecipeDef[] = [
  // mill
  r('flour', 'Flour', 'mill', { wheat: 3 }, 2, 4, 0xf6f1e4),
  r('peanutbutter', 'Peanut Butter', 'mill', { peanuts: 3 }, 3, 4, 0xc98a4a),
  r('sugar', 'Sugar', 'mill', { sugarbeet: 2 }, 3, 4, 0xffffff),
  r('oatflakes', 'Oat Flakes', 'mill', { oats: 3 }, 2, 5, 0xe6d9a0),
  r('chickpeaflour', 'Chickpea Flour', 'mill', { chickpeas: 3 }, 3, 8, 0xf2dc9a),
  r('buckwheatflour', 'Buckwheat Flour', 'mill', { buckwheat: 3 }, 3, 15, 0xc9b99a),
  // bakery
  r('bread', 'Bread', 'bakery', { flour: 2 }, 3, 5, 0xd9a35a),
  r('cake', 'Sponge Cake', 'bakery', { flour: 2, egg: 2, sugar: 1 }, 5, 6, 0xfff0c9),
  r('oatbars', 'Oat Bars', 'bakery', { oatflakes: 2, honey: 1 }, 4, 7, 0xd9b36a),
  r('jamtarts', 'Jam Tarts', 'bakery', { flour: 1, strawberryjam: 1, butter: 1 }, 5, 10, 0xe8384a),
  r('pumpkinpie', 'Pumpkin Pie', 'bakery', { pumpkin: 1, flour: 1, egg: 1, sugar: 1 }, 6, 13, 0xf08a24),
  r('pancakes', 'Buckwheat Pancakes', 'bakery', { buckwheatflour: 2, egg: 1, milk: 1 }, 4, 15, 0xc99a5a),
  // dairy
  r('butter', 'Butter', 'dairy', { milk: 2 }, 3, 6, 0xffe680),
  r('cheese', 'Cheese', 'dairy', { milk: 3 }, 5, 6, 0xffd34d),
  r('yogurt', 'Strawberry Yogurt', 'dairy', { milk: 1, strawberry: 2 }, 3, 8, 0xffc2cf),
  r('goatcheese', 'Goat Cheese', 'dairy', { goatmilk: 3 }, 5, 9, 0xf6f1e4),
  // loom
  r('yarn', 'Yarn', 'loom', { wool: 2 }, 3, 7, 0xf2ede4),
  r('scarf', 'Scarf', 'loom', { yarn: 2 }, 4, 7, 0xe2443a),
  r('sweater', 'Sweater', 'loom', { yarn: 3 }, 6, 8, 0x6fa8d6),
  r('cottoncloth', 'Cotton Cloth', 'loom', { cotton: 3 }, 4, 7, 0xfafafa),
  r('totebag', 'Tote Bag', 'loom', { cottoncloth: 2 }, 4, 9, 0xd9c49a),
  r('linen', 'Linen', 'loom', { flax: 3 }, 4, 10, 0xe8e0cc),
  r('sachet', 'Lavender Sachet', 'loom', { linen: 1, lavender: 2 }, 3, 16, 0xb59cff),
  // juice press
  r('plumjuice', 'Plum Juice', 'juicepress', { plum: 3 }, 3, 8, 0x7a3e8c),
  r('apricotjuice', 'Apricot Juice', 'juicepress', { apricot: 3 }, 3, 8, 0xf4a542),
  r('lemonade', 'Lemonade', 'juicepress', { lemon: 2, sugar: 1 }, 3, 10, 0xfff27a),
  r('melonjuice', 'Watermelon Juice', 'juicepress', { watermelon: 1 }, 2, 10, 0xff6b7a),
  // jam kitchen
  r('strawberryjam', 'Strawberry Jam', 'jamkitchen', { strawberry: 3, sugar: 1 }, 4, 9, 0xd92a3a),
  r('raspberryjam', 'Raspberry Jam', 'jamkitchen', { raspberry: 3, sugar: 1 }, 4, 9, 0xc2304a),
  r('plumjam', 'Plum Jam', 'jamkitchen', { plum: 3, sugar: 1 }, 4, 9, 0x6b2a6a),
  r('rhubarbjam', 'Rhubarb Jam', 'jamkitchen', { rhubarb: 2, sugar: 1 }, 4, 11, 0xe56a7a),
  r('blackcurrantjam', 'Blackcurrant Jam', 'jamkitchen', { blackcurrant: 3, sugar: 1 }, 4, 11, 0x3a2a4a),
  r('figjam', 'Fig Jam', 'jamkitchen', { fig: 2, sugar: 1 }, 4, 12, 0x7a4a5a),
  // farm kitchen
  r('veggiesoup', 'Veggie Soup', 'kitchen', { onion: 1, leek: 1, cabbage: 1 }, 4, 10, 0xd9a35a),
  r('omelette', 'Omelette', 'kitchen', { egg: 3, bellpepper: 1 }, 3, 10, 0xffd34d),
  r('pickles', 'Pickles', 'kitchen', { cucumber: 3, garlic: 1 }, 4, 10, 0x6f9e48),
  r('hummus', 'Hummus', 'kitchen', { chickpeas: 3, garlic: 1, lemon: 1 }, 4, 12, 0xe8cf9a),
  r('stirfry', 'Veggie Stir-Fry', 'kitchen', { bokchoy: 2, bellpepper: 1, rice: 2 }, 5, 12, 0x7cbf5a),
  r('gardenbake', 'Garden Bake', 'kitchen', { zucchini: 2, bellpepper: 1, onion: 1, cheese: 1 }, 6, 12, 0xe2864a),
  r('chamomiletea', 'Chamomile Tea', 'kitchen', { chamomile: 3, honey: 1 }, 3, 12, 0xf2e6a6),
  r('nutcrunch', 'Honey Nut Crunch', 'kitchen', { almond: 2, hazelnut: 1, honey: 1 }, 4, 15, 0xc49a6c),
  r('squashsoup', 'Squash Soup', 'kitchen', { squash: 1, onion: 1, butter: 1 }, 5, 17, 0xe8a04a),
];

export const RECIPE: Record<string, RecipeDef> = Object.fromEntries(RECIPES.map(x => [x.id, x]));
