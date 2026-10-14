/**
 * The 30 field crops. Each is a real crop with a real fact in the Crop Book (src/data/facts.ts).
 *
 * Families matter for crop rotation: planting a different family on a field than last time earns a
 * care point, and a legume (beans, peas, clover) leaves nitrogen behind that helps whatever grows
 * next. Flowering crops get extra fruit when bees live nearby.
 *
 * Balance numbers (minutes of play, coins) are first guesses; the playthrough bot and the pacing
 * test tune them in phase 10.
 */
import type { Season } from '../sim/clock';

export type CropFamily = 'grain' | 'legume' | 'brassica' | 'allium' | 'root' | 'squash' | 'garden' | 'fibre' | 'herb';

export interface CropDef {
  id: string;
  name: string;
  family: CropFamily;
  seasons: Season[];
  /** Minutes of play from planting to ready. */
  growMin: number;
  /** Coins for the seeds for one field. */
  seed: number;
  /** Coins for one at one star. */
  price: number;
  /** How many one harvest gives. */
  yield: number;
  /** Farm level that unlocks its seeds. */
  level: number;
  /** Bees help it (more fruit when a hive is near). */
  flowers: boolean;
  /** Only grows on wet fields next to water (rice). */
  wet?: boolean;
  /** Colours for its model: leaves and the crop itself. */
  color: { leaf: number; crop: number; accent?: number };
  /** Model shape (render/models/crops.ts). */
  shape: 'grain' | 'bush' | 'leafy' | 'bulb' | 'vine' | 'stalk' | 'flower' | 'tall' | 'paddy' | 'clover';
}

const ALL3: Season[] = ['spring', 'summer', 'autumn'];
const COOL: Season[] = ['spring', 'autumn', 'winter'];

export const CROPS: readonly CropDef[] = [
  // level 1–3: quick starters
  { id: 'wheat', name: 'Wheat', family: 'grain', seasons: ALL3, growMin: 2, seed: 5, price: 4, yield: 3, level: 1, flowers: false, color: { leaf: 0x9cc65a, crop: 0xe8c45c }, shape: 'grain' },
  { id: 'clover', name: 'Clover', family: 'legume', seasons: ['spring', 'summer', 'autumn', 'winter'], growMin: 1, seed: 2, price: 2, yield: 2, level: 1, flowers: true, color: { leaf: 0x5fb85a, crop: 0xf3a6c8 }, shape: 'clover' },
  { id: 'strawberry', name: 'Strawberry', family: 'garden', seasons: ['spring', 'summer'], growMin: 3, seed: 10, price: 5, yield: 4, level: 1, flowers: true, color: { leaf: 0x5aa64a, crop: 0xe8384a, accent: 0xffffff }, shape: 'bush' },
  { id: 'onion', name: 'Onion', family: 'allium', seasons: ['spring', 'autumn'], growMin: 4, seed: 8, price: 7, yield: 3, level: 2, flowers: false, color: { leaf: 0x7cc06a, crop: 0xd9a35a }, shape: 'bulb' },
  { id: 'cabbage', name: 'Cabbage', family: 'brassica', seasons: COOL, growMin: 5, seed: 12, price: 30, yield: 1, level: 2, flowers: false, color: { leaf: 0x8fcf7a, crop: 0xb7e39a }, shape: 'leafy' },
  { id: 'oats', name: 'Oats', family: 'grain', seasons: ['spring', 'autumn'], growMin: 3, seed: 6, price: 6, yield: 3, level: 3, flowers: false, color: { leaf: 0xa9cf6a, crop: 0xe6d9a0 }, shape: 'grain' },
  { id: 'bokchoy', name: 'Bok Choy', family: 'brassica', seasons: COOL, growMin: 2, seed: 6, price: 13, yield: 1, level: 3, flowers: false, color: { leaf: 0x4f9e48, crop: 0xeaf5df }, shape: 'leafy' },
  // level 4–7
  { id: 'peanuts', name: 'Peanuts', family: 'legume', seasons: ['summer'], growMin: 6, seed: 14, price: 9, yield: 4, level: 4, flowers: false, color: { leaf: 0x6db558, crop: 0xd8b07a }, shape: 'bush' },
  { id: 'sugarbeet', name: 'Sugar Beet', family: 'root', seasons: ['spring', 'autumn'], growMin: 7, seed: 15, price: 14, yield: 3, level: 4, flowers: false, color: { leaf: 0x5aa64a, crop: 0xf4ead2 }, shape: 'leafy' },
  { id: 'cucumber', name: 'Cucumber', family: 'squash', seasons: ['summer'], growMin: 4, seed: 10, price: 6, yield: 4, level: 5, flowers: true, color: { leaf: 0x4f9e48, crop: 0x3f8f3a, accent: 0xffd34d }, shape: 'vine' },
  { id: 'garlic', name: 'Garlic', family: 'allium', seasons: ['autumn', 'winter'], growMin: 8, seed: 16, price: 16, yield: 3, level: 5, flowers: false, color: { leaf: 0x8cc47a, crop: 0xf5efe2 }, shape: 'bulb' },
  { id: 'cotton', name: 'Cotton', family: 'fibre', seasons: ['summer'], growMin: 9, seed: 18, price: 14, yield: 4, level: 6, flowers: true, color: { leaf: 0x5f9e50, crop: 0xffffff }, shape: 'tall' },
  { id: 'turnip', name: 'Turnip', family: 'brassica', seasons: COOL, growMin: 3, seed: 8, price: 7, yield: 3, level: 6, flowers: false, color: { leaf: 0x6db558, crop: 0xb98ad8, accent: 0xf6f0ea }, shape: 'leafy' },
  { id: 'soybeans', name: 'Soybeans', family: 'legume', seasons: ['summer', 'autumn'], growMin: 6, seed: 12, price: 7, yield: 5, level: 7, flowers: false, color: { leaf: 0x7ab95a, crop: 0x9fc56a }, shape: 'bush' },
  { id: 'zucchini', name: 'Zucchini', family: 'squash', seasons: ['summer'], growMin: 3, seed: 9, price: 5, yield: 4, level: 7, flowers: true, color: { leaf: 0x3f8f3a, crop: 0x4a8c3a, accent: 0xffc93d }, shape: 'vine' },
  // level 8–12
  { id: 'chickpeas', name: 'Chickpeas', family: 'legume', seasons: ['spring', 'summer'], growMin: 7, seed: 16, price: 11, yield: 4, level: 8, flowers: false, color: { leaf: 0x8cbf6a, crop: 0xe8cf9a }, shape: 'bush' },
  { id: 'barley', name: 'Barley', family: 'grain', seasons: ['spring', 'autumn', 'winter'], growMin: 5, seed: 10, price: 8, yield: 4, level: 8, flowers: false, color: { leaf: 0x9cc65a, crop: 0xd9c070 }, shape: 'grain' },
  { id: 'bellpepper', name: 'Bell Pepper', family: 'garden', seasons: ['summer'], growMin: 8, seed: 18, price: 18, yield: 3, level: 9, flowers: true, color: { leaf: 0x3f8f3a, crop: 0xe2443a, accent: 0xffc93d }, shape: 'bush' },
  { id: 'leek', name: 'Leek', family: 'allium', seasons: ['autumn', 'winter'], growMin: 6, seed: 12, price: 13, yield: 3, level: 9, flowers: false, color: { leaf: 0x5f9e7a, crop: 0xeef3e2 }, shape: 'stalk' },
  { id: 'flax', name: 'Flax', family: 'fibre', seasons: ['spring', 'summer'], growMin: 7, seed: 15, price: 12, yield: 4, level: 10, flowers: true, color: { leaf: 0x7cbf6a, crop: 0x7aa8f0 }, shape: 'flower' },
  { id: 'watermelon', name: 'Watermelon', family: 'squash', seasons: ['summer'], growMin: 12, seed: 24, price: 80, yield: 1, level: 10, flowers: true, color: { leaf: 0x3f8f3a, crop: 0x2f7a3a, accent: 0x9fd07a }, shape: 'vine' },
  { id: 'rice', name: 'Rice', family: 'grain', seasons: ['summer', 'autumn'], growMin: 6, seed: 12, price: 8, yield: 5, level: 11, flowers: false, wet: true, color: { leaf: 0x8fd07a, crop: 0xe9dc9a }, shape: 'paddy' },
  { id: 'rhubarb', name: 'Rhubarb', family: 'garden', seasons: ['spring'], growMin: 6, seed: 14, price: 14, yield: 3, level: 11, flowers: false, color: { leaf: 0x5aa64a, crop: 0xd94a5a }, shape: 'stalk' },
  { id: 'chamomile', name: 'Chamomile', family: 'herb', seasons: ['spring', 'summer'], growMin: 4, seed: 10, price: 7, yield: 4, level: 12, flowers: true, color: { leaf: 0x8cc47a, crop: 0xffffff, accent: 0xffd34d }, shape: 'flower' },
  // level 13–18
  { id: 'pumpkin', name: 'Pumpkin', family: 'squash', seasons: ['autumn'], growMin: 14, seed: 28, price: 100, yield: 1, level: 13, flowers: true, color: { leaf: 0x4f9e48, crop: 0xf08a24 }, shape: 'vine' },
  { id: 'okra', name: 'Okra', family: 'garden', seasons: ['summer'], growMin: 5, seed: 12, price: 9, yield: 4, level: 13, flowers: true, color: { leaf: 0x5aa64a, crop: 0x7cbf5a, accent: 0xfff2a0 }, shape: 'tall' },
  { id: 'parsnip', name: 'Parsnip', family: 'root', seasons: ['autumn', 'winter'], growMin: 9, seed: 18, price: 21, yield: 3, level: 14, flowers: false, color: { leaf: 0x7cbf6a, crop: 0xf2e6bf }, shape: 'leafy' },
  { id: 'buckwheat', name: 'Buckwheat', family: 'grain', seasons: ['summer', 'autumn'], growMin: 4, seed: 9, price: 7, yield: 4, level: 15, flowers: true, color: { leaf: 0x7cbf5a, crop: 0xffffff, accent: 0xf3c6d6 }, shape: 'flower' },
  { id: 'lavender', name: 'Lavender', family: 'herb', seasons: ['summer'], growMin: 10, seed: 20, price: 24, yield: 3, level: 16, flowers: true, color: { leaf: 0x8fae9a, crop: 0x9b7be0 }, shape: 'flower' },
  { id: 'squash', name: 'Butternut Squash', family: 'squash', seasons: ['autumn'], growMin: 11, seed: 22, price: 40, yield: 2, level: 17, flowers: true, color: { leaf: 0x4f9e48, crop: 0xe8b46a }, shape: 'vine' },
];

export const CROP: Record<string, CropDef> = Object.fromEntries(CROPS.map(c => [c.id, c]));
export const cropDef = (id: string) => CROP[id];

/** Coins a field earns per minute of growing, at one star (the Ledger's planning hint). */
export const profitPerMinute = (c: CropDef) => (c.price * c.yield - c.seed) / c.growMin;
