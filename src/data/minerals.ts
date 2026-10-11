/** Ores, bars, gems, minerals, geodes and artifacts (museum items). */
import { registerItem } from './items';

export interface MineralDef {
  id: string;
  name: string;
  price: number;
  color: number;
  cut: 'round' | 'tall' | 'square' | 'shard' | 'heart' | 'rock' | 'crystal';
  desc: string;
  /** which geode types can contain it (or 'node' for mine gem nodes) */
  from: ('geode' | 'frost' | 'glow' | 'crystal' | 'node')[];
}

export const ORES = [
  { id: 'copperOre', name: 'Copper Ore', price: 5, color: 0xd2803a, bar: 'copperBar', barName: 'Copper Bar', barPrice: 60 },
  { id: 'ironOre', name: 'Iron Ore', price: 10, color: 0xbac3cf, bar: 'ironBar', barName: 'Iron Bar', barPrice: 120 },
  { id: 'goldOre', name: 'Gold Ore', price: 25, color: 0xf5c838, bar: 'goldBar', barName: 'Gold Bar', barPrice: 250 },
  { id: 'crystaliteOre', name: 'Crystalite Ore', price: 60, color: 0x7ee0e8, bar: 'crystaliteBar', barName: 'Crystalite Bar', barPrice: 600 },
];

for (const o of ORES) {
  registerItem({ id: o.id, name: o.name, cat: 'ore', price: o.price, desc: `Smelt 5 in a furnace with coal to make a ${o.barName}.` });
  registerItem({ id: o.bar, name: o.barName, cat: 'bar', price: o.barPrice, desc: 'A shiny metal bar for tool upgrades and crafting.' });
}
registerItem({ id: 'crystalite', name: 'Crystalite', cat: 'mineral', price: 400, desc: 'A rare glowing crystal from the deepest caves. Lumi would LOVE this.' });
registerItem({ id: 'battery', name: 'Spark Cell', cat: 'resource', price: 300, desc: 'A little jar of stored lightning from the glow caves. Gadget fuel!' });

export const MINERALS: MineralDef[] = [
  // gems (gem nodes + geodes)
  { id: 'quartz', name: 'Quartz', price: 30, color: 0xe6e7ef, cut: 'tall', desc: 'A clear, common crystal.', from: ['node', 'geode', 'frost'] },
  { id: 'amethyst', name: 'Amethyst', price: 100, color: 0x9873be, cut: 'round', desc: 'A purple gem. Juno thinks it\'s the perfect color.', from: ['node', 'geode'] },
  { id: 'topaz', name: 'Topaz', price: 90, color: 0xf6b146, cut: 'square', desc: 'A warm golden gem.', from: ['node', 'geode'] },
  { id: 'jade', name: 'Jade', price: 200, color: 0x5cb87a, cut: 'round', desc: 'A smooth green stone.', from: ['node', 'frost'] },
  { id: 'aquamarine', name: 'Aquamarine', price: 180, color: 0x6fd0e8, cut: 'tall', desc: 'Blue like the sea.', from: ['node', 'frost'] },
  { id: 'ruby', name: 'Ruby', price: 250, color: 0xd2434a, cut: 'heart', desc: 'A brilliant red gem. Grit\'s favorite.', from: ['node', 'glow'] },
  { id: 'emerald', name: 'Emerald', price: 260, color: 0x2fae5a, cut: 'square', desc: 'A deep green gem.', from: ['node', 'glow'] },
  { id: 'sapphire', name: 'Sapphire', price: 280, color: 0x2f5fd8, cut: 'round', desc: 'A royal blue gem.', from: ['node', 'crystal'] },
  { id: 'diamond', name: 'Diamond', price: 750, color: 0xf0fbff, cut: 'shard', desc: 'The sparkliest gem of all!', from: ['node', 'crystal'] },
  // minerals (geodes)
  { id: 'calcite', name: 'Calcite', price: 40, color: 0xf3e6c8, cut: 'rock', desc: 'A soft, creamy mineral.', from: ['geode'] },
  { id: 'pyrite', name: 'Pyrite', price: 60, color: 0xd8c050, cut: 'square', desc: 'Shiny like gold, but it\'s not! Some call it "fool\'s gold".', from: ['geode'] },
  { id: 'mica', name: 'Mica', price: 40, color: 0xc0b8a8, cut: 'rock', desc: 'Peels apart in thin, shiny sheets.', from: ['geode'] },
  { id: 'jasper', name: 'Jasper', price: 70, color: 0xb05030, cut: 'rock', desc: 'A red stone with swirly patterns.', from: ['geode'] },
  { id: 'malachite', name: 'Malachite', price: 90, color: 0x2f9a6a, cut: 'rock', desc: 'Green with stripes like a tree\'s rings.', from: ['geode', 'frost'] },
  { id: 'fluorite', name: 'Fluorite', price: 110, color: 0x8fd0b8, cut: 'square', desc: 'Glows softly under special lights.', from: ['frost'] },
  { id: 'moonstone', name: 'Moonstone', price: 150, color: 0xd8e4ff, cut: 'round', desc: 'Shimmers like moonlight.', from: ['frost', 'glow'] },
  { id: 'opal', name: 'Opal', price: 180, color: 0xf0d8f0, cut: 'round', desc: 'Every color of the rainbow swirls inside.', from: ['frost', 'crystal'] },
  { id: 'obsidian', name: 'Obsidian', price: 120, color: 0x2b2433, cut: 'shard', desc: 'Smooth black glass made by ancient heat.', from: ['glow'] },
  { id: 'sunstone', name: 'Sunstone', price: 200, color: 0xf0904a, cut: 'heart', desc: 'Warm and glittery, like a tiny sunset.', from: ['glow'] },
  { id: 'agate', name: 'Agate', price: 90, color: 0xc88a5a, cut: 'round', desc: 'Stripes of brown, orange and cream.', from: ['geode', 'glow'] },
  { id: 'garnet', name: 'Garnet', price: 160, color: 0x8a1a3a, cut: 'square', desc: 'A dark red crystal.', from: ['glow', 'crystal'] },
  { id: 'celestine', name: 'Celestine', price: 220, color: 0xa8c8ff, cut: 'crystal', desc: 'Sky-blue crystals that grow in clusters.', from: ['crystal'] },
  { id: 'prismite', name: 'Prismite', price: 450, color: 0xffe0f8, cut: 'crystal', desc: 'A rare crystal that splits light into rainbows.', from: ['crystal'] },
];

for (const m of MINERALS) {
  const gem = ['quartz', 'amethyst', 'topaz', 'jade', 'aquamarine', 'ruby', 'emerald', 'sapphire', 'diamond'].includes(m.id);
  registerItem({ id: m.id, name: m.name, cat: gem ? 'gem' : 'mineral', price: m.price, desc: m.desc });
}

export const GEODES = [
  { id: 'geode', name: 'Geode', price: 50, color: 0x9a8a78, pool: 'geode', floors: [1, 40] },
  { id: 'frostGeode', name: 'Frost Geode', price: 80, color: 0x9ac8e8, pool: 'frost', floors: [11, 40] },
  { id: 'glowGeode', name: 'Glow Geode', price: 120, color: 0xb08ad8, pool: 'glow', floors: [21, 40] },
  { id: 'crystalGeode', name: 'Crystal Geode', price: 160, color: 0x7ee0e8, pool: 'crystal', floors: [31, 40] },
] as const;
for (const g of GEODES) registerItem({ id: g.id, name: g.name, cat: 'geode', price: g.price, desc: 'Something sparkly hides inside! Grit at the smithy can crack it open.' });

export interface ArtifactDef {
  id: string;
  name: string;
  price: number;
  desc: string;
  /** where it can be dug up: 'farm', 'town', 'forest', 'beach', 'quarry', 'mountain', 'mine' */
  where: string[];
}

export const ARTIFACTS: ArtifactDef[] = [
  { id: 'oldCoin', name: 'Old Valley Coin', price: 60, desc: 'A coin from the first Cliff Valley market.', where: ['farm', 'town', 'beach'] },
  { id: 'potShard', name: 'Clay Pot Shard', price: 40, desc: 'Part of a very old flower pot.', where: ['farm', 'forest', 'quarry'] },
  { id: 'fossilShell', name: 'Fossil Shell', price: 120, desc: 'A seashell turned to stone long, long ago.', where: ['beach', 'quarry', 'mine'] },
  { id: 'dinoTooth', name: 'Dino Tooth', price: 300, desc: 'A real dinosaur tooth! Ottilie will be thrilled.', where: ['quarry', 'mine'] },
  { id: 'arrowhead', name: 'Stone Arrowhead', price: 80, desc: 'A carefully shaped stone point.', where: ['forest', 'mountain', 'farm'] },
  { id: 'oldKey', name: 'Rusty Old Key', price: 50, desc: 'What did it open? Nobody remembers.', where: ['town', 'farm'] },
  { id: 'oldToyTrain', name: 'Old Toy Train', price: 150, desc: 'A tiny wooden train. Kai would love it!', where: ['town', 'mountain'] },
  { id: 'foundersBadge', name: 'Founders\' Badge', price: 200, desc: 'A badge worn by the valley founders. Rosemary had one!', where: ['farm', 'town'] },
  { id: 'oldTicket', name: 'Old Train Ticket', price: 70, desc: 'A ticket for the very first Valley Train ride.', where: ['town', 'mountain'] },
  { id: 'frogStatue', name: 'Frog Statue', price: 160, desc: 'A little stone frog. It looks like it\'s smiling.', where: ['forest', 'mountain'] },
  { id: 'teacup', name: 'Painted Teacup', price: 90, desc: 'A pretty cup with tiny flowers painted on it.', where: ['town', 'beach'] },
  { id: 'musicBox', name: 'Music Box', price: 220, desc: 'Still plays a sweet little song when you wind it.', where: ['mine', 'quarry'] },
  { id: 'oldCompass', name: 'Brass Compass', price: 140, desc: 'It always points to the valley.', where: ['beach', 'mountain'] },
  { id: 'ammonite', name: 'Ammonite', price: 250, desc: 'A spiral fossil from an ancient sea.', where: ['quarry', 'mine', 'beach'] },
  { id: 'leafFossil', name: 'Leaf Fossil', price: 130, desc: 'The print of a leaf from millions of years ago.', where: ['forest', 'quarry'] },
  { id: 'ancientSeed', name: 'Ancient Seed', price: 300, desc: 'A seed from a plant nobody has seen in ages.', where: ['forest', 'farm', 'quarry'] },
  { id: 'heartstone', name: 'Heartstone', price: 0, desc: 'A warm, glowing crystal Great-Aunt Rosemary hid deep in the mine. It belongs in the Valley Hall\'s crystal lamp.', where: [] },
];

for (const a of ARTIFACTS) registerItem({ id: a.id, name: a.name, cat: a.id === 'heartstone' ? 'special' : 'artifact', price: a.price, desc: a.desc, giftable: a.id !== 'heartstone' });
