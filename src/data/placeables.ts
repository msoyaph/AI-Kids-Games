/** Placeable craftables: chests, scarecrows, sprinklers, fences, paths, torches. */
import { registerItem } from './items';

const p = (id: string, name: string, place: string, price: number, desc: string) =>
  registerItem({ id, name, cat: 'placeable', price, desc, place, giftable: false });

p('chest', 'Chest', 'chest', 0, 'Stores 24 stacks of items. Tap it with your hand to open. You can give it a color label!');
p('scarecrow', 'Scarecrow', 'scarecrow', 0, 'Keeps hungry crows away from crops within 8 tiles.');
p('sprinkler1', 'Sprinkler', 'sprinkler', 0, 'Waters the 4 tiles next to it every morning.');
p('sprinkler2', 'Super Sprinkler', 'sprinkler', 0, 'Waters the 8 tiles around it every morning.');
p('sprinkler3', 'Mega Sprinkler', 'sprinkler', 0, 'Waters a big 5×5 area (24 tiles) every morning!');
p('woodFence', 'Wood Fence', 'fence', 0, 'A cozy wooden fence.');
p('stoneFence', 'Stone Fence', 'fence', 0, 'A sturdy stone fence.');
p('gate', 'Gate', 'gate', 0, 'A fence gate. Tap it to open or close.');
p('woodPath', 'Wood Path', 'path', 0, 'Place on the ground to make a pretty path. Nothing grows on paths.');
p('stonePath', 'Stone Path', 'path', 0, 'A neat stepping-stone path.');
p('brickPath', 'Brick Path', 'path', 0, 'A warm red brick path.');
p('gravelPath', 'Gravel Path', 'path', 0, 'A crunchy gravel path.');
p('torch', 'Torch', 'torch', 0, 'A cheerful light for dark places.');

export const CHEST_COLORS = [0xb7844f, 0xd2434a, 0xe4862e, 0xf5d34a, 0x5c9e48, 0x4f7fe0, 0x9873be, 0xee8ab6];
export const CHEST_COLOR_NAMES = ['Wood', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink'];
export const CHEST_SLOTS = 24;
