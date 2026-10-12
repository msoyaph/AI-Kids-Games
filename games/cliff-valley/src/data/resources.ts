/** Basic resources and farm supplies. */
import { PRICES } from '../tuning';
import { registerItem, type ItemCat } from './items';

const r = (id: string, name: string, cat: ItemCat, desc: string, extra: Record<string, unknown> = {}) =>
  registerItem({ id, name, cat, price: PRICES[id] ?? 0, desc, ...extra });

r('wood', 'Wood', 'resource', 'Sturdy wood for building and crafting.');
r('stone', 'Stone', 'resource', 'A handy chunk of stone.');
r('fiber', 'Fiber', 'resource', 'Tough plant strings. Great for crafting.');
r('sap', 'Sap', 'resource', 'Sticky tree goo.', { energy: 2 });
r('hardwood', 'Hardwood', 'resource', 'Extra-strong wood from big old logs and stumps.');
r('coal', 'Coal', 'resource', 'Burns hot. Used in the furnace.');
r('clay', 'Clay', 'resource', 'Squishy earth for crafting.');
r('mixedSeeds', 'Mixed Seeds', 'seed', 'A surprise mix! Plant them to grow a random crop of the season.', { giftable: false });
r('acorn', 'Acorn', 'seed', 'Plant it to grow an oak tree.', { giftable: false });
r('mapleSeed', 'Maple Seed', 'seed', 'Plant it to grow a maple tree.', { giftable: false });
r('pineCone', 'Pine Cone', 'seed', 'Plant it to grow a pine tree.', { giftable: false });
r('oakResin', 'Oak Resin', 'artisan', 'Golden resin from an oak tapper.');
r('mapleSyrup', 'Maple Syrup', 'artisan', 'Sweet syrup from a maple tapper. Yum on pancakes!');
r('pineTar', 'Pine Tar', 'artisan', 'Thick, piney tar from a pine tapper.');
r('basicFertilizer', 'Basic Fertilizer', 'fertilizer', 'Mix into tilled soil. Crops are more likely to get silver or gold stars.', { giftable: false });
r('deluxeFertilizer', 'Deluxe Fertilizer', 'fertilizer', 'Super soil food. Crops often get gold stars, sometimes sparkle stars!', { giftable: false });
r('speedyGrow', 'Speedy Grow', 'fertilizer', 'Mix into tilled soil. Crops grow 25% faster!', { giftable: false });
