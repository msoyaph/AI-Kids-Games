/**
 * Animals and their homes. Animals are always fine on their own: they never get sick, hungry or sad.
 * Fed animals make their product twice as fast; feeding and brushing each make them happier for
 * the product they're working on, and happier animals give better products (more stars).
 * Bees need no feeding: their honey gets better with more flowers nearby. The dog is a friend.
 */

export interface AnimalDef {
  id: string;
  name: string;
  plural: string;
  /** Building id of its home. */
  home: string;
  /** The product's item id (none for the dog). */
  product: string | null;
  productName: string;
  /** Coins for one product at one star. */
  price: number;
  /** Minutes of play per product when fed (unfed takes twice as long). */
  everyMin: number;
  /** What it eats (any one of these, one per feeding). */
  feeds: string[];
  /** Coins to buy one more. */
  cost: number;
  level: number;
  color: { body: number; accent: number };
}

export const ANIMALS: readonly AnimalDef[] = [
  { id: 'chicken', name: 'Chicken', plural: 'Chickens', home: 'coop', product: 'egg', productName: 'Eggs', price: 7, everyMin: 3, feeds: ['wheat', 'oats', 'barley'], cost: 40, level: 3, color: { body: 0xfaf3e6, accent: 0xe2443a } },
  { id: 'cow', name: 'Cow', plural: 'Cows', home: 'cowbarn', product: 'milk', productName: 'Milk', price: 15, everyMin: 6, feeds: ['clover', 'oats', 'barley'], cost: 160, level: 5, color: { body: 0xf6f1ea, accent: 0x3d3a35 } },
  { id: 'bee', name: 'Bees', plural: 'Bees', home: 'beehive', product: 'honey', productName: 'Honey', price: 18, everyMin: 7, feeds: [], cost: 0, level: 6, color: { body: 0xf6c445, accent: 0x3d3a35 } },
  { id: 'sheep', name: 'Sheep', plural: 'Sheep', home: 'sheepshed', product: 'wool', productName: 'Wool', price: 16, everyMin: 8, feeds: ['clover', 'oats', 'barley'], cost: 120, level: 7, color: { body: 0xf2ede4, accent: 0x4a4038 } },
  { id: 'goat', name: 'Goat', plural: 'Goats', home: 'goatpen', product: 'goatmilk', productName: 'Goat Milk', price: 14, everyMin: 5, feeds: ['cabbage', 'turnip', 'bokchoy', 'clover'], cost: 110, level: 9, color: { body: 0xe9dcc8, accent: 0x8a6a4e } },
  { id: 'duck', name: 'Duck', plural: 'Ducks', home: 'duckhouse', product: 'duckegg', productName: 'Duck Eggs', price: 10, everyMin: 4, feeds: ['rice', 'oats', 'barley', 'wheat'], cost: 60, level: 11, color: { body: 0xffffff, accent: 0xf4a542 } },
  { id: 'dog', name: 'Dog', plural: 'Dogs', home: 'kennel', product: null, productName: '', price: 0, everyMin: 0, feeds: [], cost: 0, level: 1, color: { body: 0xd99a5b, accent: 0xfaf3e6 } },
];

export const ANIMAL: Record<string, AnimalDef> = Object.fromEntries(ANIMALS.map(a => [a.id, a]));
export const animalForHome = (home: string) => ANIMALS.find(a => a.home === home);

/** Names given to animals as they arrive (short, plain, friendly; none used by the site's other games). */
export const ANIMAL_NAMES: Record<string, string[]> = {
  chicken: ['Speckles', 'Pecky', 'Clementine', 'Nutmeg', 'Saffron', 'Hazel', 'Poppy', 'Ginger'],
  cow: ['Meadow', 'Bluebell', 'Toffee', 'Willow', 'Marigold', 'Rosie'],
  sheep: ['Fluff', 'Cotton', 'Snowdrop', 'Biscuit', 'Cumulus', 'Lambkin'],
  goat: ['Hopscotch', 'Juniper', 'Tumble', 'Fig', 'Clove', 'Sorrel'],
  duck: ['Paddle', 'Splash', 'Lemon', 'Waddle', 'Ripple', 'Sunny'],
  bee: ['The Hive'],
  dog: ['Barley'],
};
