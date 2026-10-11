/** Farm animals, their products, and farm buildings sold by the carpenter. */
import { registerItem } from './items';

export interface AnimalDef {
  id: string;
  name: string;
  home: 'coop' | 'barn';
  /** building level needed (0 basic, 1 big, 2 deluxe) */
  level: number;
  price: number;
  product: string;
  /** better product when happy */
  bigProduct?: string;
  /** extra product sometimes (duck feathers) */
  bonus?: string;
  /** days between products */
  every: number;
  colors: [number, number, number];
  big: boolean;
  names: string[];
  sound: string;
  desc: string;
}

export const ANIMALS: AnimalDef[] = [
  { id: 'chicken', name: 'Chicken', home: 'coop', level: 0, price: 600, product: 'egg', bigProduct: 'bigEgg', every: 1, colors: [0xfffaf0, 0xe6dccb, 0xd2434a], big: false, names: ['Nugget', 'Pebble', 'Clucky', 'Daisy', 'Waffles', 'Peep'], sound: 'cluck', desc: 'Lays an egg every day.' },
  { id: 'duck', name: 'Duck', home: 'coop', level: 1, price: 1100, product: 'duckEgg', bonus: 'duckFeather', every: 2, colors: [0xfffaf0, 0xd8d0c0, 0xf5b942], big: false, names: ['Puddles', 'Quackers', 'Splash', 'Ducky', 'Biscuit'], sound: 'quack', desc: 'Lays a duck egg every 2 days. Sometimes drops a feather!' },
  { id: 'rabbit', name: 'Rabbit', home: 'coop', level: 2, price: 2500, product: 'rabbitFur', every: 3, colors: [0xd8c0a0, 0xb7956f, 0xee8ab6], big: false, names: ['Clover', 'Hopsy', 'Marsh', 'Bun Bun', 'Thumper'], sound: 'squeak', desc: 'Grows soft fur every 3 days.' },
  { id: 'cow', name: 'Cow', home: 'barn', level: 0, price: 1500, product: 'milk', bigProduct: 'bigMilk', every: 1, colors: [0xfffaf0, 0x3d3c4e, 0xee8ab6], big: true, names: ['Buttercup', 'Moo-na', 'Daisy', 'Clover', 'Bessie', 'Mocha'], sound: 'moo', desc: 'Gives milk every day.' },
  { id: 'goat', name: 'Goat', home: 'barn', level: 1, price: 2500, product: 'goatMilk', every: 2, colors: [0xe8e0d0, 0xb0a890, 0x8a6040], big: true, names: ['Pepper', 'Billy', 'Nibbles', 'Gizmo', 'Sprout'], sound: 'bleat', desc: 'Gives goat milk every 2 days.' },
  { id: 'sheep', name: 'Sheep', home: 'barn', level: 2, price: 4000, product: 'wool', every: 3, colors: [0xf8f4ea, 0xd8d0c0, 0x3d3c4e], big: true, names: ['Fluffy', 'Cloud', 'Woolly', 'Cotton', 'Marshmallow'], sound: 'baa', desc: 'Grows wool every 3 days.' },
];
export const ANIMAL: Record<string, AnimalDef> = {};
for (const a of ANIMALS) ANIMAL[a.id] = a;

const prod = (id: string, name: string, price: number, desc: string, energy = 0) =>
  registerItem({ id, name, cat: 'animal', price, desc, quality: true, energy: energy || undefined });

prod('egg', 'Egg', 50, 'A fresh egg from your chicken.', 25);
prod('bigEgg', 'Big Egg', 95, 'A huge egg from a very happy chicken!', 35);
prod('duckEgg', 'Duck Egg', 95, 'A big, rich duck egg.', 30);
prod('duckFeather', 'Duck Feather', 250, 'A soft, shiny feather.');
prod('rabbitFur', 'Soft Fur', 340, 'Super-soft fur from a rabbit. Shhh, it\'s cozy.');
prod('milk', 'Milk', 125, 'Fresh milk from your cow.', 30);
prod('bigMilk', 'Big Milk', 190, 'A big jug of milk from a happy cow!', 40);
prod('goatMilk', 'Goat Milk', 225, 'Creamy goat milk.', 35);
prod('wool', 'Wool', 340, 'Fluffy wool. The loom turns it into cloth.');
registerItem({ id: 'hay', name: 'Hay', cat: 'resource', price: 0, desc: 'Dried grass. Animals eat it when they can\'t go outside.', giftable: false });
registerItem({ id: 'petTreat', name: 'Pet Treat', cat: 'special', price: 0, desc: 'A crunchy treat your pet will love.', giftable: false });

/** Building plots built & upgraded by the carpenter. */
export interface BuildingOffer {
  id: string;
  plot: string;
  level: number;
  name: string;
  price: number;
  mats: [string, number][];
  days: number;
  desc: string;
  /** required existing level on the plot (-1 = empty plot) */
  needs: number;
}

export const BUILDINGS: BuildingOffer[] = [
  { id: 'coop0', plot: 'coop', level: 0, needs: -1, name: 'Coop', price: 2500, mats: [['wood', 150], ['stone', 50]], days: 2, desc: 'A cozy home for 4 chickens.' },
  { id: 'coop1', plot: 'coop', level: 1, needs: 0, name: 'Big Coop', price: 6000, mats: [['wood', 200], ['hardwood', 20]], days: 2, desc: 'Room for 8 birds. Ducks can live here now!' },
  { id: 'coop2', plot: 'coop', level: 2, needs: 1, name: 'Deluxe Coop', price: 12000, mats: [['wood', 300], ['hardwood', 50]], days: 2, desc: 'Room for 12 and space for rabbits!' },
  { id: 'barn0', plot: 'barn', level: 0, needs: -1, name: 'Barn', price: 5000, mats: [['wood', 250], ['stone', 100]], days: 2, desc: 'A big home for 4 cows.' },
  { id: 'barn1', plot: 'barn', level: 1, needs: 0, name: 'Big Barn', price: 9000, mats: [['wood', 300], ['stone', 150]], days: 2, desc: 'Room for 8 animals. Goats can live here now!' },
  { id: 'barn2', plot: 'barn', level: 2, needs: 1, name: 'Deluxe Barn', price: 16000, mats: [['wood', 350], ['hardwood', 60]], days: 2, desc: 'Room for 12 and space for sheep!' },
  { id: 'silo', plot: 'silo', level: 0, needs: -1, name: 'Silo', price: 600, mats: [['stone', 100], ['clay', 10]], days: 1, desc: 'Stores hay when you cut grass or wheat with your scythe.' },
  { id: 'well', plot: 'well', level: 0, needs: -1, name: 'Well', price: 600, mats: [['stone', 75]], days: 1, desc: 'Refill your watering can right by the house.' },
  { id: 'shed', plot: 'shed', level: 0, needs: -1, name: 'Shed', price: 3000, mats: [['wood', 200]], days: 2, desc: 'An empty room for machines and chests.' },
];

export const HOUSE_UPGRADES = [
  { level: 1, name: 'Kitchen Upgrade', price: 5000, mats: [['wood', 300]] as [string, number][], days: 2, desc: 'A bigger house with a kitchen! Cook tasty food.' },
  { level: 2, name: 'Big House Upgrade', price: 15000, mats: [['hardwood', 100]] as [string, number][], days: 2, desc: 'More rooms, a cozy reading nook and a guest bed.' },
];

export const CAPACITY = [4, 8, 12];
export const SILO_CAP = 240;
